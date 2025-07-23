import type { Block, ExtendedProperties, Inline, Theme } from '@/types'

import { prefix } from '@/config/prefix'
import type { RendererAPI } from '@/types/renderer-types'
import { addSpacingToMarkdown } from '@/utils/autoSpace'
import type { PropertiesHyphen } from 'csstype'
import DOMPurify from 'isomorphic-dompurify'
import juice from 'juice'
import { marked } from 'marked'
import * as prettierPluginBabel from 'prettier/plugins/babel'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import * as prettierPluginMarkdown from 'prettier/plugins/markdown'
import * as prettierPluginCss from 'prettier/plugins/postcss'
import type { ReadTimeResults } from 'reading-time'

import { format } from 'prettier/standalone'

export function addPrefix(str: string) {
  return `${prefix}__${str}`
}

export function customizeTheme(theme: Theme, options: {
  fontSize?: number
  color?: string
}) {
  const newTheme = JSON.parse(JSON.stringify(theme))
  const { fontSize, color } = options
  if (fontSize) {
    for (let i = 1; i <= 6; i++) {
      const v = newTheme.block[`h${i}`][`font-size`]
      newTheme.block[`h${i}`][`font-size`] = `${fontSize * Number.parseFloat(v)}px`
    }
  }
  if (color) {
    newTheme.base[`--md-primary-color`] = color
  }
  return newTheme as Theme
}

export function customCssWithTemplate(jsonString: Partial<Record<Block | Inline, PropertiesHyphen>>, color: string, theme: Theme) {
  const newTheme = customizeTheme(theme, { color })

  const mergeProperties = <T extends Block | Inline = Block>(target: Record<T, PropertiesHyphen>, source: Partial<Record<Block | Inline | string, PropertiesHyphen>>, keys: T[]) => {
    keys.forEach((key) => {
      if (source[key]) {
        target[key] = Object.assign(target[key] || {}, source[key])
      }
    })
  }

  const blockKeys: Block[] = [
    `container`,
    `h1`,
    `h2`,
    `h3`,
    `h4`,
    `h5`,
    `h6`,
    `code`,
    `code_pre`,
    `p`,
    `hr`,
    `blockquote`,
    `blockquote_note`,
    `blockquote_tip`,
    `blockquote_important`,
    `blockquote_warning`,
    `blockquote_caution`,
    `blockquote_question`,
    `blockquote_hint`,
    `blockquote_example`,
    `blockquote_abstract`,
    `blockquote_p`,
    `blockquote_p_note`,
    `blockquote_p_tip`,
    `blockquote_p_important`,
    `blockquote_p_warning`,
    `blockquote_p_caution`,
    `blockquote_p_question`,
    `blockquote_p_hint`,
    `blockquote_p_example`,
    `blockquote_p_abstract`,
    `blockquote_title`,
    `blockquote_title_note`,
    `blockquote_title_tip`,
    `blockquote_title_important`,
    `blockquote_title_warning`,
    `blockquote_title_caution`,
    `blockquote_title_question`,
    `blockquote_title_hint`,
    `blockquote_title_example`,
    `blockquote_title_abstract`,
    `image`,
    `ul`,
    `ol`,
    `block_katex`,
  ]
  const inlineKeys: Inline[] = [`listitem`, `codespan`, `link`, `wx_link`, `strong`, `table`, `thead`, `td`, `footnote`, `figcaption`, `em`, `inline_katex`]

  mergeProperties(newTheme.block, jsonString, blockKeys)
  mergeProperties(newTheme.inline, jsonString, inlineKeys)
  return newTheme
}

/**
 * 将 CSS 字符串转换为 JSON 对象
 *
 * @param {string} css - CSS 字符串
 * @returns {object} - JSON 格式的 CSS
 */
