<template>
  <div class="p-4 space-y-4">
    <h2 class="text-lg font-semibold">同步（GitHub Gist）</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-1">GitHub Token</label>
        <input
          v-model="token"
          type="password"
          placeholder="输入临时 token（不会写日志）"
          class="w-full px-3 py-2 border rounded"
        />
        <p class="text-xs text-gray-500 mt-1">用于访问 Gist：建议使用带 gist 权限的临时 token。</p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Gist ID（用于 Pull / 更新已有 Gist）</label>
        <input
          v-model="gistId"
          type="text"
          placeholder="可留空以创建新 Gist（Push 时）"
          class="w-full px-3 py-2 border rounded"
        />
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <div class="text-sm text-gray-600">
        Push 将使用当前正在使用的本地 .enc（无需手动选择文件）。请填写临时 GitHub
        Token（只用于此次请求）并可选填写 Gist ID 以更新已有 Gist。
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <button
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded"
        :disabled="isPushing"
        @click="onPush"
      >
        <span
          v-if="isPushing"
          class="animate-spin inline-block w-4 h-4 mr-2 border-b-2 border-white rounded-full"
        ></span>
        {{ isPushing ? '上传中...' : 'Push 到 Gist' }}
      </button>

      <button
        type="button"
        class="px-4 py-2 bg-green-600 text-white rounded"
        :disabled="isPulling"
        @click="confirmPull"
      >
        <span
          v-if="isPulling"
          class="animate-spin inline-block w-4 h-4 mr-2 border-b-2 border-white rounded-full"
        ></span>
        {{ isPulling ? '拉取中...' : 'Pull 并导入' }}
      </button>

      <button type="button" class="px-3 py-2 border rounded" @click="clearForm">清除</button>
    </div>

    <div v-if="lastResult" class="mt-3 p-3 border rounded">
      <div class="text-sm">
        <div v-if="lastResult.success" class="text-green-700 font-medium">操作成功</div>
        <div v-else class="text-red-700 font-medium">操作失败</div>
        <div class="mt-2">
          <pre class="text-xs overflow-auto">{{ lastResultMessage }}</pre>
        </div>
      </div>
    </div>

    <ConfirmModal
      :visible="showPullConfirm"
      title="确认 Pull 并覆盖本地加密文件？"
      message="Pull 会替换本地的加密数据库文件（已实现备份与回滚）。如果您不确定，请先备份。是否继续？"
      @confirm="onPull"
      @cancel="showPullConfirm = false"
      @close="showPullConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ConfirmModal from './ConfirmModal.vue'

// 兼容 preload API 的类型声明（全局已存在）
type PreloadSyncResult =
  | { success: true; message?: string; data?: any }
  | { success: false; error?: string; message?: string }

declare const window: Window & { api: any }

const token = ref<string>('')
const gistId = ref<string>('')

const isPushing = ref(false)
const isPulling = ref(false)

const lastResult = ref<PreloadSyncResult | null>(null)
const showPullConfirm = ref(false)

const lastResultMessage = computed(() => {
  if (!lastResult.value) return ''
  if (lastResult.value.success) {
    return `${lastResult.value.message || ''}\n${JSON.stringify(lastResult.value.data || {}, null, 2)}`
  }
  return (
    lastResult.value.error || lastResult.value.message || JSON.stringify(lastResult.value, null, 2)
  )
})

const clearForm = (): void => {
  token.value = ''
  gistId.value = ''
  lastResult.value = null
}

const onPush = async (): Promise<void> => {
  isPushing.value = true
  lastResult.value = null
  try {
    // 请求主进程使用当前应用正在使用的 .enc 文件并推送到远端
    const opts = { token: token.value, gistId: gistId.value || undefined }
    const res = (await window.api.sync.pushCurrent(opts)) as PreloadSyncResult
    lastResult.value = res
    if (res && (res as any).data && (res as any).data.id) {
      gistId.value = (res as any).data.id
    }
  } catch (err) {
    lastResult.value = { success: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    isPushing.value = false
  }
}

const confirmPull = (): void => {
  showPullConfirm.value = true
}

const onPull = async (): Promise<void> => {
  showPullConfirm.value = false
  isPulling.value = true
  lastResult.value = null
  try {
    const opts = { token: token.value, gistId: gistId.value || undefined }
    const res = (await window.api.sync.pull(opts)) as PreloadSyncResult
    lastResult.value = res
  } catch (err) {
    lastResult.value = { success: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    isPulling.value = false
  }
}
</script>

<style scoped>
/* 简单样式以与项目风格接近 */
</style>
