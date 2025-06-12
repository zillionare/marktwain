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
   */
  async processMarkdown(content: string): Promise<string> {
    let processedContent = content

    // 1. 处理代码块（包括mermaid）
    processedContent = await this.processCodeBlocks(processedContent)

    // 2. 处理admonition块
    processedContent = await this.processAdmonitionBlocks(processedContent)

    // 3. 处理数学公式块
    processedContent = await this.processMathBlocks(processedContent)

    return processedContent
  }

  /**
   * 处理代码块
   */
  private async processCodeBlocks(content: string): Promise<string> {
    // 匹配fenced code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const matches = Array.from(content.matchAll(codeBlockRegex))

    for (const match of matches) {
      const [fullMatch, lang = ``, code] = match
      const blockId = this.generateBlockId(fullMatch)

      if (this.processedBlocks.has(blockId)) {
        content = content.replace(fullMatch, this.processedBlocks.get(blockId)!)
        continue
      }

      try {
        let imageUrl: string

        if (lang.toLowerCase() === `mermaid`) {
          // 处理mermaid图表
          imageUrl = await this.blockRenderer.renderMermaidChart(code.trim())
        }
        else {
          // 处理普通代码块
          imageUrl = await this.blockRenderer.renderCodeBlock(code.trim(), lang)
        }

        const imageMarkdown = `![${lang} code block](${imageUrl})`
        this.processedBlocks.set(blockId, imageMarkdown)
        content = content.replace(fullMatch, imageMarkdown)
      }
      catch (error) {
        console.error(`Failed to render code block:`, error)
        // 如果渲染失败，保留原始代码块
      }
    }

    return content
  }

  /**
   * 处理admonition块
   */
  private async processAdmonitionBlocks(content: string): Promise<string> {
    // 匹配GitHub风格的admonition语法: > [!NOTE] 等
    const admonitionRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gm
    const matches = Array.from(content.matchAll(admonitionRegex))

    for (const match of matches) {
      const [fullMatch, type, contentLines] = match
      const blockId = this.generateBlockId(fullMatch)

      if (this.processedBlocks.has(blockId)) {
        content = content.replace(fullMatch, this.processedBlocks.get(blockId)!)
        continue
      }

      try {
        // 提取admonition内容（去掉引用符号）
        const admonitionContent = contentLines
          .split(`\n`)
          .map(line => line.replace(/^>\s?/, ``))
          .join(`\n`)
          .trim()

        const imageUrl = await this.blockRenderer.renderAdmonitionBlock(
          admonitionContent,
          type.toLowerCase(),
        )

        const imageMarkdown = `![${type} admonition](${imageUrl})`
        this.processedBlocks.set(blockId, imageMarkdown)
        content = content.replace(fullMatch, imageMarkdown)
      }
      catch (error) {
        console.error(`Failed to render admonition block:`, error)
        // 如果渲染失败，保留原始块
      }
    }

    return content
  }

  /**
   * 处理数学公式块
   */
  private async processMathBlocks(content: string): Promise<string> {
    // 处理块级数学公式 $$...$$
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g
    const blockMatches = Array.from(content.matchAll(blockMathRegex))

    for (const match of blockMatches) {
      const [fullMatch, formula] = match
      const blockId = this.generateBlockId(fullMatch)

      if (this.processedBlocks.has(blockId)) {
        content = content.replace(fullMatch, this.processedBlocks.get(blockId)!)
        continue
      }

      try {
        const imageUrl = await this.blockRenderer.renderMathBlock(formula.trim(), false)
        const imageMarkdown = `![Math formula](${imageUrl})`
        this.processedBlocks.set(blockId, imageMarkdown)
        content = content.replace(fullMatch, imageMarkdown)
      }
      catch (error) {
        console.error(`Failed to render math block:`, error)
        // 如果渲染失败，保留原始公式
      }
    }

    // 处理行内数学公式 $...$（可选，根据需求决定是否启用）
    // const inlineMathRegex = /\$([^$\n]+?)\$/g
    // const inlineMatches = Array.from(content.matchAll(inlineMathRegex))

    // for (const match of inlineMatches) {
    //   const [fullMatch, formula] = match
    //   const blockId = this.generateBlockId(fullMatch)

    //   if (this.processedBlocks.has(blockId)) {
    //     content = content.replace(fullMatch, this.processedBlocks.get(blockId)!)
    //     continue
    //   }

    //   try {
    //     const imageUrl = await this.blockRenderer.renderMathBlock(formula.trim(), true)
    //     const imageMarkdown = `![Inline math](${imageUrl})`
    //     this.processedBlocks.set(blockId, imageMarkdown)
    //     content = content.replace(fullMatch, imageMarkdown)
    //   } catch (error) {
    //     console.error(`Failed to render inline math:`, error)
    //   }
    // }

    return content
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
