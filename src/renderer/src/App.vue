<script setup lang="ts">
import { ref } from 'vue'
import ThemeProvider from './components/ThemeProvider.vue'

const themeProviderRef = ref()

const toggleTheme = (): void => {
  themeProviderRef.value?.toggleTheme()
}
</script>

<template>
  <ThemeProvider ref="themeProviderRef">
    <div class="app-container">
      <n-space vertical size="large">
        <n-card title="密码管理器" style="max-width: 800px; margin: 0 auto">
          <template #header-extra>
            <n-button @click="toggleTheme"> 切换主题 </n-button>
          </template>

          <n-space vertical>
            <n-alert title="欢迎使用密码管理器" type="success">
              这是一个功能丰富的密码管理器，基于 Electron + Vue + Naive UI 构建。
            </n-alert>

            <n-divider title-placement="left"> 功能演示 </n-divider>

            <n-space>
              <n-button type="primary"> 新增密码 </n-button>
              <n-button> 查询密码 </n-button>
              <n-button> 密码生成器 </n-button>
              <n-button> 标签管理 </n-button>
            </n-space>

            <n-input placeholder="搜索密码..." />

            <n-tag>标签示例</n-tag>
          </n-space>
        </n-card>
      </n-space>
    </div>
  </ThemeProvider>
</template>

<style scoped>
.app-container {
  padding: 20px;
  min-height: 100vh;
  background: var(--n-color);
}
</style>
