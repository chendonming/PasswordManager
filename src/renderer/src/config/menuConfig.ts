// 菜单配置文件
// 数据驱动的菜单配置，便于扩展和维护

export interface MenuItem {
  id?: string
  type?: 'submenu' | 'divider' | 'item'
  label?: string
  icon?: string
  iconClass?: string
  description?: string
  disabled?: boolean
  dangerous?: boolean
  action?: string
  actionType?: 'import' | 'export' | 'tool' | 'help'
  children?: MenuItem[]
  submenuWidth?: string
}

export interface MenuConfig {
  id: string
  label: string
  width?: string
  items: MenuItem[]
}

// 默认菜单配置
export const defaultMenuConfig: MenuConfig[] = [
  {
    id: 'file',
    label: '文件',
    width: 'w-48',
    items: [
      {
        id: 'import',
        type: 'submenu',
        label: '导入',
        icon: '📥',
        submenuWidth: 'w-56',
        children: [
          {
            id: 'import-csv',
            label: 'CSV文件',
            icon: '📄',
            iconClass: 'text-orange-500',
            description: '从CSV文件导入密码',
            action: 'csv',
            actionType: 'import'
          },
          {
            id: 'import-encrypted',
            label: '加密归档',
            icon: '🔒',
            iconClass: 'text-green-500',
            description: '从加密归档文件导入',
            action: 'encrypted',
            actionType: 'import'
          },
          {
            type: 'divider'
          },
          {
            id: 'import-chrome',
            label: 'Chrome浏览器',
            icon: '🌐',
            description: '即将支持',
            disabled: true
          },
          {
            id: 'import-firefox',
            label: 'Firefox浏览器',
            icon: '🦊',
            description: '即将支持',
            disabled: true
          },
          {
            id: 'import-keepass',
            label: 'KeePass',
            icon: '🗝️',
            description: '即将支持',
            disabled: true
          }
        ]
      },
      {
        id: 'export',
        type: 'submenu',
        label: '导出',
        icon: '📤',
        submenuWidth: 'w-56',
        children: [
          {
            id: 'export-encrypted',
            label: '加密归档',
            icon: '🔒',
            iconClass: 'text-green-500',
            description: '导出为加密归档文件',
            action: 'encrypted',
            actionType: 'export'
          },
          {
            type: 'divider'
          },
          {
            id: 'export-csv',
            label: '明文CSV',
            icon: '⚠️',
            iconClass: 'text-red-500',
            description: '不安全！仅用于迁移',
            dangerous: true,
            action: 'csv',
            actionType: 'export'
          }
        ]
      }
    ]
  },
  {
    id: 'tools',
    label: '工具',
    width: 'w-48',
    items: [
      {
        id: 'generator',
        label: '密码生成器',
        icon: '🔑',
        action: 'generator',
        actionType: 'tool'
      },
      {
        id: 'security-check',
        label: '安全检查',
        icon: '🛡️',
        action: 'security-check',
        actionType: 'tool'
      },
      {
        id: 'data-backup',
        label: '数据备份',
        icon: '💾',
        action: 'backup',
        actionType: 'tool'
      },
      {
        type: 'divider'
      },
      {
        id: 'settings',
        label: '设置',
        icon: '⚙️',
        action: 'settings',
        actionType: 'tool'
      }
    ]
  },
  {
    id: 'help',
    label: '帮助',
    width: 'w-48',
    items: [
      {
        id: 'documentation',
        label: '用户手册',
        icon: '📖',
        action: 'documentation',
        actionType: 'help'
      },
      {
        id: 'shortcuts',
        label: '快捷键',
        icon: '⌨️',
        action: 'shortcuts',
        actionType: 'help'
      },
      {
        type: 'divider'
      },
      {
        id: 'feedback',
        label: '问题反馈',
        icon: '📝',
        action: 'feedback',
        actionType: 'help'
      },
      {
        id: 'about',
        label: '关于',
        icon: 'ℹ️',
        action: 'about',
        actionType: 'help'
      }
    ]
  }
]

// 菜单配置工具函数
export class MenuConfigManager {
  private config: MenuConfig[]

  constructor(initialConfig: MenuConfig[] = defaultMenuConfig) {
    this.config = JSON.parse(JSON.stringify(initialConfig)) // 深拷贝
  }

  // 获取当前配置
  getConfig(): MenuConfig[] {
    return this.config
  }

  // 添加菜单项
  addMenuItem(menuId: string, item: MenuItem, position?: number): boolean {
    const menu = this.config.find((m) => m.id === menuId)
    if (!menu) return false

    if (position !== undefined) {
      menu.items.splice(position, 0, item)
    } else {
      menu.items.push(item)
    }
    return true
  }

  // 删除菜单项
  removeMenuItem(menuId: string, itemId: string): boolean {
    const menu = this.config.find((m) => m.id === menuId)
    if (!menu) return false

    const index = menu.items.findIndex((item) => item.id === itemId)
    if (index === -1) return false

    menu.items.splice(index, 1)
    return true
  }

  // 更新菜单项
  updateMenuItem(menuId: string, itemId: string, updates: Partial<MenuItem>): boolean {
    const menu = this.config.find((m) => m.id === menuId)
    if (!menu) return false

    const item = menu.items.find((item) => item.id === itemId)
    if (!item) return false

    Object.assign(item, updates)
    return true
  }

  // 启用/禁用菜单项
  setMenuItemEnabled(menuId: string, itemId: string, enabled: boolean): boolean {
    return this.updateMenuItem(menuId, itemId, { disabled: !enabled })
  }

  // 添加新菜单
  addMenu(menu: MenuConfig, position?: number): void {
    if (position !== undefined) {
      this.config.splice(position, 0, menu)
    } else {
      this.config.push(menu)
    }
  }

  // 删除菜单
  removeMenu(menuId: string): boolean {
    const index = this.config.findIndex((m) => m.id === menuId)
    if (index === -1) return false

    this.config.splice(index, 1)
    return true
  }

  // 重置为默认配置
  reset(): void {
    this.config = JSON.parse(JSON.stringify(defaultMenuConfig))
  }

  // 从JSON字符串加载配置
  loadFromJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed)) {
        this.config = parsed
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 导出配置为JSON字符串
  toJSON(): string {
    return JSON.stringify(this.config, null, 2)
  }
}

// 创建默认配置管理器实例
export const menuConfigManager = new MenuConfigManager()
