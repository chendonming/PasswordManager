<template>
  <div id="app" class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 自定义标题栏 -->
    <TitleBar @search="handleSearch" @toggle-theme="toggleTheme" />

    <!-- 主要内容区域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏组件 -->
      <Sidebar
        :active-tab="activeTab"
        :user-info="{ username: '用户', passwordCount: passwords.length }"
        @navigate="handleNavigate"
        @sync="handleSync"
        @settings="handleSettings"
      />

      <!-- 主内容区 -->
      <div class="flex-1 bg-white dark:bg-gray-900 relative">
        <!-- 全局加载状态 -->
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10"
        >
          <div class="flex flex-col items-center space-y-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        </div>

        <!-- 未认证状态：显示主密码输入界面 -->
        <AuthenticationView
          v-if="!isAuthenticated && !isLoading"
          ref="authViewRef"
          :is-first-time="isFirstTime"
          @authenticate="handleAuthenticate"
        />
        <!-- 全局错误状态 -->
        <div
          v-if="error && !isLoading && isAuthenticated"
          class="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10"
        >
          <div class="text-center max-w-md px-6">
            <svg
              class="w-16 h-16 mx-auto mb-4 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">出现错误</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              @click="loadPasswords"
            >
              重试
            </button>
          </div>
        </div>

        <!-- 已认证状态：显示主要内容 -->
        <template v-if="isAuthenticated && !error">
          <!-- 全部密码视图 -->
          <PasswordList
            v-if="activeTab === 'all'"
            title="全部密码"
            :entries="passwords"
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
        </template>
      </div>
    </div>

    <!-- 添加密码弹窗 -->
    <Modal
      :visible="showPasswordModal"
      :title="isEditMode ? '编辑密码' : '添加密码'"
      size="lg"
      @close="closePasswordModal"
    >
      <PasswordForm
        ref="passwordFormRef"
        :initial-data="editingEntry"
        @submit="handlePasswordSubmit"
      />

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
          {{ isEditMode ? '更新' : '保存' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import PasswordList from './components/PasswordList.vue'
import PasswordForm from './components/PasswordForm.vue'
import Modal from './components/Modal.vue'
import AuthenticationView from './components/AuthenticationView.vue'
import PasswordGenerator from './components/PasswordGenerator.vue'
import WelcomeView from './components/WelcomeView.vue'

// API类型声明
declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      searchPasswordEntries: (params: {
        page?: number
        pageSize?: number
        query?: string
      }) => Promise<{
        entries: DecryptedPasswordEntry[]
        total: number
        page: number
        pageSize: number
      }>
      createPasswordEntry: (data: {
        title: string
        username?: string
        password: string
        url?: string
        description?: string
        is_favorite?: boolean
      }) => Promise<DecryptedPasswordEntry>
      updatePasswordEntry: (
        id: number,
        data: {
          title?: string
          username?: string
          password?: string
          url?: string
          description?: string
          is_favorite?: boolean
        }
      ) => Promise<DecryptedPasswordEntry>
      deletePasswordEntry: (id: number) => Promise<void>
    }
  }
}

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
const authViewRef = ref<InstanceType<typeof AuthenticationView> | null>(null)

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

// 组件挂载时读取保存的主题设置并检查认证状态
onMounted(async () => {
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

  // 检查认证状态（包含首次运行检查）
  await checkAuthStatus()

  // 如果已认证，加载密码数据
  if (isAuthenticated.value) {
    await loadPasswords()
  }
})

