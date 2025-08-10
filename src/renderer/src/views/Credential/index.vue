<template>
  <div class="credential-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ $t('credential.title') }}</h1>
        <p class="page-subtitle">{{ $t('credential.subtitle') }}</p>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section">
      <el-input
        v-model="searchQuery"
        :placeholder="$t('credential.searchPlaceholder')"
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- 凭据卡片列表 -->
    <el-scrollbar class="credential-scrollbar" v-loading="loading">
      <div class="credential-grid">
        <div 
          v-for="(credential, index) in filteredCredentials" 
          :key="index"
          class="credential-card"
        >
          <div class="card-header">
            <div class="card-title">
              <el-icon class="title-icon"><Key /></el-icon>
              <span class="credential-name">{{ credential.agent || credential.name }}</span>
            </div>
            <div class="card-actions">
              <el-button text :icon="Edit" class="action-btn" @click="editCredential(credential)" />
            </div>
          </div>

          <div class="card-content">
            <!-- 动态渲染配置字段 -->
            <template v-if="credential.config">
              <div 
                v-for="(fieldConfig, fieldName) in credential.config" 
                :key="fieldName"
                class="info-row"
              >
                <span class="info-label">{{ fieldConfig.desc || fieldName }}：</span>
                <span 
                  :class="['info-value', { 'password-masked': fieldConfig.seal }]"
                >
                  {{ getFieldDisplayValue(credential, fieldName, fieldConfig) }}
                </span>
              </div>
            </template>
            
            <!-- 兜底：如果没有config配置，显示基础字段 -->
            <template v-else>
              <div class="info-row" v-if="credential.username">
                <span class="info-label">{{ $t('credential.username') }}：</span>
                <span class="info-value">{{ credential.username }}</span>
              </div>
              <div class="info-row" v-if="credential.password">
                <span class="info-label">{{ $t('credential.password') }}：</span>
                <span class="info-value password-masked">••••••••</span>
              </div>
              <div class="info-row" v-if="credential.server">
                <span class="info-label">{{ $t('credential.server') }}：</span>
                <span class="info-value">{{ credential.server }}</span>
              </div>
            </template>
          </div>

          <div class="card-footer">
            <span class="update-time" v-if="credential.updated_time">{{ $t('credential.updatedAt') }} {{ formatTime(credential.updated_time) }}</span>
            <span class="update-time" v-else>{{ $t('credential.notUpdated') }}</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredCredentials.length === 0 && !loading" class="empty-state">
          <el-icon class="empty-icon"><Key /></el-icon>
          <h3>{{ $t('credential.noCredentials') }}</h3>
          <p>{{ $t('credential.noCredentialsDesc') }}</p>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { Search, Edit } from '@element-plus/icons-vue'
import { showUpdateCredential } from '@/components/UpdateCredential'

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const store = useAppStore()

// 凭据列表
const credentials = ref([])

// 计算属性
const filteredCredentials = computed(() => {
  if (!searchQuery.value) return credentials.value
  
  const query = searchQuery.value.toLowerCase()
  return credentials.value.filter(credential => 
    credential.name.toLowerCase().includes(query) ||
    credential.assistantName?.toLowerCase().includes(query) ||
    credential.server?.toLowerCase().includes(query) ||
    credential.username.toLowerCase().includes(query)
  )
})

// 方法
const editCredential = (credential) => {
  showUpdateCredential({credentialId: credential.id, credentials: credentials.value, isCredentialEdit: true}, (savedData) => handleCredentialSaved(savedData))
}

const handleCredentialSaved = (savedData) => {
  console.log('handleCredentialSaved', savedData)
  // 更新本地数据
  const index = credentials.value.findIndex(v => v.name === savedData.name)
  if (index !== -1) {
    credentials.value[index] = {
      ...credentials.value[index],
      ...savedData,
      // password: '••••••••', // 显示掩码
      updatedAt: new Date()
    }
  }
}

// 获取字段显示值
const getFieldDisplayValue = (credential, fieldName, fieldConfig) => {
  const value = credential[fieldName]
  
  // 如果是密码字段（seal为true），永远显示掩码
  if (fieldConfig.seal) {
    return '••••••••'
  }
  
  // 如果有值，显示值
  if (value) {
    return value
  }
  
  // 如果没有值但有默认值，显示默认值
  if (fieldConfig.default) {
    return fieldConfig.default
  }
  
  // 都没有显示占位符
  return '-'
}

