import request from './request'

/**
 * 获取Agent列表
 */
export function getAgentMap(params) {
  return request({
    url: '/agent_map/agents',
    params
  })
}

/**
 * 获取用户列表
 */
export function getUserMap(params) {
  return request({
    url: '/agent_map/users',
    params
  })
}

/**
 * 获取某个Agent下的用户列表
 */
export function getAgentUserMap(id) {
  return request({
    url: '/agent_map/agent/' + id + '/users'
  })
}

/**
 * 获取某个用户下的Agent列表
 */
export function getUserAgentMap(id) {
  return request({
    url: '/agent_map/user/' + id + '/agents'
  })
}

/**
 * 设置用户与Agent的关联
 */
export function setAgentMap(data) {
  return request({
    url: '/agent_map/set_agents',
    method: 'POST',
    data
  })
}

/**
 * 获取Agent列表
 */
export function setUserMap(data) {
  return request({
    url: '/agent_map/set_users',
    method: 'POST',
    data
  })
}