// 密码数据
const passwords = ref<DecryptedPasswordEntry[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const isAuthenticated = ref(false)

// 主密码认证相关
const isFirstTime = ref(false)

// 认证状态和消息
const authStatus = ref<string>('checking') // checking, first-run, needs-unlock, ready, missing-metadata, decrypt-error, error
const authMessage = ref<string>('')

// 认证检查
const checkAuthStatus = async (): Promise<void> => {
  try {
    const result = (await window.api.invoke('auth:check-status')) as {
      status: string
      message?: string
    }

    authStatus.value = result.status
    authMessage.value = result.message || ''

    // 根据状态设置认证标志
    isAuthenticated.value = result.status === 'ready'
    isFirstTime.value = result.status === 'first-run'

    console.log('认证状态:', result)
  } catch (err) {
    console.error('检查认证状态失败:', err)
    authStatus.value = 'error'
    authMessage.value = err instanceof Error ? err.message : '检查状态失败'
    isAuthenticated.value = false
  }
}

// 检查数据库状态（已集成到checkAuthStatus中）

// 主密码提交处理
const handleAuthenticate = async (data: {
  masterPassword: string
  confirmMasterPassword?: string
}): Promise<void> => {
  if (!authViewRef.value) return

  try {
    authViewRef.value.setAuthenticating(true)

    if (isFirstTime.value) {
      // 首次运行，创建主密码
      const result = (await window.api.invoke(
        'auth:create-master-password',
        data.masterPassword
      )) as {
        success: boolean
        error?: string
      }

      if (!result.success) {
        authViewRef.value.setAuthError(result.error || '设置主密码失败')
        return
      }

      console.log('主密码设置成功')
    } else {
      // 验证主密码
      const result = (await window.api.invoke('auth:unlock', data.masterPassword)) as {
        success: boolean
        error?: string
      }

      if (!result.success) {
        authViewRef.value.setAuthError(result.error || '主密码错误')
        return
      }

      console.log('主密码验证成功')
    }

    // 重新检查认证状态
    await checkAuthStatus()

    // 如果认证成功，清理表单并加载数据
    if (isAuthenticated.value) {
      authViewRef.value.clearForm()
      await loadPasswords()
    }
  } catch (err) {
    console.error('主密码处理失败:', err)
    authViewRef.value.setAuthError(err instanceof Error ? err.message : '认证失败')
  } finally {
    authViewRef.value.setAuthenticating(false)
  }
}

// 数据加载方法
const loadPasswords = async (): Promise<void> => {
  try {
    isLoading.value = true
    error.value = null

    // 使用搜索API获取所有密码
    const result = await window.api.searchPasswordEntries({
      page: 1,
      pageSize: 1000 // 获取所有密码
    })

    passwords.value = result.entries
    console.log('密码数据加载成功，共', result.entries.length, '条')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载密码失败'
    console.error('加载密码失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 计算属性
const favoritePasswords = computed(() => passwords.value.filter((p) => p.is_favorite))

const recentPasswords = computed(() =>
  passwords.value
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
  editingEntry.value = null // 清理编辑状态
}

const handlePasswordSubmit = async (data: PasswordFormData): Promise<void> => {
  try {
    console.log('提交密码数据:', data)

    if (editingEntry.value) {
      // 编辑模式：更新现有密码
      const updatedPassword = await window.api.updatePasswordEntry(editingEntry.value.id, {
        title: data.title,
        username: data.username,
        password: data.password,
        url: data.url,
        description: data.description,
        is_favorite: data.is_favorite
      })

      // 在本地数组中更新
      const index = passwords.value.findIndex((p) => p.id === editingEntry.value!.id)
      if (index > -1) {
        passwords.value[index] = updatedPassword
      }

      console.log('密码更新成功:', updatedPassword.title)
    } else {
      // 新增模式：创建新密码
      const newPassword = await window.api.createPasswordEntry({
        title: data.title,
        username: data.username,
        password: data.password,
        url: data.url,
        description: data.description,
        is_favorite: data.is_favorite
      })

      // 添加到本地数组中
      passwords.value.push(newPassword)
      console.log('密码创建成功:', newPassword.title)
    }

    closePasswordModal()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存密码失败'
    console.error('保存密码失败:', err)
    // 可以在这里显示错误提示
  }
}

const submitPasswordForm = (): void => {
  // 直接调用组件的submit方法
  if (passwordFormRef.value) {
    passwordFormRef.value.submit()
  }
}

const handleSelectEntry = (entry: DecryptedPasswordEntry): void => {
  selectedEntryId.value = entry.id
  console.log('选择密码条目:', entry.title)
  // 这里可以显示密码详情或进行其他操作
}

// 编辑模式相关状态
const editingEntry = ref<DecryptedPasswordEntry | null>(null)
const isEditMode = computed(() => editingEntry.value !== null)

const handleEditEntry = (entry: DecryptedPasswordEntry): void => {
  console.log('编辑密码条目:', entry.title)
  editingEntry.value = entry
  showPasswordModal.value = true
}

const handleDeleteEntry = async (id: number): Promise<void> => {
  try {
    console.log('删除密码条目:', id)

    // 调用真实的API删除密码
    await window.api.deletePasswordEntry(id)

    // 从本地数组中删除条目
    const index = passwords.value.findIndex((p) => p.id === id)
    if (index > -1) {
      passwords.value.splice(index, 1)
      console.log('密码条目已删除')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除密码失败'
    console.error('删除密码失败:', err)
    // 可以在这里显示错误提示
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
