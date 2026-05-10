<template>
  <div class="min-h-screen bg-army-tan dark:bg-army-black text-gray-900 dark:text-gray-100 transition-colors duration-200">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-army-tan/90 dark:bg-army-black/90 backdrop-blur border-b border-army-tan-dark dark:border-army-dark">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Army star shield icon -->
          <svg class="w-7 h-7 text-army-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5zm0 2l-3 1.35V11c0 2.1 1.4 4.07 3 4.76 1.6-.69 3-2.66 3-4.76V8.35L12 7z"/>
          </svg>
          <span class="text-base font-bold tracking-wide uppercase">Image Rename</span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="showInstructions = !showInstructions"
                  :class="showInstructions
                    ? 'bg-army-gold text-army-black'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-army-tan-dark dark:border-army-dark'"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to use
          </button>
          <button @click="toggleTheme"
                  class="p-2 rounded text-gray-500 dark:text-gray-400 hover:text-army-gold dark:hover:text-army-gold border border-army-tan-dark dark:border-army-dark hover:border-army-gold dark:hover:border-army-gold transition-colors"
                  :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
            <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M6.343 6.343l-.707.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Instructions panel -->
    <div v-if="showInstructions" class="border-b border-army-tan-dark dark:border-army-dark bg-army-tan-dark/40 dark:bg-army-dark">
      <div class="max-w-3xl mx-auto px-4 py-5 space-y-3">
        <p class="text-xs font-bold uppercase tracking-widest text-army-gold">How to use this tool</p>
        <ol class="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
          <li>Have your Soldiers fill out an Excel sheet: <span class="font-semibold">Rank, First Name, Last Name, Company, Battalion, Brigade, Division</span></li>
          <li>Photograph them <strong>in the same order</strong> as the roster — JPEG preferred, RAW supported but slower</li>
          <li>Export the Excel sheet as a <strong>.csv</strong> file</li>
          <li>Select the photo folder (Step 1), upload the CSV (Step 2), pick filename columns (Step 3)</li>
          <li>Review the preview — photos are sorted by EXIF capture time and matched to roster rows in order</li>
          <li>Click <strong>Copy and Rename</strong> — originals are never deleted</li>
        </ol>
        <div class="text-xs font-medium text-gray-700 dark:text-gray-400 bg-army-gold/10 border border-army-gold/30 rounded px-3 py-2">
          <strong class="text-army-gold">Count mismatch?</strong> Ensure photos and roster rows are equal in count and in the same order.
        </div>
      </div>
    </div>

    <!-- Main -->
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-4">

      <!-- Status banner -->
      <div v-if="status"
           :class="[
             'px-4 py-3 rounded text-sm font-medium border',
             status.toLowerCase().includes('error')
               ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
               : 'bg-army-gold/10 text-gray-800 dark:text-gray-200 border-army-gold/40'
           ]">
        {{ status }}
      </div>

      <!-- RAW warning -->
      <div v-if="hasRawFiles"
           class="px-4 py-3 rounded text-sm border bg-army-gold/10 text-gray-800 dark:text-gray-300 border-army-gold/40">
        <strong class="text-army-gold">RAW files detected.</strong> Thumbnails use embedded previews and may look different from the final image.
      </div>

      <!-- Step 1: Select folder -->
      <div :class="stepCard(images.length > 0)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-army-gold mb-0.5">Step 1</p>
            <h2 class="font-bold text-gray-900 dark:text-white">Select Photo Folder</h2>
          </div>
          <span v-if="images.length > 0" class="flex items-center gap-1 text-xs font-bold text-army-gold uppercase tracking-wide">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ images.length }} photos
          </span>
        </div>
        <button @click="selectFolder"
                :disabled="isProcessing"
                class="inline-flex items-center gap-2 px-4 py-2 bg-army-gold hover:bg-yellow-400 text-army-black text-sm font-bold uppercase tracking-wide rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          {{ images.length > 0 ? 'Change Folder' : 'Choose Folder' }}
        </button>
      </div>

      <!-- Step 2: Upload CSV -->
      <div :class="stepCard(csvData.length > 0)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-army-gold mb-0.5">Step 2</p>
            <h2 class="font-bold text-gray-900 dark:text-white">Upload Roster</h2>
          </div>
          <span v-if="csvData.length > 0" class="flex items-center gap-1 text-xs font-bold text-army-gold uppercase tracking-wide">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ csvData.length }} rows
          </span>
        </div>
        <div class="flex flex-wrap gap-3">
          <label class="inline-flex items-center gap-2 px-4 py-2 bg-army-gold hover:bg-yellow-400 text-army-black text-sm font-bold uppercase tracking-wide rounded transition-colors cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ csvData.length > 0 ? 'Change CSV' : 'Choose CSV' }}
            <input type="file" accept=".csv" class="sr-only" @change="handleCSVUpload" :disabled="isProcessing" />
          </label>
          <button @click="downloadTemplate"
                  class="inline-flex items-center gap-2 px-4 py-2 border border-army-tan-dark dark:border-army-dark text-gray-600 dark:text-gray-400 hover:border-army-gold hover:text-army-gold dark:hover:border-army-gold dark:hover:text-army-gold text-sm font-bold uppercase tracking-wide rounded transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Template
          </button>
        </div>
      </div>

      <!-- Step 3: Build filename -->
      <div v-if="csvData.length > 0" :class="stepCard(selectedColumns.length > 0)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-army-gold mb-0.5">Step 3</p>
            <h2 class="font-bold text-gray-900 dark:text-white">Build Filename</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select columns in the order you want them</p>
          </div>
          <span v-if="selectedColumns.length > 0" class="flex items-center gap-1 text-xs font-bold text-army-gold uppercase tracking-wide">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Ready
          </span>
        </div>

        <!-- Column pills -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button v-for="column in csvColumns" :key="column"
                  @click="toggleColumn(column)"
                  :class="[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border transition-colors',
                    selectedColumns.includes(column)
                      ? 'bg-army-gold text-army-black border-army-gold'
                      : 'bg-transparent text-gray-600 dark:text-gray-400 border-army-tan-dark dark:border-army-dark hover:border-army-gold hover:text-army-gold dark:hover:border-army-gold dark:hover:text-army-gold'
                  ]">
            <span v-if="selectedColumns.includes(column)"
                  class="w-4 h-4 rounded-full bg-army-black/20 text-army-black flex items-center justify-center text-[10px] font-black flex-shrink-0">
              {{ selectedColumns.indexOf(column) + 1 }}
            </span>
            {{ column }}
          </button>
        </div>

        <!-- Separator -->
        <div class="flex items-center gap-3 mb-4">
          <label class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Separator</label>
          <input type="text"
                 v-model="columnSeparator"
                 @input="updatePreviewNames"
                 maxlength="5"
                 class="w-14 px-2 py-1 rounded border border-army-tan-dark dark:border-army-tan-dark bg-white dark:bg-army-dark text-center text-sm font-mono focus:outline-none focus:border-army-gold text-gray-900 dark:text-gray-100" />
        </div>

        <!-- Pattern preview -->
        <div v-if="selectedColumns.length > 0"
             class="px-3 py-2 rounded border border-army-gold/30 bg-army-gold/5 text-sm font-mono">
          <span class="text-gray-400 dark:text-gray-500">{{ selectedColumns.join(` ${columnSeparator} `) }} → </span>
          <span class="text-army-gold font-semibold">{{ exampleName }}</span>
        </div>
      </div>

      <!-- Count mismatch -->
      <div v-if="images.length > 0 && csvData.length > 0 && images.length !== csvData.length"
           class="flex items-center gap-2 px-4 py-3 rounded text-sm border bg-army-gold/10 text-gray-800 dark:text-gray-300 border-army-gold/40">
        <svg class="w-4 h-4 flex-shrink-0 text-army-gold" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span><strong class="text-army-gold">Count mismatch:</strong> {{ images.length }} photos vs {{ csvData.length }} roster rows — extra items will be skipped.</span>
      </div>

      <!-- Action button -->
      <button @click="handleRename"
              :disabled="!canRename || isProcessing"
              class="w-full py-3 rounded font-black text-sm uppercase tracking-widest transition-colors
                     bg-army-gold hover:bg-yellow-400 text-army-black
                     disabled:opacity-30 disabled:cursor-not-allowed">
        {{ isProcessing ? 'Processing…' : 'Copy and Rename Images' }}
      </button>

      <!-- Progress bar -->
      <div v-if="progress.total > 0" class="space-y-1.5">
        <div class="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>{{ progress.label }}</span>
          <span>{{ progress.current }} / {{ progress.total }}</span>
        </div>
        <div class="w-full h-2 bg-army-tan-dark dark:bg-army-dark rounded-full overflow-hidden">
          <div class="h-full bg-army-gold rounded-full transition-all duration-150"
               :style="{ width: `${Math.round((progress.current / progress.total) * 100)}%` }">
          </div>
        </div>
      </div>

    </main>

    <!-- Full-width photo grid -->
    <section v-if="images.length > 0" class="px-6 pb-10">
      <p class="text-[10px] font-bold uppercase tracking-widest text-army-gold mb-3 max-w-3xl mx-auto pl-0">
        Preview — {{ images.length }} photos
      </p>
      <div class="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        <div v-for="(image, index) in images" :key="index">
          <div class="aspect-[3/4] relative rounded overflow-hidden bg-army-tan-dark dark:bg-army-dark">
            <img v-if="image.thumbnail"
                 :src="image.thumbnail"
                 class="object-cover w-full h-full"
                 :alt="image.file.name" />
            <div v-else class="flex items-center justify-center w-full h-full text-xs text-gray-400">
              Loading…
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-8 pb-2">
              <div class="flex items-center gap-1 truncate mb-0.5">
                <span v-if="image.isRaw"
                      class="flex-shrink-0 text-[9px] font-black px-1 py-px bg-army-gold text-army-black rounded-sm">RAW</span>
                <span class="text-xs text-white/70 truncate">{{ image.file.name }}</span>
              </div>
              <div v-if="image.newName" class="text-xs text-army-gold font-bold truncate">
                → {{ image.newName }}
              </div>
            </div>
          </div>
          <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-500 truncate px-0.5">
            {{ image.dateTime.toLocaleString() }}
          </p>
        </div>
      </div>
    </section>

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
  progress,
  selectedColumns,
  columnSeparator,
  hasRawFiles,
  selectFolder,
  parseCSV,
  renameImages,
  updatePreviewNames,
} = useFileSystem()

