import db from './db'
import { useAppStore } from '@/store/app'

/**
 * 消息删除操作工具函数
 */

/**
 * 删除单条消息（按数据库 ID）
 * @param {number} messageId - 消息的数据库 ID
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteMessageById = async (messageId) => {
  try {
    await db.messages.delete(messageId)
    console.log(`消息 ID ${messageId} 删除成功`)
    return true
  } catch (error) {
    console.error('删除消息失败:', error)
    return false
  }
}

/**
 * 删除单条消息（按 log_id）
 * @param {number} logId - 消息的 log_id
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteMessageByLogId = async (logId) => {
  try {
    const deletedCount = await db.messages.where('log_id').equals(logId).delete()
    console.log(`log_id ${logId} 的 ${deletedCount} 条消息删除成功`)
    return true
  } catch (error) {
    console.error('删除消息失败:', error)
    return false
  }
}

/**
 * 删除对话对（用户消息和对应的AI回复）
 * @param {number} logId - 对话的 log_id
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteConversationPair = async (logId) => {
  try {
    // 查找相关的用户消息和AI消息
    const messages = await db.messages.where('log_id').equals(logId).toArray()
    const userMessage = messages.find(msg => msg.role === 'user')
    const aiMessage = messages.find(msg => msg.role === 'ai')
    
    const deletedCount = await db.messages.where('log_id').equals(logId).delete()
    console.log(`对话 ${logId} 的 ${deletedCount} 条消息删除成功`)
    
    // 触发自定义事件，通知界面更新
    if (deletedCount > 0) {
      const event = new CustomEvent('messagesDeleted', {
        detail: { 
          logIds: [logId], 
          ids: messages.map(msg => msg.id)
        }
      })
      window.dispatchEvent(event)
    }
    
    return true
  } catch (error) {
    console.error('删除对话失败:', error)
    return false
  }
}

/**
 * 批量删除多个对话
 * @param {number[]} logIds - 要删除的 log_id 数组
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteMultipleConversations = async (logIds) => {
  try {
    // 先获取要删除的消息ID，用于事件通知
    const messagesToDelete = await db.messages.where('log_id').anyOf(logIds).toArray()
    const messageIds = messagesToDelete.map(msg => msg.id)
    
    const deletedCount = await db.messages.where('log_id').anyOf(logIds).delete()
    console.log(`批量删除 ${logIds.length} 个对话的 ${deletedCount} 条消息`)
    
    // 触发自定义事件，通知界面更新
    if (deletedCount > 0) {
      const event = new CustomEvent('messagesDeleted', {
        detail: { logIds, ids: messageIds }
      })
      window.dispatchEvent(event)
    }
    
    return true
  } catch (error) {
    console.error('批量删除对话失败:', error)
    return false
  }
}

/**
 * 删除当前用户的所有消息
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteAllUserMessages = async () => {
  try {
    const store = useAppStore()
    const userId = store.mode === 'sse' ? 'xuminhui' : store.userInfo.id
    
    const deletedCount = await db.messages.where('user_id').equals(userId).delete()
    console.log(`用户 ${userId} 的 ${deletedCount} 条消息全部删除`)
    
    // 触发自定义事件，通知界面清空
    const event = new CustomEvent('allMessagesDeleted', { detail: { userId } })
    window.dispatchEvent(event)
    
    return true
  } catch (error) {
    console.error('删除所有消息失败:', error)
    return false
  }
}

/**
 * 删除指定时间之前的消息
 * @param {number} beforeTimestamp - 时间戳，删除此时间之前的消息
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteMessagesBefore = async (beforeTimestamp) => {
  try {
    const store = useAppStore()
    const userId = store.mode === 'sse' ? 'xuminhui' : store.userInfo.id
    
    const deletedCount = await db.messages
      .where('user_id').equals(userId)
      .and(msg => msg.timestamp < beforeTimestamp)
      .delete()
      
    console.log(`删除 ${new Date(beforeTimestamp).toLocaleString()} 之前的 ${deletedCount} 条消息`)
    return true
  } catch (error) {
    console.error('删除历史消息失败:', error)
    return false
  }
}

/**
 * 删除指定角色的消息
 * @param {'user'|'ai'} role - 消息角色
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteMessagesByRole = async (role) => {
  try {
    const store = useAppStore()
    const userId = store.mode === 'sse' ? 'xuminhui' : store.userInfo.id
    
    const deletedCount = await db.messages
      .where('user_id').equals(userId)
      .and(msg => msg.role === role)
      .delete()
      
    console.log(`删除角色为 ${role} 的 ${deletedCount} 条消息`)
    return true
  } catch (error) {
    console.error(`删除${role}消息失败:`, error)
    return false
  }
}

/**
 * 删除失败的消息（loading状态的消息）
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteFailedMessages = async () => {
  try {
    const store = useAppStore()
    const userId = store.mode === 'sse' ? 'xuminhui' : store.userInfo.id
    
    const deletedCount = await db.messages
      .where('user_id').equals(userId)
      .and(msg => msg.loading === true && msg.role === 'ai')
      .delete()
      
    console.log(`删除 ${deletedCount} 条失败的AI消息`)
    return true
  } catch (error) {
    console.error('删除失败消息出错:', error)
    return false
  }
}

/**
 * 智能清理：删除超过指定数量的旧消息，保留最新的消息
 * @param {number} keepCount - 要保留的消息数量
 * @returns {Promise<boolean>} 清理是否成功
 */
export const smartCleanup = async (keepCount = 100) => {
  try {
    const store = useAppStore()
    const userId = store.mode === 'sse' ? 'xuminhui' : store.userInfo.id
    const orderBy = store.mode === 'sse' ? 'id' : 'log_id'
    
    // 获取所有消息，按时间排序
    const allMessages = await db.messages
      .where('user_id').equals(userId)
      .orderBy('timestamp')
      .reverse()
      .toArray()
    
    if (allMessages.length <= keepCount) {
      console.log(`当前消息数量 ${allMessages.length}，无需清理`)
      return true
    }
    
    // 找出要删除的消息
    const messagesToDelete = allMessages.slice(keepCount)
    const idsToDelete = messagesToDelete.map(msg => msg.id)
    
    // 批量删除
    const deletedCount = await db.messages.bulkDelete(idsToDelete)
    console.log(`智能清理完成，删除了 ${deletedCount} 条旧消息，保留最新 ${keepCount} 条`)
    
    return true
  } catch (error) {
    console.error('智能清理失败:', error)
    return false
  }
}

// 导出所有删除函数
export {
  deleteMessageById,
  deleteMessageByLogId,
  deleteConversationPair,
  deleteMultipleConversations,
  deleteAllUserMessages,
  deleteMessagesBefore,
  deleteMessagesByRole,
  deleteFailedMessages,
  smartCleanup
} 