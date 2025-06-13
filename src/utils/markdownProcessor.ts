import type { ThemeStyles } from '@/types'
import { BlockRenderer } from './blockRenderer'

/**
 * Markdown处理器
 * 负责识别特殊语法块并将其转换为图片链接
 */
export class MarkdownProcessor {
  private blockRenderer: BlockRenderer
  private processedBlocks: Map<string, string> = new Map()

  constructor(styles: ThemeStyles, isDark: boolean = false) {
    this.blockRenderer = new BlockRenderer(styles, isDark)
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
    const processingPromises: Promise<{ block: any, imageUrl: string }>[] = []

    for (const block of allBlocks) {
      // 检查缓存
      if (this.processedBlocks.has(block.id)) {
        processedContent = processedContent.replace(block.fullMatch, this.processedBlocks.get(block.id)!)
        continue
      }

      // 创建异步处理Promise
      const processingPromise = this.processBlockAsync(block, isPreview).then(result => ({
        block,
        imageUrl: result.imageUrl,
      }))

      processingPromises.push(processingPromise)
    }

    // 并发处理所有块
    if (processingPromises.length > 0) {
      try {
        const results = await Promise.all(processingPromises)

        // 替换所有处理完成的块
        for (const { block, imageUrl } of results) {
          const imageMarkdown = `![${block.type} ${block.lang || ``}](${imageUrl})`
          processedContent = processedContent.replace(block.fullMatch, imageMarkdown)
          this.processedBlocks.set(block.id, imageMarkdown)
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

    // 收集admonition块
    const admonitionRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gm
    match = admonitionRegex.exec(content)
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

      match = admonitionRegex.exec(content)
    }

    // 收集数学公式块
    const mathBlockRegex = /\$\$([\s\S]*?)\$\$/g
    match = mathBlockRegex.exec(content)
    while (match !== null) {
      const [fullMatch, formula] = match
      const blockId = this.generateBlockId(fullMatch)

      blocks.push({
        id: blockId,
        type: `math`,
        fullMatch,
        content: formula.trim(),
      })

      match = mathBlockRegex.exec(content)
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
   * 检查是否包含需要处理的特殊语法块
   */
  hasSpecialBlocks(content: string): boolean {
    const codeBlockRegex = /```\w*\n[\s\S]*?```/
    const admonitionRegex = /^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n(?:^>.*\n?)*/m
    const mathBlockRegex = /\$\$[\s\S]*?\$\$/

    return codeBlockRegex.test(content)
      || admonitionRegex.test(content)
      || mathBlockRegex.test(content)
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

    // Admonition块
    const admonitionRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gm
    match = admonitionRegex.exec(content)
    while (match !== null) {
      blocks.push({
        type: `admonition`,
        content: match[2].split(`\n`).map(line => line.replace(/^>\s?/, ``)).join(`\n`).trim(),
        lang: match[1].toLowerCase(),
      })
      match = admonitionRegex.exec(content)
    }

    // 数学公式块
    const mathBlockRegex = /\$\$([\s\S]*?)\$\$/g
    match = mathBlockRegex.exec(content)
    while (match !== null) {
      blocks.push({
        type: `math`,
        content: match[1].trim(),
      })
      match = mathBlockRegex.exec(content)
    }

    return blocks
  }
}
