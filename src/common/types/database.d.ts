// Shared ambient declarations for database-related types used by preload and renderer

declare interface Tag {
  id: number
  name: string
  color: string
  description?: string
}

declare interface DecryptedPasswordEntry {
  id: number
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  is_favorite: boolean
  last_used_at?: string
  password_strength: number
  created_at: string
  updated_at: string
  tags: Tag[]
}

declare interface SearchPasswordsResult {
  entries: DecryptedPasswordEntry[]
  total: number
  has_more: boolean
}

declare interface DecryptedPasswordHistory {
  id: number
  entry_id: number
  old_password: string
  changed_at: string
}
