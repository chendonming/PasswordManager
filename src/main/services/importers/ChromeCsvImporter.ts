/**
 * Chrome CSV 导入器
 * 支持从 Chrome 浏览器导出的 CSV 文件导入密码
 */

import { promises as fs } from 'fs'
import { parse } from 'csv-parse/sync'
import {
  IImporter,
  ImportFormat,
  ImportConfig,
  BrowserImportConfig,
  ImportPreviewData,
  OperationResult,
  ProgressCallback,
  ConflictStrategy
} from '../../../common/types/import-export'
import { DecryptedPasswordEntry } from '../../../common/types/database'

/**
 * Chrome CSV 文件的列结构
 */
interface ChromeCsvRow {
  name: string
  url: string
  username: string
  password: string
}

/**
 * Chrome CSV 导入器实现
 */
export class ChromeCsvImporter implements IImporter {
  readonly name: string = 'ChromeCsvImporter'
  readonly version: string = '1.0.0'
  readonly supportedFormats: ImportFormat[] = [ImportFormat.CHROME]

  /**
   * 验证导入配置
   */
  validateConfig(config: ImportConfig): OperationResult<boolean> {
    if (config.format !== ImportFormat.CHROME) {
      return {
        success: false,
        message: '不支持的导入格式，Chrome导入器仅支持Chrome格式'
      }
    }

    const browserConfig = config as BrowserImportConfig

    // 检查文件路径
    if (!browserConfig.filePath) {
      return {
        success: false,
        message: '文件路径不能为空'
      }
    }

    // 检查文件扩展名
    if (!browserConfig.filePath.toLowerCase().endsWith('.csv')) {
      return {
        success: false,
        message: '文件必须是CSV格式（.csv扩展名）'
      }
    }

    return {
      success: true,
      message: '配置验证成功'
    }
  }

  /**
   * 预览导入数据
   */
  async preview(config: ImportConfig): Promise<OperationResult<ImportPreviewData>> {
    try {
      const browserConfig = config as BrowserImportConfig

      // 读取文件
      const fileContent = await fs.readFile(browserConfig.filePath, 'utf-8')

      // 解析CSV
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as ChromeCsvRow[]

      // 转换为预览数据
      const passwordEntries: DecryptedPasswordEntry[] = records.map((row, index) => ({
        id: -1, // 预览时使用负数ID
        title: row.name || row.url || `导入项 ${index + 1}`,
        username: row.username || '',
        password: row.password || '',
        url: row.url || '',
        description: `从Chrome导入：${row.name || row.url}`,
        tags: [],
        is_favorite: false,
        password_strength: this.calculatePasswordStrength(row.password),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used_at: undefined
      }))

      const previewData: ImportPreviewData = {
        entries: passwordEntries,
        tags: [], // Chrome导出通常不包含标签
        conflicts: [], // 预览阶段暂不检查冲突
        statistics: {
          totalEntries: passwordEntries.length,
          totalTags: 0,
          newEntries: passwordEntries.length,
          conflictingEntries: 0,
          duplicateEntries: this.findDuplicates(passwordEntries).length,
          invalidEntries: passwordEntries.filter((entry) => !entry.password).length
        }
      }

      const warnings = this.generateWarnings(passwordEntries)

      return {
        success: true,
        message: `成功预览Chrome导出文件，共${passwordEntries.length}条记录`,
        data: previewData,
        warnings: warnings
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `预览Chrome CSV文件失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 执行导入
   */
  async import(
    config: ImportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<ImportPreviewData>> {
    try {
      // 先进行预览以获取数据
      const previewResult = await this.preview(config)
      if (!previewResult.success || !previewResult.data) {
        return previewResult
      }

      const { entries } = previewResult.data

      progressCallback?.({
        current: 0,
        total: entries.length,
        percentage: 0,
        message: '开始导入Chrome密码...'
      })

      // 这里应该调用实际的数据库服务来保存密码
      // 由于我们在策略模式中，具体的保存逻辑应该由调用方处理
      // 这里只是模拟进度更新

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]

        // 模拟处理每个条目
        await new Promise((resolve) => setTimeout(resolve, 10))

        // 更新进度
        progressCallback?.({
          current: i + 1,
          total: entries.length,
          percentage: Math.round(((i + 1) / entries.length) * 100),
          message: `正在导入: ${entry.title}`
        })
      }

      return {
        success: true,
        message: `成功导入${entries.length}条密码记录`,
        data: previewResult.data
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `导入Chrome CSV文件失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 计算密码强度（简单实现）
   */
  private calculatePasswordStrength(password: string): number {
    if (!password) return 0

    let score = 0

    // 长度检查
    if (password.length >= 8) score += 25
    if (password.length >= 12) score += 25

    // 字符类型检查
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/[0-9]/.test(password)) score += 10
    if (/[^a-zA-Z0-9]/.test(password)) score += 20

    return Math.min(score, 100)
  }

  /**
   * 查找重复项
   */
  private findDuplicates(entries: DecryptedPasswordEntry[]): DecryptedPasswordEntry[] {
    const seen = new Set<string>()
    const duplicates: DecryptedPasswordEntry[] = []

    for (const entry of entries) {
      const key = `${entry.url}:${entry.username}`.toLowerCase()
      if (seen.has(key)) {
        duplicates.push(entry)
      } else {
        seen.add(key)
      }
    }

    return duplicates
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(entries: DecryptedPasswordEntry[]): string[] {
    const warnings: string[] = []

    // 检查空密码
    const emptyPasswords = entries.filter((entry) => !entry.password)
    if (emptyPasswords.length > 0) {
      warnings.push(`发现${emptyPasswords.length}个空密码项`)
    }

    // 检查弱密码
    const weakPasswords = entries.filter((entry) => entry.password && entry.password.length < 8)
    if (weakPasswords.length > 0) {
      warnings.push(`发现${weakPasswords.length}个可能的弱密码`)
    }

    // 检查重复项
    const duplicates = this.findDuplicates(entries)
    if (duplicates.length > 0) {
      warnings.push(`发现${duplicates.length}个可能的重复项`)
    }

    return warnings
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(format: ImportFormat): Partial<ImportConfig> {
    if (format !== ImportFormat.CHROME) {
      throw new Error('Chrome导入器仅支持Chrome格式')
    }

    const defaultConfig: Partial<BrowserImportConfig> = {
      format: ImportFormat.CHROME,
      conflictStrategy: ConflictStrategy.SKIP,
      createBackup: true
    }

    return defaultConfig
  }
}
