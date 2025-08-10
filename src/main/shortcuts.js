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
    console.log('页面已强制刷新（缓存已清空）')
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

  console.log('快捷键已注册：')
  console.log('- F1: 切换显示/隐藏窗口')
  console.log('- F5: 强制刷新页面（清空缓存）')
  console.log('- F11: 切换最大化/默认窗口')
  console.log('- F12: 切换显示/隐藏开发者控制台')
}

/**
 * 注销所有快捷键
 */
export function unregisterShortcuts() {
  globalShortcut.unregister('F1')
  globalShortcut.unregister('F5')
  globalShortcut.unregister('F11')
  globalShortcut.unregister('F12')
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
  return ['F1', 'F5', 'F11', 'F12'].filter((key) => globalShortcut.isRegistered(key))
}
