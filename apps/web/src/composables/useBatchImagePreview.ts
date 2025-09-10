import { computed, reactive, readonly } from 'vue'
import { useStore } from '@/stores'
import { toBase64 } from '@/utils'
import { fileUpload } from '@/utils/file'

export interface ImageItem {
  id: string
  type: string
  index: number
  imageUrl: string
  contentHash: string
  uploaded: boolean
  uploading: boolean
  altText: string
}

interface BatchImagePreviewState {
  visible: boolean
  images: ImageItem[]
  markdownHash: string
  processing: boolean
}

const state = reactive<BatchImagePreviewState>({
  visible: false,
  images: [],
  markdownHash: ``,
  processing: false,
})

// 生成内容 hash
function generateContentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

// 生成图片 ID
function generateImageId(type: string, index: number): string {
  return `${type}-${index}`
}

// 从 localStorage 获取已上传的图片记录
function getUploadedImages(markdownHash: string): Set<string> {
  try {
    const stored = localStorage.getItem(`uploaded-images-${markdownHash}`)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  }
  catch {
    return new Set()
  }
}

// 保存已上传的图片记录到 localStorage
function saveUploadedImage(markdownHash: string, imageId: string) {
  try {
    const uploadedImages = getUploadedImages(markdownHash)
    uploadedImages.add(imageId)
    localStorage.setItem(`uploaded-images-${markdownHash}`, JSON.stringify([...uploadedImages]))
  }
  catch (error) {
    console.error(`保存上传记录失败:`, error)
  }
}

// 将 data URL 转换为 File 对象
function dataURLtoFile(dataURL: string, filename: string): File {
  const arr = dataURL.split(`,`)
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export function useBatchImagePreview() {
  const store = useStore()
  const { updateConversionMap } = store

  const showBatchPreview = (markdownContent: string) => {
    state.visible = true
    state.images = []
    state.markdownHash = generateContentHash(markdownContent)
    state.processing = true
  }

  const hideBatchPreview = () => {
    state.visible = false
    state.images = []
    state.markdownHash = ``
    state.processing = false
  }

  const addImage = (type: string, index: number, imageUrl: string, content: string) => {
    const imageId = generateImageId(type, index)
    const contentHash = generateContentHash(content)
    const uploadedImages = getUploadedImages(state.markdownHash)

    const imageItem: ImageItem = {
      id: imageId,
      type,
      index,
      imageUrl,
      contentHash,
      uploaded: uploadedImages.has(imageId),
      uploading: false,
      altText: `${type} ${index}`,
    }

    state.images.push(imageItem)
    console.log(`新增图片到 state.images:`, state.images.length)
  }

  const setProcessing = (processing: boolean) => {
    state.processing = processing
  }

  const uploadImage = async (imageId: string) => {
    const imageItem = state.images.find(img => img.id === imageId)
    if (!imageItem || imageItem.uploading || imageItem.uploaded) {
      return
    }

    imageItem.uploading = true

    try {
      console.log(`上传图片:`, imageId, imageItem.imageUrl)

      // 将 data URL 转换为 File 对象
      const filename = `${imageId}.png`
      const file = dataURLtoFile(imageItem.imageUrl, filename)

      // 使用真实的上传 API
      const base64Content = await toBase64(file)
      const uploadedUrl = await fileUpload(base64Content, file)

      // 更新图片 URL 为上传后的链接
      imageItem.imageUrl = uploadedUrl
      imageItem.uploaded = true
      imageItem.uploading = false

      // 保存到 localStorage
      saveUploadedImage(state.markdownHash, imageId)

      // 更新全局转换映射
      updateConversionMap(imageId, uploadedUrl)

      console.log(`图片上传成功:`, imageId, uploadedUrl)
      return uploadedUrl
    }
    catch (error) {
      console.error(`图片上传失败:`, error)
      imageItem.uploading = false
      throw error
    }
  }

  const uploadAllImages = async () => {
    const unuploadedImages = state.images.filter(img => !img.uploaded && !img.uploading)

    for (const imageItem of unuploadedImages) {
      await uploadImage(imageItem.id)
    }
  }

  const downloadImage = (imageId: string) => {
    const imageItem = state.images.find(img => img.id === imageId)
    if (!imageItem)
      return

    const link = document.createElement(`a`)
    link.href = imageItem.imageUrl
    link.download = `${imageItem.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 计算属性
  const totalImages = computed(() => state.images.length)
  const uploadedCount = computed(() => state.images.filter(img => img.uploaded).length)
  const uploadingCount = computed(() => state.images.filter(img => img.uploading).length)

  return {
    state: readonly(state),
    showBatchPreview,
    hideBatchPreview,
    addImage,
    setProcessing,
    uploadImage,
    uploadAllImages,
    downloadImage,
    totalImages,
    uploadedCount,
    uploadingCount,
  }
}

// 导出状态供组件使用
export const batchImagePreviewState = state
