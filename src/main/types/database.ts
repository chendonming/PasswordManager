/**
 * 数据库表结构的 TypeScript 类型定义
 */

// =====================================
// 基础接口
// =====================================
export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

// =====================================
// 用户表
// =====================================
export interface User extends BaseEntity {
  username: string
  master_password_hash: string
  salt: string
}

export interface CreateUserInput {
  username: string
  master_password_hash: string
  salt: string
}

// =====================================
// 标签表
// =====================================
export interface Tag extends BaseEntity {
  name: string
  color: string
  description?: string
}

export interface CreateTagInput {
  name: string
  color?: string
  description?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
  description?: string
}

// =====================================
// 密码条目表
// =====================================
export interface PasswordEntry extends BaseEntity {
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  encryption_iv: string
  encryption_tag: string
  is_favorite: boolean
  last_used_at?: string
  password_strength: number
}

export interface PasswordEntryWithTags extends PasswordEntry {
  tags: Tag[]
}

export interface CreatePasswordEntryInput {
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  is_favorite?: boolean
  tag_ids?: number[]
}

export interface UpdatePasswordEntryInput {
  title?: string
  username?: string
  password?: string
  url?: string
  description?: string
  is_favorite?: boolean
  tag_ids?: number[]
}

// 解密后的密码条目（用于UI显示）
export interface DecryptedPasswordEntry {
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

// =====================================
// 密码条目与标签关联表
// =====================================
export interface EntryTag {
  id: number
  entry_id: number
  tag_id: number
  created_at: string
}

// =====================================
// 密码历史记录表
// =====================================
export interface PasswordHistory {
  id: number
  entry_id: number
  old_password: string
  encryption_iv: string
  encryption_tag: string
  changed_at: string
}

// 解密后的密码历史（用于UI显示）
export interface DecryptedPasswordHistory {
  id: number
  entry_id: number
  old_password: string
  changed_at: string
}

// =====================================
// 应用设置表
// =====================================
export interface AppSetting extends BaseEntity {
  key: string
  value: string
  description?: string
}

export interface CreateAppSettingInput {
  key: string
  value: string
  description?: string
}

export interface UpdateAppSettingInput {
  value: string
  description?: string
}

// =====================================
// 审计日志表
// =====================================
export interface AuditLog {
  id: number
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id?: number
  details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface CreateAuditLogInput {
  action: AuditLog['action']
  table_name: string
  record_id?: number
  details?: string
  ip_address?: string
  user_agent?: string
}

// =====================================
// 加密相关类型
// =====================================
export interface EncryptionResult {
  encrypted: string
  iv: string
  tag: string
}

export interface DecryptionInput {
  encrypted: string
  iv: string
  tag: string
}

// =====================================
// 密码生成器设置
// =====================================
export interface PasswordGeneratorSettings {
  length: number
  include_uppercase: boolean
  include_lowercase: boolean
  include_numbers: boolean
  include_symbols: boolean
  exclude_ambiguous: boolean
  exclude_similar: boolean
}

// =====================================
// 搜索和筛选
// =====================================
export interface SearchPasswordsInput {
  query?: string
  tag_ids?: number[]
  is_favorite?: boolean
  sort_by?: 'title' | 'created_at' | 'updated_at' | 'last_used_at'
  sort_order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export interface SearchPasswordsResult {
  entries: DecryptedPasswordEntry[]
  total: number
  has_more: boolean
}

// =====================================
// 数据库服务接口
// =====================================
export interface DatabaseServiceInterface {
  // 初始化
  initialize(): Promise<void>
  close(): void

  // 标签管理
  createTag(input: CreateTagInput): Promise<Tag>
  updateTag(id: number, input: UpdateTagInput): Promise<Tag>
  deleteTag(id: number): Promise<void>
  getAllTags(): Promise<Tag[]>
  getTagById(id: number): Promise<Tag | null>

  // 密码条目管理
  createPasswordEntry(input: CreatePasswordEntryInput): Promise<DecryptedPasswordEntry>
  updatePasswordEntry(id: number, input: UpdatePasswordEntryInput): Promise<DecryptedPasswordEntry>
  deletePasswordEntry(id: number): Promise<void>
  getPasswordEntryById(id: number): Promise<DecryptedPasswordEntry | null>
  searchPasswordEntries(input: SearchPasswordsInput): Promise<SearchPasswordsResult>
  markAsUsed(id: number): Promise<void>

  // 密码历史管理
  getPasswordHistory(entryId: number): Promise<DecryptedPasswordHistory[]>

  // 应用设置管理
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string, description?: string): Promise<void>
  getAllSettings(): Promise<AppSetting[]>

  // 审计日志
  logAction(input: CreateAuditLogInput): Promise<void>
  getAuditLogs(limit?: number): Promise<AuditLog[]>
}
