// composables/useFileSystem.ts
import { ref } from 'vue'
import Papa from 'papaparse'

export const useFileSystem = () => {
  const images = ref<File[]>([])
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const csvData = ref<any[]>([])
  const status = ref('')  // Initialize as empty string
  const isProcessing = ref(false)

  const selectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        status.value = 'File System Access API not supported in this browser'
        return
      }
      
      dirHandle.value = await window.showDirectoryPicker()
      const files: File[] = []
      
      for await (const [name, handle] of dirHandle.value.entries()) {
        if (handle.kind === 'file') {
          const file = await handle.getFile()
          if (file.type.startsWith('image/')) {
            files.push(file)
          }
        }
      }
      
      images.value = files
      status.value = `Loaded ${files.length} images`
    } catch (error) {
      status.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Folder selection error:', error)
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
          resolve(results.data)
        },
        error: (error) => {
          status.value = `CSV parsing error: ${error}`
          reject(error)
        }
      })
    })
  }

  const renameImages = async (filenameColumn: string) => {
    if (!dirHandle.value || !csvData.value.length || !images.value.length) {
      throw new Error('Please select both folder and CSV first')
    }

    isProcessing.value = true
    status.value = 'Starting rename process...'
    
    try {
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < images.value.length; i++) {
        const image = images.value[i]
        const csvRow = csvData.value[i]
        
        if (!csvRow || !csvRow[filenameColumn]) {
          errorCount++
          continue
        }

        const newName = csvRow[filenameColumn]
        const extension = image.name.split('.').pop()
        const fullNewName = `${newName}.${extension}`

        try {
          const oldHandle = await dirHandle.value.getFileHandle(image.name)
          await dirHandle.value.getFileHandle(fullNewName, { create: true })
          await oldHandle.remove()
          successCount++
        } catch (error) {
          console.error(`Error renaming ${image.name}:`, error)
          errorCount++
        }
      }

      status.value = `Renamed ${successCount} images. ${errorCount} errors.`
    } catch (error) {
      status.value = `Rename process error: ${error instanceof Error ? error.message : 'Unknown error'}`
    } finally {
      isProcessing.value = false
    }
  }

  return {
    images,
    csvData,
    status,
    isProcessing,
    selectFolder,
    parseCSV,
    renameImages
  }
}