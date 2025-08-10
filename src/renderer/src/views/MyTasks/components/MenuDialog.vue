<template>
  <el-dialog v-model="visible" title="菜单配置" width="600px">
    <el-form :model="menuForm" label-width="120px" ref="menuFormRef">
      <el-form-item label="Uri" prop="uri" :rules="[{ required: true, message: '请输入Uri地址' }]">
        <el-select 
          v-model="menuForm.uri" 
          placeholder="请选择已有菜单或输入新Uri"
          filterable
          allow-create
          default-first-option
          @change="handleUriChange"
          style="width: 100%;"
        >
          <el-option
            v-for="menu in menuList"
            :key="menu.id"
            :label="`${menu.name} (${menu.uri})`"
            :value="menu.uri"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="中文名称" prop="name" :rules="[{ required: true, message: '请输入菜单中文名称' }]">
        <el-input 
          v-model="menuForm.name" 
          placeholder="请输入菜单中文名称" 
          :disabled="isExistingMenu"
        />
      </el-form-item>
      
      <el-form-item label="英文名称" prop="en_name" :rules="[{ required: true, message: '请输入菜单英文名称' }]">
        <el-input 
          v-model="menuForm.en_name" 
          placeholder="请输入菜单英文名称" 
          :disabled="isExistingMenu"
        />
      </el-form-item>
      
      <el-form-item label="Icon" prop="icon" :rules="[{ required: true, message: '请选择图标' }]">
        <div style="display: flex; align-items: center; width: 100%;">
          <el-select-v2 
            v-model="menuForm.icon" 
            placeholder="请选择图标" 
            :options="iconOptions"
            filterable
            style="flex: 1;"
            :disabled="isExistingMenu"
          >
            <template #default="{ item }">
              <div style="display: flex; align-items: center;">
                <el-icon style="margin-right: 8px;"><component :is="item.value" /></el-icon>
                <span>{{ item.label }}</span>
              </div>
            </template>
          </el-select-v2>
          <el-button 
            type="primary"
            text
            @click="smartRecommendIcon"
            style="margin-left: 10px; white-space: nowrap;"
            :disabled="!menuForm.name || !menuForm.name.trim() || isExistingMenu"
            :icon="MagicStick"
          >
            智能推荐
          </el-button>
        </div>
      </el-form-item>
      <!-- <el-form-item label="Web Version">
        <el-input v-model="menuForm.webVersion" placeholder="请输入Web版本（可选）" />
      </el-form-item> -->
      <el-form-item label="Mobile Version">
        <el-input 
          v-model="menuForm.mobileVersion" 
          placeholder="请输入移动版本（可选）" 
          :disabled="isExistingMenu"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="saveMenuConfig">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { MagicStick } from '@element-plus/icons-vue'
const store = useAppStore()
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  menuForm: {
    type: Object,
    required: true
  },
  iconOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'update:visible',
  'close',
  'save'
])

const menuFormRef = ref(null)

// 判断是否为已存在的菜单
const isExistingMenu = computed(() => {
  return menuList.value.some(menu => menu.uri === props.menuForm.uri)
})

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleClose = () => {
  emit('close')
}

const saveMenuConfig = () => {
  emit('save')
}

// Uri选择变化处理
const handleUriChange = (selectedUri) => {
  const existingMenu = menuList.value.find(menu => menu.uri === selectedUri)
  
  if (existingMenu) {
    // 选择了已存在的菜单，自动填充所有字段
    props.menuForm.id = existingMenu.id
    props.menuForm.name = existingMenu.name
    props.menuForm.en_name = existingMenu.en_name
    props.menuForm.icon = existingMenu.icon
    props.menuForm.mobileVersion = existingMenu.mobileVersion || ''
  } else {
    // 新建菜单，清空其他字段
    props.menuForm.id = null
    props.menuForm.name = ''
    props.menuForm.en_name = ''
    props.menuForm.icon = ''
    props.menuForm.mobileVersion = ''
  }
}

const menuList = computed(()=> store.menuConf.filter(item=> item.agent_id))
/**
 * 智能推荐图标
 * 使用AI根据菜单名称智能推荐最合适的图标
 */
