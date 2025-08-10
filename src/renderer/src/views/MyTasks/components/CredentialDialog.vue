<template>
  <el-dialog v-model="visible" :title="`${mcpName} 配置管理`" width="900px" class="credential-dialog"
    :before-close="handleClose">
    <div class="credential-config">
      <!-- MCP基本配置 -->
      <div class="config-section basic-config">
        <div class="section-header">
          <div class="section-icon">
            <el-icon>
              <Setting />
            </el-icon>
          </div>
          <div class="section-info">
            <h3>基本配置</h3>
            <p>配置MCP的基本信息和类型</p>
          </div>
        </div>

        <div class="section-content">
          <el-row :gutter="24">
            <el-col :span="12">
              <div class="form-group">
                <label class="form-label required">MCP类型</label>
                <el-select v-model="mcpServer.transport" placeholder="请选择MCP类型" size="large" style="width: 100%">
                  <el-option label="sse" value="sse">
                    <div class="option-item">
                      <span>sse</span>
                    </div>
                  </el-option>
                  <el-option label="streamable_http" value="streamable_http">
                    <div class="option-item">
                      <span>streamable_http</span>
                    </div>
                  </el-option>
                </el-select>
              </div>
            </el-col>
            <el-col :span="12" v-if="mcpServer.version">
              <div class="form-group">
                <label class="form-label">版本号</label>
                <el-input v-model="mcpServer.version" placeholder="版本号" size="large" readonly disabled></el-input>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="24">
              <div class="form-group">
                <label class="form-label">MCP描述</label>
                <el-input v-model="mcpServer.desc" type="textarea" :rows="4"
                  placeholder="大模型将使用这段描述自动生成MCP代码（如果为空，表示不用大模型生成代码）" />
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 环境变量配置 -->
      <div class="config-section env-config">
        <div class="section-header">
          <div class="section-icon">
            <el-icon>
              <Key />
            </el-icon>
          </div>
          <div class="section-info">
            <h3>环境变量配置</h3>
            <p>配置MCP运行所需的环境变量</p>
          </div>
          <el-button type="primary" size="default" @click="addEnvironmentVariable" class="add-button" :icon="Plus">
            添加环境变量
          </el-button>
        </div>

        <div class="section-content">
          <div class="env-variables">
            <div v-for="(env, index) in envVariables" :key="index" class="env-item">
              <div class="env-card">
                <div class="env-number">{{ index + 1 }}</div>
                <div class="env-inputs">
                  <div class="input-group">
                    <label>变量名</label>
                    <el-input v-model="env.key" placeholder="ENV_NAME" size="large"
                      :class="{ 'env-error': getEnvKeyError(env.key) }" @input="validateEnvKey(env, index)" />
                    <div v-if="getEnvKeyError(env.key)" class="error-message">{{ getEnvKeyError(env.key) }}</div>
                  </div>
                  <div class="input-group">
                    <label>变量值</label>
                    <el-input v-model="env.value" placeholder="variable value" size="large"
                      :class="{ 'env-error': getEnvValueError(env.key, env.value) }"
                      @input="validateEnvValue(env, index)" />
                    <div v-if="getEnvValueError(env.key, env.value)" class="error-message">{{ getEnvValueError(env.key,
                      env.value) }}</div>
                  </div>
                </div>
                <el-button type="danger" size="small" circle @click="removeEnvironmentVariable(index)"
                  class="delete-button" :icon="Delete">
                </el-button>
              </div>
            </div>

            <div v-if="envVariables.length === 0" class="empty-state">
              <div class="empty-icon">
                <el-icon>
                  <DocumentAdd />
                </el-icon>
              </div>
              <p>暂无环境变量</p>
              <span>点击上方按钮添加环境变量</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 凭据配置 -->
      <div class="config-section credential-config-section">
        <div class="section-header">
          <div class="section-icon">
            <el-icon>
              <Lock />
            </el-icon>
          </div>
          <div class="section-info">
            <h3>凭据配置</h3>
            <p>配置MCP访问所需的认证凭据</p>
          </div>
          <el-button type="primary" size="default" @click="addCredentialField" class="add-button" :icon="Plus">
            添加凭据字段
          </el-button>
        </div>

        <div class="section-content">
          <!-- 凭据名称 -->
          <div class="credential-name-container">
            <div class="form-group">
              <label class="form-label" :class="{ 'required': credentialFields.length > 0 }">凭据名称</label>
              <el-input v-model="mcpServer.credential_conf.name" placeholder="请输入凭据名称" size="large" />
            </div>
          </div>

          <div class="credential-fields">
            <div v-for="(field, index) in credentialFields" :key="index" class="field-item">
              <div class="field-card">
                <div class="field-header">
                  <div class="field-number">
                    <el-icon>
                      <Key />
                    </el-icon>
                    <span>凭据字段 {{ index + 1 }}</span>
                  </div>
                  <el-button type="danger" size="small" circle @click="removeCredentialField(index)"
                    class="delete-button" :icon="Delete">
                  </el-button>
                </div>

                <div class="field-content">
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <div class="form-group">
                        <label class="form-label">字段名称</label>
                        <el-input v-model="field.key" placeholder="请输入字段名称" size="large" />
                      </div>
                    </el-col>
                    <el-col :span="12">
                      <div class="form-group">
                        <label class="form-label">字段描述</label>
                        <el-input v-model="field.desc" placeholder="请输入字段描述" size="large" />
                      </div>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="12">
                      <div class="form-group">
                        <label class="form-label">默认值 <span class="optional">（可选）</span></label>
                        <el-input v-model="field.default" placeholder="请输入默认值" size="large" />
                      </div>
                    </el-col>
                    <el-col :span="12">
                      <div class="form-group">
                        <label class="form-label">属性设置</label>
                        <div class="checkbox-group">
                          <el-checkbox v-model="field.required" size="large">
                            <span class="checkbox-label">必填</span>
                          </el-checkbox>
                          <el-checkbox v-model="field.seal" size="large">
                            <span class="checkbox-label">密文</span>
                          </el-checkbox>
                          <el-checkbox v-model="field.override" size="large">
                            <span class="checkbox-label">可覆盖</span>
                          </el-checkbox>
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </div>

            <div v-if="credentialFields.length === 0" class="empty-state">
              <div class="empty-icon">
                <el-icon>
                  <Lock />
                </el-icon>
              </div>
              <p>暂无凭据字段</p>
              <span>点击上方按钮添加凭据字段</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="large" @click="handleClose" :icon="Close">
          取消
        </el-button>
        <el-button type="primary" size="large" @click="saveCredentialConfig" :icon="Check">
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Close, Check } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  credentialFields: {
    type: Object,
    required: true
  },
  mcpName: {
    type: String,
    required: true
  },
  mcpConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update:visible',
  'close',
  'save',
  'add-field',
  'remove-field',
  'add-environment-variable',
  'remove-environment-variable'
])

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 直接使用后端数据结构
const mcpServer = computed(() => {
  const config = props.mcpConfig
  if (!config) return {}
  
  // 确保credential_conf对象的完整性
  if (!config.credential_conf) {
    config.credential_conf = {
      name: '',
      config: {}
    }
  } else if (!config.credential_conf.config) {
    config.credential_conf.config = {}
  }
  
  // 确保env对象存在
  if (!config.env) {
    config.env = {}
  }
  
  return config
})

