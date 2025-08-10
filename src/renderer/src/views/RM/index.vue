<template>
  <div class="requirement-review">
    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input v-model="searchKeyword" placeholder="搜索需求标题或描述" clearable @input="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="选择状态" clearable @change="handleFilter">
            <el-option v-for="(item, key) in statusDict" :key="key" :label="item.text" :value="key" />
          </el-select>
        </el-col>
        <el-col :span="12"></el-col>
        <el-col :span="2">
          <el-button type="primary" :icon="Refresh" @click="loadRequirements" style="width: 100%;min-width: 110px;">
            刷新列表
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 需求列表表格 -->
    <div class="table-section">
      <el-table class="custom-table" stripe :data="requirements" :height="maxHeight" style="width: 100%;"
        v-loading="loading">
        <el-table-column prop="req_by" label="需求来源" min-width="100" show-overflow-tooltip></el-table-column>
        <el-table-column prop="name" label="需求名称" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column prop="org_desc" label="原始需求描述" min-width="300" show-overflow-tooltip></el-table-column>
        <el-table-column prop="desc" label="需求重写" min-width="300" show-overflow-tooltip></el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusDict[row.status]?.type || 'info'" size="small">
              {{ statusDict[row.status]?.text || '未知' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="350" fixed="right" align="center" header-align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="danger" size="small" text :icon="Close" @click="handleReject(row)" :disabled="row.status !== 'open'">
                拒绝
              </el-button>
              <el-button type="warning" size="small" text :icon="EditPen" @click="handleSmartRewrite(row)"
                :disabled="row.status !== 'open'">
                重写需求
              </el-button>
              <el-button type="primary" size="small" text :icon="Check" @click="handleSubmitDevelopment(row)"
                :disabled="!row.desc || row.status !== 'open'">
                提交开发
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination background v-model:current-page="currentPage" v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="total"
        @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>

    <!-- 重写需求对话框 -->
    <el-dialog class="rewrite-dialog" v-model="rewriteDialogVisible" title="重写需求" width="60%" @close="resetRewriteForm">
      <div class="rewrite-dialog-content" v-loading="rewriteLoading" element-loading-text="AI正在重写需求...">
        <el-row :gutter="20" style="height: 350px;">
          <!-- 左侧：原始需求 -->
          <el-col :span="12">
            <div class="original-requirement-panel">
              <h4>{{ currentRequirement?.name }}</h4>
              <div class="requirement-content">
                <el-input :value="currentRequirement?.org_desc" type="textarea" readonly :rows="12" resize="none" />
              </div>
            </div>
          </el-col>

          <!-- 右侧：重写需求 -->
          <el-col :span="12">
            <div class="rewritten-requirement-panel">
              <h4>重写后需求</h4>
              <el-form ref="rewriteFormRef" :model="rewriteForm" :rules="rewriteRules">
                <el-form-item prop="desc">
                  <el-input ref="rewriteTextareaRef" v-model="rewriteForm.desc" type="textarea" :rows="12"
                    placeholder="请输入重写后的需求描述" resize="none" />
                </el-form-item>
              </el-form>
            </div>
          </el-col>
        </el-row>
      </div>

      <template #footer>
        <el-button @click="rewriteDialogVisible = false">取消</el-button>
        <el-button type="success" @click="handleAiRewriteClick" :loading="aiRewriteLoading">
          智能重写
        </el-button>
        <el-button type="primary" @click="handleSaveRewrite" :disabled="!rewriteForm.desc">保存</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝需求对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝需求" width="600px" @close="resetRejectForm">
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-width="100px">
        <el-form-item label="拒绝原因" prop="reason">
          <el-select v-model="rejectForm.reason" placeholder="请选择拒绝原因">
            <el-option v-for="(item, key) in rejectReasonDict" :key="key" :label="item.text" :value="item.text" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明" prop="description">
          <el-input v-model="rejectForm.description" type="textarea" :rows="4" placeholder="请详细说明拒绝的原因" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleConfirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>
  
<script setup>
import { Search, Refresh, Close, EditPen, Check } from '@element-plus/icons-vue'
// 状态字典配置
const statusDict = ref({
  open: {
    text: '新开',
    type: 'info'
  },
  in_progress: {
    text: '开发中', 
    type: 'warning'
  },
  published: {
    text: '已发布',
    type: 'success'
  },
  rejected: {
    text: '已拒绝',
    type: 'danger'
  }
})

// 拒绝原因字典配置
const rejectReasonDict = ref({
  unclear: {
    text: '需求不明确',
    value: 'unclear'
  },
  too_difficult: {
    text: '技术难度过高',
    value: 'too_difficult'
  },
  insufficient_resources: {
    text: '资源不足',
    value: 'insufficient_resources'
  },
  low_priority: {
    text: '优先级过低',
    value: 'low_priority'
  },
  other: {
    text: '其他',
    value: 'other'
  }
})

// 响应式数据
const requirements = ref([])
const loading = ref(false)
const rewriteDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const rewriteLoading = ref(false)
const aiRewriteLoading = ref(false)
const currentRequirement = ref(null)
const maxHeight = computed(() => {
  return window.innerHeight - 250
})

// 搜索和筛选
const searchKeyword = ref('')
const statusFilter = ref('')

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 搜索防抖定时器
let searchTimer = null

// 重写表单
const rewriteForm = ref({
  desc: ''
})

// 拒绝表单
const rejectForm = ref({
  reason: '',
  description: ''
})

// 表单引用
const rewriteFormRef = ref()
const rejectFormRef = ref()
const rewriteTextareaRef = ref()

// 表单验证规则
const rewriteRules = {
  desc: [
    { required: true, message: '请输入重写后的需求描述', trigger: 'blur' }
  ]
}

const rejectRules = {
  reason: [
    { required: true, message: '请选择拒绝原因', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请详细说明拒绝原因', trigger: 'blur' }
  ]
}

// 生命周期
onMounted(() => {
  loadRequirements()
})
  
// 方法
const loadRequirements = async () => {
  loading.value = true
  try {
    const params = {
      wd: searchKeyword.value,
      status: statusFilter.value,
      page: currentPage.value,
      limit: pageSize.value
    }
    
    let data = (await getRequirementList(params)).data
    
    requirements.value = data.requirements || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error('加载需求列表失败')
  } finally {
    loading.value = false
  }
}
  
const handleSearch = () => {
  // 防抖处理
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadRequirements()
  }, 500)
}

const handleFilter = () => {
  currentPage.value = 1
  loadRequirements()
}
  
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  loadRequirements()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadRequirements()
}

