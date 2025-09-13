/**
 * Admonition处理工具模块
 * 负责将admonition的div结构转换为blockquote结构以兼容公众号
 */

/**
 * Admonition类型映射表
 * 根据CSS文件中的定义，每种类型都有对应的图标和颜色
 */
const ADMONITION_TYPES = {
  // Summary/Abstract/TLDR - Description icon
  summary: { icon: `description`, color: `#00b0ff` },
  abstract: { icon: `description`, color: `#00b0ff` },
  tldr: { icon: `description`, color: `#00b0ff` },

  // Hint/Tip - Lightbulb icon
  hint: { icon: `lightbulb`, color: `rgb(22 163 74)` },
  tip: { icon: `lightbulb`, color: `rgb(22 163 74)` },

  // Note - Edit icon
  note: { icon: `edit`, color: `rgb(68, 138, 255)` },

  // Question/Help/FAQ - Help circle icon
  question: { icon: `help`, color: `rgb(100, 221, 23)` },
  help: { icon: `help`, color: `rgb(100, 149, 237)` },
  faq: { icon: `help`, color: `rgb(100, 149, 237)` },

  // Info/Todo - Information icon
  info: { icon: `info`, color: `#00b8d4` },
  todo: { icon: `info`, color: `#00b8d4` },

  // Success/Check/Done - Check circle icon
  success: { icon: `check_circle`, color: `#00c853` },
  check: { icon: `check_circle`, color: `#00c853` },
  done: { icon: `check_circle`, color: `#00c853` },

  // Attention - Speakerphone icon
  attention: { icon: `speakerphone`, color: `#F97316` },

  // Warning/Caution - Warning icon
  warning: { icon: `warning`, color: `#ff9800` },
  caution: { icon: `warning`, color: `#ff9800` },

  // Failure/Fail/Missing - Close circle icon
  failure: { icon: `close_circle`, color: `#ff5252` },
  fail: { icon: `close_circle`, color: `#ff5252` },
  missing: { icon: `close_circle`, color: `#ff5252` },

  // Danger - Alert circle icon
  danger: { icon: `alert_circle`, color: `#ff1744` },

  // Error - Error icon
  error: { icon: `error`, color: `#ff1744` },

  // Bug - Bug icon
  bug: { icon: `bug`, color: `#9c27b0` },

  // Example/Snippet - Code icon
  example: { icon: `code`, color: `#607d8b` },
  snippet: { icon: `code`, color: `#607d8b` },

  // Quote/Cite - Quote icon
  quote: { icon: `quote`, color: `#9e9e9e` },
  cite: { icon: `quote`, color: `#9e9e9e` },
} as const

/**
 * 获取admonition类型的配置
 */
function getAdmonitionConfig(type: string) {
  return ADMONITION_TYPES[type as keyof typeof ADMONITION_TYPES] || {
    icon: `info`,
    color: `#00b8d4`,
  }
}

/**
 * 创建内联图标span元素
 * 将CSS伪元素::before的图标转换为实际的span元素
 */
function createIconSpan(admonitionType: string): HTMLSpanElement {
  const config = getAdmonitionConfig(admonitionType)
  const icon = document.createElement(`span`)

  // 设置图标样式，模拟CSS伪元素的效果
  icon.setAttribute(`style`, `
    display: inline-block;
    width: 1.5rem;
    height: 1.5rem;
    margin-right: 0.5rem;
    vertical-align: middle;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    line-height: 1.75;
  `)

  // 根据类型设置背景图片
  const iconSvg = getIconSvg(config.icon, config.color)
  icon.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}")`

  return icon
}

/**
 * 获取图标SVG
 */
function getIconSvg(iconType: string, color: string): string {
  const iconMap: Record<string, string> = {
    description: `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'><path fill='${color}' fill-rule='evenodd' d='M8.048 2.488a.75.75 0 0 1-.036 1.06l-4.286 4a.75.75 0 0 1-1.095-.076l-1.214-1.5a.75.75 0 0 1 1.166-.944l.708.875l3.697-3.451a.75.75 0 0 1 1.06.036M11.25 5a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75M8.048 16.488a.75.75 0 0 1-.036 1.06l-4.286 4a.75.75 0 0 1-1.095-.076l-1.214-1.5a.75.75 0 1 1 1.166-.944l.708.875l3.697-3.451a.75.75 0 0 1 1.06.036M11.25 19a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75' clip-rule='evenodd'/><path fill='${color}' d='M8.048 9.488a.75.75 0 0 1-.036 1.06l-4.286 4a.75.75 0 0 1-1.095-.076l-1.214-1.5a.75.75 0 1 1 1.166-.944l.708.875l3.697-3.451a.75.75 0 0 1 1.06.036M11.25 12a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75' opacity='0.5'/></svg>`,
    lightbulb: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='${color}' d='M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.6.6 0 0 1-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6-1.12.4-2.24-.16-2.9-.82 1.19-.28 1.9-1.16 2.11-2.05.17-.8-.15-1.46-.28-2.23-.12-.74-.1-1.37.17-2.06.19.38.39.76.63 1.06.77 1 1.98 1.44 2.24 2.8.04.14.06.28.06.43.03.82-.33 1.72-.93 2.27'/></svg>`,
    edit: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='${color}'><path stroke-linecap='round' stroke-linejoin='round' d='m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10'/></svg>`,
    help: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z'/></svg>`,
    info: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='${color}'><path stroke-linecap='round' stroke-linejoin='round' d='m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z'/></svg>`,
    check_circle: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.5,8L11,13.5L7.5,10L6,11.5L11,16.5Z'/%3E%3C/svg%3E`,
    speakerphone: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='${color}'><path stroke-linecap='round' stroke-linejoin='round' d='M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46'/></svg>`,
    warning: `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='${color}'><path stroke-linecap='round' stroke-linejoin='round' d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'/></svg>`,
    close_circle: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z'/%3E%3C/svg%3E`,
    alert_circle: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z'/%3E%3C/svg%3E`,
    error: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z'/%3E%3C/svg%3E`,
    bug: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M14,12H10V10H14M14,16H10V14H14M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.99,4.59C13.18,4.23 12.62,4 12,4S10.82,4.23 10.01,4.59L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.03,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.03,15.67 6.09,16H4V18H6.81C7.26,18.78 7.88,19.45 8.62,19.96L7,21.59L8.41,23L10.01,21.41C10.82,21.77 11.38,22 12,22S13.18,21.77 13.99,21.41L15.59,23L17,21.59L15.37,19.96C16.12,19.45 16.74,18.78 17.19,18H20V16H17.91C17.97,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.97,10.33 17.91,10H20V8Z'/%3E%3C/svg%3E`,
    code: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M14.6,16.6L19.2,12L14.6,7.4L13.2,8.8L16.4,12L13.2,15.2L14.6,16.6M9.4,16.6L4.8,12L9.4,7.4L10.8,8.8L7.6,12L10.8,15.2L9.4,16.6Z'/%3E%3C/svg%3E`,
    quote: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' d='M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z'/%3E%3C/svg%3E`,
  }

  return iconMap[iconType] || iconMap.info
}

