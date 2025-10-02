let mathBlockId: number = 0

export function resetMathBlockId() {
  mathBlockId = 0
}

function getNextBlockId() {
  const dataId = `mktwain-math-${mathBlockId++}`
  console.debug(`Math block dataId:`, dataId)
  return dataId
}
export function markedMath(): MarkedExtension {
  return {
    extensions: [
      {
        name: `math`,
        level: `block`,
        tokenizer(src) {
          const cap = mathBlockRegex.exec(src)
          if (cap) {
            return {
              type: `math`,
              raw: cap[0],
              text: cap[1],
            }
          }
        },
        renderer(token) {
          // 生成唯一的 data-id 用于转图功能
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
          counters.math = counters.math + 1
          const dataId = getNextBlockId()

          return `<section class="block_katex" mktwain-data-id="${dataId}">$$\n${token.text}\n$$</section>`
        },

      },
      {
        name: `inlineMath`,
        level: `inline`,
        tokenizer(src, _tokens) {
          const cap = inlineMathRegex.exec(src)
          if (cap) {
            return {
              type: `inlineMath`,
              raw: cap[0],
              text: cap[1],
            }
          }
        },
        renderer(token) {
          return katex.renderToString(token.text, {
            displayMode: false,
          })
        },
      },
    ],
  }
}
