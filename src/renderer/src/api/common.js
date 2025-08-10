import request from './request'
import axios from 'axios'
import router from '@/router'
import { i18n } from '@/locales'

let isRefreshing = false;

/**
 * 登录
 */
export function doLogin (data) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data
  })
}

/**
 * 注册
 */
export function doRegister (data) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data
  })
}

/**
 * 获取用户信息
 */
export function getUserInfo (params) {
  return request({
    url: '/auth/user_info',
    params
  })
}

/**
 * 刷新token
 */
export async function refreshToken () {
  if (isRefreshing) {
    throw new Error('Token is already being refreshed');
  }
  isRefreshing = true;
  const refresh_token = Cookies.get(REFRESH_TOKEN)
  if (refresh_token) {
    try {
      const response = await axios.post(
        BASE_URL + import.meta.env.VITE_APP_BASE_API + '/auth/refresh',
        {},
        {
          headers: {
            Authorization: 'Bearer ' + refresh_token,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('response', response)
      if (response?.status === 200) {
        Cookies.set(ACCESS_TOKEN, response?.data.access_token);
        Cookies.set(REFRESH_TOKEN, response?.data.refresh_token);
      }
    } catch (error) {
      ElMessage.error(i18n.global.t('login.sessionExpired'));
      router.replace('/login');
      console.error('Error refreshing token:', JSON.stringify(error, null, 2));
      throw error;
    } finally {
      isRefreshing = false;
    }
  } else {
    ElMessage.error(i18n.global.t('login.sessionExpired'));
    isRefreshing = false;
    router.replace('/login');
  }
}

/**
 * 上传文件
 */
export function uploadFile (data) {
  return request({
    url: '/files/upload',
    method: 'POST',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}