<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- 标题 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        标题 *
      </label>
      <input
        v-model="form.title"
        type="text"
        required
        placeholder="例如：Gmail、GitHub 等"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- 用户名/邮箱 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        用户名/邮箱
      </label>
      <input
        v-model="form.username"
        type="text"
        placeholder="用户名或邮箱地址"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- 密码 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        密码 *
      </label>
      <div class="relative">
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          required
          placeholder="输入密码"
          class="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
          <button
            type="button"
            title="显示/隐藏密码"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-all duration-150 cursor-pointer"
            @click="showPassword = !showPassword"
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
              ></path>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            title="生成密码"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-all duration-150 cursor-pointer"
            @click="generatePassword"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
          </button>
        </div>
      </div>
      <!-- 密码强度指示 -->
      <div v-if="form.password" class="mt-2">
        <PasswordStrengthIndicator :strength="passwordStrength" show-text />
      </div>
    </div>

    <!-- 网站 URL -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        网站 URL
      </label>
      <input
        v-model="form.url"
        type="url"
        placeholder="https://example.com"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- 备注 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> 备注 </label>
      <textarea
        v-model="form.description"
        rows="3"
        placeholder="添加备注信息..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      ></textarea>
    </div>

    <!-- 标签 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> 标签 </label>

      <!-- 已选标签显示 -->
      <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-2 mb-3">
        <span
          v-for="tag in selectedTags"
          :key="tag.id"
          class="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium"
          :style="{
            backgroundColor: tag.color + '20',
            color: tag.color,
            border: `1px solid ${tag.color}30`
          }"
        >
          {{ tag.name }}
          <button
            type="button"
            class="ml-1.5 text-current hover:text-red-600 transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95"
            @click="removeTag(tag)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      </div>

      <!-- 标签选择器 -->
      <div class="relative">
        <div class="flex items-center space-x-2">
          <div class="relative flex-1">
            <input
              v-model="tagSearchQuery"
              type="text"
              placeholder="搜索或输入新标签名称..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @focus="showTagDropdown = true"
              @blur="hideTagDropdown"
              @keydown.enter.prevent="handleTagEnter"
            />

            <!-- 标签下拉列表 -->
            <div
              v-if="showTagDropdown && (filteredAvailableTags.length > 0 || tagSearchQuery.trim())"
              class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-40 overflow-y-auto"
            >
              <!-- 可选择的现有标签 -->
              <div
                v-for="tag in filteredAvailableTags"
                :key="tag.id"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm transition-all duration-150 border-l-2 border-transparent hover:border-blue-500 flex items-center space-x-2 hover:scale-105 active:scale-95"
                @click="addTag(tag)"
              >
                <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: tag.color }"></div>
                <span class="text-gray-900 dark:text-white">{{ tag.name }}</span>
                <span
                  v-if="tag.description"
                  class="text-xs text-gray-500 dark:text-gray-400 truncate"
                >
                  - {{ tag.description }}
                </span>
              </div>

              <!-- 创建新标签选项 -->
              <div
                v-if="
                  tagSearchQuery.trim() &&
                  !filteredAvailableTags.some(
                    (t) => t.name.toLowerCase() === tagSearchQuery.toLowerCase()
                  )
                "
                class="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm transition-all duration-150 border-l-2 border-transparent hover:border-blue-500 flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95"
                @click="createAndAddTag"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>创建新标签 "{{ tagSearchQuery.trim() }}"</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            title="管理标签"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 text-gray-600 dark:text-gray-400 cursor-pointer hover:scale-105 active:scale-95"
            @click="$emit('manage-tags')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 收藏 -->
    <div class="flex items-center">
      <input
        id="is_favorite"
        v-model="form.is_favorite"
        type="checkbox"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <label
        for="is_favorite"
        class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
      >
        设为收藏
      </label>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PasswordStrengthIndicator from './PasswordStrengthIndicator.vue'

interface Tag {
  id: number
  name: string
  color: string
  description?: string
}

interface PasswordForm {
  title: string
  username: string
  password: string
  url: string
  description: string
  is_favorite: boolean
  tags: Tag[]
}

