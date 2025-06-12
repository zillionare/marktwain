import type { ThemeStyles } from '@/types'
import hljs from 'highlight.js'
import { toPng } from 'html-to-image'
import mermaid from 'mermaid'
import { getStyleString } from '.'
import fileApi from './file'
import { toBase64 } from './index'

/**
 * 特殊语法块渲染器
 * 将代码块、mermaid图表、admonition块、数学公式等渲染成图片
 */
export class BlockRenderer {
  private styles: ThemeStyles
  private isDark: boolean

  constructor(styles: ThemeStyles, isDark: boolean = false) {
    this.styles = styles
    this.isDark = isDark
  }

  /**
   * 渲染代码块为图片
   */
  async renderCodeBlock(code: string, lang: string): Promise<string> {
    const container = document.createElement(`div`)
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
    `

    // 创建代码块HTML
    const language = hljs.getLanguage(lang) ? lang : `plaintext`
    let highlighted = hljs.highlight(code, { language }).value
    highlighted = highlighted.replace(/\t/g, `    `)

    const codeElement = document.createElement(`pre`)
    codeElement.style.cssText = getStyleString(this.styles.code_pre || {})
    codeElement.innerHTML = `<code class="language-${lang}" style="${getStyleString(this.styles.code || {})}">${highlighted}</code>`

    container.appendChild(codeElement)
    document.body.appendChild(container)

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
      })

      // 将dataUrl转换为blob并上传
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `code-${Date.now()}.png`, { type: `image/png` })
      const base64Content = await toBase64(file)

      return await fileApi.fileUpload(base64Content, file)
    }
    finally {
      document.body.removeChild(container)
    }
  }

  /**
   * 渲染Mermaid图表为图片
   */
  async renderMermaidChart(code: string): Promise<string> {
    const container = document.createElement(`div`)
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
    `

    const mermaidElement = document.createElement(`div`)
    mermaidElement.className = `mermaid`
    mermaidElement.textContent = code
    container.appendChild(mermaidElement)
    document.body.appendChild(container)

    try {
      // 初始化mermaid
      await mermaid.run({
        nodes: [mermaidElement],
      })

      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 1000))

      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
      })

      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `mermaid-${Date.now()}.png`, { type: `image/png` })
      const base64Content = await toBase64(file)

      return await fileApi.fileUpload(base64Content, file)
    }
    finally {
      document.body.removeChild(container)
    }
  }

  /**
   * 渲染Admonition块为图片
   */
  async renderAdmonitionBlock(content: string, type: string): Promise<string> {
    const container = document.createElement(`div`)
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
    `

    // 创建admonition HTML结构
    const blockquote = document.createElement(`blockquote`)
    blockquote.className = `markdown-alert markdown-alert-${type}`
    blockquote.style.cssText = getStyleString({
      ...this.styles.blockquote,
      ...this.styles[`blockquote_${type}` as keyof ThemeStyles],
    } as any)

    // 添加标题
    const title = document.createElement(`p`)
    title.className = `markdown-alert-title`
    title.style.cssText = getStyleString({
      ...this.styles.blockquote_title,
      ...this.styles[`blockquote_title_${type}` as keyof ThemeStyles],
    } as any)
    title.textContent = type.charAt(0).toUpperCase() + type.slice(1)

    // 添加内容
    const contentElement = document.createElement(`p`)
    contentElement.style.cssText = getStyleString({
      ...this.styles.blockquote_p,
      ...this.styles[`blockquote_p_${type}` as keyof ThemeStyles],
    } as any)
    contentElement.textContent = content

    blockquote.appendChild(title)
    blockquote.appendChild(contentElement)
    container.appendChild(blockquote)
    document.body.appendChild(container)

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
      })

      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `admonition-${type}-${Date.now()}.png`, { type: `image/png` })
      const base64Content = await toBase64(file)

      return await fileApi.fileUpload(base64Content, file)
    }
    finally {
      document.body.removeChild(container)
    }
  }

  /**
   * 渲染数学公式为图片
   */
  async renderMathBlock(formula: string, isInline: boolean = false): Promise<string> {
    const container = document.createElement(`div`)
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-size: 16px;
    `

    // 使用MathJax渲染数学公式
    if ((window as any).MathJax) {
      (window as any).MathJax.texReset()
      const mjxContainer = (window as any).MathJax.tex2svg(formula, { display: !isInline })
      const svg = mjxContainer.firstChild as SVGElement

      if (svg) {
        svg.style.cssText = isInline
          ? getStyleString(this.styles.inline_katex || {})
          : getStyleString(this.styles.block_katex || {})
        container.appendChild(svg)
      }
    }
    else {
      // 如果MathJax不可用，创建一个简单的文本显示
      const mathElement = document.createElement(`div`)
      mathElement.textContent = `$$${formula}$$`
      mathElement.style.cssText = `
        font-family: 'Times New Roman', serif;
        font-size: 18px;
        text-align: ${isInline ? `left` : `center`};
        color: ${this.isDark ? `#ffffff` : `#000000`};
        padding: 10px;
        border: 1px solid ${this.isDark ? `#444` : `#ddd`};
        border-radius: 4px;
        background: ${this.isDark ? `#2a2a2a` : `#f9f9f9`};
      `
      container.appendChild(mathElement)
    }

    document.body.appendChild(container)

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
      })

      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `math-${Date.now()}.png`, { type: `image/png` })
      const base64Content = await toBase64(file)

      return await fileApi.fileUpload(base64Content, file)
    }
    finally {
      document.body.removeChild(container)
    }
  }
}
