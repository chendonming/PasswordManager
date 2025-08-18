import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { CryptoService } from './CryptoService'
import type {
  DatabaseServiceInterface,
  Tag,
  CreateTagInput,
  UpdateTagInput,
  PasswordEntry,
  CreatePasswordEntryInput,
  UpdatePasswordEntryInput,
  DecryptedPasswordEntry,
  SearchPasswordsInput,
  SearchPasswordsResult,
  DecryptedPasswordHistory,
  AppSetting,
  CreateAuditLogInput,
  AuditLog
} from '../types/database'

export class DatabaseService implements DatabaseServiceInterface {
  private db: Database.Database | null = null
  private encryptionKey: Buffer | null = null
  private isInitialized = false

  constructor() {
    // 构造函数中不进行初始化，需要显式调用 initialize
  }

  /**
   * 初始化数据库连接和表结构
   */
  async initialize(): Promise<void> {
    try {
      // 获取数据库文件路径
      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'password_manager.db')

      // 创建数据库连接
      this.db = new Database(dbPath, {
        verbose: console.log // 开发环境下启用SQL日志
      })

      // 启用外键约束
      this.db.exec('PRAGMA foreign_keys = ON')

      // 启用WAL模式以提高并发性能
      this.db.exec('PRAGMA journal_mode = WAL')

      // 设置同步模式
      this.db.exec('PRAGMA synchronous = FULL')

      // 执行数据库架构初始化
      await this.initializeSchema()

      this.isInitialized = true

      console.log('数据库初始化成功:', dbPath)
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw new Error(`数据库初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 设置加密密钥（在用户登录后调用）
   */
  async setEncryptionKey(masterPassword: string, salt: string): Promise<void> {
    this.encryptionKey = await CryptoService.deriveKey(masterPassword, salt)
  }

  /**
   * 清除加密密钥（在用户注销时调用）
   */
  clearEncryptionKey(): void {
    if (this.encryptionKey) {
      CryptoService.clearBuffer(this.encryptionKey)
      this.encryptionKey = null
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.clearEncryptionKey()
    this.isInitialized = false
  }

  /**
   * 确保数据库已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('数据库尚未初始化')
    }
  }

  /**
   * 确保加密密钥已设置
   */
  private ensureEncryptionKey(): void {
    if (!this.encryptionKey) {
      throw new Error('加密密钥尚未设置，请先登录')
    }
  }

  /**
   * 初始化数据库架构
   */
  private async initializeSchema(): Promise<void> {
    if (!this.db) throw new Error('数据库连接不存在')

    try {
      // 读取schema.sql文件
      // 在开发环境中，需要从src目录读取，在生产环境中从out目录读取
      let schemaPath = join(__dirname, '../database/schema.sql')

      // 检查文件是否存在，如果不存在则尝试从src目录读取
      try {
        readFileSync(schemaPath, 'utf8')
      } catch {
        // 回退到src目录路径（用于开发环境或构建配置问题）
        const appPath = app.getAppPath()
        schemaPath = join(appPath, 'src/main/database/schema.sql')
      }

      const schemaSQL = readFileSync(schemaPath, 'utf8')

      // 执行架构创建
      this.db.exec(schemaSQL)

      console.log('数据库架构初始化完成')
    } catch (error) {
      console.error('数据库架构初始化失败:', error)
      throw error
    }
  }

  /**
   * 加密敏感字段
   */
  private encryptField(value: string): { encrypted: string; iv: string; tag: string } {
    this.ensureEncryptionKey()
    return CryptoService.encrypt(value, this.encryptionKey!)
  }

  /**
   * 解密敏感字段
   */
  private decryptField(encrypted: string, iv: string, tag: string): string {
    this.ensureEncryptionKey()
    return CryptoService.decrypt({ encrypted, iv, tag }, this.encryptionKey!)
  }

  // =====================================
  // 标签管理
  // =====================================

  async createTag(input: CreateTagInput): Promise<Tag> {
    this.ensureInitialized()

    const stmt = this.db!.prepare(`
      INSERT INTO tags (name, color, description)
      VALUES (?, ?, ?)
    `)

    const result = stmt.run(input.name, input.color || '#18a058', input.description || null)

    await this.logAction({
      action: 'CREATE',
      table_name: 'tags',
      record_id: Number(result.lastInsertRowid),
      details: JSON.stringify(input)
    })

    const createdTag = await this.getTagById(Number(result.lastInsertRowid))
    if (!createdTag) {
      throw new Error('创建标签后无法获取标签信息')
    }
    return createdTag
  }

  async updateTag(id: number, input: UpdateTagInput): Promise<Tag> {
    this.ensureInitialized()

    const updateFields: string[] = []
    const values: (string | number | null)[] = []

    if (input.name !== undefined) {
      updateFields.push('name = ?')
      values.push(input.name)
    }
    if (input.color !== undefined) {
      updateFields.push('color = ?')
      values.push(input.color)
    }
    if (input.description !== undefined) {
      updateFields.push('description = ?')
      values.push(input.description)
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = this.db!.prepare(`
      UPDATE tags SET ${updateFields.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)

    await this.logAction({
      action: 'UPDATE',
      table_name: 'tags',
      record_id: id,
      details: JSON.stringify(input)
    })

    const updatedTag = await this.getTagById(id)
    if (!updatedTag) {
      throw new Error('更新标签后无法获取标签信息')
    }
    return updatedTag
  }

  async deleteTag(id: number): Promise<void> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('DELETE FROM tags WHERE id = ?')
    stmt.run(id)

    await this.logAction({
      action: 'DELETE',
      table_name: 'tags',
      record_id: id
    })
  }

