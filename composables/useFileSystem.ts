// composables/useFileSystem.ts
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import { parse as parseExif } from 'exifr'

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
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

// Add supported RAW formats
const SUPPORTED_FORMATS = new Set([
  // Common image formats
  'image/jpeg',
  'image/png',
  'image/webp',
  // RAW formats
  'image/arw',              // Sony
  'image/x-sony-arw',       // Alternative MIME for Sony
  'image/cr2',              // Canon
  'image/x-canon-cr2',      // Alternative MIME for Canon
  'image/nef',              // Nikon
  'image/x-nikon-nef',      // Alternative MIME for Nikon
  'image/raf',              // Fujifilm
  'image/x-fuji-raf',       // Alternative MIME for Fujifilm
  'image/raw',              // Generic RAW
  'image/x-raw'             // Alternative MIME for generic RAW
])

// Add RAW file extensions
const RAW_EXTENSIONS = new Set([
  'arw',  // Sony
  'cr2',  // Canon
  'nef',  // Nikon
  'raf',  // Fujifilm
  'raw',  // Generic
  'rw2',  // Panasonic
  'orf',  // Olympus
  'dng'   // Adobe Digital Negative
])

export const useFileSystem = () => {
  const images = ref<ImageWithMetadata[]>([])
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const outputDirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const csvData = ref<any[]>([])
  const status = ref('')
  const isProcessing = ref(false)
  const selectedColumn = ref('')
  const hasRawFiles = ref(false)

  const isImageFile = (file: File): { isSupported: boolean; isRaw: boolean } => {
    // Check by MIME type first
    if (SUPPORTED_FORMATS.has(file.type)) {
      return { 
        isSupported: true, 
        isRaw: file.type.includes('raw') || file.type.includes('arw') || 
               file.type.includes('cr2') || file.type.includes('nef') || 
               file.type.includes('raf')
      }
    }
    
    // If MIME type check fails, check by extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension) {
      const isRaw = RAW_EXTENSIONS.has(extension)
      return {
        isSupported: isRaw,
        isRaw
      }
    }
    
    return { isSupported: false, isRaw: false }
  }

  const generatePlaceholderThumbnail = (filename: string): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    // Draw placeholder background
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw RAW text
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 24px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('RAW', canvas.width / 2, canvas.height / 2 - 20)
    
    // Draw filename
    ctx.font = '16px system-ui'
    ctx.fillText(filename, canvas.width / 2, canvas.height / 2 + 20)
    
    return canvas.toDataURL('image/webp', 0.8)
  }

  const createImageThumbnail = async (file: File, isRaw: boolean): Promise<string> => {
    try {
      const maxDimension = 400
      
      if (isRaw) {
        try {
          // Use exifr to extract the embedded preview JPEG
          const exifData = await parseExif(file, {
            thumbnail: true,
            imageWidth: true,
            imageHeight: true,
          })
          
          if (exifData?.thumbnail) {
            // Convert the thumbnail buffer to a blob
            const blob = new Blob([exifData.thumbnail], { type: 'image/jpeg' })
            const url = URL.createObjectURL(blob)
            
            const img = document.createElement('img')
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = url
            })
            
            URL.revokeObjectURL(url)
            
            // Resize the thumbnail
            let width = img.width
            let height = img.height
            if (width > height) {
              if (width > maxDimension) {
                height = height * (maxDimension / width)
                width = maxDimension
              }
            } else {
              if (height > maxDimension) {
                width = width * (maxDimension / height)
                height = maxDimension
              }
            }
            
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Could not get canvas context')
            
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            
            ctx.drawImage(img, 0, 0, width, height)
            
            return canvas.toDataURL('image/webp', 0.8)
          }
        } catch (error) {
          console.error('Error extracting RAW preview:', error)
        }
        
        // If we get here, either no thumbnail was found or extraction failed
        return generatePlaceholderThumbnail(file.name)
      }
      
      // Handle non-RAW images
      const url = URL.createObjectURL(file)
      
      const img = document.createElement('img')
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      
      URL.revokeObjectURL(url)
      
      let width = img.width
      let height = img.height
      if (width > height) {
        if (width > maxDimension) {
          height = height * (maxDimension / width)
          width = maxDimension
        }
      } else {
        if (height > maxDimension) {
          width = width * (maxDimension / height)
          height = maxDimension
        }
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      ctx.drawImage(img, 0, 0, width, height)
      
      return canvas.toDataURL('image/webp', 0.8)
    } catch (error) {
      console.error('Error creating thumbnail:', error)
      return generatePlaceholderThumbnail(file.name)
    }
  }

  const getImageDateTime = async (file: File): Promise<Date> => {
    try {
      const exifData = await parseExif(file, ['DateTimeOriginal', 'CreateDate'])
      
      if (exifData?.DateTimeOriginal) {
        return new Date(exifData.DateTimeOriginal)
      } else if (exifData?.CreateDate) {
        return new Date(exifData.CreateDate)
      }
      
      return new Date(file.lastModified)
    } catch (error) {
      console.warn('Error reading EXIF data for file:', file.name, error)
      return new Date(file.lastModified)
    }
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
      const imageFiles: ImageWithMetadata[] = []
      
      status.value = 'Reading images from folder...'
      let rawCount = 0
      
      for await (const [name, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file') {
          const file = await (fileHandle as FileSystemFileHandle).getFile()
          const { isSupported, isRaw } = isImageFile(file)
          
          if (isSupported) {
            if (isRaw) rawCount++
            console.log('Processing image:', file.name, isRaw ? '(RAW)' : '')
            
            const [dateTime, thumbnail] = await Promise.all([
              getImageDateTime(file),
              createImageThumbnail(file, isRaw)
            ])
            
            imageFiles.push({
              file,
              dateTime,
              name: file.name,
              thumbnail,
              isRaw
            })
          }
        }
      }
      
      hasRawFiles.value = rawCount > 0
      images.value = imageFiles.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      status.value = `Loaded ${images.value.length} images (${rawCount} RAW), sorted by capture time`
      updatePreviewNames()
    } catch (error) {
      status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Folder selection error:', error)
    }
  }

  const selectOutputFolder = async () => {
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

  const parseCSV = async (file: File) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          csvData.value = results.data
          status.value = `Loaded ${results.data.length} records from CSV`
          updatePreviewNames()
          resolve(results.data)
        },
        error: (error) => {
          status.value = `CSV parsing error: ${error}`
          reject(error)
        }
      })
    })
  }

  const updatePreviewNames = () => {
    if (!selectedColumn.value || !csvData.value.length) {
      images.value = images.value.map(img => ({ ...img, newName: undefined }))
      return
    }

    images.value = images.value.map((img, index) => {
      const csvRow = csvData.value[index]
      if (!csvRow || !csvRow[selectedColumn.value]) return { ...img, newName: undefined }

      const extension = img.file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const newName = `${csvRow[selectedColumn.value]}.${extension}`
      return { ...img, newName }
    })
  }

  const renameImages = async () => {
    if (!dirHandle.value || !csvData.value.length || !images.value.length || !selectedColumn.value) {
      throw new Error('Please select both folder and CSV first')
    }

    if (!outputDirHandle.value) {
      const success = await selectOutputFolder()
      if (!success) return
    }

    isProcessing.value = true
    status.value = 'Starting copy and rename process...'
    
    try {
      let successCount = 0
      let errorCount = 0
      let currentFile = ''
      
      for (const image of images.value) {
        if (!image.newName) {
          console.warn(`No new name generated for image:`, image.file.name)
          errorCount++
          continue
        }

        try {
          if (outputDirHandle.value) {
            currentFile = image.file.name
            status.value = `Processing ${currentFile} -> ${image.newName}`
            console.log(`Processing ${currentFile} -> ${image.newName}`)
            
            const newHandle = await outputDirHandle.value.getFileHandle(image.newName, { create: true })
            const file = await (await dirHandle.value.getFileHandle(image.file.name)).getFile()
            
            const writer = await newHandle.createWritable()
            await writer.write(await file.arrayBuffer())
            await writer.close()
            
            console.log(`Successfully copied and renamed: ${image.newName}`)
            successCount++
          }
        } catch (error) {
          console.error(`Error processing ${currentFile}:`, error)
          errorCount++
        }
      }

      status.value = `Copied and renamed ${successCount} images. ${errorCount} errors.`
    } catch (error) {
      status.value = `Process error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Process error:', error)
    } finally {
      isProcessing.value = false
    }
  }

  return {
    images,
    csvData,
    status,
    isProcessing,
    selectedColumn,
    hasRawFiles,
    selectFolder,
    parseCSV,
    renameImages,
    updatePreviewNames
  }
}