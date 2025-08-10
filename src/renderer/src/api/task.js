import request from './request'

/**
 * 获取任务列表
 */
export function getTaskList(params) {
  return request({
    url: '/dev_task/list',
    params
  })
}

/**
 * 获取 Dify 工作流编辑页面 URL
 */
export function getDifyUrl(params) {
  return request({
    url: '/dev_task/dify_url',
    params
  })
}

/**
 * 获取 MCP VSCode 编辑页面 URL
 */
export function getMcpVscodeUrl(params) {
  return request({
    url: '/dev_task/mcp_vscode_url',
    params
  })
}

/**
 * 获取忙碌/空闲的 Agent 和 MCP
 */
export function getBusyAgentsAndMcps(params) {
  return request({
    url: '/dev_task/busy_agents_mcps',
    params
  })
}

/**
 * 获取任务详情
 */
export function getTaskDetail(id) {
  return request({
    url: '/dev_task/detail/' + id
  })
}

/**
 * 获取 Agent 详情
 */
export function getAgentDetail(id) {
  return request({
    url: '/dev_task/agent/detail/' + id
  })
}

/**
 * 获取 MCP 详情
 */
export function getMcpServerDetail(id) {
  return request({
    url: '/dev_task/mcp_server/detail/' + id
  })
}

/**
 * 获取菜单配置
 */
export function getMenuConf() {
  return request({
    url: '/menu_conf/all'
  })
}

/**
 * 获取 MCP 镜像版本列表
 */
export function getMcpVersions(params) {
  return request({
    url: '/dev_task/mcp_versions',
    params
  })
}

/**
 * 设置开发任务 Agent（开发环境）
 */
export function setupDevTaskAgent(data) {
  return request({
    url: '/dev_task/setup',
    method: 'POST',
    data
  })
}

/**
 * 发布到生产环境
 */
export function publishToProduction(data) {
  return request({
    url: '/dev_task/publish',
    method: 'POST',
    data
  })
}

/**
 * 获取用户偏好配置列表
 */
export function getUserPrefsConfs(params) {
  return request({
    url: '/dev_task/user_prefs_confs',
    params
  })
}
