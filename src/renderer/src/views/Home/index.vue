<template>
  <div class="home-container">
    <div class="chat-container">
      <!-- 聊天区域 -->
      <ChatArea
        :message-list="chat.list.value"
        :bubble-list-ref="chat.bubbleListRef"
        :always-show-scrollbar="chat.alwaysShowScrollbar.value"
        :btn-color="chat.btnColor.value"
        :btn-loading="chat.btnLoading.value"
        :btn-size="chat.btnSize.value"
        @scroll="chat.handleBubbleScroll"
        @file-click="handleFileClick"
        @refresh="chat.handleRefresh"
        @reSend="chat.handleReSend"
        @copy="chat.handleCopy"
        @quote="handleQuote"
        @quote-jump="chat.handleQuoteJump"
      />

      <!-- 输入区域 -->
      <ChatInput
        ref="inputComponentRef"
        v-model="chat.userInput.value"
        :loading="chat.loading.value"
        :disabled="!store.socketConnected"
        :file-list="files.files.value"
        :show-thinking="store.mode === 'sse'"
        :thinking-enabled="chat.enableThinking.value"
        :show-send-when-loading="store.mode === 'ws'"

        :quote-message="quoteMessage"
        @submit="handleSubmit"
        @cancel="chat.handleCancel"
        @toggle-thinking="chat.toggleThinking"
        @http-request="files.handleHttpRequest"
        @before-upload="files.handleBeforUpload"
        @upload-drop="files.handleUploadDrop"
        @delete-card="files.handleDeleteCard"
        @remove-quote="handleRemoveQuote"
      />
    </div>
    <el-drawer v-model="drawer" title="文件预览" :with-header="false" direction="ltr" @close="fileUrl = ''">
      <iframe :src="fileUrl" frameborder="0"></iframe>
    </el-drawer>
    
    <!-- 选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="selection-content">
        <el-radio-group v-model="selectedOption">
          <el-radio 
            v-for="choice in choices" 
            :key="choice" 
            :value="choice"
            class="radio-item"
          >
            {{ choice }}
          </el-radio>
        </el-radio-group>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleConfirmSelection">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import ChatArea from './components/ChatArea.vue'
import ChatInput from './components/ChatInput.vue'

const store = useAppStore()
const fileUrl = ref('')
const drawer = ref(false)

// 获取ChatInput组件中的senderRef
const inputComponentRef = ref(null)
// 创建一个计算属性，获取MentionSender组件的引用
const senderRef = computed(() => {
  return inputComponentRef.value?.senderRef
})

// 聊天功能 - 包含消息、WebSocket、未读消息等
const chat = useChatManager()

// 文件上传功能 - 相对独立，传入senderRef
const files = useFileUpload(senderRef)

// 引用消息状态
const quoteMessage = ref(null)

// 引用消息处理
const handleQuote = (message) => {
  console.log('引用消息:', message)
  quoteMessage.value = message
}

const handleRemoveQuote = () => {
  quoteMessage.value = null
}

// 处理提交 - 整合文件上传
const handleSubmit = async () => {
  // 如果有文件，传递给聊天管理器并清空文件列表
  if (files.files.value && files.files.value.length > 0) {
    await chat.handleSubmit(files.files.value, quoteMessage.value)
    files.files.value = []
    files.closeHeader()
  } else {
    await chat.handleSubmit(null, quoteMessage.value)
  }
  
  // 提交后清空引用
  quoteMessage.value = null
}

const handleFileClick = (file, files) => {
  fileUrl.value = previewFile(file, files)
  drawer.value = true
}
// 监听流式内容变化
watch(
  () => chat.content.value,
  async (newContent, oldContent) => {
    if (newContent && newContent !== oldContent && chat.list.value.length > 0) {
      const lastIndex = _.findLastIndex(chat.list.value, (msg) => msg.role === 'ai')
      if (lastIndex !== -1) {
        chat.list.value[lastIndex].content = newContent.content
        chat.list.value[lastIndex].reasoning_content = newContent.reasoning_content
        chat.list.value[lastIndex].loading = false
        chat.list.value[lastIndex].typing = true
        chat.list.value = [...chat.list.value]

        if (oldContent === undefined && chat.data.value.length === 0) return

        const latestAIMessage = await db.messages
          .where('key')
          .equals(chat.list.value[lastIndex].key)
          .first()

        if (latestAIMessage) {
          await db.messages.update(latestAIMessage.id, {
            content: newContent.content,
            reasoning_content: newContent.reasoning_content,
            timestamp: Date.now()
          })
        }
      }
    }
  },
  { immediate: true }
)
watch(
  () => store.socketConnected,
  (newVal, oldVal) => {
    if (oldVal === false && newVal === true) {
      chat.waitForSocketAndSetup()
    }
  }
)
const choices = ref([])
const selectedOption = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentActionUuid = ref('')
let timeoutTimer = null

// 处理确认选择
const handleConfirmSelection = () => {
  if (!selectedOption.value) {
    ElMessage.warning('请选择一个选项')
    return
  }
  
  store.socket.emit('confirm', {
    action_uuid: currentActionUuid.value,
    answer: selectedOption.value
  })
  handleCancelSelection()
}

