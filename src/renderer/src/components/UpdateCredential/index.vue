<template>
  <el-dialog
    :title="t('credential.editCredential')"
    v-model="dialogVisible"
    width="650px"
    :before-close="handleDialogClose"
    :close-on-click-modal="isCredentialEdit"
    :close-on-press-escape="isCredentialEdit"
    :show-close="isCredentialEdit"
    class="credential-edit-dialog"
  >
    <div class="dialog-header-info">
      <div class="credential-info">
        <el-icon class="info-icon"><Key /></el-icon>
        <div class="info-text">
          <h4>{{ currentCredential?.agent || currentCredential?.name }}</h4>
          <p>{{ currentCredential?.name || formData.name }}</p>
        </div>
      </div>
    </div>
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="edit-form"
    >
      <template
        v-for="(fieldConfig, fieldName) in configFields"
        :key="fieldName"
      >
        <!-- 用户名字段 -->
        <el-form-item
          v-if="fieldName === 'username'"
          :label="fieldConfig.desc || t('credential.username')"
          :prop="fieldName"
        >
          <div class="form-item-with-inherit">
            <el-input
              v-model="formData[fieldName]"
              :placeholder="t('credential.enterField', { field: fieldConfig.desc })"
              :prefix-icon="User"
              :disabled="isFieldDisabled(fieldName)"
            />

            <!-- 继承状态显示和操作 -->
            <div v-if="formData.base" class="inherit-status">
              <el-tag type="info" size="small">
                {{ t('credential.inheritedFrom') }}: {{ getAgentByBase(formData.base) }}
              </el-tag>
              <el-button
                type="danger"
                text
                size="small"
                :icon="Close"
                @click="breakInheritance"
                class="break-btn"
              >
                {{ t('credential.breakInheritance') }}
              </el-button>
            </div>

            <!-- 继承配置按钮 -->
            <el-dropdown v-else @command="copyFromOther" class="copy-dropdown">
              <el-button type="primary" text :icon="DocumentCopy" class="copy-btn">
                {{ t('credential.inheritConfig') }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <div class="dropdown-header">
                    {{ t('credential.selectBaseCredential') }}
                  </div>
                  <el-dropdown-item
                    v-for="credential in otherCredentials"
                    :key="credential.id"
                    :command="credential"
                    class="credential-option"
                  >
                    <div class="credential-option-content">
                      <span class="credential-name">{{
                        credential.agent || credential.name
                      }}</span>
                      <span class="credential-user">{{
                        credential.username
                      }}</span>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="otherCredentials.length === 0"
                    disabled
                  >
                    <div class="no-credentials-tip">
                      <div>{{ t('credential.noInheritableCredentials') }}</div>
                      <div class="tip-text">
                        {{ t('credential.onlyIndependentCredentials') }}
                      </div>
                    </div>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-form-item>

        <!-- 密码字段（seal为true的字段） -->
        <el-form-item
          v-else-if="fieldConfig.seal"
          :label="fieldConfig.desc || t('credential.password')"
          :prop="fieldName"
        >
          <!-- 断开继承后的新密码框 -->
          <el-input
            v-if="passwordFieldsNeedReset[fieldName]"
            v-model="formData[fieldName]"
            type="password"
            :placeholder="
              t('credential.setNewField', {
                field: fieldConfig.desc || t('credential.password')
              })
            "
            show-password
            :prefix-icon="Lock"
            class="new-password-input"
          />
          <!-- 正常的密码框 -->
          <el-input
            v-else
            v-model="formData[fieldName]"
            :type="
              passwordFieldStates[fieldName]?.showPassword ? 'text' : 'password'
            "
            :placeholder="
              passwordFieldStates[fieldName]?.focused
                ? t('credential.enterField', { field: fieldConfig.desc })
                : ''
            "
            :show-password="
              passwordFieldStates[fieldName]?.showPassword !== undefined
            "
            :prefix-icon="Lock"
            :disabled="isFieldDisabled(fieldName)"
            @focus="handlePasswordFocus(fieldName)"
            @blur="handlePasswordBlur(fieldName)"
            class="password-input"
          />
        </el-form-item>

        <!-- 服务器字段 -->
        <el-form-item
          v-else-if="fieldName === 'server'"
          :label="fieldConfig.desc || t('credential.server')"
          :prop="fieldName"
        >
          <el-input
            v-model="formData[fieldName]"
            :placeholder="getServerPlaceholder(fieldConfig)"
            :prefix-icon="Connection"
            :disabled="isFieldDisabled(fieldName)"
          />
        </el-form-item>

        <!-- 其他文本字段 -->
        <el-form-item
          v-else
          :label="fieldConfig.desc || fieldName"
          :prop="fieldName"
        >
          <el-input
            v-model="formData[fieldName]"
            :placeholder="t('credential.enterField', { field: fieldConfig.desc })"
            :type="fieldName === 'email' ? 'email' : 'text'"
            :disabled="isFieldDisabled(fieldName)"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <div 
          class="dialog-footer-text"
          :class="locale === 'zh-CN' ? 'zh-CN' : 'en-US'"
          v-html="t('credential.encryptionInfo', { algorithm: `<a href='https://en.wikipedia.org/wiki/Galois/Counter_Mode' target='_blank'>${t('credential.aes256Algorithm')}</a>` })"
        ></div>
        <el-button v-if="isCredentialEdit" @click="handleDialogClose" size="large">{{
          t('common.cancel')
        }}</el-button>
        <el-button
          type="primary"
          @click="saveCredential"
          :loading="saveLoading"
          size="large"
        >
          {{ t('credential.saveConfig') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { i18n } from '@/locales'
import { User, Lock, Connection, Key, Close, DocumentCopy } from '@element-plus/icons-vue'
import { setCredentialConf } from '@/api/credential'

// 获取国际化函数
const { locale, t } = i18n.global

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  credentialId: {
    type: [String, Number],
    default: ''
  },
  credentials: {
    type: Array,
    default: () => []
  },
  isCredentialEdit: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'saved'])

// 响应式数据
const saveLoading = ref(false)
const isCopiedData = ref(false)
const initialFormData = ref({})
const isBrokenInheritance = ref(false) // 标记是否刚断开继承

// 表单数据
const formData = reactive({})

// 密码字段状态管理
const passwordFieldStates = reactive({})
const passwordFieldsNeedReset = reactive({})

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 当前正在编辑的凭据
const currentCredential = computed(() => {
  if (!props.credentialId || !props.credentials?.length) return null
  return props.credentials.find(
    (credential) => credential.id == props.credentialId
  )
})

// 配置字段
const configFields = computed(() => {
  if (!currentCredential.value?.config) return {}
  return currentCredential.value.config
})

// 用于继承的其他凭据列表（排除当前正在编辑的凭据和不能继承的凭据）
const otherCredentials = computed(() => {
  if (!props.credentials?.length) return []

  const currentCredentialName = currentCredential.value?.name
  if (!currentCredentialName) return []

  return props.credentials.filter((credential) => {
    // 排除当前凭据
    if (credential.id == props.credentialId) return false

    // 排除已经继承了当前凭据的凭据（避免循环继承）
    if (credential.base === currentCredentialName) return false

    // 排除已经有继承关系的凭据（base字段有值）
    if (credential.base) return false

    // 检查是否有共同字段
    const currentFields = Object.keys(configFields.value || {})
    const otherFields = Object.keys(credential.config || {})
    
    // 计算共同字段数量
    const commonFields = currentFields.filter(field => otherFields.includes(field))
    
    // 只显示有共同字段的凭据
    if (commonFields.length === 0) return false

    return true
  })
})

// 根据base获取agent
const getAgentByBase = (base) => {
  const credential = props.credentials.find((credential) => credential.name === base)
  return credential?.agent || credential?.name
}

// 判断字段是否应该禁用
const isFieldDisabled = (fieldName) => {
  // 如果是断开继承状态，所有字段都可编辑
  if (isBrokenInheritance.value) {
    return false
  }
  
  // 如果不是继承模式，所有字段都可编辑
  if (!isCopiedData.value && !formData.base) {
    return false
  }
  
  // 如果是继承模式，需要区分字段来源
  if (isCopiedData.value || formData.base) {
    const baseCredential = props.credentials?.find(c => c.name === formData.base)
    const baseFieldConfig = baseCredential?.config?.[fieldName]
    const currentFieldConfig = configFields.value?.[fieldName]
    
    // 如果基础凭据没有这个字段，当前凭据有 - 始终可编辑
    if (!baseFieldConfig && currentFieldConfig) {
      return false
    }
    
    // 如果两边都有这个字段 - 根据当前凭据的override决定
    if (baseFieldConfig && currentFieldConfig) {
      // 但是必须字段有值（密码除外）才能禁用，否则禁用后无法编辑
      if (!currentFieldConfig.seal && !formData[fieldName]) {
        return false // 字段没有值时不禁用，允许用户输入
      }
      return !currentFieldConfig.override
    }
  }
  
  return false
}

// 表单验证规则
const formRules = computed(() => {
  const rules = {}

  // 根据配置动态生成验证规则
  Object.entries(configFields.value || {}).forEach(
    ([fieldName, fieldConfig]) => {
      const fieldRules = []

      // 必填验证
      if (fieldConfig.required) {
        fieldRules.push({
          required: true,
          message: `请输入${fieldConfig.desc || fieldName}`,
          trigger: 'blur'
        })
      }

      // 密码特殊处理（seal为true的字段）
      if (fieldConfig.seal) {
        fieldRules.push({
          validator: (rule, value, callback) => {
            // 如果是掩码，说明密码没有变更，跳过验证
            if (value === '••••••••') {
              callback()
            } else if (fieldConfig.required && !value) {
              callback(new Error(`请输入${fieldConfig.desc || '密码'}`))
            } else if (value && value.length < 6) {
              callback(new Error('密码长度不能少于6位'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        })
      }

      // 服务器地址验证
      if (fieldName === 'server' && !fieldConfig.required) {
        fieldRules.push({
          validator: (rule, value, callback) => {
            if (value) {
              const serverPattern =
                /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*(\:[0-9]{1,5})?$|^(\d{1,3}\.){3}\d{1,3}(\:[0-9]{1,5})?$/
              if (!serverPattern.test(value)) {
                callback(new Error('请输入正确的服务器地址格式'))
              } else {
                callback()
              }
            } else {
              callback()
            }
          },
          trigger: 'blur'
        })
      }

      // 邮箱验证
      if (fieldName === 'email') {
        fieldRules.push({
          type: 'email',
          message: '请输入正确的邮箱格式',
          trigger: 'blur'
        })
      }

      if (fieldRules.length > 0) {
        rules[fieldName] = fieldRules
      }
    }
  )

  return rules
})

const formRef = ref(null)

// 获取服务器字段的占位符
const getServerPlaceholder = (fieldConfig) => {
  const baseText = `请输入${fieldConfig.desc || '服务器地址'}`
  if (fieldConfig.default) {
    return `${baseText}（默认：${fieldConfig.default}）`
  }
  return `${baseText}（如：example.com:8080）`
}

// 密码字段聚焦处理
const handlePasswordFocus = (fieldName) => {
  if (!passwordFieldStates[fieldName]) {
    passwordFieldStates[fieldName] = {}
  }
  passwordFieldStates[fieldName].focused = true
  passwordFieldStates[fieldName].showPassword = false

  // 如果当前显示的是掩码，清空让用户输入
  if (formData[fieldName] === '••••••••') {
    formData[fieldName] = ''
  }
}

// 密码字段失焦处理
const handlePasswordBlur = (fieldName) => {
  if (!passwordFieldStates[fieldName]) {
    passwordFieldStates[fieldName] = {}
  }
  passwordFieldStates[fieldName].focused = false

  // 如果密码为空，恢复掩码显示
  if (!formData[fieldName]) {
    formData[fieldName] = '••••••••'
    passwordFieldStates[fieldName].showPassword = undefined
  }
}

// 初始化密码字段状态
const initPasswordFieldStates = () => {
  Object.entries(configFields.value || {}).forEach(
    ([fieldName, fieldConfig]) => {
      if (fieldConfig.seal) {
        passwordFieldStates[fieldName] = {
          focused: false,
          showPassword: undefined // undefined表示不显示眼睛图标
        }
      }
    }
  )
}

// 方法
const loadCredentialData = () => {
  const credential = currentCredential.value
  if (!credential) return

  try {
    // 重置表单数据
    Object.keys(formData).forEach((key) => {
      delete formData[key]
    })

    // 重置复制状态
    isCopiedData.value = false
    isBrokenInheritance.value = false

    // 初始化密码字段状态
    initPasswordFieldStates()

    // 根据配置字段初始化表单数据
    Object.keys(configFields.value || {}).forEach((fieldName) => {
      const fieldConfig = configFields.value[fieldName]
      if (fieldConfig.seal) {
        // 密码字段：永远显示掩码，初始化时不需要重置
        formData[fieldName] = '••••••••'
        passwordFieldsNeedReset[fieldName] = false
      } else {
        // 普通字段
        formData[fieldName] = credential[fieldName] || fieldConfig.default || ''
      }
    })

    // 添加基础字段
    formData.id = credential.id
    formData.name = credential.name
    formData.agent = credential.agent
    formData.base = credential.base || ''

    // 保存非复制模式的初始状态
    if (!isCopiedData.value) {
      initialFormData.value = { ...formData }
    }
  } catch (error) {
    console.error('加载凭据配置失败:', error)
    ElMessage.error(t('credential.loadFailed'))
  }
}

const handleDialogClose = () => {
  emit('update:visible', false)
  nextTick(() => {
    resetForm()
  })
}

const resetForm = () => {
  // 清空所有表单数据
  Object.keys(formData).forEach((key) => {
    delete formData[key]
  })

  // 清空密码字段状态
  Object.keys(passwordFieldStates).forEach((key) => {
    delete passwordFieldStates[key]
  })

  // 清空密码重置标记
  Object.keys(passwordFieldsNeedReset).forEach((key) => {
    delete passwordFieldsNeedReset[key]
  })

  // 重置状态
  isCopiedData.value = false
  isBrokenInheritance.value = false
  initialFormData.value = {}
  formRef.value?.resetFields()
}

const saveCredential = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    saveLoading.value = true

    // 凭据编辑模式
    const saveData = {
      id: formData.id,
      name: formData.name,
      agent: formData.agent,
      base: formData.base || '' // 添加base字段
    }

    // 构建API参数
    let params = {}
    let hasChanges = false

    // 先构建完整的saveData供页面显示
    Object.keys(configFields.value || {}).forEach((fieldName) => {
      const fieldConfig = configFields.value[fieldName]
      if (fieldConfig.seal) {
        // 密码字段：页面显示用掩码，但如果实际修改了密码需要标记
        saveData[fieldName] = '••••••••'
        if (formData[fieldName] && formData[fieldName] !== '••••••••') {
          saveData.passwordChanged = true
        }
      } else {
        saveData[fieldName] = formData[fieldName] || ''
      }
    })

    if (isBrokenInheritance.value) {
      // 断开继承模式：传base为空字符串，并传递所有字段
      params.base = ''
      hasChanges = true // 断开继承必须调用接口

      Object.keys(configFields.value || {}).forEach((fieldName) => {
        const fieldConfig = configFields.value[fieldName]
        if (fieldConfig.seal) {
          // 密码字段：如果不是掩码说明用户重新设置了
          if (formData[fieldName] && formData[fieldName] !== '••••••••') {
            params[fieldName] = formData[fieldName]
          }
          // 密码字段如果是掩码，则不传递（保持原有密码）
        } else {
          // 普通字段：传递所有值，如果没有值但有默认值则传递默认值
          params[fieldName] = formData[fieldName] || fieldConfig.default || ''
        }
      })
    } else if (isCopiedData.value) {
      // 继承模式：至少要传base，再加上被修改的字段到API
      params.base = formData.base
      hasChanges = true // 继承模式下至少有base字段，所以必须调用接口

      Object.keys(configFields.value || {}).forEach((fieldName) => {
        const fieldConfig = configFields.value[fieldName]
        const baseCredential = props.credentials?.find(c => c.name === formData.base)
        const baseFieldConfig = baseCredential?.config?.[fieldName]

        // 判断字段是否可以保存修改
        let canSaveField = false
        
        if (!baseFieldConfig && fieldConfig) {
          // 当前独有的字段：始终可以保存
          canSaveField = true
        } else if (baseFieldConfig && fieldConfig) {
          // 两边都有的字段：只有override为true才可以保存
          canSaveField = fieldConfig.override
        }

        if (canSaveField) {
          if (fieldConfig.seal) {
            // 密码字段：如果不是掩码说明被修改了
            if (formData[fieldName] && formData[fieldName] !== '••••••••') {
              params[fieldName] = formData[fieldName]
            }
          } else {
            // 普通字段：需要检查是否与复制后的初始值不同
            const initialValue = initialFormData.value[fieldName] || ''

            if (formData[fieldName] !== initialValue) {
              params[fieldName] = formData[fieldName] || ''
            } else if (!baseFieldConfig && fieldConfig) {
              // 当前凭据独有的字段：如果没有值但有默认值，传递默认值
              if (!formData[fieldName] && fieldConfig.default) {
                params[fieldName] = fieldConfig.default
              }
            }
          }
        }
      })
    } else {
      // 非复制模式：检查所有字段是否有修改，有修改的传给API
      Object.keys(configFields.value || {}).forEach((fieldName) => {
        const fieldConfig = configFields.value[fieldName]
        const initialValue = initialFormData.value[fieldName] || ''

        if (fieldConfig.seal) {
          // 密码字段特殊处理
          if (formData[fieldName] && formData[fieldName] !== '••••••••') {
            params[fieldName] = formData[fieldName]
            hasChanges = true
          }
        } else {
          // 普通字段：检查是否与初始值不同
          if (formData[fieldName] !== initialValue) {
            params[fieldName] = formData[fieldName] || fieldConfig.default || ''
            hasChanges = true
          } else if (!formData[fieldName] && fieldConfig.default) {
            // 如果没有值但有默认值，也传递默认值
            params[fieldName] = fieldConfig.default
            hasChanges = true
          }
        }
      })
    }

    // 只有在有修改时才调用API
    if (hasChanges) {
      await setCredentialConf(formData.id, params)
      ElMessage.success(t('credential.saveSuccess'))
    }
    // 通知父组件保存成功
    emit('saved', saveData)

    handleDialogClose()
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error(t('common.operationFailed'))
  } finally {
    saveLoading.value = false
  }
}

// 断开继承关系
const breakInheritance = async () => {
  try {
    await ElMessageBox.confirm(
      `断开继承后，此凭据将变为独立维护，不再自动同步基础凭据的变更。<br><strong>注意：密码字段将被清空，需要重新设置。</strong>`,
      '断开继承确认',
      {
        confirmButtonText: '确认断开',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )

    // 获取当前基础凭据的完整信息，填充到当前表单
    const baseCredential = props.credentials?.find(
      (v) => v.name === formData.base
    )
    if (baseCredential) {
      Object.keys(configFields.value || {}).forEach((fieldName) => {
        const fieldConfig = configFields.value[fieldName]
        const baseFieldConfig = baseCredential.config?.[fieldName]
        
        if (fieldConfig.seal) {
          // 密码字段：清空，要求用户重新设置
          formData[fieldName] = ''
          passwordFieldsNeedReset[fieldName] = true // 标记需要重新输入
          if (passwordFieldStates[fieldName]) {
            passwordFieldStates[fieldName].focused = false
            passwordFieldStates[fieldName].showPassword = false
          }
        } else if (baseFieldConfig) {
          // 只处理base凭据中存在的字段：使用基础凭据的值或默认值
          const baseValue = baseCredential[fieldName]
          const defaultValue = fieldConfig.default
          formData[fieldName] = baseValue || defaultValue || ''
        }
        // 如果base凭据中没有这个字段，保持当前值不变（不清空）
      })
    }

    // 清除base和复制状态
    formData.base = ''
    isCopiedData.value = false
    isBrokenInheritance.value = true // 标记断开继承

    // 重新设置初始值
    initialFormData.value = { ...formData }

    ElMessage.success(t('credential.inheritanceBroken'))
  } catch (error) {
    // 用户取消操作
  }
}

// 继承其他凭据的配置
const copyFromOther = (sourceCredential) => {
  try {
    // 设置复制状态
    isCopiedData.value = true
    // 清除断开继承状态
    isBrokenInheritance.value = false

    // 设置base字段为被复制凭据的name
    formData.base = sourceCredential.name

    // 复制配置字段的数据
    Object.keys(configFields.value || {}).forEach((fieldName) => {
      const fieldConfig = configFields.value[fieldName]
      const sourceFieldConfig = sourceCredential.config?.[fieldName]

      // 检查源凭据是否有这个字段的配置
      if (sourceFieldConfig) {
        // 源凭据有这个字段，进行继承
        if (fieldConfig.seal) {
          // 密码字段：由于密码字段不返回实际值，统一显示掩码
          formData[fieldName] = '••••••••'
          // 清除重置标记，使用正常的密码框
          passwordFieldsNeedReset[fieldName] = false
          if (passwordFieldStates[fieldName]) {
            passwordFieldStates[fieldName].showPassword = undefined
            passwordFieldStates[fieldName].focused = false
          }
        } else {
          // 普通字段：只继承源凭据有值的字段
          const sourceValue = sourceCredential[fieldName]
          if (sourceValue) {
            // 源凭据有实际值，使用源凭据的值
            formData[fieldName] = sourceValue
          } else if (sourceFieldConfig.default) {
            // 源凭据没有值但有默认值，使用源凭据的默认值
            formData[fieldName] = sourceFieldConfig.default
          }
          // 如果源凭据既没有值也没有默认值，保持当前字段值不变
        }
      }
      // 如果源凭据没有这个字段配置，保持当前字段值不变（不清空）
    })

    // 保存复制后的初始状态，用于判断后续是否有修改
    initialFormData.value = { ...formData }

    ElMessage.success(
      t('credential.inheritSuccess', { name: sourceCredential.name })
    )
  } catch (error) {
    console.error('继承配置失败:', error)
    ElMessage.error(t('credential.inheritFailed'))
  }
}

// 监听props变化
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.credentialId) {
      loadCredentialData()
    }
  },
  { immediate: true }
)

watch(
  () => props.credentialId,
  (newId) => {
    if (props.visible && newId) {
      loadCredentialData()
    }
  },
  { immediate: true }
)

// 监听credentials变化
watch(
  () => props.credentials,
  () => {
    if (props.visible && props.credentialId) {
      loadCredentialData()
    }
  },
  { deep: true }
)

// 暴露方法供外部调用
defineExpose({
  openEdit: loadCredentialData
})
</script>

<style lang="stylus" scoped>
.credential-edit-dialog
  .dialog-header-info
    display flex
    align-items center
    padding 16px 20px
    border-bottom 1px solid #f3f4f6

    .credential-info
      display flex
      align-items center
      gap 8px

      .info-icon
        color #3b82f6
        font-size 24px

      .info-text
        h4
          font-size 16px
          font-weight 600
          color #1f2937
          margin 0 0 4px 0

        p
          font-size 14px
          color #6b7280
          margin 0

.edit-form
  padding 20px

.form-item-with-inherit
  display flex
  gap 8px
  align-items center

  .el-input
    flex 1

  .copy-dropdown, .inherit-status
    flex-shrink 0

.copy-btn
  color #3b82f6
  font-weight 500

  &:hover
    background #eff6ff

.inherit-status
  display flex
  align-items center
  gap 8px

  .break-btn
    color #ef4444
    font-size 12px

    &:hover
      background #fef2f2

.dropdown-header
  padding 8px 16px
  font-size 12px
  font-weight 600
  color #6b7280
  background #f9fafb
  border-bottom 1px solid #f3f4f6

.credential-option
  padding 12px 16px !important

  .credential-option-content
    display flex
    flex-direction column
    gap 2px

    .credential-name
      font-weight 500
      color #1f2937

    .credential-user
      font-size 12px
      color #6b7280

.no-credentials-tip
  text-align center

  .tip-text
    font-size 10px
    color #9ca3af
    margin-top 4px

.password-edit-section
  display flex
  align-items center
  gap 16px

.password-status
  display flex
  align-items center
  gap 8px

.current-status
  font-size 14px
  color #6b7280

.password-switch
  flex-shrink 0

.password-input, .new-password-input
  flex 1

.new-password-input
  :deep(.el-input__wrapper)
    border-color #67c23a
    box-shadow 0 0 0 1px #67c23a inset

  :deep(.el-input__inner)
    color #67c23a

.form-hint
  font-size 12px
  color #9ca3af
  margin-top 8px
  display flex
  align-items center
  gap 4px

:deep(.credential-edit-dialog)
  .el-dialog__header
    padding 0

  .el-dialog__body
    padding 0

  .el-dialog__footer
    padding 16px 20px
    border-top 1px solid #f3f4f6
    background #f9fafb

:deep(.password-edit-section)
  .el-form-item__content
    flex-direction column
    align-items flex-start

  .password-status
    width 100%
    justify-content space-between
    margin-bottom 12px
    padding 12px
    background #f8fafc
    border-radius 6px
    border 1px solid #e2e8f0

:deep(.copy-dropdown .el-dropdown-menu)
  min-width 200px
.dialog-footer
  display flex
  justify-content flex-end
  align-items center
  .el-button
    width 100px
  .dialog-footer-text
    font-family 'Source Han Sans CN'
    font-size 12px
    color #9ca3af
    margin-right auto
    margin-left 60px
    &.en-US
      margin-left -10px
    a
      color #3b82f6
      &:hover
        text-decoration underline
</style>