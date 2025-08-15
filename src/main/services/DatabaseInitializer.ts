import { DatabaseService } from '../services/DatabaseService'
import { CryptoService } from '../services/CryptoService'

/**
 * 数据库初始化管理器
 * 负责应用首次启动时的数据库设置和用户创建
 */
export class DatabaseInitializer {
  private dbService: DatabaseService

  constructor(dbService: DatabaseService) {
    this.dbService = dbService
  }

  /**
   * 检查是否为首次运行（没有用户）
   */
  async isFirstRun(): Promise<boolean> {
    try {
      // 简单检查是否有用户记录
      const settings = await this.dbService.getAllSettings()
      const hasInitialized = settings.find((s) => s.key === 'app_initialized')
      return !hasInitialized
    } catch (error) {
      console.error('检查首次运行状态失败:', error)
      return true // 出错时认为是首次运行
    }
  }

  /**
   * 创建主用户并完成初始化
   */
  async initializeWithMasterUser(username: string, masterPassword: string): Promise<void> {
    try {
      // 生成盐值
      const salt = CryptoService.generateSalt()

      // 生成密码哈希
      const masterPasswordHash = await CryptoService.hashMasterPassword(masterPassword, salt)

      // 创建用户
      await this.dbService.createUser({
        username,
        master_password_hash: masterPasswordHash,
        salt
      })

      // 设置加密密钥
      await this.dbService.setEncryptionKey(masterPassword, salt)

      // 标记应用已初始化
      await this.dbService.setSetting('app_initialized', 'true', '应用初始化完成标记')
      await this.dbService.setSetting('created_at', new Date().toISOString(), '应用创建时间')

      console.log('数据库初始化完成，主用户已创建')
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw new Error(`数据库初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 验证用户登录
   */
  async authenticateUser(username: string, masterPassword: string): Promise<boolean> {
    try {
      const user = await this.dbService.getUserByUsername(username)
      if (!user) {
        return false
      }

      const isValid = await CryptoService.verifyMasterPassword(
        masterPassword,
        user.master_password_hash,
        user.salt
      )

      if (isValid) {
        // 设置加密密钥
        await this.dbService.setEncryptionKey(masterPassword, user.salt)
      }

      return isValid
    } catch (error) {
      console.error('用户认证失败:', error)
      return false
    }
  }

  /**
   * 用户注销
   */
  logout(): void {
    this.dbService.clearEncryptionKey()
  }

  /**
   * 数据库健康检查
   */
  async healthCheck(): Promise<{
    isHealthy: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statistics: any
    issues: string[]
  }> {
    const issues: string[] = []
    let isHealthy = true

    try {
      // 获取统计信息
      const statistics = await this.dbService.getStatistics()

      // 检查是否有基本标签
      const tags = await this.dbService.getAllTags()
      if (tags.length === 0) {
        issues.push('没有找到预设标签，可能需要重新初始化数据库')
        isHealthy = false
      }

      // 检查设置完整性
      const requiredSettings = ['password_generator_length', 'auto_lock_timeout', 'theme_mode']

      for (const setting of requiredSettings) {
        const value = await this.dbService.getSetting(setting)
        if (!value) {
          issues.push(`缺少必要设置: ${setting}`)
          isHealthy = false
        }
      }

      return {
        isHealthy,
        statistics,
        issues
      }
    } catch (error) {
      return {
        isHealthy: false,
        statistics: null,
        issues: [`健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`]
      }
    }
  }

  /**
   * 修复常见数据库问题
   */
  async repairDatabase(): Promise<void> {
    try {
      // 重新插入默认标签（如果不存在）
      const existingTags = await this.dbService.getAllTags()

      const defaultTags = [
        { name: '工作', color: '#2080f0', description: '工作相关的账户' },
        { name: '个人', color: '#18a058', description: '个人使用的账户' },
        { name: '社交', color: '#f0a020', description: '社交平台账户' },
        { name: '金融', color: '#d03050', description: '银行、支付等金融账户' },
        { name: '购物', color: '#7c3aed', description: '电商、购物平台' },
        { name: '学习', color: '#0ea5e9', description: '教育、学习平台' },
        { name: '娱乐', color: '#10b981', description: '游戏、娱乐平台' }
      ]

      for (const defaultTag of defaultTags) {
        const exists = existingTags.find((tag) => tag.name === defaultTag.name)
        if (!exists) {
          await this.dbService.createTag(defaultTag)
        }
      }

      // 重新设置默认配置
      const defaultSettings = [
        { key: 'password_generator_length', value: '16', description: '默认密码生成长度' },
        {
          key: 'password_generator_include_uppercase',
          value: 'true',
          description: '密码包含大写字母'
        },
        {
          key: 'password_generator_include_lowercase',
          value: 'true',
          description: '密码包含小写字母'
        },
        { key: 'password_generator_include_numbers', value: 'true', description: '密码包含数字' },
        {
          key: 'password_generator_include_symbols',
          value: 'true',
          description: '密码包含特殊符号'
        },
        { key: 'auto_lock_timeout', value: '900', description: '自动锁定超时时间（秒）' },
        { key: 'theme_mode', value: 'auto', description: '主题模式：light/dark/auto' },
        { key: 'backup_enabled', value: 'true', description: '是否启用自动备份' },
        { key: 'backup_interval', value: '86400', description: '备份间隔（秒）' }
      ]

      for (const setting of defaultSettings) {
        const existing = await this.dbService.getSetting(setting.key)
        if (!existing) {
          await this.dbService.setSetting(setting.key, setting.value, setting.description)
        }
      }

      console.log('数据库修复完成')
    } catch (error) {
      console.error('数据库修复失败:', error)
      throw error
    }
  }
}
