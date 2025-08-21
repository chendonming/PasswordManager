<template>
  <div id="app" class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 自定义标题栏 -->
    <TitleBar
      :entries="passwords"
      @search="handleSearch"
      @toggle-theme="toggleTheme"
      @import="handleImport"
      @export="handleExport"
      @tool="handleTool"
      @help="handleHelp"
    />

    <!-- 主要内容区域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏组件 -->
      <Sidebar
        :active-tab="activeTab"
        :user-info="{ username: '用户', passwordCount: statistics.totalEntries }"
        :tags="tags"
        :active-tag-id="activeTagId"
        @navigate="handleNavigate"
        @sync="handleSync"
        @settings="handleSettings"
        @add-tag="handleAddTag"
        @filter-by-tag="handleFilterByTag"
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
              @click="() => loadPasswords(true)"
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
            :entries="displayedPasswords"
            :search-query="searchQuery"
            :selected-entry-id="selectedEntryId"
            :total-count="displayedTotalCount"
            :has-more="!isSearchMode && hasMore"
            :is-loading="isSearchMode ? isSearching : isLoadingMore"
            :use-server-search="isSearchMode"
            @add-password="handleAddPassword"
            @select-entry="handleSelectEntry"
            @edit-entry="handleEditEntry"
            @delete-entry="handleDeleteEntry"
            @load-more="loadMorePasswords"
          />

          <!-- 收藏夹视图 -->
          <PasswordList
            v-else-if="activeTab === 'favorites'"
            title="收藏夹"
            :entries="favoritePasswords"
            :search-query="searchQuery"
            :selected-entry-id="selectedEntryId"
            :total-count="statistics.favoriteEntries"
            :has-more="false"
            :is-loading="false"
            @add-password="handleAddPassword"
            @select-entry="handleSelectEntry"
            @edit-entry="handleEditEntry"
            @delete-entry="handleDeleteEntry"
            @load-more="() => {}"
          />

          <!-- 最近使用视图 -->
          <PasswordList
            v-else-if="activeTab === 'recent'"
            title="最近使用"
            :entries="recentPasswords"
            :search-query="searchQuery"
            :selected-entry-id="selectedEntryId"
            :total-count="statistics.recentlyUsed"
            :has-more="false"
            :is-loading="false"
            @add-password="handleAddPassword"
            @select-entry="handleSelectEntry"
            @edit-entry="handleEditEntry"
            @delete-entry="handleDeleteEntry"
            @load-more="() => {}"
          />

          <!-- 密码生成器视图 -->
          <PasswordGenerator v-else-if="activeTab === 'generator'" />

          <!-- 设置/标签视图 -->
          <div v-else-if="activeTab === 'settings'" class="p-4">
            <TagsList
              :tags="tags"
              @create="handleAddTag"
              @edit="handleEditTag"
              @delete="handleDeleteTag"
            />
          </div>

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

    <!-- 标签模态 -->
    <Modal
      :visible="showTagModal"
      :title="editingTag && editingTag.id ? '编辑标签' : '新建标签'"
      @close="() => (showTagModal = false)"
    >
      <TagForm
        ref="tagFormRef"
        :initial="editingTag || { name: '', color: '#60a5fa' }"
        @submit="submitTagForm"
      />
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
          @click="() => (showTagModal = false)"
        >
          取消
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200"
          @click="
            () => {
              tagFormRef?.submit && tagFormRef.submit()
            }
          "
        >
          保存
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ImportConfig } from '@common/types/import-export'
import { ImportFormat, ConflictStrategy } from '@common/types/import-export'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import PasswordList from './components/PasswordList.vue'
import PasswordForm from './components/PasswordForm.vue'
import Modal from './components/Modal.vue'
import AuthenticationView from './components/AuthenticationView.vue'
import PasswordGenerator from './components/PasswordGenerator.vue'
import WelcomeView from './components/WelcomeView.vue'
import TagsList from './components/TagsList.vue'
import TagForm from './components/TagForm.vue'

