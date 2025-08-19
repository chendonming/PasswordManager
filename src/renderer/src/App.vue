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
          @edit-entry="handleEditEntry"
          @delete-entry="handleDeleteEntry"
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
          @edit-entry="handleEditEntry"
          @delete-entry="handleDeleteEntry"
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
          @edit-entry="handleEditEntry"
          @delete-entry="handleDeleteEntry"
        />

        <!-- 密码生成器视图 -->
        <PasswordGenerator v-else-if="activeTab === 'generator'" />

        <!-- 默认/欢迎视图 -->
        <WelcomeView v-else @navigate="handleNavigate" />
      </div>
    </div>

    <!-- 添加密码弹窗 -->
    <Modal :visible="showPasswordModal" title="添加密码" size="lg" @close="closePasswordModal">
      <PasswordForm ref="passwordFormRef" @submit="handlePasswordSubmit" />

      <template #footer>
        <button
          type="button"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
          @click="closePasswordModal"
        >
          取消
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200"
          @click="submitPasswordForm"
        >
          保存
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TitleBar from './components/TitleBar.vue'
import PasswordList from './components/PasswordList.vue'
import PasswordGenerator from './components/PasswordGenerator.vue'
import WelcomeView from './components/WelcomeView.vue'
import Modal from './components/Modal.vue'
import PasswordForm from './components/PasswordForm.vue'

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

// 定义密码表单数据类型
interface PasswordFormData {
  title: string
  username: string
  password: string
  url: string
  description: string
  is_favorite: boolean
}

// 响应式数据
const activeTab = ref('all')
const searchQuery = ref('')
const selectedEntryId = ref<number | undefined>(undefined)
const showPasswordModal = ref(false)
const passwordFormRef = ref<InstanceType<typeof PasswordForm> | null>(null)

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
  showPasswordModal.value = true
  console.log('打开添加密码弹窗')
}

const closePasswordModal = (): void => {
  showPasswordModal.value = false
}

const handlePasswordSubmit = (data: PasswordFormData): void => {
  console.log('提交密码数据:', data)
  // 这里处理密码保存逻辑
  const newPassword: DecryptedPasswordEntry = {
    id: mockPasswords.value.length + 1,
    title: data.title,
    username: data.username,
    password: data.password,
    url: data.url,
    description: data.description,
    is_favorite: data.is_favorite,
    password_strength: calculatePasswordStrength(data.password),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: []
  }

  mockPasswords.value.push(newPassword)
  closePasswordModal()
}

const submitPasswordForm = (): void => {
  // 触发表单提交
  if (passwordFormRef.value) {
    const formElement = passwordFormRef.value.$el?.querySelector('form')
    if (formElement) {
      formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    }
  }
}

const calculatePasswordStrength = (password: string): number => {
  let score = 0

  // 长度评分
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 25

  // 复杂度评分
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 20

  return Math.min(score, 100)
}

const handleSelectEntry = (entry: DecryptedPasswordEntry): void => {
  selectedEntryId.value = entry.id
  console.log('选择密码条目:', entry.title)
  // 这里可以显示密码详情或进行其他操作
}

const handleEditEntry = (entry: DecryptedPasswordEntry): void => {
  console.log('编辑密码条目:', entry.title)
  // TODO: 实现编辑功能，可以打开编辑弹窗并预填数据
  showPasswordModal.value = true
}

const handleDeleteEntry = (id: number): void => {
  console.log('删除密码条目:', id)
  // 从模拟数据中删除条目
  const index = mockPasswords.value.findIndex((p) => p.id === id)
  if (index > -1) {
    mockPasswords.value.splice(index, 1)
    console.log('密码条目已删除')
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
