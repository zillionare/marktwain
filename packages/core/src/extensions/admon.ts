import type { AdmonOptions, AdmonVariantItem } from '@md/shared/types'
import type { MarkedExtension } from 'marked'
import { getStyleString, ucfirst } from '../utils'

/**
 * A marked extension to support admonitions with Material Design icons.
 * Supports both !!! syntax and traditional > [!TYPE] syntax.
 * Uses admonition classes and CSS from apps/web/src/assets/admon.css
 */
export function markedAdmon(options: AdmonOptions = {}): MarkedExtension {
  const { className = `admonition`, variants = [] } = options
  const resolvedVariants = resolveVariants(variants)

  // 提取公共的元数据构建逻辑
  function buildMeta(variantType: string, matchedVariant: AdmonVariantItem, fromContainer = false) {
    const { styles } = options
    return {
      className,
      variant: variantType,
      icon: matchedVariant.icon,
      title: matchedVariant.title ?? ucfirst(variantType),
      titleClassName: `admonition-title`,
      fromContainer,
      wrapperStyle: {
        ...styles?.blockquote,
        ...styles?.[`blockquote_${variantType}` as keyof typeof styles],
        // 移除内联样式，让 CSS 文件完全控制样式
        'padding': null,
        'border-left': null,
        'border-right': null,
        'border-top': null,
        'border-bottom': null,
        'border': null,
        'border-radius': null,
        'background': null,
        'background-color': null,
        'color': null,
        'margin': null,
        'margin-bottom': null,
        'font-style': null,
        'font-size': null,
      },
      titleStyle: {
        ...styles?.blockquote_title,
        ...styles?.[`blockquote_title_${variantType}` as keyof typeof styles],
        // 移除内联样式，让 CSS 文件完全控制标题样式
        'display': null,
        'align-items': null,
        'gap': null,
        'margin-bottom': null,
        'color': null,
        'background-color': null,
        'border-bottom': null,
        'padding': null,
        'margin': null,
        'font-size': null,
        'font-weight': null,
        'line-height': null,
      },
      contentStyle: {
        ...styles?.blockquote_p,
        ...styles?.[`blockquote_p_${variantType}` as keyof typeof styles],
        // 移除内联样式，让 CSS 文件完全控制内容样式
        'display': null,
        'font-size': null,
        'letter-spacing': null,
        'color': null,
        'margin': null,
        'padding': null,
      },
    }
  }

  // 提取公共的渲染逻辑
  function renderAdmon(token: any) {
    const { meta, tokens = [] } = token
    // @ts-expect-error marked renderer context has parser property
    let text = this.parser.parse(tokens)
    text = text.replace(/<p .*?>/g, `<p style="${getStyleString(meta.contentStyle)}">`)

    // 生成唯一的 data-id 用于转图功能
    const dataId = `admon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`Admonition renderAdmon called, generating dataId:`, dataId)

    // 使用 div 结构而不是 blockquote，以匹配 CSS 样式
    let tmpl = `<div class="${meta.className} ${meta.variant}" style="${getStyleString(meta.wrapperStyle)}" mktwain-data-id="${dataId}">
`
    tmpl += `<div class="${meta.titleClassName}" style="${getStyleString(meta.titleStyle)}">`
    tmpl += meta.title
    tmpl += `</div>\n`
    tmpl += text
    tmpl += `</div>\n`

    return tmpl
  }

  return {
    walkTokens(token) {
      if (token.type !== `blockquote`)
        return

      const matchedVariant = resolvedVariants.find((variant) => {
        const pattern = new RegExp(`^\\s*\\[!${variant.type.toUpperCase()}\\]`)
        return pattern.test(token.raw)
      })

      if (!matchedVariant)
        return

      const variantType = matchedVariant.type
      token.type = `admon`
      ;(token as any).meta = buildMeta(variantType, matchedVariant)
    },
    extensions: [
      {
        name: `admon`,
        level: `block`,
        renderer: renderAdmon,
      },
      {
        name: `admonition`,
        level: `block`,
        start(src) {
          return src.match(/^!!!/)?.index
        },
        tokenizer(src, _tokens) {
          // 匹配 !!! {tag} ['title'] 语法，支持两个连续空白行结束
          const match = /^!!!\s+(\w+)(?:\s+['"]([^'"]*)['"])?\s*\n([\s\S]*?)\n\s*\n\s*\n/.exec(src)

          if (match) {
            const [raw, variant, title, content] = match
            const matchedVariant = resolvedVariants.find(v => v.type === variant)
            if (!matchedVariant)
              return

            const meta = buildMeta(variant, matchedVariant, true)
            if (title) {
              meta.title = title
            }

            return {
              type: `admon`,
              raw,
              text: content.trim(),
              tokens: this.lexer.blockTokens(content.trim()),
              meta,
            }
          }
        },
        renderer: renderAdmon,
      },
    ],
  }
}

/**
 * The default configuration for admonition variants.
 * Using admonition styles from apps/web/src/assets/admon.css
 */
const defaultAdmonVariant: AdmonVariantItem[] = [
  {
    type: `note`,
    icon: `info`,
    title: `Note`,
  },
  {
    type: `info`,
    icon: `info`,
    title: `Info`,
  },
  {
    type: `tip`,
    icon: `lightbulb`,
    title: `Tip`,
  },
  {
    type: `important`,
    icon: `priority_high`,
    title: `Important`,
  },
  {
    type: `warning`,
    icon: `warning`,
    title: `Warning`,
  },
  {
    type: `caution`,
    icon: `warning`,
    title: `Caution`,
  },
  {
    type: `attention`,
    icon: `warning`,
    title: `Attention`,
  },
  {
    type: `example`,
    icon: `play_circle`,
    title: `Example`,
  },
  {
    type: `abstract`,
    icon: `description`,
    title: `Abstract`,
  },
  {
    type: `question`,
    icon: `help`,
    title: `Question`,
  },
]

/**
 * Resolve admonition variants with defaults.
 */
function resolveVariants(variants: AdmonVariantItem[]): AdmonVariantItem[] {
  const variantMap = new Map<string, AdmonVariantItem>()

  // 添加默认变体
  defaultAdmonVariant.forEach((variant) => {
    variantMap.set(variant.type, variant)
  })

  // 用户自定义变体覆盖默认变体
  variants.forEach((variant) => {
    variantMap.set(variant.type, variant)
  })

  return Array.from(variantMap.values())
}
