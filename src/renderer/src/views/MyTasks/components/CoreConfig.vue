<template>
  <!-- Agent配置 -->
  <div class="form-section">
    <div class="section-header">
      <h3 class="section-title">
        <el-icon>
          <Setting />
        </el-icon>
        Agent配置
      </h3>
      <el-tag type="primary" size="small">核心配置</el-tag>
    </div>
    <div class="form-content">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="Agent选择" required>
            <el-select v-model="selectedAgent" filterable allow-create default-first-option :reserve-keyword="false"
              placeholder="选择已有Agent或创建新Agent" style="width: 100%" size="large" @change="handleAgentChange">
              <el-option v-for="agent in agentOptions" :key="agent.id" :label="agent.name" :value="agent.id"
                :disabled="agent.disabled" />
            </el-select>
            <div class="form-tip">
              <el-icon>
                <InfoFilled />
              </el-icon>
              支持选择现有Agent或输入新Agent名称创建
              <el-button v-if="taskForm.agent.dify_url" type="primary" :icon="Link" link size="small"
                @click="openDifyUrl" style="margin-left: 8px;">
                Dify
              </el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="实现方式" prop="implementType" v-if="selectedAgent">
        <el-radio-group v-model="taskForm.agent.mode" size="large">
          <el-radio-button value="standard">
            <el-icon>
              <Tools />
            </el-icon>
            标准实现
          </el-radio-button>
          <el-radio-button value="custom">
            <el-icon>
              <Setting />
            </el-icon>
            自定义实现
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 选择Agent后显示的配置项 -->
      <div v-if="selectedAgent">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Agent名称" prop="agent.name" required>
              <el-input v-model="taskForm.agent.name" placeholder="请输入Agent名称" size="large" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Agent描述" prop="agent.desc" required>
          <el-input v-model="taskForm.agent.desc" type="textarea" :rows="3" placeholder="请描述Agent的主要功能和特性"
            show-word-limit maxlength="2000" />
        </el-form-item>

        <el-form-item label="系统指令" prop="agent.instruction" required v-if="props.mode === 'standard'">
          <el-input v-model="taskForm.agent.instruction" type="textarea" :rows="4"
            placeholder="请输入详细的系统指令，包括角色定义、行为规范、输出格式等" />
        </el-form-item>

        <el-row :gutter="20" v-if="props.mode === 'standard'">
          <el-col :span="24">
            <el-form-item label="最大迭代次数" prop="agent.maximum_iterations" required>
              <el-input-number v-model="taskForm.agent.maximum_iterations" :min="1" :max="100" size="large"
                controls-position="right" style="width: 200px" />
              <div class="form-tip-bg">
                最大100次
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 功能配置选项 -->
        <div class="config-options">
          <el-row :gutter="20">
            <el-col :span="6" v-if="props.mode === 'standard'">
              <div class="config-item">
                <div class="config-header">
                  <el-icon>
                    <Picture />
                  </el-icon>
                  <span>图片支持</span>
                </div>
                <el-switch v-model="taskForm.agent.vision" size="large" active-text="启用" inactive-text="禁用" />
                <div class="config-desc">启用后可上传和处理图片资源</div>
              </div>
            </el-col>
            <el-col :span="6" v-if="props.mode === 'standard'">
              <div class="config-item">
                <div class="config-header">
                  <el-icon>
                    <Files />
                  </el-icon>
                  <span>文档支持</span>
                </div>
                <el-switch v-model="taskForm.agent.doc" size="large" active-text="启用" inactive-text="禁用" />
                <div class="config-desc">启用后可上传和处理文档资源</div>
              </div>
            </el-col>
            <el-col :span="props.mode === 'standard' ? 6 : 12">
              <div class="config-item">
                <div class="config-header">
                  <el-icon>
                    <Menu />
                  </el-icon>
                  <span>菜单配置</span>
                </div>
                <el-switch v-model="taskForm.agent.menu" size="large" active-text="启用" inactive-text="禁用"
                  @change="handleMenuConfigChange" />
                <div class="config-desc">自定义Agent的操作菜单</div>
                <el-button v-if="taskForm.agent.menu" type="primary" size="small" @click="handleOpenMenuDialog"
                  style="margin-top: 8px;">
                  配置菜单
                </el-button>
              </div>
            </el-col>
            <el-col :span="props.mode === 'standard' ? 6 : 12">
              <div class="config-item">
                <div class="config-header">
                  <el-icon>
                    <User />
                  </el-icon>
                  <span>用户偏好</span>
                </div>
                <el-switch v-model="taskForm.agent.user_prefs" size="large" active-text="启用" inactive-text="禁用"
                  @change="handleUserPreferenceChange" />
                <div class="config-desc">应用用户偏好设置</div>
                <el-button v-if="taskForm.agent.user_prefs" type="primary" size="small"
                  @click="handleOpenUserPreferenceDialog" style="margin-top: 8px;">
                  配置偏好
                </el-button>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </div>
  </div>

  <!-- MCP配置 -->
  <div class="form-section">
    <div class="section-header">
      <h3 class="section-title">
        <el-icon>
          <Connection />
        </el-icon>
        MCP配置
      </h3>
      <el-tag type="success" size="small">扩展功能</el-tag>
    </div>
    <div class="form-content">
      <el-form-item label="MCP选择">
        <el-select v-model="selectedMcps" multiple filterable allow-create default-first-option :reserve-keyword="false"
          placeholder="选择或创建MCP" style="width: 100%" size="large" @change="handleMcpChange">
          <el-option v-for="mcp in mcpOptions" :key="mcp.id" :label="mcp.name" :value="mcp.name" />
        </el-select>
        <div class="form-tip">
          <el-icon>
            <InfoFilled />
          </el-icon>
          支持选择现有MCP或输入新MCP名称创建（新创建的MCP必须以"mcp-"开头，只支持小写字母和连字符）
        </div>
      </el-form-item>

      <!-- MCP凭据配置 -->
      <div v-if="selectedMcps.length > 0" class="mcp-credentials">
        <div class="credentials-header">
          <h4>
            <el-icon>
              <Key />
            </el-icon>
            配置管理
          </h4>
          <el-tag type="info" size="small">{{ selectedMcps.length }} 个MCP</el-tag>
        </div>

        <div class="mcp-credential-list">
          <div class="mcp-credential-card"
            :class="{ 'configured': mcpCredentials[mcp] && mcpCredentials[mcp].configured }" v-for="mcp in selectedMcps"
            :key="mcp">
            <div class="card-left">
              <div class="mcp-icon">
                <el-icon>
                  <Connection />
                </el-icon>
              </div>
              <div class="mcp-info">
                <div class="mcp-name">{{ mcp }}</div>
                <div class="mcp-status">
                  <!-- <el-tag :type="mcpCredentials[mcp] && mcpCredentials[mcp].configured ? 'success' : 'info'"
                    size="small" effect="light">
                    <el-icon>
                      <component
                        :is="mcpCredentials[mcp] && mcpCredentials[mcp].configured ? 'CircleCheckFilled' : 'InfoFilled'" />
                    </el-icon>
                    {{ mcpCredentials[mcp] && mcpCredentials[mcp].configured ? '已配置凭据' : '未配置凭据' }}
                  </el-tag> -->
                </div>
              </div>
            </div>

            <div class="card-right">
              <el-button-group size="small">
                <el-button type="primary" :icon="Setting" @click="handleOpenCredentialDialog(mcp)">
                  修改配置
                </el-button>
                <!-- <el-button :icon="Delete" v-if="mcpCredentials[mcp] && mcpCredentials[mcp].configured" type="danger"
                  @click="handleClearCredential(mcp)">
                  清除
                </el-button> -->
                <el-button :icon="Link" v-if="mcpOptions.some(option => option.name === mcp)" type="success"
                  @click="handleOpenVscodeUrl(mcp)">
                  云开发
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>

        <div class="credentials-footer">
          <el-alert title="提示" type="info" :closable="false" show-icon>
            <template #default>
              MCP凭据配置是可选的，部分MCP可能需要API密钥等凭据信息才能正常工作。
            </template>
          </el-alert>
        </div>
      </div>
    </div>
  </div>

  <!-- 配置对话框组件 -->
  <CredentialDialog v-model:visible="credentialDialogVisible" :credential-fields="currentMcpServer"
    :mcp-name="currentMcp" :mcp-config="currentMcpServer" @close="handleCloseCredentialDialog"
    @save="handleSaveCredentialConfig" @add-field="addCredentialField" @remove-field="removeCredentialField"
    @add-environment-variable="addEnvironmentVariable" @remove-environment-variable="removeEnvironmentVariable" />

  <MenuDialog v-model:visible="menuDialogVisible" :menu-form="menuForm" :icon-options="iconOptions"
    @close="handleCloseMenuDialog" @save="handleSaveMenuConfig" />

  <UserPreferenceDialog v-model:visible="userPreferenceDialogVisible" :user-preference-form="userPreferenceForm"
    @close="handleCloseUserPreferenceDialog" @save="handleSaveUserPreferenceConfig" />