// 拒绝需求
const handleReject = (row) => {
  currentRequirement.value = row
  rejectDialogVisible.value = true
}

const handleConfirmReject = async () => {
  if (!rejectFormRef.value) return
  
  await rejectFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 调用拒绝接口
        await rejectRequirement({
          id: currentRequirement.value.id,
          reason: rejectForm.value.reason,
          description: rejectForm.value.description
        })
        
        ElMessage.success('需求已拒绝')
        rejectDialogVisible.value = false
        resetRejectForm()
        
        // 重新加载列表
        await loadRequirements()
      } catch (error) {
        ElMessage.error('拒绝需求失败')
      }
    }
  })
}

// 重写需求 - 弹出对话框并调用接口
const handleSmartRewrite = async (row) => {
  currentRequirement.value = row
  rewriteForm.value.desc = row.desc || ''
  rewriteDialogVisible.value = true
  
  // 如果还没有重写内容，则调用接口获取
  // if (!row.desc) {
  //   await callSmartRewriteAPI(row)
  // }
}

// 调用重写需求API
const callSmartRewriteAPI = async (requirement) => {
  rewriteLoading.value = true
  try {
    // 调用AI重写接口
    const response = await rewriteRequirement({
      id: requirement.id,
      orgDesc: requirement.org_desc
    })
    
    // 更新表单中的内容
    rewriteForm.value.desc = response.data.desc
    
    ElMessage.success('重写需求完成')
  } catch (error) {
    console.error('重写需求失败:', error)
    ElMessage.error('重写需求失败，请稍后重试')
  } finally {
    rewriteLoading.value = false
  }
}

