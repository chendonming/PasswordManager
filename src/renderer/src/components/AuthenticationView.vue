<template>
  <div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
    <div class="w-full max-w-md px-6">
      <div class="text-center mb-8">
        <svg
          class="w-16 h-16 mx-auto mb-4 text-blue-600"
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
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">密码管理器</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {{ isFirstTime ? '设置主密码以开始使用' : '输入主密码以解锁您的数据' }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ isFirstTime ? '设置主密码' : '主密码' }}
          </label>
          <div class="relative">
            <input
              v-model="masterPassword"
              :type="showMasterPassword ? 'text' : 'password'"
              required
              :placeholder="isFirstTime ? '请设置您的主密码' : '请输入主密码'"
              class="w-full px-3 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showMasterPassword = !showMasterPassword"
            >
              <svg
                class="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="!showMasterPassword"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  v-if="!showMasterPassword"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <path
                  v-if="showMasterPassword"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="isFirstTime" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              确认主密码
            </label>
            <input
              v-model="confirmMasterPassword"
              :type="showMasterPassword ? 'text' : 'password'"
              required
              placeholder="请再次输入主密码"
              class="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <p class="mb-1">⚠️ 请妥善保管您的主密码：</p>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li>主密码用于加密您的所有数据</li>
              <li>忘记主密码将无法恢复您的数据</li>
              <li>建议使用强密码并记住它</li>
            </ul>
          </div>
        </div>

        <div v-if="authError" class="text-red-600 text-sm">
          {{ authError }}
        </div>

        <button
          type="submit"
          :disabled="isAuthenticating"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
        >
          <div
            v-if="isAuthenticating"
            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
          ></div>
          {{ isAuthenticating ? '处理中...' : isFirstTime ? '创建并解锁' : '解锁' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props
interface Props {
  isFirstTime: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'authenticate', data: { masterPassword: string; confirmMasterPassword?: string }): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const masterPassword = ref('')
const confirmMasterPassword = ref('')
const showMasterPassword = ref(false)
const isAuthenticating = ref(false)
const authError = ref<string | null>(null)

// 暴露给父组件的方法
const setAuthenticating = (value: boolean): void => {
  isAuthenticating.value = value
}

const setAuthError = (error: string | null): void => {
  authError.value = error
}

const clearForm = (): void => {
  masterPassword.value = ''
  confirmMasterPassword.value = ''
  authError.value = null
}

// 表单提交处理
const handleSubmit = (): void => {
  if (isAuthenticating.value) return

  authError.value = null

  // 验证输入
  if (!masterPassword.value.trim()) {
    authError.value = '请输入主密码'
    return
  }

  if (props.isFirstTime) {
    if (!confirmMasterPassword.value.trim()) {
      authError.value = '请确认主密码'
      return
    }

    if (masterPassword.value !== confirmMasterPassword.value) {
      authError.value = '两次输入的主密码不一致'
      return
    }

    if (masterPassword.value.length < 6) {
      authError.value = '主密码长度至少为6位'
      return
    }
  }

  // 触发认证事件
  emit('authenticate', {
    masterPassword: masterPassword.value,
    confirmMasterPassword: props.isFirstTime ? confirmMasterPassword.value : undefined
  })
}

// 暴露方法供父组件调用
defineExpose({
  setAuthenticating,
  setAuthError,
  clearForm
})
</script>
