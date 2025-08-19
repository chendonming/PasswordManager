/**
 * 导入管理器实现
 * 使用策略模式管理多种导入格式
 */

import {
  IImportManager,
  IImporter,
  ImportFormat,
  ImportConfig,
  ImportPreviewData,
  OperationResult,
  ProgressCallback
} from '../../common/types/import-export'

/**
 * 导入管理器实现类
 * 负责管理所有注册的导入器，并提供统一的导入接口
 */
export class ImportManager implements IImportManager {
  private importers: Map<string, IImporter> = new Map()
  private formatToImporterMap: Map<ImportFormat, IImporter> = new Map()

  /**
   * 注册导入器
   * @param importer 导入器实例
   */
  registerImporter(importer: IImporter): void {
    if (this.importers.has(importer.name)) {
      throw new Error(`导入器 "${importer.name}" 已经注册`)
    }

    this.importers.set(importer.name, importer)

    // 更新格式映射
    for (const format of importer.supportedFormats) {
      if (this.formatToImporterMap.has(format)) {
        console.warn(
          `格式 "${format}" 已被导入器 "${this.formatToImporterMap.get(format)?.name}" 占用，将被 "${importer.name}" 覆盖`
        )
      }
      this.formatToImporterMap.set(format, importer)
    }

    console.log(
      `导入器 "${importer.name}" 注册成功，支持格式: ${importer.supportedFormats.join(', ')}`
    )
  }

  /**
   * 注销导入器
   * @param name 导入器名称
   */
  unregisterImporter(name: string): void {
    const importer = this.importers.get(name)
    if (!importer) {
      throw new Error(`导入器 "${name}" 不存在`)
    }

    // 移除格式映射
    for (const format of importer.supportedFormats) {
      if (this.formatToImporterMap.get(format) === importer) {
        this.formatToImporterMap.delete(format)
      }
    }

    this.importers.delete(name)
    console.log(`导入器 "${name}" 注销成功`)
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): ImportFormat[] {
    return Array.from(this.formatToImporterMap.keys())
  }

  /**
   * 获取指定格式的导入器
   * @param format 导入格式
   */
  getImporter(format: ImportFormat): IImporter | null {
    return this.formatToImporterMap.get(format) || null
  }

  /**
   * 获取所有导入器
   */
  getAllImporters(): IImporter[] {
    return Array.from(this.importers.values())
  }

  /**
   * 预览导入数据
   * @param config 导入配置
   */
  async preview(config: ImportConfig): Promise<OperationResult<ImportPreviewData>> {
    try {
      // 查找对应的导入器
      const importer = this.getImporter(config.format)
      if (!importer) {
        return {
          success: false,
          message: `不支持的导入格式: ${config.format}`
        }
      }

      // 验证配置
      const validationResult = importer.validateConfig(config)
      if (!validationResult.success) {
        return {
          success: false,
          message: `配置验证失败: ${validationResult.message}`,
          errors: validationResult.errors
        }
      }

      // 执行预览
      const result = await importer.preview(config)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `预览过程中发生错误: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 导入数据
   * @param config 导入配置
   * @param progressCallback 进度回调
   */
  async import(
    config: ImportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<ImportPreviewData>> {
    try {
      // 查找对应的导入器
      const importer = this.getImporter(config.format)
      if (!importer) {
        return {
          success: false,
          message: `不支持的导入格式: ${config.format}`
        }
      }

      // 验证配置
      const validationResult = importer.validateConfig(config)
      if (!validationResult.success) {
        return {
          success: false,
          message: `配置验证失败: ${validationResult.message}`,
          errors: validationResult.errors
        }
      }

      // 执行导入
      progressCallback?.({
        current: 0,
        total: 100,
        percentage: 0,
        message: '开始导入...'
      })

      const result = await importer.import(config, progressCallback)

      if (result.success) {
        progressCallback?.({
          current: 100,
          total: 100,
          percentage: 100,
          message: '导入完成'
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `导入过程中发生错误: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 获取导入格式的默认配置
   * @param format 导入格式
   */
  getDefaultConfig(format: ImportFormat): Partial<ImportConfig> | null {
    const importer = this.getImporter(format)
    if (!importer) {
      return null
    }
    return importer.getDefaultConfig(format)
  }

  /**
   * 检查是否支持指定格式
   * @param format 导入格式
   */
  isFormatSupported(format: ImportFormat): boolean {
    return this.formatToImporterMap.has(format)
  }

  /**
   * 获取导入器统计信息
   */
  getStatistics(): {
    totalImporters: number
    supportedFormats: number
    importerList: Array<{ name: string; formats: ImportFormat[] }>
  } {
    const importerList = Array.from(this.importers.values()).map((importer) => ({
      name: importer.name,
      formats: importer.supportedFormats
    }))

    return {
      totalImporters: this.importers.size,
      supportedFormats: this.formatToImporterMap.size,
      importerList
    }
  }

  /**
   * 重置所有注册的导入器
   */
  clear(): void {
    this.importers.clear()
    this.formatToImporterMap.clear()
    console.log('所有导入器已清除')
  }

  /**
   * 批量验证导入配置
   * @param configs 导入配置数组
   */
  async validateConfigs(configs: ImportConfig[]): Promise<OperationResult<boolean>[]> {
    const results: OperationResult<boolean>[] = []

    for (const config of configs) {
      const importer = this.getImporter(config.format)
      if (!importer) {
        results.push({
          success: false,
          message: `不支持的导入格式: ${config.format}`
        })
        continue
      }

      try {
        const result = importer.validateConfig(config)
        results.push(result)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        results.push({
          success: false,
          message: `验证配置时发生错误: ${errorMessage}`,
          errors: [errorMessage]
        })
      }
    }

    return results
  }
}
