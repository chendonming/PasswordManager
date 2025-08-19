<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- 列表头部 -->
    <div
      class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ title }}
        </h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ filteredEntries.length }} 项
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <!-- 排序选择器 -->
        <select
          v-model="sortBy"
          class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="updated_at">最近更新</option>
          <option value="title">标题</option>
          <option value="created_at">创建时间</option>
          <option value="last_used_at">最近使用</option>
        </select>

        <!-- 添加密码按钮 -->
        <button class="btn-primary" @click="$emit('add-password')">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          添加密码
        </button>
      </div>
    </div>

    <!-- 密码列表 -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-if="filteredEntries.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
      >
        <svg
          class="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p class="text-lg font-medium mb-2">暂无密码条目</p>
        <p class="text-sm mb-4">开始添加您的第一个密码</p>
        <button class="btn-primary" @click="$emit('add-password')">添加密码</button>
      </div>

      <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="entry in sortedEntries"
          :key="entry.id"
          :class="[
            'p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200',
            selectedEntryId === entry.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
          ]"
          @click="$emit('select-entry', entry)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <!-- 网站图标 -->
              <div
                class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <img
                  v-if="entry.url && getFaviconUrl(entry.url)"
                  :src="getFaviconUrl(entry.url)"
                  :alt="entry.title"
                  class="w-6 h-6 rounded"
                  @error="showDefaultIcon"
                />
                <svg
                  v-else
                  class="w-6 h-6 text-gray-400"
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

              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ entry.title }}
                  </h3>
                  <svg
                    v-if="entry.is_favorite"
                    class="w-4 h-4 text-yellow-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>

                <div class="flex items-center space-x-4 mt-1">
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {{ entry.username || '无用户名' }}
                  </p>
                  <p v-if="entry.url" class="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {{ formatUrl(entry.url) }}
                  </p>
                </div>

                <!-- 标签 -->
                <div
                  v-if="entry.tags && entry.tags.length > 0"
                  class="flex items-center space-x-1 mt-2"
                >
                  <span
                    v-for="tag in entry.tags.slice(0, 3)"
                    :key="tag.id"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    :style="{
                      backgroundColor: tag.color + '20',
                      color: tag.color
                    }"
                  >
                    {{ tag.name }}
                  </span>
                  <span
                    v-if="entry.tags.length > 3"
                    class="text-xs text-gray-400 dark:text-gray-500"
                  >
                    +{{ entry.tags.length - 3 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2 flex-shrink-0">
              <!-- 密码强度指示器 -->
              <div class="flex items-center space-x-1">
                <div class="flex space-x-1">
                  <div
                    v-for="i in 4"
                    :key="i"
                    :class="[
                      'w-1 h-4 rounded-full',
                      getPasswordStrengthColor(entry.password_strength, i)
                    ]"
                  ></div>
                </div>
              </div>

              <!-- 快捷操作按钮 -->
              <div
                class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <button
                  title="复制用户名"
                  class="btn-icon hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click.stop="copyToClipboard(entry.username || '')"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>

                <button
                  title="复制密码"
                  class="btn-icon hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click.stop="copyToClipboard(entry.password)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </button>
              </div>

              <!-- 最近使用时间 -->
              <div class="text-xs text-gray-400 dark:text-gray-500 text-right">
                {{ formatDate(entry.updated_at) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 定义 props
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

interface Props {
  title?: string
  entries?: DecryptedPasswordEntry[]
  selectedEntryId?: number
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '密码列表',
  entries: () => [],
  searchQuery: ''
})

// 定义 emits
defineEmits<{
  'add-password': []
  'select-entry': [entry: DecryptedPasswordEntry]
}>()

// 响应式数据
const sortBy = ref<string>('updated_at')

// 计算属性
const filteredEntries = computed(() => {
  if (!props.searchQuery) return props.entries

  const query = props.searchQuery.toLowerCase()
  return props.entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(query) ||
      entry.username?.toLowerCase().includes(query) ||
      entry.url?.toLowerCase().includes(query) ||
      entry.tags?.some((tag) => tag.name.toLowerCase().includes(query))
  )
})

const sortedEntries = computed(() => {
  const entries = [...filteredEntries.value]

  return entries.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'last_used_at':
        if (!a.last_used_at && !b.last_used_at) return 0
        if (!a.last_used_at) return 1
        if (!b.last_used_at) return -1
        return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
      default: // updated_at
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })
})

// 工具方法
const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

const showDefaultIcon = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const formatUrl = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}月前`
  return `${Math.floor(diffDays / 365)}年前`
}

const getPasswordStrengthColor = (strength: number, position: number): string => {
  const filled = position <= Math.ceil(strength / 25)

  if (!filled) return 'bg-gray-200 dark:bg-gray-600'

  if (strength < 25) return 'bg-red-400'
  if (strength < 50) return 'bg-yellow-400'
  if (strength < 75) return 'bg-blue-400'
  return 'bg-green-400'
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    // 这里可以添加成功提示
    console.log('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>