</template>

<script setup>
import CredentialDialog from './CredentialDialog.vue'
import MenuDialog from './MenuDialog.vue'
import UserPreferenceDialog from './UserPreferenceDialog.vue'
import iconOptions from './ElementPlusIcon.js'
import { Setting, Link, Delete, Key, User, Menu, Files, Picture } from '@element-plus/icons-vue'
const props = defineProps({
  taskForm: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'standard',
    validator: (value) => ['standard', 'custom'].includes(value)
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'credentialConfigChange',
  'menuConfigChange', 
  'userPreferenceChange',
  'mcpChange'
])

const handleMenuConfigChange = (value) => {
  emit('menuConfigChange', value)
}

const handleUserPreferenceChange = (value) => {
  emit('userPreferenceChange', value)
}

// MCP相关数据
const selectedMcps = ref([])
const currentMcp = ref('')
const mcpCredentials = ref({})

// Agent相关数据
const selectedAgent = ref('')

// Agent选项
const agentOptions = ref([])

// MCP选项
const mcpOptions = ref([])

// 计算属性：获取选中MCP的显示名称
const selectedMcpNames = computed(() => {
  return selectedMcps.value.map(mcp => {
    // 如果是数字ID，从mcpOptions中找到对应的名称
    if (typeof mcp === 'number') {
      const option = mcpOptions.value.find(option => option.id === mcp)
      return option ? option.name : mcp
    }
    // 如果是字符串，直接返回（新创建的MCP）
    return mcp
  })
})

