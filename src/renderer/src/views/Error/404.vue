<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-image">
        <div class="error-number">404</div>
        <div class="error-icon">🔍</div>
      </div>
      <div class="error-content">
        <h1 class="error-title">{{ $t('error.404.title') }}</h1>
        <p class="error-description">
          {{ $t('error.404.description') }}
        </p>
        <p class="error-suggestion">
          {{ $t('error.404.suggestion') }}
        </p>
        <div class="error-actions">
          <el-button type="primary" :icon="HomeFilled" @click="handleHomePage">
            {{ $t('error.404.backHome') }}
          </el-button>
          <el-button :icon="Back" @click="goBack">
            {{ $t('error.404.goBack') }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { HomeFilled, Back } from '@element-plus/icons-vue'
const { t } = useI18n()

const router = useRouter()

function handleHomePage() {
  router.push({ path: '/home' })
}

function goBack() {
  router.go(-1)
}
</script>

<style lang="stylus" scoped>
.error-page
  min-height: 100vh
  display: flex
  align-items: center
  justify-content: center
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)
  padding: 20px
  
.error-container
  background: rgba(255, 255, 255, 0.95)
  border-radius: 20px
  padding: 60px 40px
  text-align: center
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1)
  backdrop-filter: blur(10px)
  max-width: 600px
  width: 100%
  
.error-image
  margin-bottom: 40px
  position: relative
  
.error-number
  font-size: 120px
  font-weight: 900
  color: #74b9ff
  text-shadow: 0 10px 20px rgba(116, 185, 255, 0.3)
  margin-bottom: 10px
  background: linear-gradient(45deg, #74b9ff, #0984e3)
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent
  background-clip: text
  
.error-icon
  font-size: 60px
  margin-bottom: 20px
  animation: bounce 2s infinite
  
@keyframes bounce
  0%, 20%, 50%, 80%, 100%
    transform: translateY(0)
  40%
    transform: translateY(-10px)
  60%
    transform: translateY(-5px)
    
.error-content
  color: #333
  
.error-title
  font-size: 32px
  font-weight: 700
  margin-bottom: 16px
  color: #2c3e50
  
.error-description
  font-size: 18px
  color: #7f8c8d
  margin-bottom: 12px
  line-height: 1.6
  
.error-suggestion
  font-size: 14px
  color: #95a5a6
  margin-bottom: 40px
  line-height: 1.5
  
.error-actions
  display: flex
  gap: 16px
  justify-content: center
  flex-wrap: wrap
  
  .el-button
    min-width: 120px
    height: 40px
    border-radius: 20px
    font-weight: 600
    transition: all 0.3s ease
    
    &:hover
      transform: translateY(-2px)
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15)

// 响应式设计
@media (max-width: 900px)
  .error-container
    padding: 40px 20px
    margin: 20px
    
  .error-number
    font-size: 80px
    
  .error-icon
    font-size: 40px
    
  .error-title
    font-size: 24px
    
  .error-description
    font-size: 16px
    
  .error-actions
    flex-direction: column
    align-items: center
    
    .el-button
      width: 100%
      max-width: 200px

@media (max-width: 480px)
  .error-page
    padding: 10px
    
  .error-container
    padding: 30px 15px
    
  .error-number
    font-size: 60px

// 工具类
.mr-1
  margin-right: 4px
</style>
