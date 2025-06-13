import type { ThemeStyles } from '@/types'
import type { ReadTimeResults } from 'reading-time'
import DEFAULT_CONTENT from '@/assets/example/markdown.md?raw'
import DEFAULT_CSS_CONTENT from '@/assets/example/theme-css.txt?raw'
import {
  altKey,
  defaultStyleConfig,
  shiftKey,
  themeMap,
  widthOptions,
} from '@/config'

import {
  addPrefix,
  downloadMD,
  exportHTML,
  formatDoc,
  sanitizeTitle,
} from '@/utils'
import { css2json, customCssWithTemplate, customizeTheme, modifyHtmlContent } from '@/utils/'
import { copyPlain } from '@/utils/clipboard'
import { MarkdownProcessor } from '@/utils/markdownProcessor'
import { initRenderer } from '@/utils/renderer'
import CodeMirror from 'codemirror'
import { toPng } from 'html-to-image'
import { v4 as uuid } from 'uuid'

import { toast } from 'vue-sonner'

/**********************************
 * Post 结构接口
 *********************************/
interface Post {
  id: string
  title: string
  content: string
  history: {
    datetime: string
    content: string
  }[]
  createDatetime: Date
  updateDatetime: Date
  // 父标签
  parentId?: string | null
  // 展开状态
  collapsed?: boolean
}

