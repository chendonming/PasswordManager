import { contextBridge } from 'electron'
import type {
  SearchPasswordsResult,
  DecryptedPasswordEntry,
  DecryptedPasswordHistory,
  Tag,
  AppSetting,
  CreateTagInput,
  UpdateTagInput,
  CreatePasswordEntryInput,
  UpdatePasswordEntryInput,
  SearchPasswordsInput,
  CreateAuditLogInput,
  AuditLog
} from '../common/types/database'
import type { ImportConfig } from '../common/types/import-export'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
// Expose a small, safe IPC surface: invoke, on, once, off, plus autosave helpers
const allowedInvokes = new Set([
  // auth
  'auth:check-status',
  'auth:create-master-password',
  'auth:unlock',
  'auth:logout',
  'auth:is-authenticated',
  // tags
  'tags:get-all',
  'tags:create',
  'tags:update',
  'tags:delete',
  // passwords
  'passwords:search',
  'passwords:get-by-id',
  'passwords:create',
  'passwords:update',
  'passwords:delete',
  'passwords:mark-used',
  'passwords:get-history',
  // crypto
  'crypto:generate-password',
  'crypto:evaluate-strength',
  // settings
  'settings:get',
  'settings:set',
  'settings:get-all',
  // misc
  'stats:get',
  'maintenance:health-check',
  'maintenance:repair',
  'backup:create',
  'audit:get-logs',
  // dev/test
  'test:crypto',
  // window controls
  'window:minimize',
  'window:maximize',
  'window:close',
  // theme
  'theme:set-background',
  // import/export
  'import:preview',
  'import:execute',
  'import:get-supported-formats',
  // dialog
  'dialog:select-import-file'
])

type Listener = (...args: unknown[]) => void