// 内部状态管理 - 对话框显示状态
const credentialDialogVisible = ref(false)
const menuDialogVisible = ref(false)
const userPreferenceDialogVisible = ref(false)

// 当前凭据配置 - 直接使用后端数据结构
const currentMcpServer = ref({
  id: null,
  name: '',
  prd_id: 0,
  transport: 'streamable_http',
  desc: '',
  url: '',
  version: '',
  env: {},
  credential_conf: {
    id: null,
    mcp_server_id: null,
    name: '',
    prd_id: null,
    config: {}
  }
})

// 内部数据状态
const menuForm = reactive({
  id: null,
  uri: null,
  name: '',
  en_name: '',
  icon: '',
  mobileVersion: ''
})

const userPreferenceForm = reactive({
  preferences: []
})

// 监听抽屉打开状态，每次打开时都重新获取Agent和MCP列表
watch(() => props.visible, (newVisible, oldVisible) => {
  if (newVisible && !oldVisible) {
    // 抽屉从关闭变为打开时执行
    getAgentAndMcpList().then(() => {
      // 在获取Agent列表后，如果已经有选中的Agent，需要初始化相关信息
      if (selectedAgent.value) {
        handleAgentChange(selectedAgent.value)
      }
    })
  }
})

// 初始化MCP选择
onMounted(() => {
  // 初始化Agent选择 - 从props.taskForm.agent.id设置（优先id，app_id为备选）
  if (props.taskForm.agent.id) {
    selectedAgent.value = props.taskForm.agent.id
  } else if (props.taskForm.agent.app_id) {
    selectedAgent.value = props.taskForm.agent.app_id
  }
  
  // 初始化功能开关状态
  if (props.taskForm.agent.menu_conf && Object.keys(props.taskForm.agent.menu_conf).length > 0) {
    props.taskForm.agent.menu = true
  }
  
  if (props.taskForm.agent.user_prefs_confs && Array.isArray(props.taskForm.agent.user_prefs_confs) && props.taskForm.agent.user_prefs_confs.length > 0) {
    props.taskForm.agent.user_prefs = true
  }
  
  // 初始化MCP选择 - 从props.taskForm.agent.mcp_servers提取
  if (props.taskForm.agent.mcp_servers && Array.isArray(props.taskForm.agent.mcp_servers)) {
    const mcpNames = props.taskForm.agent.mcp_servers.map(server => server.name)
    selectedMcps.value = mcpNames
    
    // 初始化MCP凭据配置 - 直接使用后端数据结构
    props.taskForm.agent.mcp_servers.forEach(async (server) => {
      mcpCredentials.value[server.name] = {
        configured: !!(server.credential_conf && Object.keys(server.credential_conf.config || {}).length > 0),
        server: { ...server }
      }
    })
  }
  
  // 如果只有mcpName而没有mcp_servers，也要初始化
  if (props.taskForm.mcpName && !selectedMcps.value.includes(props.taskForm.mcpName)) {
    selectedMcps.value.push(props.taskForm.mcpName)
  }
  
  getAgentAndMcpList().then(() => {
    // 在获取Agent列表后，如果已经有选中的Agent，需要初始化相关信息
    if (selectedAgent.value) {
      handleAgentChange(selectedAgent.value)
    }
  })
})
const getAgentAndMcpList = async () => {
  try {
    const { agents, mcps } = (await getBusyAgentsAndMcps({ task_id: props.taskForm.id })).data
    agents.busy.forEach(agent => {
      agent.disabled = true
    })
    agents.free.forEach(agent => {
      agent.disabled = false
    })
    agentOptions.value = [...agents.free, ...agents.busy]
    mcps.busy.forEach(mcp => {
      mcp.disabled = true
    })
    mcps.free.forEach(mcp => {
      mcp.disabled = false
    })
    mcpOptions.value = [...mcps.free, ...mcps.busy]
  } catch (error) {
    console.error('获取Agent和MCP列表失败:', error)
    ElMessage.error('获取配置列表失败，请刷新页面重试')
  }
}
// MCP变化处理
const handleMcpChange = async (value) => {
  // 验证MCP选择必填
  if (!value || value.length === 0) {
    ElMessage.error('请至少选择一个MCP')
    return
  }

  // 验证新创建的MCP名称规则
  const invalidMcps = []
  value.forEach(mcpName => {
    // 检查是否为新创建的MCP（不在现有选项中）
    const isExistingMcp = mcpOptions.value.some(option => option.name === mcpName)

    // 如果是新创建的MCP，验证命名规则
    if (!isExistingMcp && typeof mcpName === 'string') {
      // 必须以mcp-开头，且只能包含小写字母和连字符
      const mcpNameRegex = /^mcp-[a-z-]+$/
      if (!mcpNameRegex.test(mcpName)) {
        invalidMcps.push(mcpName)
      }
    }
  })

  // 如果有无效的MCP名称，显示错误提示并移除
  if (invalidMcps.length > 0) {
    ElMessage.error(`新创建的MCP名称格式不正确: ${invalidMcps.join(', ')}。必须以"mcp-"开头，只支持小写字母和连字符`)
    // 移除无效的MCP
    const validMcps = value.filter(mcpName => !invalidMcps.includes(mcpName))
    selectedMcps.value = validMcps
    return
  }

  selectedMcps.value = value
  
  // 为新增的MCP初始化凭据配置
  for (const mcpName of value) {
    if (!mcpCredentials.value[mcpName]) {
      // 查找是否是已存在的MCP
      const existingMcp = mcpOptions.value.find(option => option.name === mcpName)
      if (existingMcp) {
        let mcp_server = (await getMcpServerDetail(existingMcp.id)).data.mcp_server
        if (!mcp_server.credential_conf) {
          mcp_server.credential_conf = {
            name: '',
            config: {}
          }
        } else if (!mcp_server.credential_conf.config) {
          mcp_server.credential_conf.config = {}
        }
        // 确保env对象存在
        if (!mcp_server.env) {
          mcp_server.env = {}
        }
        mcpCredentials.value[mcpName] = {
          configured: !!(mcp_server.credential_conf && Object.keys(mcp_server.credential_conf.config || {}).length > 0),
          server: { ...mcp_server }
        }
      } else {
        // 新创建的MCP
        mcpCredentials.value[mcpName] = {
          configured: false,
          server: {
            id: null,
            name: mcpName,
            prd_id: 0,
            transport: 'streamable_http',
            desc: '',
            url: ``,
            version: '',
            env: {},
            credential_conf: {
              id: null,
              mcp_server_id: null,
              name: '',
              prd_id: null,
              config: {}
            }
          }
        }
      }
    }
  }

  // 清理已删除的MCP凭据
  Object.keys(mcpCredentials.value).forEach(mcpName => {
    if (!value.includes(mcpName)) {
      delete mcpCredentials.value[mcpName]
    }
  })

  // 同步更新 props.taskForm.agent.mcp_servers
  if (!props.taskForm.agent.mcp_servers) {
    props.taskForm.agent.mcp_servers = []
  }
  
  // 根据当前选择的 MCP 构建新的 mcp_servers 数组
  const newMcpServers = []
  for (const mcpName of value) {
    if (mcpCredentials.value[mcpName] && mcpCredentials.value[mcpName].server) {
      newMcpServers.push({ ...mcpCredentials.value[mcpName].server })
    } else {
      // 如果没有对应的服务器配置，创建一个基本配置
      const existingMcp = mcpOptions.value.find(option => option.name === mcpName)
      newMcpServers.push({
        id: existingMcp ? existingMcp.id : null,
        name: mcpName,
        prd_id: 0,
        transport: 'streamable_http',
        desc: '',
        url: '',
        version: '',
        env: {},
        credential_conf: {
          id: null,
          mcp_server_id: null,
          name: '',
          prd_id: null,
          config: {}
        }
      })
    }
  }
  
  // 更新 mcp_servers
  props.taskForm.agent.mcp_servers = newMcpServers

  emit('mcpChange', value)
}

