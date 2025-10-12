/**
 * 行号跟踪工具
 * 用于在 Markdown 渲染过程中为 DOM 元素添加 data-line 属性
 */

/**
 * 计算给定文本在原始 markdown 中的起始行号
 * @param originalText - 原始 markdown 文本
 * @param tokenRaw - token 的 raw 属性（原始文本片段）
 * @param lastSearchIndex - 上次搜索的索引位置，用于优化搜索性能
 * @returns 包含行号和下次搜索起始位置的对象
 */
export function calculateLineNumber(
  originalText: string,
  tokenRaw: string,
  lastSearchIndex: number = 0,
): { lineNumber: number, nextSearchIndex: number } {
  if (!tokenRaw || typeof tokenRaw !== `string`) {
    return { lineNumber: 1, nextSearchIndex: lastSearchIndex }
  }

  // 清理 raw 内容，移除多余的空白字符
  const cleanRaw = tokenRaw.trim()

  // 在原始文本中查找 token 的位置
  const tokenIndex = originalText.indexOf(cleanRaw, lastSearchIndex)

  if (tokenIndex === -1) {
    // 如果找不到完整匹配，尝试查找第一行
    const firstLine = cleanRaw.split(`\n`)[0].trim()
    const lines = originalText.split(`\n`)
    const lineIndex = lines.findIndex((line, index) => {
      if (index < Math.floor(lastSearchIndex / originalText.length * lines.length)) {
        return false
      }
      return line.trim() === firstLine
    })
    if (lineIndex >= 0) {
      const foundLineStart = lines.slice(0, lineIndex).join(`\n`).length + (lineIndex > 0 ? 1 : 0)
      return { lineNumber: lineIndex + 1, nextSearchIndex: foundLineStart + firstLine.length }
    }
    return { lineNumber: 1, nextSearchIndex: lastSearchIndex }
  }

  // 计算到 tokenIndex 位置为止有多少行
  const textBeforeToken = originalText.substring(0, tokenIndex)
  const lineNumber = (textBeforeToken.match(/\n/g) || []).length + 1

  return {
    lineNumber,
    nextSearchIndex: tokenIndex + cleanRaw.length,
  }
}

/**
 * 行号跟踪器类
 * 维护渲染过程中的行号状态
 */
export class LineTracker {
  private originalText: string
  private currentSearchIndex: number = 0

  constructor(originalText: string) {
    this.originalText = originalText
  }

  /**
   * 获取指定 token 的行号
   * @param tokenRaw - token 的 raw 属性
   * @returns 行号
   */
  getLineNumber(tokenRaw: string): number {
    if (!tokenRaw || !this.originalText) {
      return 1
    }

    // For nested content (like paragraphs inside blockquotes),
    // we need to find the actual position in the original markdown
    // by looking for the raw content more carefully

    // First, try to find exact match
    let index = this.originalText.indexOf(tokenRaw, this.currentSearchIndex)

    // If not found, try to find the content without leading/trailing whitespace
    if (index === -1) {
      const trimmedRaw = tokenRaw.trim()
      if (trimmedRaw) {
        index = this.originalText.indexOf(trimmedRaw, this.currentSearchIndex)
      }
    }

    // If still not found, try to find line by line for multiline content
    if (index === -1 && tokenRaw.includes(`\n`)) {
      const lines = tokenRaw.split(`\n`)
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine) {
          index = this.originalText.indexOf(trimmedLine, this.currentSearchIndex)
          if (index !== -1) {
            break
          }
        }
      }
    }

    if (index === -1) {
      return 1
    }

    // Count the number of newlines before this position
    const beforeContent = this.originalText.substring(0, index)
    const lineNumber = beforeContent.split(`\n`).length

    // Update search index for next search
    this.currentSearchIndex = index + tokenRaw.length

    return lineNumber
  }

  /**
   * 重置搜索索引
   */
  reset(): void {
    this.currentSearchIndex = 0
  }
}

/**
 * 为 HTML 元素添加 data-line 属性
 * 排除增强语法对象（admonition、GMF alert、mermaid、katex、fenced code 等）
 * @param html - 原始 HTML 字符串
 * @param lineNumber - 行号
 * @returns 添加了 data-line 属性的 HTML 字符串
 */
export function addDataLineAttribute(
  html: string,
  lineNumber: number,
): string {
  // 增强语法对象列表，这些不应该添加 data-line 属性
  const enhancedSyntaxTypes = [
    `admonition`,
    `alert`,
    `mermaid`,
    `katex`,
    `math`,
    `plantuml`,
    `footnote`,
  ]

  // 检查是否为增强语法
  const isEnhancedSyntax = enhancedSyntaxTypes.some(type =>
    html.includes(`mktwain-${type}`)
    || html.includes(`class="${type}`)
    || html.includes(`class="mermaid`)
    || html.includes(`class="katex`),
  )

  // 如果是增强语法，直接返回原始 HTML
  if (isEnhancedSyntax) {
    return html
  }

  // 为基础元素添加 data-line 属性
  // 使用简单的字符串操作避免复杂正则表达式
  const openTagEnd = html.indexOf(`>`)
  if (openTagEnd !== -1 && html.startsWith(`<`)) {
    const openTag = html.substring(0, openTagEnd)
    const restOfHtml = html.substring(openTagEnd)
    const newTag = `${openTag} data-line="${lineNumber}"`
    return newTag + restOfHtml
  }

  return html
}
