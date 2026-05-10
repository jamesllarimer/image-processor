<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Image Renaming Tool</h1>
    
    <div class="bg-gray-50 p-4 rounded-lg mb-6 text-gray-700">
      <h2 class="font-semibold mb-2">How to Use This Tool</h2>
      <ol class="list-decimal list-inside space-y-2">
        <li>First, have your Soldiers fill out their information in an Excel spreadsheet with columns for:
          <span class="text-gray-600 ml-4">Rank, First Name, Last Name, Company, Battalion, Brigade, Division</span>
        </li>
        <li>Take photos of the service members in the same order as they appear in your spreadsheet. <strong>Shoot in JPEG format. </strong><i>If you accidentally shoot in RAW, the tool also supports various RAW formats but it takes longer to process them and is error prone.</i></li>
        <li>Export your Excel sheet as a CSV file</li>
        <li>Click "Select Image Folder" to choose the folder containing your photos</li>
        <li>Upload your CSV file using the file input below</li>
        <li>Check the columns you want in the filename, in the order you want them</li>
        <li>Review the preview of how your files will be renamed</li>
        <li>Click "Copy and Rename Images" to process all files</li>
      </ol>
      <p class="mt-4 text-sm text-gray-600">This tool helps photographers to bulk rename photos by matching chronologically taken photos with Soldier information from a CSV file.</p>
      <div class="mt-2 text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
        <strong>Note:</strong> After uploading your CSV, check the columns you want in the filename and set a separator (default <code>_</code>). The app assembles the name from those columns in the order you checked them, then matches photos to rows in chronological order.
      </div>
      <div class="mt-2 text-sm bg-blue-50 p-3 rounded border border-blue-200">
        <strong>RAW Support:</strong> This tool supports various RAW formats including ARW (Sony), CR2 (Canon), NEF (Nikon), RAF (Fujifilm), and others. RAW files may take longer to process due to their size.
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

      <!-- RAW Files Warning -->
      <div v-if="hasRawFiles" 
           class="p-4 rounded bg-yellow-50 border border-yellow-200">
        <p class="text-yellow-800">
          <strong>Note:</strong> RAW files detected. Processing these files may take longer due to their size. 
          The preview thumbnails for RAW files are generated from embedded previews and may appear different from the final images.
        </p>
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
      <div v-if="csvData.length" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Select columns to build filename <span class="text-gray-400 font-normal">(check in the order you want them)</span>
          </label>
          <div class="border border-gray-200 rounded-md p-3 space-y-1 bg-white">
            <label v-for="column in csvColumns"
                   :key="column"
                   class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
              <input type="checkbox"
                     :value="column"
                     :checked="selectedColumns.includes(column)"
                     @change="toggleColumn(column)"
                     class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-700">{{ column }}</span>
            </label>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Separator</label>
          <input type="text"
                 v-model="columnSeparator"
                 @input="updatePreviewNames"
                 maxlength="5"
                 class="w-20 rounded-md border-gray-300 shadow-sm text-sm text-center
                        focus:border-blue-500 focus:ring-blue-500" />
        </div>

        <div v-if="selectedColumns.length" class="text-sm bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          <span class="text-gray-500">Pattern: </span>
          <span class="font-mono text-blue-700">{{ selectedColumns.join(` ${columnSeparator} `) }}</span>
          <span v-if="csvData[0]" class="text-gray-400"> &rarr; </span>
          <span v-if="csvData[0]" class="font-mono text-green-700">{{ exampleName }}</span>
        </div>
      </div>

      <!-- Rename Button -->
      <div class="space-x-4">
        <button @click="handleRename"
                :disabled="!canRename || isProcessing"
                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded
                       disabled:bg-gray-300 disabled:cursor-not-allowed">
          {{ isProcessing ? 'Processing...' : 'Copy and Rename Images' }}
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="progress.total > 0" class="space-y-1">
        <div class="flex justify-between text-sm text-gray-600">
          <span>{{ progress.label }}</span>
          <span>{{ progress.current }} / {{ progress.total }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div class="bg-blue-500 h-2.5 rounded-full transition-all duration-150"
               :style="{ width: `${Math.round((progress.current / progress.total) * 100)}%` }">
          </div>
        </div>
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
              <div class="truncate">
                Current: {{ image.file.name }}
                <span v-if="image.isRaw" 
                      class="ml-1 px-1 py-0.5 bg-yellow-500 text-black rounded-sm text-xs">
                  RAW
                </span>
              </div>
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
import { computed } from 'vue'
import Papa from 'papaparse'
import { useFileSystem } from '../composables/useFileSystem'

const {
  images,
  csvData,
  status,
  isProcessing,
  progress,
  selectedColumns,
  columnSeparator,
  hasRawFiles,
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
         selectedColumns.value.length > 0
})

const exampleName = computed(() => {
  const row = csvData.value[0]
  if (!row || !selectedColumns.value.length) return ''
  return selectedColumns.value
    .map(col => (row[col] ?? '').toString().trim())
    .filter(Boolean)
    .join(columnSeparator.value)
})

const toggleColumn = (column: string) => {
  const idx = selectedColumns.value.indexOf(column)
  if (idx === -1) {
    selectedColumns.value = [...selectedColumns.value, column]
  } else {
    selectedColumns.value = selectedColumns.value.filter(c => c !== column)
  }
  updatePreviewNames()
}

const handleCSVUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    try {
      await parseCSV(file)
      selectedColumns.value = []
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

const downloadTemplate = () => {
  // Create template data
  const templateData = [
    { Rank: "SPC", "First Name": "John",  "Last Name": "Doe",    Company: "HHC", Battalion: "1-2", Brigade: "1ABCT", Division: "1ID" },
    { Rank: "SGT", "First Name": "Jane",  "Last Name": "Smith",  Company: "A",   Battalion: "2-3", Brigade: "2ABCT", Division: "1ID" },
    { Rank: "CPT", "First Name": "James", "Last Name": "Brown",  Company: "B",   Battalion: "1-4", Brigade: "1ABCT", Division: "2ID" },
    { Rank: "PFC", "First Name": "Maria", "Last Name": "Garcia", Company: "C",   Battalion: "3-1", Brigade: "3ABCT", Division: "1ID" },
    { Rank: "SSG", "First Name": "Lee",   "Last Name": "Kim",    Company: "HHC", Battalion: "2-2", Brigade: "2ABCT", Division: "4ID" }
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