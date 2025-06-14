// 测试CommonMark admonition修复
import { marked } from 'marked'

// 模拟扩展
const testExtension = {
  name: `test-admonition`,
  level: `block`,
  start(src) {
    const match = src.match(/^!!!\s+/)
    return match ? match.index : undefined
  },
  tokenizer(src) {
    const rule = /^!!!\s+(note|tip|important|warning|caution|info|success|failure|danger|bug|example|quote)(?:\s+"([^"]*)")?\s*\n([\s\S]*?)(?=\n\n|\n$|$)/

    const match = rule.exec(src)
    if (match) {
      const [raw, type, title, content] = match
      console.log(`Matched:`, { raw, type, title, content })

      return {
        type: `admonition`,
        raw,
        admonitionType: type,
        title,
        text: content.trim(),
      }
    }
    return undefined
  },
  renderer(token) {
    return `<div class="admonition admonition-${token.admonitionType}">
      <div class="title">${token.title || token.admonitionType}</div>
      <div class="content">${token.text}</div>
    </div>`
  },
}

marked.use({ extensions: [testExtension] })

const testContent = `!!! note
    this is a test

Some other content`

console.log(`Input:`)
console.log(testContent)
console.log(`\nOutput:`)
console.log(marked.parse(testContent))
