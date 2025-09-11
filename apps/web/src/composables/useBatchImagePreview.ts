import { computed, reactive, readonly } from 'vue'
import { useStore } from '@/stores'
import { toBase64 } from '@/utils'
import { fileUpload } from '@/utils/file'

// 将 data URL 转换为 File 对象
function dataURLToFile(dataURL: string, filename: string): File {
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

export interface ImageItem {
  id: string
  type: string
  index: number
  imageUrl: string
  contentHash: string
  uploaded: boolean
  uploading: boolean
  altText: string
  fileSize?: number // 文件大小（字节）
  error?: string // 错误信息
  startLine?: number // 起始行号
  endLine?: number // 结束行号
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
  const key = `uploaded-images-${markdownHash}`
  const data = localStorage.getItem(key)
  return data ? new Set(JSON.parse(data)) : new Set<string>()
}

// 保存已上传的图片记录
function saveUploadedImage(markdownHash: string, imageId: string) {
  const uploadedImages = getUploadedImages(markdownHash)
  uploadedImages.add(imageId)
  const key = `uploaded-images-${markdownHash}`
  localStorage.setItem(key, JSON.stringify(Array.from(uploadedImages)))
}

function showBatchPreview(markdown: string) {
  state.markdownHash = generateContentHash(markdown)
  state.visible = true
  state.processing = false
}

function hideBatchPreview() {
  state.visible = false
  state.images = []
  state.markdownHash = ``
}

function addImage(
  type: string,
  index: number,
  imageUrl: string,
  content: string,
  startLine?: number,
  endLine?: number,
  id?: string, // 添加 id 参数
) {
  // 如果提供了 id，则使用它，否则生成一个新的 id
  const imageId = id || generateImageId(type, index)
  const contentHash = generateContentHash(content)
  const uploadedImages = getUploadedImages(state.markdownHash)

  const imageItem: ImageItem = {
    id: imageId, // 使用传入的 id 或生成的 id
    type,
    index,
    imageUrl,
    contentHash,
    uploaded: uploadedImages.has(imageId),
    uploading: false,
    altText: `${type} block ${index + 1}`,
    startLine,
    endLine,
  }

  state.images.push(imageItem)
}

function setProcessing(processing: boolean) {
  state.processing = processing
}

// 替换 Markdown 中的块元素为图片链接
async function replaceBlocksWithImageLinks(): Promise<boolean> {
  try {
    const store = useStore()

    // 检查是否所有图片都已上传
    const allUploaded = state.images.every(img => img.uploaded)
    if (!allUploaded) {
      console.error(`不是所有图片都已上传`)
      return false
    }

    // 构建转换映射，优先使用真实的ID
    const imageMap = new Map<string, string>()
    state.images.forEach((img) => {
      if (img.id) {
        // 使用真实的ID
        imageMap.set(img.id, img.imageUrl)
      }
      else {
        // 回退到旧的方式（type-index）
        imageMap.set(`${img.type}-${img.index}`, img.imageUrl)
      }
    })

    // 替换 Markdown 中的内容
    let result = store.originalMarkdown

    // 按照块在文档中的位置逆序替换，避免位置偏移
    // 按 endLine 降序排列，确保从后往前替换
    const sortedImages = [...state.images].sort((a, b) => {
      return (b.endLine || 0) - (a.endLine || 0)
    })

    console.debug(`原始内容行数:`, result.split(`\n`).length)
    console.debug(`按 endLine 排序的图片块:`, sortedImages.map(img => ({
      id: img.id,
      startLine: img.startLine,
      endLine: img.endLine,
      type: img.type,
    })))

    for (const img of sortedImages) {
      if (img.startLine !== undefined && img.endLine !== undefined) {
        const lines = result.split(`\n`)
        console.debug(`处理图片 ${img.id}`)
        console.debug(`  范围: 第${img.startLine}行到第${img.endLine}行`)
        console.debug(`  替换前总行数: ${lines.length}`)

        // 直接替换 [startLine, endLine] 范围内的行
        // 行号从1开始，数组索引从0开始
        const beforeLines = lines.slice(0, img.startLine - 1)
        const afterLines = lines.slice(img.endLine)
        const imageLink = `![](${img.imageUrl})`
        result = [...beforeLines, imageLink, ...afterLines].join(`\n`)

        console.debug(`  替换后总行数: ${result.split(`\n`).length}`)
      }
    }

    console.debug(`最终结果行数:`, result.split(`\n`).length)

    // 更新 store 状态
    store.convertedMarkdownV1 = result
    store.isImageReplaced = true

    // 更新转换映射
    imageMap.forEach((url, id) => {
      store.conversionMap.set(id, url)
    })

    return true
  }
  catch (error) {
    console.error(`替换块为图片链接时出错:`, error)
    return false
  }
}

async function uploadImage(imageId: string) {
  const imageItem = state.images.find(img => img.id === imageId)
  if (!imageItem) {
    throw new Error(`Image with id ${imageId} not found`)
  }

  // 如果已经上传，直接返回
  if (imageItem.uploaded) {
    return imageItem.imageUrl
  }

  imageItem.uploading = true
  imageItem.error = undefined // 清除之前的错误

  try {
    console.debug(`上传图片:`, imageId)

    // 将 data URL 转换为 File 对象
    const filename = `${imageId}.png`
    const file = dataURLToFile(imageItem.imageUrl, filename)

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
    const store = useStore()
    store.updateConversionMap(imageId, uploadedUrl)

    console.debug(`图片上传成功:`, imageId, uploadedUrl)

    return uploadedUrl
  }
  catch (error) {
    console.error(`图片上传失败:`, error)
    imageItem.uploading = false
    imageItem.error = error instanceof Error ? error.message : `上传失败`
    throw error
  }
}

async function uploadAllImages() {
  const unuploadedImages = state.images.filter(img => !img.uploaded && !img.uploading)

  if (unuploadedImages.length === 0) {
    return
  }

  console.debug(`开始并发上传 ${unuploadedImages.length} 张图片`)

  // 使用 Promise.allSettled 实现并发上传
  const uploadPromises = unuploadedImages.map(imageItem =>
    uploadImage(imageItem.id).catch((error) => {
      console.error(`图片 ${imageItem.id} 上传失败:`, error)
      return null // 返回 null 表示失败，但不影响其他上传
    }),
  )

  const results = await Promise.allSettled(uploadPromises)

  // 统计上传结果
  const successCount = results.filter(result =>
    result.status === `fulfilled` && result.value !== null,
  ).length
  const failureCount = results.filter(result =>
    result.status === `rejected` || (result.status === `fulfilled` && result.value === null),
  ).length

  console.debug(`批量上传完成: 成功 ${successCount}，失败 ${failureCount}`)

  // 不自动关闭预览，让用户可以选择"生成转图后 MD"
  // const allUploaded = state.images.every(img => img.uploaded)
  // if (allUploaded && state.images.length > 0) {
  //   setTimeout(() => {
  //     hideBatchPreview()
  //   }, 1500)
  // }
}

async function retryUpload(imageId: string) {
  const imageItem = state.images.find(img => img.id === imageId)
  if (!imageItem) {
    return
  }

  // 重置错误状态
  imageItem.error = undefined

  try {
    await uploadImage(imageId)
    console.debug(`重试上传成功: ${imageId}`)
  }
  catch (error) {
    console.error(`重试上传失败: ${imageId}`, error)
  }
}

function downloadImage(imageId: string) {
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

export function useBatchImagePreview() {
  return {
    state: readonly(state),
    showBatchPreview,
    hideBatchPreview,
    addImage,
    setProcessing,
    uploadImage,
    uploadAllImages,
    retryUpload,
    downloadImage,
    replaceBlocksWithImageLinks,
    totalImages,
    uploadedCount,
    uploadingCount,
  }
}

// 导出状态供组件使用
export const batchImagePreviewState = state
