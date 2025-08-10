<template>
  <el-dialog :title="$t('header.chatHistory')" v-model="dialogVisible" width="1100px" :before-close="handleClose"
    class="chat-history-dialog" center>
    <div class="chat-history-container">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline class="filter-form">
          <el-form-item :label="$t('common.search')">
            <el-input v-model="filterForm.searchContent" :placeholder="$t('chat.searchPlaceholder')" clearable
              style="width: 300px" class="search-input">
              <template #prepend>
                <el-select v-model="filterForm.role" :placeholder="$t('chat.role')" style="width: 80px">
                  <el-option :label="$t('common.all')" value="" />
                  <el-option :label="$t('chat.me')" value="user" />
                  <el-option :label="$t('chat.assistant')" value="assistant" />
                </el-select>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item :label="$t('chat.timeRange')">
            <el-date-picker v-model="filterForm.dateRange" type="datetimerange" :range-separator="$t('common.to')"
              :start-placeholder="$t('chat.startTime')" :end-placeholder="$t('chat.endTime')" format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss" style="width: 300px" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格区域 -->
      <div class="table-section">
        <!-- 批量操作栏 -->
        <div class="batch-operations" v-if="selectedRows.length > 0">
          <span class="selected-count">{{ $t('chat.selectedCount', { count: selectedRows.length }) }}</span>
          <el-button type="danger" size="small" @click="batchDelete" :icon="Delete">
            {{ $t('chat.batchDelete') }}
          </el-button>
        </div>

        <el-table :data="tableData" v-loading="loading" stripe border style="width: 100%" :max-height="400"
          class="custom-table chat-table" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column prop="role" :label="$t('chat.role')" width="120" align="center">
            <template #default="scope">
              <el-tag :type="getRoleTagType(scope.row.role)" size="small">
                {{ scope.row.role === 'ai' ? scope.row.agent_name || $t('common.system') : $t('chat.me') }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="content" :label="$t('chat.content')" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              <div class="content-preview">
                {{ scope.row.content || '-' }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="timestamp" :label="$t('common.time')" width="160" align="center">
            <template #default="scope">
              <span>{{ formatTime(scope.row.timestamp) }}</span>
            </template>
          </el-table-column>

          <el-table-column :label="$t('common.actions')" width="160" align="center" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" text @click="viewDetail(scope.row)" :icon="View">
                {{ $t('common.view') }}
              </el-button>
              <el-button type="danger" size="small" text @click="deleteRecord(scope.row)" :icon="Delete">
                {{ $t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination background v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize" :page-sizes="[10, 20, 50, 100]" :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ $t('common.close') }}</el-button>
        <el-button type="primary" @click="exportData" :loading="exportLoading" :icon="Download">
          {{ $t('common.export') }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 详情弹框 -->
  <el-dialog :title="$t('chat.messageDetail')" v-model="detailDialogVisible" width="800px" class="detail-dialog">
    <div class="detail-content" v-if="currentDetail">
      <div class="detail-item">
        <label>{{ $t('chat.role') }}:</label>
        <el-tag :type="getRoleTagType(currentDetail.role)" size="small">
          {{ currentDetail.role === 'ai' ? currentDetail.agent_name || $t('common.system') : $t('chat.me') }}
        </el-tag>
      </div>
      <div class="detail-item">
        <label>{{ $t('common.time') }}:</label>
        <span>{{ formatTime(currentDetail.timestamp) }}</span>
      </div>
      <div class="detail-item full-width" v-if="currentDetail.files && currentDetail.files.length > 0">
        <label>{{ $t('chat.attachments') }}:</label>
        <div class="files-container">
          <div v-for="(file, index) in currentDetail.files" :key="index" class="file-item" @click="openFileUrl(file)">
            <el-icon class="file-icon">
              <Document />
            </el-icon>
            <span class="file-name">{{ file.name || file.url.split('/').pop() }}</span>
          </div>
        </div>
      </div>
      <div class="detail-item full-width">
        <label>{{ $t('chat.content') }}:</label>
        <div class="content-container">
          <div class="markdown-content">
            <Markdown :content="currentDetail.content || ''" />
            <!-- <XMarkdown :markdown="currentDetail.content || ''" class="vp-raw" /> -->
          </div>
          <el-button :type="copyStatus.content ? 'success' : 'primary'" size="small" text
            @click="copyContent(currentDetail.content, 'content')" class="copy-btn" :icon="DocumentCopy">
            {{ copyStatus.content ? $t('chat.copied') : $t('chat.copy') }}
          </el-button>
        </div>
      </div>
      <div class="detail-item full-width" v-if="currentDetail.reasoning_content">
        <label>{{ $t('chat.reasoningContent') }}:</label>
        <div class="content-container">
          <div class="markdown-content">
            <Markdown :content="currentDetail.reasoning_content || ''" />
            <!-- <XMarkdown :markdown="currentDetail.reasoning_content || ''" class="vp-raw" /> -->
          </div>
          <el-button :type="copyStatus.reasoning ? 'success' : 'primary'" size="small" text
            @click="copyContent(currentDetail.reasoning_content, 'reasoning')" class="copy-btn" :icon="DocumentCopy">
            {{ copyStatus.reasoning ? $t('chat.copied') : $t('chat.copy') }}
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, View, Download, DocumentCopy, Document } from '@element-plus/icons-vue'
import db from '@/utils/db.js'
import Markdown from '@/components/Markdown/index.vue'
import { useAppStore } from '@/store/app'
const { t } = useI18n()

// 初始化store
const store = useAppStore()

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const exportLoading = ref(false)
const detailDialogVisible = ref(false)
const currentDetail = ref(null)

// 筛选表单
const filterForm = reactive({
  role: '',
  searchContent: '',
  dateRange: null
})

// 表格数据
const tableData = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 批量操作相关
const selectedRows = ref([])

// 复制状态
const copyStatus = ref({
  content: false,
  reasoning: false
})

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true
    
    let query = db.messages
      .orderBy('log_id')
      .reverse()
      .filter(item => item.user_id === store.userInfo.id)
    
    // 应用筛选条件
    if (filterForm.role) {
      query = query.filter(item => item.role === filterForm.role)
    }
    
    if (filterForm.searchContent) {
      const searchTerm = filterForm.searchContent.toLowerCase()
      query = query.filter(item => {
        const content = (item.content || '').toLowerCase()
        const agentName = (item.agent_name || '').toLowerCase()
        return content.includes(searchTerm) || agentName.includes(searchTerm)
      })
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      const [startTime, endTime] = filterForm.dateRange
      query = query.filter(item => {
        const itemTime = new Date(item.timestamp).getTime()
        return itemTime >= new Date(startTime).getTime() && 
               itemTime <= new Date(endTime).getTime()
      })
    }
    
    const allData = await query.toArray()
    pagination.total = allData.length
    
    // 分页处理
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    tableData.value = allData.slice(startIndex, endIndex)
    
  } catch (error) {
    console.error('获取数据失败:', error)
          ElMessage.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 角色标签类型
const getRoleTagType = (role) => {
  const roleTypes = {
    user: 'primary',
    assistant: 'success'
  }
  return roleTypes[role] || 'info'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 处理筛选 - 改为实时筛选
const handleFilterChange = () => {
  pagination.currentPage = 1
  fetchData()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchData()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  fetchData()
}

// 查看详情
const viewDetail = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

// 删除记录
const deleteRecord = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('chat.confirmDeleteMessage'),
      t('common.confirmDelete'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    await db.messages.delete(row.id)
    
    // 记录已删除的log_id到本地存储
    const deletedLogIds = ls.get(DELETED_LOG_IDS) || []
    if (row.log_id && !deletedLogIds.includes(row.log_id)) {
      deletedLogIds.push(row.log_id)
      ls.set(DELETED_LOG_IDS, JSON.stringify(deletedLogIds))
    }
    
    // 发出删除事件，通知其他组件
    window.dispatchEvent(new CustomEvent('messageDeleted', { 
      detail: { logId: row.log_id, id: row.id } 
    }))
    
    ElMessage.success(t('common.deleteSuccess'))
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(t('common.deleteFailed'))
    }
  }
}

// 导出数据
const exportData = async () => {
  try {
    exportLoading.value = true
    
    // 获取所有筛选后的数据
    let query = db.messages
      .orderBy('log_id')
      .reverse()
      .filter(item => item.user_id === store.userInfo.id)
    
    if (filterForm.role) {
      query = query.filter(item => item.role === filterForm.role)
    }
    
    if (filterForm.searchContent) {
      const searchTerm = filterForm.searchContent.toLowerCase()
      query = query.filter(item => {
        const content = (item.content || '').toLowerCase()
        const agentName = (item.agent_name || '').toLowerCase()
        return content.includes(searchTerm) || agentName.includes(searchTerm)
      })
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      const [startTime, endTime] = filterForm.dateRange
      query = query.filter(item => {
        const itemTime = new Date(item.timestamp).getTime()
        return itemTime >= new Date(startTime).getTime() && 
               itemTime <= new Date(endTime).getTime()
      })
    }
    
    const allData = await query.toArray()
    
    // 生成CSV数据
    const csvHeader = '角色,内容,时间\n'
    const csvData = allData.map(item => {
      const content = (item.content || '').replace(/"/g, '""').replace(/\n/g, ' ')
      const roleDisplay = item.agent_name || '我'
      return `"${roleDisplay}","${content}","${formatTime(item.timestamp)}"`
    }).join('\n')
    
    // 下载文件
    const blob = new Blob([csvHeader + csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `对话历史_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success(t('common.exportSuccess'))
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(t('common.exportFailed'))
  } finally {
    exportLoading.value = false
  }
}

// 关闭弹框
const handleClose = () => {
  emit('update:visible', false)
}

// 监听筛选条件变化，实时筛选
watch([() => filterForm.role, () => filterForm.searchContent, () => filterForm.dateRange], () => {
  handleFilterChange()
}, { deep: true })

// 监听弹框显示
watch(() => props.visible, (val) => {
  if (val) {
    fetchData()
  }
})

// 处理批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      t('chat.confirmBatchDelete'),
      t('common.confirmDelete'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    const logIds = selectedRows.value.map(row => row.log_id).filter(Boolean)
    
    await db.messages.bulkDelete(ids)
    
    // 记录已删除的log_id到本地存储
    if (logIds.length > 0) {
      const deletedLogIds = ls.get(DELETED_LOG_IDS) || []
      const newDeletedIds = logIds.filter(id => !deletedLogIds.includes(id))
      if (newDeletedIds.length > 0) {
        deletedLogIds.push(...newDeletedIds)
        ls.set(DELETED_LOG_IDS, JSON.stringify(deletedLogIds))
      }
      
      // 发出批量删除事件
      window.dispatchEvent(new CustomEvent('messagesDeleted', { 
        detail: { logIds, ids } 
      }))
    }
    
    ElMessage.success(t('common.deleteSuccess'))
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error(t('common.batchDeleteFailed'))
    }
  }
}

// 处理选择变化
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 复制内容
const copyContent = (content, type = 'content') => {
  if (content) {
    const tempInput = document.createElement('input')
    tempInput.value = content
    document.body.appendChild(tempInput)
    tempInput.select()
    document.execCommand('copy')
    document.body.removeChild(tempInput)
    
    // 设置复制状态
    copyStatus.value[type] = true
    
    // 2秒后重置状态
    setTimeout(() => {
      copyStatus.value[type] = false
    }, 2000)
  }
}

// 打开文件
const openFileUrl = (file) => {
  if (file.url) {
    // 检查是否为图片类型
    const name = file.name || file.url.split('/').pop()
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const isImage = imageExtensions.some(
      (ext) =>
        name.toLowerCase().endsWith(ext) ||
        (file.imgFile && file.imgFile.type.startsWith('image/'))
    )

    if (isImage) {
      return
    }

    // 处理文件下载
    try {
      fetch(file.url)
        .then((response) => response.blob())
        .then((blob) => {
          // 创建 Blob URL
          const blobUrl = URL.createObjectURL(blob)

          // 创建下载链接
          const downloadLink = document.createElement('a')
          downloadLink.href = blobUrl
          downloadLink.download = name

          // 触发下载
          document.body.appendChild(downloadLink)
          downloadLink.click()

          // 清理
          setTimeout(() => {
            document.body.removeChild(downloadLink)
            URL.revokeObjectURL(blobUrl)
          }, 100)
        })
                  .catch((err) => {
            console.error('下载文件失败:', err)
            ElMessage.error(t('chat.downloadFailed'))
          })
      } catch (err) {
        console.error('下载文件出错:', err)
        ElMessage.error(t('chat.downloadError'))
      }
  }
}

onMounted(() => {
  if (props.visible) {
    fetchData()
  }
})
</script>

<style lang="stylus" scoped>
.chat-history-dialog
  .el-dialog__body
    padding 10px 20px
    
.chat-history-container
  .filter-section
    background #f8f9fa
    padding 16px
    border-radius 8px
    margin-bottom 16px
    
    .filter-form
      .el-form-item
        margin-bottom 0
        margin-right 16px
        
        &:last-child
          margin-right 0
          
  .table-section
    .batch-operations
      display flex
      align-items center
      justify-content space-between
      padding 12px 16px
      background #fff3cd
      border 1px solid #ffeaa7
      border-radius 6px
      margin-bottom 16px
      
      .selected-count
        color #856404
        font-weight 500
        
    .chat-table
      border-radius 8px
      overflow hidden
      
      .content-preview
        line-height 1.5
        word-break break-word
        max-height 60px
        overflow hidden
        text-overflow ellipsis
        display -webkit-box
        -webkit-line-clamp 3
        -webkit-box-orient vertical
        
      .no-data
        color #c0c4cc
        font-style italic
        
    .pagination-wrapper
      margin-top 16px
      display flex
      justify-content flex-end

.dialog-footer
  display flex
  justify-content flex-end
  gap 12px

.detail-dialog
  .detail-content
    .detail-item
      display flex
      margin-bottom 16px
      
      &.full-width
        flex-direction column
        
      label
        font-weight 600
        color #333
        min-width 80px
        margin-right 12px
        
      .content-container
        background #f8f9fa
        padding 16px
        border-radius 8px
        margin-top 8px
        border 1px solid #e5e6eb
        max-height 400px
        overflow-y auto
        position relative
        
        .copy-btn
          position absolute
          top 8px
          right 8px
          
        .markdown-content
          padding-right 60px
          
      .files-container
        display flex
        flex-wrap wrap
        gap 8px
        margin-top 8px
        
        .file-item
          display flex
          align-items center
          padding 8px 12px
          background #f0f0f0
          border-radius 6px
          cursor pointer
          transition all 0.2s
          
          &:hover
            background #e0e0e0
            
          .file-icon
            margin-right 6px
            color #666
            
          .file-name
            font-size 14px
            color #333

.el-tag
  border-radius 12px
  
.el-button
  border-radius 6px
  
  &.is-text
    padding 4px 8px
    
.el-pagination
  .el-pager li
    border-radius 4px
    
  .btn-prev, .btn-next
    border-radius 4px
</style> 