const formatTime = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 生命周期
onMounted(async () => {
  if(store.mode === 'ws'){
    loading.value = true
    try {
      // 获取所有凭据系统列表
      const config = (await getCredentialAll()).data
      let data = config.map(item => {
        return { ...item.conf, ...item.data, config: item.conf.config }
      })
      const baseMap = new Map()
      data.forEach(item => {
        if (item.name) {
          baseMap.set(item.name, item)
        }
      })
      
      // 处理基于其他凭据的继承关系
      data.forEach(item => {
        if (item.base && item.config) {
          const base = baseMap.get(item.base)
          if (base && base.config) {
            // 只处理在config中定义的字段
            Object.keys(item.config).forEach(key => {
              // 如果当前项没有值，则从基础凭据继承
              if (!item[key] && base[key]) {
                item[key] = base[key]
              }
            })
          }
        }
      })
      
      // 按更新时间排序（处理可能的空值情况）
      credentials.value = data.sort((a, b) => {
        const timeA = a.updated_time ? new Date(a.updated_time).getTime() : 0
        const timeB = b.updated_time ? new Date(b.updated_time).getTime() : 0
        return timeB - timeA
      })
    } catch (error) {
      console.error('加载凭据数据失败:', error)
      ElMessage.error(t('credential.loadFailed'))
    } finally {
      loading.value = false
    }
  } else{
    const config = [
      {
        "conf": {
          "agent": "会议室预定",
          "config": "{\"username\": {\"desc\": \"用户名\", \"required\": true}, \"password\": {\"desc\": \"密码\", \"required\": true, \"seal\": true}, \"server\": {\"desc\": \"服务器\", \"required\": false, \"override\": true, \"default\": \"exchange.paiday.cn\"}}",
          "id": 1,
          "name": "mcp-exchange"
        },
        "data": {
          "base": "mcp-cip",
          "password": "",
          "server": "exchange.paiday.cn",
          "updated_time": "2025-06-06T09:06:52.147592054Z",
          "username": "xuminhui"
        }
      },
      {
        "conf": {
          "agent": "客服系统",
          "config": "{\"username\": {\"desc\": \"用户名\", \"required\": true}, \"password\": {\"desc\": \"密码\", \"required\": true, \"seal\": true}, \"server\": {\"desc\": \"服务器\", \"required\": false, \"override\": true, \"default\": \"cs.company.com\"}}",
          "id": 2,
          "name": "mcp-cip"
        },
        "data": {
          "base": "",
          "password": "",
          "server": "cs.company.com",
          "updated_time": "2025-06-07T09:06:52.147592054Z",
          "username": "admin"
        }
      },
      {
        "conf": {
          "agent": "邮稿与会议助手",
          "config": "{\"username\": {\"desc\": \"用户名\", \"required\": true}, \"password\": {\"desc\": \"密码\", \"required\": true, \"seal\": true}, \"server\": {\"desc\": \"服务器\", \"required\": false, \"override\": true, \"default\": \"shnlb.rds-services.com\"}, \"email\": {\"desc\": \"邮箱\", \"required\": false, \"default\": \"zhizhi.yang@rds-services.com\"}, \"port\": {\"desc\": \"端口\", \"required\": false, \"default\": \"993\"}}",
          "id": 3,
          "name": "mcp-exchange"
        },
        "data": {
          "base": "",
          "password": "",
          "server": "shnlb.rds-services.com",
          "updated_time": "2025-06-10T11:14:00.000000000Z",
          "username": "",
          "email": "zhizhi.yang@rds-services.com",
          "port": "993"
        }
      },
      {
        "conf": {
          "agent": "AD域控制器",
          "config": "{\"username\": {\"desc\": \"用户名\", \"required\": true}, \"password\": {\"desc\": \"密码\", \"required\": true, \"seal\": true}}",
          "id": 4,
          "name": "AD"
        },
        "data": {
          "base": "",
          "password": "",
          "updated_time": "",
          "username": ""
        }
      },
      {
        "conf": {
          "agent": "数据库连接",
          "config": "{\"host\": {\"desc\": \"主机地址\", \"required\": true, \"default\": \"localhost\"}, \"port\": {\"desc\": \"端口\", \"required\": true, \"default\": \"3306\"}, \"database\": {\"desc\": \"数据库名\", \"required\": true}, \"username\": {\"desc\": \"用户名\", \"required\": true}, \"password\": {\"desc\": \"密码\", \"required\": true, \"seal\": true}, \"charset\": {\"desc\": \"字符编码\", \"required\": false, \"default\": \"utf8mb4\"}, \"timeout\": {\"desc\": \"连接超时(秒)\", \"required\": false, \"default\": \"30\"}}",
          "id": 5,
          "name": "mysql-connector"
        },
        "data": {
          "host": "db.company.com",
          "port": "3306",
          "database": "production_db",
          "username": "dbuser",
          "password": "",
          "charset": "utf8mb4",
          "timeout": "30",
          "updated_time": "2025-06-08T15:30:22.000000000Z"
        }
      },
      {
        "conf": {
          "agent": "API网关",
          "config": "{\"api_key\": {\"desc\": \"API密钥\", \"required\": true, \"seal\": true}, \"endpoint\": {\"desc\": \"接口地址\", \"required\": true, \"default\": \"https://api.gateway.com\"}}",
          "id": 6,
          "name": "api-gateway"
        },
        "data": {
          "api_key": "",
          "endpoint": "https://api.gateway.com",
          "updated_time": "2025-06-09T08:20:15.000000000Z"
        }
      }
    ]
    // 处理凭据配置数据
    let data = config.map(item => {
      try {
        return { 
          ...item.conf, 
          ...item.data, 
          config: JSON.parse(item.conf.config) 
        }
      } catch (error) {
        console.error(`解析凭据配置失败: ${item.conf?.name}`, error)
        return { 
          ...item.conf, 
          ...item.data, 
          config: {} 
        }
      }
    })
    
    // 构建名称到对象的映射，提高查找性能
    const baseMap = new Map()
    data.forEach(item => {
      if (item.name) {
        baseMap.set(item.name, item)
      }
    })
    
    // 处理基于其他凭据的继承关系
    data.forEach(item => {
      if (item.base && item.config) {
        const base = baseMap.get(item.base)
        if (base && base.config) {
          // 只处理在config中定义的字段
          Object.keys(item.config).forEach(key => {
            // 如果当前项没有值，则从基础凭据继承
            if (!item[key] && base[key]) {
              item[key] = base[key]
            }
          })
        }
      }
    })
    
    // 按更新时间排序（处理可能的空值情况）
    credentials.value = data.sort((a, b) => {
      const timeA = a.updated_time ? new Date(a.updated_time).getTime() : 0
      const timeB = b.updated_time ? new Date(b.updated_time).getTime() : 0
      return timeB - timeA
    })
    console.log(credentials.value)
  }
})
</script>