// Preload API types are declared in src/renderer/src/types/preload.d.ts

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
// 标签数据
const tags = ref<{ id: number; name: string; color: string; count?: number }[]>([])
const showTagModal = ref(false)
const editingTag = ref<{ id?: number; name: string; color: string } | null>(null)
type TagFormRef = { submit: () => void } | null
const tagFormRef = ref<TagFormRef>(null)
const searchQuery = ref('')
// 当前选中的标签 id（用于过滤）
const activeTagId = ref<number | null>(null)
const selectedEntryId = ref<number | undefined>(undefined)
const showPasswordModal = ref(false)
const passwordFormRef = ref<InstanceType<typeof PasswordForm> | null>(null)
const authViewRef = ref<InstanceType<typeof AuthenticationView> | null>(null)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(50)
const hasMore = ref(true)
const isLoadingMore = ref(false)

// 搜索状态
const isSearchMode = computed(() => searchQuery.value.trim() !== '')
const searchResults = ref<DecryptedPasswordEntry[]>([])
const isSearching = ref(false)

// 显示的密码数据（根据是否在搜索模式切换）
const displayedPasswords = computed(() => {
  // 搜索模式优先：如果处于服务器/搜索模式，则返回 searchResults（searchResults 已由 handleSearch 填充）
  if (isSearchMode.value) return searchResults.value

  // 非搜索模式：如果选中了标签，筛选 passwords
  if (activeTagId.value != null) {
    return passwords.value.filter((p) => p.tags?.some((t) => t.id === activeTagId.value))
  }

  return passwords.value
})

// 用于显示在 UI 的总数（考虑搜索与标签过滤）
const displayedTotalCount = computed(() => {
  if (isSearchMode.value) return searchResults.value.length
  return activeTagId.value != null ? displayedPasswords.value.length : statistics.value.totalEntries
})

// 统计信息
const statistics = ref({
  totalEntries: 0,
  totalTags: 0,
  favoriteEntries: 0,
  recentlyUsed: 0
})

// 主题管理
const isDarkMode = ref(false)

// 主题切换方法
const toggleTheme = async (): Promise<void> => {
  isDarkMode.value = !isDarkMode.value
  updateThemeClass()
  // 保存主题设置到 localStorage
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')

  // 通知主进程更新窗口背景色
  try {
    await window.api.setThemeBackground?.(isDarkMode.value)
    console.log('主题切换到:', isDarkMode.value ? '深色' : '浅色', '，主进程背景已更新')
  } catch (error) {
    console.error('更新主进程背景色失败:', error)
    console.log('主题切换到:', isDarkMode.value ? '深色' : '浅色')
  }
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

  // 同步初始主题到主进程
  try {
    await window.api.setThemeBackground?.(isDarkMode.value)
    console.log('初始主题已同步到主进程:', isDarkMode.value ? '深色' : '浅色')
  } catch (error) {
    console.error('同步初始主题到主进程失败:', error)
  }

  // 检查认证状态（包含首次运行检查）
  await checkAuthStatus()

  // 如果已认证，加载密码数据
  if (isAuthenticated.value) {
    await loadPasswords(true)
    await loadStatistics()
    await loadTags()
  }
})

// 加载标签
const loadTags = async (): Promise<void> => {
  try {
    const resp = (await window.api.getAllTags()) as { id: number; name: string; color: string }[]
    tags.value = resp.map((t) => ({ id: t.id, name: t.name, color: t.color }))
  } catch (err) {
    console.error('加载标签失败:', err)
  }
}

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
      await loadPasswords(true)
      await loadStatistics()
    }
  } catch (err) {
    console.error('主密码处理失败:', err)
    authViewRef.value.setAuthError(err instanceof Error ? err.message : '认证失败')
  } finally {
    authViewRef.value.setAuthenticating(false)
  }
}

