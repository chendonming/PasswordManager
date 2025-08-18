<template>
  <div class="h-full flex flex-col">
    <!-- 头部操作栏 -->
    <div
      class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center space-x-4">
        <div
          class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <img
            v-if="entry.url && getFaviconUrl(entry.url)"
            :src="getFaviconUrl(entry.url)"
            :alt="entry.title"
            class="w-8 h-8 rounded-lg"
            @error="showDefaultIcon"
          />
          <svg
            v-else
            class="w-8 h-8 text-gray-400"
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
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ entry.title }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatUrl(entry.url || '') || '无网址' }}
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          :class="[
            'p-2 rounded-lg transition-colors duration-200',
            entry.is_favorite
              ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
          title="收藏"
          @click="toggleFavorite"
        >
          <svg
            class="w-5 h-5"
            :fill="entry.is_favorite ? 'currentColor' : 'none'"
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
        </button>

        <button
          class="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          title="编辑"
          @click="$emit('edit')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <button
          class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
          title="删除"
          @click="$emit('delete')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- 基本信息 -->
      <div class="space-y-4">
        <!-- 用户名 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
          <div class="relative flex items-center">
            <input
              type="text"
              :value="entry.username || ''"
              readonly
              class="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
              placeholder="无用户名"
            />
            <button
              class="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 flex-shrink-0"
              title="复制用户名"
              @click="copyField('用户名', entry.username || '')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- 密码 -->
        <div class="field-group">
          <label class="field-label">密码</label>
          <div class="field-container">
            <input
              :type="showPassword ? 'text' : 'password'"
              :value="entry.password"
              readonly
              class="field-input font-mono"
            />
            <div class="flex items-center space-x-1">
              <button
                class="field-action-btn"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                @click="togglePasswordVisibility"
              >
                <svg
                  v-if="showPassword"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
              <button
                class="field-action-btn"
                title="复制密码"
                @click="copyField('密码', entry.password)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- 密码强度指示器 -->
          <div class="mt-2 flex items-center space-x-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">强度:</span>
            <div class="flex space-x-1">
              <div
                v-for="i in 4"
                :key="i"
                :class="[
                  'w-2 h-2 rounded-full',
                  getPasswordStrengthColor(entry.password_strength, i)
                ]"
              ></div>
            </div>
            <span
              class="text-sm font-medium"
              :class="getPasswordStrengthTextColor(entry.password_strength)"
            >
              {{ getPasswordStrengthText(entry.password_strength) }}
            </span>
          </div>
        </div>

        <!-- 网址 -->
        <div class="field-group">
          <label class="field-label">网址</label>
          <div class="field-container">
            <input
              type="url"
              :value="entry.url || ''"
              readonly
              class="field-input"
              placeholder="无网址"
            />
            <div class="flex items-center space-x-1">
              <button
                v-if="entry.url"
                class="field-action-btn"
                title="打开网址"
                @click="openUrl(entry.url)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
              <button
                class="field-action-btn"
                title="复制网址"
                @click="copyField('网址', entry.url || '')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 描述 -->
        <div class="field-group">
          <label class="field-label">描述</label>
          <textarea
            :value="entry.description || ''"
            readonly
            rows="3"
            class="field-input resize-none"
            placeholder="无描述"
          ></textarea>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="entry.tags && entry.tags.length > 0">
        <label class="field-label">标签</label>
        <div class="flex flex-wrap gap-2 mt-2">
          <span
            v-for="tag in entry.tags"
            :key="tag.id"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            :style="{
              backgroundColor: tag.color + '20',
              color: tag.color
            }"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>

      <!-- 元数据 -->
      <div class="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">创建时间</span>
          <span class="text-gray-900 dark:text-white">{{ formatDate(entry.created_at) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">最后更新</span>
          <span class="text-gray-900 dark:text-white">{{ formatDate(entry.updated_at) }}</span>
        </div>
        <div v-if="entry.last_used_at" class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">最后使用</span>
          <span class="text-gray-900 dark:text-white">{{ formatDate(entry.last_used_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 定义 props
interface Tag {
  id: number
  name: string
  color: string
}

interface Props {
  entry?: {
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
}

withDefaults(defineProps<Props>(), {
  entry: undefined
})

// 定义 emits
defineEmits<{
  edit: []
  delete: []
  copy: [field: string, value: string]
}>()

// 响应式数据
const showPassword = ref(false)

// 方法
const togglePasswordVisibility = (): void => {
  showPassword.value = !showPassword.value
}

const toggleFavorite = (): void => {
  // 这里应该调用 API 更新收藏状态
  console.log('切换收藏状态')
}

const copyField = (field: string, value: string): void => {
  navigator.clipboard
    .writeText(value)
    .then(() => {
      console.log(`已复制${field}: ${value}`)
      // 这里可以显示成功提示
    })
    .catch((err) => {
      console.error('复制失败:', err)
    })
}

const openUrl = (url: string): void => {
  window.open(url, '_blank')
}

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
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPasswordStrengthColor = (strength: number, position: number): string => {
  const filled = position <= Math.ceil(strength / 25)

  if (!filled) return 'bg-gray-200 dark:bg-gray-600'

  if (strength < 25) return 'bg-red-400'
  if (strength < 50) return 'bg-yellow-400'
  if (strength < 75) return 'bg-blue-400'
  return 'bg-green-400'
}

const getPasswordStrengthText = (strength: number): string => {
  if (strength < 25) return '弱'
  if (strength < 50) return '中等'
  if (strength < 75) return '强'
  return '很强'
}

const getPasswordStrengthTextColor = (strength: number): string => {
  if (strength < 25) return 'text-red-600 dark:text-red-400'
  if (strength < 50) return 'text-yellow-600 dark:text-yellow-400'
  if (strength < 75) return 'text-blue-600 dark:text-blue-400'
  return 'text-green-600 dark:text-green-400'
}
</script>
