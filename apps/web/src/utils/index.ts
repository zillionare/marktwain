import { markedAlert, MDKatex } from '@md/core'
import { prefix } from '@md/shared/configs'
// 直接导入供本文件内部使用
import {
  checkImage,
  createTable,
  css2json,
  downloadFile,
  formatDoc,
  removeLeft,
  sanitizeTitle,
  toBase64,
} from '@md/shared/utils'

import juice from 'juice'
import { Marked } from 'marked'
import { processAdmonitionToBlockquote } from './admonition-utils'

export {
  customCssWithTemplate,
  customizeTheme,
  getStyleString,
  modifyHtmlContent,
  postProcessHtml,
  renderMarkdown,
} from '@md/core/utils'

// 重新导出供外部使用
export {
  checkImage,
  createTable,
  css2json,
  downloadFile,
  formatDoc,
  removeLeft,
  sanitizeTitle,
  toBase64,
}

export function addPrefix(str: string) {
  return `${prefix}__${str}`
}

/**
 * 导出原始 Markdown 文档
 * @param {string} doc - 文档内容
 * @param {string} title - 文档标题
 */
export function downloadMD(doc: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)
  downloadFile(doc, `${safeTitle}.md`, `text/markdown;charset=utf-8`)
}

/**
 * 设置元素样式，确保导出时的样式正确
 * @param {Element} element - 要设置样式的元素
 */
function setStyles(element: Element) {
  /**
   * 获取一个 DOM 元素的所有样式，
   * @param {DOM 元素} element DOM 元素
   * @param {排除的属性} excludes 如果某些属性对结果有不良影响，可以使用这个参数来排除
   * @returns 行内样式拼接结果
   */
  function getElementStyles(element: Element, excludes = [`width`, `height`, `inlineSize`, `webkitLogicalWidth`, `webkitLogicalHeight`]) {
    const styles = getComputedStyle(element, null)
    return Object.entries(styles)
      .filter(
        ([key]) => {
          // 将驼峰转换为短横线格式
          const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
          return styles.getPropertyValue(kebabKey) && !excludes.includes(key)
        },
      )
      .map(([key, value]) => {
        // 将驼峰转换为短横线格式
        const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
        return `${kebabKey}:${value};`
      })
      .join(``)
  }

  switch (true) {
    case isPre(element):
    case isCode(element):
    case isSpan(element):
      element.setAttribute(`style`, getElementStyles(element))
  }
  if (element.children.length) {
    Array.from(element.children).forEach(child => setStyles(child))
  }

  // 判断是否是包裹代码块的 pre 元素
  function isPre(element: Element | null) {
    if (!element) {
      return false
    }

    return (
      element.tagName === `PRE`
      && Array.from(element.classList).includes(`code__pre`)
    )
  }

  // 判断是否是包裹代码块的 code 元素
  function isCode(element: Element | null) {
    if (element == null) {
      return false
    }
    return element.tagName === `CODE`
  }

  // 判断是否是包裹代码字符的 span 元素
  function isSpan(element: Element) {
    return (
      element.tagName === `SPAN`
      && (isCode(element.parentElement)
        || (element.parentElement && isCode(element.parentElement.parentElement)))
    )
  }
}

/**
 * 处理HTML内容，应用样式和颜色变量
 * @param {string} primaryColor - 主色调
 * @returns {string} 处理后的HTML字符串
 */
export function processHtmlContent(primaryColor: string): string {
  const element = document.querySelector(`#output`)
  if (!element) {
    console.error(`无法找到#output元素`)
    return ``
  }

  setStyles(element)

  return element.innerHTML
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
}

/**
 * 导出 HTML 生成内容
 */
export function exportHTML(primaryColor: string, title: string = `untitled`) {
  const htmlStr = processHtmlContent(primaryColor)
  const fullHtml = `<html><head><meta charset="utf-8" /></head><body><div style="width: 750px; margin: auto;">${htmlStr}</div></body></html>`

  downloadFile(fullHtml, `${sanitizeTitle(title)}.html`, `text/html`)
}

