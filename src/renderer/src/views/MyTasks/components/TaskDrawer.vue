<template>
  <el-drawer v-model="visible" title="配置开发表单" direction="rtl" size="60%" :close-on-click-modal="false"
    :close-on-press-escape="false" class="task-drawer">
    <div class="drawer-content">
      <el-form :model="taskForm" label-width="140px" :rules="formRules" ref="taskFormRef" class="task-form">
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">
              <el-icon>
                <Document />
              </el-icon>
              基本信息
            </h3>
            <el-tag type="info" size="small">必填信息</el-tag>
          </div>
          <div class="form-content">
            <el-form-item label="需求名称" prop="requirementName">
              <el-input v-model="taskForm.requirement.name" disabled placeholder="请输入需求名称" size="large" />
            </el-form-item>
            <el-form-item label="具体需求" prop="requirementDetail">
              <el-input :value="taskForm.requirement.desc || taskForm.requirement.org_desc" type="textarea" :rows="5" disabled show-word-limit maxlength="500" />
            </el-form-item>
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="taskForm.name" placeholder="请输入开发任务名称" size="large" />
            </el-form-item>
          </div>
        </div>
        <CoreConfig :mode="taskForm.agent.mode" :task-form="taskForm" :visible="visible" />
      </el-form>
    </div>

    <!-- 抽屉底部操作栏 -->
    <template #footer>
      <div class="drawer-footer">
        <div class="footer-info">
          <el-icon>
            <InfoFilled />
          </el-icon>
          <span>请确保所有必填项都已填写完整</span>
        </div>
        <div class="footer-actions">
          <el-button size="large" @click="handleClose" :icon="Close">
            取消
          </el-button>
          <el-button type="warning" size="large" :loading="loadingTest" @click="handleTestRelease" :disabled="!canTest" :icon="Monitor">
            发布测试
          </el-button>
          <el-button type="success" size="large" :loading="loadingOnline" @click="handleOnlineRelease" :disabled="!canOnline" :icon="Upload">
            发布上线
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>
  
  <!-- MCP版本选择弹框 -->
  <McpVersionDialog
    v-model:visible="mcpVersionDialogVisible"
    :mcp-version-info="mcpVersionInfo"
    @confirm="handleMcpVersionConfirm"
  />
</template>

<script setup>
import { Close, Monitor, Upload } from '@element-plus/icons-vue'
import CoreConfig from './CoreConfig.vue'
import McpVersionDialog from './McpVersionDialog.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  taskForm: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update:visible',
  'refresh'
])

const taskFormRef = ref(null)

// 内部loading状态管理
const loading = ref(false)
const loadingTest = ref(false)
const loadingOnline = ref(false)

// MCP版本选择弹框
const mcpVersionDialogVisible = ref(false)
const mcpVersionInfo = ref([])

// 使用 store
const store = useAppStore()

// 表单验证规则 - 移到组件内部
const formRules = {
  name: [
    { required: true, message: '请输入开发任务名称', trigger: 'blur' }
  ],
  desc: [
    { required: true, message: '请输入开发任务描述', trigger: 'blur' }
  ],
  'agent.name': [
    { required: true, message: '请输入Agent名称', trigger: 'blur' }
  ],
  'agent.desc': [
    { required: true, message: '请输入Agent描述', trigger: 'blur' }
  ],
  'agent.instruction': [
    { required: true, message: '请输入系统指令', trigger: 'blur' }
  ],
  'agent.maximum_iterations': [
    { required: true, message: '请设置最大迭代次数', trigger: 'change' }
  ]
}

// 双向绑定visible
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 内部计算按钮状态
const canTest = computed(() => {
  return props.taskForm.status !== 'published'
})

const canOnline = computed(() => {
  return props.taskForm.status === 'in_progress'
})

const handleClose = () => {
  emit('update:visible', false)
  emit('refresh')
}

// 处理MCP版本选择确认 - 用于保存Promise的resolve函数
let mcpVersionPromiseResolve = null

const handleMcpVersionConfirm = (selectedVersions) => {
  mcpVersionDialogVisible.value = false
  if (mcpVersionPromiseResolve) {
    mcpVersionPromiseResolve(selectedVersions)
    mcpVersionPromiseResolve = null
  }
}

