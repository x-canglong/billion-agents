<template>
  <el-container class="layout-container">
    <div class="sidebar-wrapper" :class="{ 'collapsed': isCollapse }">
      <div 
        v-if="isCollapse" 
        class="hover-trigger-area" 
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      ></div>
      
      <el-aside 
        :width="isCollapse ? '0' : '15.8854vw'" 
        class="layout-aside"
        :class="{ 
          'floating': isCollapse && isHovering,
          'collapsed': isCollapse && !isHovering 
        }"
        @mouseenter="handleSidebarEnter"
        @mouseleave="handleSidebarLeave"
      >
        <Sidebar :is-collapse="isCollapse" :is-hovering="isHovering" @toggle="toggleSidebar" />
      </el-aside>
    </div>

    <el-container class="main-container">
      <el-header class="layout-header">
        <Header :is-collapse="isCollapse" @toggle="toggleSidebar" />
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
const store = useAppStore()
// 侧边栏收起状态
const isCollapse = ref(false)
isCollapse.value = ls.get(SIDEBAR_COLLAPSED)
store.setSidebarCollapse(isCollapse.value)

// 鼠标悬停状态
const isHovering = ref(false)
// 悬停延迟定时器
let hoverTimer = null
let leaveTimer = null

// 切换侧边栏收起/展开
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
  store.setSidebarCollapse(isCollapse.value)
  // 保存状态到本地存储
  ls.set(SIDEBAR_COLLAPSED, isCollapse.value.toString())
  // 清除悬停状态
  isHovering.value = false
  clearTimers()
}

// 清除定时器
const clearTimers = () => {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

// 鼠标进入触发区域
const handleMouseEnter = () => {
  if (!isCollapse.value) return
  
  clearTimers()
  // 短暂延迟后显示侧边栏，避免误触
  hoverTimer = setTimeout(() => {
    isHovering.value = true
  }, 100)
}

// 鼠标离开触发区域
const handleMouseLeave = () => {
  clearTimers()
  // 延迟隐藏，给用户时间移动到侧边栏
  leaveTimer = setTimeout(() => {
    isHovering.value = false
  }, 200)
}

// 鼠标进入侧边栏
const handleSidebarEnter = () => {
  if (!isCollapse.value) return
  clearTimers()
  isHovering.value = true
}

// 鼠标离开侧边栏
const handleSidebarLeave = () => {
  if (!isCollapse.value) return
  clearTimers()
  // 立即隐藏侧边栏
  leaveTimer = setTimeout(() => {
    isHovering.value = false
  }, 150)
}

// 组件卸载时清理定时器
onUnmounted(() => {
  clearTimers()
})
</script>

<style lang="stylus" scoped>
.layout-container
  height 100vh
  width 100vw
.sidebar-wrapper
  position relative
  height 100%
  
  &.collapsed
    width 0
    overflow visible
    
    // 悬停触发区域
    .hover-trigger-area
      position absolute
      top 0
      left 0
      width 100px
      height 100%
      z-index 1000
      background transparent
      cursor pointer
      
      // 添加一个细线提示
      &::after
        content ''
        position absolute
        top 50%
        left 4px
        width 3px
        height 80px
        background rgba(28, 122, 251, 0.4)
        border-radius 2px
        transform translateY(-50%)
        opacity 0
        transition opacity 0.3s ease
      
      &:hover::after
        opacity 1

.layout-aside
  background-color #F3F8FF
  color #333
  transition all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)
  overflow hidden
  box-shadow 0 1px 4px rgba(0, 21, 41, 0.08)
  display flex
  flex-direction column
  height 100%
  min-width 160px
  &.collapsed
    opacity 0
    transform translateX(-100%)
    pointer-events none
    
  &.floating
    position absolute
    width 260px !important
    z-index 999
    opacity 1
    transform translateX(0)
    pointer-events auto
    background-color transparent
    box-shadow none

// 不再需要这个动画，因为菜单自己处理动画
// @keyframes slideInFromLeft

.main-container
  flex 1
  transition all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)

.layout-header
  height 60px
  background #fff
  z-index 1000
  position relative
  
.layout-main
  background #fff
  overflow hidden
  padding-top 0
</style> 