interface Props {
  initialData?: {
    title?: string
    username?: string
    password?: string
    url?: string
    description?: string
    is_favorite?: boolean
    tags?: Tag[]
  } | null
  availableTags?: Tag[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: null,
  availableTags: () => []
})

const emit = defineEmits<{
  submit: [data: PasswordForm]
  'manage-tags': []
}>()

// 表单数据
const form = ref<PasswordForm>({
  title: props.initialData?.title || '',
  username: props.initialData?.username || '',
  password: props.initialData?.password || '',
  url: props.initialData?.url || '',
  description: props.initialData?.description || '',
  is_favorite: props.initialData?.is_favorite || false,
  tags: props.initialData?.tags || []
})

// 标签相关状态
const selectedTags = ref<Tag[]>(props.initialData?.tags || [])
const tagSearchQuery = ref('')
const showTagDropdown = ref(false)
const allTags = ref<Tag[]>(props.availableTags || [])

// 计算属性
const filteredAvailableTags = computed(() => {
  const query = tagSearchQuery.value.toLowerCase()
  const selectedTagIds = new Set(selectedTags.value.map((tag) => tag.id))

  return allTags.value
    .filter((tag) => !selectedTagIds.has(tag.id))
    .filter(
      (tag) =>
        query === '' ||
        tag.name.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query))
    )
})

// 监听initialData变化以支持编辑模式
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      form.value = {
        title: newData.title || '',
        username: newData.username || '',
        password: newData.password || '',
        url: newData.url || '',
        description: newData.description || '',
        is_favorite: newData.is_favorite || false,
        tags: newData.tags || []
      }
      selectedTags.value = newData.tags || []
    } else {
      // 重置表单
      form.value = {
        title: '',
        username: '',
        password: '',
        url: '',
        description: '',
        is_favorite: false,
        tags: []
      }
      selectedTags.value = []
    }
  },
  { immediate: true }
)

// 监听availableTags变化
watch(
  () => props.availableTags,
  (newTags) => {
    allTags.value = newTags || []
  },
  { immediate: true }
)

// 监听selectedTags变化并同步到form.tags
watch(
  selectedTags,
  (newTags) => {
    form.value.tags = [...newTags]
  },
  { deep: true }
)

// 显示密码状态
const showPassword = ref(false)

// 密码强度计算
const passwordStrength = computed(() => {
  const password = form.value.password
  if (!password) return 0

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
})

// 标签相关方法
const addTag = (tag: Tag): void => {
  if (!selectedTags.value.find((t) => t.id === tag.id)) {
    selectedTags.value.push(tag)
  }
  tagSearchQuery.value = ''
  showTagDropdown.value = false
}

const removeTag = (tag: Tag): void => {
  selectedTags.value = selectedTags.value.filter((t) => t.id !== tag.id)
}

const createAndAddTag = async (): Promise<void> => {
  const newTagName = tagSearchQuery.value.trim()
  if (!newTagName) return

  try {
    const newTag = await window.api.createTag({
      name: newTagName,
      color: '#18a058'
    })

    if (newTag && newTag.id) {
      allTags.value.push(newTag)
      addTag(newTag)
    }
  } catch (error) {
    console.error('创建标签失败:', error)
  }
}

const handleTagEnter = (): void => {
  if (filteredAvailableTags.value.length > 0) {
    addTag(filteredAvailableTags.value[0])
  } else if (tagSearchQuery.value.trim()) {
    createAndAddTag()
  }
}

const hideTagDropdown = (): void => {
  setTimeout(() => {
    showTagDropdown.value = false
  }, 200) // 延迟隐藏，允许点击下拉列表
}

// 生成密码
const generatePassword = (): void => {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }

  form.value.password = password
}

// 提交表单
const handleSubmit = (): void => {
  emit('submit', { ...form.value })
}

// 重置表单
const resetForm = (): void => {
  form.value = {
    title: '',
    username: '',
    password: '',
    url: '',
    description: '',
    is_favorite: false,
    tags: []
  }
  selectedTags.value = []
  tagSearchQuery.value = ''
}

// 暴露方法给父组件
defineExpose({
  resetForm,
  submit: handleSubmit
})
</script>
