import axios from 'axios'
import router from '../router'
import { getLocale } from '@/locales'
import { refreshToken } from './common'

// 请求队列和刷新状态管理
let isRefreshing = false
let failedQueue = []

// 处理队列中的请求
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

const instance = axios.create({
  baseURL: BASE_URL + import.meta.env.VITE_APP_BASE_API,
  timeout: 30 * 1000 * 10
})

instance.interceptors.request.use(
  (config) => {
    const access_token = Cookies.get(ACCESS_TOKEN)
    if (access_token) {
      config.headers.Authorization = 'Bearer ' + access_token
    }
    
    // 为每个请求添加语言参数
    const currentLanguage = getLocale()
    if (!config.params) {
      config.params = {}
    }
    config.params.language = currentLanguage
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      return Promise.resolve(response)
    }
    if (response.status === 204) {
      return Promise.reject(response)
    }
  },
  async (err) => {
    console.error('err', err)
    const originalRequest = err.config
    const { data } = err.response
    const defaultMessage = '连接错误'
    err.message = data.message || defaultMessage
    const whiteList = []
    
    // 处理特殊逻辑
    if (err.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token
          return instance(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await refreshToken()
        const newAccessToken = Cookies.get(ACCESS_TOKEN)
        
        // 处理队列中的请求
        processQueue(null, newAccessToken)
        
        // 重新发送原始请求
        originalRequest.headers.Authorization = 'Bearer ' + newAccessToken
        return instance(originalRequest)
        
      } catch (error) {
        // refreshToken失败，处理队列中的请求
        processQueue(error, null)
        
        // 清除token并跳转到登录页
        Cookies.remove(ACCESS_TOKEN)
        Cookies.remove(REFRESH_TOKEN)
        router.replace('/login')
        
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    } else if (
      err.response.status === 403 &&
      whiteList.includes(err.config.url)
    ) {
      return Promise.resolve({ data: [] })
    } else if (err.message && err.message !== '权限不够') {
      ElMessage({
        type: 'error',
        message: err.message
      })
    }
    return Promise.reject(err.response)
  }
)

export default instance