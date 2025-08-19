<template>
  <div class="flex items-center space-x-2">
    <!-- 强度指示条 -->
    <div class="flex space-x-1">
      <div
        v-for="i in 4"
        :key="i"
        :class="[
          size === 'sm' ? 'w-1 h-3' : size === 'lg' ? 'w-2 h-5' : 'w-1 h-4',
          'rounded-full transition-colors duration-200',
          getPasswordStrengthColor(strength, i)
        ]"
      ></div>
    </div>

    <!-- 强度文字（可选） -->
    <span
      v-if="showText"
      :class="[
        size === 'sm' ? 'text-xs' : 'text-sm',
        'text-gray-500 dark:text-gray-400 font-medium'
      ]"
    >
      {{ strengthText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  strength: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: false
})

// 计算密码强度颜色
const getPasswordStrengthColor = (strength: number, position: number): string => {
  const filled = position <= Math.ceil(strength / 25)

  if (!filled) return 'bg-gray-200 dark:bg-gray-600'

  if (strength < 25) return 'bg-red-400'
  if (strength < 50) return 'bg-yellow-400'
  if (strength < 75) return 'bg-blue-400'
  return 'bg-green-400'
}

// 计算强度文字
const strengthText = computed(() => {
  if (props.strength < 25) return '弱'
  if (props.strength < 50) return '一般'
  if (props.strength < 75) return '较强'
  return '强'
})
</script>
