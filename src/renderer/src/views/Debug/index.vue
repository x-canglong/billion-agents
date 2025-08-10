<template>
  <div class="debug-page">
    <div class="debug-header">
      <h1>调试信息</h1>
      <el-button type="primary" @click="exportLogs">导出日志</el-button>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card title="环境信息">
          <div class="info-item">
            <strong>应用版本:</strong> {{ appInfo.version }}
          </div>
          <div class="info-item">
            <strong>构建模式:</strong> {{ appInfo.mode }}
          </div>
          <div class="info-item">
            <strong>是否打包:</strong> {{ appInfo.isPackaged ? '是' : '否' }}
          </div>
          <div class="info-item">
            <strong>平台:</strong> {{ appInfo.platform }}
          </div>
          <div class="info-item">
            <strong>用户数据路径:</strong> {{ appInfo.userDataPath }}
          </div>
          <div class="info-item">
            <strong>日志路径:</strong> {{ logPath }}
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card title="系统状态">
          <div class="info-item">
            <strong>当前路由:</strong> {{ currentRoute }}
          </div>
          <div class="info-item">
            <strong>用户登录状态:</strong> {{ userInfo ? '已登录' : '未登录' }}
          </div>
          <div class="info-item">
            <strong>WebSocket连接:</strong> {{ socketConnected ? '已连接' : '未连接' }}
          </div>
          <div class="info-item">
            <strong>内存使用:</strong> {{ memoryUsage }}
          </div>
          <div class="info-item">
            <strong>页面加载时间:</strong> {{ loadTime }}ms
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card title="控制台日志" style="margin-top: 20px;">
      <div class="log-container">
        <div v-for="(log, index) in consoleLogs" :key="index" :class="`log-item log-${log.level}`">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </el-card>
    
    <div class="debug-actions">
      <el-button @click="testError">触发测试错误</el-button>
      <el-button @click="clearLogs">清除日志</el-button>
      <el-button @click="refreshPage">刷新页面</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useAppStore()

const appInfo = ref({
  version: '1.0.0',
  mode: 'production',
  isPackaged: false,
  platform: 'unknown',
  userDataPath: ''
})

const logPath = ref('')
const consoleLogs = ref([])
const loadTime = ref(0)

const currentRoute = computed(() => route.fullPath)
const userInfo = computed(() => store.userInfo)
const socketConnected = computed(() => store.socketConnected)
const memoryUsage = computed(() => {
  if (performance.memory) {
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB'
  }
  return '不可用'
})

onMounted(async () => {
  const startTime = performance.now()
  
  // 获取应用信息
  appInfo.value = {
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    mode: import.meta.env.MODE,
    isPackaged: window.electron?.isPackaged || false,
    platform: navigator.platform,
    userDataPath: '将通过IPC获取'
  }
  
  // 获取日志路径
  try {
    if (window.electron?.ipcRenderer) {
      logPath.value = await window.electron.ipcRenderer.invoke('get-log-path')
    }
  } catch (error) {
    console.error('获取日志路径失败:', error)
    logPath.value = '获取失败'
  }
  
  // 劫持控制台输出
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  
  console.log = function(...args) {
    addLog('log', args.join(' '))
    originalLog.apply(console, args)
  }
  
  console.warn = function(...args) {
    addLog('warn', args.join(' '))
    originalWarn.apply(console, args)
  }
  
  console.error = function(...args) {
    addLog('error', args.join(' '))
    originalError.apply(console, args)
  }
  
  loadTime.value = Math.round(performance.now() - startTime)
})

function addLog(level, message) {
  consoleLogs.value.push({
    level,
    message,
    time: new Date().toLocaleTimeString()
  })
  
  // 只保留最近100条日志
  if (consoleLogs.value.length > 100) {
    consoleLogs.value.shift()
  }
}

function exportLogs() {
  const logs = {
    appInfo: appInfo.value,
    logPath: logPath.value,
    consoleLogs: consoleLogs.value,
    timestamp: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `debug-logs-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function testError() {
  throw new Error('这是一个测试错误')
}

function clearLogs() {
  consoleLogs.value = []
}

function refreshPage() {
  window.location.reload()
}
</script>

<style lang="stylus" scoped>
.debug-page
  padding 20px

.debug-header
  display flex
  justify-content space-between
  align-items center
  margin-bottom 20px

.info-item
  margin-bottom 8px
  
  strong
    display inline-block
    width 120px

.log-container
  max-height 300px
  overflow-y auto
  background #f8f9fa
  padding 10px
  border-radius 4px

.log-item
  margin-bottom 4px
  font-family monospace
  font-size 12px
  
  &.log-error
    color #e74c3c
    
  &.log-warn
    color #f39c12
    
  &.log-log
    color #2c3e50

.log-time
  color #7f8c8d
  margin-right 8px

.log-level
  font-weight bold
  margin-right 8px

.debug-actions
  margin-top 20px
  
  .el-button
    margin-right 10px
</style>