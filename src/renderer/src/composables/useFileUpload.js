import { Base64 } from 'js-base64';

export function useFileUpload(senderRef) {
  const { t } = useI18n()
  const files = ref([])
  const showHeaderFlog = ref(false)

  // 关闭文件头部
  const closeHeader = () => {
    showHeaderFlog.value = false
    console.log('closeHeader senderRef:', senderRef.value)
    // 直接使用传入的senderRef
    senderRef.value?.closeHeader()
  }

  // 文件上传前验证
  const handleBeforUpload = (file) => {
    // 定义允许的文件类型
    const allowedTypes = [
      // 文档类型
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      // 图片类型
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ]

    // 检查文件类型
    if (!allowedTypes.includes(file.type)) {
      ElMessage.error(t('chat.fileTypeNotSupported'))
      return false
    }

    // 检查文件大小
    if (file.size > 1024 * 1024 * 10) {
      ElMessage.error(t('chat.fileSizeLimit', { size: 10 }))
      return false
    }

    return true
  }

  // 拖拽上传处理
  const handleUploadDrop = async (droppedFiles, props) => {
    if (droppedFiles && droppedFiles.length > 0) {
      if (droppedFiles[0].type === '') {
        ElMessage.error(t('chat.folderUploadNotAllowed'))
        return false
      }

      for (let index = 0; index < droppedFiles.length; index++) {
        const file = droppedFiles[index]
        await handleHttpRequest({ file })
      }
    }
  }

  // HTTP请求处理
  const handleHttpRequest = async (options) => {
    const formData = new FormData()
    formData.append('file', options.file)
    
    try {
      const uploadRes = await uploadFile(formData)
      console.log('handleHttpRequest senderRef:', senderRef.value)
      // 直接使用传入的senderRef
      senderRef.value?.openHeader()
      
      const fileUrl = uploadRes.data?.file?.url || URL.createObjectURL(options.file)
      const res = {
        message: '文件上传成功',
        fileName: uploadRes.data?.file?.filename,
        uid: options.file.uid,
        fileSize: options.file.size,
        imgFile: options.file
      }
      files.value = files.value.filter((item) => item.url)
      files.value.push({
        ...uploadRes.data?.file,
        id: files.value.length,
        uid: res.uid,
        name: res.fileName,
        url: fileUrl,
        fileSize: res.fileSize,
        imgFile: res.imgFile,
        showDelIcon: true,
        imgVariant: 'square'
      })
      ElMessage.success(t('chat.uploadSuccess'))
    } catch (err) {
      ElMessage.error(t('chat.fileUploadFailed'))
    }
  }

  // 删除文件卡片
  const handleDeleteCard = (item) => {
    files.value = files.value.filter((items) => items.id !== item.id)
    ElMessage.success(t('common.success'))
  }

  return {
    files,
    showHeaderFlog,
    senderRef,
    closeHeader,
    handleBeforUpload,
    handleUploadDrop,
    handleHttpRequest,
    handleDeleteCard
  }
} 