// 打开凭据配置对话框
const handleOpenCredentialDialog = (mcpName) => {
  console.log(mcpName, mcpCredentials)
  currentMcp.value = mcpName
  
  // 直接使用后端的server数据结构
  const mcpData = mcpCredentials.value[mcpName]
  if (mcpData && mcpData.server) {
    currentMcpServer.value = JSON.parse(JSON.stringify(mcpData.server)) // 深拷贝
  } else {
    // 默认结构
    currentMcpServer.value = {
      id: null,
      name: mcpName,
      prd_id: 0,
      transport: 'streamable_http',
      desc: '',
      url: ``,
      version: '',
      env: {},
      credential_conf: {
        id: null,
        mcp_server_id: null,
        name: '',
        prd_id: null,
        config: {}
      }
    }
  }
  
  credentialDialogVisible.value = true
}

// 打开其他对话框的方法
const handleOpenMenuDialog = () => {
  menuDialogVisible.value = true
}

const handleOpenUserPreferenceDialog = () => {
  userPreferenceDialogVisible.value = true
}

// 关闭对话框的方法
const handleCloseCredentialDialog = () => {
  credentialDialogVisible.value = false
  currentMcp.value = ''
}

const handleCloseMenuDialog = () => {
  menuDialogVisible.value = false
}

