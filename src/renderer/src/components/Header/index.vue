<template>
  <div class="header-container">
    <div class="header-left">
      <div v-if="isCollapse" class="toggle-icon" @click="toggleSidebar"></div>
      <div v-if="isCollapse" class="divider"></div>
      <span class="page-title">{{ pageTitle }}</span>
    </div>
    <div class="header-right">
      <!-- 语言切换器 -->
      <el-dropdown @command="handleLanguageChange" trigger="click">
        <span class="language-switcher">
          <el-icon class="language-icon">
            <Connection />
          </el-icon>
          <span class="language-text">{{ currentLanguageText }}</span>
          <el-icon class="arrow-icon">
            <ArrowDown />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              command="zh-CN"
              :class="{ 'is-active': locale === 'zh-CN' }"
            >
              <span class="language-option">
                <span class="flag">🇨🇳</span>
                <span>{{ $t('header.chinese') }}</span>
              </span>
            </el-dropdown-item>
            <el-dropdown-item
              command="en-US"
              :class="{ 'is-active': locale === 'en-US' }"
            >
              <span class="language-option">
                <span class="flag">🇺🇸</span>
                <span>{{ $t('header.english') }}</span>
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 用户菜单 -->
      <el-dropdown>
        <span class="user-info">
          <el-avatar size="small">
            <el-icon>
              <Avatar />
            </el-icon>
          </el-avatar>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="showUserInfo">{{
              $t('header.userInfo')
            }}</el-dropdown-item>
            <el-dropdown-item @click="showChatHistory">{{
              $t('header.chatHistory')
            }}</el-dropdown-item>
            <!-- <el-dropdown-item>修改密码</el-dropdown-item> -->
            <el-dropdown-item divided @click="logout">{{
              $t('header.logout')
            }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
  <!-- 个人信息弹框 -->
  <el-dialog
    :title="$t('header.userInfo')"
    v-model="userInfoDialogVisible"
    width="400px"
    center
  >
    <div class="user-info-content">
      <div class="info-item">
        <span class="info-label">{{ $t('register.username') }}：</span>
        <span class="info-value">{{ store.userInfo.name }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ $t('register.userId') }}：</span>
        <span class="info-value">{{ store.userInfo.id }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ $t('credential.email') }}：</span>
        <span class="info-value">{{ store.userInfo.email }}</span>
      </div>
    </div>
  </el-dialog>

  <!-- 对话历史弹框 -->
  <ChatHistory v-model:visible="chatHistoryDialogVisible" />
</template>

<script setup>
import ChatHistory from '@/components/ChatHistory/index.vue'
import { setLocale } from '@/locales'

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useAppStore()

// 当前语言显示文本
const currentLanguageText = computed(() => {
  return locale.value === 'zh-CN' ? t('header.chinese') : t('header.english')
})

// 处理语言切换
const handleLanguageChange = (command) => {
  if (command !== locale.value) {
    setLocale(command)
  }
}

const pageTitle = computed(() => {
  // 使用国际化的页面标题
  if (route.meta.titleKey) {
    if (route.meta.titleKey === 'menu.iframe') {
      return locale.value === 'zh-CN' ? route.query.name : route.query.en_name
    }
    return t(route.meta.titleKey)
  }
  return route.meta.title || ''
})
// 个人信息弹框显示状态
const userInfoDialogVisible = ref(false)
// 对话历史弹框显示状态
const chatHistoryDialogVisible = ref(false)

// 接收父组件传递的props
const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
})

// 定义要向父组件发出的事件
const emit = defineEmits(['toggle'])

// 显示用户信息弹框
const showUserInfo = () => {
  userInfoDialogVisible.value = true
}

// 显示对话历史弹框
const showChatHistory = () => {
  chatHistoryDialogVisible.value = true
}

// 切换侧边栏收起/展开
const toggleSidebar = () => {
  emit('toggle')
}

// 退出登录方法
const logout = () => {
  store.reset()
  // 清除用户信息或token
  ls.remove(ACCESS_TOKEN)
  // 跳转到登录页
  router.push('/login')
}
</script>

<style lang="stylus" scoped>
.header-container
  width 100%
  height 100%
  background-color #fff
  display flex
  align-items center
  justify-content space-between
  padding 0 20px
  box-sizing: border-box
.header-left
  display flex
  align-items center
.toggle-icon
  width 18px
  height 17px
  background url('imgs/collapse.png') no-repeat center/cover
.divider
  width: 1px;
  height: 14px;
  background: #D0D3D9;
  border-radius: 1px;
  margin 0 13px
.page-title
  font-family: Source Han Sans CN;
  font-weight: 600;
  font-size: 20px;
  color: #333333
.toggle-icon:hover
  cursor pointer
  filter brightness(1.1)

.header-right
  display flex
  align-items center
  gap 16px

.user-info
  display flex
  align-items center
  cursor pointer

.username
  margin-left 10px

// 个人信息弹框样式
.user-info-content
  padding 10px

.info-item
  margin-bottom 15px
  display flex
  align-items center

.info-label
  font-weight bold
  width 85px
  display inline-block

.info-value
  color #666
.language-switcher
  display flex
  align-items center
  cursor pointer
  padding 8px 12px
  border-radius 6px
  transition all 0.3s ease
  color #606266

  &:hover
    background-color #f5f7fa
    color #409eff

.language-icon
  margin-right 6px
  font-size 16px

.language-text
  margin-right 4px
  font-size 14px
  font-weight 500

.arrow-icon
  font-size 12px
  transition transform 0.3s ease

.language-option
  display flex
  align-items center
  gap 8px

.flag
  font-size 16px

.is-active
  color #409eff
  background-color #ecf5ff

  .language-option
    font-weight 600
</style>