// 创建响应式数组数据，便于编辑
const envVariables = ref([])
const credentialFields = ref([])

// 监听mcpServer变化，初始化数组数据
watch(
  mcpServer,
  (newServer) => {
    if (newServer) {
      // 初始化环境变量数组
      envVariables.value = Object.entries(newServer.env || {}).map(([key, value]) => ({ key, value }))
      
      // 初始化凭据字段数组
      if (newServer.credential_conf && newServer.credential_conf.config) {
        credentialFields.value = Object.entries(newServer.credential_conf.config).map(([key, config]) => ({
          key,
          ...config
        }))
      } else {
        credentialFields.value = []
      }
    }
  },
  { immediate: true, deep: true }
)

const handleClose = () => {
  emit('close')
}

const addCredentialField = () => {
  console.log('addCredentialField called')
  credentialFields.value.push({
    key: '',
    desc: '',
    required: false,
    seal: false,
    override: true
  })
  console.log('credentialFields after add:', credentialFields.value)
}

const removeCredentialField = (index) => {
  credentialFields.value.splice(index, 1)
}

const addEnvironmentVariable = () => {
  console.log('addEnvironmentVariable called')
  envVariables.value.push({ key: '', value: '' })
  console.log('envVariables after add:', envVariables.value)
}

const removeEnvironmentVariable = (index) => {
  envVariables.value.splice(index, 1)
}

