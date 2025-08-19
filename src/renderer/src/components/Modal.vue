<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleBackdropClick"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <!-- 弹窗内容 -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            v-if="visible"
            :class="[
              'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
              'border border-gray-200 dark:border-gray-700',
              'max-h-[90vh] overflow-hidden flex flex-col',
              sizeClass
            ]"
          >
            <!-- 头部 -->
            <div
              v-if="title || $slots.header || showClose"
              class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-center space-x-3">
                <slot name="header">
                  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ title }}
                  </h2>
                </slot>
              </div>

              <button
                v-if="showClose"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click="$emit('close')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- 内容区域 -->
            <div class="flex-1 overflow-y-auto p-6">
              <slot></slot>
            </div>

            <!-- 底部 -->
            <div
              v-if="$slots.footer"
              class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible?: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  size: 'md',
  showClose: true,
  closeOnBackdrop: true
})

const emit = defineEmits<{
  close: []
}>()

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-full max-w-md'
    case 'md':
      return 'w-full max-w-lg'
    case 'lg':
      return 'w-full max-w-2xl'
    case 'xl':
      return 'w-full max-w-4xl'
    case 'full':
      return 'w-full h-full max-w-none'
    default:
      return 'w-full max-w-lg'
  }
})

const handleBackdropClick = (): void => {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

// 防止滚动穿透
const toggleBodyScroll = (disable: boolean): void => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = disable ? 'hidden' : ''
  }
}

// 监听 visible 变化
import { watch } from 'vue'
watch(
  () => props.visible,
  (newValue) => {
    toggleBodyScroll(newValue)
  },
  { immediate: true }
)

// 组件卸载时恢复滚动
import { onUnmounted } from 'vue'
onUnmounted(() => {
  toggleBodyScroll(false)
})
</script>