// 保存重写
const handleSaveRewrite = async () => {
  if (!rewriteFormRef.value) return
  
  await rewriteFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 调用保存重写接口
        await saveRewrittenRequirement({
          id: currentRequirement.value.id,
          desc: rewriteForm.value.desc
        })
        
        ElMessage.success('需求重写保存成功')
        rewriteDialogVisible.value = false
        resetRewriteForm()
        
        // 重新加载列表
        await loadRequirements()
      } catch (error) {
        ElMessage.error('保存重写需求失败')
      }
    }
  })
}

// 提交开发
const handleSubmitDevelopment = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将需求"${row.name}"提交给开发团队吗？`,
      '确认提交',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用提交开发接口
    await submitToDevelopment({
      id: row.id
    })
    
    ElMessage.success('需求已提交给开发团队')
    
    // 重新加载列表
    await loadRequirements()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提交失败')
    }
  }
}

// 智能重写按钮点击处理
const handleAiRewriteClick = async () => {
  // 检查是否已有重写内容
  if (rewriteForm.value.desc && rewriteForm.value.desc.trim()) {
    try {
      const action = await ElMessageBox.confirm(
        '已存在重写内容，请选择操作方式：',
        '选择操作',
        {
          distinguishCancelAndClose: true,
          confirmButtonText: '直接重写',
          cancelButtonText: '润色优化',
          cancelButtonClass: 'el-button--warning',
          type: 'question'
        }
      )
      // 用户选择直接重写
      await handleAiRewrite('rewrite')
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择润色优化
        await handleAiRewrite('polish')
      }
      // 如果是 close 则什么都不做
    }
  } else {
    // 没有内容，直接重写
    await handleAiRewrite('rewrite')
  }
}

// 智能重写需求 - 使用 chatStream API
const handleAiRewrite = async (mode = 'rewrite') => {
  if (!currentRequirement.value) {
    ElMessage.error('请先选择需求')
    return
  }
  
  // 设置加载状态
  aiRewriteLoading.value = true
  
  try {
    let prompt = ''
    
    if (mode === 'rewrite') {
      // 直接重写模式
      prompt = `请作为一名专业的产品经理，重写以下需求描述，使其更加清晰、具体和可执行：

原始需求：
${currentRequirement.value.org_desc}

要求：
1. 保持原需求的核心意图和目标
2. 使用清晰、具体的语言
3. 明确功能边界和验收标准
4. 确保开发团队能够准确理解并实施
5. 使用简洁明了的中文表达
6. 输出纯文本格式，不要使用markdown语法
7. 可以使用换行来分段，但不要使用特殊格式符号

请直接输出重写后的需求描述：`
    } else {
      // 润色优化模式
      prompt = `请作为一名专业的产品经理，对以下已重写的需求描述进行润色优化，使其更加完善：

原始需求：
${currentRequirement.value.org_desc}

当前重写版本：
${rewriteForm.value.desc}

要求：
1. 在保持当前重写内容基础上进行优化
2. 补充遗漏的重要信息
3. 优化语言表达，使其更加专业和准确
4. 确保逻辑清晰，条理分明
5. 使用简洁明了的中文表达
6. 输出纯文本格式，不要使用markdown语法
7. 可以使用换行来分段，但不要使用特殊格式符号

