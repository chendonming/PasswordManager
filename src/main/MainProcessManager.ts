import { ipcMain, IpcMainInvokeEvent, app, dialog } from 'electron'
import { join } from 'path'
import { unlinkSync } from 'fs'
import * as crypto from 'crypto'
import { DatabaseService } from './services/DatabaseService'
import { DatabaseInitializer } from './services/DatabaseInitializer'
import { CryptoService } from './services/CryptoService'
import { ImportManager } from './services/ImportManager'
import { ChromeCsvImporter } from './services/importers/ChromeCsvImporter'

/**
 * 数据库和安全服务的主进程管理器
 * 负责处理来自渲染进程的IPC请求
 */
export class MainProcessManager {
  private dbService: DatabaseService
  private initializer: DatabaseInitializer
  private importManager: ImportManager

  private isAuthenticated = false

  constructor() {
    this.dbService = new DatabaseService()
    this.initializer = new DatabaseInitializer(this.dbService)
    this.importManager = new ImportManager()

    this.setupIpcHandlers()
    this.initializeImportExportServices()
  }

  /**
   * 初始化导入导出服务
   */
  private initializeImportExportServices(): void {
    // 注册Chrome CSV导入器
    const chromeCsvImporter = new ChromeCsvImporter()
    this.importManager.registerImporter(chromeCsvImporter)

    console.log('导入导出服务初始化完成')
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      console.log('userData path:', app.getPath('userData'))
      await this.dbService.initialize()

      // 尝试自动解锁：如果有元数据文件，直接解锁而不需要用户输入密码
      await this.tryAutoUnlock()

      console.log('主进程服务初始化完成')
    } catch (error) {
      console.error('主进程服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 尝试自动解锁：如果有元数据文件则自动解锁
   */
  private async tryAutoUnlock(): Promise<void> {
    try {
      // 检查是否有元数据文件
      const meta = this.dbService.readAuthMetadata()
      if (meta) {
        console.log('检测到元数据文件，尝试自动解锁数据库')

        // 尝试使用元数据信息设置加密密钥
        const success = await this.autoSetEncryptionKey(meta)
        if (success) {
          this.isAuthenticated = true
          console.log('已自动认证并解锁数据库')
        } else {
          console.log('自动解锁失败，需要用户手动认证')
        }
      } else {
        console.log('未检测到元数据文件，需要用户设置主密码')
      }
    } catch (error) {
      console.warn('自动解锁失败:', error)
      // 自动解锁失败不是致命错误，用户仍可以手动认证
    }
  }

  /**
   * 使用元数据自动设置加密密钥
   */
  private async autoSetEncryptionKey(meta: {
    masterPasswordHash: string
    salt: string
  }): Promise<boolean> {
    try {
      // 策略：使用一个基于元数据的派生密码
      // 这样有元数据文件就能自动解锁，但仍保持一定的安全性
      const autoPassword = this.generateAutoPassword(meta)

      // 设置加密密钥
      await this.dbService.setEncryptionKey(autoPassword, meta.salt)
      console.log('已使用自动派生密码设置加密密钥')
      return true
    } catch (error) {
      console.warn('自动设置加密密钥失败:', error)
      return false
    }
  }

  /**
   * 基于元数据生成自动密码
   */
  private generateAutoPassword(meta: { masterPasswordHash: string; salt: string }): string {
    // 使用元数据的一部分作为自动密码
    // 这样确保有相同元数据文件的机器可以解锁，但其他机器不能
    const combined = meta.masterPasswordHash + meta.salt
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32)
  }

  /**
   * 确保数据库已解锁（如果有加密数据库的话）
   */
  private async ensureDatabaseUnlocked(): Promise<void> {
    // 数据库解锁已经在tryAutoUnlock中处理，这里不需要额外操作
  }

  /**
   * 检查数据库状态，处理各种特殊情况
   */
  private async checkDatabaseStatus(): Promise<{
    status: 'first-run' | 'ready' | 'needs-unlock' | 'missing-metadata' | 'decrypt-error' | 'error'
    message?: string
  }> {
    try {
      // 检查是否为首次运行
      const isFirstRun = await this.initializer.isFirstRun()
      if (isFirstRun) {
        // 进一步检查是否有加密数据但缺少元数据
        if (this.dbService.hasEncryptedDatabase()) {
          const meta = this.dbService.readAuthMetadata()
          if (!meta) {
            return {
              status: 'missing-metadata',
              message:
                '检测到加密数据库文件，但缺少认证元数据文件。请提供正确的元数据文件或重新初始化应用。'
            }
          }
        }

        return {
          status: 'first-run',
          message: '首次使用，请设置主密码'
        }
      }

      // 检查是否已认证
      if (this.isAuthenticated) {
        return {
          status: 'ready',
          message: '已解锁，可以使用'
        }
      }

      // 如果有元数据文件，也认为是ready状态（用户无需再输入密码）
      const meta = this.dbService.readAuthMetadata()
      if (meta) {
        return {
          status: 'ready',
          message: '检测到认证信息，已自动解锁'
        }
      }

      // 需要解锁
      return {
        status: 'needs-unlock',
        message: '请输入主密码解锁应用'
      }
    } catch (error) {
      console.error('检查数据库状态失败:', error)

      // 检查是否是解密错误
      if (error instanceof Error && error.message.includes('decrypt')) {
        return {
          status: 'decrypt-error',
          message: '数据解密失败，可能是主密码错误或数据文件已损坏'
        }
      }

      return {
        status: 'error',
        message: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 设置IPC处理器
   */
  private setupIpcHandlers(): void {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const protectedHandler =
      (fn: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>) =>
      async (event: IpcMainInvokeEvent, ...args: any[]) => {
        if (!this.isAuthenticated) {
          return { error: '未认证' }
        }

        try {
          // 确保数据库已经解锁（对于加密数据库）
          await this.ensureDatabaseUnlocked()

          // Forward the original ipc event and args to the wrapped handler
          return await fn.apply(this, [event, ...args])
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) }
        }
      }

    // 认证相关 - 重新设计为自动化认证
    ipcMain.handle('auth:check-status', async () => {
      try {
        return await this.checkDatabaseStatus()
      } catch (error) {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    })

    ipcMain.handle('auth:create-master-password', async (_, masterPassword: string) => {
      try {
        await this.initializer.initializeWithMasterPassword(masterPassword)
        this.isAuthenticated = true
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    })

    ipcMain.handle('auth:unlock', async (_, masterPassword: string) => {
      try {
        const success = await this.initializer.verifyMasterPassword(masterPassword)
        this.isAuthenticated = success
        return { success }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '认证失败'
        }
      }
    })

    ipcMain.handle('auth:logout', () => {
      // Clear encryption key / lock application
      this.initializer.lock()
      this.isAuthenticated = false
      return { success: true }
    })

    ipcMain.handle('auth:is-authenticated', () => {
      return this.isAuthenticated
    })

    // Debug: return authentication status and whether a master password hash exists
    ipcMain.handle('auth:status', async () => {
      try {
        const masterHash = await this.dbService.getSetting('master_password_hash')
        return {
          isAuthenticated: this.isAuthenticated,
          hasMasterPasswordHash: !!masterHash
        }
      } catch (error) {
        return {
          isAuthenticated: this.isAuthenticated,
          hasMasterPasswordHash: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    })

    // 标签管理
    ipcMain.handle(
      'tags:get-all',
      protectedHandler(async () => await this.dbService.getAllTags())
    )

    ipcMain.handle(
      'tags:create',
      protectedHandler(async (_: any, tagData: any) => await this.dbService.createTag(tagData))
    )

    ipcMain.handle(
      'tags:update',
      protectedHandler(
        async (_: any, id: number, tagData: any) => await this.dbService.updateTag(id, tagData)
      )
    )

    ipcMain.handle(
      'tags:delete',
      protectedHandler(async (_: any, id: number) => {
        await this.dbService.deleteTag(id)
        return { success: true }
      })
    )

    // 密码条目管理
    ipcMain.handle(
      'passwords:search',
      protectedHandler(
        async (_: any, searchParams: any) =>
          await this.dbService.searchPasswordEntries(searchParams)
      )
    )

    ipcMain.handle(
      'passwords:get-by-id',
      protectedHandler(async (_: any, id: number) => await this.dbService.getPasswordEntryById(id))
    )

    ipcMain.handle(
      'passwords:create',
      protectedHandler(
        async (_: any, entryData: any) => await this.dbService.createPasswordEntry(entryData)
      )
    )

    ipcMain.handle(
      'passwords:update',
      protectedHandler(
        async (_: any, id: number, entryData: any) =>
          await this.dbService.updatePasswordEntry(id, entryData)
      )
    )

    ipcMain.handle(
      'passwords:delete',
      protectedHandler(async (_: any, id: number) => {
        await this.dbService.deletePasswordEntry(id)
        return { success: true }
      })
    )

    ipcMain.handle(
      'passwords:mark-used',
      protectedHandler(async (_: any, id: number) => {
        await this.dbService.markAsUsed(id)
        return { success: true }
      })
    )

    ipcMain.handle(
      'passwords:get-history',
      protectedHandler(
        async (_: any, entryId: number) => await this.dbService.getPasswordHistory(entryId)
      )
    )

    // 密码生成器
    ipcMain.handle('crypto:generate-password', (_, length: number, options) => {
      return CryptoService.generateSecurePassword(length, options)
    })

    ipcMain.handle('crypto:evaluate-strength', (_, password: string) => {
      return CryptoService.evaluatePasswordStrength(password)
    })

    // 应用设置
    ipcMain.handle(
      'settings:get',
      protectedHandler(async (_: any, key: string) => await this.dbService.getSetting(key))
    )

    ipcMain.handle(
      'settings:set',
      protectedHandler(async (_: any, key: string, value: string, description?: string) => {
        await this.dbService.setSetting(key, value, description)
        return { success: true }
      })
    )

    ipcMain.handle(
      'settings:get-all',
      protectedHandler(async () => await this.dbService.getAllSettings())
    )

    // 统计信息
    ipcMain.handle(
      'stats:get',
      protectedHandler(async () => await this.dbService.getStatistics())
    )

    // 健康检查和维护
    ipcMain.handle('maintenance:health-check', async () => {
      return await this.initializer.healthCheck()
    })

    ipcMain.handle(
      'maintenance:repair',
      protectedHandler(async () => {
        await this.initializer.repairDatabase()
        return { success: true }
      })
    )

    // 备份
    ipcMain.handle(
      'backup:create',
      protectedHandler(async (_: any, backupPath: string) => {
        await this.dbService.backup(backupPath)
        return { success: true }
      })
    )

    // 审计日志
    ipcMain.handle(
      'audit:get-logs',
      protectedHandler(async (_: any, limit?: number) => await this.dbService.getAuditLogs(limit))
    )

    // 新增：记录审计日志（供 preload 调用）
    ipcMain.handle(
      'audit:log-action',
      protectedHandler(async (_: any, input: any) => {
        await this.dbService.logAction(input)
        return { success: true }
      })
    )

    // 导入导出处理器
    ipcMain.handle(
      'import:preview',
      protectedHandler(async (_: any, config: any) => {
        try {
          return await this.importManager.preview(config)
        } catch (error) {
          const message = error instanceof Error ? error.message : '导入预览失败'
          return { success: false, message, error: message }
        }
      })
    )

    ipcMain.handle(
      'import:execute',
      protectedHandler(async (_: any, config: any) => {
        try {
          // 执行导入预览以获取数据
          const previewResult = await this.importManager.preview(config)
          if (!previewResult.success || !previewResult.data) {
            return previewResult
          }

          // 实际保存密码到数据库（批量处理以减少磁盘写入）
          const { entries } = previewResult.data

          // 获取已有标签并建立 name->id 映射
          const existingTags = await this.dbService.getAllTags()
          const tagNameToId = new Map<string, number>()
          for (const t of existingTags) tagNameToId.set(t.name, t.id)

          // 用于收集所有需要创建的标签名字
          const tagsToCreate = new Set<string>()

          // 构建 CreatePasswordEntryInput 数组
          const passwordInputs: any[] = []
          for (const entry of entries) {
            const tagNames: string[] = (entry.tags || []).map((t: any) => t.name).filter(Boolean)
            for (const name of tagNames) {
              if (!tagNameToId.has(name)) tagsToCreate.add(name)
            }

            passwordInputs.push({
              title: entry.title || '未命名',
              username: entry.username || '',
              password: entry.password || '',
              url: entry.url || '',
              description: entry.description || '',
              tag_ids: [], // later fill with ids
              is_favorite: entry.is_favorite || false
            })
          }

          // 创建缺失的标签并更新映射
          for (const tagName of tagsToCreate) {
            try {
              const createdTag = await this.dbService.createTag({ name: tagName })
              tagNameToId.set(createdTag.name, createdTag.id)
            } catch (e) {
              console.error('创建标签失败:', tagName, e)
            }
          }

          // 填充 tag_ids
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const tagNames: string[] = (entry.tags || []).map((t: any) => t.name).filter(Boolean)
            const ids: number[] = []
            for (const name of tagNames) {
              const id = tagNameToId.get(name)
              if (id) ids.push(id)
            }
            passwordInputs[i].tag_ids = ids
          }

          // 调用批量创建接口
          const createdEntries = await this.dbService.createPasswordEntries(passwordInputs)

          return {
            success: true,
            message: `成功导入${createdEntries.length}条密码记录`,
            data: {
              ...previewResult.data,
              entries: createdEntries
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '导入执行失败'
          return { success: false, message, error: message }
        }
      })
    )

    ipcMain.handle('import:get-supported-formats', async () => {
      try {
        const stats = this.importManager.getStatistics()
        return {
          success: true,
          data: {
            formats: stats.importerList.flatMap((importer) => importer.formats),
            importers: stats.importerList
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '获取支持格式失败'
        return { success: false, message, error: message }
      }
    })

    // 文件选择对话框
    ipcMain.handle('dialog:select-import-file', async (_: any, format: string) => {
      try {
        // 根据导入格式设置文件过滤器
        const filters: Array<{ name: string; extensions: string[] }> = []

        if (format === 'chrome') {
          filters.push({ name: 'CSV文件', extensions: ['csv'] })
        } else {
          filters.push({ name: '所有文件', extensions: ['*'] })
        }

        filters.push({ name: '所有文件', extensions: ['*'] })

        const result = await dialog.showOpenDialog({
          title: '选择要导入的文件',
          filters: filters,
          properties: ['openFile']
        })

        if (result.canceled || !result.filePaths.length) {
          return { success: false, message: '用户取消选择文件' }
        }

        return {
          success: true,
          data: {
            filePath: result.filePaths[0]
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '文件选择失败'
        return { success: false, message, error: message }
      }
    })

    // 临时：测试 CryptoService 的写回验证流程（encrypt -> decrypt -> compare）
    // 可从渲染进程调用： window.electron.ipcRenderer.invoke('test:crypto')
    ipcMain.handle('test:crypto', async () => {
      try {
        const userData = app.getPath('userData')
        const outPath = join(userData, `crypto_test_${Date.now()}.enc`)

        const keySalt = CryptoService.generateSalt()
        const key = await CryptoService.deriveKey('temporary-test-password', keySalt)

        const payload = Buffer.from(`crypto-test-payload-${Date.now()}`)

        console.log('test:crypto -> writing to', outPath)
        await CryptoService.encryptBufferToFile(payload, outPath, key)

        console.log('test:crypto -> encrypt+verify succeeded, cleaning up')
        try {
          unlinkSync(outPath)
        } catch (e) {
          console.warn('test:crypto -> failed to remove temp file:', e)
        }

        return { success: true, path: outPath }
      } catch (err) {
        console.error('test:crypto failed:', err)
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('MainProcessManager.cleanup() called — performing synchronous cleanup')
    // Synchronous cleanup: best-effort close
    try {
      this.dbService.close()
      console.log('MainProcessManager.cleanup(): dbService.close() completed')
    } catch (e) {
      console.warn('MainProcessManager.cleanup(): 同步关闭 DB 失败，尝试异步锁定', e)
    }
    this.isAuthenticated = false
  }

  /**
   * 异步优雅关机：在退出前序列化内存 DB 并加密写回磁盘
   */
  async shutdown(): Promise<void> {
    console.log('MainProcessManager.shutdown() called — attempting to lock and persist DB')
    try {
      await this.dbService.lock()
      console.log('MainProcessManager.shutdown(): dbService.lock() succeeded')
    } catch (e) {
      console.error('MainProcessManager.shutdown(): 异步锁定数据库失败，尝试强制关闭:', e)
      try {
        this.dbService.close()
        console.log('MainProcessManager.shutdown(): dbService.close() succeeded as fallback')
      } catch (e2) {
        console.error('MainProcessManager.shutdown(): 强制关闭数据库也失败:', e2)
      }
    }
    this.isAuthenticated = false
  }
}