export async function exportPureHTML(raw: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)

  const markedInstance = new Marked()
  markedInstance.use(markedAlert({ withoutStyle: true }))
  markedInstance.use(
    MDKatex({ nonStandard: true }, ``, ``),
  )
  const pureHtml = await markedInstance.parse(raw)

  downloadFile(pureHtml, `${safeTitle}.html`, `text/html`)
}

/**
 * 导出 PDF 文档
 * @param {string} primaryColor - 主色调
 * @param {string} title - 文档标题
 */
export function exportPDF(primaryColor: string, title: string = `untitled`) {
  const htmlStr = processHtmlContent(primaryColor)
  const safeTitle = sanitizeTitle(title)

  // 创建新窗口用于打印
  const printWindow = window.open(``, `_blank`)
  if (!printWindow) {
    console.error(`无法打开打印窗口`)
    return
  }

  // 写入HTML内容，包含自定义页眉页脚
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        @page {
          @top-center {
            content: "${safeTitle}";
            font-size: 12px;
            color: #666;
          }
          @bottom-left {
            content: "微信 Markdown 编辑器";
            font-size: 10px;
            color: #999;
          }
          @bottom-right {
            content: "第 " counter(page) " 页，共 " counter(pages) " 页";
            font-size: 10px;
            color: #999;
          }
        }

        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 750px; margin: auto;">
        ${htmlStr}
      </div>
    </body>
    </html>
  `)

  printWindow.document.close()

  // 等待内容加载完成后自动打开打印对话框
  printWindow.onload = () => {
    printWindow.print()
    // 打印完成后关闭窗口
    printWindow.onafterprint = () => {
      printWindow.close()
    }
  }
}

export function solveWeChatImage() {
  const clipboardDiv = document.getElementById(`output`)!
  const images = clipboardDiv.getElementsByTagName(`img`)

  Array.from(images).forEach((image) => {
    const width = image.getAttribute(`width`)!
    const height = image.getAttribute(`height`)!
    image.removeAttribute(`width`)
    image.removeAttribute(`height`)
    image.style.width = width
    image.style.height = height
  })
}

async function getHljsStyles(): Promise<string> {
  return extractHljsStylesFromPage()
}

/**
 * 从页面中提取已加载的highlight.js样式
 * 通过检查已渲染的代码块元素来获取样式
 */
function extractHljsStylesFromPage(): string {
  try {
    const styleSheets = Array.from(document.styleSheets)
    let hljsCss = ``

    for (const styleSheet of styleSheets) {
      try {
        const rules = Array.from(styleSheet.cssRules || [])
        const hljsRules = rules.filter((rule) => {
          if (rule.type === CSSRule.STYLE_RULE) {
            const styleRule = rule as CSSStyleRule
            return styleRule.selectorText && (
              styleRule.selectorText.includes(`.hljs`)
              || styleRule.selectorText.includes(`hljs-`)
              || styleRule.selectorText.includes(`language-`)
            )
          }
          return false
        })

        if (hljsRules.length > 0) {
          hljsCss += hljsRules.map(rule => rule.cssText).join(`\n`)
        }
      }
      catch (e) {
        console.warn(`无法访问跨域样式表`, e)
        continue
      }
    }

    return hljsCss ? `<style>${hljsCss}</style>` : ``
  }
  catch (error) {
    console.warn(`提取highlight.js样式时发生错误:`, error)
    return ``
  }
}

function mergeCss(html: string): string {
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = html

  tempDiv.style.position = `absolute`
  tempDiv.style.left = `-9999px`
  tempDiv.style.top = `-9999px`
  tempDiv.style.visibility = `hidden`
  document.body.appendChild(tempDiv)

  try {
    setCodeBlockStyles(tempDiv)
    setAdmonitionParagraphStyles(tempDiv)
    return juice(tempDiv.innerHTML, {
      inlinePseudoElements: true,
      preserveImportant: true,
      removeStyleTags: false,
      insertPreservedExtraCss: true,
      applyStyleTags: true,
      webResources: {
        relativeTo: window.location.href,
        images: false,
        svgs: false,
        scripts: false,
        links: false,
      },
    })
  }
  finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 手动设置代码块相关元素的样式
 * 参考test-main-branch的setStyles函数实现
 */
function setCodeBlockStyles(container: Element) {
  const codeElements = container.querySelectorAll(`.hljs, .code__pre, pre, code, span[class*="hljs-"], span[class*="language-"]`)

  codeElements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element)
    const inlineStyle = element.getAttribute(`style`) || ``

    const styleProperties = [
      `display`,
      `overflow-x`,
      `padding`,
      `background`,
      `color`,
      `border-radius`,
      `font-family`,
      `font-size`,
      `line-height`,
      `text-align`,
      `margin`,
      `border`,
      `white-space`,
      `text-indent`,
      `font-weight`,
      `font-style`,
      `background-color`,
      `border-color`,
      `text-decoration`,
      `text-transform`,
      `letter-spacing`,
      `word-spacing`,
      `text-shadow`,
      `box-shadow`,
    ]

    let newStyle = inlineStyle

    styleProperties.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value !== `initial` && value !== `inherit` && value !== `unset` && value !== `none`) {
        const styleRegex = new RegExp(`${prop}\\s*:\\s*[^;]+`, `g`)
        if (!styleRegex.test(newStyle)) {
          newStyle += `${newStyle.endsWith(`;`) ? `` : `;`}${prop}:${value}`
        }
      }
    })

    if (newStyle !== inlineStyle) {
      element.setAttribute(`style`, newStyle)
    }
  })
}

/**
 * 设置admonition内容区域的段落样式
 * 确保段落有正确的上下边距
 */
function setAdmonitionParagraphStyles(container: Element) {
  const admonitions = container.querySelectorAll(`.admonition, blockquote`)

  admonitions.forEach((admonition) => {
    const paragraphs = admonition.querySelectorAll(`p`)
    paragraphs.forEach((p) => {
      const pElement = p as HTMLElement
      const computedStyle = window.getComputedStyle(pElement)
      const inlineStyle = pElement.getAttribute(`style`) || ``

      // 检查是否已经有margin设置
      const hasMargin = inlineStyle.includes(`margin`) || computedStyle.margin !== `0px`

      if (!hasMargin) {
        // 如果没有margin设置，添加0.5rem的上下边距
        const newStyle = `${inlineStyle + (inlineStyle.endsWith(`;`) ? `` : `;`)}margin:0.5rem 0;`
        pElement.setAttribute(`style`, newStyle)
      }
    })
  })
}

function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = htmlString

  // 移动 `li > ul` 和 `li > ol` 到 `li` 后面
  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem)
  })

  return tempDiv.innerHTML
}

function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`)
  node.style.fontSize = `0`
  node.style.lineHeight = `0`
  node.style.margin = `0`
  node.innerHTML = `&nbsp;`
  return node
}