// 测试发布
const handleTestRelease = async () => {
  // 执行完整的表单验证
  const isValid = await validateAllForms()
  if (!isValid) {
    return
  }
  
  try {
    loadingTest.value = true
    await setupDevTaskAgent(props.taskForm)
    ElMessage.success('测试版本发布成功！')
    
    // 发布成功后刷新菜单配置
    await store.refreshMenu()
    emit('refresh', 'test')
    // handleClose()
  } catch (error) {
    console.error(error)
  } finally {
    loadingTest.value = false
  }
}

// 上线发布
const handleOnlineRelease = async () => {
  // 执行完整的表单验证
  const isValid = await validateAllForms()
  if (!isValid) {
    return
  }
  
  let mcp_servers = props.taskForm.agent.mcp_servers || []
  if (mcp_servers.length) { 
    let versions = (await getMcpVersions({ mcp: _.map(mcp_servers, 'name').join(',') })).data.versions
    // 检查是否所有MCP都有版本号
    const mcpVersionInfo = []
    
    mcp_servers.forEach(server => {
      const mcpVersions = versions[server.name] || []
      if (server.env) {
        server.prd_env = _.cloneDeep(server.env)
        server.envConfig = []
        Object.keys(server.prd_env).forEach(key => {
          server.envConfig.push({
            key: key,
            value: server.prd_env[key]
          })
        })
      }
      mcpVersionInfo.push({
        name: server.name,
        versions: mcpVersions,
        hasVersions: mcpVersions.length > 0,
        selectedVersion: server.version || '', // 当前选中的版本
        prd_env: server.prd_env || {},
        envConfig: server.envConfig || [] // 当前的环境变量配置
      })
    })
    
    // 显示MCP版本选择弹框
    const selectedVersions = await showMcpVersionDialog(mcpVersionInfo)
    if (!selectedVersions) {
      return // 用户取消了版本选择或有MCP没有版本
    }
    
    // 更新mcp_servers中的版本信息和环境变量配置
    mcp_servers.forEach(server => {
      if (selectedVersions[server.name]) {
        server.version = selectedVersions[server.name].version
        let prd_env = {}
        let envConfig = selectedVersions[server.name].envConfig || []
        envConfig.forEach(env => {
          prd_env[env.key] = env.value
        })
        server.prd_env = prd_env
      }
    })
  }
  // 所有验证通过，继续发布流程
  ElMessageBox.confirm(
    '确定要发布正式版本吗？',
    '确认发布',
    {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      loadingOnline.value = true
      await publishToProduction(props.taskForm)
      ElMessage.success('正式版本发布成功！')
      
      // 发布成功后刷新菜单配置
      await store.refreshMenu()
      
      handleClose()
    } catch (error) {
      console.error(error)
    } finally {
      loadingOnline.value = false
    }
  })
}

// 显示MCP版本选择弹框
const showMcpVersionDialog = (info) => {
  return new Promise((resolve) => {
    mcpVersionInfo.value = info
    mcpVersionPromiseResolve = resolve
    mcpVersionDialogVisible.value = true
  })
}

// 完整的表单验证函数
const validateAllForms = async () => {
  try {
    // 1. 基础表单验证
    await taskFormRef.value.validate()
    
    // 2. Agent配置验证
    if (!validateAgentConfig()) {
      return false
    }
    
    // 4. 菜单配置验证（如果启用）
    if (props.taskForm.agent.menu && !validateMenuConfig()) {
      return false
    } else if (!props.taskForm.agent.menu) {
      props.taskForm.agent.menu_conf = {}
    }

    // 5. 用户偏好配置验证（如果启用）
    if (props.taskForm.agent.user_prefs && !validateUserPreferenceConfig()) {
      return false
    } else if (!props.taskForm.agent.user_prefs) {
      props.taskForm.agent.user_prefs_confs = []
    }
    
    // 6. 凭据配置验证
    if (!validateCredentialConfig()) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('表单验证失败:', error)
    ElMessage.error('请检查表单填写是否完整')
    return false
  }
}

// Agent配置验证
const validateAgentConfig = () => {
  const agent = props.taskForm.agent
  
  if (!agent.name || agent.name.trim() === '') {
    ElMessage.error('请输入Agent名称')
    return false
  }
  
  if (!agent.desc || agent.desc.trim() === '') {
    ElMessage.error('请输入Agent描述')
    return false
  }
  
  if (props.taskForm.agent.mode === 'standard') {
    if (!agent.instruction || agent.instruction.trim() === '') {
      ElMessage.error('请输入系统指令')
      return false
    }
    
    if (!agent.maximum_iterations || agent.maximum_iterations < 1 || agent.maximum_iterations > 10) {
      ElMessage.error('最大迭代次数必须在1-10之间')
      return false
    }
  }
  
  return true
}