export const useStore = defineStore(`store`, () => {
  // 是否开启深色模式
  const isDark = useDark()
  const toggleDark = useToggle(isDark)

  // 是否开启 Mac 代码块
  const isMacCodeBlock = useStorage(`isMacCodeBlock`, defaultStyleConfig.isMacCodeBlock)
  const toggleMacCodeBlock = useToggle(isMacCodeBlock)

  // 是否在左侧编辑
  const isEditOnLeft = useStorage(`isEditOnLeft`, true)
  const toggleEditOnLeft = useToggle(isEditOnLeft)

  // 是否开启微信外链接底部引用
  const isCiteStatus = useStorage(`isCiteStatus`, defaultStyleConfig.isCiteStatus)
  const toggleCiteStatus = useToggle(isCiteStatus)

  // 是否开启 AI 工具箱
  const showAIToolbox = useStorage(`showAIToolbox`, true)
  const toggleAIToolbox = useToggle(showAIToolbox)

  // 是否统计字数和阅读时间
  const isCountStatus = useStorage(`isCountStatus`, defaultStyleConfig.isCountStatus)
  const toggleCountStatus = useToggle(isCountStatus)

  // 是否开启段落首行缩进
  const isUseIndent = useStorage(addPrefix(`use_indent`), false)
  const toggleUseIndent = useToggle(isUseIndent)

  const output = ref(``)

  // 文本字体
  const theme = useStorage<keyof typeof themeMap>(addPrefix(`theme`), defaultStyleConfig.theme)
  // 文本字体
  const fontFamily = useStorage(`fonts`, defaultStyleConfig.fontFamily)
  // 文本大小
  const fontSize = useStorage(`size`, defaultStyleConfig.fontSize)
  // 主色
  const primaryColor = useStorage(`color`, defaultStyleConfig.primaryColor)
  // 代码块主题
  const codeBlockTheme = useStorage(`codeBlockTheme`, defaultStyleConfig.codeBlockTheme)
  // 图注格式
  const legend = useStorage(`legend`, defaultStyleConfig.legend)

  // 预览宽度
  const previewWidth = useStorage(`previewWidth`, widthOptions[0].value)

  const fontSizeNumber = computed(() => Number(fontSize.value.replace(`px`, ``)))

  // 内容编辑器
  const editor = ref<CodeMirror.EditorFromTextArea | null>(null)
  // 预备弃用的旧字段
  const editorContent = useStorage(`__editor_content`, DEFAULT_CONTENT)

  const isOpenRightSlider = useStorage(addPrefix(`is_open_right_slider`), false)
  const isOpenPostSlider = useStorage(addPrefix(`is_open_post_slider`), false)

  /*******************************
   * 内容列表 posts：默认就带 id
   ******************************/
  const posts = useStorage<Post[]>(addPrefix(`posts`), [
    {
      id: uuid(),
      title: `内容1`,
      content: DEFAULT_CONTENT,
      history: [
        { datetime: new Date().toLocaleString(`zh-cn`), content: DEFAULT_CONTENT },
      ],
      createDatetime: new Date(),
      updateDatetime: new Date(),
    },
  ])

  // currentPostId 先存空串
  const currentPostId = useStorage(addPrefix(`current_post_id`), ``)

  // 是否为移动端
  const isMobile = useStorage(`isMobile`, false)

  function handleResize() {
    isMobile.value = window.innerWidth <= 768
  }

  onMounted(() => {
    handleResize()
    window.addEventListener(`resize`, handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(`resize`, handleResize)
  })

  // 在补齐 id 后，若 currentPostId 无效 ➜ 自动指向第一篇
  onBeforeMount(() => {
    posts.value = posts.value.map((post, index) => {
      const now = Date.now()
      return {
        ...post,
        id: post.id ?? uuid(),
        createDatetime: post.createDatetime ?? new Date(now + index),
        updateDatetime: post.updateDatetime ?? new Date(now + index),
      }
    })

    // 兼容：如果本地没有 currentPostId，或指向的文章已不存在
    if (!currentPostId.value || !posts.value.some(p => p.id === currentPostId.value)) {
      currentPostId.value = posts.value[0]?.id ?? ``
    }
  })

  /** 根据 id 找索引 */
  const findIndexById = (id: string) => posts.value.findIndex(p => p.id === id)

  /** computed: 让旧代码还能用 index，但底层映射 id */
  const currentPostIndex = computed<number>({
    get: () => findIndexById(currentPostId.value),
    set: (idx) => {
      if (idx >= 0 && idx < posts.value.length)
        currentPostId.value = posts.value[idx].id
    },
  })

  /** 获取 Post */
  const getPostById = (id: string) => posts.value.find(p => p.id === id)

  /********************************
   * CRUD
   ********************************/
  const addPost = (title: string, parentId: string | null = null) => {
    const newPost: Post = {
      id: uuid(),
      title,
      content: `# ${title}`,
      history: [
        { datetime: new Date().toLocaleString(`zh-cn`), content: `# ${title}` },
      ],
      createDatetime: new Date(),
      updateDatetime: new Date(),
      parentId,
    }
    posts.value.push(newPost)
    currentPostId.value = newPost.id
  }

  const renamePost = (id: string, title: string) => {
    const post = getPostById(id)
    if (post)
      post.title = title
  }

  const delPost = (id: string) => {
    const idx = findIndexById(id)
    if (idx === -1)
      return
    posts.value.splice(idx, 1)
    currentPostId.value = posts.value[Math.min(idx, posts.value.length - 1)]?.id ?? ``
  }

  const updatePostParentId = (postId: string, parentId: string | null) => {
    const post = getPostById(postId)
    if (post) {
      post.parentId = parentId
      post.updateDatetime = new Date()
    }
  }

  // 收起所有文章
  const collapseAllPosts = () => {
    posts.value.forEach((post) => {
      post.collapsed = true
    })
  }

  // 展开所有文章
  const expandAllPosts = () => {
    posts.value.forEach((post) => {
      post.collapsed = false
    })
  }

  /********************************
   * 同步编辑器内容
   ********************************/
  watch(currentPostId, () => {
    const post = getPostById(currentPostId.value)
    if (post)
      toRaw(editor.value!).setValue(post.content)
  })

  onMounted(() => {
    // 迁移阶段，兼容之前的方案
    if (editorContent.value !== DEFAULT_CONTENT) {
      const post = getPostById(currentPostId.value)
      if (post)
        post.content = editorContent.value
      editorContent.value = DEFAULT_CONTENT
    }
  })

  // 格式化文档
  const formatContent = () => {
    formatDoc(editor.value!.getValue()).then((doc) => {
      posts.value[currentPostIndex.value].content = doc
      toRaw(editor.value!).setValue(doc)
    })
  }

  // 切换 highlight.js 代码主题
  const codeThemeChange = () => {
    const cssUrl = codeBlockTheme.value
    const el = document.querySelector(`#hljs`)
    if (el) {
      el.setAttribute(`href`, cssUrl)
    }
    else {
      const link = document.createElement(`link`)
      link.setAttribute(`type`, `text/css`)
      link.setAttribute(`rel`, `stylesheet`)
      link.setAttribute(`href`, cssUrl)
      link.setAttribute(`id`, `hljs`)
      document.head.appendChild(link)
    }
  }

  // 自义定 CSS 编辑器
  const cssEditor = ref<CodeMirror.EditorFromTextArea | null>(null)
  const setCssEditorValue = (content: string) => {
    cssEditor.value!.setValue(content)
  }
  // 自定义 CSS 内容
  const cssContent = useStorage(`__css_content`, DEFAULT_CSS_CONTENT)
  const cssContentConfig = useStorage(addPrefix(`css_content_config`), {
    active: `方案1`,
    tabs: [
      {
        title: `方案1`,
        name: `方案1`,
        // 兼容之前的方案
        content: cssContent.value || DEFAULT_CSS_CONTENT,
      },
    ],
  })
  onMounted(() => {
    // 清空过往历史记录
    cssContent.value = ``
  })
  const getCurrentTab = () =>
    cssContentConfig.value.tabs.find((tab) => {
      return tab.name === cssContentConfig.value.active
    })!
  const tabChanged = (name: string) => {
    cssContentConfig.value.active = name
    const content = cssContentConfig.value.tabs.find((tab) => {
      return tab.name === name
    })!.content
    setCssEditorValue(content)
  }

  // 重命名 css 方案
  const renameTab = (name: string) => {
    const tab = getCurrentTab()!
    tab.title = name
    tab.name = name
    cssContentConfig.value.active = name
  }

  const addCssContentTab = (name: string) => {
    cssContentConfig.value.tabs.push({
      name,
      title: name,
      content: DEFAULT_CSS_CONTENT,
    })
    cssContentConfig.value.active = name
    setCssEditorValue(DEFAULT_CSS_CONTENT)
  }
  const validatorTabName = (val: string) => {
    return cssContentConfig.value.tabs.every(({ name }) => name !== val)
  }

  const renderer = initRenderer({
    theme: customCssWithTemplate(
      css2json(getCurrentTab().content),
      primaryColor.value,
      customizeTheme(themeMap[theme.value], {
        fontSize: fontSizeNumber.value,
        color: primaryColor.value,
      }),
    ),
    fonts: fontFamily.value,
    size: fontSize.value,
    isUseIndent: isUseIndent.value,
    isMacCodeBlock: isMacCodeBlock.value,
  })

  const readingTime = ref<ReadTimeResults | null>(null)

  // 文章标题
  const titleList = ref<{
    url: string
    title: string
    level: number
  }[]>([])

  // Markdown处理器实例
  const markdownProcessor = ref<MarkdownProcessor | null>(null)

  // 是否启用特殊语法块渲染
  const isBlockRenderingEnabled = useStorage(addPrefix(`block_rendering_enabled`), false)
  const toggleBlockRendering = useToggle(isBlockRenderingEnabled)

  // 转图状态管理（持久化）
  const isImageMode = useStorage(addPrefix(`image_mode`), false) // 当前是否处于图片模式
  const originalContent = useStorage(addPrefix(`original_content`), ``) // 原始内容缓存
  const imageContent = useStorage(addPrefix(`image_content`), ``) // 图片内容缓存（副本）
  const contentHash = useStorage(addPrefix(`content_hash`), ``) // 内容哈希，用于检测变化
  const imageRefreshTimer = ref<number | null>(null) // 定时器引用

  // 初始化Markdown处理器
  const initMarkdownProcessor = () => {
    const currentTheme = customCssWithTemplate(
      css2json(getCurrentTab().content),
      primaryColor.value,
      customizeTheme(themeMap[theme.value], {
        fontSize: fontSizeNumber.value,
        color: primaryColor.value,
      }),
    ) as unknown as ThemeStyles
    markdownProcessor.value = new MarkdownProcessor(currentTheme, isDark.value)
  }

  // 生成内容哈希
  const generateContentHash = (content: string): string => {
    // 简单的哈希函数，用于检测内容变化
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString()
  }

  // 处理特殊语法块
  const processSpecialBlocks = async (content: string): Promise<string> => {
    if (!isBlockRenderingEnabled.value || !markdownProcessor.value) {
      return content
    }

    try {
      return await markdownProcessor.value.processMarkdown(content)
    }
    catch (error) {
      console.error(`Failed to process special blocks:`, error)
      toast.error(`处理特殊语法块时出错`)
      return content
    }
  }

  // 检查内容是否包含特殊语法块
  const hasSpecialBlocks = (content: string): boolean => {
    if (!markdownProcessor.value)
      return false
    return markdownProcessor.value.hasSpecialBlocks(content)
  }

  // 预览将要处理的语法块
  const previewSpecialBlocks = (content: string) => {
    if (!markdownProcessor.value)
      return []
    return markdownProcessor.value.previewProcessing(content)
  }

  // 更新编辑器
  const editorRefresh = async () => {
    codeThemeChange()
    renderer.reset({
      citeStatus: isCiteStatus.value,
      legend: legend.value,
      isUseIndent: isUseIndent.value,
      countStatus: isCountStatus.value,
      isMacCodeBlock: isMacCodeBlock.value,
    })

    // 根据当前模式决定渲染哪个内容
    let content: string
    if (isImageMode.value && imageContent.value) {
      // 图片模式：渲染副本内容
      content = imageContent.value
    }
    else {
      // 原始模式：渲染编辑器内容
      content = editor.value!.getValue()
    }

    output.value = modifyHtmlContent(content, renderer)

    // 提取标题
    const div = document.createElement(`div`)
    div.innerHTML = output.value
    const list = div.querySelectorAll<HTMLElement>(`[data-heading]`)

    titleList.value = []
    let i = 0
    for (const item of list) {
      item.setAttribute(`id`, `${i}`)
      titleList.value.push({
        url: `#${i}`,
        title: `${item.textContent}`,
        level: Number(item.tagName.slice(1)),
      })
      i++
    }
    output.value = div.innerHTML
  }

  // 启动图片刷新定时器
  const startImageRefreshTimer = () => {
    if (imageRefreshTimer.value) {
      clearInterval(imageRefreshTimer.value)
    }

    imageRefreshTimer.value = window.setInterval(async () => {
      if (isImageMode.value) {
        console.log(`Auto-refreshing preview to check for image availability...`)
        await editorRefresh()
      }
    }, 10000) // 每10秒刷新一次

    console.log(`Started image refresh timer`)
  }

  // 停止图片刷新定时器
  const stopImageRefreshTimer = () => {
    if (imageRefreshTimer.value) {
      clearInterval(imageRefreshTimer.value)
      imageRefreshTimer.value = null
      console.log(`Stopped image refresh timer`)
    }
  }

  // 检查内容是否需要重新转图（内容变化或主题变化）
  const shouldRegenerateImages = (_currentContent: string, currentHash: string): boolean => {
    // 内容变化
    if (contentHash.value !== currentHash) {
      return true
    }

    // 主题变化（通过检查当前主题与缓存内容的主题是否匹配）
    // 这里可以通过检查图片URL中的主题标识来判断
    // 简化处理：如果缓存的内容为空，则需要重新生成
    if (!imageContent.value) {
      return true
    }

    return false
  }

  // 恢复转图状态（页面加载时调用）
  const restoreImageModeState = async () => {
    if (isImageMode.value && imageContent.value) {
      console.log(`Restoring image mode state after page refresh`)
      startImageRefreshTimer()

      // 检查当前编辑器内容是否与原始内容匹配
      const currentContent = editor.value?.getValue() || ``
      const currentHash = generateContentHash(currentContent)

      // 如果内容或主题发生变化，提示用户重新转图
      if (shouldRegenerateImages(currentContent, currentHash)) {
        toast.warning(`检测到内容或主题变化，建议重新转图`)
        // 可以选择自动重新转图或保持当前状态
        // 这里选择保持当前状态，让用户手动决定
      }

      // 触发预览更新以显示缓存的图片内容
      await editorRefresh()
    }
  }

  // 转图功能 - 手动触发（生成副本，不替换原文）
  const toggleImageMode = async (): Promise<void> => {
    const currentContent = editor.value?.getValue() || ``
    const currentHash = generateContentHash(currentContent)

    if (isImageMode.value) {
      // 当前是图片模式，切换回原始模式
      isImageMode.value = false
      stopImageRefreshTimer()
      toast.success(`已切换回原始内容`)
      console.log(`Switched back to original content`)
      // 触发预览更新
      await editorRefresh()
    }
    else {
      // 当前是原始模式，切换到图片模式
      originalContent.value = currentContent

      // 检查是否需要重新生成图片
      if (imageContent.value && !shouldRegenerateImages(currentContent, currentHash)) {
        // 内容没有变化，使用缓存的图片内容
        isImageMode.value = true
        startImageRefreshTimer()
        toast.success(`已切换到图片模式（使用缓存）`)
        console.log(`Using cached image content`)
        // 触发预览更新
        await editorRefresh()
      }
      else {
        // 内容有变化或首次转换，重新生成图片
        try {
          toast.info(`正在转换特殊语法块为图片...`)
          console.log(`Converting special blocks to images...`)

          const processedContent = await processSpecialBlocks(currentContent)

          imageContent.value = processedContent
          contentHash.value = currentHash
          isImageMode.value = true
          startImageRefreshTimer()

          toast.success(`图片转换完成，将定期检查图片可用性`)
          console.log(`Successfully converted to image mode`)
          // 触发预览更新
          await editorRefresh()
        }
        catch (error) {
          console.error(`Failed to convert to image mode:`, error)
          toast.error(`转换图片模式失败`)
          isImageMode.value = false // 转换失败，恢复状态
        }
      }
    }
  }

  // 更新 CSS
  const updateCss = () => {
    const json = css2json(cssEditor.value!.getValue())
    const newTheme = customCssWithTemplate(
      json,
      primaryColor.value,
      customizeTheme(themeMap[theme.value], {
        fontSize: fontSizeNumber.value,
        color: primaryColor.value,
      }),
    )
    renderer.setOptions({
      theme: newTheme,
    })

    // 异步调用editorRefresh，但不等待结果
    editorRefresh().catch(console.error)
  }
  // 初始化 CSS 编辑器
  onMounted(() => {
    const cssEditorDom = document.querySelector<HTMLTextAreaElement>(
      `#cssEditor`,
    )!
    cssEditorDom.value = getCurrentTab().content
    const theme = isDark.value ? `darcula` : `xq-light`
    cssEditor.value = markRaw(
      CodeMirror.fromTextArea(cssEditorDom, {
        mode: `css`,
        theme,
        lineNumbers: false,
        lineWrapping: true,
        styleActiveLine: true,
        matchBrackets: true,
        autofocus: true,
        extraKeys: {
          [`${shiftKey}-${altKey}-F`]: function autoFormat(
            editor: CodeMirror.Editor,
          ) {
            formatDoc(editor.getValue(), `css`).then((doc) => {
              getCurrentTab().content = doc
              editor.setValue(doc)
            })
          },
        },
      } as never),
    )

    // 自动提示
    cssEditor.value.on(`keyup`, (cm, e) => {
      if ((e.keyCode >= 65 && e.keyCode <= 90) || e.keyCode === 189) {
        (cm as any).showHint(e)
      }
    })

    // 实时保存
    cssEditor.value.on(`update`, () => {
      updateCss()
      getCurrentTab().content = cssEditor.value!.getValue()
    })

    // 初始化Markdown处理器
    initMarkdownProcessor()

    // 恢复转图状态
    nextTick(() => {
      restoreImageModeState()
    })
  })

  watch(isDark, () => {
    const theme = isDark.value ? `darcula` : `xq-light`
    toRaw(cssEditor.value)?.setOption?.(`theme`, theme)
    // 重新初始化Markdown处理器以应用新的主题
    initMarkdownProcessor()

    // 如果当前处于图片模式，提示用户重新转图
    if (isImageMode.value) {
      toast.warning(`主题已切换，建议重新转图以应用新主题`)
    }
  })

  // 监听主题变化，重新初始化处理器
  watch([theme, primaryColor, fontSize], () => {
    initMarkdownProcessor()

    // 如果当前处于图片模式，提示用户重新转图
    if (isImageMode.value) {
      toast.warning(`主题设置已更改，建议重新转图以应用新设置`)
    }
  })

  // 重置样式
  const resetStyle = () => {
    isCiteStatus.value = defaultStyleConfig.isCiteStatus
    isMacCodeBlock.value = defaultStyleConfig.isMacCodeBlock
    isCountStatus.value = defaultStyleConfig.isCountStatus

    theme.value = defaultStyleConfig.theme
    fontFamily.value = defaultStyleConfig.fontFamily
    fontSize.value = defaultStyleConfig.fontSize
    primaryColor.value = defaultStyleConfig.primaryColor
    codeBlockTheme.value = defaultStyleConfig.codeBlockTheme
    legend.value = defaultStyleConfig.legend

    cssContentConfig.value = {
      active: `方案 1`,
      tabs: [
        {
          title: `方案 1`,
          name: `方案 1`,
          // 兼容之前的方案
          content: cssContent.value || DEFAULT_CSS_CONTENT,
        },
      ],
    }

    cssEditor.value!.setValue(DEFAULT_CSS_CONTENT)

    updateCss()
    // 异步调用editorRefresh，但不等待结果
    editorRefresh().catch(console.error)

    toast.success(`样式已重置`)
  }

  // 为函数添加刷新编辑器的功能
  const withAfterRefresh = (fn: (...rest: any[]) => void) => (
    ...rest: any[]
  ) => {
    fn(...rest)
    // 异步调用editorRefresh，但不等待结果
    editorRefresh().catch(console.error)
  }

  const getTheme = (size: string, color: string) => {
    const newTheme = themeMap[theme.value]
    const fontSize = Number(size.replace(`px`, ``))
    return customCssWithTemplate(
      css2json(getCurrentTab().content),
      color,
      customizeTheme(newTheme, { fontSize, color }),
    )
  }

  const themeChanged = withAfterRefresh((newTheme: keyof typeof themeMap) => {
    renderer.setOptions({
      theme: customCssWithTemplate(
        css2json(getCurrentTab().content),
        primaryColor.value,
        customizeTheme(themeMap[newTheme], { fontSize: fontSizeNumber.value }),
      ),
    })
    theme.value = newTheme
  })

  const fontChanged = withAfterRefresh((fonts) => {
    renderer.setOptions({
      fonts,
    })

    fontFamily.value = fonts
  })

  const sizeChanged = withAfterRefresh((size) => {
    const theme = getTheme(size, primaryColor.value)
    renderer.setOptions({
      size,
      theme,
    })

    fontSize.value = size
  })

  const colorChanged = withAfterRefresh((newColor) => {
    const theme = getTheme(fontSize.value, newColor)
    renderer.setOptions({
      theme,
    })

    primaryColor.value = newColor
  })

  const codeBlockThemeChanged = withAfterRefresh((newTheme) => {
    codeBlockTheme.value = newTheme
  })

  const previewWidthChanged = withAfterRefresh((newWidth: string) => {
    previewWidth.value = newWidth
  })

  const legendChanged = withAfterRefresh((newVal) => {
    legend.value = newVal
  })

  const macCodeBlockChanged = withAfterRefresh(() => {
    toggleMacCodeBlock()
  })

  const citeStatusChanged = withAfterRefresh(() => {
    toggleCiteStatus()
  })

  const countStatusChanged = withAfterRefresh(() => {
    toggleCountStatus()
  })

  const useIndentChanged = withAfterRefresh(() => {
    toggleUseIndent()
  })

  const aiToolboxChanged = withAfterRefresh(() => {
    toggleAIToolbox()
  })

  // 导出编辑器内容为 HTML，并且下载到本地
  const exportEditorContent2HTML = () => {
    exportHTML(primaryColor.value, posts.value[currentPostIndex.value].title)
    document.querySelector(`#output`)!.innerHTML = output.value
  }

  // 下载卡片
  const downloadAsCardImage = () => {
    const el = document.querySelector(`#output-wrapper>.preview`)! as HTMLElement
    toPng(el, {
      backgroundColor: isDark.value ? `` : `#fff`,
      skipFonts: true,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      style: {
        margin: `0`,
      },
    }).then((url) => {
      const a = document.createElement(`a`)
      a.download = sanitizeTitle(posts.value[currentPostIndex.value].title)
      document.body.appendChild(a)
      a.href = url
      a.click()
      document.body.removeChild(a)
    })
  }

  // 导出编辑器内容到本地
  const exportEditorContent2MD = () => {
    // 根据当前模式决定导出哪个内容
    const content = isImageMode.value && imageContent.value
      ? imageContent.value
      : editor.value!.getValue()
    downloadMD(content, posts.value[currentPostIndex.value].title)
  }

  // 导入默认文档
  const importDefaultContent = () => {
    toRaw(editor.value!).setValue(DEFAULT_CONTENT)
    toast.success(`文档已重置`)
  }

  // 清空内容
  const clearContent = () => {
    toRaw(editor.value!).setValue(``)
    toast.success(`内容已清空`)
  }

  const copyToClipboard = async () => {
    const selectedText = editor.value!.getSelection()
    copyPlain(selectedText)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      editor.value!.replaceSelection(text)
    }
    catch (error) {
      console.log(`粘贴失败`, error)
    }
  }

  // 导入 Markdown 文档
  const importMarkdownContent = () => {
    const body = document.body
    const input = document.createElement(`input`)
    input.type = `file`
    input.name = `filename`
    input.accept = `.md`
    input.onchange = () => {
      const file = input.files![0]
      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.readAsText(file)
      reader.onload = (event) => {
        editor.value!.setValue(event.target!.result as string)
        toast.success(`文档导入成功`)
      }
    }

    body.appendChild(input)
    input.click()
    body.removeChild(input)
  }

  const isOpenConfirmDialog = ref(false)

  // 重置样式
  const resetStyleConfirm = () => {
    isOpenConfirmDialog.value = true
  }

  return {
    isDark,
    toggleDark,

    isEditOnLeft,
    toggleEditOnLeft,

    isMacCodeBlock,
    isCiteStatus,
    citeStatusChanged,
    showAIToolbox,
    aiToolboxChanged,
    isUseIndent,
    useIndentChanged,

    isCountStatus,
    countStatusChanged,

    output,
    editor,
    cssEditor,
    theme,
    fontFamily,
    fontSize,
    primaryColor,
    codeBlockTheme,
    legend,
    readingTime,
    previewWidth,
    previewWidthChanged,

    editorRefresh,

    themeChanged,
    fontChanged,
    sizeChanged,
    colorChanged,
    codeBlockThemeChanged,
    legendChanged,
    macCodeBlockChanged,

    formatContent,
    exportEditorContent2HTML,
    exportEditorContent2MD,
    downloadAsCardImage,

    importMarkdownContent,
    importDefaultContent,
    clearContent,

    copyToClipboard,
    pasteFromClipboard,

    isOpenConfirmDialog,
    resetStyleConfirm,
    resetStyle,

    cssContentConfig,
    addCssContentTab,
    validatorTabName,
    setCssEditorValue,
    tabChanged,
    renameTab,
    posts,
    currentPostId,
    currentPostIndex,
    getPostById,
    addPost,
    renamePost,
    delPost,
    isOpenPostSlider,
    isOpenRightSlider,

    titleList,
    isMobile,
    updatePostParentId,
    collapseAllPosts,
    expandAllPosts,

    // 特殊语法块渲染功能
    isBlockRenderingEnabled,
    toggleBlockRendering,
    processSpecialBlocks,
    hasSpecialBlocks,
    previewSpecialBlocks,
    initMarkdownProcessor,

    // 转图功能
    isImageMode,
    toggleImageMode,
    restoreImageModeState,
    startImageRefreshTimer,
    stopImageRefreshTimer,
  }
})

