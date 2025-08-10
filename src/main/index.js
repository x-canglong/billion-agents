import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initShortcuts, unregisterAllShortcuts } from './shortcuts.js'
import { initLogger, logInfo, logError, logWarn, getLogPath } from './logger.js'

async function createWindow() {
  try {
    await logInfo('开始创建主窗口')

    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        autoplayPolicy: 'no-user-gesture-required',
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        devTools: true  // 明确启用开发者工具
      }
    })

    // 错误处理
    mainWindow.webContents.on('crashed', async () => {
      await logError('渲染进程崩溃')
    })

    mainWindow.webContents.on('unresponsive', async () => {
      await logWarn('渲染进程无响应')
    })

    mainWindow.webContents.on('responsive', async () => {
      await logInfo('渲染进程恢复响应')
    })

    // 监听加载错误
    mainWindow.webContents.on(
      'did-fail-load',
      async (event, errorCode, errorDescription, validatedURL) => {
        await logError('页面加载失败', {
          errorCode,
          errorDescription,
          url: validatedURL
        })
      }
    )

    // 监听页面加载完成
    mainWindow.webContents.once('did-finish-load', async () => {
      await logInfo('页面加载完成')
    })

    mainWindow.on('ready-to-show', async () => {
      await logInfo('窗口准备显示')
      mainWindow.show()

      // 初始化快捷键
      initShortcuts(mainWindow)
      await logInfo('快捷键初始化完成')
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 资源路径信息
    const resourcePath = join(__dirname, '../renderer/index.html')
    await logInfo('资源路径信息', {
      __dirname,
      resourcePath,
      isDev: is.dev,
      isPackaged: app.isPackaged,
      rendererUrl: process.env['ELECTRON_RENDERER_URL']
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      await logInfo('开发模式：加载开发服务器', process.env['ELECTRON_RENDERER_URL'])
      await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      await logInfo('生产模式：加载本地文件', resourcePath)
      await mainWindow.loadFile(resourcePath)
    }

    return mainWindow
  } catch (error) {
    await logError('创建窗口失败', error)
    throw error
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    // 初始化日志系统
    await initLogger()

    // 确保开发者工具可以在生产环境中使用
    app.commandLine.appendSwitch('enable-devtools', 'true')
    app.commandLine.appendSwitch('disable-web-security')
    
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    // 添加获取日志路径的 IPC 处理
    ipcMain.handle('get-log-path', () => getLogPath())

    // 处理渲染进程日志
    ipcMain.on('renderer-log', async (event, { level, message, data }) => {
      try {
        switch (level) {
          case 'info':
            await logInfo(`[RENDERER] ${message}`, data)
            break
          case 'warn':
            await logWarn(`[RENDERER] ${message}`, data)
            break
          case 'error':
            await logError(`[RENDERER] ${message}`, data)
            break
          default:
            await logInfo(`[RENDERER] ${message}`, data)
        }
      } catch (error) {
        console.error('处理渲染进程日志失败:', error)
      }
    })

    await createWindow()

    app.on('activate', async function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow()
      }
    })
  } catch (error) {
    await logError('应用初始化失败', error)
    console.error('应用初始化失败:', error)
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在应用退出前注销所有快捷键
app.on('will-quit', async () => {
  await logInfo('应用即将退出')
  unregisterAllShortcuts()
})

// 全局错误处理
process.on('uncaughtException', async (error) => {
  await logError('未捕获的异常', error)
  console.error('未捕获的异常:', error)
})

process.on('unhandledRejection', async (reason, promise) => {
  await logError('未处理的 Promise 拒绝', { reason, promise })
  console.error('未处理的 Promise 拒绝:', reason, promise)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
