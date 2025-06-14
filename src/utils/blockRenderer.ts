import type { ThemeStyles } from '@/types'
import html2canvas from 'html2canvas'
import { BlockRenderer } from './blockRenderer'
import { uploadImageToGitHub } from './githubImageBed'
import { imageCache } from './imageCache'

/**
 * Markdown处理器
 * 负责识别特殊语法块并将其转换为图片链接
 */
export class MarkdownProcessor {
  private blockRenderer: BlockRenderer
  private processedBlocks: Map<string, string> = new Map()

  constructor(styles: ThemeStyles, isDark: boolean = false, imageWidth: number = 800, githubConfig?: any) {
    this.blockRenderer = new BlockRenderer(styles, isDark, imageWidth, githubConfig)
  }

  /**
   * 处理markdown内容，将特殊语法块转换为图片
   * 使用并发处理提高性能
   */
  async processMarkdown(content: string, isPreview: boolean = false): Promise<string> {
    // 收集所有需要处理的块
    const allBlocks = this.collectAllBlocks(content)

    if (allBlocks.length === 0) {
      return content
    }

    console.log(`Found ${allBlocks.length} blocks to process, starting concurrent processing...`)

    let processedContent = content
    const processingPromises: Promise<{ block: any, imageUrl: string, cacheKey: string }>[] = []

    for (const block of allBlocks) {
      // 生成包含模式信息的缓存键
      const cacheKey = `${block.id}_${isPreview ? `preview` : `upload`}`

      // 检查缓存
      if (this.processedBlocks.has(cacheKey)) {
        console.log(`Using cached result for ${block.type} block (${isPreview ? `preview` : `upload`} mode)`)
        processedContent = processedContent.replace(block.fullMatch, this.processedBlocks.get(cacheKey)!)
        continue
      }

      // 创建异步处理Promise
      const processingPromise = this.processBlockAsync(block, isPreview).then(result => ({
        block,
        imageUrl: result.imageUrl,
        cacheKey,
      }))

      processingPromises.push(processingPromise)
    }

    // 并发处理所有块
    if (processingPromises.length > 0) {
      try {
        const results = await Promise.all(processingPromises)

        // 替换所有处理完成的块
        for (const { block, imageUrl, cacheKey } of results) {
          const imageMarkdown = `![${block.type} ${block.lang || ``}](${imageUrl})`
          processedContent = processedContent.replace(block.fullMatch, imageMarkdown)
          this.processedBlocks.set(cacheKey, imageMarkdown)
          console.log(`Cached result for ${block.type} block with key: ${cacheKey}`)
        }

        console.log(`All ${results.length} blocks processed successfully`)
      }
      catch (error) {
        console.error(`Some blocks failed to process:`, error)
        // 继续处理，不阻塞整个流程
      }
    }

    return processedContent
  }

