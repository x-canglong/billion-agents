<template>
  <div class="input-container">
    <MentionSender ref="senderRef" id="paste-area" v-model="inputValue" variant="updown"
      :auto-size="{ minRows: 2, maxRows: 5 }" :loading="loading" clearable allow-speech
      :placeholder="getPlaceholder()" @submit="handleSubmit" @cancel="handleCancel" :disabled="disabled"
      @paste="handlePaste">
      <template #header>
        <div class="sender-header-wrapper">
          <!-- 引用消息显示 -->
          <QuoteMessage v-if="quoteMessage" :quote-message="quoteMessage" @close="onRemoveQuote" />

          <!-- 附件显示 -->
          <Attachments :file-list="getFileList(fileList)" :http-request="onHttpRequest" :items="getFileList(fileList)"
            drag overflow="scrollX" :before-upload="onBeforeUpload" :hide-upload="true" @upload-drop="onUploadDrop"
            @delete-card="onDeleteCard" />
        </div>
      </template>

      <template #prefix>
        <div class="annex-icon">
          <el-upload class="elx-attachments-upload-btn" :file-list="fileList" :http-request="onHttpRequest"
            :before-upload="onBeforeUpload" :show-file-list="false"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg" :disabled="disabled">
            <el-button class="annex-icon-button" plain :disabled="disabled">
              <el-icon>
                <Paperclip />
              </el-icon>
            </el-button>
          </el-upload>

          <div v-if="showThinking" class="thinking-icon" :class="{ enableThinking: thinkingEnabled }"
            @click="$emit('toggle-thinking')" :style="disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''">
            <el-icon>
              <ElementPlus />
            </el-icon>
            <span>{{ $t('chat.thinking') }}</span>
          </div>
        </div>
      </template>

      <template #action-list>
        <div class="action-list">
          <el-button class="send-button" v-if="!loading || showSendWhenLoading" @click="handleSubmit"
            :disabled="disabled">
            <div class="send-icon"></div>
          </el-button>
          <LoadingButton v-if="loading && !showSendWhenLoading" @cancel="handleCancel" />
        </div>
      </template>
    </MentionSender>
  </div>
</template>

<script setup>
const { t } = useI18n()

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fileList: {
    type: Array,
    default: () => []
  },
  showThinking: {
    type: Boolean,
    default: false
  },
  thinkingEnabled: {
    type: Boolean,
    default: false
  },
  showSendWhenLoading: {
    type: Boolean,
    default: false
  },

  quoteMessage: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits([
  'update:modelValue',
  'submit',
  'cancel',
  'toggle-thinking',
  'http-request',
  'before-upload',
  'upload-drop',
  'delete-card',
  'remove-quote'
])

const getFileList = (fileList) => {
  return fileList.map(item => ({
    ...item,
    url: getFileUrl(item.url)
  }))
}
// 计算属性
const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const handlePaste = (e) => {
  console.log('handlePaste', e)
}
// 方法
const handleSubmit = () => {
  getPlaceholder()
  emit('submit')
}

const handleCancel = () => {
  emit('cancel')
}

const onHttpRequest = (options) => {
  emit('http-request', options)
}

const onBeforeUpload = (file) => {
  return emit('before-upload', file)
}

const onUploadDrop = (files, props) => {
  emit('upload-drop', files, props)
}

const onDeleteCard = (item) => {
  emit('delete-card', item)
}

const onRemoveQuote = () => {
  emit('remove-quote')
}
const getPlaceholder = () => {
  return _.sample([t('chat.inputPlaceholder1'), t('chat.inputPlaceholder2')])
}
getPlaceholder()
// 获取sender引用
const senderRef = ref(null)

// 监听引用消息变化，自动控制header显示
watch(() => props.quoteMessage, (newQuote, oldQuote) => {
  if (newQuote && !oldQuote) {
    // 有新的引用消息时，打开header
    nextTick(() => {
      senderRef.value?.openHeader()
    })
  } else if (!newQuote && oldQuote) {
    // 引用消息被移除且没有文件时，关闭header
    if (!props.fileList || props.fileList.length === 0) {
      nextTick(() => {
        senderRef.value?.closeHeader()
      })
    }
  }
}, { immediate: false })

// 监听文件列表变化，配合引用消息控制header显示
watch(() => props.fileList, (newFiles, oldFiles) => {
  const hasFiles = newFiles && newFiles.length > 0
  const hadFiles = oldFiles && oldFiles.length > 0
  const hasQuote = !!props.quoteMessage
  
  if (hasFiles && !hadFiles) {
    // 有新文件时，打开header
    nextTick(() => {
      senderRef.value?.openHeader()
    })
  } else if (!hasFiles && hadFiles && !hasQuote) {
    // 文件被清空且没有引用消息时，关闭header
    nextTick(() => {
      senderRef.value?.closeHeader()
    })
  }
}, { immediate: false })

// 暴露senderRef给父组件
defineExpose({
  senderRef
})
</script>

<style lang="stylus" scoped>
.input-container
  padding 16px 0
  border-top 1px solid #ebeef5
  
  .sender-header-wrapper
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid #ebeef5;
    
  .annex-icon
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    
    .annex-icon-button
      width: 36px;
      height: 36px;
      background #fff
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s;
      color: rgba(0, 0, 0, 0.85);
      
      &:hover
        border: 1px solid rgba(0, 0, 0, 0.18);
        background: rgba(#269BFB, 0.04);
        
      &:active
        border: 1px solid rgba(0, 0, 0, 0.18);
        background: rgba(#269BFB, 0.04);
        
  .thinking-icon
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 12px;
    border: 1px solid silver;
    border-radius: 15px;
    cursor: pointer;
    font-size: 12px;
    
    &.enableThinking
      color: #626aef;
      border: 1px solid #626aef !important;
      border-radius: 15px;
      padding: 3px 12px;
      font-weight: 700
      
  .action-list
    display: flex;
    align-items: center;
    gap: 8px;
    
    .send-button
      width: 36px;
      height: 36px;
      background: linear-gradient(90deg, #269BFB, #1B76FB);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s;
      
      &:hover
        opacity: 0.85;
        
      &:active
        opacity: 0.7;
        
      .send-icon
        width: 16px;
        height: 16px;
        background: url(imgs/send-icon.png) no-repeat center/cover
</style> 