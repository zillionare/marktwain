// 测试CommonMark admonition解析
import { marked } from 'marked'
import markedCommonMarkAlert from './src/utils/MDCommonMarkAlert.ts'

// 注册扩展
marked.use(markedCommonMarkAlert())

const testContent = `# CommonMark Admonition 测试

!!! note
    这是一个note类型的admonition块。

!!! tip "自定义标题"
    这是一个带自定义标题的tip块。

!!! warning
    这是一个warning类型的警告块。
`

console.log(`Input:`)
console.log(testContent)
console.log(`\nOutput:`)
console.log(marked.parse(testContent))
