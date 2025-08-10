/**
 * 全局注入工具
 * 确保在打包后也能正常使用全局变量
 */

// 同步导入模块
import Cookies from 'js-cookie'
import _ from 'lodash'
import dayjs from 'dayjs'

/**
 * 初始化全局变量
 */
export function initGlobalInject() {
  if (typeof window === 'undefined') return
  
  // 直接挂载到 window 对象
  if (!window.Cookies) {
    window.Cookies = Cookies
    console.log('[GlobalInject] Cookies injected to window')
  }
  
  if (!window._) {
    window._ = _
    console.log('[GlobalInject] Lodash injected to window')
  }
  
  if (!window.dayjs) {
    window.dayjs = dayjs
    console.log('[GlobalInject] Dayjs injected to window')
  }
  
  // 添加到 globalThis 以确保在所有环境中都可用
  if (typeof globalThis !== 'undefined') {
    globalThis.Cookies = Cookies
    globalThis._ = _
    globalThis.dayjs = dayjs
  }
  
  console.log('[GlobalInject] All global variables initialized')
}

/**
 * 检查全局变量是否可用
 */
export function checkGlobalInject() {
  const results = {
    Cookies: typeof Cookies !== 'undefined' || typeof window?.Cookies !== 'undefined',
    _: typeof _ !== 'undefined' || typeof window?._ !== 'undefined', 
    dayjs: typeof dayjs !== 'undefined' || typeof window?.dayjs !== 'undefined'
  }
  
  console.log('[GlobalInject] Availability check:', results)
  return results
}

// 立即执行初始化
initGlobalInject()