export async function processClipboardContent(primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!

  // 获取highlight.js样式并添加到HTML中
  const hljsStyles = await getHljsStyles()
  if (hljsStyles) {
    clipboardDiv.innerHTML = hljsStyles + clipboardDiv.innerHTML
  }

  // 合并 CSS 和修改 HTML 结构
  clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML))

  // 处理admonition：将div.admonition转换为blockquote以兼容公众号
  clipboardDiv.innerHTML = processAdmonitionToBlockquote(clipboardDiv.innerHTML)

  // 处理样式和颜色变量
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`)
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`)
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)

  // 处理图片大小
  solveWeChatImage()

  // 添加空白节点用于兼容 SVG 复制
  const beforeNode = createEmptyNode()
  const afterNode = createEmptyNode()
  clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild)
  clipboardDiv.appendChild(afterNode)

  // 兼容 Mermaid
  const nodes = clipboardDiv.querySelectorAll(`.nodeLabel`)
  nodes.forEach((node) => {
    const parent = node.parentElement!
    const xmlns = parent.getAttribute(`xmlns`)!
    const style = parent.getAttribute(`style`)!
    const section = document.createElement(`section`)
    section.setAttribute(`xmlns`, xmlns)
    section.setAttribute(`style`, style)
    section.innerHTML = parent.innerHTML

    const grand = parent.parentElement!
    // 清空父元素
    grand.innerHTML = ``
    grand.appendChild(section)
  })
}