// 菜单配置验证
const validateMenuConfig = () => {
  const menuConf = props.taskForm.agent.menu_conf
  
  if (!menuConf) {
    ElMessage.error('启用菜单配置后，请完成菜单配置设置')
    return false
  }
  
  if (!menuConf.name || menuConf.name.trim() === '') {
    ElMessage.error('菜单配置：请输入菜单名称')
    return false
  }
  
  if (!menuConf.uri || menuConf.uri.trim() === '') {
    ElMessage.error('菜单配置：请输入菜单URI')
    return false
  }
  
  if (!menuConf.icon || menuConf.icon.trim() === '') {
    ElMessage.error('菜单配置：请选择菜单图标')
    return false
  }
  
  return true
}

// 用户偏好配置验证
const validateUserPreferenceConfig = () => {
  const userPrefsConf = props.taskForm.agent.user_prefs_confs
  
  if (!userPrefsConf || !Array.isArray(userPrefsConf) || userPrefsConf.length === 0) {
    ElMessage.error('启用用户偏好配置后，请至少添加一个偏好设置')
    return false
  }
  return true
}

// 凭据配置验证
const validateCredentialConfig = () => {
  const mcpServers = props.taskForm.agent.mcp_servers
  
  if (!mcpServers || !Array.isArray(mcpServers)) {
    return true // 如果没有MCP服务器，跳过凭据验证
  }
  
  for (let i = 0; i < mcpServers.length; i++) {
    const server = mcpServers[i]
    
    if (server.credential_conf && server.credential_conf.config) {
      const config = server.credential_conf.config
      const hasRequiredFields = Object.values(config).some(fieldConfig => fieldConfig.required === true)
      
      if (hasRequiredFields) {
        for (const [key, fieldConfig] of Object.entries(config)) {
          if (fieldConfig.required) {
            if (!fieldConfig.desc || fieldConfig.desc.trim() === '') {
              ElMessage.error(`MCP "${server.name}" 凭据配置：字段 "${key}" 缺少描述`)
              return false
            }
          }
        }
      }
      if (Object.keys(config).length === 0) {
        server.credential_conf = null
      }
    }
  }
  
  return true
}

// 暴露表单ref给父组件
defineExpose({
  taskFormRef,
  // 暴露控制loading的方法给父组件
  setLoading: (value) => {
    loading.value = value
  }
})
</script>

<style lang="stylus" scoped>
.task-drawer
  .drawer-content
    padding 20px
    height 100%
    overflow-y auto

.task-form
  .form-section
    margin-bottom 20px
    padding 20px
    background #f8f9fa
    border-radius 8px
    border 1px solid #ebeef5

    .section-header
      display flex
      justify-content space-between
      align-items center
      margin-bottom 20px
      padding-bottom 10px
      border-bottom 2px solid #409eff

      .section-title
        display flex
        align-items center
        gap 10px
        font-size 16px
        font-weight 600
        color #303133

        .el-icon
          color #409eff

    .form-content
      .el-form-item
        margin-bottom 16px
        
        .el-switch
          vertical-align middle

    .config-item
      text-align center
      padding 16px
      background #ffffff
      border-radius 6px
      border 1px solid #e4e7ed

      .config-header
        display flex
        align-items center
        justify-content center
        gap 6px
        margin-bottom 12px
        font-size 14px
        font-weight 500
        color #303133

        .el-icon
          color #409eff

      .el-switch
        margin-bottom 8px

      .config-desc
        font-size 12px
        color #909399
        line-height 1.3

    .form-tip
      margin-left 10px
      font-size 12px
      color #909399
      padding 3px 6px
      background rgba(64, 158, 255, 0.1)
      border-radius 3px

.drawer-footer
  display flex
  justify-content space-between
  align-items center
  padding 20px
  border-top 1px solid #ebeef5
  background #f8f9fa
  
  .footer-info
    display flex
    align-items center
    gap 10px
    font-size 13px
    color #606266

    .el-icon
      color #909399

  .footer-actions
    display flex
    gap 10px

    .el-button
      min-width 100px
</style>

 