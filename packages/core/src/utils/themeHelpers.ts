import type { Block, ExtendedProperties, Inline, Theme } from '@md/shared/types'
import type { PropertiesHyphen } from 'csstype'

/**
 * 自定义主题
 * @param theme - 基础主题
 * @param options - 自定义选项
 * @returns 自定义后的主题
 */
export function customizeTheme(theme: Theme, options: {
  fontSize?: number
  color?: string
}) {
  const newTheme = JSON.parse(JSON.stringify(theme)) as Theme
  if (options.fontSize) {
    Object.keys(newTheme.base).forEach((key) => {
      if (key.includes(`font-size`)) {
        (newTheme.base as any)[key] = `${options.fontSize}px`
      }
    })
  }
  if (options.color) {
    Object.keys(newTheme.base).forEach((key) => {
      if (key.includes(`color`) && key.includes(`primary`)) {
        (newTheme.base as any)[key] = options.color
      }
    })
  }
  return newTheme
}

/**
 * 根据用户自定义 CSS 和模板生成主题
 * @param jsonString - 用户自定义的样式对象
 * @param color - 主色调
 * @param theme - 基础主题
 * @returns 生成的主题
 */
export function customCssWithTemplate(jsonString: Partial<Record<Block | Inline, PropertiesHyphen>>, color: string, theme: Theme) {
  const newTheme = customizeTheme(theme, { color })

  const mergeProperties = <T extends Block | Inline = Block>(target: Record<T, PropertiesHyphen>, source: Partial<Record<Block | Inline, PropertiesHyphen>>, keys: T[]) => {
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
    `blockquote_p`,
    `blockquote_p_note`,
    `blockquote_p_tip`,
    `blockquote_p_important`,
    `blockquote_p_warning`,
    `blockquote_p_caution`,
    `blockquote_title`,
    `blockquote_title_note`,
    `blockquote_title_tip`,
    `blockquote_title_important`,
    `blockquote_title_warning`,
    `blockquote_title_caution`,
    `image`,
    `ul`,
    `ol`,
    `block_katex`,
  ]
  const inlineKeys: Inline[] = [`listitem`, `codespan`, `link`, `wx_link`, `strong`, `table`, `thead`, `td`, `footnote`, `figcaption`, `em`, `inline_katex`]

  mergeProperties(newTheme.block, jsonString, blockKeys)
  mergeProperties(newTheme.inline, jsonString, inlineKeys)

  // 处理 CSS 类选择器和其他自定义样式
  // 将类选择器和其他非 Block/Inline 键映射到 Theme.extra 字段
  const paginationClassMapping: Record<string, keyof NonNullable<Theme[`extra`]>> = {
    [`.pagination-page`]: `pagination_page`,
    [`.pagination-page.page-cover`]: `pagination_cover`,
    [`.pagination-page.page-end`]: `pagination_end`,
    [`.pagination-page.page-2`]: `pagination_page_2`,
    [`.pagination-page.page-3`]: `pagination_page_3`,
  }

  // 将 jsonString 中的非 Block/Inline 键提取出来并合并到 extra
  const unknownSource = jsonString as unknown as Record<string, PropertiesHyphen>
  const extraStyles: Record<string, PropertiesHyphen> = {}
  console.log(`[DEBUG] Processing unknown keys:`, Object.keys(unknownSource))

  Object.keys(unknownSource).forEach((key) => {
    if (!(key in (newTheme.block as Record<string, any>)) && !(key in (newTheme.inline as Record<string, any>))) {
      console.log(`[DEBUG] Processing extra key:`, key)
      // Handle predefined pagination classes with specific mapping
      if (paginationClassMapping[key]) {
        console.log(`[DEBUG] Mapped pagination class ${key} to ${paginationClassMapping[key]}`)
        extraStyles[paginationClassMapping[key]] = unknownSource[key]
      }
      // Handle arbitrary CSS class selectors (starting with dot)
      else if (key.startsWith(`.`)) {
        const classKey = key.substring(1) // Remove leading dot
        console.log(`[DEBUG] Mapped CSS class ${key} to ${classKey}`)
        extraStyles[classKey] = unknownSource[key]
      }
      // Handle other custom selectors
      else {
        console.log(`[DEBUG] Added custom selector:`, key)
        extraStyles[key] = unknownSource[key]
      }
    }
  })

  console.log(`[DEBUG] Final extraStyles:`, extraStyles)
  if (Object.keys(extraStyles).length) {
    newTheme.extra = {
      ...(newTheme.extra || {}),
      ...extraStyles as Record<any, ExtendedProperties>,
    }
    console.log(`[DEBUG] Updated theme.extra:`, newTheme.extra)
  }

  return newTheme
}

/**
 * 将样式对象转换为 CSS 字符串
 * @param style - 样式对象
 * @returns CSS 字符串
 */
export function getStyleString(style: ExtendedProperties): string {
  return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join(`; `)
}

/**
 * 将 theme.extra 中的样式注入到页面中
 * @param theme - 主题对象，包含 extra 样式
 */
export function injectExtraStyles(theme: any): void {
  // Remove existing custom styles
  const existingStyle = document.querySelector(`#custom-extra-styles`)
  if (existingStyle) {
    existingStyle.remove()
  }

  // Return early if no extra styles to inject
  if (!theme.extra || Object.keys(theme.extra).length === 0) {
    return
  }

  // Convert theme.extra to CSS rules
  const cssRules: string[] = []

  Object.entries(theme.extra).forEach(([key, styles]: [string, any]) => {
    // Convert style object to CSS string
    const cssProperties = Object.entries(styles || {})
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join(`\n`)

    if (cssProperties) {
      // Generate CSS selector based on key name
      let selector = key

      // Handle pagination-related class selectors
      if (key === `pagination_cover`) {
        selector = `.pagination-page.page-cover`
      }
      else if (key === `pagination_end`) {
        selector = `.pagination-page.page-end`
      }
      else if (key === `pagination_page`) {
        selector = `.pagination-page`
      }
      else if (key.startsWith(`pagination_page_`)) {
        const pageNum = key.replace(`pagination_page_`, ``)
        selector = `.pagination-page.page-${pageNum}`
      }
      else if (!key.startsWith(`.`) && !key.includes(` `) && !key.includes(`:`)) {
        // If it's a simple class name, add dot prefix
        selector = `.${key}`
      }

      const cssRule = `${selector} {\n${cssProperties}\n}`
      cssRules.push(cssRule)
    }
  })

  if (cssRules.length > 0) {
    // Create new style element
    const styleElement = document.createElement(`style`)
    styleElement.setAttribute(`id`, `custom-extra-styles`)
    styleElement.setAttribute(`type`, `text/css`)
    styleElement.textContent = cssRules.join(`\n\n`)

    // Add to document head
    document.head.appendChild(styleElement)
  }
}
