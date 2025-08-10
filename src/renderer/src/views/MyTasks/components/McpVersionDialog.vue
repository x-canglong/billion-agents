<template>
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" :title="dialogTitle"
    width="800px" :close-on-click-modal="false" :close-on-press-escape="false" @close="handleClose">
    <div style="max-height: 500px; overflow-y: auto;">
      <p style="margin-bottom: 16px; font-weight: 600;"
        :style="{ color: hasAnyMissingVersions ? '#f56c6c' : '#409eff' }">
        {{ hasAnyMissingVersions ? '⚠️ 以下MCP版本信息检查结果：' : '📦 请为每个MCP选择要发布的版本：' }}
      </p>

      <el-table :data="mcpVersionInfo" style="width: 100%" border>
        <el-table-column label="MCP名称" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-icon :color="row.hasVersions ? '#67c23a' : '#f56c6c'" size="16">
                <CircleCheck v-if="row.hasVersions" />
                <CircleClose v-else />
              </el-icon>
              <span style="font-weight: 600;">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="hasAnyMissingVersions ? '版本状态' : '选择版本'" width="250">
          <template #default="{ row }">
            <el-select v-if="row.hasVersions" v-model="selectedVersions[row.name]" placeholder="请选择版本"
              style="width: 100%">
              <el-option v-for="version in row.versions" :key="version" :label="version" :value="version" />
            </el-select>
            <span v-else style="color: #f56c6c; font-weight: 500;">
              无可用版本
            </span>
          </template>
        </el-table-column>

        <el-table-column label="生产环境变量" width="150">
          <template #default="{ row }">
            <el-link v-if="row.hasVersions" type="primary" :underline="false" @click="openEnvConfig(row.name)" style="font-size: 12px;">
              配置环境变量
            </el-link>
            <span v-else style="color: #f56c6c;font-size: 12px;">-</span>
          </template>
        </el-table-column>
      </el-table>

      <p style="margin-top: 16px; font-weight: 600;" :style="{ color: hasAnyMissingVersions ? '#f56c6c' : '#67c23a' }">
        {{ hasAnyMissingVersions ? '⚠️ 存在没有版本号的MCP，无法发布上线' : '✅ 请为所有有版本的MCP选择要发布的版本' }}
      </p>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button :type="showCancelButton ? 'default' : 'primary'" @click="handleClose">
          {{ showCancelButton ? '取消' : '确定' }}
        </el-button>
        <el-button v-if="showCancelButton" type="primary" @click="handleConfirm">
          确认发布
        </el-button>
      </span>
    </template>

    <!-- 环境变量配置弹框 -->
    <EnvConfigDialog v-model:visible="envDialogVisible" :mcp-name="currentMcpName"
      :env-vars="envConfigs[currentMcpName] || []" @confirm="handleEnvConfirm" />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import EnvConfigDialog from './EnvConfigDialog.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mcpVersionInfo: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const selectedVersions = ref({})
const envConfigs = ref({})
const envDialogVisible = ref(false)
const currentMcpName = ref('')

// 计算属性
const hasAnyMissingVersions = computed(() => {
  return props.mcpVersionInfo.some(mcp => !mcp.hasVersions)
})

const dialogTitle = computed(() => {
  return hasAnyMissingVersions.value ? 'MCP版本检查 - 发现问题' : 'MCP版本选择'
})

const showCancelButton = computed(() => {
  return !hasAnyMissingVersions.value
})

// 监听props变化，初始化数据
watch(() => props.mcpVersionInfo, (newInfo) => {
  if (newInfo && newInfo.length > 0) {
    selectedVersions.value = {}
    envConfigs.value = {}
    
    newInfo.forEach(mcp => {
      if (mcp.hasVersions) {
        selectedVersions.value[mcp.name] = mcp.selectedVersion || (mcp.versions.length > 0 ? mcp.versions[0] : '')
      }
      envConfigs.value[mcp.name] = mcp.envConfig || []
    })
  }
}, { immediate: true })

const openEnvConfig = (mcpName) => {
  currentMcpName.value = mcpName
  envDialogVisible.value = true
}

const handleEnvConfirm = (envVars) => {
  envConfigs.value[currentMcpName.value] = envVars
}

const handleConfirm = () => {
  if (hasAnyMissingVersions.value) {
    emit('confirm', null)
    return
  }
  
  // 验证所有有版本的MCP都已选择版本
  let allSelected = true
  const result = {}
  
  props.mcpVersionInfo.forEach(mcp => {
    if (mcp.hasVersions) {
      const selectedVersion = selectedVersions.value[mcp.name]
      if (!selectedVersion) {
        allSelected = false
      } else {
        result[mcp.name] = {
          version: selectedVersion,
          envConfig: envConfigs.value[mcp.name] || []
        }
      }
    }
  })
  
  if (!allSelected) {
    ElMessage.error('请为所有有版本的MCP选择版本')
    return
  }
  
  emit('confirm', result)
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 