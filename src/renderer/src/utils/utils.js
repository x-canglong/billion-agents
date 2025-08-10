import { Base64 } from 'js-base64';
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import weekday from 'dayjs/plugin/weekday'
dayjs.extend(weekday)
dayjs.locale('zh-cn')

/**
 * 获取URL中的参数
 * @param name
 * @returns {*}
 */
export function getUrlParam(name) {
  const reg = new RegExp(name + '=([^&]*)(&|$)')
  const searchResult = window.location.search.match(reg)
  const hashResult = window.location.hash.match(reg)
  if (searchResult) {
    return decodeURI(searchResult[1])
  } else if (hashResult) {
    return decodeURI(hashResult[1])
  }
  return null
}

/**
 * 获取token
 */
export function getToken() {
  return ls.get(ACCESS_TOKEN)
}

/**
 * 展平树形数据
 */
export function flattenTreeData(treeData) {
  const flatData = []

  const flatten = (nodes) => {
    nodes.forEach((node) => {
      const { children, ...rest } = node // 剥离 children 属性
      flatData.push(rest) // 将节点添加到平级数据中

      if (children && children.length > 0) {
        flatten(children) // 递归处理子节点
      }
    })
  }

  flatten(treeData) // 调用递归展开树形数据

  return flatData
}

/**
 * 当前浏览器是否支持indexedDB
 */
export const hasIndexedDB = 'indexedDB' in window

/**
 * 生成UUID
 */