  async getAllTags(): Promise<Tag[]> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('SELECT * FROM tags ORDER BY name')
    return stmt.all() as Tag[]
  }

  async getTagById(id: number): Promise<Tag | null> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('SELECT * FROM tags WHERE id = ?')
    const tag = stmt.get(id) as Tag | undefined

    return tag || null
  }

  // =====================================
  // 密码条目管理
  // =====================================

  async createPasswordEntry(input: CreatePasswordEntryInput): Promise<DecryptedPasswordEntry> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const transaction = this.db!.transaction(() => {
      // 加密敏感字段
      // For now store username and description as plaintext to avoid storing
      // separate IV/tag for each field. Only password is encrypted with AES-GCM.
      const encryptedUsername = input.username || null
      const encryptedPassword = this.encryptField(input.password)
      const encryptedDescription = input.description || null

      // 计算密码强度
      const passwordStrength = CryptoService.evaluatePasswordStrength(input.password)

      // 插入密码条目
      const stmt = this.db!.prepare(`
        INSERT INTO password_entries (
          title, username, password, url, description,
          encryption_iv, encryption_tag, is_favorite, password_strength
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const params = [
        input.title,
        encryptedUsername || null,
        encryptedPassword.encrypted,
        input.url || null,
        encryptedDescription || null,
        encryptedPassword.iv, // 使用密码的IV作为主IV
        encryptedPassword.tag, // 使用密码的tag作为主tag
        input.is_favorite ? 1 : 0,
        passwordStrength
      ]

      const result = stmt.run(...params)

      const entryId = Number(result.lastInsertRowid)

      // 关联标签
      if (input.tag_ids && input.tag_ids.length > 0) {
        const tagStmt = this.db!.prepare(`
          INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)
        `)

        for (const tagId of input.tag_ids) {
          tagStmt.run(entryId, tagId)
        }
      }

      // 记录审计日志
      this.logAction({
        action: 'CREATE',
        table_name: 'password_entries',
        record_id: entryId,
        details: JSON.stringify({
          title: input.title,
          url: input.url,
          tag_count: input.tag_ids?.length || 0
        })
      })

      return entryId
    })

    const entryId = transaction()
    const createdEntry = await this.getPasswordEntryById(entryId)
    if (!createdEntry) {
      throw new Error('创建密码条目后无法获取条目信息')
    }
    return createdEntry
  }

  async updatePasswordEntry(
    id: number,
    input: UpdatePasswordEntryInput
  ): Promise<DecryptedPasswordEntry> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const transaction = this.db!.transaction(() => {
      const updateFields: string[] = []
      const values: (string | number | boolean | null)[] = []

      // 保存旧密码到历史记录（如果密码被更改）
      if (input.password !== undefined) {
        const oldEntry = this.getPasswordEntryRaw(id)
        if (oldEntry) {
          const historyStmt = this.db!.prepare(`
            INSERT INTO password_history (entry_id, old_password, encryption_iv, encryption_tag)
            VALUES (?, ?, ?, ?)
          `)
          historyStmt.run(id, oldEntry.password, oldEntry.encryption_iv, oldEntry.encryption_tag)
        }

        // 加密新密码
        const encryptedPassword = this.encryptField(input.password)
        updateFields.push('password = ?', 'encryption_iv = ?', 'encryption_tag = ?')
        values.push(encryptedPassword.encrypted, encryptedPassword.iv, encryptedPassword.tag)

        // 更新密码强度
        const passwordStrength = CryptoService.evaluatePasswordStrength(input.password)
        updateFields.push('password_strength = ?')
        values.push(passwordStrength)
      }

      if (input.title !== undefined) {
        updateFields.push('title = ?')
        values.push(input.title)
      }

      if (input.username !== undefined) {
        const encryptedUsername = input.username ? this.encryptField(input.username) : null
        updateFields.push('username = ?')
        values.push(encryptedUsername?.encrypted || null)
      }

      if (input.url !== undefined) {
        updateFields.push('url = ?')
        values.push(input.url)
      }

      if (input.description !== undefined) {
        const encryptedDescription = input.description ? this.encryptField(input.description) : null
        updateFields.push('description = ?')
        values.push(encryptedDescription?.encrypted || null)
      }

      if (input.is_favorite !== undefined) {
        updateFields.push('is_favorite = ?')
        values.push(input.is_favorite ? 1 : 0)
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      // 更新密码条目
      if (updateFields.length > 1) {
        const stmt = this.db!.prepare(`
          UPDATE password_entries SET ${updateFields.join(', ')}
          WHERE id = ?
        `)
        stmt.run(...values)
      }

      // 更新标签关联
      if (input.tag_ids !== undefined) {
        // 删除现有关联
        const deleteTagsStmt = this.db!.prepare('DELETE FROM entry_tags WHERE entry_id = ?')
        deleteTagsStmt.run(id)

        // 添加新关联
        if (input.tag_ids.length > 0) {
          const insertTagStmt = this.db!.prepare(`
            INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)
          `)
          for (const tagId of input.tag_ids) {
            insertTagStmt.run(id, tagId)
          }
        }
      }

      // 记录审计日志
      this.logAction({
        action: 'UPDATE',
        table_name: 'password_entries',
        record_id: id,
        details: JSON.stringify(input)
      })
    })

    transaction()
    const updatedEntry = await this.getPasswordEntryById(id)
    if (!updatedEntry) {
      throw new Error('更新密码条目后无法获取条目信息')
    }
    return updatedEntry
  }

  async deletePasswordEntry(id: number): Promise<void> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('DELETE FROM password_entries WHERE id = ?')
    stmt.run(id)

    await this.logAction({
      action: 'DELETE',
      table_name: 'password_entries',
      record_id: id
    })
  }

  async getPasswordEntryById(id: number): Promise<DecryptedPasswordEntry | null> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const stmt = this.db!.prepare(`
      SELECT pe.*, GROUP_CONCAT(t.id) as tag_ids, GROUP_CONCAT(t.name) as tag_names,
             GROUP_CONCAT(t.color) as tag_colors, GROUP_CONCAT(t.description) as tag_descriptions
      FROM password_entries pe
      LEFT JOIN entry_tags et ON pe.id = et.entry_id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE pe.id = ?
      GROUP BY pe.id
    `)

    const row = stmt.get(id) as PasswordEntry | undefined

    if (!row) return null

    return this.decryptPasswordEntry(row)
  }

  private getPasswordEntryRaw(id: number): PasswordEntry | null {
    const stmt = this.db!.prepare('SELECT * FROM password_entries WHERE id = ?')
    const entry = stmt.get(id) as PasswordEntry | undefined
    return entry || null
  }

  async searchPasswordEntries(input: SearchPasswordsInput): Promise<SearchPasswordsResult> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const whereConditions: string[] = []
    const params: (string | number | boolean)[] = []

    // 构建查询条件
    if (input.query) {
      whereConditions.push('(pe.title LIKE ? OR pe.url LIKE ?)')
      params.push(`%${input.query}%`, `%${input.query}%`)
    }

    if (input.tag_ids && input.tag_ids.length > 0) {
      const placeholders = input.tag_ids.map(() => '?').join(',')
      whereConditions.push(`pe.id IN (
        SELECT DISTINCT entry_id FROM entry_tags WHERE tag_id IN (${placeholders})
      )`)
      params.push(...input.tag_ids)
    }

    if (input.is_favorite !== undefined) {
      whereConditions.push('pe.is_favorite = ?')
      params.push(input.is_favorite ? 1 : 0)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 构建排序
    const sortBy = input.sort_by || 'updated_at'
    const sortOrder = input.sort_order || 'DESC'
    const orderClause = `ORDER BY pe.${sortBy} ${sortOrder}`

    // 构建分页
    const limit = input.limit || 50
    const offset = input.offset || 0
    const limitClause = `LIMIT ${limit} OFFSET ${offset}`

    // 查询总数
    const countQuery = `
      SELECT COUNT(DISTINCT pe.id) as total
      FROM password_entries pe
      LEFT JOIN entry_tags et ON pe.id = et.entry_id
      ${whereClause}
    `
    const countResult = this.db!.prepare(countQuery).get(...params) as { total: number }

    // 查询数据
    const dataQuery = `
      SELECT pe.*, GROUP_CONCAT(DISTINCT t.id) as tag_ids, GROUP_CONCAT(DISTINCT t.name) as tag_names,
             GROUP_CONCAT(DISTINCT t.color) as tag_colors, GROUP_CONCAT(DISTINCT t.description) as tag_descriptions
      FROM password_entries pe
      LEFT JOIN entry_tags et ON pe.id = et.entry_id
      LEFT JOIN tags t ON et.tag_id = t.id
      ${whereClause}
      GROUP BY pe.id
      ${orderClause}
      ${limitClause}
    `

    const rows = this.db!.prepare(dataQuery).all(...params) as PasswordEntry[]

    const entries = rows.map((row) => this.decryptPasswordEntry(row))

    return {
      entries,
      total: countResult.total,
      has_more: offset + limit < countResult.total
    }
  }

  async markAsUsed(id: number): Promise<void> {
    this.ensureInitialized()

    const stmt = this.db!.prepare(`
      UPDATE password_entries 
      SET last_used_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    stmt.run(id)
  }

  /**
   * 解密密码条目
   */
  private decryptPasswordEntry(
    row: PasswordEntry & {
      tag_ids?: string
      tag_names?: string
      tag_colors?: string
      tag_descriptions?: string
    }
  ): DecryptedPasswordEntry {
    const tags: Tag[] = []

    if (row.tag_ids) {
      const tagIds = row.tag_ids.split(',')
      const tagNames = row.tag_names?.split(',') || []
      const tagColors = row.tag_colors?.split(',') || []
      const tagDescriptions = row.tag_descriptions ? row.tag_descriptions.split(',') : []

      for (let i = 0; i < tagIds.length; i++) {
        tags.push({
          id: parseInt(tagIds[i]),
          name: tagNames[i],
          color: tagColors[i],
          description: tagDescriptions[i] || '',
          created_at: '',
          updated_at: ''
        })
      }
    }

    return {
      id: row.id,
      title: row.title,
      // username and description are stored as plaintext in current schema
      username: row.username || undefined,
      // password is encrypted using encryption_iv/encryption_tag
      password: this.decryptField(row.password, row.encryption_iv, row.encryption_tag),
      url: row.url,
      description: row.description || undefined,
      is_favorite: Boolean(row.is_favorite),
      last_used_at: row.last_used_at,
      password_strength: row.password_strength,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags
    }
  }

  // =====================================
  // 密码历史管理
  // =====================================

  async getPasswordHistory(entryId: number): Promise<DecryptedPasswordHistory[]> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const stmt = this.db!.prepare(`
      SELECT * FROM password_history 
      WHERE entry_id = ? 
      ORDER BY changed_at DESC
    `)

    const rows = stmt.all(entryId) as Array<{
      id: number
      entry_id: number
      old_password: string
      encryption_iv: string
      encryption_tag: string
      changed_at: string
    }>

    return rows.map((row) => ({
      id: row.id,
      entry_id: row.entry_id,
      old_password: this.decryptField(row.old_password, row.encryption_iv, row.encryption_tag),
      changed_at: row.changed_at
    }))
  }

  // =====================================
  // 应用设置管理
  // =====================================

  async getSetting(key: string): Promise<string | null> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('SELECT value FROM app_settings WHERE key = ?')
    const result = stmt.get(key) as { value: string } | undefined

    return result?.value || null
  }

  async setSetting(key: string, value: string, description?: string): Promise<void> {
    this.ensureInitialized()

    const stmt = this.db!.prepare(`
      INSERT INTO app_settings (key, value, description)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `)

    stmt.run(key, value, description || null)
  }

  async getAllSettings(): Promise<AppSetting[]> {
    this.ensureInitialized()

    const stmt = this.db!.prepare('SELECT * FROM app_settings ORDER BY key')
    return stmt.all() as AppSetting[]
  }

  // =====================================
  // 审计日志
  // =====================================

  async logAction(input: CreateAuditLogInput): Promise<void> {
    if (!this.isInitialized || !this.db) return // 静默失败，不影响主要功能

    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (action, table_name, record_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        input.action,
        input.table_name,
        input.record_id || null,
        input.details || null,
        input.ip_address || null,
        input.user_agent || null
      )
    } catch (error) {
      console.error('记录审计日志失败:', error)
    }
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    this.ensureInitialized()

    const stmt = this.db!.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `)

    return stmt.all(limit) as AuditLog[]
  }

  // =====================================
  // 实用方法
  // =====================================

  /**
   * 获取数据库统计信息
   */
  async getStatistics(): Promise<{
    totalEntries: number
    totalTags: number
    favoriteEntries: number
    recentlyUsed: number
  }> {
    this.ensureInitialized()

    const stats = {
      totalEntries: 0,
      totalTags: 0,
      favoriteEntries: 0,
      recentlyUsed: 0
    }

    // 总条目数
    const totalEntriesResult = this.db!.prepare(
      'SELECT COUNT(*) as count FROM password_entries'
    ).get() as { count: number }
    stats.totalEntries = totalEntriesResult.count

    // 总标签数
    const totalTagsResult = this.db!.prepare('SELECT COUNT(*) as count FROM tags').get() as {
      count: number
    }
    stats.totalTags = totalTagsResult.count

    // 收藏条目数
    const favoriteEntriesResult = this.db!.prepare(
      'SELECT COUNT(*) as count FROM password_entries WHERE is_favorite = 1'
    ).get() as { count: number }
    stats.favoriteEntries = favoriteEntriesResult.count

    // 最近7天使用的条目数
    const recentlyUsedResult = this.db!.prepare(
      `
      SELECT COUNT(*) as count 
      FROM password_entries 
      WHERE last_used_at > datetime('now', '-7 days')
    `
    ).get() as { count: number }
    stats.recentlyUsed = recentlyUsedResult.count

    return stats
  }

  /**
   * 执行数据库备份
   */
  async backup(backupPath: string): Promise<void> {
    this.ensureInitialized()

    if (!this.db) throw new Error('数据库连接不存在')

    await this.db.backup(backupPath)
    console.log('数据库备份完成:', backupPath)
  }
}
