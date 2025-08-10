import { useXStream } from 'vue-element-plus-x'
import { showUpdateCredential } from '@/components/UpdateCredential'

// 整合聊天相关的所有功能
export function useChatManager() {
  const store = useAppStore()
  const { t } = useI18n()
  // ==================== 状态管理 ====================
  // 消息列表相关
  const list = ref([])
  const loading = ref(false)
  const userInput = ref('')
  const enableThinking = ref(false)
  
  // UI相关
  const bubbleListRef = ref(null)
  const alwaysShowScrollbar = ref(false)
  const btnLoading = ref(false)
  const btnColor = ref('#0057ff')
  const btnSize = ref(20)
  
  // 分页相关
  const PAGE_SIZE = 20
  const currentPage = ref(1)
  const allLoaded = ref(false)
  const threshold = ref(80)
  const hasTriggered = ref(false)
  const isFirstLoad = ref(true)
  const scrollToBubble = ref(false)
  const isInitializing = ref(false)
  
  // WebSocket相关
  const lastSyncServerMessageTime = ref(0)
  const originalMessages = ref([])
  
  // 流式响应
  const { startStream, cancel, data, error, isLoading } = useXStream()
  
  // ==================== 计算属性 ====================
  const content = computed(() => {
    if (!data.value.length) return ''
    let text = ''
    let reasoningText = ''
    
    for (let index = 0; index < data.value.length; index++) {
      const chunk = data.value[index].data
      try {
        const parsedChunk = JSON.parse(chunk).choices[0].delta
        if (parsedChunk.content) text += parsedChunk.content
        if (parsedChunk.reasoning_content) reasoningText += parsedChunk.reasoning_content
      } catch (error) {
        if (chunk === ' [DONE]') {
          // console.log('数据接收完毕')
        } else {
          console.error('解析数据时出错:', error)
        }
      }
    }
    
    return { content: text, reasoning_content: reasoningText }
  })
  
  const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return t('time.morning', '早上好')
    } else if (hour >= 12 && hour < 14) {
      return t('time.noon', '中午好')
    } else if (hour >= 14 && hour < 18) {
      return t('time.afternoon', '下午好')
    } else {
      return t('time.evening', '晚上好')
    }
  })
  
  // ==================== 数据库操作 ====================
  const loadMessages = async (page = 1) => {
    try {
      const user_id = store.mode === 'sse' 
        ? 'xuminhui' 
        : store.userInfo.id
      const orderBy = store.mode === 'sse' ? 'id' : 'log_id'
      
      const messages = await db.messages
        .orderBy(orderBy)
        .filter((message) => message.user_id === user_id)
        .reverse()
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray()
        
      // console.log('loadMessages', messages)
      
      if (messages.length === 0) {
        allLoaded.value = true
        return []
      }

      messages.reverse()
      return messages || []
    } catch (error) {
      console.error('读取聊天记录失败:', error)
      return []
    }
  }

  const loadMoreHistory = async () => {
    console.log('loadMoreHistory')
    if (allLoaded.value) return
    if (scrollToBubble.value) return
    
    currentPage.value++
    const olderMessages = await loadMessages(currentPage.value)
    console.log('olderMessages', olderMessages)
    if (olderMessages.length > 0) {
      // ✅ 修复：保持内存中的未读状态，避免被数据库状态覆盖
      const existingMessages = new Map(list.value.map(msg => [msg.key, msg]))
      const mergedMessages = [...olderMessages, ...list.value].map(msg => {
        const existing = existingMessages.get(msg.key)
        if (existing) {
          // 保持内存中的最新状态（特别是未读状态）
          return {
            ...msg,
            unread: existing.unread,
            loading: false,
            typing: existing.typing
          }
        }
        msg.loading = false
        return msg
      })
      list.value = _.uniqBy(mergedMessages, 'key')
    }
  }

  // ==================== 消息操作 ====================
  const scrollBottom = () => {
    bubbleListRef.value?.scrollToBottom()
  }

  // 立即滚动到底部（无动画，用于初始化）
  const scrollBottomImmediate = () => {
    if (!bubbleListRef.value) return
    
    try {
      const scrollContainer = bubbleListRef.value.$el
      if (scrollContainer) {
        // 临时禁用smooth滚动
        const originalScrollBehavior = scrollContainer.style.scrollBehavior
        scrollContainer.style.scrollBehavior = 'auto'
        
        // 立即滚动到底部
        nextTick(() => {
          if (scrollContainer.scrollHeight) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
            setTimeout(() => {
              if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight) {
              } else {
                scrollBottomImmediate()
                return
              }
            }, 500)
          }
          
          // 恢复原始的滚动行为
          setTimeout(() => {
            scrollContainer.style.scrollBehavior = originalScrollBehavior || 'smooth'
          }, 100)
        })
      }
    } catch (error) {
      console.warn('立即滚动到底部失败:', error)
      // 降级使用普通滚动
      scrollBottom()
    }
  }
  
  // ==================== 未读消息管理 ====================
  /**
   * 检查并标记可见区域内的未读消息为已读
   * 使用更安全的元素定位方式，兼容第三方组件
   */
  const checkAndMarkVisibleMessages = async () => {
    if (!bubbleListRef.value) {
      console.warn('⚠️ bubbleListRef.value 为空，跳过已读检查')
      return
    }
    
    try {
      const scrollContainer = bubbleListRef.value.$el
      if (!scrollContainer) {
        console.warn('⚠️ 滚动容器为空，跳过已读检查')
        return
      }
      
      const containerRect = scrollContainer.getBoundingClientRect()
      const bubbleElements = scrollContainer.querySelectorAll('.el-bubble')
      
      if (bubbleElements.length === 0) {
        // console.log('📭 未找到消息元素')
        return
      }
      
      const visibleUnreadMessages = []

      // ✅ 修复：使用更安全的元素定位方式
      // 为每个未读消息查找对应的DOM元素，而不是依赖索引
      list.value.forEach((msg, msgIndex) => {
        // 只处理AI角色的未读消息
        if (msg.role !== 'ai' || !msg.unread || !msg.log_id) return

        // ✅ 尝试多种方式定位元素
        let msgElement = null
        
        // 方法1：尝试通过索引定位（如果DOM完全匹配的话）
        if (msgIndex < bubbleElements.length) {
          msgElement = bubbleElements[msgIndex]
        }
        
        // 方法2：如果索引不匹配，通过内容或其他属性寻找
        if (!msgElement && msg.content) {
          // 查找包含消息内容的元素
          const contentText = msg.content.substring(0, 50) // 取前50个字符进行匹配
          for (let i = 0; i < bubbleElements.length; i++) {
            const element = bubbleElements[i]
            if (element.textContent && element.textContent.includes(contentText)) {
              msgElement = element
              break
            }
          }
        }
        
        // 方法3：如果还是找不到，按时间戳顺序估算位置
        if (!msgElement) {
          // 计算消息在列表中的相对位置
          const totalMessages = list.value.length
          const relativePosition = msgIndex / totalMessages
          const estimatedIndex = Math.floor(relativePosition * bubbleElements.length)
          if (estimatedIndex < bubbleElements.length) {
            msgElement = bubbleElements[estimatedIndex]
          }
        }
        
        if (!msgElement) {
          console.warn('⚠️ 无法找到消息对应的DOM元素:', msg.log_id)
          return
        }
        
        const msgRect = msgElement.getBoundingClientRect()
        
        // 更严格的可见性检测：元素大部分区域可见才算已读
        const elementHeight = msgRect.bottom - msgRect.top
        const visibleTop = Math.max(msgRect.top, containerRect.top)
        const visibleBottom = Math.min(msgRect.bottom, containerRect.bottom)
        const visibleHeight = Math.max(0, visibleBottom - visibleTop)
        const visibleRatio = visibleHeight / elementHeight
        
        // 如果元素可见区域超过50%，认为用户已经看到
        if (visibleRatio > 0.5) {
          visibleUnreadMessages.push(msg)
        }
      })
      
      // console.log('📨 发现可见未读消息数量:', visibleUnreadMessages.length)
      
      if (visibleUnreadMessages.length > 0) {
        const visibleIds = visibleUnreadMessages.map(msg => msg.log_id)
        console.log('📝 准备标记为已读的消息IDs:', visibleIds)
        
        await markMessagesAsRead(visibleIds)
        
        // 更新本地状态
        list.value.forEach(msg => {
          if (visibleIds.includes(msg.log_id)) {
            msg.unread = false
          }
        })
        list.value = [...list.value]
        
        // console.log('✅ 已读标记完成')
      }
    } catch (error) {
      console.error('检查可见消息失败:', error)
    }
  }

  // ✅ 修复：减少防抖时间，避免遗漏快速滚动
  const debouncedCheckVisibleMessages = _.debounce(checkAndMarkVisibleMessages, 200)

  const handleBubbleScroll = (e) => {
    // console.log('📜 handleBubbleScroll 被调用', e)
    
    const el = e.target
    
    // 处理历史消息加载
    if (!scrollToBubble.value) {
      if (el.scrollTop <= threshold.value && !hasTriggered.value) {
        hasTriggered.value = true
        if (!isFirstLoad.value) {
          loadMoreHistory()
        }
      } else if (el.scrollTop > threshold.value) {
        hasTriggered.value = false
      }
    }
    
    // ✅ 修复：只在非跳转且非加载状态时检查已读
    if (!scrollToBubble.value && !loading.value) {
      debouncedCheckVisibleMessages()
    }
    
    // ✅ 修复：跳转完成后也要检查已读状态
    if (scrollToBubble.value) {
      // 延迟检查，确保跳转动画完成
      setTimeout(() => {
        if (!scrollToBubble.value) { // 确保跳转已完成
          checkAndMarkVisibleMessages()
        }
      }, 1000)
    }
  }

  const markMessagesAsRead = async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return
    
    try {
      // 获取用户ID，兼容不同模式
      const user_id = store.mode === 'sse' 
        ? 'xuminhui' 
        : store.userInfo?.id

      if (!user_id) {
        console.warn('用户ID为空，跳过已读标记')
        return
      }
      
      // ✅ 修复：先更新数据库，成功后再更新内存状态
      await db.messages
        .where('user_id').equals(user_id)
        .and(msg => messageIds.includes(msg.log_id))
        .modify({ unread: false })
        
      // 发送已读状态到服务器（仅 WebSocket 模式）
      if (store.mode === 'ws' && store.socketConnected) {
        store.socket.emit('chat_log_read', messageIds)
      }
      
      console.log('消息已标记为已读:', messageIds)
    } catch (error) {
      console.error('标记消息已读失败:', error)
    }
  }

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      if (!store.socketConnected || !store.socket || !store.socket.connected) {
        const { initSocket } = await import('@/utils/socket')
        initSocket()
      }
      setTimeout(() => {
        if (bubbleListRef.value && list.value.length > 0) {
          checkAndMarkVisibleMessages()
        }
      }, 1000)
    }
  }

  const showUnreadNotification = (count, onClick) => {
    const notification = ElNotification({
      title: '📩 您有新的未读消息',
      message: `<div class="notification-content">
        <div class="message-info">您有 <span class="message-count">${count}</span> 条未读消息等待查看</div>
        <div class="click-hint">💡 点击此处跳转到消息</div>
      </div>`,
      type: 'warning',
      customClass: 'unread-message-notification',
      dangerouslyUseHTMLString: true,
      duration: 0, // 不自动关闭
      position: 'top-right',
      showClose: true,
      onClick: () => {
        onClick()
        notification.close() // 点击后关闭通知
      }
    })
    return notification
  }

  // ==================== 流式响应处理 ====================
  const mockSSE = async (userMessage) => {
    const options = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk-dnzumitgikbwqurqaecqcssavbzfukxmekgsacchmymppfaf',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: userMessage }],
        stream: true,
        max_tokens: 4096,
        enable_thinking: enableThinking.value,
        thinking_budget: 8192,
        min_p: 0.05,
        stop: null,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        frequency_penalty: 0.5,
        n: 1,
        response_format: { type: 'text' }
      })
    }
    try {
      const response = await fetch(
        'https://api.siliconflow.cn/v1/chat/completions',
        options
      )
      const readableStream = response.body
      await startStream({ readableStream })
      
      return content.value
    } catch (err) {
      console.error('流式API请求失败:', err)
      throw err
    }
  }

  // ==================== 核心业务方法 ====================
  const handleSubmit = async (filesFromComponent = null, quoteMessage = null) => {
    if (!store.socketConnected) {
      ElMessage.warning(t('chat.serverConnecting'))
      return
    }

    if (store.mode === 'sse') {
      if (loading.value) return
      let lastContent = _.last(list.value)?.content
      if (list.value.length && !lastContent) return
      loading.value = true
    }

    const userMessage = userInput.value
    userInput.value = ''

    const userMessageObj = constructMessage(false, 'user', userMessage)
    
    // 处理文件附件
    if (filesFromComponent && filesFromComponent.length > 0) {
      userMessageObj.files = _.cloneDeep(filesFromComponent)
    }
    
    // 处理引用消息
    if (quoteMessage) {
      userMessageObj.ref_log_id = quoteMessage.log_id
      userMessageObj.ref_log_str = quoteMessage.content
    }
    
    const aiMessageObject = constructMessage(true)
    aiMessageObject.log_id = userMessageObj.log_id
    
    list.value.push(userMessageObj, aiMessageObject)
    list.value = [...list.value]
    
    if (store.mode === 'ws') {
      store.socket.emit('chat_query', {
        uuid: userMessageObj.log_id,
        query: userMessage,
        files: userMessageObj.files.map((item) => {
          return {
            filename: item.filename,
            transfer_method: item.transfer_method,
            url: item.url,
            type: item.type,
          }
        }),
        ref_id: quoteMessage?.log_id
      })
    } else {
      try {
        await db.messages.add(userMessageObj)
        const finalAIContent = await mockSSE(userMessage)
        const finalAIObject = _.cloneDeep({
          ..._.findLast(list.value, (x) => x.role === 'ai'),
          ...finalAIContent
        })
        await db.messages.add(finalAIObject)
      } catch (err) {
        console.error('流式API请求失败:', err)
        ElMessage.error(t('chat.sendFailed'))
      } finally {
        loading.value = false
      }
    }
    
    scrollBottom()
  }

  const handleCancel = () => {
    // console.log('handleCancel')
    cancel()

    // 找到最后一条AI消息，标记为已取消
    const lastIndex = _.findLastIndex(list.value, (msg) => msg.role === 'ai')
    if (lastIndex !== -1) {
      const aiMessage = list.value[lastIndex]

      // 如果消息内容为空，为用户添加取消提示
      if (!aiMessage.content) {
        aiMessage.content = t('chat.cancelled', '已取消')
      }

      // 更新状态
      aiMessage.loading = false
      aiMessage.typing = false
      list.value = [...list.value]

      // 更新数据库
      db.messages
        .where('key')
        .equals(aiMessage.key)
        .first()
        .then((msg) => {
          if (msg) {
            db.messages.update(msg.id, {
              content: aiMessage.content,
              loading: false,
              typing: false,
              timestamp: Date.now()
            })
          }
        })
    }

    // 重置loading状态
    loading.value = false
  }
  
  const handleReSend = async (item) => {
    // console.log('handleReSend', item)
    const aiMessageObject = constructMessage(true)
    aiMessageObject.log_id = item.log_id
    
    // ✅ 修复：重发的AI消息应该默认为未读，后续通过视口检测标记已读
    aiMessageObject.unread = true
    
    list.value.find((msg) => msg.log_id === item.log_id).status = 'success'
    list.value.push(aiMessageObject)
    list.value = [...list.value]
    
    if (store.mode === 'ws') {
      store.socket.emit('chat_query', {
        uuid: item.log_id,
        query: item.content,
        files: item.files.map((item) => {
          return {
            filename: item.filename,
            transfer_method: item.transfer_method,
            url: item.url,
            type: item.type,
          }
        }),
        ref_id: item.ref_log_id
      })
    }
    
    scrollBottom()
  }

  const handleRefresh = async (item) => {
    const lastUserMessage = await db.messages
      .filter((msg) => msg.log_id === item.log_id && msg.role === 'user')
      .first()
    // console.log('lastUserMessage', lastUserMessage)
  }

  const handleCopy = async (item) => {
    const text = item.reasoning_content + item.content
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success(t('chat.copySuccess'))
    } catch (err) {
      ElMessage.error(t('chat.copyFailed'))
    }
  }

  const toggleThinking = () => {
    enableThinking.value = !enableThinking.value
  }

  // ==================== WebSocket 处理 ====================
  const setupWebSocketListeners = () => {
    if (store.mode !== 'ws' || !socket) return

    // 清理现有监听器，防止重复绑定
    socket.off('ai_response_start')
    socket.off('ai_response_update')
    socket.off('chat_query_response')
    socket.off('chat_query_error')
    socket.off('credential_set')
    socket.off('chat_rerun_response')
    socket.off('chat_log_read')
    socket.off('chat_log_diff')
    socket.off('error')
    socket.off('disconnect')
    socket.off('connect')

    // 处理AI响应开始事件
    store.socket.on('ai_response_start', async (data) => {
      // console.log('ai_response_start', data)
      if (!data || !data.log_id) return
      
      const aiMessageObject = constructMessage(true)
      aiMessageObject.log_id = data.log_id
      aiMessageObject.loading = !!data.text
      aiMessageObject.typing = true
      aiMessageObject.content = data.text || ''
      aiMessageObject.ref_log_id = data.ref_log_id || null
      aiMessageObject.ref_log_str = data.ref_log_str || null
      if (data.files) {
        aiMessageObject.files = data.files
      }
      aiMessageObject.agent_name = data.agent
      aiMessageObject.timestamp = Date.now()
      
      // ✅ 修复：判断是否为当前用户发起的对话
      const isCurrentUserConversation = list.value.some(msg => 
        msg.log_id === data.log_id && msg.role === 'user'
      )
      
      // 如果是当前用户发起的对话，需要检查是否在视口中来决定未读状态
      if (isCurrentUserConversation) {
        // 当前用户发起的对话，默认设为未读，后续通过视口检测来标记已读
        aiMessageObject.unread = true
      } else {
        // 其他终端发起的对话，保持默认未读状态
        aiMessageObject.unread = true
      }
      
      if (data.is_end) {
        aiMessageObject.loading = false
        aiMessageObject.typing = false
        loading.value = false
        const msgToStore = _.cloneDeep(aiMessageObject)
        await db.messages.add(msgToStore)
      }
      list.value.push(aiMessageObject)
    })

    // 处理AI响应更新事件
    store.socket.on('ai_response_update', async (data) => {
      if (!data || !data.log_id) return

      const msgIndex = _.findIndex(
        list.value,
        (msg) => msg.log_id === data.log_id && msg.role === 'ai'
      )
      if (msgIndex !== -1) {
        if (!list.value[msgIndex].content) {
          list.value[msgIndex].timestamp = Date.now()
        }
        list.value[msgIndex].content += data.text || ''
        list.value[msgIndex].loading = !list.value[msgIndex].content
        if (data.files) {
          list.value[msgIndex].files = data.files
        }
        list.value[msgIndex].agent_name = data.agent
        list.value[msgIndex].typing = !data.is_end

        if (data.is_end) {
          loading.value = false
          
          // ✅ 修复：消息完成时，如果在视口中则标记为已读
          setTimeout(() => {
            if (bubbleListRef.value && list.value.length > 0) {
              checkAndMarkVisibleMessages()
            }
          }, 500) // 延迟检查，确保DOM更新完成
          
          const msgToStore = _.cloneDeep(list.value[msgIndex])
          const existingMsg = await db.messages
            .where('key')
            .equals(msgToStore.key)
            .first()
          if (existingMsg) {
            await db.messages.update(existingMsg.id, {
              content: msgToStore.content,
              timestamp: Date.now()
            })
          } else {
            await db.messages.add(msgToStore)
          }
        }

        list.value = [...list.value]
      }
    })

    // 处理发送消息的响应
    store.socket.on('chat_query_response', async ({ user, ai, uuid }) => {
      // console.log('chat_query_response', user, ai)
      let userInfo = _.find(list.value, (item) => item.role === 'user' && item.log_id === uuid)
      if (userInfo) {
        // ✅ 修复：当前用户发起的对话
        userInfo.log_id = user.id
        let aiInfo = _.find(list.value, (item) => item.role === 'ai' && item.log_id === uuid)
        if (aiInfo) {
          aiInfo.log_id = ai.id
          // 当前用户发起的对话，AI回复默认为未读，后续通过视口检测标记已读
          aiInfo.unread = true
          
          // 如果消息已完成且在视口中，立即检查是否应该标记为已读
          if (!aiInfo.loading && !aiInfo.typing) {
            setTimeout(() => {
              if (bubbleListRef.value && list.value.length > 0) {
                checkAndMarkVisibleMessages()
              }
            }, 500)
          }
        }
        await db.messages.add(_.cloneDeep(userInfo))
      } else {
        // 别的终端发的，这里需要拼装用户消息
        let userMessageObj = constructMessage(false, 'user', user.text)
        userMessageObj.log_id = user.id
        userMessageObj.timestamp = user.created_on
        userMessageObj.files = user.files
        let aiMessageObj = constructMessage(true, 'ai', ai.text)
        aiMessageObj.log_id = ai.id
        aiMessageObj.agent_name = ai.agent
        aiMessageObj.timestamp = ai.created_on
        aiMessageObj.files = ai.files
        aiMessageObj.unread = ai.unread  // 保持服务器的未读状态
        list.value.push(userMessageObj, aiMessageObj)
        await db.messages.add(_.cloneDeep(userMessageObj))
        await db.messages.add(_.cloneDeep(aiMessageObj))
      }
    })

    // 处理发送消息的错误
    store.socket.on('chat_query_error', async ({ message, uuid }) => {
      console.error('发送消息失败:', message)
      list.value = list.value.filter((msg) => !(msg.log_id === uuid && msg.role === 'ai'))
      // 更新当前消息的状态同时更新数据库
      const msg = _.find(list.value, (item) => item.log_id === uuid)
      if (msg) {
        msg.status = 'error'
        list.value = [...list.value]
        const dbMsg = await db.messages.where('key').equals(msg.key).first()
        if (dbMsg) {
          await db.messages.update(dbMsg.id, {
            status: 'error'
          })
        }
      }
      ElMessage.error(t('chat.sendFailed'))
      loading.value = false
    })

    // 凭据认证
    store.socket.on('credential_set', async ({ system, log_id }) => {
      // console.log('credential_set', system, log_id)
      const config = (await getCredentialAll()).data
      const credentials = config.map((item) => {
        return {
          ...item.conf,
          ...item.data,
          config: item.conf.config
        }
      })
      const credentialId = credentials.find((item) => item.name === system)?.id
      showUpdateCredential({ credentialId, credentials }, async () => {
        store.socket.emit('chat_rerun', {
          user_log_id: log_id,
          ref_id: list.value.find((item) => item.log_id === log_id)
            ?.ref_log_id
        })        
      })
    })

    // 凭据认证后重试的响应
    store.socket.on('chat_rerun_response', async ({ ai }) => {
      // console.log('chat_rerun_response', ai)
      let aiInfo = _.find(list.value, (item) => item.log_id === ai.id)
      if (aiInfo) {
        aiInfo.content = ai.text
        if (ai.files) {
          aiInfo.files = ai.files
        }
        aiInfo.loading = true
        aiInfo.typing = true
        
        // ✅ 修复：重试的AI消息应该默认为未读，后续通过视口检测标记已读
        aiInfo.unread = true
        
        list.value = [...list.value]
        await db.messages.where('log_id').equals(ai.id).delete()
      }
    })

    // 处理已读消息
    store.socket.on('chat_log_read', async (messageIds) => {
      try {
        // ✅ 修复：先更新数据库，成功后再更新内存状态
        await db.messages
          .where('log_id')
          .anyOf(messageIds)
          .modify({ unread: false })
        
        // 数据库更新成功后，更新内存状态
        list.value.forEach((item) => {
          if (messageIds.includes(item.log_id)) {
            item.unread = false
          }
        })
        list.value = [...list.value]
        
        console.log(`已标记 ${messageIds.length} 条消息为已读`)
      } catch (error) {
        console.error('处理已读消息失败:', error)
        ElMessage.error('标记消息已读失败')
      }
    })

    // 处理消息差异同步
    store.socket.on('chat_log_diff', async (data) => {
      // console.log('chat_log_diff', data)
      let diffs = data.filter((item) => item.text || item.files.length > 0)

      if (diffs.length > 0) {
        const updateMessages = _.intersectionWith(
          diffs,
          originalMessages.value,
          (a, b) => a.id === b.log_id
        )
        const addMessages = _.differenceWith(
          diffs,
          originalMessages.value,
          (a, b) => a.id === b.log_id
        )

        // 处理消息更新
        if (updateMessages.length > 0) {
          for (let index = 0; index < updateMessages.length; index++) {
            const element = updateMessages[index]
            const dbMessage = originalMessages.value.find(
              (msg) => msg.log_id === element.id
            )
            
            // 更新数据库
            await db.messages.update(dbMessage.id, {
              content: element.text,
              files: element.files,
              agent_name: element.agent,
              ref_log_id: element.ref_log_id,
              ref_log_str: element.ref_log_str,
              loading: element.pending ?? false,
              typing: !element.sent ?? false,
              unread: element.unread,
              timestamp: element.created_on
            })
            
            // ✅ 关键修复：同时更新页面显示的 list.value
            const listMessageIndex = list.value.findIndex(msg => msg.log_id === element.id)
            if (listMessageIndex !== -1) {
              // ✅ 修复：保护本地未读状态，避免被服务器状态覆盖
              const currentMessage = list.value[listMessageIndex]
              const shouldKeepLocalUnreadState = 
                // 如果本地消息已标记为已读，且服务器说是未读，保持本地状态
                (!currentMessage.unread && element.unread) ||
                // 如果消息正在加载或打字中，保持当前状态
                currentMessage.loading || currentMessage.typing
              
              list.value[listMessageIndex] = {
                ...list.value[listMessageIndex],
                content: element.text,
                files: element.files,
                agent_name: element.agent,
                ref_log_id: element.ref_log_id,
                ref_log_str: element.ref_log_str,
                loading: element.pending ?? false,
                typing: !element.sent ?? false,
                unread: shouldKeepLocalUnreadState ? currentMessage.unread : element.unread,
                timestamp: element.created_on
              }
            }
          }
          // ✅ 触发响应式更新
          list.value = [...list.value]
        }

        // 处理新增消息
        if (addMessages.length > 0) {
          const newMessages = []
          for (let index = 0; index < addMessages.length; index++) {
            const element = addMessages[addMessages.length - index - 1]
            const role = element.role === 'user' ? 'user' : 'ai'
            const message = {
              ...constructMessage(false, role, element.text),
              log_id: element.id,
              role: role,
              files: element.files || [],
              agent_name: element.agent,
              ref_log_id: element.ref_log_id,
              ref_log_str: element.ref_log_str,
              loading: element.pending ?? false,
              typing: !element.sent ?? false,
              unread: element.unread,
              timestamp: element.created_on
            }
            
            // 添加到数据库
            await db.messages.add(message)
            newMessages.push(message)
          }
          
          // ✅ 关键修复：将新消息添加到页面显示
          if (newMessages.length > 0) {
            // 按时间戳排序后插入到正确位置
            const sortedNewMessages = _.sortBy(newMessages, 'log_id')
            list.value.push(...sortedNewMessages)
            list.value = _.uniqBy(_.sortBy(list.value, 'log_id'), 'key')
          }
        }
        
        lastSyncServerMessageTime.value = Date.now()

        // ✅ 修复：处理未读消息通知，增加用户ID检查
        const currentUserId = store.userInfo?.id
        if (!currentUserId) {
          console.warn('用户ID为空，跳过未读消息通知')
          return
        }

        const unreadMessages = await db.messages
          .where('user_id')
          .equals(currentUserId)
          .filter((message) => message.unread && message.role === 'ai')
          .toArray()
          
        if (unreadMessages.length > 0) {
          const firstUnreadLogId = _.minBy(unreadMessages, 'log_id').log_id
          showUnreadNotification(unreadMessages.length, async () => {
            let showMessages = []
            if(list.value.some((item) => item.log_id === firstUnreadLogId)){
              showMessages = list.value
            }else{
              // ✅ 修复：简化分页逻辑，直接加载包含第一条未读消息的足够消息
              const messagesFromFirst = await db.messages
                .orderBy('log_id')
                .filter(message => 
                  message.user_id === currentUserId && 
                  message.log_id >= firstUnreadLogId
                )
                .toArray()
              
              // 如果消息太少，补充一些之前的消息
              if (messagesFromFirst.length < PAGE_SIZE) {
                const additionalMessages = await db.messages
                  .orderBy('log_id')
                  .filter(message => 
                    message.user_id === currentUserId && 
                    message.log_id < firstUnreadLogId
                  )
                  .reverse()
                  .limit(PAGE_SIZE - messagesFromFirst.length)
                  .toArray()
                
                showMessages = [...additionalMessages.reverse(), ...messagesFromFirst]
              } else {
                showMessages = messagesFromFirst
              }
              
              // 更新currentPage
              currentPage.value = Math.ceil(showMessages.length / PAGE_SIZE)
            }
            
            let index = showMessages.findIndex(
              (item) => item.log_id === firstUnreadLogId
            )
            
            // 更新list.value为新加载的消息
            if (!list.value.some((item) => item.log_id === firstUnreadLogId)) {
              showMessages.forEach((item) => (item.loading = false))
              list.value = _.uniqBy(showMessages, 'key')
            }
            
            scrollToBubble.value = true
            bubbleListRef.value.scrollToBubble(index)
            nextTick(() => {
              scrollToBubble.value = false
              setTimeout(() => {
                if (bubbleListRef.value && list.value.length > 0) {
                  checkAndMarkVisibleMessages()
                }
              }, 1000)
            })
          })
        }
      } else {
        lastSyncServerMessageTime.value = Date.now()
      }
    })
    
    // 处理确认事件
    store.socket.on('confirm', async (detail) => {
      window.dispatchEvent(new CustomEvent('showConfirmDialog', { detail }))
    })
    
    // 处理关闭确认事件
    store.socket.on('confirm_dismiss', async () => {
      window.dispatchEvent(new CustomEvent('confirmDismiss'))
    })

    // 处理socket错误
    store.socket.on('error', (error) => {
      console.error('WebSocket错误:', error)
      ElMessage.error(t('chat.connectionError'))
      loading.value = false

      const lastIndex = _.findLastIndex(list.value, (msg) => msg.role === 'ai')
      if (lastIndex !== -1 && !list.value[lastIndex].content) {
        list.value[lastIndex].content = t('chat.errorOccurred')
        list.value[lastIndex].loading = false
        list.value[lastIndex].typing = false
        list.value = [...list.value]
      }
    })

    // 处理socket断开连接
    store.socket.on('disconnect', (reason) => {
      // console.log('WebSocket断开连接:', reason)

      if (loading.value) {
        loading.value = false
        ElMessage.warning(t('chat.connectionLost'))

        const lastIndex = _.findLastIndex(list.value, (msg) => msg.role === 'ai')
        if (lastIndex !== -1 && !list.value[lastIndex].content) {
          list.value[lastIndex].content = t('chat.connectionLost')
          list.value[lastIndex].loading = false
          list.value[lastIndex].typing = false
          list.value = [...list.value]
        }
      }
    })

    store.socket.on('connect', () => {
      store.setSocketConnected(true)
    })
  }

  const syncServerMessage = async () => {
    if (store.mode !== 'ws') return

    if (Date.now() - lastSyncServerMessageTime.value < 2000) {
      // console.log('syncServerMessage too frequent')
      return
    }

    try {
      originalMessages.value = await db.messages
        .orderBy('log_id')
        .filter((message) => message.user_id === store.userInfo.id)
        .reverse()
        .offset(0)
        .limit(list.value.length || 20)
        .toArray()
        
      let data = originalMessages.value.map((msg) => ({
        id: msg.log_id,
        textLength: msg.content ? Array.from(msg.content).length : 0,
        fileLength: msg.files ? msg.files.length : 0
      }))
      
      data = data.filter((item) => _.isNumber(item.id))
      store.socket.emit('chat_log_diff', data)
    } catch (error) {
      console.error('同步服务器消息失败:', error)
    }
  }

  // ==================== 事件处理 ====================
  const handleMessageDeleted = async (event) => {
    const { logId, id } = event.detail
    const originalLength = list.value.length
    list.value = list.value.filter(msg => msg.log_id !== logId && msg.id !== id)
    
    const deletedCount = originalLength - list.value.length
    if (deletedCount > 0 && list.value.length < PAGE_SIZE && !allLoaded.value) {
      await replenishMessages(deletedCount)
    }
  }

  const handleMessagesDeleted = async (event) => {
    const { logIds, ids } = event.detail
    const originalLength = list.value.length
    list.value = list.value.filter(msg => 
      !logIds.includes(msg.log_id) && !ids.includes(msg.id)
    )
    
    const deletedCount = originalLength - list.value.length
    if (deletedCount > 0 && list.value.length < PAGE_SIZE && !allLoaded.value) {
      await replenishMessages(deletedCount)
    }
  }

  const replenishMessages = async (needCount) => {
    try {
      const user_id = store.mode === 'sse' 
        ? 'xuminhui' 
        : store.userInfo.id
      const orderBy = store.mode === 'sse' ? 'id' : 'log_id'
      
      const currentIds = list.value.map(msg => msg[orderBy])
      
      const newMessages = await db.messages
        .orderBy(orderBy)
        .filter((message) => {
          return message.user_id === user_id && !currentIds.includes(message[orderBy])
        })
        .reverse()
        .limit(needCount * 2)
        .toArray()
        
      if (newMessages.length > 0) {
        const uniqueNewMessages = newMessages
          .filter(newMsg => !list.value.some(existingMsg => 
            existingMsg.key === newMsg.key || existingMsg.log_id === newMsg.log_id
          ))
          .slice(0, needCount)
          
        if (uniqueNewMessages.length > 0) {
          // ✅ 修复：保持内存中的状态，避免覆盖
          const existingMessages = new Map(list.value.map(msg => [msg.key, msg]))
          const processedMessages = uniqueNewMessages.map(msg => {
            const existing = existingMessages.get(msg.key)
            if (existing) {
              // 保持内存中的最新状态
              return {
                ...msg,
                unread: existing.unread,
                loading: existing.loading,
                typing: existing.typing
              }
            }
            // 新消息保持数据库状态，但确保不是加载状态
            return {
              ...msg,
              loading: false
            }
          })
          
          const mergedMessages = [...processedMessages, ...list.value]
          list.value = _.uniqBy(mergedMessages, 'key')
        }
        
        if (newMessages.length < needCount) {
          allLoaded.value = true
        }
      } else {
        allLoaded.value = true
      }
    } catch (error) {
      console.error('补充消息数据失败:', error)
    }
  }

  // 跳转引用消息
  const handleQuoteJump = (item) => {
    const index = list.value.findIndex((msg) => msg.log_id === item.ref_log_id)
    if (index !== -1) {
      bubbleListRef.value.scrollToBubble(index)
    }
  }

  // ==================== 初始化和清理 ====================
  const initializeMessages = async () => {
    const messages = await loadMessages()
    
    // ✅ 修复：智能处理loading状态，不盲目设置为false
    messages.forEach((item) => {
      // 只有在确实不应该loading的情况下才设置为false
      // 例如：已经有完整内容的消息不应该处于loading状态
      // if (item.content && !item.typing) {
      //   item.loading = false
      // }
      item.loading = false
      // 保持其他消息的原始状态（可能正在loading）
    })
    console.log('messages', messages)
    list.value = _.uniqBy(messages, 'key')
    isFirstLoad.value = false
  }

  // 重置状态的方法
  const resetState = () => {
    list.value = []
    currentPage.value = 1
    allLoaded.value = false
    hasTriggered.value = false
    isFirstLoad.value = true
    scrollToBubble.value = false
    isInitializing.value = false
    lastSyncServerMessageTime.value = 0
    originalMessages.value = []
  }

  const addEventListeners = () => {
    window.addEventListener('messageDeleted', handleMessageDeleted)
    window.addEventListener('messagesDeleted', handleMessagesDeleted)
  }

  const removeEventListeners = () => {
    window.removeEventListener('messageDeleted', handleMessageDeleted)
    window.removeEventListener('messagesDeleted', handleMessagesDeleted)
  }

  const waitForSocketAndSetup = async () => {
    if (store.socketConnected) {
      setupWebSocketListeners()
      await syncServerMessage()
    } else {
      setTimeout(() => {
        waitForSocketAndSetup()
      }, 1000)
    }
  }

  const initialize = async () => {
    // 每次初始化时重置状态，防止重复显示
    resetState()
    isInitializing.value = true
    
    // 添加页面可见性监听
    window.addEventListener('visibilitychange', handleVisibilityChange)
    addEventListeners()

    // WebSocket模式初始化
    if (store.mode === 'ws') {
      await refreshToken().then(async () => {
        // console.log('refreshToken success')
        if(!store.userInfo.id){
          store.setUserInfo((await getUserInfo()).data)
        }
        waitForSocketAndSetup()
      })
    }

    // 初始化消息列表
    await initializeMessages()

    // ✅ 修复：延迟检查未读消息，确保DOM已渲染且数据已加载
    nextTick(() => {
      // 立即滚动到底部（无动画）
      if (list.value.length > 0) {
        setTimeout(() => {
          scrollBottomImmediate()
          // 初始化完成后等待一小段时间再允许自动滚动
          setTimeout(() => {
            isInitializing.value = false
          }, 500)
        }, 100)
      } else {
        isInitializing.value = false
      }
      
      // 延迟检查未读消息
      setTimeout(() => {
        if (bubbleListRef.value && list.value.length > 0) {
          checkAndMarkVisibleMessages()
        }
      }, 1000)
    })
  }

  const cleanup = () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange)
    removeEventListeners()

    if (bubbleListRef.value) {
      bubbleListRef.value.$el.removeEventListener('scroll', handleBubbleScroll)
    }
    
    // 清理WebSocket监听器，防止内存泄漏
    if (store.mode === 'ws' && socket) {
      socket.off('ai_response_start')
      socket.off('ai_response_update')
      socket.off('chat_query_response')
      socket.off('chat_query_error')
      socket.off('credential_set')
      socket.off('chat_rerun_response')
      socket.off('chat_log_read')
      socket.off('chat_log_diff')
      socket.off('error')
      socket.off('disconnect')
      socket.off('connect')
    }
    
    // 重置所有状态
    resetState()
  }

  // ==================== 返回接口 ====================
  return {
    // 状态 - 返回 ref 对象，模板中需要 .value
    list,
    loading,
    userInput,
    enableThinking,
    bubbleListRef,
    alwaysShowScrollbar,
    btnLoading,
    btnColor,
    btnSize,
    
    // 计算属性保持原样
    content,
    data,
    greeting,
    
    // 方法
    handleSubmit,
    handleCancel,
    handleRefresh,
    handleCopy,
    toggleThinking,
    handleBubbleScroll,
    scrollBottom,
    scrollBottomImmediate,
    checkAndMarkVisibleMessages,
    resetState,
    waitForSocketAndSetup,
    handleQuoteJump,
    // 生命周期
    initialize,
    cleanup
  }
} 