export function css2json(css: string): Partial<Record<Block | Inline, PropertiesHyphen>> {
  // 去除所有 CSS 注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, ``)

  const json: Partial<Record<Block | Inline, PropertiesHyphen>> = {}

  // 辅助函数：将声明数组转换为对象
  const toObject = (array: any[]) =>
    array.reduce<{ [k: string]: string }>((obj, item) => {
      const [property, ...value] = item.split(`:`).map((part: string) => part.trim())
      if (property)
        obj[property] = value.join(`:`)
      return obj
    }, {})

  while (css.includes(`{`) && css.includes(`}`)) {
    const lbracket = css.indexOf(`{`)
    const rbracket = css.indexOf(`}`)

    // 获取声明块并转换为对象
    const declarations = css.substring(lbracket + 1, rbracket)
      .split(`;`)
      .map(e => e.trim())
      .filter(Boolean)

    // 获取选择器并去除空格
    const selectors = css.substring(0, lbracket)
      .split(`,`)
      .map(selector => selector.trim()) as (Block | Inline)[]

    const declarationObj = toObject(declarations)

    // 将声明对象关联到相应的选择器
    selectors.forEach((selector) => {
      json[selector] = { ...(json[selector] || {}), ...declarationObj }
    })

    // 处理下一个声明块
    css = css.slice(rbracket + 1).trim()
  }

  return json
}

/**
 * 将样式对象转换为 CSS 字符串
 * @param {ExtendedProperties} style - 样式对象
 * @returns {string} - CSS 字符串
 */
export function getStyleString(style: ExtendedProperties) {
  return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join(`; `)
}

/**
 * 格式化内容
 * @param {string} content - 要格式化的内容
 * @param {'markdown' | 'css'} [type] - 内容类型，决定使用的解析器，默认为'markdown'
 * @returns {Promise<string>} - 格式化后的内容
 */
export async function formatDoc(content: string, type: `markdown` | `css` = `markdown`) {
  const plugins = {
    markdown: [prettierPluginMarkdown, prettierPluginBabel, prettierPluginEstree],
    css: [prettierPluginCss],
  }
  const addSpaceContent = await addSpacingToMarkdown(content)

  const parser = type in plugins ? type : `markdown`
  return await format(addSpaceContent, {
    parser,
    plugins: plugins[parser],
  })
}

export function sanitizeTitle(title: string) {
  const MAX_FILENAME_LENGTH = 100

  // Windows 禁止字符，包含所有平台非法字符合集
  const INVALID_CHARS = /[\\/:*?"<>|]/g

  if (!INVALID_CHARS.test(title) && title.length <= MAX_FILENAME_LENGTH) {
    return title.trim() || `untitled`
  }

  const replaced = title.replace(INVALID_CHARS, `_`).trim()
  const safe = replaced.length > MAX_FILENAME_LENGTH
    ? replaced.slice(0, MAX_FILENAME_LENGTH)
    : replaced

  return safe || `untitled`
}

/**
 * 导出原始 Markdown 文档
 * @param {string} doc - 文档内容
 * @param {string} title - 文档标题
 */
export function downloadMD(doc: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)
  const downLink = document.createElement(`a`)

  downLink.download = `${safeTitle}.md`
  downLink.style.display = `none`

  const blob = new Blob([doc], { type: `text/markdown;charset=utf-8` })
  const objectUrl = URL.createObjectURL(blob)
  downLink.href = objectUrl

  document.body.appendChild(downLink)
  downLink.click()
  document.body.removeChild(downLink)

  // 释放 URL 对象，避免内存泄漏
  URL.revokeObjectURL(objectUrl)
}

/**
 * 导出 HTML 生成内容
 */
export function exportHTML(primaryColor: string, title: string = `untitled`) {
  const element = document.querySelector(`#output`)!

  setStyles(element)

  const htmlStr = element.innerHTML
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)

  const downLink = document.createElement(`a`)

  downLink.download = `${title}.html`
  downLink.style.display = `none`
  const blob = new Blob([
    `<html><head><meta charset="utf-8" /></head><body><div style="width: 750px; margin: auto;">${htmlStr}</div></body></html>`,
  ])

  downLink.href = URL.createObjectURL(blob)
  document.body.appendChild(downLink)
  downLink.click()
  document.body.removeChild(downLink)

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
    function isPre(element: Element) {
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
          || isCode((element.parentElement!).parentElement))
      )
    }
  }
}

