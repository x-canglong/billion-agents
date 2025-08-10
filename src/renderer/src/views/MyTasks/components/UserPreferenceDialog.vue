<template>
  <el-dialog v-model="visible" title="用户偏好配置" width="700px" :close-on-click-modal="false">
    <div class="preference-container">
      <!-- 偏好选择器 -->
      <div class="preference-selector">
        <div class="selector-header">
          <h3>
            <el-icon><User /></el-icon>
            选择偏好设置
          </h3>
        </div>
        
        <el-select
          v-model="selectedPreferenceId"
          placeholder="搜索并选择偏好设置..."
          filterable
          clearable
          remote
          reserve-keyword
          :remote-method="handleSearch"
          :loading="searchLoading"
          @change="handlePreferenceSelect"
          style="width: 100%; margin-bottom: 20px;"
          size="large"
        >
          <el-option
            v-for="preference in filteredPreferences"
            :key="preference.id"
            :label="`${preference.name} - ${preference.type}`"
            :value="preference.id"
            :disabled="isSelected(preference.id)"
          >
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">{{ preference.name }}</span>
                <el-tag :type="getTypeColor(preference.type)" size="small">
                  {{ preference.type }}
                </el-tag>
              </div>
              <div class="option-desc">{{ preference.desc }}</div>
            </div>
          </el-option>
        </el-select>
      </div>

      <!-- 已选偏好列表 -->
      <div class="selected-preferences">
        <div class="list-header">
          <h3>
            <el-icon><List /></el-icon>
            已选偏好
          </h3>
          <div class="selected-count">
            共 {{ selectedPreferences.length }} 项
          </div>
        </div>
        
        <div class="preference-items" v-if="selectedPreferences.length > 0">
          <div 
            v-for="(preference, index) in selectedPreferences" 
            :key="preference.id"
            class="preference-item"
          >
            <div class="item-content">
              <div class="item-header">
                <div class="item-info">
                  <div class="item-name">{{ preference.name }}</div>
                  <div class="item-type">
                    <el-tag :type="getTypeColor(preference.type)" size="small">
                      {{ preference.type }}
                    </el-tag>
                  </div>
                </div>
                <div class="item-actions">
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="removePreference(index)"
                    :icon="Delete"
                  >
                    移除
                  </el-button>
                </div>
              </div>
              <div class="item-desc">{{ preference.desc }}</div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <el-empty description="请从上方选择偏好设置" :image-size="80" />
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="saveSelectedPreferences" :disabled="selectedPreferences.length === 0">
        保存选择 ({{ selectedPreferences.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { User, List, Delete } from '@element-plus/icons-vue'
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  userPreferenceForm: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update:visible',
  'close',
  'save'
])

const availablePreferences = ref([])
const filteredPreferences = ref([])
const selectedPreferences = ref([])
const selectedPreferenceId = ref(null)
const loading = ref(false)
const searchLoading = ref(false)
const searchKeyword = ref('')

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 监听 visible 变化，初始化数据
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      initializePreferences()
    }
  },
  { immediate: true }
)

