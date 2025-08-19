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
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

    <!-- 收藏 -->
    <div class="flex items-center">
      <input
        id="is_favorite"
        v-model="form.is_favorite"
        type="checkbox"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <label for="is_favorite" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        设为收藏
      </label>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PasswordStrengthIndicator from './PasswordStrengthIndicator.vue'

interface PasswordForm {
  title: string
  username: string
  password: string
  url: string
  description: string
  is_favorite: boolean
}

interface Props {
  initialData?: Partial<PasswordForm>
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({})
})

const emit = defineEmits<{
  submit: [data: PasswordForm]
}>()

// 表单数据
const form = ref<PasswordForm>({
  title: '',
  username: '',
  password: '',
  url: '',
  description: '',
  is_favorite: false,
  ...props.initialData
})

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
    ...props.initialData
  }
}

// 暴露方法给父组件
defineExpose({
  resetForm
})
</script>