const handleCloseUserPreferenceDialog = () => {
  userPreferenceDialogVisible.value = false
}

// 保存配置的方法
const handleSaveCredentialConfig = () => {
  if (currentMcp.value) {
    // 更新mcpCredentials
    mcpCredentials.value[currentMcp.value] = {
      configured: !!(currentMcpServer.value.credential_conf && Object.keys(currentMcpServer.value.credential_conf.config || {}).length > 0),
      server: { ...currentMcpServer.value }
    }
    
    // 同步保存到 props.taskForm.agent.mcp_servers
    if (!props.taskForm.agent.mcp_servers) {
      props.taskForm.agent.mcp_servers = []
    }
    
    // 查找现有的MCP服务器配置
    const existingServerIndex = props.taskForm.agent.mcp_servers.findIndex(
      server => server.name === currentMcp.value
    )
    
    // 使用当前的server数据（已经包含了所有必要的字段）
    const serverConfig = {
      ...currentMcpServer.value,
      id: existingServerIndex >= 0 ? props.taskForm.agent.mcp_servers[existingServerIndex].id : null
    }
    
    // 确保credential_conf有正确的关联ID
    if (serverConfig.credential_conf) {
      serverConfig.credential_conf.id = existingServerIndex >= 0 ? 
        props.taskForm.agent.mcp_servers[existingServerIndex].credential_conf?.id || null : null
      serverConfig.credential_conf.mcp_server_id = serverConfig.id
    }
    
    if (existingServerIndex >= 0) {
      // 更新现有配置
      props.taskForm.agent.mcp_servers[existingServerIndex] = serverConfig
    } else {
      // 添加新配置
      props.taskForm.agent.mcp_servers.push(serverConfig)
    }
    
    ElMessage.success(`${currentMcp.value} 配置保存成功`)
  }
  credentialDialogVisible.value = false
  currentMcp.value = ''
}