  /**
   * 收集所有需要处理的块
   */
  private collectAllBlocks(content: string): Array<{
    id: string
    type: string
    fullMatch: string
    content: string
    lang?: string
  }> {
    const blocks: Array<{
      id: string
      type: string
      fullMatch: string
      content: string
      lang?: string
    }> = []

    // 收集代码块
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let match = codeBlockRegex.exec(content)
    while (match !== null) {
      const [fullMatch, lang = ``, code] = match
      const blockId = this.generateBlockId(fullMatch)

      blocks.push({
        id: blockId,
        type: lang.toLowerCase() === `mermaid` ? `mermaid` : `code`,
        fullMatch,
        content: code.trim(),
        lang: lang || `text`,
      })

      match = codeBlockRegex.exec(content)
    }

    // 收集GMF admonition块 (> [!NOTE])
    const gmfAdmonitionRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gm
    match = gmfAdmonitionRegex.exec(content)
    while (match !== null) {
      const [fullMatch, type, contentLines] = match
      const blockId = this.generateBlockId(fullMatch)

      const admonitionContent = contentLines
        .split(`\n`)
        .map(line => line.replace(/^>\s?/, ``))
        .join(`\n`)
        .trim()

      blocks.push({
        id: blockId,
        type: `admonition`,
        fullMatch,
        content: admonitionContent,
        lang: type.toLowerCase(),
      })

      match = gmfAdmonitionRegex.exec(content)
    }

    // 收集CommonMark admonition块 (!!! note)
    const commonMarkAdmonitionRegex = /^!!!\s+(note|tip|important|warning|caution|info|success|failure|danger|bug|example|quote)(?:\s+"([^"]*)")?\s*\n((?: {4}.*(?:\n|$))*)/gm
    match = commonMarkAdmonitionRegex.exec(content)
    while (match !== null) {
      const [fullMatch, type, title, contentLines] = match
      const blockId = this.generateBlockId(fullMatch)

      // 处理缩进内容
      const admonitionContent = contentLines
        .split(`\n`)
        .map(line => line.replace(/^ {4}/, ``)) // 移除4个空格的缩进
        .join(`\n`)
        .trim()

      // 如果有自定义标题，将其添加到内容前面
      const finalContent = title ? `**${title}**\n\n${admonitionContent}` : admonitionContent

      blocks.push({
        id: blockId,
        type: `admonition`,
        fullMatch,
        content: finalContent,
        lang: type.toLowerCase(),
      })

      match = commonMarkAdmonitionRegex.exec(content)
    }

