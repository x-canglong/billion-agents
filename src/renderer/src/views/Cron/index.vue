<template>
  <div class="cron-container">
    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input v-model="searchKeyword" placeholder="搜索后台任务" clearable @input="loadTasks">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="16"></el-col>
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
        <el-table-column prop="id" label="序号" width="100" show-overflow-tooltip />
        <el-table-column prop="cron_desc" label="执行周期" show-overflow-tooltip />
        <el-table-column prop="name" label="任务名称" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="center" header-align="center">
          <template #default="scope">
            <el-button size="small" type="danger" text :icon="Delete" @click="handleDeleteClick(scope.row)">
              删除
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
  </div>
</template>

<script setup>
import { Search, Refresh, Delete } from '@element-plus/icons-vue'
const { t } = useI18n()
const loading = ref(false)
// 搜索和筛选
const searchKeyword = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const maxHeight = computed(() => window.innerHeight - 250)

// 任务列表数据
const taskList = ref([])

// 初始化
onMounted(() => {
  loadTasks()
})

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const res = await getCronList({
      wd: searchKeyword.value,
      page: currentPage.value,
      limit: pageSize.value
    })
    taskList.value = res.data.jobs
    total.value = res.data.total
    loading.value = false
  } catch (error) {
    loading.value = false
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

const handleDeleteClick = async (row) => {
  ElMessageBox.confirm(t('common.confirmDelete'), t('common.delete'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: 'warning',
  }).then(async () => {
    try {
      await deleteCronJob(row.id)
      ElMessage.success(t('common.deleteSuccess'))
      loadTasks()
    } catch (error) {
      ElMessage.error(t('common.deleteFailed'))
    }
  })
}
</script>

<style lang="stylus" scoped>
.cron-container
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