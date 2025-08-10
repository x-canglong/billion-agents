import UpdateCredentialVue from './index.vue'
import { i18n } from '@/locales'
const { t } = i18n.global

export const showUpdateCredential = (options = {}, onSubmitCallback) => {
  // 创建弹框容器
  const mountNode = document.createElement('div')
  document.body.appendChild(mountNode)
  
  // 创建弹框组件
  const UpdateCredentialApp = defineComponent({
    setup() {
      const visible = ref(true)
      const modalRef = ref(null)
      
      // 处理提交/保存
      const handleSubmit = async (formData) => {
        try {
          console.log('提交的表单数据:', formData)
          
          // 调用回调函数
          if (typeof onSubmitCallback === 'function') {
            await onSubmitCallback(formData)
          }
          
          // 成功提示
          ElMessage.success(options.isCredentialEdit ? t('credential.saveSuccess') : t('common.success'))
          visible.value = false
          
        } catch (error) {
          console.error(options.isCredentialEdit ? '保存失败:' : '信息验证失败:', error)
          ElMessage.error((options.isCredentialEdit ? t('credential.saveFailed') : t('common.operationFailed')) + '：' + (error.message || t('common.unknownError')))
          
          // 重置加载状态
          if (modalRef.value) {
            modalRef.value.setLoading(false)
          }
        }
      }
      
      // 监听弹框关闭，销毁组件
      watch(visible, (newVal) => {
        if (!newVal) {
          // 延迟销毁，以便动画完成
          setTimeout(() => {
            app.unmount()
            document.body.removeChild(mountNode)
          }, 300)
        }
      })
      
      return () => h(UpdateCredentialVue, {
        visible: visible.value,
        'onUpdate:visible': (val) => { visible.value = val },
        credentialId: options.credentialId || '',
        credentials: options.credentials || [],
        isCredentialEdit: options.isCredentialEdit || false,
        onSubmit: handleSubmit,
        onSaved: handleSubmit, // 兼容两种事件名称
        ref: modalRef
      })
    }
  })
  
  // 挂载组件
  const app = createApp(UpdateCredentialApp)
  app.mount(mountNode)
  
  // 返回关闭方法
  return {
    close: () => {
      const appInstance = app._instance
      if (appInstance) {
        appInstance.proxy.visible = false
      }
    }
  }
}