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
      <!-- 侧边栏组件 -->
      <Sidebar
        :active-tab="activeTab"
        :user-info="{ username: '用户', passwordCount: mockPasswords.length }"
        @navigate="handleNavigate"
        @sync="handleSync"
        @settings="handleSettings"
      />

      <!-- 主内容区 -->
      <div class="flex-1 bg-white">
        <!-- 全部密码视图 -->
        <div v-if="activeTab === 'all'" class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">全部密码</h2>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              添加密码
            </button>
          </div>

          <div class="grid gap-4">
            <div
              v-for="password in mockPasswords"
              :key="password.id"
              class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">{{ password.title }}</h3>
                    <p class="text-sm text-gray-500">{{ password.username }}</p>
                  </div>
                </div>
                <button
                  class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                >
                  复制密码
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 收藏夹视图 -->
        <div v-else-if="activeTab === 'favorites'" class="p-6">
          <div class="text-center py-12">
            <svg
              class="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">暂无收藏的密码</h3>
            <p class="text-gray-500">将重要的密码添加到收藏夹，方便快速访问</p>
          </div>
        </div>

        <!-- 最近使用视图 -->
        <div v-else-if="activeTab === 'recent'" class="p-6">
          <div class="text-center py-12">
            <svg
              class="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">暂无最近使用的密码</h3>
            <p class="text-gray-500">最近访问的密码将在这里显示</p>
          </div>
        </div>

        <!-- 密码生成器视图 -->
        <div v-else-if="activeTab === 'generator'" class="p-6">
          <div class="max-w-md mx-auto">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">密码生成器</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">生成的密码</label>
                <div class="flex">
                  <input
                    v-model="generatedPassword"
                    type="text"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    class="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    复制
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >密码长度: {{ passwordLength }}</label
                >
                <input
                  v-model="passwordLength"
                  type="range"
                  min="6"
                  max="50"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="includeUppercase"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">包含大写字母 (A-Z)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="includeLowercase"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">包含小写字母 (a-z)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="includeNumbers"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">包含数字 (0-9)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="includeSymbols"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">包含符号 (!@#$%^&*)</span>
                </label>
              </div>

              <button
                class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                @click="generatePassword"
              >
                生成新密码
              </button>
            </div>
          </div>
        </div>

        <!-- 默认/欢迎视图 -->
        <div v-else class="p-6">
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
import Sidebar from './components/Sidebar.vue'

// 响应式数据
const activeTab = ref('all')
const searchQuery = ref('')

// 密码生成器相关状态
const generatedPassword = ref('P@ssw0rd123!')
const passwordLength = ref(12)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(false)

// 模拟数据
const mockPasswords = [
  { id: 1, title: 'GitHub', username: 'user@example.com' },
  { id: 2, title: '网易邮箱', username: 'example@163.com' },
  { id: 3, title: 'Google', username: 'myemail@gmail.com' },
  { id: 4, title: '微信公众平台', username: 'admin@company.com' }
]

// 事件处理方法
const handleNavigate = (tabId: string): void => {
  activeTab.value = tabId
}

const handleSync = (): void => {
  console.log('同步数据')
}

const handleSettings = (): void => {
  console.log('打开设置')
}

// 密码生成器方法
const generatePassword = (): void => {
  let charset = ''
  if (includeUppercase.value) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeLowercase.value) charset += 'abcdefghijklmnopqrstuvwxyz'
  if (includeNumbers.value) charset += '0123456789'
  if (includeSymbols.value) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (charset === '') {
    charset = 'abcdefghijklmnopqrstuvwxyz' // 默认至少包含小写字母
    includeLowercase.value = true
  }

  let result = ''
  for (let i = 0; i < passwordLength.value; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  generatedPassword.value = result
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