const handleSaveMenuConfig = () => {
  // 将menuForm的值保存到taskForm.agent.menu_conf
  props.taskForm.agent.menu_conf = {
    id: menuForm.id,
    uri: menuForm.uri,
    name: menuForm.name,
    en_name: menuForm.en_name,
    icon: menuForm.icon,
    mobileVersion: menuForm.mobileVersion
  }
  
  ElMessage.success('菜单配置保存成功')
  menuDialogVisible.value = false
}

const handleSaveUserPreferenceConfig = (preferences) => {
  // 将preferences保存到taskForm.agent.user_prefs_confs
  console.log('handleSaveUserPreferenceConfig', preferences)
  props.taskForm.agent.user_prefs_confs = preferences
  ElMessage.success('用户偏好配置保存成功')
  userPreferenceDialogVisible.value = false
}

// 凭据字段管理 - 直接操作credential_conf.config
const addCredentialField = () => {
  console.log('addCredentialField called in CoreConfig')
  // 确保 credential_conf 和 config 对象存在
  if (!currentMcpServer.value.credential_conf) {
    currentMcpServer.value.credential_conf = { config: {} }
  }
  if (!currentMcpServer.value.credential_conf.config) {
    currentMcpServer.value.credential_conf.config = {}
  }
  
  // 添加空的字段，让用户自己填写名称
  currentMcpServer.value.credential_conf.config[''] = {
    desc: '',
    required: false,
    seal: false,
    override: true
  }
}

const removeCredentialField = (fieldKey) => {
  if (currentMcpServer.value.credential_conf && currentMcpServer.value.credential_conf.config) {
    delete currentMcpServer.value.credential_conf.config[fieldKey]
  }
}

// 环境变量管理 - 直接操作env对象
const addEnvironmentVariable = () => {
  console.log('addEnvironmentVariable called in CoreConfig')
  // 确保 env 对象存在
  if (!currentMcpServer.value.env) {
    currentMcpServer.value.env = {}
  }
  
  // 添加空的环境变量，让用户自己填写名称
  currentMcpServer.value.env[''] = ''
}

const removeEnvironmentVariable = (key) => {
  if (currentMcpServer.value.env) {
    delete currentMcpServer.value.env[key]
  }
}

