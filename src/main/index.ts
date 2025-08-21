import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { MainProcessManager } from './MainProcessManager'

// 全局服务管理器
let mainProcessManager: MainProcessManager | null = null
let mainWindow: BrowserWindow | null = null

// Single instance lock: ensure second Electron launches exit immediately.
// Place this early so the second instance won't create its own window.
const gotTheLockEarly = app.requestSingleInstanceLock()
if (!gotTheLockEarly) {
  // If we cannot get the lock, another instance is running -> quit.
  app.quit()
  // Also exit the process to be explicit.
  process.exit(0)
}

// Register second-instance handler early so the main process can receive
// protocol URLs forwarded by the OS when another instance is launched.
app.on('second-instance', (_event, argv: unknown[] /*, workingDirectory */) => {
  // argv may contain descriptive text plus the pm:// URL. Extract pm://...
  const raw = argv.find((a) => typeof a === 'string' && a.includes('pm://')) as string | undefined
  if (!raw) return
  const idx = raw.indexOf('pm://')
  const url = idx >= 0 ? raw.slice(idx) : raw
  if (!url) return
  // If mainWindow exists, forward; otherwise the handler will be called later
  // after createWindow and whenReady, so guard accordingly.
  if (mainWindow) {
    try {
      mainWindow.webContents.send('oauth:callback', url)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    } catch (e) {
      console.warn('second-instance forwarding failed:', e)
    }
  }
})

// 主题配置
const THEME_COLORS = {
  light: '#ffffff',
  dark: '#1f2937' // gray-800
}

async function initializeServices(): Promise<void> {
  try {
    mainProcessManager = new MainProcessManager()
    await mainProcessManager.initialize()
    console.log('✅ 主进程服务初始化完成')
  } catch (error) {
    console.error('❌ 主进程服务初始化失败:', error)
    // 如果初始化失败，显示错误对话框并退出
    await dialog.showErrorBox(
      '初始化失败',
      `应用初始化失败，程序将退出。\n\n错误信息: ${error instanceof Error ? error.message : '未知错误'}`
    )
    app.quit()
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // 无边框窗口
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // 隐藏标题栏
    backgroundColor: THEME_COLORS.light, // 默认浅色主题
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // 初始化服务
  await initializeServices()

  // 注册自定义协议处理 (pm://)
  try {
    // 在开发环境下，需要将 electron 可执行路径和入口脚本作为参数传入
    // 否则 Windows 可能无法将 pm:// 请求路由到当前运行的 electron 进程
    if (process.defaultApp) {
      // 当以 `electron .` 启动时，process.argv[1] 是入口脚本
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('pm', process.execPath, [process.argv[1]])
      }
    } else {
      // 打包后直接注册即可
      app.setAsDefaultProtocolClient('pm')
    }
  } catch (e) {
    console.warn('注册自定义协议 pm:// 失败:', e)
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test (保留原有的ping测试)
  ipcMain.on('ping', () => console.log('pong'))

  // 窗口控制 IPC 处理器
  ipcMain.handle('window:minimize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.minimize()
    }
  })

  ipcMain.handle('window:maximize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      if (focusedWindow.isMaximized()) {
        focusedWindow.unmaximize()
      } else {
        focusedWindow.maximize()
      }
    }
  })

  ipcMain.handle('window:close', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })

  // 主题变更处理器
  ipcMain.handle('theme:set-background', (_, isDark: boolean) => {
    const backgroundColor = isDark ? THEME_COLORS.dark : THEME_COLORS.light
    if (mainWindow) {
      mainWindow.setBackgroundColor(backgroundColor)
    }
  })

  createWindow()

  // 如果应用是通过自定义协议直接启动（应用未运行时由系统传入的 pm:// URL），
  // 则 process.argv 中可能包含该 URL。我们需要在渲染器加载完成后将其转发。
  try {
    const initialArg = process.argv.find((a) => typeof a === 'string' && a.includes('pm://')) as
      | string
      | undefined
    if (initialArg && mainWindow) {
      const idx = initialArg.indexOf('pm://')
      const url = idx >= 0 ? initialArg.slice(idx) : initialArg
      // 如果页面尚未加载完，等待 did-finish-load 再发送
      mainWindow.webContents.once('did-finish-load', () => {
        try {
          mainWindow?.webContents.send('oauth:callback', url)
          if (mainWindow?.isMinimized()) mainWindow.restore()
          mainWindow?.focus()
        } catch (e) {
          console.warn('forward initial protocol url failed:', e)
        }
      })
    }
  } catch (e) {
    console.warn('initial protocol handling failed:', e)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // macOS: 通过 open-url 事件获取协议回调
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (mainWindow) {
      mainWindow.webContents.send('oauth:callback', url)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 清理服务资源
    if (mainProcessManager) {
      console.log('Hook: window-all-closed -> calling cleanup')
      mainProcessManager.cleanup()
      mainProcessManager = null
    }
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', async () => {
  console.log('Hook: before-quit')
  if (mainProcessManager) {
    try {
      console.log('Hook: before-quit -> calling shutdown')
      await mainProcessManager.shutdown()
    } catch (err) {
      console.error('before-quit shutdown 失败:', err)
      // fallback to sync cleanup
      try {
        mainProcessManager.cleanup()
      } catch (e) {
        console.error('before-quit cleanup 失败:', e)
      }
    }
    mainProcessManager = null
  }
})

