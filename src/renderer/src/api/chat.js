// ==================== 默认配置 ====================

/**
 * 默认聊天配置
 */
const DEFAULT_CONFIG = {
  model: 'deepseek-ai/DeepSeek-V3',
  systemPrompt: '', // 系统提示词
  enableThinking: false,
  maxTokens: 4096,
  thinkingBudget: 8192,
  temperature: 0.7,
  topP: 0.7,
  topK: 50,
  frequencyPenalty: 0.5,
  minP: 0.05
}

/**
 * 导出默认配置供外部使用
 */
export const defaultChatConfig = { ...DEFAULT_CONFIG }

/**
 * 预设配置模板
 */
export const chatPresets = {
  // 创意写作配置
  creative: {
    systemPrompt: '你是一位富有创意的作家，擅长创作引人入胜的故事和文本。请发挥你的想象力，创作出独特而有趣的内容。',
    temperature: 0.9,
    topP: 0.8,
    enableThinking: true
  },
  
  // 严谨分析配置
  analytical: {
    systemPrompt: '你是一位严谨的分析师，擅长逻辑思维和理性分析。请基于事实和逻辑，提供准确、客观的分析和建议。',
    temperature: 0.2,
    topP: 0.5,
    enableThinking: true
  },
  
  // 编程助手配置
  coding: {
    systemPrompt: '你是一位专业的编程助手，精通多种编程语言和技术。请提供准确、高效的代码和技术解决方案。',
    temperature: 0.1,
    topP: 0.3,
    enableThinking: false,
    maxTokens: 8192
  },
  
  // 教学配置
  teaching: {
    systemPrompt: '你是一位耐心的老师，擅长用简单易懂的方式解释复杂概念。请用循序渐进的方式帮助学习者理解知识。',
    temperature: 0.6,
    topP: 0.7,
    enableThinking: true
  },
  
  // 快速问答配置
  quickAnswer: {
    systemPrompt: '请简洁明了地回答问题，提供最重要的信息。',
    temperature: 0.3,
    maxTokens: 1024,
    enableThinking: false
  }
}

/**
 * 构建消息数组
 * @param {string} userMessage 用户消息
 * @param {string} systemPrompt 系统提示词
 * @returns {Array} 消息数组
 */
const buildMessages = (userMessage, systemPrompt = '') => {
  const messages = []
  
  // 添加系统提示词（如果存在）
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() })
  }
  
  // 添加用户消息
  messages.push({ role: 'user', content: userMessage })
  
  return messages
}

/**
 * 创建请求配置
 * @param {string} userMessage 用户消息
 * @param {boolean} stream 是否流式
 * @param {Object} options 可选配置
 * @param {string} options.model 模型名称
 * @param {string} options.systemPrompt 系统提示词
 * @param {boolean} options.enableThinking 是否启用思考模式
 * @param {number} options.maxTokens 最大token数
 * @param {number} options.thinkingBudget 思考预算
 * @param {number} options.temperature 温度参数
 * @param {number} options.topP top_p参数
 * @param {number} options.topK top_k参数
 * @param {number} options.frequencyPenalty 频率惩罚
 * @param {number} options.minP min_p参数
 * @returns {Object} 请求配置
 */
const createRequestConfig = (userMessage, stream = true, options = {}) => {
  const apiKey = import.meta.env.VITE_API_KEY || 'sk-dnzumitgikbwqurqaecqcssavbzfukxmekgsacchmymppfaf'
  
  // 合并配置
  const config = { ...DEFAULT_CONFIG, ...options }
  
  return {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildMessages(userMessage, config.systemPrompt),
      stream,
      max_tokens: config.maxTokens,
      enable_thinking: config.enableThinking,
      thinking_budget: config.thinkingBudget,
      min_p: config.minP,
      stop: null,
      temperature: config.temperature,
      top_p: config.topP,
      top_k: config.topK,
      frequency_penalty: config.frequencyPenalty,
      n: 1,
      response_format: { type: 'text' }
    })
  }
}

/**
 * 通用请求方法
 * @param {Object} config 请求配置
 * @returns {Promise<Response>} 响应对象
 */
const makeRequest = async (config) => {
  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', config)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response
}

// ==================== 聊天方法 ====================

/**
 * 流式聊天 - 实时回调处理每个内容片段
 * @param {string} userMessage 用户消息
 * @param {Function} onMessage 接收消息的回调函数
 * @param {Function} onError 错误处理回调函数
 * @param {Function} onComplete 完成时的回调函数
 * @param {Object} options 可选配置
 * @returns {Promise<void>}
 */