/**
 * 根据数据生成 Markdown 表格
 *
 * @param {object} options - 选项
 * @param {object} options.data - 表格数据
 * @param {number} options.rows - 行数
 * @param {number} options.cols - 列数
 * @returns {string} 生成的 Markdown 表格
 */
export function createTable({ data, rows, cols }: { data: { [k: string]: string }, rows: number, cols: number }) {
  let table = ``
  for (let i = 0; i < rows + 2; ++i) {
    table += `| `
    const currRow = []
    for (let j = 0; j < cols; ++j) {
      const rowIdx = i > 1 ? i - 1 : i
      currRow.push(i === 1 ? `---` : data[`k_${rowIdx}_${j}`] || `     `)
    }
    table += currRow.join(` | `)
    table += ` |\n`
  }

  return table
}

export function toBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve((reader.result as string).split(`,`).pop()!)
    reader.onerror = error => reject(error)
  })
}

export function checkImage(file: File) {
  // 检查文件名后缀
  const isValidSuffix = /\.(?:gif|jpe?g|png)$/i.test(file.name)
  if (!isValidSuffix) {
    return {
      ok: false,
      msg: `请上传 JPG/PNG/GIF 格式的图片`,
    }
  }

  // 检查文件大小
  const maxSizeMB = 10
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      ok: false,
      msg: `由于公众号限制，图片大小不能超过 ${maxSizeMB}M`,
    }
  }

  return { ok: true }
}

/**
 * 移除左边多余空格
 * @param {string} str
 * @returns string
 */
