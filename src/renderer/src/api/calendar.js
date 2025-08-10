import request from './request'

/**
 * 获取日历数据
 */
export function getCalendarData(params) {
  return request({
    url: '/proxy/mcp-exchange/calendar',
    params
  })
}
