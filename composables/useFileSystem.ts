// composables/useFileSystem.ts
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import exifr from 'exifr'

// Add IndexedDB support for storing handles
const DB_NAME = 'ImageRenameApp'
const STORE_NAME = 'fileHandles'

interface StoredHandle {
  type: 'input' | 'output'
  handle: FileSystemDirectoryHandle
}

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
}

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'type' })
      }
    }
  })
}

const storeHandle = async (type: 'input' | 'output', handle: FileSystemDirectoryHandle) => {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await store.put({ type, handle })
}

const getStoredHandle = async (type: 'input' | 'output'): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const handle = await store.get(type)
  return handle?.handle || null
}

export const useFileSystem = () => {
  const images = ref<ImageWithMetadata[]>([])
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const outputDirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const csvData = ref<any[]>([])
  const status = ref('')
  const isProcessing = ref(false)
  const selectedColumn = ref('')
  const isOffline = ref(!navigator.onLine)

  // Update offline status
  window.addEventListener('online', () => isOffline.value = false)
  window.addEventListener('offline', () => isOffline.value = true)

  const createImageThumbnail = async (file: File): Promise<string> => {
    try {
      const maxDimension = 400
      
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
      return ''
    }
  }

  const loadStoredHandles = async () => {
    try {
      // Try to load stored handles
      const storedInputHandle = await getStoredHandle('input')
      const storedOutputHandle = await getStoredHandle('output')

      if (storedInputHandle) {
        // Verify we still have permission
        const permission = await storedInputHandle.requestPermission({ mode: 'read' })
        if (permission === 'granted') {
          dirHandle.value = storedInputHandle
          await loadImagesFromHandle(storedInputHandle)
        }
      }

      if (storedOutputHandle) {
        const permission = await storedOutputHandle.requestPermission({ mode: 'readwrite' })
        if (permission === 'granted') {
          outputDirHandle.value = storedOutputHandle
        }
      }
    } catch (error) {
      console.error('Error loading stored handles:', error)
    }
  }

  const loadImagesFromHandle = async (handle: FileSystemDirectoryHandle) => {
    const imageFiles: ImageWithMetadata[] = []
    
    status.value = 'Reading images from folder...'
    for await (const [name, fileHandle] of handle.entries()) {
      if (fileHandle.kind === 'file') {
        const file = await (fileHandle as FileSystemFileHandle).getFile()
        if (file.type.startsWith('image/')) {
          console.log('Processing image:', file.name)
          const [dateTime, thumbnail] = await Promise.all([
            getImageDateTime(file),
            createImageThumbnail(file)
          ])
          imageFiles.push({
            file,
            dateTime,
            name: file.name,
            thumbnail
          })
        }
      }
    }
    
    images.value = imageFiles.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    status.value = `Loaded ${images.value.length} images, sorted by capture time`
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
      
      // Store the handle for offline access
      await storeHandle('input', handle)
      
      await loadImagesFromHandle(handle)
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
      
      // Store the handle for offline access
      await storeHandle('output', handle)
      
      status.value = 'Output folder selected'
      return true
    } catch (error) {
      status.value = `Error selecting output folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Output folder selection error:', error)
      return false
    }
  }

  // Rest of the code remains the same...
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

  const getImageDateTime = async (file: File): Promise<Date> => {
    try {
      const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
      
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
      
      for (const image of images.value) {
        if (!image.newName) {
          console.warn(`No new name generated for image:`, image.file.name)
          errorCount++
          continue
        }

        try {
          if (outputDirHandle.value) {
            console.log(`Processing ${image.file.name} -> ${image.newName}`)
            
            const newHandle = await outputDirHandle.value.getFileHandle(image.newName, { create: true })
            const file = await (await dirHandle.value.getFileHandle(image.file.name)).getFile()
            
            const writer = await newHandle.createWritable()
            await writer.write(await file.arrayBuffer())
            await writer.close()
            
            console.log(`Successfully copied and renamed: ${image.newName}`)
            successCount++
          }
        } catch (error) {
          console.error(`Error processing ${image.file.name}:`, error)
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

  // Initialize by loading stored handles
  onMounted(() => {
    loadStoredHandles()
  })

  return {
    images,
    csvData,
    status,
    isProcessing,
    selectedColumn,
    isOffline,
    selectFolder,
    parseCSV,
    renameImages,
    updatePreviewNames
  }
}