/**
 * 导入导出功能的类型定义
 * 使用策略模式设计可扩展的导入导出系统
 */

import { DecryptedPasswordEntry, Tag } from './database'

// =====================================
// 基础类型定义
// =====================================

/** 导入导出操作结果 */
export interface OperationResult<T = unknown> {
  success: boolean
  message: string
  data?: T
  warnings?: string[]
  errors?: string[]
}

/** 导入导出进度信息 */
export interface ProgressInfo {
  current: number
  total: number
  percentage: number
  message: string
}

/** 进度回调函数 */
export type ProgressCallback = (progress: ProgressInfo) => void

// =====================================
// 导出相关类型
// =====================================

/** 导出格式枚举 */
export enum ExportFormat {
  PLAIN_CSV = 'plain_csv',
  ENCRYPTED_ARCHIVE = 'encrypted_archive',
  JSON = 'json',
  KEEPASS = 'keepass'
}

/** 导出配置基类 */
export interface BaseExportConfig {
  format: ExportFormat
  outputPath: string
  includePasswords: boolean
  includeTags: boolean
  includeMetadata: boolean
}

/** 明文CSV导出配置 */
export interface PlainCsvExportConfig extends BaseExportConfig {
  format: ExportFormat.PLAIN_CSV
  delimiter: string
  includeHeaders: boolean
  encoding: 'utf8' | 'utf16le' | 'ascii'
  /** 是否确认导出明文（安全警告确认） */
  confirmPlaintextExport: boolean
}

/** 加密归档导出配置 */
export interface EncryptedArchiveExportConfig extends BaseExportConfig {
  format: ExportFormat.ENCRYPTED_ARCHIVE
  /** 新的导出密码 */
  exportPassword: string
  /** 压缩级别 0-9 */
  compressionLevel: number
  /** 包含的条目ID列表，空数组表示全部 */
  entryIds: number[]
}

/** JSON导出配置 */
export interface JsonExportConfig extends BaseExportConfig {
  format: ExportFormat.JSON
  prettify: boolean
  /** 是否加密（如果加密需要密码） */
  encrypted: boolean
  exportPassword?: string
}

/** KeePass导出配置 */
export interface KeePassExportConfig extends BaseExportConfig {
  format: ExportFormat.KEEPASS
  version: '1.x' | '2.x'
  exportPassword: string
}

/** 联合导出配置类型 */
export type ExportConfig =
  | PlainCsvExportConfig
  | EncryptedArchiveExportConfig
  | JsonExportConfig
  | KeePassExportConfig

/** 导出数据结构 */
export interface ExportData {
  entries: DecryptedPasswordEntry[]
  tags: Tag[]
  metadata: {
    exportedAt: string
    version: string
    totalEntries: number
    totalTags: number
  }
}

// =====================================
// 导入相关类型
// =====================================

/** 导入格式枚举 */
export enum ImportFormat {
  PLAIN_CSV = 'plain_csv',
  ENCRYPTED_ARCHIVE = 'encrypted_archive',
  JSON = 'json',
  KEEPASS = 'keepass',
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  LASTPASS = 'lastpass',
  ONEPASSWORD = '1password'
}

/** 导入配置基类 */
export interface BaseImportConfig {
  format: ImportFormat
  filePath: string
  /** 冲突处理策略 */
  conflictStrategy: ConflictStrategy
  /** 是否创建备份 */
  createBackup: boolean
}

/** 冲突处理策略 */
export enum ConflictStrategy {
  SKIP = 'skip', // 跳过重复项
  OVERWRITE = 'overwrite', // 覆盖现有项
  MERGE = 'merge', // 合并数据
  RENAME = 'rename' // 重命名导入项
}

/** 明文CSV导入配置 */
export interface PlainCsvImportConfig extends BaseImportConfig {
  format: ImportFormat.PLAIN_CSV
  delimiter: string
  hasHeaders: boolean
  encoding: 'utf8' | 'utf16le' | 'ascii'
  /** CSV列映射 */
  columnMapping: CsvColumnMapping
}

/** CSV列映射 */
export interface CsvColumnMapping {
  title: number
  username?: number
  password: number
  url?: number
  description?: number
  tags?: number
}

/** 加密归档导入配置 */
export interface EncryptedArchiveImportConfig extends BaseImportConfig {
  format: ImportFormat.ENCRYPTED_ARCHIVE
  /** 解密密码 */
  password: string
}

/** JSON导入配置 */
export interface JsonImportConfig extends BaseImportConfig {
  format: ImportFormat.JSON
  /** 如果是加密JSON，需要提供密码 */
  password?: string
}

/** KeePass导入配置 */
export interface KeePassImportConfig extends BaseImportConfig {
  format: ImportFormat.KEEPASS
  password: string
  version?: string // 自动检测或手动指定
}

