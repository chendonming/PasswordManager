export type SyncStatus = 'idle' | 'auth_required' | 'syncing' | 'error' | 'unknown'

import type { JsonValue, JsonObject } from '../../../common/types/safe-json'

export interface SyncResult<T = JsonValue> {
  success: boolean
  message?: string
  data?: T
}

export type SyncProviderConfig = JsonObject

export interface ISyncProvider {
  // human friendly name
  readonly name: string

  // 初始化提供者（例如加载凭证）
  init(config?: SyncProviderConfig): Promise<void>

  // 推送本地数据到远端
  push(localPayload: Buffer | string, opts?: SyncProviderConfig): Promise<SyncResult>

  // 从远端拉取数据（返回 Buffer/string）
  pull(opts?: SyncProviderConfig): Promise<SyncResult<Buffer | string | null>>

  // 列出远端条目或元数据
  listRemote(opts?: SyncProviderConfig): Promise<SyncResult<JsonObject[]>>

  // 获取当前状态
  getStatus(): Promise<SyncStatus>

  // 更新提供者配置（例如保存 token）
  configure(config: SyncProviderConfig): Promise<SyncResult>

  // 可选：清理资源
  dispose?(): Promise<void>
}

export default ISyncProvider
