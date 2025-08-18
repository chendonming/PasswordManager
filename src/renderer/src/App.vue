<template>
  <div id="app" class="h-screen flex flex-col bg-gray-50">
    <!-- 自定义标题栏 -->
    <div
      class="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 drag-region"
    >
      <div class="flex items-center space-x-3 no-drag">
        <div class="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <span class="text-sm font-semibold text-gray-700">密码管理器</span>
      </div>

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
            class="w-full pl-10 pr-4 py-1\.5 text-sm bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex items-center space-x-1 no-drag">
        <button
          class="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          title="最小化"
          @click="minimizeWindow"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>

        <button
          class="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          title="最大化"
          @click="maximizeWindow"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- 主要内容区域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏 -->
      <div class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">用户</p>
              <p class="text-xs text-gray-500">{{ mockPasswords.length }} 个密码</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 p-4">
          <div class="space-y-1">
            <button
              v-for="item in navigationItems"
              :key="item.id"
              :class="[
                'w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              ]"
              @click="activeTab = item.id"
            >
              <component :is="getIconComponent(item.icon)" class="w-6 h-6" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </nav>
      </div>

      <!-- 主内容区 -->
      <div class="flex-1 bg-white">
        <div class="p-6">
          <div class="text-center">
            <svg
              class="w-24 h-24 mx-auto mb-4 text-gray-300"
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
            <h1 class="text-2xl font-bold text-gray-900 mb-2">密码管理器</h1>
            <p class="text-gray-600 mb-8">使用现代化界面设计的密码管理器</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div class="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div
                  class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-6 h-6 text-blue-600"
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
                <h3 class="text-lg font-semibold text-gray-900 mb-2">安全加密</h3>
                <p class="text-gray-600">使用 AES-256 加密算法保护您的密码数据</p>
              </div>

              <div class="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div
                  class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-6 h-6 text-green-600"
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
                <h3 class="text-lg font-semibold text-gray-900 mb-2">快速访问</h3>
                <p class="text-gray-600">快速搜索和访问您的密码条目</p>
              </div>

              <div class="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div
                  class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-6 h-6 text-purple-600"
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
                <h3 class="text-lg font-semibold text-gray-900 mb-2">智能分类</h3>
                <p class="text-gray-600">使用标签和类别组织您的密码</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 响应式数据
const activeTab = ref('all')
const searchQuery = ref('')

// 模拟数据
const mockPasswords = [
  { id: 1, title: 'GitHub', username: 'user@example.com' },
  { id: 2, title: '网易邮箱', username: 'example@163.com' }
]

const navigationItems = [
  { id: 'all', label: '全部密码', icon: 'KeyIcon' },
  { id: 'favorites', label: '收藏夹', icon: 'StarIcon' },
  { id: 'recent', label: '最近使用', icon: 'ClockIcon' },
  { id: 'generator', label: '密码生成器', icon: 'CogIcon' }
]

// 图标组件映射
const iconComponents = {
  KeyIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"/>
      </svg>
    `
  },
  StarIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
      </svg>
    `
  },
  ClockIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `
  },
  CogIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    `
  }
}

// 动态获取图标组件
const getIconComponent = (iconName: string): object => {
  return iconComponents[iconName as keyof typeof iconComponents] || iconComponents.KeyIcon
}

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
