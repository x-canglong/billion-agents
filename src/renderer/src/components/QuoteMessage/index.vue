<template>
  <div class="quote-message" v-if="quoteMessage">
    <div class="quote-header">
      <div class="quote-title">
        <!-- <el-icon class="quote-icon"><ChatLineRound /></el-icon> -->
        <span>{{ $t('chat.quotingMessage') }}</span>
      </div>
      <el-button class="close-btn" size="small" text @click="$emit('close')" :icon="Close">
      </el-button>
    </div>
    <div class="quote-content">
      <!-- <div class="quote-avatar">
        <div 
          class="avatar" 
          :class="{ 'ai-avatar': quoteMessage.role === 'ai', 'user-avatar': quoteMessage.role === 'user' }"
        >
          {{ quoteMessage.role === 'ai' ? 'AI' : '我' }}
        </div>
      </div> -->
      <div class="quote-text">
        <div class="message-content">
          {{ truncateText(quoteMessage.content, 50) }}
        </div>
        <!-- <div class="message-time">
          {{ formatTime(quoteMessage.timestamp) }}
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue'
const { t } = useI18n()

// Props
defineProps({
  quoteMessage: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close'])

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 格式化时间
const formatTime = (timestamp) => {
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
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<style lang="stylus" scoped>
.quote-message
  background rgb(251, 251, 251)
  border: none
  border-left: 4px solid rgba(#CCCCCC, 0.6)
  border-radius: 0 12px 12px 0
  margin-bottom: 16px
  overflow: hidden
  box-shadow: 0 3px 12px rgba(98, 106, 239, 0.12)
  position: relative
  
  &::before
    content: '"'
    position: absolute
    top: 6px
    left: 8px
    font-size: 20px
    color: rgba(98, 106, 239, 0.25)
    font-family: serif
    line-height: 1
    z-index: 0
  
  .quote-header
    display: flex
    align-items: center
    justify-content: space-between
    padding: 12px 16px 8px 24px
    background #F0F0F0
    backdrop-filter: blur(10px)
    position: relative
    z-index: 1
    
    .quote-title
      display: flex
      align-items: center
      gap: 8px
      // font-size: 13px
      color: #626aef
      font-weight: 600
      letter-spacing: 0.5px
      font-family: Source Han Sans CN;
      font-weight: 500;
      font-size: 14px;
      color: #333333;
      .quote-icon
        font-size: 16px
        color: #626aef
        
    .close-btn
      width: 24px
      height: 24px
      padding: 0
      color: #a0aec0
      border-radius: 6px
      transition: all 0.2s ease
      
      &:hover
        color: #f56c6c
        background: rgba(245, 108, 108, 0.1)
        transform: scale(1.1)
        
  .quote-content
    display: flex
    align-items: flex-start
    gap: 12px
    padding: 16px 16px 16px 24px
    position: relative
    z-index: 1
    
    .quote-avatar
      flex-shrink: 0
      
      .avatar
        width: 32px
        height: 32px
        border-radius: 50%
        display: flex
        align-items: center
        justify-content: center
        font-size: 13px
        font-weight: 600
        color: white
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15)
        
        &.ai-avatar
          background: linear-gradient(135deg, #626aef, #4f46e5)
          
        &.user-avatar
          background: linear-gradient(135deg, #269BFB, #1B76FB)
          
    .quote-text
      flex: 1
      min-width: 0
      
      .message-content
        line-height: 1.4
        margin-bottom: 6px
        word-break: break-word
        font-family: Source Han Sans CN;
        font-weight: 400;
        font-size: 14px;
        color: #A6A6A6;
      .message-time
        font-size: 12px
        color: #a0aec0
        font-weight: 500
</style> 