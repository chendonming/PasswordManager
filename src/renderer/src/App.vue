<template>
  <div id="app" class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 自定义标题栏 -->
    <TitleBar @search="handleSearch" @toggle-theme="toggleTheme" />

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
      <div class="flex-1 bg-white dark:bg-gray-900">
        <!-- 全部密码视图 -->
        <PasswordList
          v-if="activeTab === 'all'"
          title="全部密码"
          :entries="mockPasswords"
          :search-query="searchQuery"
          :selected-entry-id="selectedEntryId"
          @add-password="handleAddPassword"
          @select-entry="handleSelectEntry"
        />

        <!-- 收藏夹视图 -->
        <PasswordList
          v-else-if="activeTab === 'favorites'"
          title="收藏夹"
          :entries="favoritePasswords"
          :search-query="searchQuery"
          :selected-entry-id="selectedEntryId"
          @add-password="handleAddPassword"
          @select-entry="handleSelectEntry"
        />

        <!-- 最近使用视图 -->
        <PasswordList
          v-else-if="activeTab === 'recent'"
          title="最近使用"
          :entries="recentPasswords"
          :search-query="searchQuery"
          :selected-entry-id="selectedEntryId"
          @add-password="handleAddPassword"
          @select-entry="handleSelectEntry"
        />

        <!-- 密码生成器视图 -->
        <PasswordGenerator v-else-if="activeTab === 'generator'" />

        <!-- 默认/欢迎视图 -->
        <WelcomeView v-else @navigate="handleNavigate" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TitleBar from './components/TitleBar.vue'
import PasswordList from './components/PasswordList.vue'
import PasswordGenerator from './components/PasswordGenerator.vue'
import WelcomeView from './components/WelcomeView.vue'

// 定义密码条目类型
interface Tag {
  id: number
  name: string
  color: string
}

interface DecryptedPasswordEntry {
  id: number
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  is_favorite: boolean
  password_strength: number
  created_at: string
  updated_at: string
  last_used_at?: string
  tags: Tag[]
}

// 响应式数据
const activeTab = ref('all')
const searchQuery = ref('')
const selectedEntryId = ref<number | undefined>(undefined)

// 主题管理
const isDarkMode = ref(false)

// 主题切换方法
const toggleTheme = (): void => {
  isDarkMode.value = !isDarkMode.value
  updateThemeClass()
  // 保存主题设置到 localStorage
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  console.log('主题切换到:', isDarkMode.value ? '深色' : '浅色')
}

// 应用主题类到 html 元素
const updateThemeClass = (): void => {
  const html = document.documentElement
  if (isDarkMode.value) {
    html.classList.add('dark')
    console.log('添加了 dark 类到 html 元素')
  } else {
    html.classList.remove('dark')
    console.log('从 html 元素移除了 dark 类')
  }
  console.log('当前 html 类列表:', html.classList.toString())
}

// 组件挂载时读取保存的主题设置
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDarkMode.value = true
  } else if (savedTheme === 'light') {
    isDarkMode.value = false
  } else {
    // 如果没有保存的设置，检测系统主题偏好
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  updateThemeClass()
})

// 模拟数据
const mockPasswords = ref<DecryptedPasswordEntry[]>([
  {
    id: 1,
    title: 'GitHub',
    username: 'user@example.com',
    password: 'password123',
    url: 'https://github.com',
    is_favorite: false,
    password_strength: 75,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tags: []
  },
  {
    id: 2,
    title: '网易邮箱',
    username: 'example@163.com',
    password: 'password456',
    url: 'https://mail.163.com',
    is_favorite: true,
    password_strength: 60,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    last_used_at: '2024-01-15T00:00:00Z',
    tags: []
  },
  {
    id: 3,
    title: 'Google',
    username: 'myemail@gmail.com',
    password: 'password789',
    url: 'https://google.com',
    is_favorite: false,
    password_strength: 90,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    tags: []
  },
  {
    id: 4,
    title: '微信公众平台',
    username: 'admin@company.com',
    password: 'password000',
    url: 'https://mp.weixin.qq.com',
    is_favorite: true,
    password_strength: 50,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    last_used_at: '2024-01-10T00:00:00Z',
    tags: []
  }
])

// 计算属性
const favoritePasswords = computed(() => mockPasswords.value.filter((p) => p.is_favorite))

const recentPasswords = computed(() =>
  mockPasswords.value
    .filter((p) => p.last_used_at)
    .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
)

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

const handleSearch = (query: string): void => {
  searchQuery.value = query
}

const handleAddPassword = (): void => {
  console.log('添加密码')
  // 这里可以打开添加密码的模态框或导航到添加页面
}

const handleSelectEntry = (entry: DecryptedPasswordEntry): void => {
  selectedEntryId.value = entry.id
  console.log('选择密码条目:', entry.title)
  // 这里可以显示密码详情或进行其他操作
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
