<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Image Renaming Tool</h1>
    
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
      <div>
        <button @click="handleRename"
                :disabled="!canRename"
                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded
                       disabled:bg-gray-300 disabled:cursor-not-allowed">
          {{ isProcessing ? 'Processing...' : 'Rename Images' }}
        </button>
      </div>
 
      <!-- Image Preview -->
      <div v-if="images.length" 
           class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div v-for="(image, index) in images"
             :key="index"
             class="aspect-square relative rounded overflow-hidden bg-gray-100">
          <img :src="getImageUrl(image)"
               class="object-cover w-full h-full" />
          <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 
                      text-white text-xs p-1 truncate">
            {{ image.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
 </template>
 
 <script setup>
 import { ref, computed, onUnmounted, watch } from 'vue'
 
 const { 
  images,
  csvData,
  status,
  isProcessing,
  selectFolder,
  parseCSV,
  renameImages
 } = useFileSystem()
 
 const selectedColumn = ref('')
 
 const csvColumns = computed(() => {
  if (!csvData.value?.length) return []
  return Object.keys(csvData.value[0] || {})
 })
 
 const canRename = computed(() => {
  return images.value.length > 0 && 
         csvData.value.length > 0 && 
         selectedColumn.value
 })
 
 const imageUrls = new Map()
 
 const getImageUrl = (file) => {
  if (!imageUrls.has(file)) {
    const url = window.URL.createObjectURL(file)
    imageUrls.set(file, url)
  }
  return imageUrls.get(file)
 }
 
 // Watch for changes in images to clean up unused URLs
 watch(() => images.value, (newImages, oldImages) => {
  // Clean up URLs for images that are no longer present
  imageUrls.forEach((url, file) => {
    if (!newImages.includes(file)) {
      window.URL.revokeObjectURL(url)
      imageUrls.delete(file)
    }
  })
 }, { deep: true })
 
 const handleCSVUpload = async (event) => {
  const file = event.target.files?.[0]
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
    await renameImages(selectedColumn.value)
  } catch (error) {
    console.error('Rename error:', error)
  }
 }
 
 // Cleanup on component unmount
 onUnmounted(() => {
  imageUrls.forEach(url => {
    window.URL.revokeObjectURL(url)
  })
  imageUrls.clear()
 })
 </script>