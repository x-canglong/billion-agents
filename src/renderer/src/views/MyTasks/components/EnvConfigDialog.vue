<template>
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" :title="mcpName" width="600px"
    class="env-config-dialog" @close="handleClose">
    <div style="max-height: 400px; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span style="color: #606266; font-size: 14px;">
          配置生产环境变量
        </span>
        <el-button type="success" size="small" :icon="Plus" circle @click="addEnvVar" title="添加环境变量" />
      </div>

      <div class="env-vars-container">
        <div v-for="(envVar, index) in localEnvVars" :key="index" class="env-var-row"
          style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
          <el-input v-model="envVar.key" placeholder="变量名" size="default"
            :class="{ 'error-input': getValidationError(index, 'key') }" @input="validateEnvKey(envVar)" />
          <el-input v-model="envVar.value" placeholder="变量值" size="default"
            :class="{ 'error-input': getValidationError(index, 'value') }"
            @input="clearValidationError(index, 'value')" />
          <el-button type="danger" size="small" :icon="Delete" circle @click="removeEnvVar(index)" title="删除" />
        </div>

        <div v-if="localEnvVars.length === 0" style="
            text-align: center; 
            color: #909399; 
            font-size: 14px; 
            padding: 20px;
            border: 2px dashed #e4e7ed;
            border-radius: 6px;
          ">
          暂无环境变量，点击右上方按钮添加
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mcpName: {
    type: String,
    required: true
  },
  envVars: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const localEnvVars = ref([])
const validationErrors = ref({})

// 监听props变化，初始化本地环境变量
watch(() => props.envVars, (newVars) => {
  localEnvVars.value = JSON.parse(JSON.stringify(newVars || []))
}, { immediate: true, deep: true })

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 重置验证错误
    validationErrors.value = {}
    // 重新初始化环境变量
    localEnvVars.value = JSON.parse(JSON.stringify(props.envVars || []))
  }
})

const addEnvVar = () => {
  localEnvVars.value.push({ key: '', value: '' })
}

const removeEnvVar = (index) => {
  localEnvVars.value.splice(index, 1)
}

const getValidationError = (index, field) => {
  return validationErrors.value[`${index}-${field}`]
}

const validateEnvKey = (env, index) => {
  // 只允许大写字母、数字和下划线，不允许空格
  const key = env.key.replace(/[^A-Z0-9_]/g, '')
  if (key !== env.key) {
    env.key = key
  }
  clearValidationError(index, 'key')
}

const clearValidationError = (index, field) => {
  delete validationErrors.value[`${index}-${field}`]
}

const validateEnvVars = () => {
  validationErrors.value = {}
  let hasError = false
  
  localEnvVars.value.forEach((envVar, index) => {
    const key = envVar.key?.trim() || ''
    const value = envVar.value?.trim() || ''
    
    // 验证：有key必须有value，有value必须有key
    if ((key && !value) || (!key && value)) {
      hasError = true
      if (key && !value) {
        validationErrors.value[`${index}-value`] = true
      }
      if (!key && value) {
        validationErrors.value[`${index}-key`] = true
      }
    }
  })
  
  if (hasError) {
    ElMessage.error('环境变量的key和value必须成对出现')
    return false
  }
  
  return true
}

const handleConfirm = () => {
  if (!validateEnvVars()) {
    return
  }
  
  // 过滤掉空的环境变量
  const validEnvVars = localEnvVars.value.filter(envVar => {
    const key = envVar.key?.trim() || ''
    const value = envVar.value?.trim() || ''
    return key && value
  })
  
  emit('confirm', validEnvVars)
  handleClose()
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.env-config-dialog {
  max-width: 90vw;
}

.error-input :deep(.el-input__wrapper) {
  border-color: #f56c6c !important;
  box-shadow: 0 0 0 1px #f56c6c !important;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 