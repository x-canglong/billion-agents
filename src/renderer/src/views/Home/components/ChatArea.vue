<template>
  <div class="chat-main">
    <Introduction v-if="messageList.length === 0" :subTitle="$t('chat.welcomeMessage')" />

    <BubbleList :ref="(el) => setBubbleListRef(el)" :list="messageList" :always-show-scrollbar="alwaysShowScrollbar"
      :btn-color="btnColor" :btn-loading="btnLoading" :btn-icon-size="btnSize" maxHeight="100%" @scroll="handleScroll">
      <template #content="{ item }">
        <div class="content-wrapper">
          <Thinking v-if="item.role === 'ai' && item.reasoning_content" :status="item.reasoning_status" auto-collapse
            :content="item.reasoning_content" button-width="250px" max-width="100%" />

          <div class="content-text" v-if="item.role === 'ai'">
            <!-- 引用消息显示 -->
            <div class="quote-section is-left" v-if="item.ref_log_str" @click="$emit('quote-jump', item)">
              <div class="quote-content">
                <div class="quote-text">{{ truncateText(item.ref_log_str, 28) }}</div>
              </div>
            </div>
            <div class="files-card-container mb-2" v-if="item.files && item.files.length > 0">
              <template v-for="(file, index) in item.files" :key="index">
                <el-image v-if="file.type === 'image'" style="width: 500px" :src="getFileUrl(file.url)" fit="contain" @click="$emit('file-click', file, item.files)"/>
                <!-- :preview-src-list="[getFileUrl(file.url)]" -->
                <FilesCard v-else :name="file.name || file.filename || file.url.split('/').pop()"
                  :url="getFileUrl(file.url)" @click="$emit('file-click', file, item.files)" />
              </template>
            </div>
            <!-- <XMarkdown :markdown="item.content" class="vp-raw" /> -->
            <Markdown :content="item.content" />
            <div class="content-text-footer" v-if="item.content">
              <div class="agent-name">{{ item.agent_name || $t('common.system') }}</div>
            </div>
          </div>

          <div class="content-text" v-else>
            <!-- 引用消息显示 -->
            <div class="quote-section" v-if="item.ref_log_str" @click="$emit('quote-jump', item)">
              <div class="quote-content">
                <div class="quote-text">{{ truncateText(item.ref_log_str, 28) }}</div>
              </div>
            </div>

            <!-- 文件附件 -->
            <div class="files-card-container" v-if="item.files && item.files.length > 0">
              <FilesCard v-for="(file, index) in item.files" :key="index" :img-preview="false"
                :name="file.name || file.filename || file.url.split('/').pop()" :url="getFileUrl(file.url)"
                @click="$emit('file-click', file, item.files)" />
            </div>

            <!-- 消息内容 -->
            <span v-html="item.content"></span>
          </div>
        </div>
      </template>

      <!-- 自定义底部 -->
      <template #footer="{ item }" v-if="showFooter">
        <div class="footer-wrapper">
          <div class="footer-container">
            <div class="time">{{ formatTimeRelative(item.timestamp) }}</div>
            <el-tooltip content="复制" placement="top">
              <el-button :icon="DocumentCopy" size="small" circle @click="$emit('copy', item)" />
            </el-tooltip>
            <el-tooltip content="引用" placement="top">
              <el-button size="small" circle @click="$emit('quote', item)">
                <i class="iconfont icon-yinyong"></i>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重新发送" placement="top" v-if="item.role === 'user' && item.status === 'error'">
              <el-button :icon="Refresh" size="small" circle @click="$emit('reSend', item)" />
            </el-tooltip>
          </div>
        </div>
      </template>
    </BubbleList>
  </div>
</template>

<script setup>
import { DocumentCopy, Refresh } from '@element-plus/icons-vue'
import { getFileUrl } from '@/utils/utils'
import { formatTimeRelative } from '@/utils/utils'
const { t } = useI18n()