/** 浏览器导入配置 */
export interface BrowserImportConfig extends BaseImportConfig {
  format: ImportFormat.CHROME | ImportFormat.FIREFOX
  /** 浏览器配置文件路径（可选） */
  profilePath?: string
}

/** 第三方密码管理器导入配置 */
export interface ThirdPartyImportConfig extends BaseImportConfig {
  format: ImportFormat.LASTPASS | ImportFormat.ONEPASSWORD
  /** 可能需要的额外认证信息 */
  credentials?: Record<string, string>
}

/** 联合导入配置类型 */
export type ImportConfig =
  | PlainCsvImportConfig
  | EncryptedArchiveImportConfig
  | JsonImportConfig
  | KeePassImportConfig
  | BrowserImportConfig
  | ThirdPartyImportConfig

/** 导入预览数据 */
export interface ImportPreviewData {
  entries: Partial<DecryptedPasswordEntry>[]
  tags: Partial<Tag>[]
  conflicts: ImportConflict[]
  statistics: ImportStatistics
}

/** 导入冲突信息 */
export interface ImportConflict {
  type: 'entry' | 'tag'
  importItem: Partial<DecryptedPasswordEntry> | Partial<Tag>
  existingItem: DecryptedPasswordEntry | Tag
  conflictReason: string
  suggestedAction: ConflictStrategy
}

/** 导入统计信息 */
export interface ImportStatistics {
  totalEntries: number
  totalTags: number
  newEntries: number
  conflictingEntries: number
  duplicateEntries: number
  invalidEntries: number
}

// =====================================
// 接口定义
// =====================================

/** 导出器接口 */
export interface IExporter {
  /** 导出器名称 */
  readonly name: string

  /** 支持的导出格式 */
  readonly supportedFormats: ExportFormat[]

  /** 验证导出配置 */
  validateConfig(config: ExportConfig): OperationResult<boolean>

  /** 导出数据 */
  export(
    data: ExportData,
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<string>>

  /** 获取默认配置 */
  getDefaultConfig(format: ExportFormat): Partial<ExportConfig>
}

/** 导入器接口 */
export interface IImporter {
  /** 导入器名称 */
  readonly name: string

  /** 支持的导入格式 */
  readonly supportedFormats: ImportFormat[]

  /** 验证导入配置 */
  validateConfig(config: ImportConfig): OperationResult<boolean>

  /** 预览导入数据（不实际导入） */
  preview(config: ImportConfig): Promise<OperationResult<ImportPreviewData>>

  /** 导入数据 */
  import(
    config: ImportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<ImportPreviewData>>

  /** 获取默认配置 */
  getDefaultConfig(format: ImportFormat): Partial<ImportConfig>
}

// =====================================
// 管理器接口
// =====================================

/** 导出管理器接口 */
export interface IExportManager {
  /** 注册导出器 */
  registerExporter(exporter: IExporter): void

  /** 注销导出器 */
  unregisterExporter(name: string): void

  /** 获取支持的格式列表 */
  getSupportedFormats(): ExportFormat[]

  /** 获取指定格式的导出器 */
  getExporter(format: ExportFormat): IExporter | null

  /** 获取所有导出器 */
  getAllExporters(): IExporter[]

  /** 导出数据 */
  export(
    data: ExportData,
    config: ExportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<string>>

  /** 检查是否支持指定格式 */
  isFormatSupported(format: ExportFormat): boolean

  /** 获取统计信息 */
  getStatistics(): {
    totalExporters: number
    supportedFormats: number
    exporterList: Array<{ name: string; formats: ExportFormat[] }>
  }

  /** 清除所有导出器 */
  clear(): void
}

/** 导入管理器接口 */
export interface IImportManager {
  /** 注册导入器 */
  registerImporter(importer: IImporter): void

  /** 注销导入器 */
  unregisterImporter(name: string): void

  /** 获取支持的格式列表 */
  getSupportedFormats(): ImportFormat[]

  /** 获取指定格式的导入器 */
  getImporter(format: ImportFormat): IImporter | null

  /** 获取所有导入器 */
  getAllImporters(): IImporter[]

  /** 预览导入 */
  preview(config: ImportConfig): Promise<OperationResult<ImportPreviewData>>

  /** 导入数据 */
  import(
    config: ImportConfig,
    progressCallback?: ProgressCallback
  ): Promise<OperationResult<ImportPreviewData>>

  /** 检查是否支持指定格式 */
  isFormatSupported(format: ImportFormat): boolean

  /** 获取统计信息 */
  getStatistics(): {
    totalImporters: number
    supportedFormats: number
    importerList: Array<{ name: string; formats: ImportFormat[] }>
  }

  /** 清除所有导入器 */
  clear(): void
}
