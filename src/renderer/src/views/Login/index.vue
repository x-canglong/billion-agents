<template>
  <LoginWrapper>
    <div class="login-box">
      <div class="login-title">{{ $t('login.title') }}</div>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        label-position="top"
        label-width="0px"
        style="width: 394px"
      >
        <el-form-item prop="user_id" :label="$t('login.userId')">
          <el-input
            v-model.trim="loginForm.user_id"
            :placeholder="$t('login.userIdPlaceholder')"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password" :label="$t('login.password')">
          <el-input
            v-model.trim="loginForm.password"
            :placeholder="$t('login.passwordPlaceholder')"
            :prefix-icon="Lock"
            :type="passwordVisible ? 'text' : 'password'"
            clearable
            show-password
          />
        </el-form-item>

        <div class="remember-box">
          <el-checkbox v-model="rememberMe">{{ $t('login.rememberMe') }}</el-checkbox>
          <!-- <a href="javascript:;" class="forgot-link">{{ $t('login.forgotPassword') }}</a> -->
        </div>

        <el-button
          type="primary"
          class="login-button"
          :loading="loading"
          @click="handleLogin"
        >
          {{ $t('login.loginButton') }}
        </el-button>
        <div class="register-link">
          {{ $t('login.registerLink') }}<router-link to="/register">{{ $t('login.registerNow') }}</router-link>
        </div>
      </el-form>
    </div>
  </LoginWrapper>
</template>

<script setup>
import { User, Lock } from '@element-plus/icons-vue'
const { t } = useI18n()

const store = useAppStore()
const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)
const passwordVisible = ref(false)
const rememberMe = ref(false)

const loginForm = reactive({
  user_id: '',
  password: ''
})

const loginRules = computed(() => ({
  user_id: [
    { required: true, message: t('login.userIdRequired'), trigger: 'blur' },
    { min: 4, max: 20, message: t('login.userIdLength'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('login.passwordRequired'), trigger: 'blur' },
    { min: 6, max: 20, message: t('login.passwordLength'), trigger: 'blur' }
  ]
}))

// 处理登录逻辑
const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      loading.value = true

      // 调用登录接口
      const res = await doLogin({
        username: loginForm.user_id,
        password: loginForm.password
      })

      // 登录成功处理
      if (res.status === 200) {
        console.log('res', res)
        // 设置token的过期时间
        const expires = rememberMe.value ? 7 : 1 // 记住我选中时保存7天，否则1天

        // 保存token，设置过期时间
        ls.set(ACCESS_TOKEN, res.data.access_token, { expires: expires })
        ls.set(REFRESH_TOKEN, res.data.refresh_token, { expires: expires })
        // 如果记住我被选中，保存用户名和密码到localStorage
        if (rememberMe.value) {
          ls.set(
            ACCOUNT_INFO,
            btoa(
              JSON.stringify({
                user_id: loginForm.user_id,
                password: loginForm.password
              })
            )
          )
        } else {
          ls.remove(ACCOUNT_INFO)
        }
        store.setUserInfo((await getUserInfo()).data)
        ls.set(USER_INFO, JSON.stringify(store.userInfo))
        ElMessage.success(t('login.loginSuccess'))
        initSocket()
        // 跳转到首页
        router.push('/')
      }
    } catch (error) {
      ElMessage.error(error?.data?.message || t('login.loginFailed'))
    } finally {
      loading.value = false
    }
  })
}

// 页面加载时检查是否有记住的用户信息
onMounted(() => {
  ls.set(SIDEBAR_COLLAPSED, true)
  // 从本地存储获取账户信息
  const accountInfo = ls.get(ACCOUNT_INFO)
  if (accountInfo) {
    try {
      // 解码并解析存储的账户信息
      const decodedInfo = atob(accountInfo)
      const { user_id, password } = JSON.parse(decodedInfo)
      // 如果用户名和密码都存在，则自动填充表单
      if (user_id && password) {
        loginForm.user_id = user_id
        loginForm.password = password
        rememberMe.value = true
      }
    } catch (error) {
      console.error('解析存储的账户信息失败:', error)
      // 清除可能损坏的数据
      ls.remove(ACCOUNT_INFO)
    }
  }
})
</script>

<style lang="stylus">
.login-box
  width 100%
  height 100%
  display flex
  flex-direction column
  align-items center
  .login-title
    font-family: Source Han Sans CN;
    font-weight: 500;
    font-size: 27px;
    color: #1C415E
    margin 35px 0
  .el-input__inner
    background-color: transparent !important
    border: none !important
    color: inherit !important
    box-shadow: none !important
    height 46px
    &::placeholder
      font-family: PingFang SC;
      font-weight: 300;
      font-size: 17px;
      color: #C3C3C3
      letter-spacing 1px
    &:-webkit-autofill
      -webkit-box-shadow: 0 0 0px 1000px white inset !important
      box-shadow: 0 0 0px 1000px white inset !important
      -webkit-text-fill-color: #000 !important
    &:-moz-autofill
      -moz-box-shadow: 0 0 0px 1000px white inset !important
      box-shadow: 0 0 0px 1000px white inset !important
      -moz-text-fill-color: #000 !important
    &:-ms-autofill
      -ms-box-shadow: 0 0 0px 1000px white inset !important
      box-shadow: 0 0 0px 1000px white inset !important
      -ms-text-fill-color: #000 !important
  .remember-box
    display flex
    justify-content space-between
    align-items center
    margin 5px 0 0
    .el-checkbox__label
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 15px;
      color: #999999

    .forgot-link
      color #409EFF
      font-size 13px
      text-decoration none

      &:hover
        text-decoration underline
  .login-button
    width: 395px;
    height: 44px;
    background: linear-gradient(180deg, #269BFB, #1B76FB);
    border-radius: 2px
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 17px;
    color: #FFFFFF
    margin-top 20px
  .register-link
    text-align center
    margin-top 20px
    font-size 14px
    color #999
    a
      color #269BFB
      margin-left 5px
      cursor pointer

      &:hover
        text-decoration underline
</style>