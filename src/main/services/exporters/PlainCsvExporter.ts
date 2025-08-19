/**
 * 明文CSV导出器实现
 * 提供将密码数据导出为明文CSV格式的功能（带安全警告）
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  IExporter,
  ExportFormat,
  ExportData,
  ExportConfig,
  PlainCsvExportConfig,
  OperationResult,
  ProgressCallback
} from '../../../common/types/import-export'
import { DecryptedPasswordEntry, Tag } from '../../../common/types/database'

/**
 * 明文CSV导出器
 * 警告：此导出器会将密码以明文形式保存，存在严重安全风险
 */
export class PlainCsvExporter implements IExporter {
  readonly name = 'PlainCsvExporter'
  readonly supportedFormats = [ExportFormat.PLAIN_CSV]

  /**
   * 验证导出配置
   */
  validateConfig(config: ExportConfig): OperationResult<boolean> {
    if (config.format !== ExportFormat.PLAIN_CSV) {
      return {
        success: false,
        message: '不支持的导出格式'
      }
    }

    const csvConfig = config as PlainCsvExportConfig

    // 检查必需字段
    if (!csvConfig.outputPath) {
      return {
        success: false,
        message: '输出路径不能为空'
      }
    }

    // 检查输出目录是否存在
    const outputDir = path.dirname(csvConfig.outputPath)
    if (!fs.existsSync(outputDir)) {
      return {
        success: false,
        message: `输出目录不存在: ${outputDir}`
      }
    }

    // 安全警告检查
    if (!csvConfig.confirmPlaintextExport) {
      return {
        success: false,
        message: '必须确认明文导出的安全风险',
        warnings: [
          '⚠️ 安全警告：CSV格式将以明文形式存储所有密码',
          '⚠️ 请确保文件存储在安全位置',
          '⚠️ 使用完毕后请立即删除文件',
          '⚠️ 不要通过不安全的渠道传输此文件'
        ]
      }
    }

    // 验证分隔符
    if (!csvConfig.delimiter || csvConfig.delimiter.length === 0) {
      return {
        success: false,
        message: '分隔符不能为空'
      }
    }

    // 验证编码
    const supportedEncodings = ['utf8', 'utf16le', 'ascii']
    if (!supportedEncodings.includes(csvConfig.encoding)) {
      return {
        success: false,
        message: `不支持的编码格式: ${csvConfig.encoding}`
      }
    }

    return {
      success: true,
      message: '配置验证通过'
    }
  }

  /**
   * 导出数据为明文CSV
   */
  async export(
    data: ExportData,
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<string>> {
    const csvConfig = config as PlainCsvExportConfig

    try {
      progressCallback?.({
        current: 10,
        total: 100,
        percentage: 10,
        message: '准备导出数据...'
      })

      // 构建CSV内容
      let csvContent = ''

      // 添加安全警告注释
      if (csvConfig.includeHeaders) {
        csvContent += `# ⚠️ 安全警告：此文件包含明文密码，请妥善保管！\n`
        csvContent += `# 导出时间：${data.metadata.exportedAt}\n`
        csvContent += `# 数据版本：${data.metadata.version}\n`
        csvContent += `# 条目数量：${data.metadata.totalEntries}\n`
        csvContent += `#\n`
      }

      progressCallback?.({
        current: 20,
        total: 100,
        percentage: 20,
        message: '生成CSV标题行...'
      })

      // 生成标题行
      if (csvConfig.includeHeaders) {
        const headers = this.generateHeaders(csvConfig)
        csvContent += headers.join(csvConfig.delimiter) + '\n'
      }

      progressCallback?.({
        current: 30,
        total: 100,
        percentage: 30,
        message: '开始处理密码条目...'
      })

      // 处理密码条目
      const totalEntries = data.entries.length
      for (let i = 0; i < totalEntries; i++) {
        const entry = data.entries[i]
        const row = this.entryToRow(entry, data.tags, csvConfig)
        csvContent += row.join(csvConfig.delimiter) + '\n'

        // 更新进度
        const progress = 30 + Math.floor((i / totalEntries) * 60)
        progressCallback?.({
          current: progress,
          total: 100,
          percentage: progress,
          message: `处理条目 ${i + 1}/${totalEntries}: ${entry.title}`
        })
      }

      progressCallback?.({
        current: 90,
        total: 100,
        percentage: 90,
        message: '写入文件...'
      })

      // 写入文件
      await this.writeFile(csvConfig.outputPath, csvContent, csvConfig.encoding)

      progressCallback?.({
        current: 100,
        total: 100,
        percentage: 100,
        message: '导出完成'
      })

      return {
        success: true,
        message: '明文CSV导出成功',
        data: csvConfig.outputPath,
        warnings: [
          '⚠️ 文件已导出为明文格式，请注意安全！',
          '⚠️ 建议使用完毕后立即删除此文件',
          `📁 文件位置: ${csvConfig.outputPath}`
        ]
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `CSV导出失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(format: ExportFormat): Partial<PlainCsvExportConfig> {
    if (format !== ExportFormat.PLAIN_CSV) {
      throw new Error('不支持的格式')
    }

    return {
      format: ExportFormat.PLAIN_CSV,
      delimiter: ',',
      includeHeaders: true,
      encoding: 'utf8',
      includePasswords: true,
      includeTags: true,
      includeMetadata: true,
      confirmPlaintextExport: false,
      outputPath: ''
    }
  }

  /**
   * 生成CSV标题行
   */
  private generateHeaders(config: PlainCsvExportConfig): string[] {
    const headers = ['标题', '用户名']

    if (config.includePasswords) {
      headers.push('密码')
    }

    headers.push('网址', '描述')

    if (config.includeTags) {
      headers.push('标签')
    }

    if (config.includeMetadata) {
      headers.push('是否收藏', '密码强度', '最后使用时间', '创建时间', '更新时间')
    }

    return headers
  }

  /**
   * 将密码条目转换为CSV行
   */
  private entryToRow(
    entry: DecryptedPasswordEntry,
    tags: Tag[],
    config: PlainCsvExportConfig
  ): string[] {
    // 移除未使用的参数警告
    void tags

    const row = [
      this.escapeCSVField(entry.title || '', config.delimiter),
      this.escapeCSVField(entry.username || '', config.delimiter)
    ]

    if (config.includePasswords) {
      row.push(this.escapeCSVField(entry.password || '', config.delimiter))
    }

    row.push(
      this.escapeCSVField(entry.url || '', config.delimiter),
      this.escapeCSVField(entry.description || '', config.delimiter)
    )

    if (config.includeTags) {
      const entryTags = entry.tags?.map((tag: Tag) => tag.name).join('; ') || ''
      row.push(this.escapeCSVField(entryTags, config.delimiter))
    }

    if (config.includeMetadata) {
      row.push(
        entry.is_favorite ? '是' : '否',
        entry.password_strength?.toString() || '0',
        entry.last_used_at || '',
        entry.created_at || '',
        entry.updated_at || ''
      )
    }

    return row
  }

  /**
   * 转义CSV字段
   */
  private escapeCSVField(field: string, delimiter: string): string {
    if (!field) return ''

    // 如果字段包含分隔符、换行符或引号，需要用引号包围
    if (field.includes(delimiter) || field.includes('\n') || field.includes('"')) {
      // 转义引号（双引号）
      const escaped = field.replace(/"/g, '""')
      return `"${escaped}"`
    }

    return field
  }

  /**
   * 写入文件
   */
  private async writeFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, { encoding }, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
}