// --- Dark mode ---
const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  isDark.value = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark.value)
})

// --- Instructions toggle ---
const showInstructions = ref(false)

// --- Step card class ---
const stepCard = (complete: boolean) =>
  [
    'bg-white/60 dark:bg-army-dark rounded p-5 border-l-4',
    'border border-army-tan-dark dark:border-army-dark border-l-army-gold',
    complete ? 'border-l-army-gold' : 'border-l-gray-300 dark:border-l-gray-700',
  ].join(' ')

// --- CSV columns ---
const csvColumns = computed(() => {
  if (!csvData.value?.length) return []
  return Object.keys(csvData.value[0] || {})
})

// --- Can rename ---
const canRename = computed(() =>
  images.value.length > 0 &&
  csvData.value.length > 0 &&
  selectedColumns.value.length > 0
)

// --- Example filename ---
const exampleName = computed(() => {
  const row = csvData.value[0]
  if (!row || !selectedColumns.value.length) return ''
  return selectedColumns.value
    .map(col => (row[col] ?? '').toString().trim())
    .filter(Boolean)
    .join(columnSeparator.value)
})

// --- Column toggle ---
const toggleColumn = (column: string) => {
  const idx = selectedColumns.value.indexOf(column)
  selectedColumns.value = idx === -1
    ? [...selectedColumns.value, column]
    : selectedColumns.value.filter(c => c !== column)
  updatePreviewNames()
}

