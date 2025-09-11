import { snapdom } from '@zumer/snapdom'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { downloadMD } from '@/utils'
import { useBatchImagePreview } from './useBatchImagePreview'

export interface MarkdownBlock {
  type: `admonition` | `math` | `code`
  content: string
  startIndex: number
  endIndex: number
  startLine: number
  endLine: number
  sequenceIndex: number
  id: string // 唯一标识符
}

// 转图功能相关状态
const originalMarkdown = ref<string>(``) // 保存原始 markdown
const convertedMarkdownV1 = ref<string>(``) // 保存替换后的 v1 版本 markdown
const isImageReplaced = ref<boolean>(false) // 标记是否已替换为图片链接
const conversionMap = ref<Map<string, string>>(new Map()) // 存储转换映射关系
const isConverting = ref<boolean>(false) // 标记是否正在转换中

// 转图配置
const conversionConfig = ref({
  screenWidth: 800, // 屏幕宽度
  devicePixelRatio: 1, // 设备像素比
  convertAdmonition: true, // 转换 Admonition
  convertMathBlock: true, // 转换数学公式
  convertFencedBlock: true, // 转换代码块
})

// 计算字符位置对应的行号
function getLineNumber(markdown: string, charIndex: number): number {
  return markdown.substring(0, charIndex).split(`\n`).length
}

// 检查是否为嵌套块（一个块在其他块的起始行内）
function isNestedBlock(block: MarkdownBlock, allBlocks: MarkdownBlock[]): boolean {
  return allBlocks.some((otherBlock) => {
    // 跳过自己
    if (otherBlock === block)
      return false

    // 检查是否在其他块的范围内
    return block.startIndex > otherBlock.startIndex
      && block.endIndex < otherBlock.endIndex
  })
}

// 在markdown编辑区搜索并编号各类块元素
function findMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const allBlocks: MarkdownBlock[] = []
  let sequenceIndex = 0
  let blockIdCounter = 0

  // 生成唯一块ID
  const generateBlockId = (type: string) => {
    return `mktwain-${type}-${Date.now()}-${++blockIdCounter}`
  }

  // 查找 Admonition 块 (!!! 语法)
  // 从 ^!!! 开始，到连续两个空行止
  const admonitionRegex = /^!!![\s\S]*?\n\s*\n/gm
  let match
  match = admonitionRegex.exec(markdown)
  while (match !== null) {
    console.log(`\n=== Admonition 匹配结果 ===`)
    console.log(`匹配的内容:`, JSON.stringify(match[0]))
    console.log(`匹配的长度:`, match[0].length)
    console.log(`起始位置:`, match.index)
    console.log(`结束位置:`, match.index + match[0].length)

    const startLine = getLineNumber(markdown, match.index)
    const endLine = getLineNumber(markdown, match.index + match[0].length)

    console.log(`起始行号:`, startLine)
    console.log(`结束行号:`, endLine)

    allBlocks.push({
      type: `admonition`,
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      startLine,
      endLine,
      sequenceIndex: sequenceIndex++,
      id: generateBlockId(`admonition`), // 新增：生成唯一ID
    })
    match = admonitionRegex.exec(markdown)
  }

  // 查找数学公式块 ($$...$$)
  const mathRegex = /\$\$[\s\S]*?\$\$/g
  match = mathRegex.exec(markdown)
  while (match !== null) {
    const startLine = getLineNumber(markdown, match.index)
    const endLine = getLineNumber(markdown, match.index + match[0].length)

    allBlocks.push({
      type: `math`,
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      startLine,
      endLine,
      sequenceIndex: sequenceIndex++,
      id: generateBlockId(`math`), // 新增：生成唯一ID
    })
    match = mathRegex.exec(markdown)
  }

  // 查找代码块 (```...```)
  const codeRegex = /```[\s\S]*?```/g
  match = codeRegex.exec(markdown)
  while (match !== null) {
    const startLine = getLineNumber(markdown, match.index)
    const endLine = getLineNumber(markdown, match.index + match[0].length)

    allBlocks.push({
      type: `code`,
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      startLine,
      endLine,
      sequenceIndex: sequenceIndex++,
      id: generateBlockId(`code`), // 新增：生成唯一ID
    })
    match = codeRegex.exec(markdown)
  }

  // 按在文档中出现的顺序排序
  allBlocks.sort((a, b) => a.startIndex - b.startIndex)

  // 过滤掉嵌套块
  const nonNestedBlocks = allBlocks.filter(block => !isNestedBlock(block, allBlocks))

  console.log(`找到 ${allBlocks.length} 个块，过滤嵌套后剩余 ${nonNestedBlocks.length} 个块`)
  console.log(`非嵌套块详情:`, nonNestedBlocks.map(b => ({
    type: b.type,
    startLine: b.startLine,
    endLine: b.endLine,
    content: `${b.content.substring(0, 50)}...`,
  })))

  return nonNestedBlocks
}

