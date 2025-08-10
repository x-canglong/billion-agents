// src/utils/db.js
import Dexie from 'dexie'

// 创建数据库
const db = new Dexie('pybot')

// 定义基础字段
const baseFields = [
  '++id',
  '*key',
  '*user_id',
  '*log_id',
  '*role',
  'placement',
  'content',
  'reasoning_content',
  'reasoning_status',
  'files',
  'loading',
  'shape',
  'variant',
  'isMarkdown',
  'typing',
  'isFog',
  'avatar',
  'avatarSize',
  'avatarGap',
  'timestamp'
];

// 版本1的字段
db.version(1).stores({
  messages: baseFields.join()
});

// 版本2的字段 - 添加agent_name
const v2Fields = [...baseFields, 'agent_name'];
db.version(2).stores({
  messages: v2Fields.join()
});

// 版本3的字段 - 添加unread
const v3Fields = [...baseFields, 'agent_name', 'unread'];
db.version(3).stores({
  messages: v3Fields.join()
});

// 版本4的字段 - 添加quote_message, status
const v4Fields = [...baseFields, 'agent_name', 'unread', 'quote_message', 'status'];
db.version(4).stores({
  messages: v4Fields.join()
});

// 版本5的字段 - 添加ref_log_id, ref_log_str
const v5Fields = [...baseFields, 'agent_name', 'unread', 'quote_message', 'status', 'ref_log_id', 'ref_log_str'];
db.version(5).stores({
  messages: v5Fields.join()
});

// 版本6的字段 - 去掉quote_message，引用统一使用ref_log_id, ref_log_str
const v6Fields = [...baseFields, 'agent_name', 'unread', 'status', 'ref_log_id', 'ref_log_str'];
db.version(6).stores({
  messages: v6Fields.join()
});

export default db
