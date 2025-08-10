<template>
  <LoginWrapper>
    <div class="register-box">
      <div class="register-title">{{ $t('register.title') }}</div>
      <el-form
        ref="registryFormRef"
        :model="registryForm"
        :rules="registryRules"
        class="registry-form"
        label-position="top"
        label-width="0px"
        style="width: 394px"
      >
        <el-form-item prop="username" :label="$t('register.username')">
          <el-input
            v-model.trim="registryForm.username"
            :placeholder="$t('register.usernamePlaceholder')"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="userId" :label="$t('register.userId')">
          <el-input
            v-model.trim="registryForm.userId"
            :placeholder="$t('register.userIdPlaceholder')"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password" :label="$t('register.password')">
          <el-input
            v-model.trim="registryForm.password"
            :placeholder="$t('register.passwordPlaceholder')"
            :prefix-icon="Lock"
            :type="passwordVisible ? 'text' : 'password'"
            clearable
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword" :label="$t('register.confirmPassword')">
          <el-input
            v-model.trim="registryForm.confirmPassword"
            :placeholder="$t('register.confirmPasswordPlaceholder')"
            :prefix-icon="Lock"
            :type="passwordVisible ? 'text' : 'password'"
            clearable
            show-password
          />
        </el-form-item>

        <el-form-item prop="inviteCode" :label="$t('register.inviteCode')">
          <el-input
            v-model="registryForm.inviteCode"
            :placeholder="$t('register.inviteCodePlaceholder')"
            :prefix-icon="Key"
            clearable
          />
        </el-form-item>

        <el-button
          type="primary"
          class="register-button"
          :loading="loading"
          @click="handleRegistry"
        >
          {{ $t('register.registerButton') }}
        </el-button>

        <div class="login-link">
          {{ $t('register.loginLink') }}<router-link to="/login">{{ $t('register.loginNow') }}</router-link>
        </div>
      </el-form>
    </div>
  </LoginWrapper>
</template>

<script setup>
import { User, Lock, Key } from '@element-plus/icons-vue'
const { t } = useI18n()

const router = useRouter()
const registryFormRef = ref(null)
const loading = ref(false)
const passwordVisible = ref(false)

const registryForm = reactive({
  userId: '',
  username: '',
  password: '',
  confirmPassword: '',
  inviteCode: ''
})

// 验证密码是否一致
const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registryForm.password) {
    callback(new Error(t('register.passwordMismatch')))
  } else {
    callback()
  }
}

// 验证密码是否包含数字和字母
const validatePassword = (rule, value, callback) => {
  const hasLetter = /[a-zA-Z]/.test(value)
  const hasNumber = /[0-9]/.test(value)

  if (!hasLetter || !hasNumber) {
    callback(new Error(t('register.passwordFormat')))
  } else {
    callback()
  }
}

const registryRules = computed(() => ({
  userId: [
    { required: true, message: t('register.userIdRequired'), trigger: 'blur' },
    { min: 4, max: 20, message: t('register.userIdLength'), trigger: 'blur' }
  ],
  username: [
    { required: true, message: t('register.usernameRequired'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('register.passwordRequired'), trigger: 'blur' },
    { min: 6, max: 20, message: t('register.passwordLength'), trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('register.confirmPasswordRequired'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  inviteCode: [{ required: true, message: t('register.inviteCodeRequired'), trigger: 'blur' }]
}))

// 处理注册逻辑
const handleRegistry = async () => {
  if (!registryFormRef.value) return

  await registryFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      loading.value = true

      // 调用注册接口
      const res = await doRegister({
        user_id: registryForm.userId,
        username: registryForm.username,
        password: registryForm.password,
        invited: registryForm.inviteCode
      })

      // 注册成功处理
      if (res.status === 200) {
        ElMessage.success(t('register.registerSuccess'))
        // 跳转到登录页
        router.push('/login')
      }
    } catch (error) {
      console.error('注册失败:', error)
      ElMessage.error(error?.data?.message || t('register.registerFailed'))
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="stylus">
.register-box
  width 100%
  height 100%
  display flex
  flex-direction column
  align-items center
  .register-title
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
  .register-button
    width: 395px;
    height: 44px;
    background: linear-gradient(180deg, #269BFB, #1B76FB);
    border-radius: 2px
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 17px;
    color: #FFFFFF
    margin-top 20px

  .login-link
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