export const useDisplayStore = defineStore(`display`, () => {
  // 是否展示 CSS 编辑器
  const isShowCssEditor = useStorage(`isShowCssEditor`, false)
  const toggleShowCssEditor = useToggle(isShowCssEditor)

  // 是否展示插入表格对话框
  const isShowInsertFormDialog = ref(false)
  const toggleShowInsertFormDialog = useToggle(isShowInsertFormDialog)

  // 是否展示插入公众号名片对话框
  const isShowInsertMpCardDialog = ref(false)
  const toggleShowInsertMpCardDialog = useToggle(isShowInsertMpCardDialog)

  // 是否展示上传图片对话框
  const isShowUploadImgDialog = ref(false)
  const toggleShowUploadImgDialog = useToggle(isShowUploadImgDialog)

  const aiDialogVisible = ref(false)

  function toggleAIDialog(value?: boolean) {
    aiDialogVisible.value = value ?? !aiDialogVisible.value
  }

  return {
    isShowCssEditor,
    toggleShowCssEditor,
    isShowInsertFormDialog,
    toggleShowInsertFormDialog,
    isShowInsertMpCardDialog,
    toggleShowInsertMpCardDialog,
    isShowUploadImgDialog,
    toggleShowUploadImgDialog,
    aiDialogVisible,
    toggleAIDialog,
  }
})

