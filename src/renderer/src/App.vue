<template>
    <el-config-provider :locale="elementLocale">
      <router-view />
    </el-config-provider>
</template>
<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import enUs from 'element-plus/es/locale/lang/en'

const store = useAppStore()
const { locale } = useI18n()

// 根据当前语言设置 Element Plus 的语言包
const elementLocale = computed(() => {
  return locale.value === 'zh-CN' ? zhCn : enUs
})

const info = ls.get(USER_INFO)
if (info) {
  store.setUserInfo(info)
}
</script>

<style lang="stylus" scoped>
</style>
