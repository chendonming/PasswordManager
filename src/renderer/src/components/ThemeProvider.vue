<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <slot />
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'

// 主题状态
const isDark = ref(false)

// 计算主题
const theme = computed(() => (isDark.value ? darkTheme : null))

// 主题覆盖配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    primaryColorSuppl: '#36ad6a'
  }
}

// 暴露切换主题的方法
const toggleTheme = (): void => {
  isDark.value = !isDark.value
}

defineExpose({
  toggleTheme,
  isDark
})
</script>
