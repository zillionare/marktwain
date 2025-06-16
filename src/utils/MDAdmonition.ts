import type { AlertOptions, AlertVariantItem } from '@/types'
import type { MarkedExtension } from 'marked'
import { getStyleString } from '.'

/**
 * A marked extension to support CommonMark admonition syntax.
 * Syntax: !!! type "Optional Title"
 *         Content here
 */
export default function markedAdmonition(options: AlertOptions = {}): MarkedExtension {
  const { className = `markdown-alert`, variants = [] } = options
  const resolvedVariants = resolveVariants(variants)

  return {
    extensions: [
      {
        name: `admonition`,
        level: `block`,
        start(src: string) {
          const match = src.match(/^!!!/)
          return match ? match.index : undefined
        },
        tokenizer(src: string) {
          const admonitionTypes = resolvedVariants.map(v => v.type).join(`|`)
          // Updated regex to handle the CommonMark admonition syntax properly
          // This regex matches: !!! type "optional title"
          //                     content lines (indented with 4 spaces)
          // Stops at:
          // 1. Two consecutive blank lines (only whitespace + newlines)
          // 2. HTML comment with matching tag: <!--type-->
          // 3. End of string
          const rule = new RegExp(`^!!!\\s+(${admonitionTypes})(?:\\s+"([^"]*)")?\\s*\\n([\\s\\S]*?)(?=\\n\\s*\\n\\s*\\n|<!--\\1-->|$)`, `i`)
          const match = src.match(rule)

          if (match) {
            const [fullMatch, type, title, content] = match
            const variant = resolvedVariants.find(v => v.type.toLowerCase() === type.toLowerCase())

            if (variant) {
              const { styles } = options

              // Process content - remove 4-space indentation from each line
              const lines = content.split(`\n`)
              const processedContent = lines
                .map(line => line.replace(/^ {4}/, ``)) // Remove exactly 4 spaces
                .join(`\n`)
                .trim()

              return {
                type: `admonition`,
                raw: fullMatch,
                meta: {
                  className,
                  variant: variant.type,
                  icon: variant.icon,
                  title: title || ucfirst(variant.type),
                  titleClassName: `${className}-title`,
                  wrapperStyle: {
                    ...styles?.blockquote,
                    ...styles?.[`blockquote_${variant.type}` as keyof typeof styles],
                  },
                  titleStyle: {
                    ...styles?.blockquote_title,
                    ...styles?.[`blockquote_title_${variant.type}` as keyof typeof styles],
                  },
                  contentStyle: {
                    ...styles?.blockquote_p,
                    ...styles?.[`blockquote_p_${variant.type}` as keyof typeof styles],
                  },
                },
                tokens: this.lexer.blockTokens(processedContent),
              }
            }
          }
          return undefined
        },
        renderer({ meta, tokens = [] }) {
          let text = this.parser.parse(tokens)
          text = text.replace(/<p .*?>/g, `<p style="${getStyleString(meta.contentStyle)}">`)
          let tmpl = `<blockquote class="${meta.className} ${meta.className}-${meta.variant}" style="${getStyleString(meta.wrapperStyle)}">\n`
          tmpl += `<p class="${meta.titleClassName}" style="${getStyleString(meta.titleStyle)}">`
          tmpl += meta.icon.replace(
            `<svg`,
            `<svg style="fill: ${meta.titleStyle?.color ?? `inherit`}"`,
          )
          tmpl += meta.title
          tmpl += `</p>\n`
          tmpl += text
          tmpl += `</blockquote>\n`

          return tmpl
        },
      },
    ],
  }
}

/**
 * The default configuration for alert variants.
 */
const defaultAlertVariant: AlertVariantItem[] = [
  {
    type: `note`,
    icon: `<svg class="octicon octicon-info" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`,
  },
  {
    type: `tip`,
    icon: `<svg class="octicon octicon-light-bulb" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>`,
  },
  {
    type: `important`,
    icon: `<svg class="octicon octicon-report" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`,
  },
  {
    type: `warning`,
    icon: `<svg class="octicon octicon-alert" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`,
  },
  {
    type: `caution`,
    icon: `<svg class="octicon octicon-stop" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`,
  },
  {
    type: `question`,
    icon: `<svg class="octicon octicon-question" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.92 6.085c.081-.16.19-.299.327-.417.145-.129.32-.234.516-.314.204-.086.437-.129.698-.129.268 0 .108.043.327.129.219.086.402.203.55.35.152.143.272.31.36.5.092.196.138.400.138.614 0 .209-.045.403-.134.58a1.25 1.25 0 0 1-.366.448 2.45 2.45 0 0 1-.521.292c-.187.067-.37.100-.548.100-.178 0-.361-.033-.548-.1a2.45 2.45 0 0 1-.521-.292 1.25 1.25 0 0 1-.366-.448A1.17 1.17 0 0 1 6 7.614c0-.214.046-.418.138-.614.088-.19.208-.357.36-.5.148-.147.331-.264.55-.35.219-.086.327-.129.327-.129ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`,
  },
  {
    type: `hint`,
    icon: `<svg class="octicon octicon-light-bulb" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>`,
  },
  {
    type: `example`,
    icon: `<svg class="octicon octicon-code" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"></path></svg>`,
  },
  {
    type: `abstract`,
    icon: `<svg class="octicon octicon-book" style="margin-right: 0.25em;" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"></path></svg>`,
  },
]

/**
 * Resolves the variants configuration, combining the provided variants with
 * the default variants.
 */
export function resolveVariants(variants: AlertVariantItem[]) {
  if (!variants.length)
    return defaultAlertVariant

  return Object.values(
    [...defaultAlertVariant, ...variants].reduce(
      (map, item) => {
        map[item.type] = item
        return map
      },
      {} as { [key: string]: AlertVariantItem },
    ),
  )
}

/**
 * Capitalizes the first letter of a string.
 */
export function ucfirst(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase()
}
