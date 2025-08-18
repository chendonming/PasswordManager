/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { app } from 'electron'
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
      console.log('userData path:', app.getPath('userData'))
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
    const protectedHandler =
      (fn: (...args: any[]) => Promise<any>) =>
      async (_event: any, ...args: any[]) => {
        if (!this.isAuthenticated) {
          return { error: '未认证' }
        }
        try {
          // Ensure the original ipc event is forwarded as the first argument
          // so wrapped handlers that expect (event, ...args) receive correct params.
          return await fn.apply(this, [_event, ...args])
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) }
        }
      }

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