    return blocks
  }

  /**
   * 异步处理单个块
   */
  private async processBlockAsync(
    block: { id: string, type: string, content: string, lang?: string },
    isPreview: boolean = false,
  ): Promise<{ blockId: string, imageUrl: string }> {
    try {
      console.log(`Processing ${block.type} block...`)

      let imageUrl: string

      switch (block.type) {
        case `mermaid`:
          imageUrl = await this.blockRenderer.renderMermaidChart(block.content, isPreview)
          break
        case `code`:
          imageUrl = await this.blockRenderer.renderCodeBlock(block.content, block.lang || `text`, isPreview)
          break
        case `admonition`:
          imageUrl = await this.blockRenderer.renderAdmonitionBlock(block.content, block.lang || `note`, isPreview)
          break
        case `math`:
          imageUrl = await this.blockRenderer.renderMathBlock(block.content, false, isPreview)
          break
        default:
          throw new Error(`Unknown block type: ${block.type}`)
      }

      console.log(`Successfully processed ${block.type} block: ${imageUrl}`)
      return { blockId: block.id, imageUrl }
    }
    catch (error) {
      console.error(`Failed to process ${block.type} block:`, error)
      throw error
    }
  }

  /**
   * 生成块的唯一ID
   */
  private generateBlockId(content: string): string {
    // 使用内容的哈希作为ID
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 清除处理缓存
   */
  clearCache(): void {
    this.processedBlocks.clear()
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(): { totalBlocks: number, processedBlocks: number } {
    return {
      totalBlocks: this.processedBlocks.size,
      processedBlocks: Array.from(this.processedBlocks.values()).filter(v => v.startsWith(`![`)).length,
    }
  }

  /**
   * 新的处理方法：截图预览区的特殊语法块并上传到GitHub
   */
  async processMarkdownWithScreenshot(content: string): Promise<string> {
    // 收集所有需要处理的块
    const allBlocks = this.collectAllBlocks(content)

    if (allBlocks.length === 0) {
      return content
    }

    console.log(`Found ${allBlocks.length} blocks to process with screenshot...`)

    // 给预览区的元素添加ID，以便精确匹配
    this.addBlockIdsToPreviewElements(allBlocks)

    // 收集所有需要上传的图片
    const imagesToUpload: Array<{ block: any, base64Content: string, filename: string }> = []
    let processedContent = content

    for (const block of allBlocks) {
      try {
        // 生成缓存键
        const cacheKey = `${block.id}_screenshot`

        // 检查缓存
        if (this.processedBlocks.has(cacheKey)) {
          console.log(`Using cached result for ${block.type} block`)
          processedContent = processedContent.replace(block.fullMatch, this.processedBlocks.get(cacheKey)!)
          continue
        }

        // 截图预览区的对应元素
        const base64Content = await this.screenshotBlock(block)
        const filename = `${block.type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`

        imagesToUpload.push({ block, base64Content, filename })
      }
      catch (error) {
        console.error(`Failed to process ${block.type} block:`, error)
        // 继续处理其他块
      }
    }

    // 批量上传所有图片
    if (imagesToUpload.length > 0) {
      console.log(`Uploading ${imagesToUpload.length} images to GitHub...`)
      const uploadResults = await this.batchUploadImages(imagesToUpload)

      // 替换原始内容
      for (const result of uploadResults) {
        const imageMarkdown = `![${result.block.type} ${result.block.lang || ``}](${result.imageUrl})`
        processedContent = processedContent.replace(result.block.fullMatch, imageMarkdown)

        const cacheKey = `${result.block.id}_screenshot`
        this.processedBlocks.set(cacheKey, imageMarkdown)
        console.log(`Processed ${result.block.type} block with screenshot: ${result.imageUrl}`)
      }
    }

    return processedContent
  }

  /**
   * 给预览区的元素添加block ID，以便精确匹配
   */
  private addBlockIdsToPreviewElements(blocks: Array<{ id: string, type: string, content: string, lang?: string }>): void {
    const previewContainer = document.querySelector(`#output`)
    if (!previewContainer) {
      console.warn(`Preview container not found`)
      return
    }

    for (const block of blocks) {
      try {
        let targetElement: Element | null = null

        switch (block.type) {
          case `code`:
          case `mermaid`: {
            if (block.lang === `mermaid`) {
              // Mermaid图表
              const mermaidElements = previewContainer.querySelectorAll(`.mermaid, svg[id*="mermaid"]`)
              targetElement = mermaidElements.length > 0 ? mermaidElements[0] : null
            }
            else {
              // 代码块
              const codeBlocks = previewContainer.querySelectorAll(`pre`)
              targetElement = this.findMatchingCodeBlock(codeBlocks, block.content)
            }
            break
          }
          case `admonition`: {
            // Admonition块
            const admonitionBlocks = previewContainer.querySelectorAll(`blockquote`)
            targetElement = this.findMatchingAdmonitionBlock(admonitionBlocks, block.content)
            break
          }
        }

        if (targetElement) {
          // 添加ID属性
          targetElement.setAttribute(`data-block-id`, block.id)

          // 添加宽度限制，确保截图大小正常
          const imageWidth = this.blockRenderer.getImageWidth()
          const htmlElement = targetElement as HTMLElement
          htmlElement.style.maxWidth = `${imageWidth}px`
          htmlElement.style.width = `100%`
          htmlElement.style.boxSizing = `border-box`

          // 对于代码块，还需要处理内部的code元素
          if (block.type === `code` || block.type === `mermaid`) {
            const codeElement = htmlElement.querySelector(`code`)
            if (codeElement) {
              const codeHtmlElement = codeElement as HTMLElement
              codeHtmlElement.style.maxWidth = `${imageWidth - 40}px` // 减去padding
              codeHtmlElement.style.wordWrap = `break-word`
              codeHtmlElement.style.whiteSpace = `pre-wrap`
            }
          }

          console.log(`Added ID ${block.id} and width limit ${imageWidth}px to ${block.type} element`)
        }
      }
      catch (error) {
        console.warn(`Failed to add ID to ${block.type} element:`, error)
      }
    }
  }

  /**
   * 截图单个块并返回base64内容
   */
  private async screenshotBlock(block: { id: string, type: string, content: string, lang?: string }): Promise<string> {
    const previewContainer = document.querySelector(`#output`)
    if (!previewContainer) {
      throw new Error(`Preview container not found`)
    }

    // 首先尝试通过ID精确匹配
    const targetElementById = previewContainer.querySelector(`[data-block-id="${block.id}"]`)
    let targetElement: Element | null = targetElementById

    if (!targetElement) {
      console.log(`Could not find element by ID ${block.id}, falling back to content matching...`)

      // 回退到内容匹配
      switch (block.type) {
        case `code`:
        case `mermaid`: {
          if (block.lang === `mermaid`) {
            const mermaidElements = previewContainer.querySelectorAll(`.mermaid, svg[id*="mermaid"]`)
            targetElement = mermaidElements.length > 0 ? mermaidElements[0] : null
          }
          else {
            const codeBlocks = previewContainer.querySelectorAll(`pre`)
            targetElement = this.findMatchingCodeBlock(codeBlocks, block.content)
          }
          break
        }
        case `admonition`: {
          const admonitionBlocks = previewContainer.querySelectorAll(`blockquote`)
          targetElement = this.findMatchingAdmonitionBlock(admonitionBlocks, block.content)
          break
        }
      }
    }

    if (!targetElement) {
      throw new Error(`Could not find matching element for ${block.type} block`)
    }

    console.log(`Found target element for ${block.type} (ID: ${block.id}):`, targetElement)

    // 使用html2canvas截图
    const canvas = await html2canvas(targetElement as HTMLElement, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      ignoreElements: (element) => {
        return element.tagName === `SCRIPT` || element.tagName === `STYLE`
      },
      onclone: (clonedDoc) => {
        const styleSheets = clonedDoc.querySelectorAll(`link[rel="stylesheet"]`)
        styleSheets.forEach((sheet) => {
          try {
            if (sheet instanceof HTMLLinkElement && sheet.sheet) {
              void sheet.sheet.cssRules // 尝试访问规则以检测跨域问题
            }
          }
          catch {
            sheet.remove()
          }
        })
      },
      logging: false,
    })

    // 转换为base64
    const dataUrl = canvas.toDataURL(`image/png`)
    return dataUrl.split(`,`)[1] // 返回base64内容，不包含前缀
  }

  /**
   * 批量上传图片到GitHub
   */
  private async batchUploadImages(imagesToUpload: Array<{ block: any, base64Content: string, filename: string }>): Promise<Array<{ block: any, imageUrl: string }>> {
    const results: Array<{ block: any, imageUrl: string }> = []

    for (const { block, base64Content, filename } of imagesToUpload) {
      try {
        // 检查缓存，避免重复上传
        const imageStatus = imageCache.getImageStatus(base64Content)
        if (imageStatus.isUploaded && imageStatus.url) {
          console.log(`Using already uploaded image: ${imageStatus.url}`)
          results.push({ block, imageUrl: imageStatus.url })
          continue
        }

        // 上传到GitHub
        const imageUrl = await uploadImageToGitHub(base64Content, filename, block.type)
        imageCache.cacheImage(base64Content, imageUrl, block.type, true)

        results.push({ block, imageUrl })
        console.log(`Uploaded ${block.type} image: ${imageUrl}`)
      }
      catch (error) {
        console.error(`Failed to upload ${block.type} image:`, error)
        throw error
      }
    }

    return results
  }

  /**
   * 截图预览区的特殊语法块并上传到GitHub (旧方法，保留兼容性)
   */
  private async screenshotAndUploadBlock(block: { id: string, type: string, content: string, lang?: string }): Promise<string> {
    // 查找预览区中对应的元素
    const previewContainer = document.querySelector(`#output`)
    if (!previewContainer) {
      throw new Error(`Preview container not found`)
    }

    // 首先尝试通过ID精确匹配
    const targetElementById = previewContainer.querySelector(`[data-block-id="${block.id}"]`)
    let targetElement: Element | null = targetElementById

    if (!targetElement) {
      console.log(`Could not find element by ID ${block.id}, falling back to content matching...`)

      // 回退到内容匹配
      switch (block.type) {
        case `code`:
        case `mermaid`: {
          if (block.lang === `mermaid`) {
            // Mermaid图表
            const mermaidElements = previewContainer.querySelectorAll(`.mermaid, svg[id*="mermaid"]`)
            targetElement = mermaidElements.length > 0 ? mermaidElements[0] : null
          }
          else {
            // 代码块
            const codeBlocks = previewContainer.querySelectorAll(`pre`)
            targetElement = this.findMatchingCodeBlock(codeBlocks, block.content)
          }
          break
        }
        case `admonition`: {
          // Admonition块
          const admonitionBlocks = previewContainer.querySelectorAll(`blockquote`)
          targetElement = this.findMatchingAdmonitionBlock(admonitionBlocks, block.content)
          break
        }
      }
    }

    if (!targetElement) {
      console.warn(`Could not find matching element for ${block.type} block (ID: ${block.id})`)
      console.warn(`Available elements:`, previewContainer.children)
      throw new Error(`Could not find matching element for ${block.type} block`)
    }

    console.log(`Found target element for ${block.type} (ID: ${block.id}):`, targetElement)

    // 使用html2canvas截图
    const canvas = await html2canvas(targetElement as HTMLElement, {
      backgroundColor: null,
      scale: 2, // 提高分辨率
      useCORS: true,
      allowTaint: true,
      ignoreElements: (element) => {
        // 忽略可能导致问题的元素
        return element.tagName === `SCRIPT` || element.tagName === `STYLE`
      },
      onclone: (clonedDoc) => {
        // 在克隆的文档中移除可能导致跨域问题的样式表
        const styleSheets = clonedDoc.querySelectorAll(`link[rel="stylesheet"]`)
        styleSheets.forEach((sheet) => {
          try {
            // 尝试访问样式表，如果失败就移除
            if (sheet instanceof HTMLLinkElement && sheet.sheet) {
              void sheet.sheet.cssRules // 尝试访问规则
            }
          }
          catch {
            sheet.remove()
          }
        })
      },
      logging: false, // 禁用日志以减少控制台噪音
    })

    // 转换为base64
    const dataUrl = canvas.toDataURL(`image/png`)
    const base64Content = dataUrl.split(`,`)[1]

    // 检查缓存，避免重复上传
    const imageStatus = imageCache.getImageStatus(base64Content)
    if (imageStatus.isUploaded && imageStatus.url) {
      console.log(`Using already uploaded image: ${imageStatus.url}`)
      return imageStatus.url
    }

    // 上传到GitHub
    const imageUrl = await uploadImageToGitHub(base64Content, `${block.type}-${Date.now()}.png`, block.type)
    imageCache.cacheImage(base64Content, imageUrl, block.type, true)

    return imageUrl
  }

  /**
   * 查找匹配的代码块元素
   */
  private findMatchingCodeBlock(elements: NodeListOf<Element>, content: string): Element | null {
    const cleanContent = content.trim()

    // 首先尝试精确匹配
    for (const element of elements) {
      const elementText = (element.textContent || ``).trim()

      // 精确匹配
      if (elementText === cleanContent) {
        return element
      }
    }

    // 如果精确匹配失败，尝试部分匹配
    for (const element of elements) {
      const elementText = (element.textContent || ``).trim()

      // 部分匹配：检查是否包含代码的关键部分
      if (cleanContent.length > 10) {
        // 取代码的前30个字符和后30个字符进行匹配
        const startPart = cleanContent.substring(0, Math.min(30, cleanContent.length))
        const endPart = cleanContent.length > 30 ? cleanContent.substring(cleanContent.length - 30) : ``

        if (elementText.includes(startPart) && (endPart === `` || elementText.includes(endPart))) {
          return element
        }
      }
    }

    // 最后的回退：返回第一个未被使用的元素
    for (const element of elements) {
      if (!element.hasAttribute(`data-block-id`)) {
        return element
      }
    }

    return null
  }

  /**
   * 查找匹配的admonition块元素
   */
  private findMatchingAdmonitionBlock(elements: NodeListOf<Element>, content: string): Element | null {
    const cleanContent = content.replace(/^\*\*.*?\*\*\n\n/, ``).trim()

    // 首先尝试精确匹配
    for (const element of elements) {
      const elementText = (element.textContent || ``).trim()

      // 精确匹配：检查是否包含完整内容
      if (elementText.includes(cleanContent)) {
        return element
      }
    }

    // 如果精确匹配失败，尝试部分匹配
    for (const element of elements) {
      const elementText = (element.textContent || ``).trim()

      // 部分匹配：检查是否包含内容的关键部分
      if (cleanContent.length > 10) {
        const keyPart = cleanContent.substring(0, Math.min(30, cleanContent.length))
        if (elementText.includes(keyPart)) {
          return element
        }
      }
    }

    // 最后的回退：返回第一个未被使用的元素
    for (const element of elements) {
      if (!element.hasAttribute(`data-block-id`)) {
        return element
      }
    }

    return null
  }

  /**
   * 检查是否包含需要处理的特殊语法块
   */
  hasSpecialBlocks(content: string): boolean {
    const codeBlockRegex = /```\w*\n[\s\S]*?```/
    const gmfAdmonitionRegex = /^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n(?:^>.*\n?)*/m
    const commonMarkAdmonitionRegex = /^!!!\s+(?:note|tip|important|warning|caution|info|success|failure|danger|bug|example|quote)/m

    return codeBlockRegex.test(content)
      || gmfAdmonitionRegex.test(content)
      || commonMarkAdmonitionRegex.test(content)
  }

  /**
   * 预览模式：返回将要被处理的块的信息
   */
  previewProcessing(content: string): Array<{ type: string, content: string, lang?: string }> {
    const blocks: Array<{ type: string, content: string, lang?: string }> = []

    // 代码块
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let match = codeBlockRegex.exec(content)
    while (match !== null) {
      blocks.push({
        type: match[1]?.toLowerCase() === `mermaid` ? `mermaid` : `code`,
        content: match[2].trim(),
        lang: match[1] || `text`,
      })
      match = codeBlockRegex.exec(content)
    }

    // GMF Admonition块
    const gmfAdmonitionRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gm
    match = gmfAdmonitionRegex.exec(content)
    while (match !== null) {
      blocks.push({
        type: `admonition`,
        content: match[2].split(`\n`).map(line => line.replace(/^>\s?/, ``)).join(`\n`).trim(),
        lang: match[1].toLowerCase(),
      })
      match = gmfAdmonitionRegex.exec(content)
    }

    // CommonMark Admonition块
    const commonMarkAdmonitionRegex = /^!!!\s+(note|tip|important|warning|caution|info|success|failure|danger|bug|example|quote)(?:\s+"([^"]*)")?\s*\n((?:(?: {4}|\t).*(?:\n|$))*)/gm
    match = commonMarkAdmonitionRegex.exec(content)
    while (match !== null) {
      const [, type, title, contentLines] = match
      const admonitionContent = contentLines
        .split(`\n`)
        .map((line) => {
          if (line.startsWith(`    `)) {
            return line.slice(4)
          }
          else if (line.startsWith(`\t`)) {
            return line.slice(1)
          }
          else if (line.trim() === ``) {
            return ``
          }
          return line
        })
        .join(`\n`)
        .trim()

      const finalContent = title ? `**${title}**\n\n${admonitionContent}` : admonitionContent

      blocks.push({
        type: `admonition`,
        content: finalContent,
        lang: type.toLowerCase(),
      })
      match = commonMarkAdmonitionRegex.exec(content)
    }

    return blocks
  }
}