// 数据加载方法
const loadPasswords = async (reset: boolean = false): Promise<void> => {
  try {
    if (reset) {
      currentPage.value = 1
      passwords.value = []
      hasMore.value = true
    }

    isLoading.value = reset
    if (!reset) {
      isLoadingMore.value = true
    }
    error.value = null

    // 使用搜索API获取密码
    const result = await window.api.searchPasswordEntries({
      page: currentPage.value,
      pageSize: pageSize.value
    })

    if (reset) {
      passwords.value = result.entries
    } else {
      passwords.value = [...passwords.value, ...result.entries]
    }

    // 更新分页状态
    hasMore.value =
      result.entries.length === pageSize.value && passwords.value.length < result.total

    console.log(
      '密码数据加载成功，当前页:',
      currentPage.value,
      '本页条数:',
      result.entries.length,
      '总条数:',
      passwords.value.length
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载密码失败'
    console.error('加载密码失败:', err)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多密码
const loadMorePasswords = async (): Promise<void> => {
  if (isLoadingMore.value || !hasMore.value) return

  currentPage.value += 1
  await loadPasswords(false)
}

// 加载统计信息
const loadStatistics = async (): Promise<void> => {
  try {
    const stats = await window.api.getStatistics?.()
    if (stats) {
      statistics.value = stats
      console.log('统计信息加载成功:', stats)
    }
  } catch (err) {
    console.error('加载统计信息失败:', err)
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

const handleFilterByTag = (tagId: number): void => {
  // 点击同一个标签则取消过滤
  if (activeTagId.value === tagId) {
    activeTagId.value = null
  } else {
    activeTagId.value = tagId
  }
}

const handleSync = (): void => {
  console.log('同步数据')
}

const handleSettings = (): void => {
  console.log('打开设置')
}

// 标签相关操作
const handleAddTag = (): void => {
  editingTag.value = { name: '', color: '#60a5fa' }
  showTagModal.value = true
}

const handleEditTag = (tag: { id: number; name: string; color: string }): void => {
  editingTag.value = { id: tag.id, name: tag.name, color: tag.color }
  showTagModal.value = true
}

const handleDeleteTag = async (id: number): Promise<void> => {
  try {
    await window.api.deleteTagById(id)
    await loadTags()
    await loadStatistics()
  } catch (err) {
    console.error('删除标签失败:', err)
  }
}

const submitTagForm = async (data: { id?: number; name: string; color: string }): Promise<void> => {
  try {
    if (data.id) {
      await window.api.updateTag(data.id, { name: data.name, color: data.color })
    } else {
      await window.api.createTag({ name: data.name, color: data.color })
    }
    showTagModal.value = false
    await loadTags()
    await loadStatistics()
  } catch (err) {
    console.error('保存标签失败:', err)
  }
}

const handleSearch = async (query: string): Promise<void> => {
  searchQuery.value = query

  if (query.trim() === '') {
    // 清空搜索时，恢复分页数据
    searchResults.value = []
    if (passwords.value.length === 0) {
      await loadPasswords(true)
    }
    return
  }

  // 执行全数据库搜索
  try {
    isSearching.value = true

    // 搜索时获取更大的数据集（或所有数据）
    const result = await window.api.searchPasswordEntries({
      page: 1,
      pageSize: 1000, // 获取更多数据用于搜索
      query: query.trim()
    })

    searchResults.value = result.entries
    console.log('搜索完成，找到', result.entries.length, '条结果')
  } catch (err) {
    console.error('搜索失败:', err)
    error.value = err instanceof Error ? err.message : '搜索失败'
  } finally {
    isSearching.value = false
  }
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

      // 如果在搜索模式下，也要更新搜索结果
      if (isSearchMode.value) {
        const searchIndex = searchResults.value.findIndex((p) => p.id === editingEntry.value!.id)
        if (searchIndex > -1) {
          searchResults.value[searchIndex] = updatedPassword
        }
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

      // 如果在搜索模式下，检查新密码是否匹配当前搜索条件
      if (isSearchMode.value && searchQuery.value) {
        // 重新执行搜索以包含新创建的密码
        await handleSearch(searchQuery.value)
      }

      console.log('密码创建成功:', newPassword.title)
    }

    // 重新加载统计信息以更新计数
    await loadStatistics()

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

    // 如果在搜索模式下，也要从搜索结果中删除
    if (isSearchMode.value) {
      const searchIndex = searchResults.value.findIndex((p) => p.id === id)
      if (searchIndex > -1) {
        searchResults.value.splice(searchIndex, 1)
      }
    }

    // 重新加载统计信息以更新正确的总数
    await loadStatistics()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除密码失败'
    console.error('删除密码失败:', err)
    // 可以在这里显示错误提示
  }
}

// MenuBar 事件处理函数
const handleImport = async (format: string): Promise<void> => {
  console.log('导入请求:', format)

  if (format === 'chrome') {
    await handleChromeImport()
  } else {
    console.log(`暂不支持 ${format} 格式导入`)
    // TODO: 实现其他格式的导入功能
  }
}

// 处理Chrome CSV导入
const handleChromeImport = async (): Promise<void> => {
  try {
    console.log('开始Chrome CSV导入流程...')

    // 使用文件选择对话框让用户选择CSV文件
    const fileResult = await window.api.selectImportFile?.('chrome')

    if (!fileResult || !fileResult.success || !fileResult.data?.filePath) {
      console.log('用户取消了文件选择或选择失败:', fileResult?.message)
      return
    }

    const selectedFilePath = fileResult.data.filePath
    console.log('用户选择的文件:', selectedFilePath)

    // 构建导入配置
    const importConfig: ImportConfig = {
      format: ImportFormat.CHROME,
      filePath: selectedFilePath,
      conflictStrategy: ConflictStrategy.SKIP,
      createBackup: true
    }

    // 先预览导入数据
    console.log('开始预览导入数据...')
    const previewResult = await window.api.importPreview?.(importConfig)

    if (!previewResult || !previewResult.success) {
      console.error('预览导入失败:', previewResult?.message)
      alert(`预览失败: ${previewResult?.message}`)
      return
    }

    console.log('预览结果:', previewResult.data)

    // 显示预览信息让用户确认
    const confirmImport = confirm(
      `将导入 ${previewResult.data?.statistics?.totalEntries} 个密码条目，` +
        `其中 ${previewResult.data?.statistics?.invalidEntries} 个无效条目。是否继续？`
    )

    if (!confirmImport) {
      console.log('用户取消了导入')
      return
    }

    // 执行导入
    console.log('开始执行导入...')
    const importResult = await window.api.importExecute?.(importConfig)

    if (importResult && importResult.success) {
      console.log('导入成功:', importResult.data)
      // 重新加载密码列表和统计信息
      await loadPasswords(true)
      await loadStatistics()
      alert('导入成功！')
    } else {
      console.error('导入失败:', importResult?.message)
      alert(`导入失败: ${importResult?.message}`)
    }
  } catch (error) {
    console.error('Chrome导入过程中发生错误:', error)
    alert('导入过程中发生错误，请查看控制台了解详情')
  }
}

const handleExport = (format: string): void => {
  console.log('导出请求:', format)
  // TODO: 实现导出功能
}

const handleTool = (action: string): void => {
  console.log('工具操作:', action)
  if (action === 'generator') {
    activeTab.value = 'generator'
  } else if (action === 'security-check') {
    console.log('执行安全检查')
    // TODO: 实现安全检查功能
  } else if (action === 'settings') {
    console.log('打开设置')
    // TODO: 实现设置功能
  }
}

const handleHelp = (action: string): void => {
  console.log('帮助操作:', action)
  if (action === 'about') {
    console.log('显示关于信息')
    // TODO: 实现关于对话框
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
