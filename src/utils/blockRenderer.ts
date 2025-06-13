import type { ThemeStyles } from '@/types'
import hljs from 'highlight.js'
import { toPng } from 'html-to-image'
import mermaid from 'mermaid'
import { getStyleString } from '.'
import { uploadImageToGitHub } from './githubImageBed'
import { imageCache } from './imageCache'

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
      position: fixed;
      top: 50px;
      left: 50px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      z-index: 9999;
      visibility: hidden;
      pointer-events: none;
      border: 1px solid transparent;
    `

    // 创建代码块HTML
    const language = hljs.getLanguage(lang) ? lang : `plaintext`
    let highlighted = hljs.highlight(code, { language }).value
    highlighted = highlighted.replace(/\t/g, `    `)

    const codeElement = document.createElement(`pre`)
    codeElement.style.cssText = `
      margin: 0;
      padding: 16px;
      background: ${this.isDark ? `#2d2d2d` : `#f6f8fa`};
      border-radius: 6px;
      overflow: visible;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.45;
      color: ${this.isDark ? `#e1e4e8` : `#24292e`};
      white-space: pre-wrap;
      word-wrap: break-word;
    `

    const codeInner = document.createElement(`code`)
    codeInner.className = `language-${lang}`
    codeInner.style.cssText = `
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      color: inherit;
      display: block;
    `
    codeInner.innerHTML = highlighted

    codeElement.appendChild(codeInner)
    container.appendChild(codeElement)
    document.body.appendChild(container)

    try {
      // 等待字体和样式加载
      await new Promise(resolve => setTimeout(resolve, 500))

      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        height: container.offsetHeight || 200,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
        cacheBust: true,
        includeQueryParams: true,
      })

      // 调试：输出dataUrl信息
      console.log(`Code block dataUrl length: ${dataUrl.length}`)
      console.log(`Code block dataUrl preview: ${dataUrl.substring(0, 100)}...`)

      // 将dataUrl转换为base64
      const base64Content = dataUrl.split(`,`)[1] // 移除data:image/png;base64,前缀

      // 验证base64内容
      if (!base64Content || base64Content.length < 100) {
        throw new Error(`Generated image is too small or empty. DataURL length: ${dataUrl.length}`)
      }

      // 检查缓存
      const cachedUrl = imageCache.getImageUrl(base64Content)
      if (cachedUrl) {
        console.log(`Using cached code block image: ${cachedUrl}`)
        return cachedUrl
      }

      // 上传到GitHub并缓存
      const imageUrl = await uploadImageToGitHub(base64Content, `code-${Date.now()}.png`, `code`)
      imageCache.cacheImage(base64Content, imageUrl, `code`)

      return imageUrl
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
      position: fixed;
      top: 50px;
      left: 50px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      z-index: 9999;
      visibility: hidden;
      pointer-events: none;
      border: 1px solid transparent;
    `

    const mermaidElement = document.createElement(`div`)
    mermaidElement.className = `mermaid`
    mermaidElement.textContent = code
    mermaidElement.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-size: 14px;
      color: ${this.isDark ? `#ffffff` : `#000000`};
      display: block;
    `
    container.appendChild(mermaidElement)
    document.body.appendChild(container)

    try {
      // 初始化mermaid
      await mermaid.run({
        nodes: [mermaidElement],
      })

      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 1500))

      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        height: container.offsetHeight || 400,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
        cacheBust: true,
        includeQueryParams: true,
      })

      // 将dataUrl转换为base64
      const base64Content = dataUrl.split(`,`)[1] // 移除data:image/png;base64,前缀

      // 检查缓存
      const cachedUrl = imageCache.getImageUrl(base64Content)
      if (cachedUrl) {
        console.log(`Using cached mermaid image: ${cachedUrl}`)
        return cachedUrl
      }

      // 上传到GitHub并缓存
      const imageUrl = await uploadImageToGitHub(base64Content, `mermaid-${Date.now()}.png`, `mermaid`)
      imageCache.cacheImage(base64Content, imageUrl, `mermaid`)

      return imageUrl
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
      position: fixed;
      top: 50px;
      left: 50px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      z-index: 9999;
      visibility: hidden;
      pointer-events: none;
      border: 1px solid transparent;
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
      // 等待样式加载
      await new Promise(resolve => setTimeout(resolve, 300))

      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        height: container.offsetHeight || 150,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
        cacheBust: true,
        includeQueryParams: true,
      })

      // 将dataUrl转换为base64
      const base64Content = dataUrl.split(`,`)[1] // 移除data:image/png;base64,前缀

      // 检查缓存
      const cachedUrl = imageCache.getImageUrl(base64Content)
      if (cachedUrl) {
        console.log(`Using cached admonition image: ${cachedUrl}`)
        return cachedUrl
      }

      // 上传到GitHub并缓存
      const imageUrl = await uploadImageToGitHub(base64Content, `admonition-${type}-${Date.now()}.png`, `admonition`)
      imageCache.cacheImage(base64Content, imageUrl, `admonition`)

      return imageUrl
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
      position: fixed;
      top: 50px;
      left: 50px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-size: 16px;
      z-index: 9999;
      visibility: hidden;
      pointer-events: none;
      border: 1px solid transparent;
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
      // 等待MathJax渲染完成
      await new Promise(resolve => setTimeout(resolve, 800))

      const dataUrl = await toPng(container, {
        backgroundColor: this.isDark ? `#1e1e1e` : `#ffffff`,
        pixelRatio: 2,
        width: 800,
        height: container.offsetHeight || 100,
        style: {
          transform: `scale(1)`,
          transformOrigin: `top left`,
        },
        cacheBust: true,
        includeQueryParams: true,
      })

      // 将dataUrl转换为base64
      const base64Content = dataUrl.split(`,`)[1] // 移除data:image/png;base64,前缀

      // 检查缓存
      const cachedUrl = imageCache.getImageUrl(base64Content)
      if (cachedUrl) {
        console.log(`Using cached math image: ${cachedUrl}`)
        return cachedUrl
      }

      // 上传到GitHub并缓存
      const imageUrl = await uploadImageToGitHub(base64Content, `math-${Date.now()}.png`, `math`)
      imageCache.cacheImage(base64Content, imageUrl, `math`)

      return imageUrl
    }
    finally {
      document.body.removeChild(container)
    }
  }
}
