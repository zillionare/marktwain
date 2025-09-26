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
  function renderAdmon(this: any, token: any) {
    const { meta, tokens = [] } = token

    let text = this.parser.parse(tokens)
    console.debug(`🔍 parsed text:`, text)

    // 为所有段落添加样式，确保每个 <p> 标签都有正确的样式
    text = text.replace(/<p(?:\s[^>]*)?>/g, `<p style="${getStyleString(meta.contentStyle)}">`)

    // 生成唯一的 data-id 用于转图功能，与 findMarkdownBlocks 中的 ID 生成逻辑保持一致
    // 使用统一格式: mktwain-{type}-{counter}
    // 使用独立计数器确保同类型块的编号一致性
    if (!(globalThis as any)._marktwainBlockCounters) {
      (globalThis as any)._marktwainBlockCounters = {
        admonition: 0,
        code: 0,
        math: 0,
      }
    }
    const counters = (globalThis as any)._marktwainBlockCounters
    counters.admonition = counters.admonition + 1
    const dataId = `mktwain-admonition-${counters.admonition}`
    console.log(`Admonition renderAdmon called, generating dataId:`, dataId)

    // 使用 div 结构而不是 blockquote，以匹配 CSS 样式
    let tmpl = `<div class="${meta.className} ${meta.variant}" style="${getStyleString(meta.wrapperStyle)}" mktwain-data-id="${dataId}">
`
    tmpl += `<div class="${meta.titleClassName}" style="${getStyleString(meta.titleStyle)}">`
    tmpl += meta.title
    tmpl += `</div>\n`
    tmpl += text
    tmpl += `</div>\n`

    console.debug(`🔍 final template:`, tmpl)
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
      ; (token as any).meta = buildMeta(variantType, matchedVariant)
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
          // 匹配 !!! {tag} ['title'] 语法，单个空白行结束（符合 CommonMark 标准）
          // 支持可选的标题，标题用引号包围
          const pattern = /^!!!\s+(\w+)(?:\s+['"](.*?)['"])?\s*\n([\s\S]*?)(?:\n\s*\n|$)/
          const match = pattern.exec(src)

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
