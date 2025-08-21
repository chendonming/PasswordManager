// Types for preload-exposed APIs used in renderer

interface Tag {
  id: number
  name: string
  color: string
}

interface DecryptedPasswordEntry {
  id: number
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  is_favorite: boolean
  password_strength: number
  created_at: string
  updated_at: string
  last_used_at?: string
  tags: Tag[]
}

interface PreloadApi {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  // Event subscription helpers added by preload
  on?: (channel: string, listener: (...args: unknown[]) => void) => void
  once?: (channel: string, listener: (...args: unknown[]) => void) => void
  off?: (channel: string, listener?: (...args: unknown[]) => void) => void
  // Password related
  searchPasswordEntries: (params: { page?: number; pageSize?: number; query?: string }) => Promise<{
    entries: DecryptedPasswordEntry[]
    total: number
    page: number
    pageSize: number
  }>
  createPasswordEntry: (data: {
    title: string
    username?: string
    password: string
    url?: string
    description?: string
    is_favorite?: boolean
  }) => Promise<DecryptedPasswordEntry>
  updatePasswordEntry: (
    id: number,
    data: {
      title?: string
      username?: string
      password?: string
      url?: string
      description?: string
      is_favorite?: boolean
    }
  ) => Promise<DecryptedPasswordEntry>
  deletePasswordEntry: (id: number) => Promise<void>

  // Tags API
  getAllTags: () => Promise<Tag[]>
  createTag: (data: { name: string; color: string }) => Promise<Tag>
  updateTag: (id: number, data: { name?: string; color?: string }) => Promise<Tag>
  deleteTagById: (id: number) => Promise<void>

  // Other utilities (may be optional in some environments)
  setThemeBackground?: (isDark: boolean) => Promise<void>
  getStatistics?: () => Promise<{
    totalEntries: number
    totalTags: number
    favoriteEntries: number
    recentlyUsed: number
  }>
  selectImportFile?: (
    format: string
  ) => Promise<{ success: boolean; data?: { filePath?: string }; message?: string }>
  importPreview?: (config: {
    format: string
    filePath: string
    conflictStrategy?: string
  }) => Promise<{
    success: boolean
    data?: { statistics?: { totalEntries?: number; invalidEntries?: number } }
    message?: string
  }>
  importExecute?: (config: {
    format: string
    filePath: string
    conflictStrategy?: string
  }) => Promise<{
    success: boolean
    data?: unknown
    message?: string
  }>
  getAppVersions?: () => Record<string, string>
  // Window controls exposed by preload
  minimizeWindow?: () => void
  maximizeWindow?: () => void
  closeWindow?: () => void
}

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
