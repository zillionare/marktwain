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

  // 内联语法高亮样式映射
  private getInlineHighlightStyles(): Record<string, string> {
    if (this.isDark) {
      // 暗色主题 - 类似Mac终端的配色
      return {
        'hljs-keyword': `color: #cc7832; font-weight: bold;`, // 橙色关键字
        'hljs-string': `color: #6a8759;`, // 绿色字符串
        'hljs-comment': `color: #808080; font-style: italic;`, // 灰色注释
        'hljs-number': `color: #6897bb;`, // 蓝色数字
        'hljs-function': `color: #ffc66d;`, // 黄色函数
        'hljs-variable': `color: #c5c8c6;`, // 白色变量
        'hljs-type': `color: #8888c6;`, // 紫色类型
        'hljs-literal': `color: #cc7832;`, // 橙色字面量
        'hljs-built_in': `color: #8888c6;`, // 紫色内置函数
        'hljs-operator': `color: #c5c8c6;`, // 白色操作符
        'hljs-punctuation': `color: #c5c8c6;`, // 白色标点
        'hljs-property': `color: #9876aa;`, // 紫色属性
        'hljs-attr': `color: #bababa;`, // 浅灰色属性
        'hljs-title': `color: #ffc66d; font-weight: bold;`, // 黄色标题
        'hljs-meta': `color: #bbb529;`, // 黄绿色元数据
        'hljs-tag': `color: #e8bf6a;`, // 黄色标签
        'hljs-name': `color: #e8bf6a;`, // 黄色名称
        'hljs-attribute': `color: #bababa;`, // 浅灰色属性
      }
    }
    else {
      return {
        'hljs-keyword': `color: #0000ff; font-weight: bold;`,
        'hljs-string': `color: #a31515;`,
        'hljs-comment': `color: #008000; font-style: italic;`,
        'hljs-number': `color: #098658;`,
        'hljs-function': `color: #795e26;`,
        'hljs-variable': `color: #001080;`,
        'hljs-type': `color: #267f99;`,
        'hljs-literal': `color: #0000ff;`,
        'hljs-built_in': `color: #267f99;`,
        'hljs-operator': `color: #000000;`,
        'hljs-punctuation': `color: #000000;`,
        'hljs-property': `color: #001080;`,
        'hljs-attr': `color: #0451a5;`,
        'hljs-title': `color: #795e26; font-weight: bold;`,
        'hljs-meta': `color: #0000ff;`,
        'hljs-tag': `color: #800000;`,
        'hljs-name': `color: #800000;`,
        'hljs-attribute': `color: #ff0000;`,
      }
    }
  }

  // 应用内联样式到高亮的HTML
  private applyInlineStyles(highlightedHtml: string): string {
    const styles = this.getInlineHighlightStyles()
    let result = highlightedHtml

    for (const [className, style] of Object.entries(styles)) {
      const regex = new RegExp(`<span class="${className}">`, `g`)
      result = result.replace(regex, `<span style="${style}">`)
    }

    return result
  }

  // 创建Mac样式的代码块容器
  private createMacStyleContainer(): HTMLElement {
    const macContainer = document.createElement(`div`)
    macContainer.style.cssText = `
      background: ${this.isDark ? `#1d1f21` : `#ffffff`};
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
      border: 1px solid ${this.isDark ? `#333` : `#e1e1e1`};
    `

    // Mac样式的标题栏
    const titleBar = document.createElement(`div`)
    titleBar.style.cssText = `
      background: linear-gradient(180deg, ${this.isDark ? `#3c3c3c` : `#f8f8f8`} 0%, ${this.isDark ? `#2c2c2c` : `#e8e8e8`} 100%);
      height: 32px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      border-bottom: 1px solid ${this.isDark ? `#404040` : `#e1e1e1`};
    `

    // 三个圆点
    const dots = [`#ff5f56`, `#ffbd2e`, `#27ca3f`]
    dots.forEach((color, index) => {
      const dot = document.createElement(`div`)
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        margin-right: ${index < 2 ? `8px` : `0`};
        display: inline-block;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 1px rgba(0,0,0,0.3);
      `
      titleBar.appendChild(dot)
    })

    macContainer.appendChild(titleBar)
    return macContainer
  }

  /**
   * 渲染代码块为图片
   */
  async renderCodeBlock(code: string, _lang: string): Promise<string> {
    // 创建一个临时的渲染容器
    const renderContainer = document.createElement(`div`)
    renderContainer.style.cssText = `
      position: fixed;
      top: -2000px;
      left: -2000px;
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      z-index: -1;
      opacity: 1;
      pointer-events: none;
    `

    const container = document.createElement(`div`)
    container.style.cssText = `
      width: 800px;
      padding: 20px;
      background: ${this.isDark ? `#1e1e1e` : `#ffffff`};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
    `

    // 创建Mac样式的代码块容器
    const macContainer = this.createMacStyleContainer()

    // 创建代码内容区域
    const codeElement = document.createElement(`pre`)
    codeElement.style.cssText = `
      margin: 0;
      padding: 16px 20px;
      background: ${this.isDark ? `#1d1f21` : `#ffffff`};
      overflow: visible;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: ${this.isDark ? `#c5c8c6` : `#24292e`};
      white-space: pre;
      word-wrap: normal;
      min-height: 60px;
    `

    const codeInner = document.createElement(`code`)
    codeInner.style.cssText = `
      font-family: inherit;
      font-size: inherit;
      color: inherit;
      display: block;
    `

    // 使用highlight.js进行语法高亮，然后应用内联样式
    const language = hljs.getLanguage(_lang) ? _lang : `plaintext`
    let highlighted = hljs.highlight(code, { language }).value

    // 保留所有空白字符，包括前导空格和制表符
    highlighted = highlighted.replace(/\t/g, `    `) // 制表符转换为4个空格
    highlighted = highlighted.replace(/^ +/gm, (match) => {
      // 保留行首的空格，转换为不间断空格以防止HTML压缩
      return `&nbsp;`.repeat(match.length)
    })

    // 应用内联样式替换CSS类
    const styledHighlighted = this.applyInlineStyles(highlighted)
    codeInner.innerHTML = styledHighlighted

    codeElement.appendChild(codeInner)
    macContainer.appendChild(codeElement)
    container.appendChild(macContainer)
    renderContainer.appendChild(container)
    document.body.appendChild(renderContainer)

    try {
      // 等待字体和样式加载
      await new Promise(resolve => setTimeout(resolve, 500))

      // 测试：创建一个简单的canvas图片来验证上传流程
      if (code.includes(`TEST_SIMPLE_IMAGE`)) {
        const canvas = document.createElement(`canvas`)
        canvas.width = 400
        canvas.height = 200
        const ctx = canvas.getContext(`2d`)!
        ctx.fillStyle = this.isDark ? `#1e1e1e` : `#ffffff`
        ctx.fillRect(0, 0, 400, 200)
        ctx.fillStyle = this.isDark ? `#ffffff` : `#000000`
        ctx.font = `16px Arial`
        ctx.fillText(`Test Image - Code Block`, 50, 100)
        ctx.fillText(code, 50, 130)

        const testDataUrl = canvas.toDataURL(`image/png`)
        console.log(`Test canvas dataUrl length: ${testDataUrl.length}`)

        const base64Content = testDataUrl.split(`,`)[1]
        const imageUrl = await uploadImageToGitHub(base64Content, `test-code-${Date.now()}.png`, `code`)
        imageCache.cacheImage(base64Content, imageUrl, `code`)
        return imageUrl
      }

      // 确保容器有内容并且可见
      console.log(`Container dimensions: ${container.offsetWidth}x${container.offsetHeight}`)
      console.log(`Container innerHTML length: ${container.innerHTML.length}`)

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
        skipFonts: true, // 跳过字体处理避免跨域问题
        filter: (_node) => {
          // 确保所有节点都被包含
          return true
        },
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
      document.body.removeChild(renderContainer)
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
        skipFonts: true,
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
        skipFonts: true,
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
        skipFonts: true,
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