export function removeLeft(str: string) {
  const lines = str.split(`\n`)
  // 获取应该删除的空白符数量
  const minSpaceNum = lines
    .filter(item => item.trim())
    .map(item => (item.match(/(^\s+)?/)!)[0].length)
    .sort((a, b) => a - b)[0]
  // 删除空白符
  return lines.map(item => item.slice(minSpaceNum)).join(`\n`)
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

export function mergeCss(html: string): string {
  return juice(html, {
    inlinePseudoElements: true,
    preserveImportant: true,
  })
}

export function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`)
  node.style.fontSize = `0`
  node.style.lineHeight = `0`
  node.style.margin = `0`
  node.innerHTML = `&nbsp;`
  return node
}

export function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = htmlString

  // 移动 `li > ul` 和 `li > ol` 到 `li` 后面
  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem)
  })

  return tempDiv.innerHTML
}

/**
 * 转换 CommonMark admonition 和数学公式为适合公众号的格式
 */
export function convertCommonMarkAdmonitions(container: HTMLElement) {
  // 转换 CommonMark admonition
  const admonitions = container.querySelectorAll('.admonition')

  admonitions.forEach((admonition) => {
    const variant = admonition.className.match(/admonition-(\w+)/)?.[1] || 'note'
    const titleElement = admonition.querySelector('.admonition-title')
    const contentElement = admonition.querySelector('.admonition-content')

    if (!titleElement || !contentElement) return

    // 创建新的 blockquote 元素
    const blockquote = document.createElement('blockquote')
    blockquote.id = admonition.id
    blockquote.setAttribute('data-block-type', 'admonition')
    blockquote.setAttribute('data-block-content', admonition.getAttribute('data-block-content') || '')

    // 设置样式
    const styles = getAdmonitionStyles(variant)
    blockquote.style.cssText = styles.wrapper

    // 创建标题段落
    const titleP = document.createElement('p')
    titleP.style.cssText = styles.title
    titleP.innerHTML = titleElement.innerHTML

    // 处理内容
    const contentHTML = contentElement.innerHTML

    // 组装 blockquote
    blockquote.appendChild(titleP)
    blockquote.innerHTML += contentHTML

    // 替换原来的 admonition
    admonition.parentNode?.replaceChild(blockquote, admonition)
  })

  // 转换数学公式 section 为 div，并处理 SVG 兼容性
  const mathSections = container.querySelectorAll('section[data-block-type="math"]')

  mathSections.forEach((section) => {
    // 创建新的 div 元素
    const div = document.createElement('div')
    div.id = section.id
    div.setAttribute('data-block-type', 'math')
    div.setAttribute('data-block-content', section.getAttribute('data-block-content') || '')

    // 处理数学公式 SVG 的兼容性
    const svgElement = section.querySelector('svg')
    if (svgElement) {
      // 确保 SVG 有正确的命名空间
      if (!svgElement.getAttribute('xmlns')) {
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }

      // 确保 SVG 有正确的样式
      const currentStyle = svgElement.getAttribute('style') || ''
      svgElement.setAttribute('style', `${currentStyle}; vertical-align: middle; max-width: 100%;`)

      // 创建一个包装的 section 元素（类似 Mermaid 的处理）
      const wrapperSection = document.createElement('section')
      wrapperSection.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
      wrapperSection.style.cssText = 'text-align: center; margin: 1em 0; padding: 0.5em;'
      wrapperSection.innerHTML = svgElement.outerHTML

      div.appendChild(wrapperSection)
    } else {
      // 如果没有 SVG，直接复制内容
      div.innerHTML = section.innerHTML
      div.style.textAlign = 'center'
      div.style.margin = '1em 0'
      div.style.padding = '0.5em'
    }

    // 复制其他样式
    const sectionStyle = (section as HTMLElement).style.cssText
    if (sectionStyle) {
      div.style.cssText += '; ' + sectionStyle
    }

    // 替换原来的 section
    section.parentNode?.replaceChild(div, section)
  })
}

/**
 * 获取不同类型 admonition 的样式
 */
function getAdmonitionStyles(variant: string) {
  const colorMap: Record<string, string> = {
    note: '#478be6',
    tip: '#57ab5a',
    important: '#986ee2',
    warning: '#c69026',
    caution: '#e5534b',
    question: '#478be6',
    hint: '#57ab5a',
    example: '#986ee2',
    abstract: '#478be6'
  }

  const color = colorMap[variant] || colorMap.note

  return {
    wrapper: `
      font-style: normal;
      font-size: 14px;
      padding: 1em 1em 1em 2em;
      border-left: 4px solid ${color};
      border-radius: 6px;
      color: rgba(0,0,0,0.8);
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      margin-bottom: 1em;
      background: #f7f7f7;
    `.replace(/\s+/g, ' ').trim(),
    title: `
      display: flex;
      align-items: center;
      gap: 0.5em;
      margin-bottom: 0.5em;
      color: ${color};
      font-weight: bold;
      font-size: 15px;
    `.replace(/\s+/g, ' ').trim()
  }
}

/**
 * Firefox 浏览器特殊优化
 */
function enhanceForFirefox(container: HTMLElement) {
  // 1. 强化代码块样式
  const codeBlocks = container.querySelectorAll('pre.hljs')
  codeBlocks.forEach((block) => {
    const codeElement = block.querySelector('code')
    if (codeElement) {
      // 确保代码块有足够的样式信息
      const currentStyle = codeElement.getAttribute('style') || ''
      if (!currentStyle.includes('font-family')) {
        codeElement.style.fontFamily = 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
      }
      if (!currentStyle.includes('font-size')) {
        codeElement.style.fontSize = '14px'
      }
      if (!currentStyle.includes('line-height')) {
        codeElement.style.lineHeight = '1.5'
      }
    }
  })

  // 2. 强化 SVG 元素
  const svgElements = container.querySelectorAll('svg')
  svgElements.forEach((svg) => {
    // 确保 SVG 有正确的命名空间和属性
    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    // 添加 Firefox 兼容的样式
    const currentStyle = svg.getAttribute('style') || ''
    svg.setAttribute('style', `${currentStyle}; display: block; margin: 0 auto;`)

    // 确保 SVG 有明确的尺寸
    if (!svg.getAttribute('width') && !svg.style.width) {
      svg.style.width = 'auto'
    }
    if (!svg.getAttribute('height') && !svg.style.height) {
      svg.style.height = 'auto'
    }
  })

  // 3. 强化数学公式的包装
  const mathElements = container.querySelectorAll('[data-block-type="math"]')
  mathElements.forEach((mathElement) => {
    const svg = mathElement.querySelector('svg')
    if (svg) {
      // 为数学公式 SVG 添加额外的包装和样式
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'text-align: center; margin: 1em 0; padding: 0.5em; display: block;'
      wrapper.innerHTML = svg.outerHTML

      // 替换原来的内容
      mathElement.innerHTML = ''
      mathElement.appendChild(wrapper)
    }
  })

  // 4. 强化表格样式
  const tables = container.querySelectorAll('table')
  tables.forEach((table) => {
    if (!table.style.borderCollapse) {
      table.style.borderCollapse = 'collapse'
    }
    if (!table.style.width) {
      table.style.width = '100%'
    }
  })
}

/**
 * 获取代码高亮的CSS样式
 */
async function getCodeHighlightStyles(): Promise<string> {
  const hljsLink = document.querySelector('#hljs') as HTMLLinkElement
  if (!hljsLink || !hljsLink.href) {
    return ''
  }

  try {
    const response = await fetch(hljsLink.href)
    const cssText = await response.text()
    return cssText
  } catch (error) {
    console.warn('Failed to fetch highlight.js CSS:', error)
    return ''
  }
}

/**
 * 解析CSS文本并提取样式规则
 */
function parseCSSRules(cssText: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>()

  // 简单的CSS解析，匹配选择器和样式块
  const cssRuleRegex = /([^{}]+)\{([^{}]*)\}/g
  let match

  while ((match = cssRuleRegex.exec(cssText)) !== null) {
    const selector = match[1].trim()
    const declarations = match[2].trim()

    // 解析样式声明
    const styles: Record<string, string> = {}
    const declarationRegex = /([^:;]+):\s*([^;]+)/g
    let declMatch

    while ((declMatch = declarationRegex.exec(declarations)) !== null) {
      const property = declMatch[1].trim()
      const value = declMatch[2].trim()
      styles[property] = value
    }

    if (Object.keys(styles).length > 0) {
      rules.set(selector, styles)
    }
  }

  return rules
}

/**
 * 内联代码高亮样式到代码块元素
 */
function inlineCodeHighlightStyles(element: Element, cssText: string) {
  if (!cssText) return

  const cssRules = parseCSSRules(cssText)

  // 为代码块相关元素应用样式
  const codeBlocks = element.querySelectorAll('pre.hljs')
  const codeElements = element.querySelectorAll('code')
  const spanElements = element.querySelectorAll('.hljs span')

  // 应用代码块样式
  codeBlocks.forEach((el) => {
    applyMatchingStyles(el, cssRules, ['.hljs', 'pre.hljs', 'pre'])
  })

  // 应用代码元素样式
  codeElements.forEach((el) => {
    applyMatchingStyles(el, cssRules, ['code', '.hljs code'])
  })

  // 应用语法高亮span样式
  spanElements.forEach((el) => {
    const className = el.className
    if (className) {
      const classSelectors = className.split(' ').map(cls => `.hljs .${cls}`)
      applyMatchingStyles(el, cssRules, classSelectors)
    }
  })
}

/**
 * 为元素应用匹配的CSS样式
 */
function applyMatchingStyles(element: Element, cssRules: Map<string, Record<string, string>>, selectors: string[]) {
  const inlineStyles: string[] = []
  const existingStyle = element.getAttribute('style') || ''

  selectors.forEach(selector => {
    const styles = cssRules.get(selector)
    if (styles) {
      Object.entries(styles).forEach(([prop, value]) => {
        // 只应用重要的样式属性
        if (isImportantStyleProperty(prop)) {
          inlineStyles.push(`${prop}: ${value}`)
        }
      })
    }
  })

  if (inlineStyles.length > 0) {
    const newStyle = existingStyle + '; ' + inlineStyles.join('; ')
    element.setAttribute('style', newStyle)
  }
}

/**
 * 判断是否为重要的样式属性
 */
function isImportantStyleProperty(prop: string): boolean {
  const importantProps = [
    'background-color', 'background', 'color', 'font-family', 'font-size',
    'font-weight', 'font-style', 'text-decoration', 'opacity', 'border-radius',
    'padding', 'margin', 'line-height', 'white-space', 'border', 'border-left',
    'border-right', 'border-top', 'border-bottom'
  ]
  return importantProps.includes(prop)
}

export async function processClipboardContent(primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!

  // 检测浏览器类型
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')

  // 转换 CommonMark admonition 和数学公式为适合公众号的格式
  convertCommonMarkAdmonitions(clipboardDiv)

  // 获取代码高亮样式
  const codeHighlightCSS = await getCodeHighlightStyles()

  // Firefox 需要特殊处理
  if (isFirefox) {
    // Firefox 优化：先内联代码样式，再合并其他 CSS
    if (codeHighlightCSS) {
      inlineCodeHighlightStyles(clipboardDiv, codeHighlightCSS)
    }
    clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML))

    // Firefox 特殊处理：强化 SVG 和样式
    enhanceForFirefox(clipboardDiv)
  } else {
    // Chrome/其他浏览器：原有流程
    clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML))
    if (codeHighlightCSS) {
      inlineCodeHighlightStyles(clipboardDiv, codeHighlightCSS)
    }
  }

  // 处理样式和颜色变量
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`)
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`)
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
    .replace(
      /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="nodeLabel"$1>$2</span>`,
    )
    .replace(
      /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="edgeLabel"$1>$2</span>`,
    )

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

export function renderMarkdown(raw: string, renderer: RendererAPI) {
  // 解析 front-matter 和正文
  const { markdownContent, readingTime }
    = renderer.parseFrontMatterAndContent(raw)

  // marked -> html
  let html = marked.parse(markdownContent) as string

  // XSS 处理
  html = DOMPurify.sanitize(html, { ADD_TAGS: [`mp-common-profile`] })

  return { html, readingTime }
}

export function postProcessHtml(baseHtml: string, reading: ReadTimeResults, renderer: RendererAPI): string {
  // 阅读时间及字数统计
  let html = baseHtml
  html = renderer.buildReadingTime(reading) + html
  // 去除第一行的 margin-top
  html = html.replace(/(style=".*?)"/, `$1;margin-top: 0"`)
  // 引用脚注
  html += renderer.buildFootnotes()
  // 附加的一些 style
  html += renderer.buildAddition()
  if (renderer.getOpts().isMacCodeBlock) {
    html += `
        <style>
          .hljs.code__pre > .mac-sign {
            display: flex;
          }
        </style>
      `
  }
  html += `
      <style>
        .code__pre {
          padding: 0 !important;
        }

        .hljs.code__pre code {
          display: -webkit-box;
          padding: 0.5em 1em 1em;
          overflow-x: auto;
          text-indent: 0;
        }
        h2 strong {
          color: inherit !important;
        }
      </style>
    `
  // 包裹 HTML
  return renderer.createContainer(html)
}

export function modifyHtmlContent(content: string, renderer: RendererAPI): string {
  const {
    markdownContent,
    readingTime: readingTimeResult,
  } = renderer.parseFrontMatterAndContent(content)

  let html = marked.parse(markdownContent) as string
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: [`mp-common-profile`],
  })
  return postProcessHtml(html, readingTimeResult, renderer)
}