请输出润色优化后的需求描述：`
    }

    let rewrittenContent = ''
    
    // 如果是直接重写，清空表单内容
    if (mode === 'rewrite') {
      rewriteForm.value.desc = ''
    }
    
    // 调用流式API
    await chatStream(
      prompt,
      (content) => {
        // 实时接收内容片段并更新表单
        if (mode === 'rewrite') {
          rewrittenContent += content
          rewriteForm.value.desc = rewrittenContent
        } else {
          // 润色模式，替换整个内容
          rewrittenContent += content
          rewriteForm.value.desc = rewrittenContent
        }
        
        // 自动滚动到底部
        nextTick(() => {
          if (rewriteTextareaRef.value && rewriteTextareaRef.value.textarea) {
            const textarea = rewriteTextareaRef.value.textarea
            textarea.scrollTop = textarea.scrollHeight
          }
        })
      },
      (error) => {
        console.error('AI重写失败:', error)
        ElMessage.error('AI重写失败，请稍后重试')
        aiRewriteLoading.value = false
      },
      () => {
        // 重写完成
        rewriteForm.value.desc = rewrittenContent.trim()
        const modeText = mode === 'rewrite' ? '重写' : '润色优化'
        ElMessage.success(`需求智能${modeText}完成，请检查并保存`)
        aiRewriteLoading.value = false
        
        // 最终滚动到底部
        nextTick(() => {
          if (rewriteTextareaRef.value && rewriteTextareaRef.value.textarea) {
            const textarea = rewriteTextareaRef.value.textarea
            textarea.scrollTop = textarea.scrollHeight
          }
        })
      },
      {
        model: 'deepseek-ai/DeepSeek-V3',
        systemPrompt: '你是一名经验丰富的产品经理，擅长将模糊的需求转化为清晰、可执行的产品需求文档。请始终输出纯文本格式，不要使用markdown或其他格式化语法。',
        temperature: 0.3, // 较低的温度确保输出更稳定和准确
        maxTokens: 2048
      }
    )
  } catch (error) {
    console.error('智能重写处理失败:', error)
    ElMessage.error('智能重写失败，请稍后重试')
    aiRewriteLoading.value = false
  }
}

const resetRewriteForm = () => {
  rewriteForm.value = {
    desc: ''
  }
  if (rewriteFormRef.value) {
    rewriteFormRef.value.clearValidate()
  }
}

const resetRejectForm = () => {
  rejectForm.value = {
    reason: '',
    description: ''
  }
  if (rejectFormRef.value) {
    rejectFormRef.value.clearValidate()
  }
}

// 清除搜索防抖定时器
onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
</script>
  
<style lang="stylus" scoped>
.requirement-review
  padding 20px

.search-section
  margin-bottom 20px
  padding 20px
  background #f5f7fa
  border-radius 8px

.requirement-name
  display flex
  align-items center
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.description-content,
.rewritten-content
  max-height 100px
  overflow-y auto
  line-height 1.5
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.action-buttons
  display flex
  gap 8px
  flex-wrap wrap
  
  .el-button
    margin 0
:deep(.el-dialog.rewrite-dialog .el-dialog__body)
  height 380px
:deep(.el-form-item__error)
  opacity 0
.pagination-section
  display flex
  justify-content center
  padding 20px 0

.rewrite-dialog-content
  min-height 350px

.original-requirement-panel,
.rewritten-requirement-panel
  height 100%
  padding 15px
  border-radius 8px
  
.original-requirement-panel
  background #f8f9fa
  border 1px solid #e9ecef
  
.rewritten-requirement-panel
  background #fff
  border 1px solid #ddd

.original-requirement-panel h4,
.rewritten-requirement-panel h4
  margin 0 0 15px 0
  color #303133
  font-size 16px
  font-weight 600
  padding-bottom 10px
  border-bottom 1px solid #eee

.requirement-content
  height calc(100% - 45px)

.rewritten-requirement-panel .el-form
  height calc(100% - 45px)
  
.rewritten-requirement-panel .el-form-item
  height 100%
  margin-bottom 0
  
.rewritten-requirement-panel .el-textarea,
.original-requirement-panel .el-textarea
  height 100%
  
.rewritten-requirement-panel .el-textarea__inner,
.original-requirement-panel .el-textarea__inner
  height 100% !important
  resize none

/* 响应式设计 */
@media (max-width: 900px)
  .action-buttons
    flex-direction column
    
    .el-button
      width 100%
      margin-bottom 4px
      
  .rewrite-dialog-content .el-row
    height auto !important
    
  .rewrite-dialog-content .el-col
    margin-bottom 20px
</style> 