// 处理取消选择
const handleCancelSelection = () => {
  dialogVisible.value = false
  selectedOption.value = '' // 重置选择
  currentActionUuid.value = ''
  
  // 清除超时定时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
}

// 监听确认对话框事件
const handleShowConfirmDialog = (event) => {
  const { prompt, choices, timeout, action_uuid } = event.detail
  dialogTitle.value = prompt
  choices.value = choices
  selectedOption.value = ''
  currentActionUuid.value = action_uuid
  dialogVisible.value = true
  
  // 设置超时自动关闭
  if (timeout && timeout > 0) {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
    }
    timeoutTimer = setTimeout(() => {
      handleCancelSelection()
    }, data.timeout * 1000)
  }
}

// 生命周期管理
onMounted(async () => {
  await chat.initialize()
  const pasteArea = document.getElementById('paste-area')

  pasteArea.addEventListener('paste', function (event) {
    const clipboardFiles = event.clipboardData?.files || []
    console.log('clipboardData.files:', clipboardFiles)

    if (clipboardFiles.length === 0) {
      console.warn('⚠️ 没有检测到任何文件/图片数据！')
    }

    for (let i = 0; i < clipboardFiles.length; i++) {
      const file = clipboardFiles[i]
      console.log(`File ${i}:`, file)
      if (files.handleBeforUpload(file)) {
        files.handleHttpRequest({ file })
        files.files.value.push({ file })
      }
    }
  })
  
  // 添加确认对话框事件监听器
  window.addEventListener('showConfirmDialog', handleShowConfirmDialog)
  window.addEventListener('confirmDismiss', handleCancelSelection)
})

onUnmounted(() => {
  chat.cleanup()
  // 清理事件监听器
  window.removeEventListener('showConfirmDialog', handleShowConfirmDialog)
  window.removeEventListener('confirmDismiss', handleCancelSelection)
  // 清理超时定时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
  }
})
</script>

<style lang="stylus" scoped>
:deep(.el-drawer)
  width 80%!important
  .el-drawer__body
    padding 0!important
    overflow hidden
    height 100%
    iframe
      width 100%
      height 100%

.home-container
  height 100%
  display flex
  justify-content center

  .chat-container
    width 100%
    max-width 800px
    height 100%
    display flex
    flex-direction column
    border-radius 12px
    background-color #fff
    overflow hidden

:deep(.markdown-render)
  div
    div
      p
        margin 0

// 优化的 ElNotification 样式
:deep(.unread-message-notification)
  border-radius 12px !important
  box-shadow 0 8px 32px rgba(0, 0, 0, 0.12) !important
  border none !important
  background linear-gradient(135deg, #FFF8E1 0%, #FFFBF0 100%) !important
  min-width 320px !important
  
  .el-notification__group
    margin-left 0 !important
    
  .el-notification__title
    color #E65100 !important
    font-weight 600 !important
    font-size 16px !important
    margin-bottom 12px !important
    display flex
    align-items center
    
  .el-notification__content
    color #BF360C !important
    font-size 14px !important
    line-height 1.5 !important
    
    .notification-content
      display flex
      flex-direction column
      gap 8px
      
      .message-info
        font-size 14px
        color #BF360C
        text-align center
        font-weight 500
        line-height 1.6
        
        .message-count
          font-size 16px
          font-weight 700
          color #E65100
          background rgba(230, 81, 0, 0.15)
          border-radius 4px
          padding 2px 6px
          display inline
          
      .click-hint
        font-size 12px
        color #FF8F00
        text-align center
        opacity 0.8
        margin-top 4px
        font-style italic
        transition all 0.3s ease
    
  .el-notification__closeBtn
    color #FF6F00 !important
    font-size 18px !important
    top 16px !important
    right 16px !important
    
    &:hover
      color #E65100 !important
      background rgba(255, 111, 0, 0.1) !important
      border-radius 50% !important
      
  // 添加点击时的反馈效果
  &:hover
    transform translateY(-2px) !important
    box-shadow 0 12px 40px rgba(0, 0, 0, 0.15) !important
    cursor pointer !important
    transition all 0.3s ease !important
    
    .notification-content .click-hint
      text-decoration underline !important
      opacity 1 !important
      color #E65100 !important
      transition all 0.3s ease !important
    
  // 入场动画优化
  &.el-notification-fade-enter-active
    transition all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important
    
  &.el-notification-fade-enter-from
    transform translateX(100%) scale(0.8) !important
    opacity 0 !important
    
  // 添加脉冲动画效果
  &::after
    content ''
    position absolute
    top -2px
    left -2px
    right -2px
    bottom -2px
    background linear-gradient(45deg, #FFB74D, #FF8A65)
    border-radius 14px
    z-index -1
    animation pulse 2s infinite
    
@keyframes pulse
  0%
    opacity 0.7
  50%
    opacity 0.3
  100%
    opacity 0.7
</style>