const handleCredentialKeyChange = (oldKey, newKey) => {
  if (oldKey !== newKey && mcpServer.value.credential_conf && mcpServer.value.credential_conf.config) {
    const fieldConfig = mcpServer.value.credential_conf.config[oldKey]
    delete mcpServer.value.credential_conf.config[oldKey]
    mcpServer.value.credential_conf.config[newKey] = fieldConfig
  }
}

const handleEnvKeyChange = (oldKey, newKey) => {
  if (oldKey !== newKey) {
    const value = mcpServer.value.env[oldKey]
    delete mcpServer.value.env[oldKey]
    mcpServer.value.env[newKey] = value
  }
}

const saveCredentialConfig = () => {
  // 将数组数据转换回对象
  // 环境变量
  const newEnv = {}
  envVariables.value.forEach(item => {
    if (item.key && item.key.trim()) {
      newEnv[item.key.trim()] = item.value || ''
    }
  })
  mcpServer.value.env = newEnv
  
  // 凭据字段
  if (!mcpServer.value.credential_conf) {
    mcpServer.value.credential_conf = { config: {} }
  }
  const newConfig = {}
  credentialFields.value.forEach(item => {
    if (item.key && item.key.trim()) {
      const { key, ...config } = item
      newConfig[key.trim()] = config
    }
  })
  mcpServer.value.credential_conf.config = newConfig
  
  // 校验逻辑
  let hasError = false
  const errorMessages = []
  
  // 校验凭据名称
  if (mcpServer.value.credential_conf && credentialFields.value.length > 0 && !mcpServer.value.credential_conf.name) {
    errorMessages.push('凭据名称不能为空')
    hasError = true
  }
  
  // 检查环境变量
  envVariables.value.forEach((env, index) => {
    if (!env.key || !env.key.trim()) {
      errorMessages.push(`环境变量 ${index + 1}: 变量名不能为空`)
      hasError = true
    }
    if (!env.value || !env.value.trim()) {
      errorMessages.push(`环境变量 ${index + 1}: 变量值不能为空`)
      hasError = true
    }
  })
  
  // 检查凭据字段
  credentialFields.value.forEach((field, index) => {
    if (!field.key || !field.key.trim()) {
      errorMessages.push(`凭据字段 ${index + 1}: 字段名称不能为空`)
      hasError = true
    }
    
    if (!field.desc || !field.desc.trim()) {
      errorMessages.push(`凭据字段 ${index + 1}: 字段描述不能为空`)
      hasError = true
    }
  })
  
  if (hasError) {
    ElMessage.error({
      message: `配置验证失败：\n${errorMessages.join('\n')}`,
      duration: 5000,
      showClose: true
    })
    return
  }
  
  emit('save')
}

const validateEnvKey = (env, index) => {
  // 只允许大写字母、数字和下划线，不允许空格
  const key = env.key.replace(/[^A-Z0-9_]/g, '')
  if (key !== env.key) {
    env.key = key
  }
}

const getEnvKeyError = (key) => {
  if (!key) {
    return '变量名不能为空'
  }
  if (/\s/.test(key)) {
    return '变量名不能包含空格'
  }
  if (!/^[A-Z0-9_]*$/.test(key)) {
    return '变量名只能包含大写字母、数字和下划线'
  }
  return null
}

const validateEnvValue = (env, index) => {
  // 移除空格
  const value = env.value.replace(/\s/g, '')
  if (value !== env.value) {
    env.value = value
  }
}

const getEnvValueError = (key, value) => {
  if (!value) {
    return '变量值不能为空'
  }
  if (/\s/.test(value)) {
    return '变量值不能包含空格'
  }
  return null
}
</script>

<style lang="stylus" scoped>
.credential-dialog
  :deep(.el-dialog)
    border-radius 16px
    overflow hidden
    box-shadow 0 24px 48px rgba(0, 0, 0, 0.15)
    
  :deep(.el-dialog__header)
    background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
    color white
    padding 24px 32px
    border-radius 16px 16px 0 0
    
    .el-dialog__title
      font-size 20px
      font-weight 600
      
  :deep(.el-dialog__body)
    padding 0
    background #f8fafe
    
  :deep(.el-dialog__footer)
    padding 0
    background transparent

