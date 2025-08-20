<template>
  <div
    v-if="showHelp"
    class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-4"
  >
    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">搜索技巧</h3>
    <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
      <div class="flex items-center">
        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2">title:github</kbd>
        <span>搜索标题包含 "github" 的条目</span>
      </div>
      <div class="flex items-center">
        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2">user:admin</kbd>
        <span>搜索用户名包含 "admin" 的条目</span>
      </div>
      <div class="flex items-center">
        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2">url:google</kbd>
        <span>搜索网址包含 "google" 的条目</span>
      </div>
      <div class="flex items-center">
        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-2">tag:work</kbd>
        <span>搜索标签包含 "work" 的条目</span>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
        <span class="text-gray-500">支持模糊搜索，可以输入部分关键词</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showHelp: boolean
}

defineProps<Props>()
</script>