// 在应用即将完全退出时，确保先锁定并清理敏感内存
app.on('will-quit', async () => {
  console.log('Hook: will-quit')
  if (mainProcessManager) {
    try {
      console.log('Hook: will-quit -> calling shutdown')
      await mainProcessManager.shutdown()
      mainProcessManager = null
    } catch (err) {
      console.error('will-quit shutdown 失败:', err)
    }
  }
})

// 捕获进程信号（例如在开发环境按 Ctrl+C）
process.on('SIGINT', async () => {
  console.log('Hook: SIGINT received — attempting graceful shutdown')
  if (mainProcessManager) {
    try {
      console.log('Hook: SIGINT -> calling shutdown')
      await mainProcessManager.shutdown()
    } catch (err) {
      console.error('SIGINT shutdown 失败:', err)
      try {
        mainProcessManager.cleanup()
      } catch (e) {
        console.error('SIGINT cleanup 也失败:', e)
      }
    }
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Hook: SIGTERM received — attempting graceful shutdown')
  if (mainProcessManager) {
    try {
      console.log('Hook: SIGTERM -> calling shutdown')
      await mainProcessManager.shutdown()
    } catch (err) {
      console.error('SIGTERM shutdown 失败:', err)
      try {
        mainProcessManager.cleanup()
      } catch (e) {
        console.error('SIGTERM cleanup 也失败:', e)
      }
    }
  }
  process.exit(0)
})

// 捕获未处理异常，尝试清理后退出
process.on('uncaughtException', async (err) => {
  console.error('Hook: uncaughtException:', err)
  if (mainProcessManager) {
    try {
      console.log('Hook: uncaughtException -> calling shutdown')
      await mainProcessManager.shutdown()
    } catch (e) {
      console.error('uncaughtException shutdown 失败:', e)
      try {
        mainProcessManager.cleanup()
      } catch (e2) {
        console.error('uncaughtException cleanup 也失败:', e2)
      }
    }
  }
  process.exit(1)
})

process.on('unhandledRejection', async (reason) => {
  console.error('Hook: unhandledRejection:', reason)
  if (mainProcessManager) {
    try {
      console.log('Hook: unhandledRejection -> calling shutdown')
      await mainProcessManager.shutdown()
    } catch (e) {
      console.error('unhandledRejection shutdown 失败:', e)
      try {
        mainProcessManager.cleanup()
      } catch (e2) {
        console.error('unhandledRejection cleanup 也失败:', e2)
      }
    }
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
