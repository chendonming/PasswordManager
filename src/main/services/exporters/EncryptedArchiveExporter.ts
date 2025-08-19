/**
 * 加密归档导出器实现
 * 提供将密码数据导出为加密归档文件的功能
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as zlib from 'zlib'
import {
  IExporter,
  ExportFormat,
  ExportData,
  ExportConfig,
  EncryptedArchiveExportConfig,
  OperationResult,
  ProgressCallback
} from '../../../common/types/import-export'
import { DecryptedPasswordEntry } from '../../../common/types/database'

/**
 * 加密归档导出器
 * 使用AES-256-GCM加密，并支持压缩
 */
export class EncryptedArchiveExporter implements IExporter {
  readonly name = 'EncryptedArchiveExporter'
  readonly supportedFormats = [ExportFormat.ENCRYPTED_ARCHIVE]

  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly IV_LENGTH = 12 // 96 bits for GCM
  private static readonly SALT_LENGTH = 32 // 256 bits
  private static readonly KEY_ITERATIONS = 100000 // PBKDF2 iterations

  /**
   * 验证导出配置
   */
  validateConfig(config: ExportConfig): OperationResult<boolean> {
    if (config.format !== ExportFormat.ENCRYPTED_ARCHIVE) {
      return {
        success: false,
        message: '不支持的导出格式'
      }
    }

    const archiveConfig = config as EncryptedArchiveExportConfig

    // 检查必需字段
    if (!archiveConfig.outputPath) {
      return {
        success: false,
        message: '输出路径不能为空'
      }
    }

    if (!archiveConfig.exportPassword) {
      return {
        success: false,
        message: '导出密码不能为空'
      }
    }

    // 检查密码强度
    if (archiveConfig.exportPassword.length < 8) {
      return {
        success: false,
        message: '导出密码长度至少8位',
        warnings: ['建议使用包含大小写字母、数字和特殊字符的强密码']
      }
    }

    // 检查输出目录是否存在
    const outputDir = path.dirname(archiveConfig.outputPath)
    if (!fs.existsSync(outputDir)) {
      return {
        success: false,
        message: `输出目录不存在: ${outputDir}`
      }
    }

    // 验证压缩级别
    if (archiveConfig.compressionLevel < 0 || archiveConfig.compressionLevel > 9) {
      return {
        success: false,
        message: '压缩级别必须在0-9之间'
      }
    }

    return {
      success: true,
      message: '配置验证通过'
    }
  }

  /**
   * 导出数据为加密归档
   */
  async export(
    data: ExportData,
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<string>> {
    const archiveConfig = config as EncryptedArchiveExportConfig

    try {
      progressCallback?.({
        current: 10,
        total: 100,
        percentage: 10,
        message: '准备导出数据...'
      })

      // 过滤选中的条目
      const filteredEntries = this.filterEntries(data.entries, archiveConfig.entryIds)

      // 构建导出数据
      const exportData = {
        ...data,
        entries: filteredEntries,
        metadata: {
          ...data.metadata,
          totalEntries: filteredEntries.length,
          selectedEntries: archiveConfig.entryIds.length > 0 ? archiveConfig.entryIds : null,
          compressionLevel: archiveConfig.compressionLevel
        }
      }

      progressCallback?.({
        current: 20,
        total: 100,
        percentage: 20,
        message: '序列化数据...'
      })

      // 序列化为JSON
      const jsonData = JSON.stringify(exportData, null, 2)

      progressCallback?.({
        current: 40,
        total: 100,
        percentage: 40,
        message: '压缩数据...'
      })

      // 压缩数据
      const compressedData = await this.compressData(
        Buffer.from(jsonData, 'utf8'),
        archiveConfig.compressionLevel
      )

      progressCallback?.({
        current: 60,
        total: 100,
        percentage: 60,
        message: '加密数据...'
      })

      // 加密数据
      const encryptedData = await this.encryptData(compressedData, archiveConfig.exportPassword)

      progressCallback?.({
        current: 80,
        total: 100,
        percentage: 80,
        message: '写入文件...'
      })

      // 写入文件
      await this.writeArchiveFile(archiveConfig.outputPath, encryptedData)

      progressCallback?.({
        current: 100,
        total: 100,
        percentage: 100,
        message: '导出完成'
      })

      return {
        success: true,
        message: '加密归档导出成功',
        data: archiveConfig.outputPath,
        warnings: [
          '✅ 数据已安全加密存储',
          '🔑 请妥善保管导出密码',
          `📁 文件位置: ${archiveConfig.outputPath}`,
          `📊 导出条目数: ${filteredEntries.length}`,
          `📦 压缩级别: ${archiveConfig.compressionLevel}`
        ]
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `加密归档导出失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(format: ExportFormat): Partial<EncryptedArchiveExportConfig> {
    if (format !== ExportFormat.ENCRYPTED_ARCHIVE) {
      throw new Error('不支持的格式')
    }

    return {
      format: ExportFormat.ENCRYPTED_ARCHIVE,
      compressionLevel: 6,
      entryIds: [], // 空数组表示导出所有条目
      includePasswords: true,
      includeTags: true,
      includeMetadata: true,
      exportPassword: '',
      outputPath: ''
    }
  }

  /**
   * 过滤条目
   */
  private filterEntries(
    entries: DecryptedPasswordEntry[],
    entryIds: number[]
  ): DecryptedPasswordEntry[] {
    if (entryIds.length === 0) {
      return entries // 返回所有条目
    }

    return entries.filter((entry) => entryIds.includes(entry.id))
  }

  /**
   * 压缩数据
   */
  private async compressData(data: Buffer, level: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.deflate(data, { level }, (error, result) => {
        if (error) {
          reject(new Error(`压缩失败: ${error.message}`))
        } else {
          resolve(result)
        }
      })
    })
  }

  /**
   * 加密数据
   */
  private async encryptData(data: Buffer, password: string): Promise<Buffer> {
    // 生成随机盐值
    const salt = crypto.randomBytes(EncryptedArchiveExporter.SALT_LENGTH)

    // 派生密钥
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      EncryptedArchiveExporter.KEY_ITERATIONS,
      32,
      'sha256'
    )

    // 生成随机IV
    const iv = crypto.randomBytes(EncryptedArchiveExporter.IV_LENGTH)

    // 创建加密器
    const cipher = crypto.createCipheriv(EncryptedArchiveExporter.ALGORITHM, key, iv)

    // 加密数据
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()])

    // 获取认证标签
    const tag = cipher.getAuthTag()

    // 构建最终数据格式: [salt][iv][tag][encrypted_data]
    return Buffer.concat([salt, iv, tag, encrypted])
  }

  /**
   * 写入归档文件
   */
  private async writeArchiveFile(filePath: string, data: Buffer): Promise<void> {
    // 构建文件头部信息
    const header = {
      version: '1.0',
      algorithm: EncryptedArchiveExporter.ALGORITHM,
      iterations: EncryptedArchiveExporter.KEY_ITERATIONS,
      timestamp: new Date().toISOString(),
      dataLength: data.length
    }

    const headerJson = JSON.stringify(header)
    const headerBuffer = Buffer.from(headerJson, 'utf8')
    const headerLengthBuffer = Buffer.alloc(4)
    headerLengthBuffer.writeUInt32BE(headerBuffer.length, 0)

    // 文件格式: [header_length][header][encrypted_data]
    const finalBuffer = Buffer.concat([headerLengthBuffer, headerBuffer, data])

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, finalBuffer, (error) => {
        if (error) {
          reject(new Error(`写入文件失败: ${error.message}`))
        } else {
          resolve()
        }
      })
    })
  }
}
