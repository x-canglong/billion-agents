import { io } from 'socket.io-client'
import { ElNotification } from 'element-plus'
import router from '@/router'

// 定义变量
let socket = null;

// Socket初始化函数
const initSocket = () => {
  // 首先检查是否使用 WebSocket
  const store = useAppStore()
  const useWebSocket = store.mode === 'ws';
  let deviceId = ls.get(DEVICE_ID)
  if(!deviceId) {
    deviceId = generateUUID()
    ls.set(DEVICE_ID, deviceId)
  }
  // 只有在使用 WebSocket 时才初始化
  if (useWebSocket && ls.get(ACCESS_TOKEN) && store.userInfo.id) {
    // 如果已存在连接，先断开
    if (socket) {
      socket.disconnect()
      socket = null
    }

    // 页面加载时检查上次的重连失败记录
    const lastFailCount = ss.get(RECONNECT_FAILED_COUNT) || 0
    
    if (lastFailCount > 0) {
      console.log(`⚠️ 检测到上次重连失败记录: ${lastFailCount}次`)
    }
    
    // 创建socket连接，使用socket.io-client内置的重连机制
    socket = io(
      BASE_URL +
        import.meta.env.VITE_APP_SPCKET_API +
        '?user_id=' +
        store.userInfo.id + '&device=web&device_id=' + deviceId,
      {
        autoConnect: true,           // 自动连接
        reconnection: true,          // 启用自动重连
        reconnectionAttempts: 5,     // 最大重连次数 (调整为5次，约15秒)
        reconnectionDelay: 1000,     // 重连延迟 (调整为1秒)
        reconnectionDelayMax: 5000,  // 最大重连延迟 (调整为5秒)
        randomizationFactor: 0.5,    // 随机化因子，避免同时重连
        timeout: 20000,              // 连接超时时间
        transportOptions: {
          polling: {
            extraHeaders: {
              Authorization: `Bearer ${ls.get(ACCESS_TOKEN)}`
            }
          }
        }
      }
    )

    // 监听连接成功
    socket.on('connect', () => {
      console.log('✅ Socket连接成功', socket, socket.id)
      store.socket = socket
      store.setSocketConnected(true)
      
      // 连接成功时清除重连失败计数
      ss.remove(RECONNECT_FAILED_COUNT)
    })

    // 监听连接断开
    socket.on('disconnect', (reason) => {
      console.log('❌ Socket连接断开:', reason)
      store.setSocketConnected(false)
      
      // 记录断开原因，socket.io会自动处理重连
      if (reason === 'io server disconnect') {
        console.log('🔄 服务器主动断开连接')
      } else if (reason === 'io client disconnect') {
        console.log('🔄 客户端主动断开连接')
      }
    })

    // 监听连接错误
    socket.on('connect_error', (error) => {
      console.log('❌ Socket连接错误:', error.message)
      store.setSocketConnected(false)
      if (error.message !== 'xhr poll error') {
        refreshToken().then(() => {
          socket = null
          setTimeout(() => {
            initSocket()
          }, 2000)
        })
      }
    })

    // 监听重连尝试 (socket.io内置事件)
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 正在尝试第 ${attemptNumber} 次重连...`)
    })

    // 监听重连成功 (socket.io内置事件)
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ 重连成功！尝试次数: ${attemptNumber}`)
      store.setSocketConnected(true)
    })

    // 监听重连错误 (socket.io内置事件)
    socket.on('reconnect_error', (error) => {
      console.log('❌ 重连错误:', error.message)
    })

    // 监听重连失败 (socket.io内置事件)
    socket.on('reconnect_failed', () => {
      console.log('❌ 重连失败，已达到最大重试次数')
      store.setSocketConnected(false)
      
      // 检查是否是连续的重连失败
      const currentFailCount = ss.get(RECONNECT_FAILED_COUNT) || 0
      const newFailCount = currentFailCount + 1
      
      console.log(`重连失败次数: ${newFailCount}`)
      ss.set(RECONNECT_FAILED_COUNT, newFailCount)
      
      if (newFailCount === 1) {
        // 第一次重连失败：强制刷新页面彻底重置
        window.location.reload()
      } else if (newFailCount >= 2) {
        // 第二次及以上重连失败：可能是认证问题，退出登录
        ElNotification({
          title: '🚨 连接严重异常',
          message: `
            <div style="line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">多次连接失败，可能是登录状态异常。</p>
              <p style="margin: 0; color: #909399; font-size: 13px;">
                💡 正在自动退出登录，请重新登录
              </p>
            </div>
          `,
          type: 'error',
          dangerouslyUseHTMLString: true,
          duration: 3000,
          position: 'top-right',
          showClose: false
        })
        
        // 清除失败计数
        ss.remove(RECONNECT_FAILED_COUNT)
        
        // 清除认证信息
        ls.remove(ACCESS_TOKEN)
        ls.remove(REFRESH_TOKEN)
        ls.remove(USER_INFO)
        
        // 跳转到登录页
        router.replace('/login')
      }
    })
  }
}

// 页面加载时初始化Socket
initSocket()

// 手动重连函数 (简化版)
const manualReconnect = () => {
  if (socket && !socket.connected) {
    console.log('🔄 手动重连Socket...')
    socket.connect()
  }
}

// 断开连接函数
const disconnect = () => {
  if (socket) {
    console.log('主动断开Socket连接')
    socket.disconnect()
  }
}

// 获取连接状态
const isConnected = () => {
  return socket?.connected || false
}

// 在顶层导出
export { socket, initSocket, manualReconnect, disconnect, isConnected }
export default socket
