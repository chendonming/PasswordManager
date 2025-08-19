/**
 * 导入导出管理器工厂
 * 负责创建和配置导入导出管理器及其策略
 */

import { ExportManager } from './ExportManager'
import { ImportManager } from './ImportManager'
import { PlainCsvExporter } from './exporters/PlainCsvExporter'
import { EncryptedArchiveExporter } from './exporters/EncryptedArchiveExporter'
import { PlainCsvImporter } from './importers/PlainCsvImporter'
import {
  IExportManager,
  IImportManager,
  ExportFormat,
  ImportFormat
} from '../../common/types/import-export'

/**
 * 导入导出服务工厂
 * 使用单例模式确保全局唯一的管理器实例
 */
export class ImportExportFactory {
  private static exportManagerInstance: IExportManager | null = null
  private static importManagerInstance: IImportManager | null = null

  /**
   * 获取导出管理器实例
   */
  static getExportManager(): IExportManager {
    if (!this.exportManagerInstance) {
      this.exportManagerInstance = this.createExportManager()
    }
    return this.exportManagerInstance
  }

  /**
   * 获取导入管理器实例
   */
  static getImportManager(): IImportManager {
    if (!this.importManagerInstance) {
      this.importManagerInstance = this.createImportManager()
    }
    return this.importManagerInstance
  }

  /**
   * 创建并配置导出管理器
   */
  private static createExportManager(): IExportManager {
    const manager = new ExportManager()

    // 注册所有支持的导出器
    this.registerExporters(manager)

    console.log('导出管理器初始化完成')
    return manager
  }

  /**
   * 创建并配置导入管理器
   */
  private static createImportManager(): IImportManager {
    const manager = new ImportManager()

    // 注册所有支持的导入器
    this.registerImporters(manager)

    console.log('导入管理器初始化完成')
    return manager
  }

  /**
   * 注册所有导出器
   */
  private static registerExporters(manager: IExportManager): void {
    try {
      // 注册明文CSV导出器
      manager.registerExporter(new PlainCsvExporter())

      // 注册加密归档导出器
      manager.registerExporter(new EncryptedArchiveExporter())

      // TODO: 注册其他导出器
      // manager.registerExporter(new JsonExporter())
      // manager.registerExporter(new KeePassExporter())

      const stats = manager.getStatistics()
      console.log(`已注册 ${stats.totalExporters} 个导出器，支持 ${stats.supportedFormats} 种格式`)
    } catch (error) {
      console.error('注册导出器时发生错误:', error)
      throw error
    }
  }

  /**
   * 注册所有导入器
   */
  private static registerImporters(manager: IImportManager): void {
    try {
      // 注册明文CSV导入器
      manager.registerImporter(new PlainCsvImporter())

      // TODO: 注册其他导入器
      // manager.registerImporter(new EncryptedArchiveImporter())
      // manager.registerImporter(new JsonImporter())
      // manager.registerImporter(new KeePassImporter())
      // manager.registerImporter(new ChromeImporter())
      // manager.registerImporter(new FirefoxImporter())

      const stats = manager.getStatistics()
      console.log(`已注册 ${stats.totalImporters} 个导入器，支持 ${stats.supportedFormats} 种格式`)
    } catch (error) {
      console.error('注册导入器时发生错误:', error)
      throw error
    }
  }

  /**
   * 重置管理器实例（主要用于测试）
   */
  static reset(): void {
    if (this.exportManagerInstance) {
      this.exportManagerInstance.clear()
      this.exportManagerInstance = null
    }

    if (this.importManagerInstance) {
      this.importManagerInstance.clear()
      this.importManagerInstance = null
    }

    console.log('导入导出管理器已重置')
  }

  /**
   * 获取支持的导出格式列表
   */
  static getSupportedExportFormats(): ExportFormat[] {
    return this.getExportManager().getSupportedFormats()
  }

  /**
   * 获取支持的导入格式列表
   */
  static getSupportedImportFormats(): ImportFormat[] {
    return this.getImportManager().getSupportedFormats()
  }

  /**
   * 检查是否支持指定的导出格式
   */
  static isExportFormatSupported(format: ExportFormat): boolean {
    return this.getExportManager().isFormatSupported(format)
  }

  /**
   * 检查是否支持指定的导入格式
   */
  static isImportFormatSupported(format: ImportFormat): boolean {
    return this.getImportManager().isFormatSupported(format)
  }

  /**
   * 获取系统统计信息
   */
  static getSystemStatistics(): {
    export: ReturnType<IExportManager['getStatistics']>
    import: ReturnType<IImportManager['getStatistics']>
  } {
    return {
      export: this.getExportManager().getStatistics(),
      import: this.getImportManager().getStatistics()
    }
  }

  /**
   * 预热系统（提前初始化所有管理器）
   */
  static warmUp(): void {
    this.getExportManager()
    this.getImportManager()
    console.log('导入导出系统预热完成')
  }
}
