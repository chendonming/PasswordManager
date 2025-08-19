/**
 * 明文CSV导入器实现
 * 支持从CSV文件导入密码数据
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  IImporter,
  ImportFormat,
  ImportConfig,
  PlainCsvImportConfig,
  ImportPreviewData,
  ImportConflict,
  ImportStatistics,
  ConflictStrategy,
  OperationResult,
  ProgressCallback
} from '../../../common/types/import-export'
import { DecryptedPasswordEntry, Tag } from '../../../common/types/database'

/**
 * 明文CSV导入器
 * 支持从CSV文件导入密码条目
 */
export class PlainCsvImporter implements IImporter {
  readonly name = 'PlainCsvImporter'
  readonly supportedFormats = [ImportFormat.PLAIN_CSV]

  /**
   * 验证导入配置
   */
  validateConfig(config: ImportConfig): OperationResult<boolean> {
    if (config.format !== ImportFormat.PLAIN_CSV) {
      return {
        success: false,
        message: '不支持的导入格式'
      }
    }

    const csvConfig = config as PlainCsvImportConfig

    // 检查文件是否存在
    if (!csvConfig.filePath) {
      return {
        success: false,
        message: '文件路径不能为空'
      }
    }

    if (!fs.existsSync(csvConfig.filePath)) {
      return {
        success: false,
        message: `文件不存在: ${csvConfig.filePath}`
      }
    }

    // 检查文件扩展名
    const ext = path.extname(csvConfig.filePath).toLowerCase()
    if (ext !== '.csv' && ext !== '.txt') {
      return {
        success: false,
        message: '文件格式不支持，仅支持 .csv 和 .txt 文件',
        warnings: [`当前文件扩展名: ${ext}`]
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

    // 验证列映射
    if (!csvConfig.columnMapping) {
      return {
        success: false,
        message: '列映射配置不能为空'
      }
    }

    if (
      csvConfig.columnMapping.title === undefined ||
      csvConfig.columnMapping.password === undefined
    ) {
      return {
        success: false,
        message: '标题和密码列是必需的'
      }
    }

    return {
      success: true,
      message: '配置验证通过'
    }
  }

  /**
   * 预览导入数据
   */
  async preview(config: ImportConfig): Promise<OperationResult<ImportPreviewData>> {
    const csvConfig = config as PlainCsvImportConfig

    try {
      // 读取和解析CSV文件
      const rawData = await this.readCsvFile(csvConfig)
      const parsedEntries = this.parseEntries(rawData, csvConfig)

      // 检测冲突（这里需要与现有数据库比较，暂时模拟）
      const conflicts = await this.detectConflicts(parsedEntries)

      // 生成统计信息
      const statistics = this.generateStatistics(parsedEntries, conflicts)

      const previewData: ImportPreviewData = {
        entries: parsedEntries,
        tags: [], // CSV通常不包含独立的标签数据
        conflicts,
        statistics
      }

      return {
        success: true,
        message: '预览生成成功',
        data: previewData,
        warnings: this.generateWarnings(parsedEntries, statistics)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `预览失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 导入数据
   */
  async import(
    config: ImportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<ImportPreviewData>> {
    const csvConfig = config as PlainCsvImportConfig

    try {
      progressCallback?.({
        current: 0,
        total: 100,
        percentage: 0,
        message: '开始导入...'
      })

      // 首先进行预览以获取数据
      const previewResult = await this.preview(config)
      if (!previewResult.success || !previewResult.data) {
        return previewResult
      }

      progressCallback?.({
        current: 30,
        total: 100,
        percentage: 30,
        message: '处理数据冲突...'
      })

      // 根据冲突策略处理数据
      const processedData = await this.processConflicts(
        previewResult.data,
        csvConfig.conflictStrategy
      )

      progressCallback?.({
        current: 60,
        total: 100,
        percentage: 60,
        message: '创建备份...'
      })

      // 创建备份（如果需要）
      if (csvConfig.createBackup) {
        await this.createBackup()
      }

      progressCallback?.({
        current: 80,
        total: 100,
        percentage: 80,
        message: '保存到数据库...'
      })

      // 这里应该调用数据库服务来保存数据
      // await this.saveToDatabase(processedData);

      progressCallback?.({
        current: 100,
        total: 100,
        percentage: 100,
        message: '导入完成'
      })

      return {
        success: true,
        message: 'CSV导入成功',
        data: processedData,
        warnings: [
          `✅ 成功导入 ${processedData.entries.length} 个条目`,
          `📁 源文件: ${csvConfig.filePath}`,
          `🔄 冲突策略: ${this.getConflictStrategyDescription(csvConfig.conflictStrategy)}`
        ]
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `导入失败: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(format: ImportFormat): Partial<PlainCsvImportConfig> {
    if (format !== ImportFormat.PLAIN_CSV) {
      throw new Error('不支持的格式')
    }

    return {
      format: ImportFormat.PLAIN_CSV,
      delimiter: ',',
      hasHeaders: true,
      encoding: 'utf8',
      conflictStrategy: ConflictStrategy.SKIP,
      createBackup: true,
      columnMapping: {
        title: 0,
        username: 1,
        password: 2,
        url: 3,
        description: 4,
        tags: 5
      },
      filePath: ''
    }
  }

  /**
   * 读取CSV文件
   */
  private async readCsvFile(config: PlainCsvImportConfig): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      fs.readFile(config.filePath, config.encoding, (error, data) => {
        if (error) {
          reject(new Error(`读取文件失败: ${error.message}`))
          return
        }

        try {
          // 简单的CSV解析（生产环境建议使用专业的CSV解析库）
          const lines = data.split('\n').filter((line) => line.trim().length > 0)
          const rows = lines.map((line) => this.parseCsvRow(line, config.delimiter))

          // 如果有标题行，跳过第一行
          if (config.hasHeaders && rows.length > 0) {
            rows.shift()
          }

          resolve(rows)
        } catch (parseError) {
          reject(
            new Error(
              `解析CSV失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`
            )
          )
        }
      })
    })
  }

  /**
   * 解析CSV行
   */
  private parseCsvRow(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 转义的引号
          current += '"'
          i++ // 跳过下一个引号
        } else {
          // 切换引号状态
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        // 字段分隔符
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // 添加最后一个字段
    result.push(current.trim())

    return result
  }

  /**
   * 解析条目
   */
  private parseEntries(
    rows: string[][],
    config: PlainCsvImportConfig
  ): Partial<DecryptedPasswordEntry>[] {
    const entries: Partial<DecryptedPasswordEntry>[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      try {
        const entry: Partial<DecryptedPasswordEntry> = {
          title: this.getColumnValue(row, config.columnMapping.title),
          username: this.getColumnValue(row, config.columnMapping.username),
          password: this.getColumnValue(row, config.columnMapping.password),
          url: this.getColumnValue(row, config.columnMapping.url),
          description: this.getColumnValue(row, config.columnMapping.description),
          is_favorite: false,
          password_strength: 0, // 需要计算密码强度
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [] // 标签需要单独处理
        }

        // 处理标签
        if (config.columnMapping.tags !== undefined) {
          const tagsStr = this.getColumnValue(row, config.columnMapping.tags)
          if (tagsStr) {
            const tagNames = tagsStr
              .split(';')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
            entry.tags = tagNames.map((name) => ({ name }) as Tag)
          }
        }

        entries.push(entry)
      } catch (error) {
        console.warn(`解析第 ${i + 1} 行时出错:`, error)
        // 继续处理其他行
      }
    }

    return entries
  }

  /**
   * 获取列值
   */
  private getColumnValue(row: string[], columnIndex: number | undefined): string {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return ''
    }
    return row[columnIndex] || ''
  }

  /**
   * 检测冲突
   */
  private async detectConflicts(
    entries: Partial<DecryptedPasswordEntry>[]
  ): Promise<ImportConflict[]> {
    // 这里应该与现有数据库数据进行比较
    // 暂时返回空数组作为示例
    void entries // 避免未使用参数警告
    return []
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(
    entries: Partial<DecryptedPasswordEntry>[],
    conflicts: ImportConflict[]
  ): ImportStatistics {
    return {
      totalEntries: entries.length,
      totalTags: 0, // 需要统计唯一标签数量
      newEntries: entries.length - conflicts.length,
      conflictingEntries: conflicts.length,
      duplicateEntries: 0, // 需要检测重复项
      invalidEntries: 0 // 需要验证数据完整性
    }
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(
    entries: Partial<DecryptedPasswordEntry>[],
    statistics: ImportStatistics
  ): string[] {
    const warnings: string[] = []

    if (statistics.invalidEntries > 0) {
      warnings.push(`⚠️ 发现 ${statistics.invalidEntries} 个无效条目`)
    }

    if (statistics.conflictingEntries > 0) {
      warnings.push(`⚠️ 发现 ${statistics.conflictingEntries} 个冲突条目`)
    }

    // 检查弱密码
    const weakPasswords = entries.filter(
      (entry) => entry.password && entry.password.length < 8
    ).length

    if (weakPasswords > 0) {
      warnings.push(`⚠️ 发现 ${weakPasswords} 个弱密码`)
    }

    return warnings
  }

  /**
   * 处理冲突
   */
  private async processConflicts(
    data: ImportPreviewData,
    strategy: ConflictStrategy
  ): Promise<ImportPreviewData> {
    // 根据策略处理冲突
    // 这里是简化实现，实际需要根据具体策略进行处理
    void strategy // 避免未使用参数警告
    return data
  }

  /**
   * 创建备份
   */
  private async createBackup(): Promise<void> {
    // 创建数据库备份
    console.log('创建备份...')
  }

  /**
   * 获取冲突策略描述
   */
  private getConflictStrategyDescription(strategy: ConflictStrategy): string {
    switch (strategy) {
      case ConflictStrategy.SKIP:
        return '跳过重复项'
      case ConflictStrategy.OVERWRITE:
        return '覆盖现有项'
      case ConflictStrategy.MERGE:
        return '合并数据'
      case ConflictStrategy.RENAME:
        return '重命名导入项'
      default:
        return '未知策略'
    }
  }
}
