import request from './request'

/**
 * 获取后台任务列表
 */
export function getCronList(params) {
  return request({
    url: '/cron/list',
    params
  })
}

/**
 * 删除后台任务
 */
export function deleteCronJob(id) {
  return request({
    url: '/cron/job/' + id,
    method: 'DELETE'
  })
}