const api = {
  invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!allowedInvokes.has(channel)) {
      throw new Error(`Invoke channel not allowed: ${channel}`)
    }
    // @ts-ignore: electronAPI.ipcRenderer is provided by @electron-toolkit/preload
    const res = await electronAPI.ipcRenderer.invoke(channel, ...args)
    // Main process uses a protectedHandler which returns { error: string }
    // when unauthenticated or on failure. For most callers we prefer to
    // surface that as an exception so high-level helpers can assume they
    // received the successful payload. However some endpoints (like auth
    // create/login) intentionally return { success: boolean, error?: string }
    // and should be returned as-is for the renderer to inspect. Here we
    // throw only when an error object is returned without a success field.
    if (res && typeof res === 'object') {
      const r = res as Record<string, unknown>
      if ('error' in r && !('success' in r)) {
        const msg = typeof r.error === 'string' ? r.error : String(r.error)
        throw new Error(msg)
      }
    }
    return res
  },
  on: (channel: string, listener: Listener): void => {
    // allow subscribing only to autosave events or other approved events
    if (channel !== 'autosave:completed' && channel !== 'autosave:failed') {
      console.warn('Adding listener to unapproved channel:', channel)
    }
    // @ts-ignore: ipcRenderer typings are not exported from electronAPI in our build
    electronAPI.ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => listener(...args))
  },
  once: (channel: string, listener: Listener): void => {
    // @ts-ignore: ipcRenderer typings are not exported from electronAPI in our build
    const onceWrapper = (_event: unknown, ...args: unknown[]): void => listener(...args)
    electronAPI.ipcRenderer.once(channel, onceWrapper)
  },
  off: (channel: string, listener?: Listener): void => {
    // @ts-ignore: ipcRenderer typings are not exported from electronAPI in our build
    if (listener) electronAPI.ipcRenderer.removeListener(channel, listener)
    else electronAPI.ipcRenderer.removeAllListeners(channel)
  },
  // convenience helpers for autosave events
  onAutosaveCompleted: (listener: (payload: unknown) => void) =>
    api.on('autosave:completed', listener),
  offAutosaveCompleted: (listener?: (payload: unknown) => void) =>
    api.off('autosave:completed', listener),
  onAutosaveFailed: (listener: (payload: unknown) => void) => api.on('autosave:failed', listener),
  offAutosaveFailed: (listener?: (payload: unknown) => void) =>
    api.off('autosave:failed', listener),
  // synchronous helper to obtain app/electron/node versions without exposing full process
  getAppVersions: (): Record<string, string> => {
    // copy to plain object and coerce undefined to empty string to satisfy typing
    const out: Record<string, string> = {}
    for (const k of Object.keys(process.versions)) {
      // @ts-ignore index signature
      out[k] = String(process.versions[k])
    }
    return out
  },
  // High-level helpers wrapping invoke
  addPassword: async (entry: {
    title: string
    username?: string
    password?: string
    url?: string
    description?: string
  }) => {
    // Delegate to the service-style method which returns the decrypted entry
    // Coerce optional fields to satisfy CreatePasswordEntryInput where password is required
    const payload: CreatePasswordEntryInput = {
      title: entry.title,
      username: entry.username,
      password: entry.password ?? '',
      url: entry.url,
      description: entry.description
    }
    return (await api.createPasswordEntry(payload)) as DecryptedPasswordEntry
  },
  deletePassword: async (id: number) => {
    await api.deletePasswordEntry(id)
  },
  updatePassword: async (id: number, update: Partial<Record<string, unknown>>) =>
    (await api.updatePasswordEntry(
      id,
      update as UpdatePasswordEntryInput
    )) as DecryptedPasswordEntry,
  queryPasswords: async (params: { page?: number; pageSize?: number; query?: string }) =>
    (await api.invoke('passwords:search', params)) as SearchPasswordsResult,
  getPasswordById: async (id: number) =>
    (await api.invoke('passwords:get-by-id', id)) as DecryptedPasswordEntry | null,
  markPasswordUsed: async (id: number) => (await api.invoke('passwords:mark-used', id)) as void,
  getPasswordHistory: async (id: number) =>
    (await api.invoke('passwords:get-history', id)) as DecryptedPasswordHistory[],

  // auth helpers
  authCheckStatus: async () => api.invoke('auth:check-status'),
  authCreateMasterPassword: async (masterPassword: string) =>
    api.invoke('auth:create-master-password', masterPassword),
  authUnlock: async (masterPassword: string) => api.invoke('auth:unlock', masterPassword),

  // dev/test
  testCrypto: async () => api.invoke('test:crypto'),

  // --- DatabaseService-like wrappers (service-style names)
  // tags
  createTag: async (input: CreateTagInput) => (await api.invoke('tags:create', input)) as Tag,
  updateTag: async (id: number, input: UpdateTagInput) =>
    (await api.invoke('tags:update', id, input)) as Tag,
  deleteTagById: async (id: number) => await api.invoke('tags:delete', id),
  getAllTags: async () => (await api.invoke('tags:get-all')) as Tag[],
  getTagById: async (id: number) => {
    const tags = (await api.invoke('tags:get-all')) as Tag[]
    return tags.find((t) => t.id === id) ?? null
  },

  // password entries
  createPasswordEntry: async (input: CreatePasswordEntryInput) =>
    (await api.invoke('passwords:create', input)) as DecryptedPasswordEntry,
  updatePasswordEntry: async (id: number, input: UpdatePasswordEntryInput) =>
    (await api.invoke('passwords:update', id, input)) as DecryptedPasswordEntry,
  deletePasswordEntry: async (id: number) => await api.invoke('passwords:delete', id),
  getPasswordEntryById: async (id: number) =>
    (await api.invoke('passwords:get-by-id', id)) as DecryptedPasswordEntry | null,
  searchPasswordEntries: async (input: SearchPasswordsInput) =>
    (await api.invoke('passwords:search', input)) as SearchPasswordsResult,
  markPasswordEntryAsUsed: async (id: number) => await api.invoke('passwords:mark-used', id),

  // settings
  getSetting: async (key: string) => (await api.invoke('settings:get', key)) as string | null,
  setSetting: async (key: string, value: string, description?: string) =>
    await api.invoke('settings:set', key, value, description),
  getAllSettings: async () => (await api.invoke('settings:get-all')) as AppSetting[],

  // audit
  logAction: async (input: CreateAuditLogInput) => await api.invoke('audit:log-action', input),
  getAuditLogs: async (opts?: { limit?: number }) =>
    (await api.invoke('audit:get-logs', opts)) as AuditLog[],

  // statistics
  getStatistics: async () => await api.invoke('stats:get'),

  // window controls
  minimizeWindow: async () => await api.invoke('window:minimize'),
  maximizeWindow: async () => await api.invoke('window:maximize'),
  closeWindow: async () => await api.invoke('window:close'),

  // theme controls
  setThemeBackground: async (isDark: boolean) => await api.invoke('theme:set-background', isDark),

  // import/export controls
  importPreview: async (config: ImportConfig) => await api.invoke('import:preview', config),
  importExecute: async (config: ImportConfig) => await api.invoke('import:execute', config),
  getSupportedImportFormats: async () => await api.invoke('import:get-supported-formats'),
  selectImportFile: async (format: string) => await api.invoke('dialog:select-import-file', format)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // Expose ONLY the safe, allowlisted API to renderer. Do NOT expose the raw electronAPI.
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // When contextIsolation is disabled we still avoid exposing the raw electronAPI.
  // @ts-ignore (define in dts)
  window.api = api
}