export async function chatStream (userMessage, onMessage, onError, onComplete, options = {}) {
  try {
    const config = createRequestConfig(userMessage, true, options)
    const response = await makeRequest(config)
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        if (onComplete) onComplete()
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // 保留不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          
          if (data === '[DONE]') {
            if (onComplete) onComplete()
            return
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            
            if (content && onMessage) {
              onMessage(content)
            }
          } catch (parseError) {
            console.warn('解析 SSE 数据失败:', parseError, data)
          }
        }
      }
    }
  } catch (err) {
    console.error('流式聊天请求失败:', err)
    if (onError) {
      onError(err)
    } else {
      throw err
    }
  }
}

/**
 * 流式聊天 - 等待完整响应后返回
 * @param {string} userMessage 用户消息
 * @param {Object} options 可选配置
 * @returns {Promise<string>} 完整的响应内容
 */
export async function chatStreamComplete (userMessage, options = {}) {
  return new Promise((resolve, reject) => {
    let fullContent = ''
    
    chatStream(
      userMessage,
      (content) => {
        fullContent += content
      },
      (error) => {
        reject(error)
      },
      () => {
        resolve(fullContent)
      },
      options
    )
  })
}

/**
 * 非流式聊天 - 直接返回完整响应
 * @param {string} userMessage 用户消息
 * @param {Object} options 可选配置
 * @returns {Promise<string>} 完整的响应内容
 */
export async function chatComplete (userMessage, options = {}) {
  try {
    const config = createRequestConfig(userMessage, false, options)
    const response = await makeRequest(config)
    const data = await response.json()
    
    // 提取响应内容
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      throw new Error('响应中未找到有效内容')
    }
    
    return content
  } catch (err) {
    console.error('非流式聊天请求失败:', err)
    throw err
  }
}

// ==================== 使用示例 ====================

/**
 * 使用示例：
 * 
 * // 方式1: 流式聊天（推荐用于实时聊天界面）
 * await chatStream(
 *   '你好，请介绍一下自己',
 *   (content) => {
 *     console.log('接收到内容片段:', content)
 *     updateChatUI(content) // 实时更新界面
 *   },
 *   (error) => {
 *     console.error('请求失败:', error)
 *     showErrorMessage(error.message)
 *   },
 *   () => {
 *     console.log('流式响应完成')
 *     hideLoadingIndicator()
 *   },
 *   {
 *     model: 'deepseek-ai/DeepSeek-V3',
 *     systemPrompt: '你是一个有用的AI助手，请用友好的语气回答问题。',
 *     enableThinking: true,
 *     temperature: 0.8
 *   }
 * )
 * 
 * // 方式2: 流式聊天等待完整响应
 * try {
 *   const response = await chatStreamComplete(
 *     '请写一首关于春天的诗',
 *     {
 *       systemPrompt: '你是一位才华横溢的诗人，擅长创作优美的诗歌。',
 *       temperature: 0.9,
 *       maxTokens: 2048
 *     }
 *   )
 *   console.log('完整响应:', response)
 *   displayMessage(response)
 * } catch (error) {
 *   console.error('请求失败:', error)
 * }
 * 
 * // 方式3: 非流式聊天（适合简单场景）
 * try {
 *   const response = await chatComplete(
 *     '1+1等于多少？',
 *     {
 *       model: 'deepseek-ai/DeepSeek-V3',
 *       enableThinking: false,
 *       temperature: 0.1, // 低温度用于数学计算
 *       maxTokens: 100
 *     }
 *   )
 *   console.log('直接响应:', response)
 *   displayMessage(response)
 * } catch (error) {
 *   console.error('请求失败:', error)
 * }
 * 
 * // 使用预设配置：
 * import { chatStream, chatPresets } from '@/api/chat'
 * 
 * // 创意写作
 * await chatStream('写一个科幻故事', onMessage, onError, onComplete, chatPresets.creative)
 * 
 * // 编程助手
 * const code = await chatComplete('如何实现快速排序？', chatPresets.coding)
 * 
 * // 严谨分析
 * const analysis = await chatStreamComplete('分析当前AI发展趋势', chatPresets.analytical)
 * 
 * // 自定义配置选项说明：
 * const customOptions = {
 *   model: 'deepseek-ai/DeepSeek-V3',           // 模型名称
 *   systemPrompt: '你是一个专业的AI助手...',    // 系统提示词
 *   enableThinking: true,                       // 启用思考模式
 *   maxTokens: 4096,                           // 最大token数
 *   thinkingBudget: 8192,                      // 思考预算
 *   temperature: 0.7,                          // 温度参数 (0-1)
 *   topP: 0.7,                                 // top_p参数 (0-1)
 *   topK: 50,                                  // top_k参数
 *   frequencyPenalty: 0.5,                     // 频率惩罚 (0-1)
 *   minP: 0.05                                 // min_p参数 (0-1)
 * }
 * 
 * // 混合配置（预设 + 自定义）
 * const mixedConfig = { ...chatPresets.creative, maxTokens: 2048, temperature: 0.8 }
 * await chatStream('写诗', onMessage, onError, onComplete, mixedConfig)
 */