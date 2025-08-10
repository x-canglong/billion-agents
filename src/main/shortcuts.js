import { globalShortcut } from 'electron'

/**
 * 快捷键管理模块
 * 负责注册和管理全局快捷键
 */

let mainWindow = null

/**
 * 初始化快捷键
 * @param {BrowserWindow} window - 主窗口实例
 */
export function initShortcuts(window) {
  mainWindow = window
  registerShortcuts()
}

/**
 * 注册所有快捷键
 */
function registerShortcuts() {
  // F1: 切换显示/隐藏窗口
  globalShortcut.register('F1', () => {
    if (!mainWindow) return

    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        mainWindow.focus()
      }
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // F5: 强制刷新页面（清空缓存并刷新页面）
  globalShortcut.register('F5', () => {
    if (!mainWindow) return

    // 清空缓存并重新加载
    mainWindow.webContents.reloadIgnoringCache()
  })

  // F11: 切换最大化/默认窗口
  globalShortcut.register('F11', () => {
    if (!mainWindow) return

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  // F12: 切换显示/隐藏开发者控制台
  globalShortcut.register('F12', () => {
    if (!mainWindow) return

    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools()
    }
  })

  // Ctrl+F12: 切换显示/隐藏开发者控制台 (备用快捷键)
  globalShortcut.register('CommandOrControl+F12', () => {
    if (!mainWindow) {
      console.log('Ctrl+F12: mainWindow 不可用')
      return
    }
    
    try {
      const isOpened = mainWindow.webContents.isDevToolsOpened()
      
      if (isOpened) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
      }
    } catch (error) {
      console.error('Ctrl+F12: 操作失败 -', error.message)
      // 简单的备用方案
      try {
        mainWindow.webContents.toggleDevTools()
        console.log('Ctrl+F12: 使用 toggleDevTools 成功')
      } catch (fallbackError) {
        console.error('Ctrl+F12: 备用方案也失败 -', fallbackError.message)
      }
    }
  })
}

/**
 * 注销所有快捷键
 */
export function unregisterShortcuts() {
  globalShortcut.unregister('F1')
  globalShortcut.unregister('F5')
  globalShortcut.unregister('F11')
  globalShortcut.unregister('F12')
  globalShortcut.unregister('CommandOrControl+F12')
  console.log('所有快捷键已注销')
}

/**
 * 注销所有全局快捷键
 */
export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
  console.log('所有全局快捷键已注销')
}

/**
 * 检查快捷键是否已注册
 */
export function isShortcutRegistered(accelerator) {
  return globalShortcut.isRegistered(accelerator)
}

/**
 * 获取所有已注册的快捷键
 */
export function getRegisteredShortcuts() {
  return ['F1', 'F5', 'F11', 'F12', 'CommandOrControl+F12'].filter((key) => globalShortcut.isRegistered(key))
}