export function generateUUID() {
  return '91xxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 构造消息
 */
export function constructMessage(is_end = false, role = 'ai', content = '') {
  const uuid = generateUUID()
  const user_id =
    import.meta.env.VITE_STREAM_TYPE === 'ws'
      ? ls.get(USER_INFO).id
      : 'xuminhui'
  const placement = role === 'ai' ? 'start' : 'end'
  const loading = role === 'ai' && is_end
  const shape = 'corner'
  const variant = role === 'ai' ? 'filled' : 'outlined'
  const isMarkdown = role === 'ai'
  const typing = is_end
  return {
    key: uuid,
    user_id,
    log_id: uuid,
    role,
    placement,
    content,
    reasoning_content: '',
    reasoning_status: 'start',
    files: [],
    ref_log_id: null,
    ref_log_str: null,
    status: 'success',
    agent_name: '',
    loading,
    shape,
    variant,
    isMarkdown,
    typing,
    isFog: role === 'ai',
    unread: role === 'ai',
    avatarSize: '0', // Set to 0 to hide avatar
    avatarGap: '0', // Set gap to 0 as well
    timestamp: Date.now()
  }
}

/**
 * 清理和标准化数学公式内容
 * @param {string} formula - 原始公式字符串
 * @returns {string} - 清理后的公式字符串
 */
function cleanMathFormula(formula) {
  if (!formula) return formula

  // 移除公式前后的多余空白
  let cleaned = formula.trim()

  // 处理双反斜杠的LaTeX命令（如DeepSeek V3模型返回的格式）
  cleaned = cleaned.replace(/\\\\/g, '\\')

  // 处理一些常见的转义字符问题
  cleaned = cleaned.replace(/\\{/g, '{')
  cleaned = cleaned.replace(/\\}/g, '}')

  // 标准化一些常见的数学符号
  const symbolMap = {
    '×': '\\times',
    '÷': '\\div',
    '≤': '\\leq',
    '≥': '\\geq',
    '≠': '\\neq',
    '±': '\\pm',
    '∞': '\\infty',
    '∑': '\\sum',
    '∏': '\\prod',
    '∫': '\\int',
    '√': '\\sqrt',
    α: '\\alpha',
    β: '\\beta',
    γ: '\\gamma',
    δ: '\\delta',
    ε: '\\epsilon',
    θ: '\\theta',
    λ: '\\lambda',
    μ: '\\mu',
    π: '\\pi',
    σ: '\\sigma',
    φ: '\\phi',
    ω: '\\omega'
  }

  // 应用符号映射
  Object.entries(symbolMap).forEach(([unicode, latex]) => {
    cleaned = cleaned.replace(new RegExp(unicode, 'g'), latex)
  })

  return cleaned
}

/**
 * 检查字符串是否包含LaTeX数学内容
 * @param {string} content - 要检查的内容
 * @returns {boolean} - 是否包含数学内容
 */
function isLaTeXMathContent(content) {
  if (!content) return false

  // LaTeX数学命令特征
  const mathPatterns = [
    /\\[a-zA-Z]+/, // LaTeX命令
    /\{.*?\}/, // 花括号
    /[=+\-*/^_]/, // 数学运算符
    /\d/, // 数字
    /\\frac|\\sum|\\int|\\prod|\\sqrt|\\alpha|\\beta|\\gamma|\\delta|\\pi|\\theta|\\mathbf|\\mathrm/ // 常见数学命令
  ]

  // 至少匹配一个数学特征
  return mathPatterns.some((pattern) => pattern.test(content))
}

/**
 * 处理公式 - 支持多种AI模型的公式格式
 * 支持的格式：
 * - LaTeX: \( \), \[ \], $...$, $$...$$
 * - 行内公式: $formula$
 * - 块级公式: $$formula$$, \[formula\]
 * - 换行公式: \n$...$\n, \n$$...$$\n
 */
export function processFormulas(text) {
  if (!text || typeof text !== 'string') {
    return text
  }

  // 预处理：处理代码块，避免公式处理影响代码内容
  const codeBlocks = []
  const codeBlockRegex = /```[\s\S]*?```/g
  let codeBlockMatch
  let processedText = text

  // 提取代码块，用占位符替换
  while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(codeBlockMatch[0])
    processedText = processedText.replace(codeBlockMatch[0], placeholder)
  }

  // 处理各种公式格式的规则集合（按优先级顺序排列）
  const formulaRules = [
    // 最高优先级：完整的双反斜杠格式
    {
      pattern: /\\\\\\?\\\[([\s\S]*?)\\\\\\?\\\]/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$$${cleanMathFormula(formula)}$$`
          : match
      }
    },

    {
      pattern: /\\\\\\?\\\(([\s\S]*?)\\\\\\?\\\)/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$${cleanMathFormula(formula)}$`
          : match
      }
    },

    // 中等优先级：标准LaTeX格式
    {
      pattern: /(?<!\\)\\?\\\[([\s\S]*?)(?<!\\)\\?\\\]/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$$${cleanMathFormula(formula)}$$`
          : match
      }
    },

    {
      pattern: /(?<!\\)\\?\\\(([\s\S]*?)(?<!\\)\\?\\\)/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$${cleanMathFormula(formula)}$`
          : match
      }
    },

    // 较低优先级：不完整的双反斜杠格式（更严格的验证）
    {
      pattern: /\\\\\\?\\\[([\s\S]*?)\]/g,
      replacement: (match, formula) => {
        // 需要更强的数学内容特征才处理
        const hasStrongMathFeatures =
          /\\[a-zA-Z]+|\\frac|\\sum|\\int|\\mathbf/.test(formula)
        return hasStrongMathFeatures && isLaTeXMathContent(formula)
          ? `$$${cleanMathFormula(formula)}$$`
          : match
      }
    },

    {
      pattern: /\\\\\\?\\\(([\s\S]*?)\)/g,
      replacement: (match, formula) => {
        // 需要更强的数学内容特征才处理
        const hasStrongMathFeatures =
          /\\[a-zA-Z]+|\\frac|\\sum|\\int|\\mathbf/.test(formula)
        return hasStrongMathFeatures && isLaTeXMathContent(formula)
          ? `$${cleanMathFormula(formula)}$`
          : match
      }
    },

    // 处理独立行的$公式$ -> 转为块级公式
    {
      pattern: /^\s*\$([^$\n]+)\$\s*$/gm,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$$${cleanMathFormula(formula)}$$`
          : match
      }
    },

    // 处理换行包围的$$公式$$
    {
      pattern: /\n\s*\$\$\s*\n([\s\S]*?)\n\s*\$\$\s*\n/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `\n$$${cleanMathFormula(formula)}$$\n`
          : match
      }
    },

    // 处理换行包围的$公式$
    {
      pattern: /\n\s*\$\s+([\s\S]*?)\s+\$\s*\n/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `\n$$${cleanMathFormula(formula)}$$\n`
          : match
      }
    },

    // 处理行首的$ 公式 $形式
    {
      pattern: /^\$\s+([\s\S]*?)\s+\$$/gm,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `$$${cleanMathFormula(formula)}$$`
          : match
      }
    },

    // 处理多行公式块（换行开始和结束的$）
    {
      pattern: /\n\$\s*\n([\s\S]*?)\n\s*\$\n/g,
      replacement: (match, formula) => {
        return isLaTeXMathContent(formula)
          ? `\n$$${cleanMathFormula(formula)}$$\n`
          : match
      }
    }
  ]

  // 依次应用所有规则
  formulaRules.forEach((rule) => {
    processedText = processedText.replace(rule.pattern, rule.replacement)
  })

  // 最后处理一些边缘情况
  // 清理多余的连续$$符号
  processedText = processedText.replace(/\$\$\$\$/g, '$$')

  // 确保块级公式前后有换行
  processedText = processedText.replace(/([^\n])\$\$([^$])/g, '$1\n$$\n$2')
  processedText = processedText.replace(/([^$])\$\$([^\n])/g, '$1\n$$\n$2')

  // 清理多余的空行
  processedText = processedText.replace(/\n\s*\n\s*\$\$/g, '\n\n$$')
  processedText = processedText.replace(/\$\$\s*\n\s*\n/g, '$$\n\n')

  // 恢复代码块
  codeBlocks.forEach((block, index) => {
    const placeholder = `__CODE_BLOCK_${index}__`
    processedText = processedText.replace(placeholder, block)
  })

  return processedText
}

/**
 * 基础URL
 */
export const BASE_URL =
  // 开发环境下使用空字符串，让请求走vite代理
  import.meta.env.DEV
    ? ''
    : location.origin.includes('web')
      ? location.origin.replace('web', 'ai')
      : import.meta.env.VITE_APP_BASE_URL

/**
 * 获取文件URL
 */
export const getFileUrl = (url) => {
  if (import.meta.env.DEV && url && url.includes('http://ai.paiday.cn:8886')) {
    return url.replace(
      'http://ai.paiday.cn:8886',
      import.meta.env.VITE_APP_BASE_URL
    )
  }
  return url
}

export function formatTimeRelative(timestamp) {
  if (!timestamp || !_.isNumber(timestamp)) return ''

  // 判断是否是秒级时间戳（10位），转为毫秒（13位）
  const isSecondTimestamp = timestamp.toString().length === 10
  const time = dayjs(isSecondTimestamp ? timestamp * 1000 : timestamp)
  const now = dayjs()

  // 判断是否为当天
  if (time.isSame(now, 'day')) {
    return time.format('HH:mm')
  }

  const diffInDays = now.diff(time, 'day')

  // 判断是否为昨天
  if (diffInDays === 1) {
    return `昨天 ${time.format('HH:mm')}`
  }

  // 判断是否为前天
  if (diffInDays === 2) {
    return `前天 ${time.format('HH:mm')}`
  }

  // 判断是否为本周内（大于前天但在本周内）
  if (time.isSame(now, 'week')) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[time.day()]
    return `${weekday} ${time.format('HH:mm')}`
  }

  // 判断是否为当年
  if (time.isSame(now, 'year')) {
    return time.format('M/D HH:mm')
  }

  // 往年
  return time.format('YYYY/M/D HH:mm')
}

/**
 * 预览文件
 * @param {Object} file - 当前文件
 * @param {Array} files - 所有文件
 */
export function previewFile(file, files) {
  // 判断是否为图片
  const url = file.url;
  if (!url) return;
  const basePreviewUrl = import.meta.env.DEV ? 'http://115.190.106.118:8002' : BASE_URL + '/kkfileview'
  const name = file.name || file.filename || file.url.split('/').pop()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const isImage = imageExtensions.some(
    (ext) =>
      name.toLowerCase().endsWith(ext) ||
      (file.imgFile && file.imgFile.type.startsWith('image/'))
  )
  // 非图片文件：使用单文件预览地址
  if (!isImage) {
    return `${basePreviewUrl}/onlinePreview?url=${encodeURIComponent(Base64.encode(getFileUrl(url)))}`;
  }

  // 图片文件：处理files数组并使用多图片预览地址
  const imageFiles = files.filter(item => {
    const itemName = item.name || item.filename || item.url.split('/').pop()
    return item.url && imageExtensions.some(
      (ext) =>
        itemName.toLowerCase().endsWith(ext) ||
        (item.imgFile && item.imgFile.type.startsWith('image/'))
    )
  });

  const currentIndex = imageFiles.findIndex(item => item.url === file.url);
  if (currentIndex === -1) {
    console.error('当前文件不在过滤后的图片列表中');
    return;
  }

  const rearrangedFiles = [
    ...imageFiles.slice(currentIndex),
    ...imageFiles.slice(0, currentIndex)
  ];

  const fileUrls = rearrangedFiles.map(item => getFileUrl(item.url)).join('|');
  return `${basePreviewUrl}/picturesPreview?urls=${encodeURIComponent(Base64.encode(fileUrls))}`
};