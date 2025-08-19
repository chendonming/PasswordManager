<template>
  <div
    class="h-12 border-b flex items-center justify-between px-4 drag-region bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  >
    <!-- 应用标题和图标 -->
    <div class="flex items-center space-x-3 no-drag">
      <div class="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-200"> 密码管理器 </span>
    </div>

    <!-- 搜索框 -->
    <div class="flex-1 max-w-md mx-8 no-drag">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索密码..."
          class="w-full pl-10 pr-4 py-1.5 text-sm bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          @input="$emit('search', searchQuery)"
        />
      </div>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="flex items-center space-x-1 no-drag">
      <!-- 主题切换按钮 -->
      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="切换主题"
        @click="$emit('toggle-theme')"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400 dark:hidden"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <!-- 月亮图标 (深色主题) -->
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400 hidden dark:block"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <!-- 太阳图标 (浅色主题) -->
          <path
            fill-rule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200"
        title="最小化"
        @click="minimizeWindow"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200"
        title="最大化"
        @click="maximizeWindow"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200"
        title="关闭"
        @click="closeWindow"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 定义 emits
defineEmits<{
  search: [query: string]
  'toggle-theme': []
}>()

// 响应式数据
const searchQuery = ref('')

// 窗口控制方法
const minimizeWindow = (): void => {
  if (window.api) {
    window.api.minimizeWindow()
  }
}

const maximizeWindow = (): void => {
  if (window.api) {
    window.api.maximizeWindow()
  }
}

const closeWindow = (): void => {
  if (window.api) {
    window.api.closeWindow()
  }
}
</script>

<style>
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>
