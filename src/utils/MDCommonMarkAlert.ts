import type { ThemeStyles } from '@/types'
import type { Tokens } from 'marked'
import { getStyleString } from '.'

/**
 * CommonMark Admonition 扩展
 * 支持 !!! note, !!! tip, !!! warning 等语法
 */

interface AdmonitionToken extends Tokens.Generic {
  type: `admonition`
  raw: string
  admonitionType: string
  title?: string
  text: string
}

interface CommonMarkAdmonitionOptions {
  styles?: ThemeStyles
}

const _admonitionTypes = [
  `note`,
  `tip`,
  `important`,
  `warning`,
  `caution`,
  `info`,
  `success`,
  `failure`,
  `danger`,
  `bug`,
  `example`,
  `quote`,
]

const admonitionTypeMap: Record<string, { icon: string, className: string }> = {
  note: { icon: `📝`, className: `note` },
  tip: { icon: `💡`, className: `tip` },
  important: { icon: `❗`, className: `important` },
  warning: { icon: `⚠️`, className: `warning` },
  caution: { icon: `🚨`, className: `caution` },
  info: { icon: `ℹ️`, className: `info` },
  success: { icon: `✅`, className: `success` },
  failure: { icon: `❌`, className: `failure` },
  danger: { icon: `🚫`, className: `danger` },
  bug: { icon: `🐛`, className: `bug` },
  example: { icon: `📋`, className: `example` },
  quote: { icon: `💬`, className: `quote` },
}

export default function markedCommonMarkAdmonition(options: CommonMarkAdmonitionOptions = {}) {
  const { styles } = options

  return {
    name: `commonmark-admonition`,
    level: `block` as const,
    start(src: string) {
      const match = src.match(/^!!!\s+/)
      return match ? match.index : undefined
    },
    tokenizer(src: string) {
      // 匹配 CommonMark admonition 语法
      const rule = /^!!!\s+(note|tip|important|warning|caution|info|success|failure|danger|bug|example|quote)(?:\s+"([^"]*)")?\s*\n((?:(?: {4}|\t).*(?:\n|$))*)/

      const match = rule.exec(src)
      if (match) {
        const [raw, type, title, content] = match

        // 处理缩进内容
        const processedContent = content
          .split(`\n`)
          .map((line) => {
            if (line.startsWith(`    `)) {
              return line.slice(4)
            }
            else if (line.startsWith(`\t`)) {
              return line.slice(1)
            }
            else if (line.trim() === ``) {
              return ``
            }
            return line
          })
          .join(`\n`)
          .trim()

        const token: AdmonitionToken = {
          type: `admonition`,
          raw,
          admonitionType: type,
          title,
          text: processedContent,
        }

        return token
      }
      return undefined
    },
    renderer(token: AdmonitionToken) {
      const { admonitionType, title, text } = token
      const config = admonitionTypeMap[admonitionType] || admonitionTypeMap.note

      // 处理标题
      const displayTitle = title || admonitionType.charAt(0).toUpperCase() + admonitionType.slice(1)

      // 渲染内容（支持嵌套 Markdown）
      const renderedContent = this.parser.parse(text)

      // 应用样式
      const wrapperStyle = {
        ...styles?.blockquote,
        ...styles?.[`blockquote_${admonitionType}` as keyof typeof styles],
      }

      const titleStyle = {
        ...styles?.blockquote_title,
        ...styles?.[`blockquote_title_${admonitionType}` as keyof typeof styles],
      }

      const contentStyle = {
        ...styles?.blockquote_p,
        ...styles?.[`blockquote_p_${admonitionType}` as keyof typeof styles],
      }

      // 处理内容中的段落样式
      const styledContent = renderedContent.replace(
        /<p .*?>/g,
        `<p style="${getStyleString(contentStyle)}">`,
      )

      return `
        <blockquote class="admonition admonition-${config.className}" style="${getStyleString(wrapperStyle)}">
          <div class="admonition-title" style="${getStyleString(titleStyle)}">
            <span class="admonition-icon">${config.icon}</span>
            <span class="admonition-title-text">${displayTitle}</span>
          </div>
          <div class="admonition-content">
            ${styledContent}
          </div>
        </blockquote>
      `
    },
  } as const
}
