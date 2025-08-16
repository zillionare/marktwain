// 自动化测试脚本
// 在浏览器控制台中运行此脚本来测试功能

async function testImageBedConfiguration() {
  console.log(`🧪 测试图床配置...`)

  // 从环境变量获取 GitHub token
  const githubToken = window.VITE_GITHUB_IMAGE_TOKEN || ``
  if (!githubToken) {
    console.warn(`⚠️ 未设置 VITE_GITHUB_IMAGE_TOKEN 环境变量，请在浏览器中手动设置：window.VITE_GITHUB_IMAGE_TOKEN = "your_token"`)
    return false
  }

  // 设置 GitHub 图床配置
  const githubConfig = {
    token: githubToken,
    owner: `zillionare`,
    repo: `marktwain`,
    path: `images/{year}/{month}`,
  }

  localStorage.setItem(`githubImageBedConfig`, JSON.stringify(githubConfig))
  localStorage.setItem(`imgHost`, `github`)
  localStorage.setItem(`githubConfig`, JSON.stringify(githubConfig))

  console.log(`✅ GitHub 图床配置已设置`)
  return true
}

async function testContentRendering() {
  console.log(`🧪 测试内容渲染...`)

  const testContent = `# 转图功能测试

## Admonition 测试

!!! note "测试提示"
    这是一个测试 admonition 块。

## 代码块测试

\`\`\`javascript
console.log("Hello World");
\`\`\`

## 数学公式测试

$$
E = mc^2
$$`

  // 获取编辑器实例
  const editorElement = document.querySelector(`.CodeMirror`)
  if (!editorElement) {
    console.error(`❌ 编辑器未找到`)
    return false
  }

  const editor = editorElement.CodeMirror
  if (!editor) {
    console.error(`❌ CodeMirror 实例未找到`)
    return false
  }

  // 设置测试内容
  editor.setValue(testContent)

  // 等待渲染
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 检查预览区域是否有渲染的块
  const outputElement = document.getElementById(`output`)
  if (!outputElement) {
    console.error(`❌ 预览区域未找到`)
    return false
  }

  const admonitionBlocks = outputElement.querySelectorAll(`[data-block-type="admonition"]`)
  const fencedBlocks = outputElement.querySelectorAll(`[data-block-type="fenced"]`)
  const mathBlocks = outputElement.querySelectorAll(`[data-block-type="math"]`)

  console.log(`✅ 找到 ${admonitionBlocks.length} 个 admonition 块`)
  console.log(`✅ 找到 ${fencedBlocks.length} 个代码块`)
  console.log(`✅ 找到 ${mathBlocks.length} 个数学公式块`)

  return admonitionBlocks.length > 0 && fencedBlocks.length > 0 && mathBlocks.length > 0
}

async function testConvertToImages() {
  console.log(`🧪 测试转图功能...`)

  // 查找转图按钮
  const convertButton = Array.from(document.querySelectorAll(`button`)).find(btn =>
    btn.textContent.includes(`转图`),
  )

  if (!convertButton) {
    console.error(`❌ 转图按钮未找到`)
    return false
  }

  console.log(`✅ 找到转图按钮`)

  // 模拟点击转图按钮
  convertButton.click()

  // 等待转换完成
  await new Promise(resolve => setTimeout(resolve, 5000))

  // 检查是否有转换后的内容
  const convertedMarkdown = localStorage.getItem(`convertedMarkdown`)
  if (convertedMarkdown) {
    console.log(`✅ 转换后的 Markdown 内容已生成`)
    console.log(`转换后的内容预览:`, `${convertedMarkdown.substring(0, 200)}...`)
    return true
  }
  else {
    console.error(`❌ 转换后的内容未生成`)
    return false
  }
}

async function testCopyFunctionality() {
  console.log(`🧪 测试复制功能...`)

  // 查找复制模式下拉菜单
  const copyModeButtons = document.querySelectorAll(`[role="radioitem"]`)
  const mdModeButton = Array.from(copyModeButtons).find(btn =>
    btn.textContent.includes(`MD 格式`),
  )

  if (mdModeButton) {
    mdModeButton.click()
    console.log(`✅ 已切换到 MD 格式复制模式`)
  }

  // 查找复制按钮
  const copyButton = Array.from(document.querySelectorAll(`button`)).find(btn =>
    btn.textContent.includes(`复制`) && !btn.textContent.includes(`转图`),
  )

  if (!copyButton) {
    console.error(`❌ 复制按钮未找到`)
    return false
  }

  console.log(`✅ 找到复制按钮`)
  return true
}

async function runAllTests() {
  console.log(`🚀 开始端到端测试...`)

  try {
    const configResult = await testImageBedConfiguration()
    if (!configResult)
      return false

    const renderResult = await testContentRendering()
    if (!renderResult)
      return false

    const convertResult = await testConvertToImages()
    if (!convertResult)
      return false

    const copyResult = await testCopyFunctionality()
    if (!copyResult)
      return false

    console.log(`🎉 所有测试通过！`)
    return true
  }
  catch (error) {
    console.error(`❌ 测试过程中出现错误:`, error)
    return false
  }
}

// 导出测试函数
window.testMarkdownImageConversion = {
  runAllTests,
  testImageBedConfiguration,
  testContentRendering,
  testConvertToImages,
  testCopyFunctionality,
}

console.log(`📋 测试脚本已加载。运行 testMarkdownImageConversion.runAllTests() 开始测试`)
