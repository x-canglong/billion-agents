// 检查服务工作器更新
function checkForUpdates(registration) {
  // 定期检查更新
  setInterval(
    () => {
      registration.update()
    },
    1000 * 60 * 60
  ) // 每小时检查一次更新

  // 如果有新版本，通知用户
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    console.log('服务工作器已更新，刷新页面')
    window.location.reload()
  })
}

// 注册推送功能
async function registerPush(registration) {
  try {
    // 获取现有订阅
    let subscription = await registration.pushManager.getSubscription()

    // 如果没有订阅，创建新订阅
    if (!subscription) {
      // 获取服务器公钥
      const response = await fetch('/api/push/public-key')
      const data = await response.json()

      // 转换公钥
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey)

      // 创建订阅
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // 必须显示通知
        applicationServerKey: applicationServerKey
      })

      console.log('已创建推送订阅')
    } else {
      console.log('已存在推送订阅')
    }

    // 将订阅信息发送到服务器
    await sendSubscriptionToServer(subscription)

    return subscription
  } catch (error) {
    console.error('推送注册失败:', error)
  }
}

// 发送订阅信息到服务器
async function sendSubscriptionToServer(subscription) {
  try {
    const response = await fetch('/api/push/save-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    })

    if (!response.ok) {
      throw new Error('服务器响应错误')
    }

    console.log('推送订阅已保存到服务器')
    return true
  } catch (error) {
    console.error('发送订阅信息失败:', error)
    // 稍后重试
    scheduleRetry()
    return false
  }
}

// 安排重试
function scheduleRetry() {
  // 使用后台同步API（如果支持）
  if ('SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.sync.register('sync-subscriptions')
      })
      .catch((err) => {
        console.error('后台同步注册失败:', err)
      })
  } else {
    // 如果不支持后台同步，使用定时器
    setTimeout(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (subscription) {
            sendSubscriptionToServer(subscription)
          }
        })
      })
    }, 10000) // 10秒后重试
  }
}

// Base64 URL解码为Uint8Array (用于applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// 检查浏览器是否支持服务工作器
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
      try {
        // 注册服务工作器
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('服务工作器注册成功，作用域为:', registration.scope)

        // 检查是否有更新
        checkForUpdates(registration)

        // 注册推送
        await registerPush(registration)

        return registration
      } catch (error) {
        console.error('服务工作器注册失败:', error)
      }
    })
  } else {
    console.warn('当前浏览器不支持服务工作器或推送API')
  }
}