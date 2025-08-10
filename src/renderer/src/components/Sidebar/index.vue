<template>
  <div class="sidebar-container">
    <!-- 侧边栏头部，始终显示在固定位置 -->
    <div class="sidebar-header" v-if="!isCollapse">
      <div class="logo-wrapper">
        <div class="logo"></div>
        <div class="logo-text"></div>
      </div>
      <div class="toggle-icon" @click="$emit('toggle')"></div>
    </div>

    <!-- 自定义侧边栏菜单，悬浮时只显示这部分 -->
    <transition name="floating-menu" enter-active-class="floating-menu-enter-active"
      leave-active-class="floating-menu-leave-active" enter-from-class="floating-menu-enter-from"
      enter-to-class="floating-menu-enter-to" leave-from-class="floating-menu-leave-from"
      leave-to-class="floating-menu-leave-to">
      <div v-if="!isCollapse || isHovering" class="sidebar-menu" :class="{ 
          'floating-menu': isCollapse && isHovering,
          'normal-menu': !isCollapse
        }">
        <!-- 系统菜单 -->
        <div class="menu-section">
          <router-link v-for="item in menuConf.filter(item => !item.agent_id)" :key="item.id" :to="item.uri"
            class="menu-item" :class="{ active: activeMenu === item.uri, collapsed: isCollapse && !isHovering }">
            <i class="menu-icon"><el-icon>
                <component :is="item.icon" />
              </el-icon></i>
            <span v-if="!isCollapse || isHovering" class="menu-title">{{ menuName(item.uri) }}</span>
          </router-link>
        </div>
        <el-divider v-if="menuConfWithAgentPage.length > 0 || menuConfWithAgentIframe.length > 0" />
        <!-- 功能菜单 -->
        <div class="menu-section">
          <router-link v-for="item in menuConfWithAgentPage" :key="item.id" :to="item.uri" class="menu-item"
            :class="{ active: activeMenu === item.uri, collapsed: isCollapse && !isHovering }">
            <i class="menu-icon"><el-icon>
                <component :is="item.icon" />
              </el-icon></i>
            <span v-if="!isCollapse || isHovering" class="menu-title">{{ menuName(item.uri) }}</span>
          </router-link>
          <router-link v-for="item in menuConfWithAgentIframe" :key="item.id"
            :to="`/iframe?name=${item.name}&en_name=${item.en_name}&url=${encodeURIComponent(item.uri)}`"
            class="menu-item" :class="{ active: activeMenu.includes('/iframe'), collapsed: isCollapse && !isHovering }">
            <i class="menu-icon"><el-icon>
                <component :is="item.icon" />
              </el-icon></i>
            <span v-if="!isCollapse || isHovering" class="menu-title">{{ menuName(item.uri) }}</span>
          </router-link>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { Calendar } from '@element-plus/icons-vue'
const { locale, t } = useI18n()
const store = useAppStore()
const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  },
  isHovering: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])
const route = useRoute()
const menuConf = ref([])
const menuConfWithAgentPage = ref([])
const menuConfWithAgentIframe = ref([])

const activeMenu = computed(() => {
  return route.path
})

const updateMenuConf = (newMenuConf) => {
  menuConf.value = newMenuConf
  menuConfWithAgentPage.value = newMenuConf.filter(item => item.agent_id && item.uri.startsWith('/') && item.uri.split('/').length === 2)
  menuConfWithAgentIframe.value = newMenuConf.filter(item => item.agent_id && !(item.uri.startsWith('/') && item.uri.split('/').length === 2))
}

const menuName = (uri) => {
  return locale.value === 'zh-CN' ? menuConf.value.find(item => item.uri === uri)?.name : menuConf.value.find(item => item.uri === uri)?.en_name
}
// 监听 store 中 menuConf 的变化
watch(
  () => store.menuConf,
  (newMenuConf) => {
    if (newMenuConf && newMenuConf.length > 0) {
      updateMenuConf(newMenuConf)
    }
  },
  { immediate: true, deep: true }
)

onMounted(async () => {
  // 初始化时刷新菜单
  try {
    const menuConfData = await store.refreshMenu()
    updateMenuConf(menuConfData)
  } catch (error) {
    console.error('初始化菜单失败:', error)
  }
})
</script>

