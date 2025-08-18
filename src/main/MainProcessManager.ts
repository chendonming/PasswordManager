import { ipcMain } from 'electron'
import { DatabaseService } from './services/DatabaseService'
import { DatabaseInitializer } from './services/DatabaseInitializer'
import { CryptoService } from './services/CryptoService'

/**
 * 数据库和安全服务的主进程管理器
 * 负责处理来自渲染进程的IPC请求
 */
export class MainProcessManager {
  private dbService: DatabaseService
  private initializer: DatabaseInitializer
  private isAuthenticated = false

  constructor() {
    this.dbService = new DatabaseService()
    this.initializer = new DatabaseInitializer(this.dbService)
    this.setupIpcHandlers()
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      await this.dbService.initialize()
      console.log('主进程服务初始化完成')
    } catch (error) {
      console.error('主进程服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 设置IPC处理器
   */
  private setupIpcHandlers(): void {
    // 认证相关
    ipcMain.handle('auth:is-first-run', async () => {
      return await this.initializer.isFirstRun()
    })

    ipcMain.handle('auth:create-user', async (_, _username: string, masterPassword: string) => {
      try {
        // DatabaseInitializer currently supports setting the master password
        // via initializeWithMasterPassword(masterPassword). Username is not
        // stored by the initializer; ignore username for now.
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

    ipcMain.handle('auth:login', async (_, _username: string, masterPassword: string) => {
      try {
        // Verify master password. Username is not used in current design.
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
    ipcMain.handle('tags:get-all', async () => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getAllTags()
    })

    ipcMain.handle('tags:create', async (_, tagData) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.createTag(tagData)
    })

    ipcMain.handle('tags:update', async (_, id: number, tagData) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.updateTag(id, tagData)
    })

    ipcMain.handle('tags:delete', async (_, id: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      await this.dbService.deleteTag(id)
      return { success: true }
    })

    // 密码条目管理
    ipcMain.handle('passwords:search', async (_, searchParams) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.searchPasswordEntries(searchParams)
    })

    ipcMain.handle('passwords:get-by-id', async (_, id: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getPasswordEntryById(id)
    })

    ipcMain.handle('passwords:create', async (_, entryData) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.createPasswordEntry(entryData)
    })

    ipcMain.handle('passwords:update', async (_, id: number, entryData) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.updatePasswordEntry(id, entryData)
    })

    ipcMain.handle('passwords:delete', async (_, id: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      await this.dbService.deletePasswordEntry(id)
      return { success: true }
    })

    ipcMain.handle('passwords:mark-used', async (_, id: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      await this.dbService.markAsUsed(id)
      return { success: true }
    })

    ipcMain.handle('passwords:get-history', async (_, entryId: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getPasswordHistory(entryId)
    })

    // 密码生成器
    ipcMain.handle('crypto:generate-password', (_, length: number, options) => {
      return CryptoService.generateSecurePassword(length, options)
    })

    ipcMain.handle('crypto:evaluate-strength', (_, password: string) => {
      return CryptoService.evaluatePasswordStrength(password)
    })

    // 应用设置
    ipcMain.handle('settings:get', async (_, key: string) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getSetting(key)
    })

    ipcMain.handle('settings:set', async (_, key: string, value: string, description?: string) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      await this.dbService.setSetting(key, value, description)
      return { success: true }
    })

    ipcMain.handle('settings:get-all', async () => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getAllSettings()
    })

    // 统计信息
    ipcMain.handle('stats:get', async () => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getStatistics()
    })

    // 健康检查和维护
    ipcMain.handle('maintenance:health-check', async () => {
      return await this.initializer.healthCheck()
    })

    ipcMain.handle('maintenance:repair', async () => {
      await this.initializer.repairDatabase()
      return { success: true }
    })

    // 备份
    ipcMain.handle('backup:create', async (_, backupPath: string) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      await this.dbService.backup(backupPath)
      return { success: true }
    })

    // 审计日志
    ipcMain.handle('audit:get-logs', async (_, limit?: number) => {
      if (!this.isAuthenticated) throw new Error('未认证')
      return await this.dbService.getAuditLogs(limit)
    })
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.dbService.close()
    this.isAuthenticated = false
  }
}
