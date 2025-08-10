import request from './request'

/**
 * 获取需求列表
 */
export function getRequirementList (params) {
  return request({
    url: '/requirement/list',
    params
  })
}

/**
 * 拒绝需求
 */
export function rejectRequirement (data) {
  return request({
    url: '/requirement/reject',
    method: 'POST',
    data
  })
}

/**
 * AI重写需求
 */
export function rewriteRequirement (data) {
  return request({
    url: '/requirement/rewrite',
    method: 'POST',
    data
  })
}

/**
 * 保存重写后的需求
 */
export function saveRewrittenRequirement (data) {
  return request({
    url: '/requirement/update',
    method: 'POST',
    data
  })
}

/**
 * 提交需求给开发团队
 */
export function submitToDevelopment (data) {
  return request({
    url: '/requirement/commit',
    method: 'POST',
    data
  })
}