export function useImageConversion() {
  // 转换元素为图片
  const convertElementToImage = async (element: HTMLElement, _type: string, _index: number) => {
    const prevWidth = element.style.width

    try {
      console.log(`\n=== 开始截图 第${_index + 1}个元素 ===`)
      console.log(`元素类型:`, _type)
      console.log(`元素标签:`, element.tagName)
      console.log(`元素类名:`, element.className)
      console.log(`元素ID:`, element.id)
      console.log(`元素内容长度:`, element.textContent?.length || 0)
      console.log(`元素innerHTML长度:`, element.innerHTML?.length || 0)

      // 检查元素位置和尺寸（设置宽度之前）
      const rectBefore = element.getBoundingClientRect()
      console.log(`设置宽度前 - 元素位置和尺寸:`, {
        x: rectBefore.x,
        y: rectBefore.y,
        width: rectBefore.width,
        height: rectBefore.height,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      })

      // 检查元素样式
      const computedStyle = getComputedStyle(element)
      console.log(`元素样式:`, {
        visibility: computedStyle.visibility,
        display: computedStyle.display,
        opacity: computedStyle.opacity,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        overflow: computedStyle.overflow,
        background: computedStyle.background,
        backgroundColor: computedStyle.backgroundColor,
      })

      // 检查元素是否在视窗内
      const isInViewport = rectBefore.top >= 0 && rectBefore.left >= 0
        && rectBefore.bottom <= window.innerHeight
        && rectBefore.right <= window.innerWidth
      console.log(`元素是否在视窗内:`, isInViewport)
      console.log(`视窗尺寸:`, { width: window.innerWidth, height: window.innerHeight })

      // 设置元素宽度
      element.style.width = `${conversionConfig.value.screenWidth}px`
      console.log(`设置宽度为:`, `${conversionConfig.value.screenWidth}px`)

      // 等待元素渲染完成
      await new Promise(resolve => setTimeout(resolve, 200))

      // 检查设置宽度后的尺寸
      const rectAfter = element.getBoundingClientRect()
      console.log(`设置宽度后 - 元素位置和尺寸:`, {
        x: rectAfter.x,
        y: rectAfter.y,
        width: rectAfter.width,
        height: rectAfter.height,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      })

      // 检查截图配置
      const screenshotConfig = {
        dpr: conversionConfig.value.devicePixelRatio || 2,
      }
      console.log(`截图配置:`, screenshotConfig)
      console.log(`设备像素比率:`, window.devicePixelRatio)

      // 滚动到元素位置确保可见
      element.scrollIntoView({ behavior: `instant`, block: `center` })
      await new Promise(resolve => setTimeout(resolve, 100))

      console.log(`准备调用 snapdom.toJpg...`)
      const imgElement = await snapdom.toJpg(element, screenshotConfig)
      console.log(`snapdom.toJpg 调用完成`)

      console.log(`截图结果分析:`)
      console.log(`- 返回对象类型:`, typeof imgElement)
      console.log(`- 是否为HTMLImageElement:`, imgElement instanceof HTMLImageElement)
      console.log(`- src 属性存在:`, !!imgElement.src)
      console.log(`- 图片URL长度:`, imgElement.src?.length || 0)

      if (imgElement.src) {
        console.log(`- 图片URL前100字符:`, imgElement.src.substring(0, 100))
        console.log(`- 是否为data URL:`, imgElement.src.startsWith(`data:`))

        // 分析 data URL 结构
        if (imgElement.src.startsWith(`data:`)) {
          const [header, data] = imgElement.src.split(`,`)
          console.log(`- Data URL header:`, header)
          console.log(`- Base64 数据长度:`, data?.length || 0)

          // 估算实际文件大小（Base64 编码后约为原始数据的 4/3）
          const estimatedSize = data ? Math.round((data.length * 3) / 4) : 0
          console.log(`- 估算文件大小:`, estimatedSize, `bytes`)

          if (estimatedSize < 1000) {
            console.error(`🚨 错误: 图片数据过小，截图可能失败！`)
            console.error(`- 可能原因: 元素不可见、尺寸为0、或截图库配置问题`)
          }
        }
      }
      else {
        console.error(`🚨 错误: 截图返回的对象没有 src 属性`)
      }

      return imgElement.src
    }
    catch (error) {
      console.error(`转换失败 [${_type}-${_index}]:`, error)
      console.error(`错误详情:`, {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw error
    }
    finally {
      element.style.width = prevWidth
      console.log(`恢复元素原始宽度:`, prevWidth || `auto`)
      console.log(`=== 截图处理完成 ===\n`)
    }
  }
  // 保存原始markdown内容
  const saveOriginalMarkdown = (content: string) => {
    originalMarkdown.value = content
    isImageReplaced.value = false
    console.log(`保存原始 Markdown 内容，长度: ${content.length}`)
  }

  // 更新转换映射（用于上传后更新 URL）
  const updateConversionMap = (elementId: string, imageUrl: string) => {
    conversionMap.value.set(elementId, imageUrl)
    console.log(`更新转换映射:`, elementId, imageUrl)
    console.log(`当前 conversionMap 大小:`, conversionMap.value.size)
    console.log(`当前 conversionMap 内容:`, Array.from(conversionMap.value.entries()))
  }

  // 使用上传后的图片链接替换 Markdown 中的块元素
  const replaceBlocksWithImageLinks = async (): Promise<boolean> => {
    if (!originalMarkdown.value) {
      toast.error(`没有原始 Markdown 内容`)
      return false
    }

    if (conversionMap.value.size === 0) {
      toast.error(`没有找到任何图片替换映射`)
      return false
    }

    console.log(`开始替换 Markdown 中的块元素，共 ${conversionMap.value.size} 个映射`)
    console.log(`映射内容:`, Array.from(conversionMap.value.entries()))

    try {
      let convertedMarkdown = originalMarkdown.value
      const markdownBlocks = findMarkdownBlocks(originalMarkdown.value)

      console.log(`找到 ${markdownBlocks.length} 个需要替换的块`)

      // 按照从后往前的顺序替换，以免位置偏移
      const sortedBlocks = [...markdownBlocks].sort((a, b) => b.startIndex - a.startIndex)

      let replacedCount = 0
      for (const block of sortedBlocks) {
        // 尝试直接匹配 block.id
        let imageUrl = conversionMap.value.get(block.id)

        if (!imageUrl) {
          // fallback: 尝试使用类型+索引的方式匹配
          const sameTypeBlocks = markdownBlocks.filter(b => b.type === block.type)
          const blockIndex = sameTypeBlocks.indexOf(block)
          const fallbackId = `${block.type}-${blockIndex}`
          imageUrl = conversionMap.value.get(fallbackId)
        }

        if (imageUrl) {
          console.log(`替换块: ${block.type} (${block.startIndex}-${block.endIndex}) -> ${imageUrl}`)

          // 生成图片 Markdown 语法
          const imageMarkdown = `![${block.type}](${imageUrl})`

          // 替换原文中的块内容
          convertedMarkdown = convertedMarkdown.substring(0, block.startIndex)
            + imageMarkdown
            + convertedMarkdown.substring(block.endIndex)

          replacedCount++
        }
        else {
          console.warn(`未找到块的图片替换: ${block.type} (ID: ${block.id})`)
        }
      }

      if (replacedCount > 0) {
        convertedMarkdownV1.value = convertedMarkdown
        isImageReplaced.value = true

        console.log(`替换完成，共替换 ${replacedCount} 个块`)
        toast.success(`替换完成，共替换 ${replacedCount} 个块`)
        return true
      }
      else {
        toast.error(`没有替换任何块，请检查图片是否已上传`)
        return false
      }
    }
    catch (error) {
      console.error(`替换失败:`, error)
      toast.error(`替换失败: ${(error as Error).message}`)
      return false
    }
  }

  // 转换元素为图片
  const convertElementsToImages = async () => {
    // 1. 首先基于 Markdown 内容找到需要转换的块
    const markdownBlocks = findMarkdownBlocks(originalMarkdown.value)

    if (markdownBlocks.length === 0) {
      console.log(`没有找到需要转换的块`)
      return
    }

    console.log(`找到 ${markdownBlocks.length} 个需要转换的块（已过滤嵌套）`)
    console.log(`块详情:`, markdownBlocks.map(b => ({ type: b.type, id: b.id, startLine: b.startLine, endLine: b.endLine })))

    // 2. 在 HTML 预览区找到对应的元素
    const previewElement = document.querySelector(`#output-wrapper > .preview`)
    if (!previewElement) {
      console.error(`找不到预览元素`)
      return
    }

    // 3. 直接通过 data-id 查找元素，无需动态添加
    const elementsToConvert: HTMLElement[] = []

    // 简化的 data-id 匹配逻辑
    const collectElementsByDataId = (blocks: MarkdownBlock[]): boolean => {
      let allFound = true

      console.log(`\n=== 开始收集元素 ===`)
      console.log(`需要处理的块:`, blocks.map(b => ({ type: b.type, id: b.id })))

      // 查找所有具有 mktwain-data-id 属性的元素
      const allElements = previewElement.querySelectorAll(`[mktwain-data-id]`)
      console.log(`找到 ${allElements.length} 个具有 data-id 的元素`)

      // 构建 data-id 到元素的映射
      const dataIdToElement = new Map<string, HTMLElement>()
      allElements.forEach((el) => {
        const dataId = el.getAttribute(`mktwain-data-id`)
        if (dataId) {
          dataIdToElement.set(dataId, el as HTMLElement)
          console.log(`映射: ${dataId} -> ${el.tagName}.${el.className}`)
        }
      })

      // 尝试直接匹配 (理想情况)
      blocks.forEach((block, index) => {
        console.log(`\n处理第 ${index} 个块: ${block.type} (ID: ${block.id})`)

        // 尝试直接用 block.id 匹配
        let element = dataIdToElement.get(block.id)

        if (element) {
          elementsToConvert.push(element)
          console.log(`  直接匹配成功: ${element.tagName}.${element.className}`)
        }
        else {
          // 如果直接匹配失败，fallback 到类型匹配 (当前方案)
          console.log(`  直接匹配失败，尝试类型匹配...`)

          const typeElements = Array.from(allElements).filter((el) => {
            if (block.type === `admonition`)
              return el.classList.contains(`admonition`)
            if (block.type === `math`)
              return el.classList.contains(`block_katex`)
            if (block.type === `code`)
              return el.tagName === `PRE` && el.classList.contains(`hljs`)
            return false
          })

          const typeBlocks = blocks.filter(b => b.type === block.type)
          const blockIndex = typeBlocks.indexOf(block)
          element = typeElements[blockIndex] as HTMLElement

          if (element) {
            elementsToConvert.push(element)
            console.log(`  类型匹配成功: ${element.tagName}.${element.className} (索引: ${blockIndex})`)
          }
          else {
            console.error(`  匹配失败: ${block.type} - ${block.id}`)
            console.log(`  可用的 data-id:`, Array.from(dataIdToElement.keys()))
            allFound = false
          }
        }
      })

      return allFound
    }

    // 直接收集所有有 data-id 的元素
    const allSuccess = collectElementsByDataId(markdownBlocks)

    if (!allSuccess) {
      toast.error(`找不到对应的HTML元素，停止转换`)
      return
    }

    // 4. 元素已经按照 Markdown 块的顺序收集，直接使用
    const sortedElements = elementsToConvert

    console.log(`\n=== 最终要转换的元素 ===`)
    console.log(`总数: ${sortedElements.length}`)
    sortedElements.forEach((element, index) => {
      const dataId = element.getAttribute(`mktwain-data-id`)
      const block = markdownBlocks[index] // 直接使用索引对应
      console.log(`${index}: ${block?.type} (data-id: ${dataId})`)
    })

    // 获取批量预览的 addImage 和 setProcessing 函数
    const { addImage, setProcessing } = useBatchImagePreview()

    // 5. 依次转换每个元素
    for (let i = 0; i < sortedElements.length; i++) {
      const element = sortedElements[i]
      const markdownBlock = markdownBlocks[i] // 直接使用索引对应
      const dataId = element.getAttribute(`mktwain-data-id`)!

      console.log(`\n正在转换第 ${i + 1}/${sortedElements.length} 个元素:`, {
        type: markdownBlock.type,
        id: markdownBlock.id,
        startLine: markdownBlock.startLine,
        endLine: markdownBlock.endLine,
        dataId,
        element,
      })

      try {
        const elementType = markdownBlock.type
        const imgDataUrl = await convertElementToImage(element, elementType, i)

        console.log(`第 ${i + 1} 个元素转换成功`)

        // 添加到批量预览，使用块ID作为图片ID
        addImage(
          elementType,
          i,
          imgDataUrl,
          markdownBlock.content,
          markdownBlock.startLine,
          markdownBlock.endLine,
        )
      }
      catch (error) {
        console.error(`第 ${i + 1} 个元素转换失败:`, error)
        // 继续转换下一个元素，不中断整个流程
        continue
      }
    }

    // 转换完成，设置处理状态为 false
    setProcessing(false)
  }

  // 执行转图操作
  const convertToImages = async (editorContent: string) => {
    try {
      // 导入批量预览状态检查
      const { state: batchState, hideBatchPreview } = useBatchImagePreview()

      // 检查是否已有已上传的图片
      const hasUploadedImages = batchState.images.some(img => img.uploaded)
      if (hasUploadedImages) {
        toast.info(`检测到已上传的图片，将清除当前状态并重新开始转图。`)
        // 清除当前状态，允许重新转图
        hideBatchPreview()
        conversionMap.value.clear()
        isImageReplaced.value = false
        convertedMarkdownV1.value = ``
      }

      isConverting.value = true

      // 1. 保存原始内容
      saveOriginalMarkdown(editorContent)

      // 2. 显示批量预览窗口
      const { showBatchPreview } = useBatchImagePreview()
      showBatchPreview(originalMarkdown.value)

      // 3. 转换元素为图片
      await convertElementsToImages(editorContent)

      return true
    }
    catch (error) {
      console.error(`转图失败:`, error)
      throw error
    }
    finally {
      isConverting.value = false
    }
  }

  // 复制转图后的 Markdown
  const copyConvertedMarkdownV1 = async (): Promise<boolean> => {
    if (!isImageReplaced.value || !convertedMarkdownV1.value) {
      toast.error(`没有转图后的 Markdown 内容，请先进行图片替换操作`)
      return false
    }

    try {
      await navigator.clipboard.writeText(convertedMarkdownV1.value)
      toast.success(`转图后 MD 内容已复制到剪贴板`)
      return true
    }
    catch (error) {
      console.error(`复制失败:`, error)
      // 降级到传统复制方式
      const textarea = document.createElement(`textarea`)
      textarea.value = convertedMarkdownV1.value
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand(`copy`)
      document.body.removeChild(textarea)

      if (success) {
        toast.success(`转图后 MD 内容已复制到剪贴板`)
        return true
      }
      else {
        toast.error(`复制失败，请手动复制`)
        return false
      }
    }
  }

  // 导出转图后的 Markdown
  const exportConvertedMarkdownV1 = (): boolean => {
    if (!isImageReplaced.value || !convertedMarkdownV1.value) {
      toast.error(`没有转图后的 Markdown 内容，请先进行图片替换操作`)
      return false
    }

    try {
      downloadMD(convertedMarkdownV1.value, `image-replaced`)
      return true
    }
    catch (error) {
      console.error(`导出失败:`, error)
      toast.error(`导出失败: ${(error as Error).message}`)
      return false
    }
  }

  return {
    // 状态
    originalMarkdown: computed(() => originalMarkdown.value),
    convertedMarkdownV1: computed(() => convertedMarkdownV1.value),
    isImageReplaced: computed(() => isImageReplaced.value),
    conversionMap: computed(() => conversionMap.value),
    isConverting: computed(() => isConverting.value),

    // 方法
    saveOriginalMarkdown,
    updateConversionMap,
    replaceBlocksWithImageLinks,
    convertToImages,
    copyConvertedMarkdownV1,
    exportConvertedMarkdownV1,
  }
}