<style lang="stylus" scoped>
.sidebar-container
  width 100%
  height 100%
  position relative
  
  .sidebar-header
    height 60px
    display flex
    align-items center
    justify-content space-between
    transition all 0.3s ease
    background-color #F3F8FF
    
    .logo-wrapper
      display flex
      align-items center
      font-family: Source Han Sans CN;
      font-weight: 500;
      font-size: 18px;
      color: #333333
      margin-left 20px
      transition all 0.3s ease
      overflow hidden
      
      .logo
        width 24px
        height 25px
        background url('imgs/side-logo1.png') no-repeat center/cover
        margin-right 12px
        transition margin 0.3s ease
        flex-shrink 0
        
      .logo-text
        width 187px
        height 25px
        background url('imgs/title-en.png') no-repeat center/cover
        background-size 100% 100%
        margin-top 4px
    .toggle-icon
      width 18px
      height 17px
      background url('imgs/collapse.png') no-repeat center/cover
      margin-right: 13px
      transition all 0.3s ease
      
      &:hover
        cursor pointer
        filter brightness(1.1)
        transform scale(1.1)

  .sidebar-menu
    flex 1
    overflow-y auto
    padding 20px 14px
    background-color #F3F8FF
    
    &.normal-menu
      // 正常展开状态的菜单
      position relative
      top auto
      left auto
      right auto
      
    &.floating-menu
      position absolute
      top 60px
      left 20px
      right 20px
      padding 20px 14px
      background-color rgba(243, 248, 255, 0.95)
      backdrop-filter blur(10px)
      border-radius 8px
      box-shadow 4px 0 20px rgba(0, 0, 0, 0.15)
      z-index 900
      
    .menu-section
      margin-bottom 15px
      
      .section-title
        font-family: Source Han Sans CN
        font-weight: 600
        font-size: 12px
        color: #999999
        text-transform: uppercase
        letter-spacing: 0.5px
        margin-bottom 12px
        padding-left 16px
        transition all 0.3s ease

    .menu-item
      display flex
      align-items center
      padding 12px 16px
      text-decoration none
      margin-bottom 8px
      position relative
      // font-family: Source Han Sans CN;
      font-weight: 500;
      font-size: 16px;
      color: #333333
      border-radius 8px
      transition all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)
      
      &:hover
        color: #1C7AFB
        background-color rgba(28, 122, 251, 0.1)
        // transform translateX(4px) scale(1.02)

      &.active
        background-color #E1EEFF
        border-radius 8px
        color: #1C7AFB
        // box-shadow 0 4px 12px rgba(28, 122, 251, 0.2)

      &.collapsed
        justify-content center
        padding 10px 0
        margin-bottom 8px

      .menu-icon
        font-size 18px
        margin-right 12px
        display flex
        align-items center
        justify-content center
        transition all 0.3s ease
        min-width 22px

      .menu-title
        flex 1
        white-space nowrap
        overflow hidden
        text-overflow ellipsis
        transition all 0.3s ease
        opacity 1
        font-weight 600
        // 文字进入动画
        animation fadeSlideIn 0.3s ease-out
:deep(.el-divider--horizontal)
  margin 0
// Vue transition 动画类
.floating-menu-enter-active
  transition all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)

.floating-menu-leave-active
  transition all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)

.floating-menu-enter-from
  opacity 0
  transform translateX(-100%) scale(0.9)

.floating-menu-enter-to
  opacity 1
  transform translateX(0) scale(1)

.floating-menu-leave-from
  opacity 1
  transform translateX(0) scale(1)

.floating-menu-leave-to
  opacity 0
  transform translateX(-100%) scale(0.9)

// 悬浮菜单动画已移到 transition 中处理

// 文字进入动画
@keyframes fadeSlideIn
  from
    opacity 0
    transform translateX(-10px)
  to
    opacity 1
    transform translateX(0)

// 响应式优化
@media (max-width: 900px)
  .sidebar-container
    .sidebar-header
      .logo-wrapper
        margin-left 10px
        .logo
          zoom 0.8
          margin-right 6px
        .logo-text
          zoom 0.45
    .sidebar-menu
      &.floating-menu
        left 10px
        right 10px
        
      .menu-item
        font-size 14px
        padding 10px 12px
</style>