// 清除凭据的方法
const handleClearCredential = (mcpName) => {
  mcpCredentials.value[mcpName] = {
    configured: false,
    server: {
      id: mcpCredentials.value[mcpName]?.server?.id || null,
      name: mcpName,
      prd_id: 0,
      transport: 'streamable_http',
      desc: '',
      url: ``,
      version: '',
      env: {},
      credential_conf: {
        id: null,
        mcp_server_id: null,
        name: '',
        prd_id: null,
        config: {}
      }
    }
  }
  ElMessage.success(`${mcpName} 配置已清除`)
}

// 打开VSCode编辑器URL
const handleOpenVscodeUrl = async (mcpName) => {
  const vscodeUrl = (await getMcpVscodeUrl({ mcp_name: mcpName })).data.mcp_vscode_url
  window.open(vscodeUrl, mcpName)
}

// Agent变化处理
const handleAgentChange = async (value) => {
  selectedAgent.value = value
  if (_.isNumber(value)) { // 选的现有Agent
    const selectedAgentOption = agentOptions.value.find(item => item.id === value)
    try {
      let detail = (await getAgentDetail(value)).data
      detail.agent.menu = !!detail.agent?.menu_conf?.name
      detail.agent.user_prefs = !!detail.agent?.user_prefs_confs?.length
      if (detail.agent.app_id) {
        detail.agent.dify_url = (await getDifyUrl({ app_id: detail.agent.app_id })).data.dify_url
      }
      props.taskForm.agent = detail.agent
    } catch (error) {
      console.warn('获取Dify URL失败:', error)
      props.taskForm.agent.dify_url = ''
    }
  } else { // 新创建的Agent
    props.taskForm.agent = {
      "app_id": null,
      "desc": "",
      "doc": false,
      "id": null,
      "instruction": "",
      "maximum_iterations": null,
      "mcp_servers": [],
      "menu": false,
      "menu_conf": {},
      "mode": "standard",
      "name": value,
      "prd_id": null,
      "user_prefs": false,
      "user_prefs_confs": [],
      "vision": false,
      "dify_url": ""
    }
  }
}

// 打开dify链接的方法
const openDifyUrl = () => {
  if (props.taskForm.agent.dify_url) {
    window.open(props.taskForm.agent.dify_url, '_blank')
  }
}

// 监听 taskForm.agent.menu_conf 的变化，自动赋值给 menuForm
watch(
  () => props.taskForm.agent.menu_conf,
  (newMenuConf) => {
    if (newMenuConf && typeof newMenuConf === 'object') {
      // 如果 menu_conf 有值，将其赋值给 menuForm
      Object.assign(menuForm, {
        id: newMenuConf.id || null,
        uri: newMenuConf.uri || '',
        name: newMenuConf.name || '',
        en_name: newMenuConf.en_name || '',
        icon: newMenuConf.icon || '',
        mobileVersion: newMenuConf.mobile_version || newMenuConf.mobileVersion || ''
      })
    }
  },
  { 
    immediate: true, // 立即执行
    deep: true // 深度监听
  }
)

// 监听 taskForm.agent.user_prefs_confs的变化，自动初始化用户偏好配置
watch(
  () => props.taskForm.agent.user_prefs_confs,
  (newUserPrefsConf) => {
    if (newUserPrefsConf && Array.isArray(newUserPrefsConf) && newUserPrefsConf.length > 0) {
      // 直接使用接口返回的数据结构
      userPreferenceForm.preferences = [...newUserPrefsConf]
    } else {
      userPreferenceForm.preferences = []
    }
  },
  { 
    immediate: true,
    deep: true 
  }
)