// 初始化偏好设置
const initializePreferences = async () => {
  try {
    loading.value = true
    
    // 获取所有可用偏好
    const res = await getUserPrefsConfs()
    if (res && res.data.user_prefs_confs) {
      availablePreferences.value = res.data.user_prefs_confs
      filteredPreferences.value = res.data.user_prefs_confs.slice(0, 50) // 初始显示前50项
    }
    
    // 初始化已选择的偏好
    if (props.userPreferenceForm && Array.isArray(props.userPreferenceForm.preferences)) {
      selectedPreferences.value = [...props.userPreferenceForm.preferences]
    } else {
      selectedPreferences.value = []
    }
    
    selectedPreferenceId.value = null
    searchKeyword.value = ''
  } catch (error) {
    console.error('获取偏好配置失败:', error)
    ElMessage.error('获取偏好配置失败')
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = (query) => {
  searchLoading.value = true
  searchKeyword.value = query
  
  setTimeout(() => {
    if (query) {
      // 根据名称、类型、描述进行模糊搜索
      filteredPreferences.value = availablePreferences.value.filter(pref => 
        pref.name.toLowerCase().includes(query.toLowerCase()) ||
        pref.type.toLowerCase().includes(query.toLowerCase()) ||
        pref.desc.toLowerCase().includes(query.toLowerCase())
      )
    } else {
      // 无搜索条件时显示前50项
      filteredPreferences.value = availablePreferences.value.slice(0, 50)
    }
    searchLoading.value = false
  }, 200)
}

// 获取类型颜色
const getTypeColor = (type) => {
  const colorMap = {
    '客户端': 'primary',
    '服务端': 'success',
    '通用': 'info',
    '用户界面': 'warning',
    '数据偏好': 'danger',
    '通知偏好': 'primary',
    '安全偏好': 'danger'
  }
  return colorMap[type] || 'success'
}

// 检查偏好是否已选择
const isSelected = (preferenceId) => {
  return selectedPreferences.value.some(pref => pref.id === preferenceId)
}

// 处理偏好选择
const handlePreferenceSelect = (preferenceId) => {
  if (!preferenceId) return
  
  const preference = availablePreferences.value.find(pref => pref.id === preferenceId)
  if (preference && !isSelected(preferenceId)) {
    selectedPreferences.value.push({
      id: preference.id,
      name: preference.name,
      desc: preference.desc,
      type: preference.type,
      config: preference.config || {}
    })
    
    ElMessage.success(`已添加偏好：${preference.name}`)
  }
  
  // 清空选择
  selectedPreferenceId.value = null
}

// 移除偏好
const removePreference = (index) => {
  const preference = selectedPreferences.value[index]
  selectedPreferences.value.splice(index, 1)
  ElMessage.success(`已移除偏好：${preference.name}`)
}

// 保存选择的偏好
const saveSelectedPreferences = () => {
  emit('save', selectedPreferences.value)
  ElMessage.success(`已保存 ${selectedPreferences.value.length} 项偏好配置`)
}

// 关闭对话框
const handleClose = () => {
  emit('close')
}

// 暴露方法
defineExpose({
  initializePreferences
})
</script>

<style lang="stylus" scoped>
.preference-container
  display flex
  flex-direction column
  gap 20px

.preference-selector
  .selector-header
    margin-bottom 12px

    h3
      display flex
      align-items center
      gap 8px
      margin 0
      font-size 15px
      color #303133

      .el-icon
        color #409eff

.selected-preferences
  .list-header
    display flex
    justify-content space-between
    align-items center
    margin-bottom 12px
    padding-bottom 8px
    border-bottom 1px solid #ebeef5

    h3
      display flex
      align-items center
      gap 8px
      margin 0
      font-size 15px
      color #303133

      .el-icon
        color #409eff

    .selected-count
      font-size 13px
      color #909399
      padding 4px 8px
      background #f0f9ff
      border-radius 4px

.preference-items
  max-height 300px
  overflow-y auto

.preference-item
  margin-bottom 12px
  padding 16px
  background #fafafa
  border-radius 8px
  border 1px solid #e4e7ed
  transition all 0.3s ease

  .item-content
    .item-header
      display flex
      justify-content space-between
      align-items flex-start
      margin-bottom 8px

      .item-info
        flex 1

        .item-name
          font-size 14px
          font-weight 600
          color #303133
          margin-bottom 4px

        .item-type
          display inline-block

      .item-actions
        display flex
        gap 8px

    .item-desc
      font-size 13px
      color #606266
      line-height 1.4

.empty-state
  text-align center
  padding 40px 20px

.option-content
  .option-header
    display flex
    justify-content space-between
    align-items center
    margin-bottom 4px

    .option-name
      font-weight 500
      color #303133

  .option-desc
    font-size 12px
    color #909399
    line-height 1.3

/* 确保对话框内的元素不会溢出 */
:deep(.el-dialog__body) {
  max-height 70vh
  overflow-y auto
}

:deep(.el-select-dropdown__item) {
  height auto
  padding 8px 20px
  
  &.is-disabled {
    color #c0c4cc
    background-color #f5f7fa
  }
}

:deep(.el-select .el-input__inner) {
  height 40px
}
</style> 