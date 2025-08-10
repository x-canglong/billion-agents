import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 获取日志路径
  getLogPath: () => ipcRenderer.invoke('get-log-path'),

  // 发送日志到主进程
  log: (level, message, data) => ipcRenderer.send('renderer-log', { level, message, data }),

  // 获取应用信息
  getAppInfo: () => ({
    isPackaged: process.env.NODE_ENV === 'production',
    platform: process.platform,
    arch: process.arch,
    versions: process.versions
  })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      isPackaged: process.env.NODE_ENV === 'production'
    })
    contextBridge.exposeInMainWorld('api', api)

    // 记录 preload 脚本加载成功
    console.log('Preload script loaded successfully')
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  window.electron = {
    ...electronAPI,
    isPackaged: process.env.NODE_ENV === 'production'
  }
  window.api = api
  console.log('Preload script loaded in non-isolated context')
}
