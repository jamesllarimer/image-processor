// composables/useFileSystem.ts
import { ref } from 'vue'
import Papa from 'papaparse'
import { parse as parseExif, thumbnail as extractThumbnail } from 'exifr'


declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemHandle {
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>
    remove(): Promise<void>
  }
}

interface ImageWithMetadata {
  file: File
  dateTime: Date
  name: string
  newName?: string
  thumbnail?: string
  isRaw?: boolean
}

const SUPPORTED_FORMATS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/arw',
  'image/x-sony-arw',
  'image/cr2',
  'image/x-canon-cr2',
  'image/nef',
  'image/x-nikon-nef',
  'image/raf',
  'image/x-fuji-raf',
  'image/raw',
  'image/x-raw',
])

const RAW_EXTENSIONS = new Set([
  'arw', 'cr2', 'nef', 'raf', 'raw', 'rw2', 'orf', 'dng',
])

const sanitizeFilename = (name: string): string =>
  name
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')

// --- Composable ---

export const useFileSystem = () => {
  const images = ref<ImageWithMetadata[]>([])
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const outputDirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const csvData = ref<any[]>([])
  const status = ref('')
  const isProcessing = ref(false)
  const progress = ref({ current: 0, total: 0, label: '' })
  const selectedColumns = ref<string[]>([])
  const columnSeparator = ref('_')
  const hasRawFiles = ref(false)
  const isOffline = ref(!navigator.onLine)

  window.addEventListener('online', () => { isOffline.value = false })
  window.addEventListener('offline', () => { isOffline.value = true })

  const isImageFile = (file: File): { isSupported: boolean; isRaw: boolean } => {
    if (SUPPORTED_FORMATS.has(file.type)) {
      const isRaw = file.type.includes('raw') || file.type.includes('arw') ||
                    file.type.includes('cr2') || file.type.includes('nef') ||
                    file.type.includes('raf')
      return { isSupported: true, isRaw }
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext && RAW_EXTENSIONS.has(ext)) return { isSupported: true, isRaw: true }
    return { isSupported: false, isRaw: false }
  }

  const generatePlaceholderThumbnail = (filename: string): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 24px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('RAW', canvas.width / 2, canvas.height / 2 - 20)
    ctx.font = '16px system-ui'
    ctx.fillText(filename, canvas.width / 2, canvas.height / 2 + 20)
    return canvas.toDataURL('image/webp', 0.8)
  }

  const createImageThumbnail = async (file: File, isRaw: boolean): Promise<string> => {
    const maxDimension = 400
    try {
      if (isRaw) {
        try {
          const thumbnailData = await extractThumbnail(file)
          if (thumbnailData) {
            const blob = new Blob([thumbnailData as BlobPart], { type: 'image/jpeg' })
            const url = URL.createObjectURL(blob)
            const img = document.createElement('img')
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url })
            URL.revokeObjectURL(url)
            let { width, height } = img
            if (width > height) { if (width > maxDimension) { height = height * (maxDimension / width); width = maxDimension } }
            else { if (height > maxDimension) { width = width * (maxDimension / height); height = maxDimension } }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)
            return canvas.toDataURL('image/webp', 0.8)
          }
        } catch {
          // fall through to placeholder
        }
        return generatePlaceholderThumbnail(file.name)
      }

      const url = URL.createObjectURL(file)
      const img = document.createElement('img')
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url })
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > height) { if (width > maxDimension) { height = height * (maxDimension / width); width = maxDimension } }
      else { if (height > maxDimension) { width = width * (maxDimension / height); height = maxDimension } }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/webp', 0.8)
    } catch {
      return generatePlaceholderThumbnail(file.name)
    }
  }

  const getImageDateTime = async (file: File): Promise<Date> => {
    try {
      const exifData = await parseExif(file, ['DateTimeOriginal', 'CreateDate'])
      if (exifData?.DateTimeOriginal) return new Date(exifData.DateTimeOriginal)
      if (exifData?.CreateDate) return new Date(exifData.CreateDate)
    } catch {
      // fall through to lastModified
    }
    return new Date(file.lastModified)
  }

  const updatePreviewNames = () => {
    if (!selectedColumns.value.length || !csvData.value.length) {
      images.value = images.value.map(img => ({ ...img, newName: undefined }))
      return
    }
    images.value = images.value.map((img, index) => {
      const csvRow = csvData.value[index]
      if (!csvRow) return { ...img, newName: undefined }
      const extension = img.file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const newBaseName = sanitizeFilename(
        selectedColumns.value
          .map(col => (csvRow[col] ?? '').toString().trim())
          .filter(Boolean)
          .join(columnSeparator.value)
      )
      if (!newBaseName) return { ...img, newName: undefined }
      return { ...img, newName: `${newBaseName}.${extension}` }
    })
  }

  const loadImagesFromHandle = async (handle: FileSystemDirectoryHandle) => {
    status.value = 'Scanning folder...'

    // First pass: collect files so we know the total before processing
    const fileList: { file: File; isRaw: boolean }[] = []
    for await (const [, fileHandle] of handle.entries()) {
      if (fileHandle.kind === 'file') {
        const file = await (fileHandle as FileSystemFileHandle).getFile()
        const { isSupported, isRaw } = isImageFile(file)
        if (isSupported) fileList.push({ file, isRaw })
      }
    }

    progress.value = { current: 0, total: fileList.length, label: 'Loading images...' }

    const imageFiles: ImageWithMetadata[] = []
    let rawCount = 0
    for (const { file, isRaw } of fileList) {
      const [dateTime, thumbnail] = await Promise.all([
        getImageDateTime(file),
        createImageThumbnail(file, isRaw),
      ])
      if (isRaw) rawCount++
      imageFiles.push({ file, dateTime, name: file.name, thumbnail, isRaw })
      progress.value.current++
    }

    progress.value = { current: 0, total: 0, label: '' }
    hasRawFiles.value = rawCount > 0
    images.value = imageFiles.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    status.value = `Loaded ${images.value.length} images${rawCount ? ` (${rawCount} RAW)` : ''}, sorted by capture time`
    updatePreviewNames()
  }

  const selectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        status.value = 'File System Access API not supported in this browser'
        return
      }
      status.value = 'Selecting input folder...'
      const handle = await window.showDirectoryPicker()
      dirHandle.value = handle
      await loadImagesFromHandle(handle)
    } catch (error) {
      status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Folder selection error:', error)
    }
  }

  const selectOutputFolder = async (): Promise<boolean> => {
    try {
      status.value = 'Selecting output folder...'
      const handle = await window.showDirectoryPicker()
      outputDirHandle.value = handle
      status.value = 'Output folder selected'
      return true
    } catch (error) {
      status.value = `Error selecting output folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Output folder selection error:', error)
      return false
    }
  }

  const parseCSV = async (file: File) =>
    new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          csvData.value = results.data as any[]
          status.value = `Loaded ${results.data.length} records from CSV`
          updatePreviewNames()
          resolve(results.data)
        },
        error: (error) => {
          status.value = `CSV parsing error: ${error}`
          reject(error)
        },
      })
    })

  const renameImages = async () => {
    if (!dirHandle.value || !csvData.value.length || !images.value.length || !selectedColumns.value.length) {
      throw new Error('Please select both folder and CSV first')
    }
    if (!outputDirHandle.value) {
      const success = await selectOutputFolder()
      if (!success) return
    }

    isProcessing.value = true
    progress.value = { current: 0, total: images.value.length, label: 'Copying files...' }
    status.value = 'Starting copy and rename process...'

    try {
      let successCount = 0
      let errorCount = 0

      for (const image of images.value) {
        if (!image.newName) {
          errorCount++
          progress.value.current++
          continue
        }
        try {
          if (outputDirHandle.value) {
            status.value = `Processing ${image.file.name} → ${image.newName}`
            const newHandle = await outputDirHandle.value.getFileHandle(image.newName, { create: true })
            const file = await (await dirHandle.value.getFileHandle(image.file.name)).getFile()
            const writer = await newHandle.createWritable()
            await writer.write(await file.arrayBuffer())
            await writer.close()
            successCount++
          }
        } catch (error) {
          console.error(`Error processing ${image.file.name}:`, error)
          errorCount++
        }
        progress.value.current++
      }

      status.value = `Copied and renamed ${successCount} images. ${errorCount > 0 ? `${errorCount} errors.` : ''}`
    } catch (error) {
      status.value = `Process error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Process error:', error)
    } finally {
      isProcessing.value = false
      progress.value = { current: 0, total: 0, label: '' }
    }
  }

  return {
    images,
    csvData,
    status,
    isProcessing,
    progress,
    selectedColumns,
    columnSeparator,
    hasRawFiles,
    isOffline,
    selectFolder,
    parseCSV,
    renameImages,
    updatePreviewNames,
  }
}
