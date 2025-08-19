<template>
  <div class="p-6">
    <div class="max-w-md mx-auto">
      <h2 class="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">密码生成器</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            生成的密码
          </label>
          <div class="flex">
            <input
              v-model="generatedPassword"
              type="text"
              readonly
              class="flex-1 px-3 py-2 border rounded-l-lg font-mono text-sm border-gray-300 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all duration-150"
              @click="copyPassword"
            >
              复制
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            密码长度: {{ passwordLength }}
          </label>
          <input
            v-model="passwordLength"
            type="range"
            min="6"
            max="50"
            class="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
            @input="generatePassword"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="includeUppercase"
              type="checkbox"
              class="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              @change="generatePassword"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"> 包含大写字母 (A-Z) </span>
          </label>
          <label class="flex items-center">
            <input
              v-model="includeLowercase"
              type="checkbox"
              class="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              @change="generatePassword"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"> 包含小写字母 (a-z) </span>
          </label>
          <label class="flex items-center">
            <input
              v-model="includeNumbers"
              type="checkbox"
              class="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              @change="generatePassword"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"> 包含数字 (0-9) </span>
          </label>
          <label class="flex items-center">
            <input
              v-model="includeSymbols"
              type="checkbox"
              class="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              @change="generatePassword"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"> 包含符号 (!@#$%^&*) </span>
          </label>
        </div>

        <button
          class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all duration-150"
          @click="generatePassword"
        >
          生成新密码
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 响应式数据
const generatedPassword = ref('P@ssw0rd123!')
const passwordLength = ref(12)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(false)

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

// 复制密码到剪贴板
const copyPassword = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    console.log('密码已复制到剪贴板')
    // 这里可以添加成功提示
  } catch (err) {
    console.error('复制失败:', err)
    // 这里可以添加失败提示
  }
}

// 组件挂载时生成初始密码
onMounted(() => {
  generatePassword()
})
</script>