.credential-config
  .config-section
    margin-bottom 24px
    background white
    border-radius 12px
    overflow hidden
    box-shadow 0 2px 8px rgba(0, 0, 0, 0.06)
    transition all 0.3s ease
    
    &:hover
      box-shadow 0 8px 24px rgba(0, 0, 0, 0.12)
      
    &:last-child
      margin-bottom 0
    
    .section-header
      display flex
      align-items center
      padding 20px 24px
      background linear-gradient(135deg, #f8fafe 0%, #ffffff 100%)
      border-bottom 1px solid #e4e7ed
      
      .section-icon
        width 48px
        height 48px
        border-radius 12px
        background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
        display flex
        align-items center
        justify-content center
        margin-right 16px
        
        .el-icon
          font-size 20px
          color white
          
      .section-info
        flex 1
        
        h3
          margin 0 0 4px 0
          font-size 18px
          font-weight 600
          color #303133
          
        p
          margin 0
          font-size 14px
          color #909399
          
      .add-button
        border-radius 8px
        padding 10px 20px
        font-weight 500
        
    .section-content
      padding 24px

.basic-config
  .section-icon
    background linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)

.env-config
  .section-icon
    background linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)

.credential-config-section
  .section-icon
    background linear-gradient(135deg, #fa709a 0%, #fee140 100%)

.form-group
  margin-bottom 20px
  
  .form-label
    display block
    margin-bottom 8px
    font-size 14px
    font-weight 500
    color #303133
    
    &.required::after
      content "*"
      color #f56c6c
      margin-left 4px
      
    .optional
      font-size 12px
      color #909399
      font-weight 400

.option-item
  display flex
  align-items center
  gap 8px
  
  .el-icon
    color #409eff

.env-variables
  .env-item
    margin-bottom 16px
    
  .env-card
    display flex
    align-items center
    gap 16px
    padding 20px
    background #f8fafe
    border-radius 12px
    border 1px solid #e4e7ed
    transition all 0.3s ease
    
    &:hover
      border-color #409eff
      box-shadow 0 4px 12px rgba(64, 158, 255, 0.15)
      
    .env-number
      width 32px
      height 32px
      border-radius 50%
      background linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)
      color white
      display flex
      align-items center
      justify-content center
      font-weight 600
      font-size 14px
      
    .env-inputs
      flex 1
      display flex
      gap 16px
      
      .input-group
        flex 1
        
        label
          display block
          margin-bottom 6px
          font-size 13px
          font-weight 500
          color #606266
          
        .error-message
          margin-top 4px
          font-size 12px
          color #f56c6c
          line-height 1.2
          
        :deep(.env-error)
          .el-input__wrapper
            border-color #f56c6c
            
        :deep(.env-error:focus-within)
          .el-input__wrapper
            border-color #f56c6c
            box-shadow 0 0 0 2px rgba(245, 108, 108, 0.2)
          
    .delete-button
      width 36px
      height 36px

.credential-fields
  .field-item
    margin-bottom 20px
    
  .field-card
    background #f8fafe
    border-radius 12px
    border 1px solid #e4e7ed
    overflow hidden
    transition all 0.3s ease
    
    &:hover
      border-color #409eff
      box-shadow 0 4px 12px rgba(64, 158, 255, 0.15)
    
    .field-header
      display flex
      align-items center
      justify-content space-between
      padding 16px 20px
      background linear-gradient(135deg, #ffffff 0%, #f8fafe 100%)
      border-bottom 1px solid #e4e7ed
      
      .field-number
        display flex
        align-items center
        gap 8px
        font-weight 600
        color #303133
        
        .el-icon
          color #fa709a
          
      .delete-button
        width 32px
        height 32px
        
    .field-content
      padding 20px

.checkbox-group
  display flex
  gap 20px
  margin-top 8px
  
  .el-checkbox
    margin-right 0
    
    .checkbox-label
      font-weight 500
      color #303133

.empty-state
  text-align center
  padding 60px 20px
  color #909399
  
  .empty-icon
    width 64px
    height 64px
    border-radius 50%
    background #f0f0f0
    display flex
    align-items center
    justify-content center
    margin 0 auto 16px
    
    .el-icon
      font-size 28px
      color #c0c4cc
      
  p
    margin 0 0 8px 0
    font-size 16px
    font-weight 500
    color #606266
    
  span
    font-size 14px

.dialog-footer
  padding 20px 32px
  background white
  border-top 1px solid #e4e7ed
  display flex
  justify-content flex-end
  gap 12px
  
  .el-button
    border-radius 8px
    padding 12px 24px
    font-weight 500
    min-width 100px

.credential-name-container
  margin-bottom 24px
  padding 20px
  background #f8fafe
  border-radius 12px
  border 1px solid #e4e7ed
  transition all 0.3s ease
  
  &:hover
    border-color #409eff
    box-shadow 0 4px 12px rgba(64, 158, 255, 0.15)
</style> 