import * as crypto from 'crypto'
import * as argon2 from 'argon2'
import { EncryptionResult, DecryptionInput } from '../types/database'

/**
 * 加密服务类
 * 使用 AES-256-GCM 加密算法和 Argon2 密钥派生函数
 * 确保密码数据的安全性
 */
export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly IV_LENGTH = 12 // 96 bits for GCM
  private static readonly SALT_LENGTH = 32 // 256 bits

  // Argon2 配置参数
  private static readonly ARGON2_CONFIG = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
    hashLength: 32
  }

  /**
   * 生成随机盐值
   */
  static generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex')
  }

  /**
   * 生成随机初始化向量
   */
  static generateIV(): Buffer {
    return crypto.randomBytes(this.IV_LENGTH)
  }

  /**
   * 使用 Argon2 从主密码派生加密密钥
   * @param masterPassword 主密码
   * @param salt 盐值
   */
  static async deriveKey(masterPassword: string, salt: string): Promise<Buffer> {
    try {
      const saltBuffer = Buffer.from(salt, 'hex')
      const hash = await argon2.hash(masterPassword, {
        ...this.ARGON2_CONFIG,
        salt: saltBuffer,
        raw: true
      })
      return hash
    } catch (error) {
      throw new Error(`密钥派生失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 验证主密码
   * @param masterPassword 输入的主密码
   * @param hash 存储的密码哈希
   * @param salt 盐值
   */
  static async verifyMasterPassword(
    masterPassword: string,
    hash: string,
    salt: string
  ): Promise<boolean> {
    try {
      const derivedKey = await this.deriveKey(masterPassword, salt)
      const storedHash = Buffer.from(hash, 'hex')
      return crypto.timingSafeEqual(derivedKey, storedHash)
    } catch (error) {
      console.error('密码验证失败:', error)
      return false
    }
  }

  /**
   * 生成主密码哈希（用于存储）
   * @param masterPassword 主密码
   * @param salt 盐值
   */
  static async hashMasterPassword(masterPassword: string, salt: string): Promise<string> {
    const hash = await this.deriveKey(masterPassword, salt)
    return hash.toString('hex')
  }

  /**
   * 使用 AES-256-GCM 加密数据
   * @param plaintext 明文
   * @param key 加密密钥
   */
  static encrypt(plaintext: string, key: Buffer): EncryptionResult {
    try {
      if (!plaintext) {
        throw new Error('明文不能为空')
      }

      const iv = this.generateIV()
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const tag = cipher.getAuthTag()

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      throw new Error(`加密失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 使用 AES-256-GCM 解密数据
   * @param data 加密数据
   * @param key 解密密钥
   */
  static decrypt(data: DecryptionInput, key: Buffer): string {
    try {
      const { encrypted, iv, tag } = data

      if (!encrypted || !iv || !tag) {
        throw new Error('加密数据不完整')
      }

      const ivBuffer = Buffer.from(iv, 'hex')
      const tagBuffer = Buffer.from(tag, 'hex')

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer)
      decipher.setAuthTag(tagBuffer)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`解密失败: ${error instanceof Error ? error.message : '数据可能已损坏'}`)
    }
  }

  /**
   * 安全地清除内存中的敏感数据
   * @param buffer 要清除的缓冲区
   */
  static clearBuffer(buffer: Buffer): void {
    if (buffer && Buffer.isBuffer(buffer)) {
      buffer.fill(0)
    }
  }

  /**
   * 生成安全的随机密码
   * @param length 密码长度
   * @param options 密码生成选项
   */
  static generateSecurePassword(
    length: number = 16,
    options: {
      includeUppercase?: boolean
      includeLowercase?: boolean
      includeNumbers?: boolean
      includeSymbols?: boolean
      excludeAmbiguous?: boolean
    } = {}
  ): string {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeAmbiguous = true
    } = options

    let charset = ''

    if (includeUppercase) {
      charset += excludeAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    }

    if (includeLowercase) {
      charset += excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
    }

    if (includeNumbers) {
      charset += excludeAmbiguous ? '23456789' : '0123456789'
    }

    if (includeSymbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
    }

    if (!charset) {
      throw new Error('至少需要选择一种字符类型')
    }

    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length)
      password += charset[randomIndex]
    }

    return password
  }

  /**
   * 评估密码强度
   * @param password 密码
   * @returns 密码强度分数 (0-100)
   */
  static evaluatePasswordStrength(password: string): number {
    if (!password) return 0

    let score = 0
    const length = password.length

    // 长度评分 (最多30分)
    if (length >= 8) score += 10
    if (length >= 12) score += 10
    if (length >= 16) score += 10

    // 字符类型评分 (最多40分)
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/[0-9]/.test(password)) score += 10
    if (/[^a-zA-Z0-9]/.test(password)) score += 10

    // 复杂性评分 (最多30分)
    const uniqueChars = new Set(password).size
    if (uniqueChars >= length * 0.7) score += 10
    if (!/(.)\1{2,}/.test(password)) score += 10 // 无连续重复字符
    if (
      !/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(
        password
      )
    ) {
      score += 10 // 无常见序列
    }

    return Math.min(100, score)
  }

  /**
   * 安全地比较两个字符串（防止时序攻击）
   * @param a 字符串A
   * @param b 字符串B
   */
  static safeStringCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    const bufferA = Buffer.from(a, 'utf8')
    const bufferB = Buffer.from(b, 'utf8')

    return crypto.timingSafeEqual(bufferA, bufferB)
  }

  /**
   * 生成用于导出的加密密钥
   * @param masterPassword 主密码
   * @param exportSalt 导出专用盐值
   */
  static async deriveExportKey(masterPassword: string, exportSalt: string): Promise<Buffer> {
    // 使用不同的参数配置以区分导出密钥
    const saltBuffer = Buffer.from(exportSalt, 'hex')
    const hash = await argon2.hash(masterPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 17, // 128 MB - 更高的内存成本
      timeCost: 4, // 更多的迭代次数
      parallelism: 1,
      hashLength: 32,
      salt: saltBuffer,
      raw: true
    })
    return hash
  }
}