// --- CSV upload ---
const handleCSVUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await parseCSV(file)
    selectedColumns.value = []
  } catch (error) {
    console.error('CSV upload error:', error)
  }
}

// --- Rename ---
const handleRename = async () => {
  if (!canRename.value) return
  try {
    await renameImages()
  } catch (error) {
    console.error('Rename error:', error)
  }
}

// --- Template download ---
const downloadTemplate = () => {
  const templateData = [
    { Rank: 'SPC', 'First Name': 'John',  'Last Name': 'Doe',    Company: 'HHC', Battalion: '1-2', Brigade: '1ABCT', Division: '1ID' },
    { Rank: 'SGT', 'First Name': 'Jane',  'Last Name': 'Smith',  Company: 'A',   Battalion: '2-3', Brigade: '2ABCT', Division: '1ID' },
    { Rank: 'CPT', 'First Name': 'James', 'Last Name': 'Brown',  Company: 'B',   Battalion: '1-4', Brigade: '1ABCT', Division: '2ID' },
    { Rank: 'PFC', 'First Name': 'Maria', 'Last Name': 'Garcia', Company: 'C',   Battalion: '3-1', Brigade: '3ABCT', Division: '1ID' },
    { Rank: 'SSG', 'First Name': 'Lee',   'Last Name': 'Kim',    Company: 'HHC', Battalion: '2-2', Brigade: '2ABCT', Division: '4ID' },
  ]
  const csv = Papa.unparse(templateData)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hero_photos_template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>
