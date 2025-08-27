import Database from 'better-sqlite3'
import { readFileSync, existsSync, unlinkSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
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
  // Dirty state + auto-save
  private isDirty = false
  private autoSaveTimer: NodeJS.Timeout | null = null
  private autoSaveDelayMs: number = 3000 // debounce interval (ms)
  private disableAutoSave: boolean = false // 禁用自动保存，采用纯内存方案
  private isSaving: boolean = false
  // file-level encryption paths
  private plainDbPath: string | null = null
  private encryptedDbPath: string | null = null
  private tempDecryptedPath: string | null = null

  constructor() {
    // 构造函数中不进行初始化，需要显式调用 initialize
  }

  /**
   * 直接从已派生的 hex 密钥设置加密密钥并尝试解密 .enc
   * 如果解密失败则抛出错误，切勿在无确认的情况下覆盖 .enc 文件。
   */
  async setEncryptionKeyFromHex(hexKey: string): Promise<void> {
    if (!hexKey || typeof hexKey !== 'string') throw new Error('无效的 hex 密钥')
    // 转换 hex 到 Buffer 并直接使用
    const keyBuf = Buffer.from(hexKey, 'hex')
    this.encryptionKey = keyBuf

    // 如果存在加密文件，尝试解密并在内存中打开
    if (this.encryptedDbPath && existsSync(this.encryptedDbPath!)) {
      try {
        const decryptedBuf = await CryptoService.decryptFileToBuffer(
          this.encryptedDbPath!,
          this.encryptionKey!
        )

        if (this.db) {
          try {
            this.db.close()
          } catch {
            // ignore
          }
          this.db = null
        }

        this.db = new Database(decryptedBuf, { verbose: console.log })
        CryptoService.clearBuffer(decryptedBuf)
        await this.initializeSchema()
        this.isInitialized = true
        console.log('已使用 hex 密钥在内存中解密并打开数据库')
        return
      } catch (err) {
        console.error('使用 hex 密钥解密 .enc 失败，拒绝覆盖 .enc:', err)
        // 不要覆盖 .enc，直接清除内存密钥并抛错
        this.clearEncryptionKey()
        throw err
      }
    }

    // 如果没有 .enc，但存在明文 DB，则以明文 DB 为基础进行首次加密（通常不会走到这）
    if (this.plainDbPath && existsSync(this.plainDbPath!)) {
      const plainBuf = readFileSync(this.plainDbPath!)
      if (this.db) {
        try {
          this.db.close()
        } catch {
          // ignore
        }
      }
      this.db = new Database(plainBuf, { verbose: console.log })
      CryptoService.clearBuffer(plainBuf)
      const serialized = this.db.serialize()
      if (this.encryptedDbPath) {
        await CryptoService.encryptBufferToFile(
          serialized,
          this.encryptedDbPath!,
          this.encryptionKey!
        )
      }
      CryptoService.clearBuffer(serialized)
      await this.initializeSchema()
      this.isInitialized = true
      return
    }

    // 如果既没有 .enc 也没有明文 DB，则创建新的内存 DB（仅在用户设置主密码的流程中使用）
    this.db = new Database(':memory:', { verbose: console.log })
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = FULL')
    await this.initializeSchema()
    // 序列化并写回 .enc（若路径可用）
    const serialized = this.db.serialize()
    if (this.encryptedDbPath) {
      await CryptoService.encryptBufferToFile(
        serialized,
        this.encryptedDbPath!,
        this.encryptionKey!
      )
    }
    CryptoService.clearBuffer(serialized)
    this.isInitialized = true
    console.log('已创建新的内存 DB 并使用 hex 密钥写回 .enc（如适用）')
  }
  /**
   * 从外部来源导入加密数据库 Buffer（例如从 Gist 拉取的 base64 解码结果）
   * - 在写入前对现有加密文件做备份（.enc.bak）
   * - 写入后如果应用当前已解锁（this.encryptionKey 存在），会尝试解密并在内存中替换数据库
   * - 在任何失败情况下尝试回滚到备份
   */
  async importEncryptedDatabaseBuffer(
    buf: Buffer
  ): Promise<{ success: boolean; message?: string; decrypted?: boolean }> {
    if (!this.encryptedDbPath) return { success: false, message: 'encryptedDbPath not set', decrypted: false }
    const target = this.encryptedDbPath
    const bak = `${target}.bak`
    try {
      // 备份原文件（如果存在）
      if (existsSync(target)) {
        try {
          renameSync(target, bak)
        } catch (e) {
          console.warn('备份原始 encrypted 文件失败:', e)
          // 继续尝试写入新文件
        }
      }

      // 写入临时文件然后原子替换，减少半写风险
      const tmp = `${target}.tmp.${Date.now()}`
      writeFileSync(tmp, buf, { mode: 0o600 })
      try {
        renameSync(tmp, target)
      } catch (e) {
        // 如果重命名失败，清理临时文件并抛错
        try {
          unlinkSync(tmp)
        } catch {
          /* ignore */
        }
        throw e
      }

      // 如果当前有可用的解密密钥，尝试在内存中解密并替换 DB
      if (this.encryptionKey) {
        try {
          const decryptedBuf = await CryptoService.decryptFileToBuffer(target, this.encryptionKey!)
          // 关闭并替换内存 DB
          if (this.db) {
            try {
              this.db.close()
            } catch {
              // ignore
            }
            this.db = null
          }
          this.db = new Database(decryptedBuf, { verbose: console.log })
          CryptoService.clearBuffer(decryptedBuf)
          await this.initializeSchema()
          this.isInitialized = true

          // 导入成功后删除备份（非必须）
          try {
            if (existsSync(bak)) unlinkSync(bak)
          } catch {
            /* ignore */
          }

          return { success: true, message: 'imported and decrypted', decrypted: true }
        } catch (err) {
          // 解密失败：尝试回滚备份
          try {
            if (existsSync(bak)) {
              // 覆盖当前出错的文件
              try {
                renameSync(bak, target)
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
          const msg = err instanceof Error ? err.message : String(err)
          return { success: false, message: `imported but decrypt failed: ${msg}`, decrypted: false }
        }
      }

      // 没有密钥：只写入磁盘，等待用户下次解锁生效
      return { success: true, message: 'imported to disk; will take effect after unlock', decrypted: false }
    } catch (err) {
      // 写入过程中出现错误，尝试回滚备份
      try {
        if (existsSync(bak)) {
          renameSync(bak, target)
        }
      } catch {
        /* ignore */
      }
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, message: msg, decrypted: false }
    }
  }

  /**
   * 读取当前加密数据库文件为 Buffer（不会尝试解密）
   * 返回 Buffer 或 null（文件不存在或读取失败）
   */
  async readEncryptedDatabaseBuffer(): Promise<Buffer | null> {
    if (!this.encryptedDbPath) return null
    if (!existsSync(this.encryptedDbPath)) return null
    try {
      const raw = readFileSync(this.encryptedDbPath)
      // 返回一个新的 Buffer 副本以防止外部修改内部引用
      return Buffer.from(raw)
    } catch (e) {
      console.warn('readEncryptedDatabaseBuffer 读取失败:', e)
      return null
    }
  }

  /**
   * 初始化数据库连接和表结构
   */
  async initialize(): Promise<void> {
    try {
      // 获取数据库文件路径
      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'password_manager.db')
      const encryptedPath = `${dbPath}.enc`

      this.plainDbPath = dbPath
      this.encryptedDbPath = encryptedPath

      // 如果同时存在明文数据库和加密数据库，优先使用加密文件并删除明文以消除风险
      if (existsSync(this.plainDbPath!) && existsSync(this.encryptedDbPath!)) {
        try {
          unlinkSync(this.plainDbPath)
          console.log('发现 .enc，同时删除磁盘明文 .db 文件以保护数据')
        } catch (e) {
          console.warn('尝试删除明文 .db 失败:', e)
        }
      }

      // 如果存在已加密的数据库文件且密钥尚未设置，则不要在磁盘上打开明文数据库
      if (existsSync(this.encryptedDbPath!) && !this.encryptionKey) {
        console.log('检测到加密数据库，等待用户登录以解密到内存中')
        this.isInitialized = false
        return
      }

      // 如果明文数据库存在且没有密钥（未加密场景），打开磁盘文件
      if (existsSync(this.plainDbPath!) && !this.encryptionKey) {
        const openPath = dbPath
        this.db = new Database(openPath, {
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
        return
      }

      // 如果既没有加密文件也没有明文文件，等待用户设置主密码
      if (!existsSync(this.encryptedDbPath!) && !existsSync(this.plainDbPath!)) {
        console.log('未检测到数据库文件，等待用户设置主密码')
        this.isInitialized = false
        return
      }
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

    // 如果存在加密的 DB 文件（.enc），解密到内存 Buffer 并用该 Buffer 打开内存数据库
    if (this.encryptedDbPath && existsSync(this.encryptedDbPath)) {
      try {
        const decryptedBuf = await CryptoService.decryptFileToBuffer(
          this.encryptedDbPath!,
          this.encryptionKey!
        )

        // 关闭已打开的连接（如果有）
        if (this.db) {
          try {
            this.db.close()
          } catch {
            console.warn('关闭现有 DB 连接时出错')
          }
          this.db = null
        }

        // 使用 Buffer 创建内存数据库
        this.db = new Database(decryptedBuf, { verbose: console.log })

        // 清理明文 Buffer
        CryptoService.clearBuffer(decryptedBuf)

        await this.initializeSchema()
        this.isInitialized = true
        console.log('已在内存中解密并打开数据库')

        return
      } catch (err) {
        console.warn('解密 .enc 文件失败，可能是缺失 meta 或 密钥不匹配:', err)
        // 如果解密失败且没有明文数据库，出于可用性考虑创建新的内存 DB 并覆盖 .enc
        if (this.plainDbPath && !existsSync(this.plainDbPath)) {
          console.log('在没有明文 DB 的情况下覆盖 .enc：创建新的内存数据库并加密写回')
          // 创建内存 DB
          try {
            if (this.db) {
              try {
                this.db.close()
              } catch {
                // ignore
              }
              this.db = null
            }

            this.db = new Database(':memory:', { verbose: console.log })
            this.db.exec('PRAGMA foreign_keys = ON')
            this.db.exec('PRAGMA journal_mode = WAL')
            this.db.exec('PRAGMA synchronous = FULL')
            await this.initializeSchema()

            const serialized = this.db.serialize()
            await CryptoService.encryptBufferToFile(
              serialized,
              this.encryptedDbPath!,
              this.encryptionKey!
            )
            CryptoService.clearBuffer(serialized)

            this.isInitialized = true
            console.log('已创建新的内存 DB 并覆盖 .enc')
            try {
              const payload = { timestamp: Date.now(), path: this.encryptedDbPath }
              BrowserWindow.getAllWindows().forEach((w) => {
                w.webContents.send('autosave:completed', payload)
              })
            } catch (e) {
              console.warn('通知渲染进程 autosave:completed 失败:', e)
            }
            // Ensure the newly created in-memory DB is fully persisted to disk.
            // This avoids a race where the first subsequent operation (e.g. import)
            // may not persist if the initial write hasn't completed.
            try {
              await this.forceFlush()
            } catch (e) {
              console.warn('首次写回 .enc 后强制刷新失败:', e)
            }
            return
          } catch (e) {
            console.error('尝试覆盖 .enc 失败:', e)
            throw e
          }
        }
        // 否则，将错误抛出供上层处理
        throw err
      }
    }

    // 如果存在明文数据库且这是首次设置主密码：将其加载到内存，序列化并加密为 .enc，然后删除明文文件
    if (this.plainDbPath && existsSync(this.plainDbPath)) {
      try {
        console.log('首次设置主密码：将现有明文数据库加载到内存并加密为 .enc')
        const plainBuf = readFileSync(this.plainDbPath)

        // 在内存中打开
        if (this.db) {
          try {
            this.db.close()
          } catch {
            // ignore
          }
        }
        this.db = new Database(plainBuf, { verbose: console.log })

        // 清理原始读取的明文 Buffer
        CryptoService.clearBuffer(plainBuf)

        // 序列化内存 DB 并写入加密文件
        const serialized = this.db.serialize()
        await CryptoService.encryptBufferToFile(
          serialized,
          this.encryptedDbPath!,
          this.encryptionKey!
        )

        // 清理序列化 Buffer
        CryptoService.clearBuffer(serialized)

        // 删除磁盘上的明文文件
        try {
          unlinkSync(this.plainDbPath)
        } catch (e) {
          console.warn('删除明文数据库失败:', e)
        }

        await this.initializeSchema()
        this.isInitialized = true
        console.log('已将明文 DB 加密并在内存中打开')
        return
      } catch (err) {
        console.error('首次加密数据库失败:', err)
        throw err
      }
    }

    // 如果既没有加密文件也没有明文文件：创建新的内存数据库、初始化并加密写回 .enc
    try {
      console.log('未检测到加密或明文数据库文件，创建新的内存数据库并加密写回 .enc')

      // 关闭任何已打开连接
      if (this.db) {
        try {
          this.db.close()
        } catch {
          // ignore
        }
        this.db = null
      }

      // 在内存中创建数据库并初始化 schema
      this.db = new Database(':memory:', { verbose: console.log })
      this.db.exec('PRAGMA foreign_keys = ON')
      this.db.exec('PRAGMA journal_mode = WAL')
      this.db.exec('PRAGMA synchronous = FULL')

      await this.initializeSchema()

      // 序列化并加密为 .enc
      const serialized = this.db.serialize()
      if (this.encryptedDbPath) {
        await CryptoService.encryptBufferToFile(
          serialized,
          this.encryptedDbPath,
          this.encryptionKey!
        )
      }
      CryptoService.clearBuffer(serialized)

      this.isInitialized = true
      console.log('已创建内存数据库并加密写回 .enc')
      // Ensure persisted on disk immediately to avoid first-operation persistence issues
      try {
        await this.forceFlush()
      } catch (e) {
        console.warn('首次创建内存 DB 后强制刷新失败:', e)
      }
      return
    } catch (err) {
      console.error('创建并加密新数据库失败:', err)
      throw err
    }
  }

  /**
   * 锁定并加密临时解密数据库（如果存在）然后清理并清除密钥
   */
  async lock(): Promise<void> {
    // 在锁定前先强制刷新脏数据（如果存在）
    if (this.encryptionKey) {
      try {
        await this.forceSave()
      } catch (e) {
        console.warn('lock: 强制保存失败，继续尝试序列化并写回', e)
      }
    }

    // 如果有打开的内存数据库且有密钥，则序列化内存 DB 并加密回磁盘
    if (this.db && this.encryptedDbPath && this.encryptionKey) {
      try {
        const serialized = this.db.serialize()

        // 先尝试关闭 DB
        try {
          this.db.close()
        } catch {
          // ignore
        }
        this.db = null

        // 将序列化 Buffer 加密写回磁盘
        await CryptoService.encryptBufferToFile(
          serialized,
          this.encryptedDbPath!,
          this.encryptionKey!
        )

        // 清理序列化 Buffer
        CryptoService.clearBuffer(serialized)

        // 成功写回后，清除脏标志
        this.isDirty = false
        console.log('锁定完成：内存数据库已序列化并加密到磁盘')
      } catch {
        console.error('锁定时加密内存数据库失败')
        throw new Error('锁定时加密内存数据库失败')
      }
    } else {
      // 无内存 DB 或无密钥：仅尝试关闭已打开连接
      if (this.db) {
        try {
          this.db.close()
        } catch {
          // ignore
        }
        this.db = null
      }
    }

    // 清除内存中的密钥
    this.clearEncryptionKey()
  }

  /**
   * 清除加密密钥（在用户注销时调用）
   */
  clearEncryptionKey(): void {
    if (this.encryptionKey) {
      CryptoService.clearBuffer(this.encryptionKey)
      this.encryptionKey = null
    }
    // 当清除密钥时：如果有临时解密文件，则需将其加密回原始位置并删除临时文件
    if (this.tempDecryptedPath && this.encryptedDbPath && this.encryptionKey == null) {
      // encryption requires key; in lock flow, higher-level代码应先 setEncryptionKey并调用 lock
      // 这里仅做安全提示，真实加密应在有密钥时进行
      console.warn(
        'clearEncryptionKey: 临时解密文件存在，但没有密钥执行加密。请在锁定流程中使用 encryptTempDbWithKey 方法。'
      )
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    // 如果有内存数据库并且有密钥，则尝试序列化并加密到磁盘（同步触发）
    if (this.db && this.encryptedDbPath && this.encryptionKey) {
      try {
        const serialized = this.db.serialize()

        try {
          this.db.close()
        } catch {
          // ignore
        }
        this.db = null

        // 异步加密写回磁盘（不要阻塞关闭），并在完成后清理敏感 Buffer
        CryptoService.encryptBufferToFile(serialized, this.encryptedDbPath!, this.encryptionKey!)
          .then(() => {
            CryptoService.clearBuffer(serialized)
            this.isDirty = false
            console.log('临时内存数据库已加密并写回磁盘')
            try {
              const payload = { timestamp: Date.now(), path: this.encryptedDbPath }
              BrowserWindow.getAllWindows().forEach((w) => {
                w.webContents.send('autosave:completed', payload)
              })
            } catch (e) {
              console.warn('通知渲染进程 autosave:completed 失败:', e)
            }
          })
          .catch((err) => {
            console.error('加密内存数据库失败:', err)
            try {
              const payload = {
                timestamp: Date.now(),
                error: err instanceof Error ? err.message : String(err)
              }
              BrowserWindow.getAllWindows().forEach((w) => {
                w.webContents.send('autosave:failed', payload)
              })
            } catch (e) {
              console.warn('通知渲染进程 autosave:failed 失败:', e)
            }
          })
      } catch {
        try {
          this.db!.close()
        } catch {
          // ignore
        }
        this.db = null
      }
    } else if (this.db) {
      try {
        this.db.close()
      } catch {
        // ignore
      }
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
   * 检查是否存在加密的数据库文件（用于判断是否已设置主密码且当前未解密）
   */
  hasEncryptedDatabase(): boolean {
    if (!this.encryptedDbPath) return false
    return existsSync(this.encryptedDbPath)
  }

  /**
   * 将认证元数据（salt 和 master password hash）写到磁盘上的 metadata 文件
   */
  writeAuthMetadata(masterPasswordHash: string, salt: string): void {
    if (!this.plainDbPath) return
    const dir = join(this.plainDbPath, '..')
    const metaPath = join(dir, 'password_manager.meta.json')
    try {
      writeFileSync(metaPath, JSON.stringify({ masterPasswordHash, salt }))
    } catch (e) {
      console.warn('写入认证元数据失败:', e)
    }
  }

  /**
   * 读取磁盘上的认证元数据（如果存在）
   */
  readAuthMetadata(): { masterPasswordHash: string; salt: string } | null {
    if (!this.plainDbPath) return null
    const dir = join(this.plainDbPath, '..')
    const metaPath = join(dir, 'password_manager.meta.json')
    if (!existsSync(metaPath)) return null
    try {
      const raw = readFileSync(metaPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && parsed.masterPasswordHash && parsed.salt) {
        return { masterPasswordHash: String(parsed.masterPasswordHash), salt: String(parsed.salt) }
      }
    } catch (e) {
      console.warn('读取认证元数据失败:', e)
    }
    return null
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

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保创建操作持久化
    await this.forceFlush()
    return createdTag
  }

  /**
   * 标记数据库为脏并安排自动保存
   */
  private markDirty(): void {
    this.isDirty = true
    this.scheduleAutoSave()
  }

  private scheduleAutoSave(): void {
    // 如果禁用了自动保存，直接返回
    if (this.disableAutoSave) {
      return
    }

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
    this.autoSaveTimer = setTimeout(() => {
      // 如果当前没有保存操作，则触发一次自动保存
      if (!this.isSaving) {
        // 使用异步但不阻塞调用方
        this.flushIfDirty().catch((err) => console.error('自动保存失败:', err))
      }
    }, this.autoSaveDelayMs)
  }

  /**
   * 如果数据是脏的则序列化并保存（encrypt -> write）
   */
  private async flushIfDirty(): Promise<void> {
    // 如果禁用了自动保存，直接返回
    if (this.disableAutoSave) {
      return
    }

    if (!this.isDirty) return
    if (!this.db) return
    if (!this.encryptedDbPath || !this.encryptionKey) return

    this.isSaving = true
    try {
      const serialized = this.db.serialize()

      // close the db to ensure consistent serialization on disk
      try {
        this.db.close()
      } catch {
        // ignore
      }
      this.db = new Database(serialized, { verbose: console.log })

      await CryptoService.encryptBufferToFile(
        serialized,
        this.encryptedDbPath!,
        this.encryptionKey!
      )
      CryptoService.clearBuffer(serialized)
      this.isDirty = false
      console.log('自动保存完成：已将内存 DB 序列化并加密回磁盘')

      // Notify renderer windows about autosave completion
      try {
        const payload = { timestamp: Date.now(), path: this.encryptedDbPath }
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send('autosave:completed', payload)
        })
      } catch (e) {
        console.warn('通知渲染进程 autosave:completed 失败:', e)
      }
    } finally {
      this.isSaving = false
    }
  }

  /**
   * 强制保存到磁盘，无视 disableAutoSave 设置
   */
  private async forceFlush(): Promise<void> {
    if (!this.db) return

    this.isSaving = true
    try {
      // 如果存在加密路径和密钥，序列化并加密写回（内存数据库场景）
      if (this.encryptedDbPath && this.encryptionKey) {
        const serialized = this.db.serialize()

        // close the db to ensure consistent serialization on disk
        try {
          this.db.close()
        } catch {
          // ignore
        }
        this.db = new Database(serialized, { verbose: console.log })

        await CryptoService.encryptBufferToFile(
          serialized,
          this.encryptedDbPath!,
          this.encryptionKey!
        )
        CryptoService.clearBuffer(serialized)
        this.isDirty = false
        console.log('强制保存完成：已将内存 DB 序列化并加密回磁盘')

        // Notify renderer windows about save completion
        try {
          const payload = { timestamp: Date.now(), path: this.encryptedDbPath }
          BrowserWindow.getAllWindows().forEach((w) => {
            w.webContents.send('autosave:completed', payload)
          })
        } catch (e) {
          console.warn('通知渲染进程 autosave:completed 失败:', e)
        }
        return
      }

      // 否则如果是基于文件的 DB（plainDbPath），尝试执行 WAL checkpoint 确保写回主数据库文件
      if (this.plainDbPath) {
        try {
          // 执行 WAL checkpoint（TRUNCATE）以把 WAL 内容写回主 DB
          try {
            this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
          } catch {
            // 某些环境下 exec 可能抛错，退回到更温和的 checkpoint
            try {
              this.db.exec('PRAGMA wal_checkpoint(FULL)')
            } catch (err) {
              console.warn('WAL checkpoint 失败:', err)
            }
          }

          this.isDirty = false
          console.log('强制保存完成：已将 WAL checkpoint 到磁盘')

          try {
            const payload = { timestamp: Date.now(), path: this.plainDbPath }
            BrowserWindow.getAllWindows().forEach((w) => {
              w.webContents.send('autosave:completed', payload)
            })
          } catch (e) {
            console.warn('通知渲染进程 autosave:completed 失败:', e)
          }
        } catch (e) {
          console.error('plain DB 强制保存失败:', e)
        }
      }
    } finally {
      this.isSaving = false
    }
  }

  /**
   * 强制保存（同步语义：等待完成）
   */
  private async forceSave(): Promise<void> {
    // 取消计划的自动保存
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    await this.flushIfDirty()
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
    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保更新操作持久化
    await this.forceFlush()
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

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保删除操作持久化
    await this.forceFlush()
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

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保创建操作持久化
    await this.forceFlush()
    return createdEntry
  }

  /**
   * 批量创建密码条目（在单个事务中插入并在结束后一次性持久化）
   */
  async createPasswordEntries(
    inputs: CreatePasswordEntryInput[]
  ): Promise<DecryptedPasswordEntry[]> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const createdIds: number[] = []

    const transaction = this.db!.transaction(() => {
      const insertStmt = this.db!.prepare(`
        INSERT INTO password_entries (
          title, username, password, url, description,
          encryption_iv, encryption_tag, is_favorite, password_strength
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const tagStmt = this.db!.prepare(`
        INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)
      `)

      const logStmt = (entryId: number, input: CreatePasswordEntryInput): void => {
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
      }

      for (const input of inputs) {
        const encryptedUsername = input.username || null
        const encryptedPassword = this.encryptField(input.password)
        const encryptedDescription = input.description || null

        const passwordStrength = CryptoService.evaluatePasswordStrength(input.password)

        const params = [
          input.title,
          encryptedUsername || null,
          encryptedPassword.encrypted,
          input.url || null,
          encryptedDescription || null,
          encryptedPassword.iv,
          encryptedPassword.tag,
          input.is_favorite ? 1 : 0,
          passwordStrength
        ]

        const result = insertStmt.run(...params)
        const entryId = Number(result.lastInsertRowid)
        createdIds.push(entryId)

        // 关联标签（输入.tags 是名称数组，这里需查找 tag id）
        if (input.tag_ids && input.tag_ids.length > 0) {
          for (const tagId of input.tag_ids) {
            tagStmt.run(entryId, tagId)
          }
        }

        // 记录审计日志（通过 helper）
        logStmt(entryId, input)
      }
    })

    transaction()

    // 批量完成后，统一标记脏并一次性 flush
    this.markDirty()
    await this.forceFlush()

    // 返回已创建条目的完整信息
    const createdEntries: DecryptedPasswordEntry[] = []
    for (const id of createdIds) {
      const entry = await this.getPasswordEntryById(id)
      if (entry) createdEntries.push(entry)
    }

    return createdEntries
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

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保更新操作持久化
    await this.forceFlush()
    return updatedEntry
  }

  async deletePasswordEntry(id: number): Promise<void> {
    this.ensureInitialized()
    this.ensureEncryptionKey()

    const transaction = this.db!.transaction(() => {
      // 删除密码条目（由于外键约束CASCADE，相关记录会自动删除）
      const stmt = this.db!.prepare('DELETE FROM password_entries WHERE id = ?')
      const result = stmt.run(id)

      if (result.changes === 0) {
        throw new Error(`未找到ID为${id}的密码条目`)
      }

      // 记录审计日志
      const auditStmt = this.db!.prepare(`
        INSERT INTO audit_logs (action, table_name, record_id, details)
        VALUES (?, ?, ?, ?)
      `)
      auditStmt.run(
        'DELETE',
        'password_entries',
        id,
        JSON.stringify({ deleted_at: new Date().toISOString() })
      )
    })

    transaction()

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保删除操作持久化
    await this.forceFlush()
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

    // Defensive: ensure input object exists and provide default pagination/sort
    input = input || ({} as SearchPasswordsInput)

    const whereConditions: string[] = []
    const params: (string | number | boolean)[] = []

    // 构建查询条件
    if (input.query && typeof input.query === 'string' && input.query.length > 0) {
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
    const limit = typeof input.limit === 'number' ? input.limit : 50
    const offset = typeof input.offset === 'number' ? input.offset : 0
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
    this.markDirty()
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

    // 标记数据为脏
    this.markDirty()

    // 立即保存到磁盘，确保设置更改持久化
    await this.forceFlush()
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