// Props
const props = defineProps({
  messageList: {
    type: Array,
    default: () => []
  },
  bubbleListRef: {
    type: Object,
    default: null
  },
  alwaysShowScrollbar: {
    type: Boolean,
    default: false
  },
  btnColor: {
    type: String,
    default: '#0057ff'
  },
  btnLoading: {
    type: Boolean,
    default: false
  },
  btnSize: {
    type: Number,
    default: 20
  },
  showFooter: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['scroll', 'file-click', 'refresh', 'copy', 'quote', 'quote-jump'])

// 设置 BubbleList 的引用，并传递给父组件
const setBubbleListRef = (el) => {
  if (props.bubbleListRef && el) {
    props.bubbleListRef.value = el
  }
}

// Methods
const handleScroll = (e) => {
  // console.log('🚀 ChatArea handleScroll 被触发', e)
  // console.log('📍 Event target:', e.target)
  // console.log('📏 Scroll position:', e.target.scrollTop)
  emit('scroll', e)
}

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 格式化引用时间
const formatQuoteTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 如果是今天
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 如果不是今天
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit'
  })
}
</script>

<style lang="stylus" scoped>
.chat-main
  flex 1
  overflow hidden
  padding-bottom 20px
  
  .files-card-container
    display flex
    flex-wrap wrap
    gap 8px
    .el-image
      cursor pointer
    :deep(.elx-files-card)
      &:hover
        cursor pointer
        filter brightness(1.2)
  :deep(.el-bubble-list)
    .el-bubble.el-bubble-end
      .el-bubble-content
        background: linear-gradient(90deg, #269BFB, #1B76FB);
        border-radius: 12px;
        font-family: Source Han Sans CN;
        font-weight: 400;
        font-size: 14px;
        color: #FFFFFF;
        line-height: 24px;
        
    .el-bubble.el-bubble-start
      .el-bubble-content
        background: #F2F2F2
        border-radius: 12px;
        font-family: Source Han Sans CN;
        font-weight: 400;
        font-size: 14px;
        color: #333;
        line-height: 24px;
        
        .content-text-footer
          width 100%
          min-width 50px
          height 22px
          
          .agent-name
            position absolute
            right 0
            bottom 0
            padding 4px 10px
            border-radius 4px 4px 0px 0px
            color #9293A8
            font-size 14px

  // Footer 悬停效果 - 使用纯CSS实现
  .footer-wrapper
    opacity 0
    visibility hidden
    transition all 0.2s ease-in-out
    .footer-container
      display flex
      .time
        margin-right 10px
        font-size 12px
        color #9293A8
  // 当鼠标悬停在整个气泡上时显示footer
  :deep(.el-bubble)
    &:hover
      .footer-wrapper
        opacity 1
        visibility visible

  // 引用消息样式
  .quote-section
    // background: linear-gradient(135deg, #f8f9ff 0%, #f1f3ff 100%)
    background: rgba(#f2f2f2, 0.12)
    border: none
    border-left: 4px solid #a6d0f5
    border-radius: 0
    padding: 10px 16px 2px 0
    margin-bottom: 10px
    position: relative
    box-shadow: 0 2px 8px rgba(98, 106, 239, 0.1)
    &:hover
      cursor: pointer
    &.is-left
      background: rgba(#fff, 0.8)
      border-left: 4px solid rgba(#CCCCCC, 0.6)
      .quote-text
        color #A6A6A6!important
        font-size 14px!important
    // &::before
    //   content: '"'
    //   position: absolute
    //   top: 8px
    //   left: 12px
    //   font-size: 24px
    //   color: rgba(98, 106, 239, 0.3)
    //   font-family: serif
    //   line-height: 1
    
    .quote-header
      display: flex
      align-items: center
      gap: 8px
      margin-bottom: 12px
      margin-left: 16px
      
      .quote-icon
        font-size: 16px
        color: #626aef
        
      .quote-title
        font-size: 13px
        color: #626aef
        font-weight: 600
        letter-spacing: 0.5px
        
    .quote-content
      margin-left: 16px
      position: relative
      
      .quote-text
        font-size: 14px
        color: #b0d3fd
        line-height: 1.6
        margin-bottom: 8px
        font-weight: 400
        word-break: break-word
      .quote-time
        font-size: 12px
        color: #a0aec0
        font-weight: 500
</style> 