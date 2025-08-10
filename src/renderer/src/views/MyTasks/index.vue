<template>
  <div class="my-tasks-container">
    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input v-model="searchKeyword" placeholder="搜索开发任务名称" clearable @input="loadTasks">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="选择状态" clearable @change="loadTasks">
            <el-option v-for="status in statusList" :key="status.value" :label="status.label" :value="status.value" />
          </el-select>
        </el-col>
        <el-col :span="12"></el-col>
        <el-col :span="2">
          <el-button type="primary" :icon="Refresh" @click="loadTasks" style="width: 100%;min-width: 110px;">
            刷新列表
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 任务列表表格 -->
    <div class="table-section">
      <el-table class="custom-table" :data="taskList" stripe border :height="maxHeight" style="width: 100%"
        v-loading="loading" show-overflow-tooltip>
        <el-table-column prop="requirement_name" label="需求名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="name" label="开发任务名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="agent_name" label="Agent名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" header-align="center">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" text @click="handleDevelopClick(scope.row)">
              开发
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination background v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total"
        :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" />
    </div>

    <!-- 开发任务抽屉 -->
    <TaskDrawer v-model:visible="developDialogVisible" :task-form="taskForm" @refresh="handleRefresh" />
  </div>
</template>

<script setup>
import TaskDrawer from './components/TaskDrawer.vue'
import { Search, Refresh, Edit } from '@element-plus/icons-vue'
const loading = ref(false)
const developDialogVisible = ref(false)
const isEdit = ref(false)
const currentTask = ref(null)

// 状态列表 - 统一状态管理
const statusList = ref([
  { label: '未开始', value: 'open' },
  { label: '开发中', value: 'in_progress' },
  { label: '已上线', value: 'published' }
])

// 搜索和筛选
const searchKeyword = ref('')
const statusFilter = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const maxHeight = computed(() => window.innerHeight - 250)

// 任务列表数据
const taskList = ref([])

// 任务表单数据
const taskForm = ref({
  id: '',
  requirementName: '',
  requirementDetail: '',
  implementType: 'standard', // 'standard' | 'custom'
  agentName: '',
  agentDescription: '',
  systemInstruction: '',
  maxIterations: 5,
  mcpName: '',
  needMcp: false,
  imageSupport: false,
  docSupport: false,
  credentialConfig: false,
  menuConfig: false,
  user_prefs: false,
  user_prefs_confs: [],
  status: 'open' // 使用statusList的默认值
})

// 初始化
onMounted(() => {
  loadTasks()
})

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const res = await getTaskList({
      wd: searchKeyword.value,
      status: statusFilter.value,
      page: currentPage.value,
      limit: pageSize.value
    })
    taskList.value = res.data.dev_tasks
    total.value = res.data.total
    loading.value = false
  } catch (error) {
    loading.value = false
  }
}
const handleRefresh = (env) => {
  if (env === 'test') {
    loadTasks()
    handleDevelopClick({ id: currentTask.value.id })
  } else {
    loadTasks()
  }
}
// 分页事件处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  loadTasks()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadTasks()
}

// 根据状态值获取状态标签类型
const getStatusType = (status) => {
  const statusTypeMap = {
    'open': 'info',
    'in_progress': 'warning',
    'published': 'success'
  }
  return statusTypeMap[status] || 'info'
}

// 根据状态值获取状态标签文本
const getStatusLabel = (status) => {
  const statusItem = statusList.value.find(item => item.value === status)
  return statusItem ? statusItem.label : status
}

// 开发按钮点击处理
const handleDevelopClick = async (task) => {
  let detail = (await getTaskDetail(task.id)).data.task
  detail.agent = detail.agent || { mcp_servers: [], menu_conf: {}, user_prefs_confs: [] }
  detail.agent.mode = detail.agent.mode || 'standard'
  detail.agent.menu = !!detail.agent?.menu_conf?.name
  detail.agent.user_prefs = !!detail.agent?.user_prefs_confs?.length
  
  // 确保每个mcp_server的credential_conf不为null
  if (detail.agent.mcp_servers && Array.isArray(detail.agent.mcp_servers)) {
    detail.agent.mcp_servers.forEach(server => {
      if (!server.credential_conf) {
        server.credential_conf = {
          name: '',
          config: {}
        }
      } else if (!server.credential_conf.config) {
        server.credential_conf.config = {}
      }
      // 确保env对象存在
      if (!server.env) {
        server.env = {}
      }
    })
  }
  
  if (detail.agent.app_id) { 
    detail.agent.dify_url = (await getDifyUrl({ app_id: detail.agent.app_id })).data.dify_url
  }
  currentTask.value = detail
  isEdit.value = !!detail.id
  taskForm.value = detail
  developDialogVisible.value = true
}
</script>

<style lang="stylus" scoped>
.my-tasks-container
  padding 20px

.search-section
  margin-bottom 20px
  padding 20px
  background #f5f7fa
  border-radius 8px

.no-mcp
  color #999
  font-style italic

.pagination-section
  display flex
  justify-content center
  padding 20px 0
  
.page-title
  margin-bottom 20px
  font-size 24px
  color #333

.dialog-footer
  display flex
  justify-content space-between
  align-items center
  padding-top 24px
  border-top 2px solid #ebeef5
  background linear-gradient(90deg, #f8f9fa 0%, #ffffff 100%)
  
  .footer-left,
  .footer-right
    display flex
    gap 12px
  
  .el-button
    min-width 120px
    height 40px
    font-weight 600
    border-radius 8px
    transition all 0.3s ease
    
    &:hover
      transform translateY(-2px)
      box-shadow 0 4px 8px rgba(0, 0, 0, 0.2)

</style>