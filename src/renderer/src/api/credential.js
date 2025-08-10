import request from './request'

/**
 * 获取所有凭据
 */
export function getCredentialAll() {
  return request({
    url: '/credential/all',
  })
}

/**
 * 设置凭据配置
 */
export function setCredentialConf(id, data) {
  return request({
    url: '/credential/set/' + id,
    data,
    method: 'POST'
  })
}