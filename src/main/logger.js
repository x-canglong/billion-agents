import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

/**
 * 应用日志系统
 * 用于记录应用运行时的信息，便于调试问题
 */

// 日志文件路径
const LOG_DIR = join(app.getPath('userData'), 'logs')
const LOG_FILE = join(LOG_DIR, 'app.log')

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true })
  } catch (error) {
    console.error('创建日志目录失败:', error)
  }
}

/**
 * 写入日志到文件
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 */
async function writeLogToFile(level, message, data = null) {
  try {
    await ensureLogDir()

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    await fs.appendFile(LOG_FILE, logLine)
  } catch (error) {
    console.error('写入日志失败:', error)
  }
}

/**
 * 记录信息日志
 */
export async function logInfo(message, data = null) {
  console.log(`[INFO] ${message}`, data || '')
  await writeLogToFile('INFO', message, data)
}

/**
 * 记录警告日志
 */
export async function logWarn(message, data = null) {
  console.warn(`[WARN] ${message}`, data || '')
  await writeLogToFile('WARN', message, data)
}

/**
 * 记录错误日志
 */
export async function logError(message, error = null) {
  console.error(`[ERROR] ${message}`, error || '')
  const errorData = error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    : null
  await writeLogToFile('ERROR', message, errorData)
}

/**
 * 记录调试日志
 */
export async function logDebug(message, data = null) {
  console.log(`[DEBUG] ${message}`, data || '')
  await writeLogToFile('DEBUG', message, data)
}

/**
 * 获取日志文件路径
 */
export function getLogPath() {
  return LOG_FILE
}

/**
 * 清理旧日志文件（保留最近7天）
 */
export async function cleanOldLogs() {
  try {
    const files = await fs.readdir(LOG_DIR)
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    for (const file of files) {
      if (file.endsWith('.log')) {
        const filePath = join(LOG_DIR, file)
        const stats = await fs.stat(filePath)
        if (stats.mtime.getTime() < sevenDaysAgo) {
          await fs.unlink(filePath)
          console.log(`已删除旧日志文件: ${file}`)
        }
      }
    }
  } catch (error) {
    console.error('清理旧日志失败:', error)
  }
}

/**
 * 初始化日志系统
 */
export async function initLogger() {
  await logInfo('应用启动', {
    version: app.getVersion(),
    name: app.getName(),
    isPackaged: app.isPackaged,
    execPath: process.execPath,
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath('userData')
  })

  // 清理旧日志
  await cleanOldLogs()
}
