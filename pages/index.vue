<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Image Renaming Tool</h1>
      <button v-if="canInstall"
              @click="installApp"
              class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
        Install App
      </button>
    </div>
    
    <div class="bg-gray-50 p-4 rounded-lg mb-6 text-gray-700">
      <h2 class="font-semibold mb-2">How to Use This Tool</h2>
      <ol class="list-decimal list-inside space-y-2">
        <li>First, have your Soldiers fill out their information in an Excel spreadsheet with columns for:
          <span class="text-gray-600 ml-4">Rank, First Name, Last Name, Company, Battalion, Brigade, Division</span>
        </li>
        <li>Take photos of the Soldiers in the same order as they appear in your spreadsheet</li>
        <li>Export your Excel sheet as a CSV file</li>
        <li>Click "Select Image Folder" to choose the folder containing your photos</li>
        <li>Upload your CSV file using the file input below</li>
        <li>Select the column from your CSV that contains the complete filename</li>
        <li>Review the preview of how your files will be renamed</li>
        <li>Click "Copy and Rename Images" to process all files</li>
      </ol>
      <p class="mt-4 text-sm text-gray-600">This tool helps photographers to bulk rename photos by matching chronologically taken photos with Soldier information from a CSV file.</p>
      <div class="mt-2 text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
        <strong>Note:</strong> The template's filename structure (Rank_LastName_FirstName_Company_...) is just an example. You can use any filename structure you prefer in your CSV - just make sure you have a column containing your desired filenames. The app will match photos to filenames in the order they were taken.
      </div>
      <div class="mt-4">
        <button @click="downloadTemplate" 
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Download Template CSV
        </button>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Status Display -->
      <div v-if="status" 
           :class="['p-4 rounded', 
                    status.includes('Error') ? 'bg-red-100' : 'bg-blue-100']">
        {{ status }}
      </div>

      <!-- File Selection -->
      <div class="space-y-4">
        <div>
          <button @click="selectFolder"
                  class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  :disabled="isProcessing">
            Select Image Folder
          </button>
          <span class="ml-2 text-sm text-gray-600">
            {{ images.length }} images selected
          </span>
        </div>

        <div>
          <input type="file"
                 accept=".csv"
                 @change="handleCSVUpload"
                 :disabled="isProcessing"
                 class="block w-full text-sm text-gray-500 
                        file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 
                        file:text-sm file:font-semibold file:bg-blue-50 
                        file:text-blue-700 hover:file:bg-blue-100" />
        </div>
      </div>

      <!-- CSV Column Selection -->
      <div v-if="csvData.length" class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Select filename column from CSV
        </label>
        <select v-model="selectedColumn"
                @change="updatePreviewNames"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                       focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select column</option>
          <option v-for="column in csvColumns" 
                  :key="column" 
                  :value="column">
            {{ column }}
          </option>
        </select>
      </div>

      <!-- Rename Button -->
      <div class="space-x-4">
        <button @click="handleRename"
                :disabled="!canRename"
                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded
                       disabled:bg-gray-300 disabled:cursor-not-allowed">
          {{ isProcessing ? 'Processing...' : 'Copy and Rename Images' }}
        </button>
      </div>

      <!-- Image Preview -->
      <div v-if="images.length" 
           class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="(image, index) in images"
             :key="index"
             class="space-y-2">
          <div class="aspect-square relative rounded overflow-hidden bg-gray-100">
            <img v-if="image.thumbnail"
                 :src="image.thumbnail"
                 class="object-cover w-full h-full"
                 :alt="image.file.name" />
            <div v-else
                 class="flex items-center justify-center w-full h-full text-gray-400">
              Loading...
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 
                        text-white text-xs p-1">
              <div class="truncate">Current: {{ image.file.name }}</div>
              <div v-if="image.newName" class="truncate text-green-300">
                New: {{ image.newName }}
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            Taken: {{ image.dateTime.toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Papa from 'papaparse'
import { useFileSystem } from '../composables/useFileSystem'

const { 
  images,
  csvData,
  status,
  isProcessing,
  selectedColumn,
  selectFolder,
  parseCSV,
  renameImages,
  updatePreviewNames
} = useFileSystem()

const csvColumns = computed(() => {
  if (!csvData.value?.length) return []
  return Object.keys(csvData.value[0] || {})
})

const canRename = computed(() => {
  return images.value.length > 0 && 
         csvData.value.length > 0 && 
         selectedColumn.value
})

const handleCSVUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    try {
      await parseCSV(file)
      selectedColumn.value = ''
    } catch (error) {
      console.error('CSV upload error:', error)
    }
  }
}

const handleRename = async () => {
  if (!canRename.value) return
  
  try {
    await renameImages()
  } catch (error) {
    console.error('Rename error:', error)
  }
}

// PWA Installation
const deferredPrompt = ref<any>(null)
const canInstall = computed(() => {
  // Return false if app is in standalone mode (already installed)
  if (window?.matchMedia?.('(display-mode: standalone)')?.matches) {
    console.log('PWA Debug: App is running in standalone mode (already installed)')
    return false
  }
  // Show install button if not in standalone mode
  return true
})

onMounted(() => {
  console.log('PWA Debug: Component mounted')
  console.log('PWA Debug: Is standalone:', window?.matchMedia?.('(display-mode: standalone)')?.matches)
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA Debug: beforeinstallprompt event fired')
    e.preventDefault()
    deferredPrompt.value = e
    console.log('PWA Debug: Stored install prompt')
  })

  window.addEventListener('appinstalled', () => {
    console.log('PWA Debug: App was successfully installed')
    deferredPrompt.value = null
  })
})

const installApp = async () => {
  console.log('PWA Debug: Install button clicked')
  if (!deferredPrompt.value) {
    console.log('PWA Debug: Installation prompt not available')
    return
  }
  
  try {
    deferredPrompt.value.prompt()
    const choiceResult = await deferredPrompt.value.userChoice
    console.log('PWA Debug: User choice result:', choiceResult)
    
    if (choiceResult.outcome === 'accepted') {
      console.log('PWA Debug: User accepted the install prompt')
    } else {
      console.log('PWA Debug: User dismissed the install prompt')
    }
  } catch (error) {
    console.log('PWA Debug: Error during installation:', error)
  }
  
  deferredPrompt.value = null
}

const downloadTemplate = () => {
  // Create template data
  const templateData = [
    {
      Rank: "SPC",
      "First Name": "John",
      "Last Name": "Doe",
      Company: "HHC",
      Battalion: "1-2",
      Brigade: "1ABCT",
      Division: "1ID",
      "Generated Filename": "SPC_Doe_John_HHC_1-2_1ABCT_1ID"
    }
  ]

  // Convert to CSV
  const csv = Papa.unparse(templateData)
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'hero_photos_template.csv')
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>