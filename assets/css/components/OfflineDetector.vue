<!-- components/OfflineDetector.vue -->
<template>
    <div v-if="!isOnline" class="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded shadow-lg">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            You are currently offline. Some features may be limited.
          </p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  const isOnline = ref(true)
  
  onMounted(() => {
    isOnline.value = navigator.onLine
    window.addEventListener('online', () => isOnline.value = true)
    window.addEventListener('offline', () => isOnline.value = false)
  })
  
  onUnmounted(() => {
    window.removeEventListener('online', () => isOnline.value = true)
    window.removeEventListener('offline', () => isOnline.value = false)
  })
  </script>