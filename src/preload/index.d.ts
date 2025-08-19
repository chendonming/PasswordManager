import type {
  SearchPasswordsResult,
  DecryptedPasswordEntry,
  DecryptedPasswordHistory
} from '../common/types/database'

declare global {
  interface Window {
    api: PreloadAPI
  }
}

type IPCListener = (...args: unknown[]) => void

interface AutosavePayload {
  timestamp: string
  path?: string
  error?: string
}

// Map of known IPC invoke channels to function signatures used by invoke.
// Keep parameter and return types minimal but concrete so renderer gets useful typing.
// IPC 调用可能由主进程返回错误对象：{ error: string }
// 使用 IPCResult<T> 来表达“成功类型或错误对象”的联合
type IPCResult<T> = T | { error: string }

interface IPCInvokeMap {
  // auth
  'auth:check-status': () => { status: string; message?: string }
  'auth:create-master-password': (masterPassword: string) => { success: boolean; error?: string }
  'auth:unlock': (masterPassword: string) => { success: boolean; error?: string }
  'auth:logout': () => { success: boolean }
  'auth:is-authenticated': () => boolean

  // passwords
  'passwords:create': (entry: CreatePasswordEntryInput) => IPCResult<DecryptedPasswordEntry>
  'passwords:delete': (id: number) => IPCResult<{ success: boolean }>
  'passwords:update': (
    id: number,
    update: UpdatePasswordEntryInput
  ) => IPCResult<DecryptedPasswordEntry>
  'passwords:search': (params: SearchPasswordsInput) => IPCResult<SearchPasswordsResult>

  // test/dev
  'test:crypto': () => { success: boolean; path?: string; error?: string }
  // tags
  'tags:get-all': () => IPCResult<Tag[]>
  'tags:create': (input: CreateTagInput) => IPCResult<Tag>
  'tags:update': (id: number, input: UpdateTagInput) => IPCResult<Tag>
  'tags:delete': (id: number) => IPCResult<{ success: boolean }>

  // settings
  'settings:get': (key: string) => IPCResult<string | null>
  'settings:set': (
    key: string,
    value: string,
    description?: string
  ) => IPCResult<{ success: boolean }>
  'settings:get-all': () => IPCResult<AppSetting[]>

  // misc
  'stats:get': () => IPCResult<Record<string, number>>
  'maintenance:health-check': () => { healthy: boolean }
  'maintenance:repair': () => IPCResult<{ success: boolean }>
  'backup:create': (options?: { path?: string }) => IPCResult<{ success: boolean }>
  'audit:get-logs': (opts?: { limit?: number }) => IPCResult<AuditLog[]>

  // crypto helpers
  'crypto:generate-password': (opts?: { length?: number; symbols?: boolean }) => string
  'crypto:evaluate-strength': (password: string) => { score: number; feedback?: string }

  // window controls
  'window:minimize': () => void
  'window:maximize': () => void
  'window:close': () => void
}

// password-related types are provided by `src/common/types/database.d.ts` as global declarations

interface PreloadAPI {
  // Strongly-typed invoke: map known channels to return types to avoid `unknown`
  invoke<K extends keyof IPCInvokeMap>(
    channel: K,
    ...args: Parameters<IPCInvokeMap[K]>
  ): Promise<ReturnType<IPCInvokeMap[K]>>
  on(channel: string, listener: IPCListener): void
  once(channel: string, listener: IPCListener): void
  off(channel: string, listener?: IPCListener): void
  onAutosaveCompleted(listener: (payload: AutosavePayload) => void): void
  offAutosaveCompleted(listener?: (payload: AutosavePayload) => void): void
  onAutosaveFailed(listener: (payload: AutosavePayload) => void): void
  offAutosaveFailed(listener?: (payload: AutosavePayload) => void): void
  getAppVersions(): Record<string, string>
  // High-level helpers (wrap invoke channels with clear method names)
  // 兼容旧 helper
  addPassword(entry: CreatePasswordEntryInput): Promise<{ id?: number; lastInsertRowid?: number }>
  deletePassword(id: number): Promise<{ affectedRows?: number }>
  updatePassword(id: number, update: UpdatePasswordEntryInput): Promise<{ changes?: number }>
  queryPasswords(params: {
    page?: number
    pageSize?: number
    query?: string
  }): Promise<SearchPasswordsResult>
  getPasswordById(id: number): Promise<DecryptedPasswordEntry | null>
  markPasswordUsed(id: number): Promise<void>
  getPasswordHistory(id: number): Promise<DecryptedPasswordHistory[]>

  // 新增与 DatabaseServiceInterface 对齐的 API（更规则的服务式方法）
  // 标签管理
  createTag(input: CreateTagInput): Promise<Tag>
  updateTag(id: number, input: UpdateTagInput): Promise<Tag>
  deleteTagById(id: number): Promise<void>
  getAllTags(): Promise<Tag[]>
  getTagById(id: number): Promise<Tag | null>

  // 密码条目管理（更规则的方法名称）
  createPasswordEntry(input: CreatePasswordEntryInput): Promise<DecryptedPasswordEntry>
  updatePasswordEntry(id: number, input: UpdatePasswordEntryInput): Promise<DecryptedPasswordEntry>
  deletePasswordEntry(id: number): Promise<void>
  getPasswordEntryById(id: number): Promise<DecryptedPasswordEntry | null>
  searchPasswordEntries(input: SearchPasswordsInput): Promise<SearchPasswordsResult>
  markPasswordEntryAsUsed(id: number): Promise<void>

  // 设置
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string, description?: string): Promise<void>
  getAllSettings(): Promise<AppSetting[]>

  // 审计日志
  logAction(input: CreateAuditLogInput): Promise<void>
  getAuditLogs(limit?: number): Promise<AuditLog[]>

  // auth helpers
  authCheckStatus(): Promise<{ status: string; message?: string }>
  authCreateMasterPassword(masterPassword: string): Promise<{ success: boolean; error?: string }>
  authUnlock(masterPassword: string): Promise<{ success: boolean; error?: string }>

  // dev/test
  testCrypto(): Promise<{ success: boolean; path?: string; error?: string }>

  // window controls
  minimizeWindow(): Promise<void>
  maximizeWindow(): Promise<void>
  closeWindow(): Promise<void>
}

export {}
