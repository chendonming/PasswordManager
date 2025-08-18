import * as crypto from 'crypto'
import * as argon2 from 'argon2'
import { EncryptionResult, DecryptionInput } from '../types/database'
import { createReadStream, createWriteStream, statSync, renameSync, unlinkSync } from 'fs'
import { promisify } from 'util'
import { pipeline as _pipeline } from 'stream'
const pipeline = promisify(_pipeline)

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

  /**
   * 文件级加密：将整个输入文件加密并输出到 outputPath。
   * 输出格式： [iv(12 bytes)] [ciphertext bytes ...] [tag(16 bytes)]
   */
  static async encryptFile(inputPath: string, outputPath: string, key: Buffer): Promise<void> {
    const iv = this.generateIV()
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

    const input = createReadStream(inputPath)
    // 临时文件：先写入纯密文（不包含 iv/tag）
    const tmpCipherPath = `${outputPath}.ct.tmp.${Date.now()}`
    const cipherOut = createWriteStream(tmpCipherPath, { flags: 'w', mode: 0o600 })

    // 把明文流经 cipher 写入临时密文文件
    await pipeline(input, cipher, cipherOut)

    // 获取认证标签
    const tag = cipher.getAuthTag()

    // 组装最终临时文件：iv + ciphertext + tag
    const finalTmp = `${outputPath}.tmp.${Date.now()}`
    const finalOut = createWriteStream(finalTmp, { flags: 'w', mode: 0o600 })

    // 写 iv
    finalOut.write(iv)

    // 将临时密文流入 finalOut，不自动关闭 finalOut
    const cipherRead = createReadStream(tmpCipherPath)
    await new Promise<void>((resolve, reject) => {
      cipherRead.on('error', reject)
      finalOut.on('error', reject)

      // pipe 不自动结束 finalOut
      cipherRead.pipe(finalOut, { end: false })

      cipherRead.on('end', () => {
        // 在流完成后追加 tag 并结束 finalOut
        finalOut.write(tag, (err) => {
          if (err) return reject(err)
          finalOut.end(() => resolve())
        })
      })
    })

    // 原子替换目标文件
    try {
      renameSync(finalTmp, outputPath)
      // 清理临时密文
      try {
        unlinkSync(tmpCipherPath)
      } catch (e) {
        console.warn('清理临时密文失败:', e)
      }
    } catch (e) {
      // 清理失败需要移除 finalTmp
      try {
        unlinkSync(finalTmp)
      } catch (e) {
        console.warn('删除临时最终文件失败:', e)
      }
      throw e
    }
  }

  /**
   * 解密加密文件到内存 Buffer（用于在内存中恢复数据库）
   * 不在磁盘上写入明文数据，返回明文 Buffer
   */
  static async decryptFileToBuffer(inputPath: string, key: Buffer): Promise<Buffer> {
    const stats = statSync(inputPath)
    const fileSize = stats.size
    if (fileSize < this.IV_LENGTH + 16) throw new Error('加密文件损坏或格式不正确')

    // 读取 iv 和 tag
    const ivBuffer = Buffer.alloc(this.IV_LENGTH)
    const tagBuffer = Buffer.alloc(16)

    // 读取 iv
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(inputPath, { start: 0, end: this.IV_LENGTH - 1 })
      const bufs: Buffer[] = []
      rs.on('data', (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      rs.on('end', () => {
        Buffer.concat(bufs).copy(ivBuffer)
        resolve()
      })
      rs.on('error', reject)
    })

    // 读取 tag
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(inputPath, { start: fileSize - 16, end: fileSize - 1 })
      const bufs: Buffer[] = []
      rs.on('data', (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      rs.on('end', () => {
        Buffer.concat(bufs).copy(tagBuffer)
        resolve()
      })
      rs.on('error', reject)
    })

    // 读取 ciphertext 到 Buffer
    const cipherStart = this.IV_LENGTH
    const cipherEnd = fileSize - 16 - 1
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(inputPath, { start: cipherStart, end: cipherEnd })
      rs.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      rs.on('end', () => resolve())
      rs.on('error', reject)
    })

    const ciphertext = Buffer.concat(chunks)

    // 解密整个 ciphertext Buffer
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer)
    decipher.setAuthTag(tagBuffer)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    // 清理中间敏感数据
    ivBuffer.fill(0)
    tagBuffer.fill(0)
    ciphertext.fill(0)

    return decrypted
  }

  /**
   * 文件级解密：读取 inputPath，解析 iv 与 tag 并解密到 outputPath。
   * 假定格式为: [iv(12)] [ciphertext] [tag(16)]
   */
  static async decryptFile(inputPath: string, outputPath: string, key: Buffer): Promise<void> {
    const stats = statSync(inputPath)
    const fileSize = stats.size
    if (fileSize < this.IV_LENGTH + 16) throw new Error('加密文件损坏或格式不正确')

    // 读取 iv 和 tag
    const ivBuffer = Buffer.alloc(this.IV_LENGTH)
    const tagBuffer = Buffer.alloc(16)

    // 读取 iv
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(inputPath, { start: 0, end: this.IV_LENGTH - 1 })
      const bufs: Buffer[] = []
      rs.on('data', (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      rs.on('end', () => {
        Buffer.concat(bufs).copy(ivBuffer)
        resolve()
      })
      rs.on('error', reject)
    })

    // 读取 tag
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(inputPath, { start: fileSize - 16, end: fileSize - 1 })
      const bufs: Buffer[] = []
      rs.on('data', (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      rs.on('end', () => {
        Buffer.concat(bufs).copy(tagBuffer)
        resolve()
      })
      rs.on('error', reject)
    })

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer)
    decipher.setAuthTag(tagBuffer)

    const cipherStart = this.IV_LENGTH
    const cipherEnd = fileSize - 16 - 1
    const cipherStream = createReadStream(inputPath, { start: cipherStart, end: cipherEnd })
    const outStream = createWriteStream(outputPath, { flags: 'w', mode: 0o600 })

    await pipeline(cipherStream, decipher, outStream)
  }

  /**
   * 将明文 Buffer 加密并写入到磁盘（原子替换 outputPath）
   * 输入为 Buffer（明文），输出格式同 encryptFile: iv + ciphertext + tag
   */
  static async encryptBufferToFile(
    plainBuffer: Buffer,
    outputPath: string,
    key: Buffer
  ): Promise<void> {
    const iv = this.generateIV()
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

    // 加密得到 ciphertext Buffer
    const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()])
    const tag = cipher.getAuthTag()

    // 组装最终临时文件：iv + ciphertext + tag
    const finalTmp = `${outputPath}.tmp.${Date.now()}`
    const finalOut = createWriteStream(finalTmp, { flags: 'w', mode: 0o600 })

    await new Promise<void>((resolve, reject) => {
      finalOut.on('error', reject)
      finalOut.write(iv)
      finalOut.write(ciphertext)
      finalOut.write(tag)
      finalOut.end(() => resolve())
    })

    // 原子替换目标文件
    try {
      renameSync(finalTmp, outputPath)
    } catch (e) {
      try {
        unlinkSync(finalTmp)
      } catch {
        /* ignore cleanup errors */
      }
      throw e
    } finally {
      // 清理敏感内存
      plainBuffer.fill(0)
      ciphertext.fill(0)
      iv.fill(0)
      tag.fill(0)
    }
  }
}
