import { DatabaseService } from '../services/DatabaseService'
import { CryptoService } from '../services/CryptoService'

/**
 * 数据库初始化管理器
 * 负责应用首次启动时的数据库设置和主密码管理
 */
export class DatabaseInitializer {
  private dbService: DatabaseService

  constructor(dbService: DatabaseService) {
    this.dbService = dbService
  }

  /**
   * 检查是否为首次运行（没有设置主密码）
   */
  async isFirstRun(): Promise<boolean> {
    try {
      // 检查是否已设置主密码
      const masterPasswordHash = await this.dbService.getSetting('master_password_hash')
      return !masterPasswordHash
    } catch (error) {
      console.error('检查首次运行状态失败:', error)
      return true // 出错时认为是首次运行
    }
  }

  /**
   * 设置主密码并完成初始化
   */
  async initializeWithMasterPassword(masterPassword: string): Promise<void> {
    try {
      // 生成盐值
      const salt = CryptoService.generateSalt()

      // 生成密码哈希
      const masterPasswordHash = await CryptoService.hashMasterPassword(masterPassword, salt)

      // 保存主密码哈希和盐值
      await this.dbService.setSetting('master_password_hash', masterPasswordHash, '主密码哈希')
      await this.dbService.setSetting('master_password_salt', salt, '主密码盐值')

      // 设置加密密钥
      await this.dbService.setEncryptionKey(masterPassword, salt)

      // 标记应用已初始化
      await this.dbService.setSetting('app_initialized', 'true', '应用初始化完成标记')
      await this.dbService.setSetting('created_at', new Date().toISOString(), '应用创建时间')

      console.log('密码管理器初始化完成，主密码已设置')
    } catch (error) {
      console.error('密码管理器初始化失败:', error)
      throw new Error(`初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 验证主密码
   */
  async verifyMasterPassword(masterPassword: string): Promise<boolean> {
    try {
      const masterPasswordHash = await this.dbService.getSetting('master_password_hash')
      const salt = await this.dbService.getSetting('master_password_salt')

      if (!masterPasswordHash || !salt) {
        return false
      }

      const isValid = await CryptoService.verifyMasterPassword(
        masterPassword,
        masterPasswordHash,
        salt
      )

      if (isValid) {
        // 设置加密密钥
        await this.dbService.setEncryptionKey(masterPassword, salt)
      }

      return isValid
    } catch (error) {
      console.error('主密码验证失败:', error)
      return false
    }
  }

  /**
   * 锁定应用（清除内存中的加密密钥）
   */
  lock(): void {
    this.dbService.clearEncryptionKey()
  }

  /**
   * 更改主密码
   */
  async changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 先验证旧密码
      const isOldPasswordValid = await this.verifyMasterPassword(oldPassword)
      if (!isOldPasswordValid) {
        return false
      }

      // 生成新的盐值和哈希
      const newSalt = CryptoService.generateSalt()
      const newPasswordHash = await CryptoService.hashMasterPassword(newPassword, newSalt)

      // 重新加密所有数据（这需要重新处理所有密码条目）
      // 注意：这是一个复杂的操作，需要解密后重新加密所有敏感数据
      console.warn('更改主密码功能需要重新加密所有数据，当前版本暂不支持')

      // 更新主密码设置
      await this.dbService.setSetting('master_password_hash', newPasswordHash, '主密码哈希')
      await this.dbService.setSetting('master_password_salt', newSalt, '主密码盐值')

      // 设置新的加密密钥
      await this.dbService.setEncryptionKey(newPassword, newSalt)

      return true
    } catch (error) {
      console.error('更改主密码失败:', error)
      return false
    }
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