// 获取所有状态的方法
export function getAllStoreStates() {
  const store = useStore()
  const displayStore = useDisplayStore()

  return {
    // 主 store 的状态
    isDark: store.isDark,
    isEditOnLeft: store.isEditOnLeft,
    isMacCodeBlock: store.isMacCodeBlock,
    isCiteStatus: store.isCiteStatus,
    showAIToolbox: store.showAIToolbox,
    isCountStatus: store.isCountStatus,
    isUseIndent: store.isUseIndent,
    isOpenRightSlider: store.isOpenRightSlider,
    isOpenPostSlider: store.isOpenPostSlider,
    theme: store.theme,
    fontFamily: store.fontFamily,
    fontSize: store.fontSize,
    primaryColor: store.primaryColor,
    codeBlockTheme: store.codeBlockTheme,
    legend: store.legend,
    currentPostId: store.currentPostId,
    currentPostIndex: store.currentPostIndex,
    posts: store.posts,
    cssContentConfig: store.cssContentConfig,
    titleList: store.titleList,
    readingTime: store.readingTime,

    // displayStore 的状态
    isShowCssEditor: displayStore.isShowCssEditor,
    isShowInsertFormDialog: displayStore.isShowInsertFormDialog,
    isShowUploadImgDialog: displayStore.isShowUploadImgDialog,
    isShowInsertMpCardDialog: displayStore.isShowInsertMpCardDialog,
    aiDialogVisible: displayStore.aiDialogVisible,
  }
}
