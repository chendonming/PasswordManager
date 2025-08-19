<template>
  <div class="p-6">
    <div class="text-center">
      <svg
        class="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"
        />
      </svg>
      <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">密码管理器</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">使用现代化界面设计的密码管理器</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div
          class="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
        >
          <div
            class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">安全加密</h3>
          <p class="text-gray-600 dark:text-gray-400">使用 AES-256 加密算法保护您的密码数据</p>
        </div>

        <div
          class="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
        >
          <div
            class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">快速访问</h3>
          <p class="text-gray-600 dark:text-gray-400">快速搜索和访问您的密码条目</p>
        </div>

        <div
          class="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
        >
          <div
            class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-6 h-6 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">智能分类</h3>
          <p class="text-gray-600 dark:text-gray-400">使用标签和类别组织您的密码</p>
        </div>
      </div>

      <!-- 快速操作按钮 -->
      <div class="mt-8 flex justify-center space-x-4">
        <button
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all duration-150 font-medium"
          @click="$emit('navigate', 'all')"
        >
          查看所有密码
        </button>
        <button
          class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all duration-150 font-medium"
          @click="$emit('navigate', 'generator')"
        >
          生成密码
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义 emits
defineEmits<{
  navigate: [tabId: string]
}>()
</script>