const smartRecommendIcon = async () => {
  const menuName = props.menuForm.name?.trim()
  if (!menuName || !props.iconOptions.length) return

  // 显示加载状态
  const loading = ElLoading.service({
    text: '正在智能推荐图标...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 构建可用图标列表
    const availableIcons = props.iconOptions.map(icon => icon.value || icon.label).join(', ')
    
    // 构建AI提示词
    const prompt = `请根据菜单名称"${menuName}"，从以下图标列表中选择1个最合适的图标：

可用图标列表：
${availableIcons}

要求：
1. 只返回图标名称，不要任何其他文字
2. 选择与菜单功能最匹配的图标
3. 如果没有完全匹配的，选择语义最相近的
4. 只返回一个图标名称`

    // 调用AI推荐
    const recommendedIcon = await chatStreamComplete(prompt, {
      systemPrompt: '你是一个UI设计专家，擅长为不同功能的菜单选择合适的图标。请根据用户的菜单名称，从给定的图标列表中选择最合适的图标。',
      temperature: 0.3, // 低温度确保结果稳定
      maxTokens: 50,    // 限制输出长度
      enableThinking: false
    })

    // 清理AI返回的结果（去除可能的额外文字）
    const cleanedIcon = recommendedIcon?.trim()
      .replace(/[。，、；：""''（）【】《》]/g, '') // 去除中文标点
      .replace(/[.,;:"'()\[\]<>]/g, '')        // 去除英文标点
      .replace(/^图标[：:]\s*/, '')             // 去除"图标："前缀
      .replace(/\s+/g, '')                     // 去除空格
      .split(/[^a-zA-Z0-9]/)[0]               // 取第一个单词

    // 在可用图标中查找匹配的图标
    const foundIcon = props.iconOptions.find(option => {
      const iconValue = option.value || option.label
      return iconValue === cleanedIcon || 
             iconValue?.toLowerCase() === cleanedIcon?.toLowerCase() ||
             option.label?.includes(cleanedIcon) ||
             option.value?.includes(cleanedIcon)
    })

    if (foundIcon) {
      props.menuForm.icon = foundIcon.value
      ElMessage.success(`AI为"${menuName}"推荐图标: ${foundIcon.label || foundIcon.value}`)
    } else {
      // 如果AI推荐的图标不在列表中，使用备选方案
      console.warn(`AI推荐的图标"${cleanedIcon}"不在可用列表中`)
      
      // 使用简单的关键词匹配作为备选
      const fallbackIcon = findFallbackIcon(menuName)
      if (fallbackIcon) {
        props.menuForm.icon = fallbackIcon.value
        ElMessage.warning(`AI推荐失败，为"${menuName}"推荐备选图标: ${fallbackIcon.label || fallbackIcon.value}`)
      } else {
        ElMessage.error('智能推荐失败，请手动选择图标')
      }
    }

  } catch (error) {
    console.error('智能推荐图标失败:', error)
    
    // AI请求失败时的备选方案
    const fallbackIcon = findFallbackIcon(menuName)
    if (fallbackIcon) {
      props.menuForm.icon = fallbackIcon.value
      ElMessage.warning(`AI服务暂时不可用，为"${menuName}"推荐备选图标: ${fallbackIcon.label || fallbackIcon.value}`)
    } else {
      ElMessage.error('智能推荐失败，请手动选择图标')
    }
  } finally {
    loading.close()
  }
}

/**
 * 备选图标推荐（简单关键词匹配）
 */
const findFallbackIcon = (menuName) => {
  const keywords = {
    '用户': ['User', 'Avatar', 'UserFilled'],
    '设置': ['Setting', 'Tools', 'Operation'],
    '管理': ['Management', 'Setting', 'Tools'],
    '文档': ['Document', 'Files', 'Folder'],
    '消息': ['Message', 'ChatDotRound', 'Bell'],
    '数据': ['DataAnalysis', 'PieChart', 'DataLine'],
    '文件': ['Document', 'Files', 'Folder'],
    '任务': ['List', 'Checked', 'Document'],
    '帮助': ['QuestionFilled', 'InfoFilled'],
    '搜索': ['Search', 'ZoomIn', 'View']
  }

  for (const [keyword, iconNames] of Object.entries(keywords)) {
    if (menuName.includes(keyword)) {
      for (const iconName of iconNames) {
        const found = props.iconOptions.find(option => 
          option.value === iconName || 
          option.value?.toLowerCase() === iconName.toLowerCase()
        )
        if (found) return found
      }
    }
  }

  // 如果都没找到，返回第一个可用图标
  return props.iconOptions[0] || null
}

// 暴露表单ref给父组件
defineExpose({
  menuFormRef
})
</script>

<style lang="stylus" scoped>
// 组件特有样式可以在这里添加
</style> 