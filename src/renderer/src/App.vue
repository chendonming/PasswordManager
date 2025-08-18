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

    const res = await window.api.addPassword(entry)
    console.log('passwords:create response', res)
    if (res && (res.id || res.lastInsertRowid)) {
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

    const res = await window.api.deletePassword(id)
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

    const res = await window.api.updatePassword(id, update)
    console.log('passwords:update response', res)
  } catch (err) {
    console.error('passwords:update error', err)
  }
}

const queryPasswords = async (): Promise<void> => {
  try {
    const params = { page: 1, pageSize: 10, query: '' }

    const res = await window.api.queryPasswords(params)

    console.log('passwords:search response', res)

    const searchRes = res as unknown as { entries?: Record<string, unknown>[] }
    if (searchRes && Array.isArray(searchRes.entries) && searchRes.entries.length > 0) {
      const first = searchRes.entries[0]
      formId.value = Number(String((first as Record<string, unknown>).id ?? ''))
      formTitle.value = String(first.title ?? '')
      formUsername.value = String(first.username ?? '')
      formUrl.value = String(first.url ?? '')
      formDescription.value = String(first.description ?? '')
      if (first.password) formPassword.value = String(first.password)
    }
  } catch (err) {
    console.error('passwords:search error', err)
  }
}

const authTest = async (): Promise<void> => {
  try {
    const isFirst = await window.api.authIsFirstRun()
    console.log('auth:is-first-run ->', isFirst)
    if (isFirst) {
      const res = await window.api.authCreateUser('testuser', 'testpassword')
      console.log('auth:create-user ->', res)
    } else {
      const res = await window.api.authLogin('testuser', 'testpassword')
      console.log('auth:login ->', res)
    }

    try {
      const params = { page: 1, pageSize: 5 }
      const searchRes = await window.api.queryPasswords(params)
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
    const status = await window.api.authStatus()
    console.log('auth:status ->', status)
  } catch (err) {
    console.error('auth:status error', err)
  }
}

const testCrypto = async (): Promise<void> => {
  try {
    const res = await window.api.testCrypto()
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

const autoSaveTest = async (): Promise<void> => {
  try {
    console.log('AutoSave test: start')

    const ids: number[] = []
    for (let i = 0; i < 3; i++) {
      const entry = {
        title: `AutoSave Test ${Date.now()}-${i}`,
        username: `user${i}`,
        password: `P@ss${i}!`,
        url: `https://example.com/${i}`,
        description: 'auto-save test'
      }

      const res = await window.api.addPassword(entry)
      console.log('created', res)
      const id = Number(res.id ?? res.lastInsertRowid)
      if (id) ids.push(id)
      await new Promise((r) => setTimeout(r, 200))
    }

    if (ids.length > 0) {
      const firstId = ids[0]
      await window.api.invoke('passwords:update', firstId, {
        title: 'AutoSave Modified',
        password: 'ModifiedP@ss!'
      })
      console.log('updated', firstId)
    }

    if (ids.length > 1) {
      const lastId = ids[ids.length - 1]
      await window.api.invoke('passwords:delete', lastId)
      console.log('deleted', lastId)
    }

    console.log('waiting for autosave to trigger...')
    await new Promise((r) => setTimeout(r, 6000))

    console.log('AutoSave test: done — 检查主进程日志以确认节流/保存次数')
    alert('AutoSave test finished — check main process logs for autosave activity')
  } catch (err) {
    console.error('AutoSave test error', err)
    alert('AutoSave test error — 查看控制台')
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
              <n-button type="error" @click="autoSaveTest"> AutoSave 测试 </n-button>
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