/**
 * 转换单个admonition元素
 * 将div.admonition转换为blockquote，div.admonition-title转换为p
 */
function convertAdmonitionElement(admonition: HTMLElement): HTMLElement {
  // 创建新的blockquote元素
  const blockquote = document.createElement(`blockquote`)

  // 复制所有属性（除了class，因为我们要重新设置）
  Array.from(admonition.attributes).forEach((attr) => {
    if (attr.name !== `class`) {
      blockquote.setAttribute(attr.name, attr.value)
    }
  })

  // 设置blockquote的class，保持原有的admonition类名
  blockquote.className = admonition.className

  // 获取admonition类型（从class中提取）
  const admonitionClasses = admonition.className.split(` `)
  const admonitionType = admonitionClasses.find(cls => cls !== `admonition`) || `info`
  const config = getAdmonitionConfig(admonitionType)

  // 设置blockquote的样式，匹配期望效果
  blockquote.style.cssText = `
    margin: 1rem 0;
    padding: 0;
    border: none;
    border-left: 4px solid ${config.color};
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  `

  // 复制所有子元素到blockquote
  while (admonition.firstChild) {
    blockquote.appendChild(admonition.firstChild)
  }

  // 处理admonition标题：将div.admonition-title转换为p
  const titleElement = blockquote.querySelector(`.admonition-title`) as HTMLElement
  if (titleElement) {
    // 创建新的p元素来替换div
    const titleP = document.createElement(`p`)

    // 复制所有属性
    Array.from(titleElement.attributes).forEach((attr) => {
      if (attr.name !== `class`) {
        titleP.setAttribute(attr.name, attr.value)
      }
    })

    // 设置class为admonition-title
    titleP.className = `admonition-title`

    // 设置标题样式，匹配期望效果
    titleP.style.cssText = `
      margin: 0;
      padding: 12px 16px;
      background: ${config.color}15;
      border-bottom: 1px solid ${config.color}30;
      font-weight: 600;
      font-size: 14px;
      color: #333;
      display: flex;
      align-items: center;
    `

    // 创建图标span并插入到标题开头
    const iconSpan = createIconSpan(admonitionType)
    titleP.appendChild(iconSpan)

    // 复制标题文本内容
    const titleText = titleElement.textContent || ``
    titleP.appendChild(document.createTextNode(titleText))

    // 替换原来的div
    titleElement.parentNode?.replaceChild(titleP, titleElement)
  }

  // 处理内容区域
  const contentElements = Array.from(blockquote.children).filter(
    child => !child.classList.contains(`admonition-title`),
  )

  if (contentElements.length > 0) {
    // 创建内容包装器
    const contentWrapper = document.createElement(`div`)
    contentWrapper.style.cssText = `
      padding: 16px 16px 16px 16px;
      background: #ffffff;
    `

    // 将所有非标题内容移动到包装器中
    contentElements.forEach((element) => {
      contentWrapper.appendChild(element)
    })

    // 确保内容区域内的p标签有正确的上下边距
    const paragraphs = contentWrapper.querySelectorAll(`p`)
    paragraphs.forEach((p) => {
      const pElement = p as HTMLElement
      // 保留原有的margin，如果没有则添加0.5rem的上下边距
      const currentMargin = pElement.style.margin || ``
      if (!currentMargin) {
        pElement.style.margin = `0.5rem 0.5rem 0.5rem 1rem`
      }
    })

    // 将内容包装器添加到blockquote
    blockquote.appendChild(contentWrapper)
  }

  return blockquote
}

/**
 * 将admonition的div元素转换为blockquote元素以兼容公众号
 * @param html - HTML字符串
 * @returns 转换后的HTML字符串
 */
export function processAdmonitionToBlockquote(html: string): string {
  // 创建临时容器
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = html

  // 查找所有admonition元素
  const admonitions = tempDiv.querySelectorAll(`.admonition`)

  admonitions.forEach((admonition) => {
    const element = admonition as HTMLElement
    const blockquote = convertAdmonitionElement(element)

    // 替换原来的div
    element.parentNode?.replaceChild(blockquote, element)
  })

  return tempDiv.innerHTML
}
