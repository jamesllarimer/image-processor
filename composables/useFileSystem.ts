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
  newName?: string  // Added for preview
}

export const useFileSystem = () => {
  const images = ref<ImageWithMetadata[]>([])
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const outputDirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const csvData = ref<any[]>([])
  const status = ref('')
  const isProcessing = ref(false)
  const selectedColumn = ref('')

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
      for await (const [name, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file') {
          const file = await (fileHandle as FileSystemFileHandle).getFile()
          if (file.type.startsWith('image/')) {
            console.log('Processing image:', file.name)
            const dateTime = await getImageDateTime(file)
            imageFiles.push({
              file,
              dateTime,
              name: file.name
            })
          }
        }
      }
      
      // Sort images by dateTime
      images.value = imageFiles.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      status.value = `Loaded ${images.value.length} images, sorted by capture time`
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

  const renameImages = async () => {
    if (!dirHandle.value || !csvData.value.length || !images.value.length || !selectedColumn.value) {
      throw new Error('Please select both folder and CSV first')
    }

    // First select output folder
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
            
            // Create a new file in the output directory
            const newHandle = await outputDirHandle.value.getFileHandle(image.newName, { create: true })
            
            // Get the original file's content
            const file = await (await dirHandle.value.getFileHandle(image.file.name)).getFile()
            
            // Write to the new file
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

  return {
    images,
    csvData,
    status,
    isProcessing,
    selectedColumn,
    selectFolder,
    parseCSV,
    renameImages,
    updatePreviewNames
  }
}