// 监听 taskForm.agent.mcp_servers 的变化，自动同步MCP配置
watch(
  () => props.taskForm.agent.mcp_servers,
  (newMcpServers) => {
    if (newMcpServers && Array.isArray(newMcpServers)) {
      const mcpNames = newMcpServers.map(server => server.name)
      
      // 只有当数组内容真正发生变化时才更新
      if (JSON.stringify(mcpNames.sort()) !== JSON.stringify(selectedMcps.value.sort())) {
        selectedMcps.value = mcpNames
      }
      
      // 重新初始化MCP凭据配置 - 直接使用后端数据结构
      mcpCredentials.value = {}
      newMcpServers.forEach(server => {
        mcpCredentials.value[server.name] = {
          configured: !!(server.credential_conf && Object.keys(server.credential_conf.config || {}).length > 0),
          server: { ...server }
        }
      })
    } else {
      // 处理空数组或 undefined 的情况
      if (selectedMcps.value.length > 0) {
        selectedMcps.value = []
      }
      mcpCredentials.value = {}
    }
  },
  { 
    immediate: true,
    deep: true 
  }
)
watch(
  () => props.taskForm.id,
  () => {
    selectedAgent.value = props.taskForm?.agent?.id || null
  },
  { deep: true }
)
</script>

<style lang="stylus" scoped>
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

    .config-options
      margin-top 20px
      padding 16px
      background #ffffff
      border-radius 6px
      border 1px solid #e4e7ed

      .config-item
        text-align center
        padding 12px
        background #fafafa
        border-radius 4px
        border 1px solid #f0f0f0

        .config-header
          display flex
          align-items center
          justify-content center
          gap 6px
          margin-bottom 8px
          font-size 13px
          font-weight 500
          color #303133

          .el-icon
            color #409eff

        .el-switch
          margin 0

        .config-desc
          font-size 12px
          color #909399
          line-height 1.3
          margin-top 8px
          text-align center

    .mcp-credentials
      margin-top 16px
      
      .credentials-header
        display flex
        align-items center
        justify-content space-between
        padding 12px 16px
        margin-bottom 16px
        background #ffffff
        border-radius 8px
        border 1px solid #e4e7ed
        box-shadow 0 1px 3px rgba(0, 0, 0, 0.1)

        h4
          display flex
          align-items center
          gap 8px
          margin 0
          font-size 16px
          font-weight 600
          color #303133

          .el-icon
            color #409eff
            font-size 18px

      .mcp-credential-list
        .mcp-credential-card
          display flex
          align-items center
          justify-content space-between
          padding 16px 20px
          margin-bottom 12px
          background #ffffff
          border-radius 8px
          border 1px solid #e4e7ed
          box-shadow 0 1px 3px rgba(0, 0, 0, 0.1)
          transition all 0.3s ease
          cursor pointer

          &:hover
            box-shadow 0 4px 12px rgba(0, 0, 0, 0.15)
            border-color #409eff

          &.configured
            border-color #67c23a
            background linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)

            .mcp-icon
              background linear-gradient(135deg, #67c23a, #85ce61)
              color #ffffff

          .card-left
            display flex
            align-items center
            gap 12px

            .mcp-icon
              width 40px
              height 40px
              border-radius 8px
              background linear-gradient(135deg, #409eff, #66b1ff)
              display flex
              align-items center
              justify-content center
              color #ffffff
              font-size 18px
              box-shadow 0 2px 8px rgba(64, 158, 255, 0.3)

            .mcp-info
              .mcp-name
                font-size 16px
                font-weight 600
                color #303133
                margin-bottom 4px

              .mcp-status
                .el-tag
                  border-radius 12px
                  padding 4px 8px

          .card-right
            .el-button-group
              .el-button
                border-radius 6px
                font-weight 500
                
                &:first-child
                  border-top-right-radius 0
                  border-bottom-right-radius 0
                
                &:last-child
                  border-top-left-radius 0
                  border-bottom-left-radius 0

      .credentials-footer
        margin-top 16px

    .form-tip
      margin-top 4px
      font-size 12px
      color #909399
      line-height 1.3
      display flex
      align-items center
      gap 4px

      .el-icon
        color #409eff

    .form-tip-bg
      margin-top 4px
      font-size 12px
      color #909399
      line-height 1.3
      display flex
      align-items center
      gap 4px
      padding 4px 8px
      background #f5f7fa
      border-radius 4px
</style> 