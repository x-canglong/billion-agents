import { defineStore } from 'pinia'
import { getMenuConf } from '@/api/task'

export const useAppStore = defineStore('app', {
  state: () => {
    return {
      userInfo: {},
      mode: import.meta.env.VITE_STREAM_TYPE,
      socket: null,
      socketConnected: null, // 添加socket连接状态
      sidebarCollapse: false, // 添加侧边栏收起状态
      menuConf: []
    }
  },
  actions: {
    setUserInfo(info) {
      this.userInfo = info
    },
    setSocketConnected(status) {
      if (this.mode === 'ws') {
        this.socketConnected = status
      }
    },
    setSidebarCollapse(collapse) {
      this.sidebarCollapse = collapse
    },
    setMenuConf(conf) {
      this.menuConf = conf
    },
    // 刷新菜单配置
    async refreshMenu() {
      try {
        const res = await getMenuConf()
        const menuConf = res.data
        this.setMenuConf(menuConf)
        return menuConf
      } catch (error) {
        console.error('刷新菜单配置失败:', error)
        throw error
      }
    },
    reset() {
      this.userInfo = {}
      this.socket = null
      this.socketConnected = null
      this.sidebarCollapse = false
      this.menuConf = []
    }
  },
  getters: {}
})
