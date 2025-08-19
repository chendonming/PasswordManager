/**
 * 导出管理器实现
 * 使用策略模式管理多种导出格式
 */

import {
  IExportManager,
  IExporter,
  ExportFormat,
  ExportData,
  ExportConfig,
  OperationResult,
  ProgressCallback
} from '../../common/types/import-export'

/**
 * 导出管理器实现类
 * 负责管理所有注册的导出器，并提供统一的导出接口
 */
export class ExportManager implements IExportManager {
  private exporters: Map<string, IExporter> = new Map()
  private formatToExporterMap: Map<ExportFormat, IExporter> = new Map()

  /**
   * 注册导出器
   * @param exporter 导出器实例
   */
  registerExporter(exporter: IExporter): void {
    if (this.exporters.has(exporter.name)) {
      throw new Error(`导出器 "${exporter.name}" 已经注册`)
    }

    this.exporters.set(exporter.name, exporter)

    // 更新格式映射
    for (const format of exporter.supportedFormats) {
      if (this.formatToExporterMap.has(format)) {
        console.warn(
          `格式 "${format}" 已被导出器 "${this.formatToExporterMap.get(format)?.name}" 占用，将被 "${exporter.name}" 覆盖`
        )
      }
      this.formatToExporterMap.set(format, exporter)
    }

    console.log(
      `导出器 "${exporter.name}" 注册成功，支持格式: ${exporter.supportedFormats.join(', ')}`
    )
  }

  /**
   * 注销导出器
   * @param name 导出器名称
   */
  unregisterExporter(name: string): void {
    const exporter = this.exporters.get(name)
    if (!exporter) {
      throw new Error(`导出器 "${name}" 不存在`)
    }

    // 移除格式映射
    for (const format of exporter.supportedFormats) {
      if (this.formatToExporterMap.get(format) === exporter) {
        this.formatToExporterMap.delete(format)
      }
    }

    this.exporters.delete(name)
    console.log(`导出器 "${name}" 注销成功`)
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.formatToExporterMap.keys())
  }

  /**
   * 获取指定格式的导出器
   * @param format 导出格式
   */
  getExporter(format: ExportFormat): IExporter | null {
    return this.formatToExporterMap.get(format) || null
  }

  /**
   * 获取所有导出器
   */
  getAllExporters(): IExporter[] {
    return Array.from(this.exporters.values())
  }

  /**
   * 导出数据
   * @param data 要导出的数据
   * @param config 导出配置
   * @param progressCallback 进度回调
   */
  async export(
    data: ExportData,
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<string>> {
    try {
      // 查找对应的导出器
      const exporter = this.getExporter(config.format)
      if (!exporter) {
        return {
          success: false,
          message: `不支持的导出格式: ${config.format}`
        }
      }

      // 验证配置
      const validationResult = exporter.validateConfig(config)
      if (!validationResult.success) {
        return {
          success: false,
          message: `配置验证失败: ${validationResult.message}`,
          errors: validationResult.errors
        }
      }

      // 执行导出
      progressCallback?.({
        current: 0,
        total: 100,
        percentage: 0,
        message: '开始导出...'
      })

      const result = await exporter.export(data, config, progressCallback)

      if (result.success) {
        progressCallback?.({
          current: 100,
          total: 100,
          percentage: 100,
          message: '导出完成'
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `导出过程中发生错误: ${errorMessage}`,
        errors: [errorMessage]
      }
    }
  }

  /**
   * 获取导出格式的默认配置
   * @param format 导出格式
   */
  getDefaultConfig(format: ExportFormat): Partial<ExportConfig> | null {
    const exporter = this.getExporter(format)
    if (!exporter) {
      return null
    }
    return exporter.getDefaultConfig(format)
  }

  /**
   * 检查是否支持指定格式
   * @param format 导出格式
   */
  isFormatSupported(format: ExportFormat): boolean {
    return this.formatToExporterMap.has(format)
  }

  /**
   * 获取导出器统计信息
   */
  getStatistics(): {
    totalExporters: number
    supportedFormats: number
    exporterList: Array<{ name: string; formats: ExportFormat[] }>
  } {
    const exporterList = Array.from(this.exporters.values()).map((exporter) => ({
      name: exporter.name,
      formats: exporter.supportedFormats
    }))

    return {
      totalExporters: this.exporters.size,
      supportedFormats: this.formatToExporterMap.size,
      exporterList
    }
  }

  /**
   * 重置所有注册的导出器
   */
  clear(): void {
    this.exporters.clear()
    this.formatToExporterMap.clear()
    console.log('所有导出器已清除')
  }
}