<style lang="stylus" scoped>
.credential-container
  padding 24px
  // background #f5f7fa

.page-header
  display flex
  justify-content space-between
  align-items flex-start
  margin-bottom 24px
  
  .header-left
    .page-title
      font-size 28px
      font-weight 600
      color #1f2937
      margin 0 0 8px 0
      
    .page-subtitle
      font-size 14px
      color #6b7280
      margin 0

.search-section
  margin-bottom 24px
  
  .search-input
    max-width 400px
    
    :deep(.el-input__wrapper)
      border-radius 8px
      box-shadow 0 1px 3px rgba(0, 0, 0, 0.1)

.credential-scrollbar
  height 70vh
  
  :deep(.el-scrollbar__view)
    height 100%

.credential-grid
  display grid
  grid-template-columns repeat(auto-fill, minmax(350px, 1fr))
  gap 20px
  padding-bottom 20px

.credential-card
  background white
  border-radius 12px
  box-shadow 0 2px 8px rgba(0, 0, 0, 0.08)
  transition all 0.3s ease
  overflow hidden
  display flex
  flex-direction column
  min-height 200px
  
  &:hover
    box-shadow 0 4px 16px rgba(0, 0, 0, 0.12)
    transform translateY(-2px)

.card-header
  display flex
  justify-content space-between
  align-items center
  padding 16px 20px 12px
  border-bottom 1px solid #f3f4f6
  flex-shrink 0
  
  .card-title
    display flex
    align-items center
    gap 8px
    
    .title-icon
      color #3b82f6
      font-size 18px
      
    .credential-name
      font-size 16px
      font-weight 600
      color #1f2937
  
  .card-actions
    .action-btn
      color #6b7280
      padding 4px
      
      &:hover
        color #3b82f6

.card-content
  padding 16px 20px
  flex 1
  display flex
  flex-direction column
  justify-content flex-start
  
  .info-row
    display flex
    justify-content space-between
    align-items center
    margin-bottom 12px
    
    &:last-child
      margin-bottom 0
    
    .info-label
      font-size 13px
      color #6b7280
      font-weight 500
      min-width 60px
      
    .info-value
      font-size 14px
      color #374151
      font-family 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
      flex 1
      text-align right
      word-break break-all
      
      &.password-masked
        font-family inherit
        color #9ca3af

.card-footer
  padding 12px 20px
  background #f9fafb
  border-top 1px solid #f3f4f6
  margin-top auto
  flex-shrink 0
  
  .update-time
    font-size 12px
    color #9ca3af

.empty-state
  grid-column 1 / -1
  text-align center
  padding 60px 20px
  color #6b7280
  
  .empty-icon
    font-size 48px
    margin-bottom 16px
    color #d1d5db
    
  h3
    font-size 18px
    margin 0 0 8px 0
    color #374151
    
  p
    font-size 14px
    margin 0
    color #6b7280

// Element Plus 组件样式覆盖
:deep(.el-button)
  border-radius 6px
  
:deep(.el-dropdown-menu)
  border-radius 8px
  box-shadow 0 4px 12px rgba(0, 0, 0, 0.15)
  
:deep(.el-dropdown-menu__item)
  padding 8px 16px
  display flex
  align-items center
  gap 8px
  
  .el-icon
    font-size 14px
</style>

