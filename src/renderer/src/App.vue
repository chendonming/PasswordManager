<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ThemeProvider from './components/ThemeProvider.vue'

const themeProviderRef = ref()

const toggleTheme = (): void => {
  themeProviderRef.value?.toggleTheme()
}

onMounted(() => {
  console.info('App.vue mounted - IPC test buttons ready')
})

// Test functions for IPC calls

const formTitle = ref('Test Entry')
const formUsername = ref('testuser')
const formPassword = ref('P@ssw0rd!')
const formUrl = ref('https://example.com')
const formDescription = ref('created from UI test')
const formId = ref<number | null>(null)

const addPassword = async (): Promise<void> => {
  try {
    const entry = {
      title: formTitle.value,
      username: formUsername.value,
      password: formPassword.value,
      url: formUrl.value,
      description: formDescription.value
    }
    const res = await window.electron.ipcRenderer.invoke('passwords:create', entry)
    console.log('passwords:create response', res)
    if (res && (res.id || res.lastInsertRowid)) {
      // handle either { id } or better-sqlite3 result with lastInsertRowid
      formId.value = Number(res.id ?? res.lastInsertRowid)
    }
  } catch (err) {
    console.error('passwords:create error', err)
  }
}

const deletePassword = async (): Promise<void> => {
  try {
    const id = formId.value
    if (!id) {
      console.warn('请填写要删除的条目 ID')
      return
    }
    const res = await window.electron.ipcRenderer.invoke('passwords:delete', id)
    console.log('passwords:delete response', res)
  } catch (err) {
    console.error('passwords:delete error', err)
  }
}

const editPassword = async (): Promise<void> => {
  try {
    const id = formId.value
    if (!id) {
      console.warn('请填写要更新的条目 ID')
      return
    }
    const update = {
      title: formTitle.value,
      username: formUsername.value,
      password: formPassword.value,
      url: formUrl.value,
      description: formDescription.value
    }
    const res = await window.electron.ipcRenderer.invoke('passwords:update', id, update)
    console.log('passwords:update response', res)
  } catch (err) {
    console.error('passwords:update error', err)
  }
}

const queryPasswords = async (): Promise<void> => {
  try {
    const params = { page: 1, pageSize: 10, query: '' }
    const res = await window.electron.ipcRenderer.invoke('passwords:search', params)
    console.log('passwords:search response', res)
    if (res && Array.isArray(res.items) && res.items.length > 0) {
      const first = res.items[0]
      formId.value = Number(first.id)
      formTitle.value = first.title || ''
      formUsername.value = first.username || ''
      formUrl.value = first.url || ''
      formDescription.value = first.description || ''
      if (first.password) formPassword.value = first.password
    }
  } catch (err) {
    console.error('passwords:search error', err)
  }
}

const authTest = async (): Promise<void> => {
  try {
    const isFirst = await window.electron.ipcRenderer.invoke('auth:is-first-run')
    console.log('auth:is-first-run ->', isFirst)
    if (isFirst) {
      // create default test user
      const res = await window.electron.ipcRenderer.invoke(
        'auth:create-user',
        'testuser',
        'testpassword'
      )
      console.log('auth:create-user ->', res)
    } else {
      const res = await window.electron.ipcRenderer.invoke('auth:login', 'testuser', 'testpassword')
      console.log('auth:login ->', res)
    }

    // after authentication attempt a search to verify permissions
    try {
      const params = { page: 1, pageSize: 5 }
      const searchRes = await window.electron.ipcRenderer.invoke('passwords:search', params)
      console.log('post-auth passwords:search ->', searchRes)
    } catch (err) {
      console.error('post-auth passwords:search error', err)
    }
  } catch (err) {
    console.error('auth test error', err)
  }
}

const authStatus = async (): Promise<void> => {
  try {
    const status = await window.electron.ipcRenderer.invoke('auth:status')
    console.log('auth:status ->', status)
  } catch (err) {
    console.error('auth:status error', err)
  }
}

const testCrypto = async (): Promise<void> => {
  try {
    const res = await window.electron.ipcRenderer.invoke('test:crypto')
    console.log('test:crypto ->', res)
    if (res && res.success) {
      alert(`Crypto test succeeded: ${res.path}`)
    } else {
      alert(`Crypto test failed: ${res?.error ?? 'unknown'}`)
    }
  } catch (err) {
    console.error('test:crypto error', err)
    alert('test:crypto threw an exception; check main process logs')
  }
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
              <n-button type="primary" @click="addPassword"> 新增密码 (测试) </n-button>
              <n-button @click="queryPasswords"> 查询密码 (测试) </n-button>
              <n-button @click="editPassword"> 修改密码 (测试) </n-button>
              <n-button @click="deletePassword"> 删除密码 (测试) </n-button>
              <n-button type="warning" @click="testCrypto"> Crypto 验证 (测试) </n-button>
              <n-button type="info" @click="authTest"> 认证测试 </n-button>
              <n-button type="default" @click="authStatus"> 认证状态 </n-button>
            </n-space>

            <n-space vertical>
              <!-- ID 输入已隐藏；formId 会在创建或查询后自动填充 -->
              <n-input v-model:value="formTitle" placeholder="标题" />
              <n-input v-model:value="formUsername" placeholder="用户名" />
              <n-input v-model:value="formPassword" placeholder="密码" />
              <n-input v-model:value="formUrl" placeholder="URL" />
              <n-input v-model:value="formDescription" placeholder="描述" />
            </n-space>

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
