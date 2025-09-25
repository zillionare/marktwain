import { initRenderer } from '@md/core'
import {
  defaultStyleConfig,
  themeMap,
  widthOptions,
} from '@md/shared/configs'
import { snapdom } from '@zumer/snapdom'
import CodeMirror from 'codemirror'
import { v4 as uuid } from 'uuid'
import { nextTick } from 'vue'
import DEFAULT_CONTENT from '@/assets/example/markdown.md?raw'
import DEFAULT_CSS_CONTENT from '@/assets/example/theme-css.txt?raw'

import { useBatchImagePreview } from '@/composables/useBatchImagePreview'
import { altKey, shiftKey } from '@/configs/shortcut-key'
import {
  addPrefix,
  css2json,
  customCssWithTemplate,
  customizeTheme,
  downloadFile,
  downloadMD,
  exportHTML,
  exportPDF,
  exportPureHTML,
  formatDoc,
  postProcessHtml,
  processHtmlContent,
  renderMarkdown,
} from '@/utils'
import { copyPlain } from '@/utils/clipboard'

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

/**********************************
 * 分页相关接口
 *********************************/
export interface PageLineMapping {
  pageIndex: number
  startLine: number
  endLine: number
}

export interface AutoPaginationOptions {
  targetPageHeight?: number // Target page height in pixels
  minPageHeight?: number // Minimum page height to avoid too short pages
  maxPageHeight?: number // Maximum page height to avoid too long pages
  avoidBreakInHeaders?: boolean // Avoid breaking in the middle of headers
  avoidBreakInParagraphs?: boolean // Avoid breaking in the middle of paragraphs
  avoidBreakInCodeBlocks?: boolean // Avoid breaking in the middle of code blocks
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

  // 转图功能相关状态
  const originalMarkdown = ref<string>(``) // 保存原始 markdown
  const convertedMarkdownV1 = ref<string>(``) // 保存替换后的 v1 版本 markdown
  const isImageReplaced = ref<boolean>(false) // 标记是否已替换为图片链接
  const conversionMap = ref<Map<string, string>>(new Map()) // 存储转换映射关系
  const isConverting = ref<boolean>(false) // 标记是否正在转换中

  // 转图配置
  const conversionConfig = useStorage(`conversionConfig`, {
    devicePixelRatio: 2, // 设备像素比
    screenWidth: 800, // 标题转图时的屏幕宽度
    // 转换类型及宽度配置
    convertAdmonition: { enabled: true, width: 500 }, // 转换 Admonition
    convertMathBlock: { enabled: true, width: 500 }, // 转换数学公式
    convertFencedBlock: { enabled: true, width: 600 }, // 转换代码块
    convertH2: { enabled: false, widthMode: `original` }, // 转换 h2 标题
    convertH3: { enabled: false, widthMode: `original` }, // 转换 h3 标题
    convertH4: { enabled: false, widthMode: `original` }, // 转换 h4 标题
  } as {
    devicePixelRatio: number
    screenWidth: number
    convertAdmonition: { enabled: boolean, width: number | null }
    convertMathBlock: { enabled: boolean, width: number | null }
    convertFencedBlock: { enabled: boolean, width: number | null }
    convertH2: { enabled: boolean, widthMode: `original` | `screen` }
    convertH3: { enabled: boolean, widthMode: `original` | `screen` }
    convertH4: { enabled: boolean, widthMode: `original` | `screen` }
    [key: string]: any // 添加索引签名以支持动态访问
  })

  // 是否开启 AI 工具箱
  const showAIToolbox = useStorage(`showAIToolbox`, true)
  const toggleAIToolbox = useToggle(showAIToolbox)

  // 是否统计字数和阅读时间
  const isCountStatus = useStorage(`isCountStatus`, defaultStyleConfig.isCountStatus)
  const toggleCountStatus = useToggle(isCountStatus)

  // 是否显示代码行号
  const isShowLineNumbers = useStorage(`isShowLineNumbers`, defaultStyleConfig.isShowLineNumbers)
  const toggleShowLineNumbers = useToggle(isShowLineNumbers)

  // 是否开启段落首行缩进
  const isUseIndent = useStorage(addPrefix(`use_indent`), false)
  const toggleUseIndent = useToggle(isUseIndent)

  const isUseJustify = useStorage(addPrefix(`use_justify`), false)
  const toggleUseJustify = useToggle(isUseJustify)

  const output = ref(``)

  // 分页相关状态
  const isPaginationMode = useStorage(`isPaginationMode`, false) // 是否开启分页模式
  const currentPageIndex = ref(0) // 当前页码（从0开始）
  const pages = ref<string[]>([]) // 分页后的内容数组
  const totalPages = computed(() => pages.value.length) // 总页数
  const pageRefs = ref<HTMLElement[]>([]) // 页面DOM引用数组

  // 分页页面尺寸配置
  const pageSettings = useStorage(`pageSettings`, {
    width: 1200, // 页面宽度（px）
    height: 1600, // 页面高度（px）
  })

  // 分页缩放相关状态
  const pageScale = ref(1) // 当前页面缩放比例
  const previewContainerSize = ref({ width: 0, height: 0 }) // 预览容器尺寸
  const isContentTruncated = ref(false) // 内容是否发生截断

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
    if (post) {
      editor.value && toRaw(editor.value).setValue(post.content)
    }
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
  /**
   * 自定义 CSS 内容
   * @deprecated 在后续版本中将会移除
   */
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
    isUseJustify: isUseJustify.value,
    isMacCodeBlock: isMacCodeBlock.value,
    isShowLineNumbers: isShowLineNumbers.value,
  })

  const readingTime = reactive({
    chars: 0,
    words: 0,
    minutes: 0,
  })

  // 文章标题,用于生成目录
  const titleList = ref<{
    url: string
    title: string
    level: number
  }[]>([])

  // 分页相关方法
  const splitContentToPages = (content: string): string[] => {
    // 使用 --- 作为分页符分割内容
    return content.split(/^---$/m).map(page => page.trim()).filter(page => page.length > 0)
  }

  // 渲染单个页面内容
  const renderPage = (pageContent: string): string => {
    const { html: baseHtml, readingTime: readingTimeResult } = renderMarkdown(pageContent, renderer)
    return postProcessHtml(baseHtml, readingTimeResult, renderer)
  }

  // 更新编辑器
  const editorRefresh = () => {
    codeThemeChange()
    renderer.reset({
      citeStatus: isCiteStatus.value,
      legend: legend.value,
      isUseIndent: isUseIndent.value,
      isUseJustify: isUseJustify.value,
      countStatus: isCountStatus.value,
      isMacCodeBlock: isMacCodeBlock.value,
      isShowLineNumbers: isShowLineNumbers.value,
    })

    // Check if editor is initialized before proceeding
    if (!editor.value) {
      console.warn(`Editor is not initialized yet, skipping refresh`)
      return
    }

    const raw = editor.value.getValue()

    // 分页模式处理
    if (isPaginationMode.value) {
      pages.value = splitContentToPages(raw)
      // 确保当前页码在有效范围内
      if (currentPageIndex.value >= pages.value.length) {
        currentPageIndex.value = Math.max(0, pages.value.length - 1)
      }

      // 渲染当前页内容
      const currentPageContent = pages.value[currentPageIndex.value] || ``
      const { html: baseHtml, readingTime: readingTimeResult } = renderMarkdown(currentPageContent, renderer)
      readingTime.chars = currentPageContent.length
      readingTime.words = readingTimeResult.words
      readingTime.minutes = Math.ceil(readingTimeResult.minutes)
      output.value = postProcessHtml(baseHtml, readingTimeResult, renderer)

      // 检测内容截断：在下一个tick中检查渲染后的内容高度
      nextTick(() => {
        const pageElement = document.querySelector(`.pagination-page section`)
        if (pageElement) {
          // 获取实际内容高度和可用高度
          const contentHeight = pageElement.scrollHeight
          const availableHeight = pageElement.clientHeight

          // 只有当内容高度明显超过可用高度时才认为发生截断
          // 添加5px的容差，避免由于浮点数计算或样式细微差异导致的误报
          isContentTruncated.value = contentHeight > availableHeight + 5
        }
      })
    }
    else {
      // 普通模式：渲染全部内容
      const { html: baseHtml, readingTime: readingTimeResult } = renderMarkdown(raw, renderer)
      readingTime.chars = raw.length
      readingTime.words = readingTimeResult.words
      readingTime.minutes = Math.ceil(readingTimeResult.minutes)
      output.value = postProcessHtml(baseHtml, readingTimeResult, renderer)
    }

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

  const togglePaginationMode = () => {
    isPaginationMode.value = !isPaginationMode.value
    currentPageIndex.value = 0
    editorRefresh()
  }

  const setNormalMode = () => {
    isPaginationMode.value = false
    editorRefresh()
  }

  const setPaginationMode = () => {
    isPaginationMode.value = true
    currentPageIndex.value = 0
    editorRefresh()
  }

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages.value) {
      currentPageIndex.value = pageIndex
      // 在分页模式下，单页显示模式不需要滚动，只需要更新页面索引
      if (!isPaginationMode.value) {
        editorRefresh()
      }
    }
  }

  const nextPage = () => {
    if (currentPageIndex.value < totalPages.value - 1) {
      currentPageIndex.value++
      // 在分页模式下，单页显示模式不需要滚动，只需要更新页面索引
      if (!isPaginationMode.value) {
        editorRefresh()
      }
    }
  }

  const prevPage = () => {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--
      // 在分页模式下，单页显示模式不需要滚动，只需要更新页面索引
      if (!isPaginationMode.value) {
        editorRefresh()
      }
    }
  }

  // 计算页面行号映射的辅助函数

  // Calculate line number mapping for each page
  const calculatePageLineMapping = (content: string): PageLineMapping[] => {
    const lines = content.split(`\n`)
    const mappings: PageLineMapping[] = []
    let currentLine = 0
    let pageIndex = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if this line is a page separator (---)
      if (line.trim() === `---`) {
        // End current page (if it has content)
        if (i > currentLine) {
          mappings.push({
            pageIndex,
            startLine: currentLine,
            endLine: i - 1,
          })
          pageIndex++
        }
        // Start next page after the separator
        currentLine = i + 1
      }
    }

    // Add the last page if there's remaining content
    if (currentLine < lines.length) {
      mappings.push({
        pageIndex,
        startLine: currentLine,
        endLine: lines.length - 1,
      })
    }

    return mappings
  }

  // Get page index by line number
  const getPageByLineNumber = (lineNumber: number, content: string): number => {
    const mappings = calculatePageLineMapping(content)

    for (const mapping of mappings) {
      if (lineNumber >= mapping.startLine && lineNumber <= mapping.endLine) {
        return mapping.pageIndex
      }
    }

    // If line number is beyond all pages, return the last page
    return Math.max(0, mappings.length - 1)
  }

  // Get start line number of a specific page
  const getPageStartLine = (pageIndex: number, content: string): number => {
    const mappings = calculatePageLineMapping(content)

    if (pageIndex >= 0 && pageIndex < mappings.length) {
      return mappings[pageIndex].startLine
    }

    return 0
  }

  // Get the first visible page when multiple pages are visible in editor
  const getFirstVisiblePage = (topLine: number, bottomLine: number, content: string): number => {
    const mappings = calculatePageLineMapping(content)

    for (const mapping of mappings) {
      // If this page overlaps with the visible area
      if (mapping.endLine >= topLine && mapping.startLine <= bottomLine) {
        return mapping.pageIndex
      }
    }

    return 0
  }

  // Auto-pagination functionality

  // Calculate estimated content height for a given markdown content
  const estimateContentHeight = (content: string): number => {
    const lines = content.split(`\n`)
    let estimatedHeight = 0
    let inCodeBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      const prevLine = i > 0 ? lines[i - 1]?.trim() : ``
      const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : ``

      // Track code block state
      if (trimmedLine.startsWith(`\`\`\``)) {
        inCodeBlock = !inCodeBlock
      }

      if (!trimmedLine) {
        // Empty line - add spacing based on context
        if (prevLine && (prevLine.startsWith(`#`) || prevLine.startsWith(`\`\`\``))) {
          estimatedHeight += 30 // More space after headers and code blocks
        }
        else {
          estimatedHeight += 20 // Normal empty line spacing
        }
      }
      else if (trimmedLine.startsWith(`# `)) {
        // H1 header - add margin based on context
        estimatedHeight += i > 0 ? 80 : 60 // More space if not at beginning
      }
      else if (trimmedLine.startsWith(`## `)) {
        // H2 header
        estimatedHeight += i > 0 ? 70 : 50
      }
      else if (trimmedLine.startsWith(`### `)) {
        // H3 header
        estimatedHeight += i > 0 ? 60 : 40
      }
      else if (trimmedLine.startsWith(`#### `) || trimmedLine.startsWith(`##### `) || trimmedLine.startsWith(`###### `)) {
        // H4-H6 headers
        estimatedHeight += i > 0 ? 50 : 35
      }
      else if (trimmedLine.startsWith(`\`\`\``)) {
        // Code block delimiter
        estimatedHeight += 25
      }
      else if (trimmedLine.startsWith(`- `) || trimmedLine.startsWith(`* `) || /^\d+\. /.test(trimmedLine)) {
        // List items - consider nesting and content length
        const indentLevel = (line.length - line.trimStart().length) / 2
        const baseHeight = 25
        const contentLength = trimmedLine.length - 2 // Remove list marker
        const extraLines = Math.max(0, Math.ceil(contentLength / 70) - 1)
        estimatedHeight += baseHeight + (extraLines * 20) + (indentLevel * 5)
      }
      else if (trimmedLine.startsWith(`> `)) {
        // Blockquote - consider content length
        const contentLength = trimmedLine.length - 2
        const extraLines = Math.max(0, Math.ceil(contentLength / 70) - 1)
        estimatedHeight += 30 + (extraLines * 24)
      }
      else {
        // Regular paragraph line - improved calculation
        const lineLength = trimmedLine.length

        if (inCodeBlock) {
          // Code lines are typically shorter and have fixed height
          estimatedHeight += 22
        }
        else {
          // Regular text - consider line wrapping more accurately
          const charactersPerLine = 75 // Slightly more conservative estimate
          const estimatedLines = Math.max(1, Math.ceil(lineLength / charactersPerLine))
          const lineHeight = 24

          // Add paragraph spacing for first line of paragraph
          if (!prevLine || prevLine.startsWith(`#`) || prevLine.startsWith(`\`\`\``)
            || prevLine.startsWith(`- `) || prevLine.startsWith(`* `)
            || /^\d+\. /.test(prevLine) || prevLine.startsWith(`> `)) {
            estimatedHeight += 10 // Paragraph top margin
          }

          estimatedHeight += estimatedLines * lineHeight

          // Add paragraph spacing for last line of paragraph
          if (!nextLine || nextLine.startsWith(`#`) || nextLine.startsWith(`\`\`\``)
            || nextLine.startsWith(`- `) || nextLine.startsWith(`* `)
            || /^\d+\. /.test(nextLine) || nextLine.startsWith(`> `)) {
            estimatedHeight += 10 // Paragraph bottom margin
          }
        }
      }
    }

    return estimatedHeight
  }

  // Find optimal pagination points in markdown content
  const findOptimalPaginationPoints = (content: string, options: AutoPaginationOptions = {}): number[] => {
    const {
      targetPageHeight = pageSettings.value.height * 0.8, // Use 80% of page height as target
      minPageHeight = pageSettings.value.height * 0.5, // Minimum 50% of page height
      maxPageHeight = pageSettings.value.height * 1.2, // Maximum 120% of page height
      avoidBreakInHeaders = true,
      avoidBreakInParagraphs = true,
      avoidBreakInCodeBlocks = true,
    } = options

    const lines = content.split(`\n`)
    const paginationPoints: number[] = []
    let currentPageHeight = 0
    let inCodeBlock = false
    let inParagraph = false
    let lastGoodBreakPoint = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : ``

      // Track code block state
      if (trimmedLine.startsWith(`\`\`\``)) {
        inCodeBlock = !inCodeBlock
      }

      // Track paragraph state - improved logic for better paragraph boundary detection
      if (!trimmedLine) {
        // Empty line - if we were in a paragraph, this marks the end
        if (inParagraph) {
          inParagraph = false
          lastGoodBreakPoint = i // Record good break point at paragraph end
        }
      }
      else if (!inParagraph && !trimmedLine.startsWith(`#`) && !trimmedLine.startsWith(`\`\`\``) && !trimmedLine.startsWith(`- `) && !trimmedLine.startsWith(`* `) && !/^\d+\. /.test(trimmedLine) && !trimmedLine.startsWith(`> `)) {
        // Start of a new paragraph (not header, code block, list, or quote)
        inParagraph = true
      }

      // Calculate line height
      let lineHeight = 0
      if (!trimmedLine) {
        lineHeight = 20
      }
      else if (trimmedLine.startsWith(`# `)) {
        lineHeight = 60
        // Don't record break point at header itself, wait for content after header
      }
      else if (trimmedLine.startsWith(`## `)) {
        lineHeight = 50
        // Don't record break point at header itself, wait for content after header
      }
      else if (trimmedLine.startsWith(`### `)) {
        lineHeight = 40
        // Don't record break point at header itself, wait for content after header
      }
      else if (trimmedLine.startsWith(`#### `) || trimmedLine.startsWith(`##### `) || trimmedLine.startsWith(`###### `)) {
        lineHeight = 35
        // Don't record break point at header itself, wait for content after header
      }
      else if (trimmedLine.startsWith(`\`\`\``)) {
        lineHeight = 25
        if (!inCodeBlock)
          lastGoodBreakPoint = i // Good break point after code block ends
      }
      else if (trimmedLine.startsWith(`- `) || trimmedLine.startsWith(`* `) || /^\d+\. /.test(trimmedLine)) {
        lineHeight = 25
      }
      else if (trimmedLine.startsWith(`> `)) {
        lineHeight = 30
      }
      else {
        const lineLength = trimmedLine.length
        const estimatedLines = Math.ceil(lineLength / 80)
        lineHeight = estimatedLines * 24

        // Record good break point for regular content lines (not in code blocks)
        // This ensures we can break after headers and regular paragraphs
        if (!inCodeBlock && i > 0) {
          const prevLine = lines[i - 1]?.trim()
          // If previous line was a header, this is a good place to potentially break
          if (prevLine && prevLine.startsWith(`#`)) {
            lastGoodBreakPoint = i
          }
        }
      }

      currentPageHeight += lineHeight

      // Check if we should paginate
      const shouldPaginate = currentPageHeight >= targetPageHeight
      const mustPaginate = currentPageHeight >= maxPageHeight
      const canPaginate = currentPageHeight >= minPageHeight

      if ((shouldPaginate || mustPaginate) && canPaginate) {
        let breakPoint = i

        // Try to find a better break point
        if (!mustPaginate && lastGoodBreakPoint > (paginationPoints[paginationPoints.length - 1] || -1)) {
          // Use the last good break point if it's reasonable
          const heightAtBreakPoint = estimateContentHeight(lines.slice((paginationPoints[paginationPoints.length - 1] || 0) + 1, lastGoodBreakPoint + 1).join(`\n`))
          if (heightAtBreakPoint >= minPageHeight) {
            breakPoint = lastGoodBreakPoint
          }
        }

        // Avoid breaking in problematic locations
        if (avoidBreakInCodeBlocks && inCodeBlock) {
          continue // Skip this break point
        }
        if (avoidBreakInHeaders && (trimmedLine.startsWith(`#`) || nextLine.startsWith(`#`))) {
          continue // Skip this break point
        }
        if (avoidBreakInParagraphs && inParagraph && trimmedLine) {
          continue // Skip this break point
        }

        // Add pagination point
        paginationPoints.push(breakPoint)
        currentPageHeight = 0
        lastGoodBreakPoint = -1
      }
    }

    return paginationPoints
  }

  // Auto-paginate content by inserting page separators
  const autoPaginateContent = (content: string, options: AutoPaginationOptions = {}): string => {
    const paginationPoints = findOptimalPaginationPoints(content, options)

    if (paginationPoints.length === 0) {
      return content // No pagination needed
    }

    const lines = content.split(`\n`)
    const result: string[] = []
    let lastIndex = 0

    for (const point of paginationPoints) {
      // Add content up to this pagination point
      result.push(...lines.slice(lastIndex, point + 1))

      // Add page separator
      result.push(`---`)

      lastIndex = point + 1
    }

    // Add remaining content
    if (lastIndex < lines.length) {
      result.push(...lines.slice(lastIndex))
    }

    return result.join(`\n`)
  }

  // Apply auto-pagination to current editor content
  const applyAutoPagination = (options: AutoPaginationOptions = {}) => {
    if (!editor.value) {
      console.warn(`Editor is not initialized`)
      return
    }

    const currentContent = editor.value.getValue()

    // Remove existing page separators to avoid double pagination
    const cleanContent = currentContent.replace(/^---$/gm, ``).replace(/\n{2,}/g, `\n\n`)

    // Apply auto-pagination
    const paginatedContent = autoPaginateContent(cleanContent, options)

    // Update editor content
    editor.value.setValue(paginatedContent)

    // Refresh editor to update pagination
    editorRefresh()

    // Switch to pagination mode if not already enabled
    if (!isPaginationMode.value) {
      setPaginationMode()
    }

    toast.success(`自动分页完成，共生成 ${pages.value.length} 页`)
  }

  // 计算页面缩放比例
  const calculatePageScale = (containerWidth: number, containerHeight: number) => {
    const pageWidth = pageSettings.value.width
    const pageHeight = pageSettings.value.height

    // 计算宽度和高度的缩放比例
    // 考虑容器的padding和边距，预留一些空间
    const paddingX = 40 // 左右各20px的padding
    const paddingY = 40 // 上下各20px的padding
    const availableWidth = Math.max(containerWidth - paddingX, 100)
    const availableHeight = Math.max(containerHeight - paddingY, 100)

    const scaleX = availableWidth / pageWidth
    const scaleY = availableHeight / pageHeight

    // 取较小的缩放比例，确保页面完全适配容器
    const finalScale = Math.min(scaleX, scaleY, 1) // 最大不超过1，避免放大

    return Math.max(finalScale, 0.1) // 最小缩放比例为0.1，避免过小
  }

  // 更新预览容器尺寸并重新计算缩放比例
  const updatePreviewContainerSize = (width: number, height: number) => {
    previewContainerSize.value = { width, height }
    pageScale.value = calculatePageScale(width, height)
  }

  // 更新页面设置
  const updatePageSettings = (width: number, height: number) => {
    pageSettings.value.width = width
    pageSettings.value.height = height
    // 重新计算缩放比例
    if (previewContainerSize.value.width > 0 && previewContainerSize.value.height > 0) {
      pageScale.value = calculatePageScale(previewContainerSize.value.width, previewContainerSize.value.height)
    }
  }

  // 更新编辑器

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

    editorRefresh()
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
  })

  watch(isDark, () => {
    const theme = isDark.value ? `darcula` : `xq-light`
    toRaw(cssEditor.value)?.setOption?.(`theme`, theme)
  })

  // 重置样式
  const resetStyle = () => {
    isCiteStatus.value = defaultStyleConfig.isCiteStatus
    isMacCodeBlock.value = defaultStyleConfig.isMacCodeBlock
    isCountStatus.value = defaultStyleConfig.isCountStatus
    isShowLineNumbers.value = defaultStyleConfig.isShowLineNumbers

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
    editorRefresh()

    toast.success(`样式已重置`)
  }

  // 为函数添加刷新编辑器的功能
  const withAfterRefresh = (fn: (...rest: any[]) => void) => (
    ...rest: any[]
  ) => {
    fn(...rest)
    editorRefresh()
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

  const showLineNumbersChanged = withAfterRefresh(() => {
    toggleShowLineNumbers()
    renderer.setOptions({
      isShowLineNumbers: isShowLineNumbers.value,
    })
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

  const useJustifyChanged = withAfterRefresh(() => {
    toggleUseJustify()
  })

  const aiToolboxChanged = withAfterRefresh(() => {
    toggleAIToolbox()
  })

  const editorContent2HTML = () => {
    const temp = processHtmlContent(primaryColor.value)
    document.querySelector(`#output`)!.innerHTML = output.value
    return temp
  }

  // 导出编辑器内容为 HTML，并且下载到本地
  const exportEditorContent2HTML = () => {
    exportHTML(primaryColor.value, posts.value[currentPostIndex.value].title)
    document.querySelector(`#output`)!.innerHTML = output.value
  }

  // 导出编辑器内容为无样式 HTML
  const exportEditorContent2PureHTML = () => {
    exportPureHTML(editor.value!.getValue(), posts.value[currentPostIndex.value].title)
  }

  // 生成4位随机字符
  const generateRandomId = (): string => {
    const chars = `abcdefghijklmnopqrstuvwxyz0123456789`
    let result = ``
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // 普通模式下载单张图片
  const downloadSingleImage = async () => {
    const el = document.querySelector<HTMLElement>(`#output-wrapper>.preview`)
    if (!el) {
      toast.error(`未找到预览元素，请确保内容已加载`)
      return
    }

    try {
      const imgElement = await snapdom.toPng(el, {
        backgroundColor: isDark.value ? `` : `#fff`,
        dpr: conversionConfig.value.devicePixelRatio || 2,
      })

      // 将 HTMLImageElement 转换为 data URL
      const canvas = document.createElement(`canvas`)
      const ctx = canvas.getContext(`2d`)!
      canvas.width = imgElement.width
      canvas.height = imgElement.height
      ctx.drawImage(imgElement, 0, 0)
      const dataUrl = canvas.toDataURL(`image/png`)

      const randomId = generateRandomId()
      downloadFile(dataUrl, `1-md-${randomId}.png`, `image/png`)
      toast.success(`图片导出成功`)
    }
    catch (error) {
      console.error(`导出图片失败:`, error)
      toast.error(`导出图片失败，请重试`)
    }
  }

  // 分页模式下载所有页面图片
  const downloadPaginatedImages = async () => {
    if (!pageRefs.value || pageRefs.value.length === 0) {
      toast.error(`未找到分页元素，请确保分页内容已加载`)
      return
    }

    // 保存当前页面索引，导出完成后恢复
    const originalPageIndex = currentPageIndex.value

    try {
      toast.info(`开始导出 ${totalPages.value} 张图片...`)

      for (let i = 0; i < pageRefs.value.length; i++) {
        const pageElement = pageRefs.value[i]
        if (!pageElement) {
          console.warn(`页面 ${i + 1} 的DOM元素不存在，跳过`)
          continue
        }

        // 临时切换到当前要截图的页面（这会触发v-show显示该页面）
        currentPageIndex.value = i

        // 等待DOM更新和页面显示
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 300))

        // 截图当前页面
        const imgElement = await snapdom.toPng(pageElement, {
          backgroundColor: isDark.value ? `` : `#fff`,
          dpr: conversionConfig.value.devicePixelRatio || 2,
        })

        // 将 HTMLImageElement 转换为 data URL
        const canvas = document.createElement(`canvas`)
        const ctx = canvas.getContext(`2d`)!
        canvas.width = imgElement.width
        canvas.height = imgElement.height
        ctx.drawImage(imgElement, 0, 0)
        const dataUrl = canvas.toDataURL(`image/png`)

        // 生成文件名：seq-md-uuid.png
        const randomId = generateRandomId()
        const filename = `${i + 1}-md-${randomId}.png`
        downloadFile(dataUrl, filename, `image/png`)

        // 短暂延时避免下载过快
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 恢复到原始页面
      currentPageIndex.value = originalPageIndex
      await nextTick()

      toast.success(`成功导出 ${totalPages.value} 张图片`)
    }
    catch (error) {
      console.error(`批量导出图片失败:`, error)
      toast.error(`批量导出图片失败，请重试`)

      // 发生错误时也要恢复到原始页面
      currentPageIndex.value = originalPageIndex
      await nextTick()
    }
  }

  // 下载页面图片
  const downloadAsPageImage = async () => {
    if (isPaginationMode.value) {
      // 分页模式：批量截图所有页面
      await downloadPaginatedImages()
    }
    else {
      // 普通模式：单张截图
      await downloadSingleImage()
    }
  }

  // 导出编辑器内容为 PDF
  const exportEditorContent2PDF = async () => {
    // 如果当前处于分页模式，自动切换到普通模式
    if (isPaginationMode.value) {
      setNormalMode()
      toast.info(`已自动切换到普通模式以导出PDF`)

      // 等待DOM更新完成后再执行PDF导出
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    exportPDF(primaryColor.value, posts.value[currentPostIndex.value].title)
    document.querySelector(`#output`)!.innerHTML = output.value
  }

  // 导出编辑器内容到本地
  const exportEditorContent2MD = () => {
    downloadMD(editor.value!.getValue(), posts.value[currentPostIndex.value].title)
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
      console.debug(`粘贴失败`, error)
    }
  }

  // 撤销操作
  const undo = () => {
    if (editor.value) {
      editor.value.undo()
    }
  }

  // 重做操作
  const redo = () => {
    if (editor.value) {
      editor.value.redo()
    }
  }

  // 转图功能相关函数
  // 保存原始 markdown
  const saveOriginalMarkdown = () => {
    const currentContent = editor.value!.getValue()
    originalMarkdown.value = currentContent
    // 注意：不清空 conversionMap，因为图片上传后需要这些数据
    // conversionMap.value.clear()
  }

  // 转换单个元素为图片（批量模式）
  const convertElementToImage = async (element: HTMLElement, _type: string, _index: number) => {
    const prevWidth = element.style.width

    // 保存原始滚动条样式
    const originalScrollbarStyles = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      webkitScrollbar: ``,
    }

    // 临时隐藏滚动条的CSS样式
    const hideScrollbarStyle = document.createElement(`style`)
    hideScrollbarStyle.id = `hide-scrollbar-for-screenshot`
    hideScrollbarStyle.textContent = `
      /* 隐藏所有滚动条 */
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      /* 隐藏webkit滚动条 */
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }

      /* 确保body和html不显示滚动条 */
      body, html {
        overflow: hidden !important;
      }
    `

    try {
      // 检查元素位置和尺寸（设置宽度之前）
      const rectBefore = element.getBoundingClientRect()

      // 检查元素是否在视窗内
      const isInViewport = rectBefore.top >= 0 && rectBefore.left >= 0
        && rectBefore.bottom <= window.innerHeight
        && rectBefore.right <= window.innerWidth
      console.debug(`元素是否在视窗内:`, isInViewport)
      console.debug(`视窗尺寸:`, { width: window.innerWidth, height: window.innerHeight })

      // 根据元素类型设置宽度
      let targetWidth: number | null = null
      let isHeader = false

      // 根据元素类型获取对应的宽度配置
      if (element.classList.contains(`admonition`)) {
        targetWidth = conversionConfig.value.convertAdmonition.width
      }
      else if (element.classList.contains(`block_katex`)) {
        targetWidth = conversionConfig.value.convertMathBlock.width
      }
      else if (element.tagName === `PRE` && element.classList.contains(`hljs`)) {
        targetWidth = conversionConfig.value.convertFencedBlock.width
      }
      else if (element.tagName === `H2`) {
        const config = conversionConfig.value.convertH2
        if (config.widthMode === `screen`) {
          targetWidth = conversionConfig.value.screenWidth
        }
        else {
          targetWidth = null // 原始宽度模式
        }
        isHeader = true
      }
      else if (element.tagName === `H3`) {
        const config = conversionConfig.value.convertH3
        if (config.widthMode === `screen`) {
          targetWidth = conversionConfig.value.screenWidth
        }
        else {
          targetWidth = null // 原始宽度模式
        }
        isHeader = true
      }
      else if (element.tagName === `H4`) {
        const config = conversionConfig.value.convertH4
        if (config.widthMode === `screen`) {
          targetWidth = conversionConfig.value.screenWidth
        }
        else {
          targetWidth = null // 原始宽度模式
        }
        isHeader = true
      }

      // 对于标题元素，根据widthMode选择处理方式
      if (isHeader) {
        const config = element.tagName === `H2`
          ? conversionConfig.value.convertH2
          : element.tagName === `H3`
            ? conversionConfig.value.convertH3
            : conversionConfig.value.convertH4

        if (config.widthMode === `screen`) {
          // 屏幕宽度模式：直接设置元素宽度为屏幕宽度
          element.style.width = `${conversionConfig.value.screenWidth}px`
        }
        else {
          // 原始宽度模式：使用包装容器填充到屏幕宽度
          const screenWidth = conversionConfig.value.screenWidth
          if (screenWidth > 0) {
            // 如果屏幕宽度大于元素宽度，需要特殊处理
            const elementWidth = element.getBoundingClientRect().width
            if (screenWidth > elementWidth) {
              // 获取元素的完整尺寸（包括margin和padding）
              const elementRect = element.getBoundingClientRect()
              const computedStyle = window.getComputedStyle(element)
              const marginTop = Number.parseFloat(computedStyle.marginTop) || 0
              const marginBottom = Number.parseFloat(computedStyle.marginBottom) || 0

              // 计算包含margin和padding的完整高度
              const fullHeight = elementRect.height + marginTop + marginBottom

              // 创建包装容器
              const wrapper = document.createElement(`div`)
              wrapper.className = `title-wrapper`
              wrapper.style.width = `${screenWidth}px`
              wrapper.style.height = `${fullHeight}px`
              wrapper.style.display = `flex`
              wrapper.style.alignItems = `center`
              wrapper.style.justifyContent = `center`
              wrapper.style.position = `relative`
              wrapper.style.border = `none`
              wrapper.style.outline = `none`
              wrapper.style.boxShadow = `none`
              wrapper.style.overflow = `hidden`
              wrapper.style.minWidth = `${screenWidth}px`
              wrapper.style.maxWidth = `${screenWidth}px`
              wrapper.style.flexShrink = `0`
              wrapper.style.boxSizing = `border-box`

              // 临时取消标题元素的边距，但保留padding
              element.style.margin = `0`

              // 将标题元素包装到容器中
              element.parentNode?.insertBefore(wrapper, element)
              wrapper.appendChild(element)

              // 保持Header元素的原始宽度
              const wrappedElement = wrapper.querySelector(`h2, h3, h4`) as HTMLElement
              if (wrappedElement) {
                wrappedElement.style.width = `${elementWidth}px`
                wrappedElement.style.flexShrink = `0`
                wrappedElement.style.minWidth = `${elementWidth}px`
              }

              // 设置目标元素为包装容器
              element = wrapper
            }
            else {
              // 屏幕宽度小于等于元素宽度，原样截图
            }
          }
          else {
            // 屏幕宽度为0，原样截图
          }
        }
      }
      else if (targetWidth !== null) {
        // 非标题元素，使用配置的宽度
        element.style.width = `${targetWidth}px`
      }

      // 等待元素渲染完成
      await new Promise(resolve => setTimeout(resolve, 200))

      // 应用隐藏滚动条样式
      document.head.appendChild(hideScrollbarStyle)

      // 等待样式应用
      await new Promise(resolve => setTimeout(resolve, 50))

      // 检查截图配置
      const screenshotConfig = {
        dpr: conversionConfig.value.devicePixelRatio || 2,
      }

      // 滚动到元素位置确保可见
      element.scrollIntoView({ behavior: `instant`, block: `center` })
      await new Promise(resolve => setTimeout(resolve, 100))

      const imgElement = await snapdom.toPng(element, screenshotConfig)

      if (!imgElement.src) {
        console.error(`🚨 错误: 截图返回的对象没有 src 属性`)
      }

      return imgElement.src
    }
    catch (error) {
      console.error(`转换失败 [${_type}-${_index}]:`, error)
      throw error
    }
    finally {
      // 恢复元素宽度
      element.style.width = prevWidth

      // 移除隐藏滚动条的样式
      const existingStyle = document.getElementById(`hide-scrollbar-for-screenshot`)
      if (existingStyle) {
        existingStyle.remove()
      }

      // 恢复原始滚动条样式
      document.body.style.overflow = originalScrollbarStyles.body
      document.documentElement.style.overflow = originalScrollbarStyles.html
    }
  }

  // 在编辑区搜索并编号各类块元素
  interface MarkdownBlock {
    type: `admonition` | `math` | `code` | `plantuml` | `h2` | `h3` | `h4`
    content: string
    startIndex: number
    endIndex: number
    startLine: number
    endLine: number
    sequenceIndex: number
    id: string // 唯一标识符
  }

  // 计算字符位置对应的行号
  const getLineNumber = (markdown: string, charIndex: number): number => {
    return markdown.substring(0, charIndex).split(`\n`).length
  }

  // 检查是否为嵌套块（一个块在其他块的起始行内）
  const isNestedBlock = (block: MarkdownBlock, allBlocks: MarkdownBlock[]): boolean => {
    return allBlocks.some((otherBlock) => {
      // 跳过自己
      if (otherBlock === block)
        return false

      // 检查是否在其他块的范围内
      return block.startIndex > otherBlock.startIndex
        && block.endIndex < otherBlock.endIndex
    })
  }

  const findMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
    const allBlocks: MarkdownBlock[] = []
    let sequenceIndex = 0

    // 每种类型使用独立计数器，与渲染器中的 ID 生成逻辑保持一致
    const counters: Record<string, number> = {
      admonition: 0,
      code: 0,
      math: 0,
      plantuml: 0,
      h2: 0,
      h3: 0,
      h4: 0,
    }

    // 生成唯一块ID，与渲染器中的 ID 生成逻辑保持一致
    // 使用统一格式: mktwain-{type}-{counter}
    // 每种类型使用独立计数器
    const generateBlockId = (type: string) => {
      counters[type] = counters[type] + 1
      return `mktwain-${type}-${counters[type]}`
    }

    // 查找 Admonition 块 (!!! 语法)
    // 从 ^!!! 开始，到单个空行止（符合 CommonMark 标准）
    const admonitionRegex = /^!!![\s\S]*?\n\s*\n/gm
    let match
    match = admonitionRegex.exec(markdown)
    while (match !== null) {
      console.debug(`\n=== Admonition 匹配结果 ===`)
      console.debug(`匹配的内容:`, JSON.stringify(match[0]))
      console.debug(`匹配的长度:`, match[0].length)
      console.debug(`起始位置:`, match.index)
      console.debug(`结束位置:`, match.index + match[0].length)

      const startLine = getLineNumber(markdown, match.index)
      // 修复 endLine 计算：Admonition 块以两个连续换行符结束，但这些换行符不属于块本身
      // 我们需要找到块内容实际结束的位置（最后一个非换行字符）
      const blockContent = match[0].replace(/\n\s*\n$/, ``) // 移除结尾的换行符
      const endLine = getLineNumber(markdown, match.index + blockContent.length)

      console.debug(`起始行号:`, startLine)
      console.debug(`结束行号:`, endLine)

      allBlocks.push({
        type: `admonition`,
        content: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        startLine,
        endLine,
        sequenceIndex: sequenceIndex++,
        id: generateBlockId(`admonition`), // 新增：生成唯一ID
      })
      match = admonitionRegex.exec(markdown)
    }

    // 查找数学公式块 ($$...$$)
    const mathRegex = /\$\$[\s\S]*?\$\$/g
    match = mathRegex.exec(markdown)
    while (match !== null) {
      const startLine = getLineNumber(markdown, match.index)
      const endLine = getLineNumber(markdown, match.index + match[0].length)

      console.debug(`\n=== Math 匹配结果 ===`)
      console.debug(`匹配的内容:`, JSON.stringify(match[0]))
      console.debug(`起始位置:`, match.index)
      console.debug(`结束位置:`, match.index + match[0].length)
      console.debug(`起始行号:`, startLine)
      console.debug(`结束行号:`, endLine)

      allBlocks.push({
        type: `math`,
        content: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        startLine,
        endLine,
        sequenceIndex: sequenceIndex++,
        id: generateBlockId(`math`), // 新增：生成唯一ID
      })
      match = mathRegex.exec(markdown)
    }

    // 查找代码块 (```...```)
    const codeRegex = /```[\s\S]*?```/g
    match = codeRegex.exec(markdown)
    while (match !== null) {
      const startLine = getLineNumber(markdown, match.index)
      const endLine = getLineNumber(markdown, match.index + match[0].length)

      console.debug(`\n=== Code 匹配结果 ===`)
      console.debug(`匹配的内容:`, JSON.stringify(match[0]))
      console.debug(`起始位置:`, match.index)
      console.debug(`结束位置:`, match.index + match[0].length)
      console.debug(`起始行号:`, startLine)
      console.debug(`结束行号:`, endLine)

      // 检查是否是 PlantUML 代码块
      const isPlantUML = match[0].startsWith(`\`\`\`plantuml`)
      const blockType = isPlantUML ? `plantuml` : `code`

      allBlocks.push({
        type: blockType,
        content: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        startLine,
        endLine,
        sequenceIndex: sequenceIndex++,
        id: generateBlockId(blockType), // 新增：生成唯一ID
      })
      match = codeRegex.exec(markdown)
    }

    // 查找 H2-H4 标题 (# ## ###)
    const headingRegex = /^(#{2,4})\s+(\S.*$)/gm
    match = headingRegex.exec(markdown)
    while (match !== null) {
      const [, hashes, _content] = match
      const level = hashes.length

      // 只处理 H2-H4
      if (level >= 2 && level <= 4) {
        const headingType = `h${level}` as `h2` | `h3` | `h4`

        // 检查配置是否启用该级别的转换
        if (conversionConfig.value[`convertH${level}`].enabled) {
          const startLine = getLineNumber(markdown, match.index)
          const endLine = startLine // 标题只占一行

          allBlocks.push({
            type: headingType,
            content: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            startLine,
            endLine,
            sequenceIndex: sequenceIndex++,
            id: generateBlockId(headingType),
          })
        }
      }

      match = headingRegex.exec(markdown)
    }

    // 按在文档中出现的顺序排序
    allBlocks.sort((a, b) => a.startIndex - b.startIndex)

    console.debug(`\n=== 所有块（排序后）===`)
    allBlocks.forEach((block, index) => {
      console.debug(`${index + 1}. ${block.type} 块 [${block.startIndex}-${block.endIndex}]`)
    })

    // 过滤掉嵌套块
    const nonNestedBlocks = allBlocks.filter(block => !isNestedBlock(block, allBlocks))

    console.debug(`找到 ${allBlocks.length} 个块，过滤嵌套后剩余 ${nonNestedBlocks.length} 个块`)
    console.debug(`非嵌套块详情:`, nonNestedBlocks.map(b => ({
      type: b.type,
      startLine: b.startLine,
      endLine: b.endLine,
      startIndex: b.startIndex,
      endIndex: b.endIndex,
      content: `${b.content.substring(0, 50)}...`,
    })))

    return nonNestedBlocks
  }

  // 转换元素为图片
  // 重置转图相关状态
  const resetImageConversion = () => {
    // 清除转换后的markdown
    convertedMarkdownV1.value = ``

    // 重置图片替换状态
    isImageReplaced.value = false

    // 清空转换映射关系
    conversionMap.value.clear()

    // 重置转换中状态
    isConverting.value = false

    // 清理所有可能的上传图片记录（由于我们不知道原始内容，清理所有记录）
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`uploaded-images-`)) {
        localStorage.removeItem(key)
      }
    }
  }

  const convertElementsToImages = async () => {
    // 1. 首先基于 Markdown 内容找到需要转换的块
    const markdownBlocks = findMarkdownBlocks(originalMarkdown.value)

    if (markdownBlocks.length === 0) {
      console.debug(`没有找到需要转换的块`)
      return
    }

    console.debug(`找到 ${markdownBlocks.length} 个需要转换的块（已过滤嵌套）`)
    console.debug(`块详情:`, markdownBlocks.map(b => ({ type: b.type, id: b.id, startLine: b.startLine, endLine: b.endLine })))

    // 2. 在 HTML 预览区找到对应的元素
    const previewElement = document.querySelector(`#output-wrapper > .preview`)
    if (!previewElement) {
      console.error(`找不到预览元素`)
      return
    }

    // 3. 直接通过 data-id 查找元素，无需动态添加
    const elementsToConvert: HTMLElement[] = []

    // 3. 通过文本内容匹配h2~h4元素
    const headingElements: HTMLElement[] = []
    const headingTexts: string[] = []

    // 收集预览区域的所有h2~h4元素及其文本内容
    const h2Elements = previewElement.querySelectorAll(`h2`)
    const h3Elements = previewElement.querySelectorAll(`h3`)
    const h4Elements = previewElement.querySelectorAll(`h4`)

    h2Elements.forEach((el) => {
      if (conversionConfig.value.convertH2.enabled) {
        headingElements.push(el)
        headingTexts.push(el.textContent?.trim() || ``)
      }
    })

    h3Elements.forEach((el, _index) => {
      if (conversionConfig.value.convertH3.enabled) {
        headingElements.push(el)
        headingTexts.push(el.textContent?.trim() || ``)
      }
    })

    h4Elements.forEach((el) => {
      if (conversionConfig.value.convertH4.enabled) {
        headingElements.push(el)
        headingTexts.push(el.textContent?.trim() || ``)
      }
    })

    console.debug(`收集到的标题元素:`, headingElements.length)
    console.debug(`标题文本内容:`, headingTexts)

    // 简化的 data-id 匹配逻辑
    const collectElementsByDataId = (blocks: MarkdownBlock[]): boolean => {
      let allFound = true

      console.debug(`\n=== 开始收集元素 ===`)
      console.debug(`需要处理的块:`, blocks.map(b => ({ type: b.type, id: b.id })))

      // 查找所有具有 mktwain-data-id 属性的元素
      const allElements = previewElement.querySelectorAll(`[mktwain-data-id]`)
      console.debug(`找到 ${allElements.length} 个具有 data-id 的元素`)

      // 构建 data-id 到元素的映射
      const dataIdToElement = new Map<string, HTMLElement>()
      allElements.forEach((el) => {
        const dataId = el.getAttribute(`mktwain-data-id`)
        if (dataId) {
          dataIdToElement.set(dataId, el as HTMLElement)
          console.debug(`映射: ${dataId} -> ${el.tagName}.${el.className}`)
        }
      })

      // 尝试直接匹配 (理想情况)
      blocks.forEach((block, index) => {
        console.debug(`\n处理第 ${index} 个块: ${block.type} (ID: ${block.id})`)

        // 尝试直接用 block.id 匹配
        let element = dataIdToElement.get(block.id)

        if (element) {
          elementsToConvert.push(element)
          console.debug(`  直接匹配成功: ${element.tagName}.${element.className}`)
        }
        else {
          // 对于h2~h4标题，使用文本内容匹配
          if (block.type === `h2` || block.type === `h3` || block.type === `h4`) {
            console.debug(`  尝试通过文本内容匹配标题: "${block.content}"`)

            // 提取标题文本内容（去除前缀的#符号）
            const headingTextMatch = block.content.match(/^(#{2,4})\s+(\S.*)$/)
            if (headingTextMatch) {
              const headingText = headingTextMatch[2].trim()
              console.debug(`  标题文本内容: "${headingText}"`)

              // 在收集到的标题元素中查找匹配的文本
              const elementIndex = headingTexts.indexOf(headingText)
              if (elementIndex !== -1) {
                element = headingElements[elementIndex]
                elementsToConvert.push(element)
                console.debug(`  标题匹配成功: ${element.tagName} "${headingText}"`)
                return // 匹配成功，跳过后续处理
              }
              else {
                console.debug(`  未找到匹配的标题元素`)
              }
            }
          }

          // 如果直接匹配失败，fallback 到类型匹配 (当前方案)
          console.debug(`  直接匹配失败，尝试类型匹配...`)

          const typeElements = Array.from(allElements).filter((el) => {
            if (block.type === `admonition`)
              return el.classList.contains(`admonition`)
            if (block.type === `math`)
              return el.classList.contains(`block_katex`)
            if (block.type === `code`)
              return el.tagName === `PRE` && el.classList.contains(`hljs`)
            if (block.type === `plantuml`)
              return el.classList.contains(`plantuml-diagram`)
            return false
          })

          const typeBlocks = blocks.filter(b => b.type === block.type)
          const blockIndex = typeBlocks.indexOf(block)
          element = typeElements[blockIndex] as HTMLElement

          if (element) {
            elementsToConvert.push(element)
            console.debug(`  类型匹配成功: ${element.tagName}.${element.className} (索引: ${blockIndex})`)
          }
          else {
            console.error(`  匹配失败: ${block.type} - ${block.id}`)
            console.info(`  可用的 data-id:`, Array.from(dataIdToElement.keys()))
            allFound = false
          }
        }
      })

      return allFound
    }

    // 直接收集所有有 data-id 的元素
    const allSuccess = collectElementsByDataId(markdownBlocks)

    if (!allSuccess) {
      toast.error(`找不到对应的HTML元素，请刷新页面后重试`, {
        duration: 5000,
        action: {
          label: `刷新页面`,
          onClick: () => {
            resetImageConversion()
            window.location.reload()
          },
        },
      })
      return
    }

    // 4. 元素已经按照 Markdown 块的顺序收集，直接使用
    const sortedElements = elementsToConvert

    console.debug(`\n=== 最终要转换的元素 ===`)
    console.debug(`总数: ${sortedElements.length}`)
    sortedElements.forEach((element: HTMLElement, index: number) => {
      const dataId = element.getAttribute(`mktwain-data-id`)
      const block = markdownBlocks[index] // 直接使用索引对应
      console.debug(`${index}: ${block?.type} (data-id: ${dataId})`)
    })

    // 获取批量预览的 addImage 和 setProcessing 函数
    const { addImage, setProcessing } = useBatchImagePreview()

    // 5. 依次转换每个元素
    for (let i = 0; i < sortedElements.length; i++) {
      const element = sortedElements[i]
      const markdownBlock = markdownBlocks[i] // 直接使用索引对应
      const dataId = element.getAttribute(`mktwain-data-id`)!

      console.debug(`\n正在转换第 ${i + 1}/${sortedElements.length} 个元素:`, {
        type: markdownBlock.type,
        id: markdownBlock.id,
        startLine: markdownBlock.startLine,
        endLine: markdownBlock.endLine,
        dataId,
        element,
      })

      try {
        const elementType = markdownBlock.type
        const imgDataUrl = await convertElementToImage(element, elementType, i)

        console.debug(`第 ${i + 1} 个元素转换成功`)

        // 添加到批量预览，使用块ID作为图片ID
        addImage(
          elementType,
          i,
          imgDataUrl,
          markdownBlock.content,
          markdownBlock.startLine,
          markdownBlock.endLine,
          markdownBlock.id, // 传递真实的 markdownBlock.id
        )
      }
      catch (error) {
        console.error(`第 ${i + 1} 个元素转换失败:`, error)
        // 继续转换下一个元素，不中断整个流程
        continue
      }
    }

    // 转换完成，设置处理状态为 false
    setProcessing(false)
  }

  // 执行转图操作
  const convertToImages = async () => {
    try {
      // 导入批量预览状态检查
      const { state: batchState } = useBatchImagePreview()

      // 检查是否已有已上传的图片
      const hasUploadedImages = batchState.images.some(img => img.uploaded)
      if (hasUploadedImages) {
        toast.error(`检测到已上传的图片，无法重新转图。请完成当前操作或刷新页面后重试。`)
        return false
      }

      isConverting.value = true

      // 清空之前的转换结果
      convertedMarkdownV1.value = ``
      conversionMap.value.clear()

      // 1. 保存原始内容
      saveOriginalMarkdown()

      // 2. 显示批量预览窗口
      const { showBatchPreview } = useBatchImagePreview()
      showBatchPreview(originalMarkdown.value)

      // 3. 转换元素为图片
      await convertElementsToImages()

      return true
    }
    catch (error) {
      console.error(`转图失败:`, error)
      throw error
    }
    finally {
      isConverting.value = false
    }
  }

  // 更新转换映射（用于上传后更新 URL）
  const updateConversionMap = (elementId: string, imageUrl: string) => {
    conversionMap.value.set(elementId, imageUrl)
    console.debug(`更新转换映射:`, elementId, imageUrl)
    console.debug(`当前 conversionMap 大小:`, conversionMap.value.size)
    console.debug(`当前 conversionMap 内容:`, Array.from(conversionMap.value.entries()))
  }

  // Step 5 & 6: 复制和导出v1版本的函数
  const copyConvertedMarkdownV1 = async (): Promise<boolean> => {
    if (!isImageReplaced.value || !convertedMarkdownV1.value) {
      toast.error(`没有转图后的 Markdown 内容，请先进行图片替换操作`)
      return false
    }

    try {
      await navigator.clipboard.writeText(convertedMarkdownV1.value)
      toast.success(`转图后 MD 内容已复制到剪贴板`)
      return true
    }
    catch (error) {
      console.error(`复制失败:`, error)
      // 降级到传统复制方式
      const textarea = document.createElement(`textarea`)
      textarea.value = convertedMarkdownV1.value
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand(`copy`)
      document.body.removeChild(textarea)

      if (success) {
        toast.success(`转图后 MD 内容已复制到剪贴板`)
        return true
      }
      else {
        toast.error(`复制失败，请手动复制`)
        return false
      }
    }
  }

  const exportConvertedMarkdownV1 = (): boolean => {
    if (!isImageReplaced.value || !convertedMarkdownV1.value) {
      toast.error(`没有转图后的 Markdown 内容，请先进行图片替换操作`)
      return false
    }

    try {
      downloadMD(convertedMarkdownV1.value, `${posts.value[currentPostIndex.value].title}-image-replaced`)
      return true
    }
    catch (error) {
      console.error(`导出失败:`, error)
      toast.error(`导出失败: ${(error as Error).message}`)
      return false
    }
  }

  // 是否打开重置样式对话框
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
    isUseJustify,
    useJustifyChanged,

    isCountStatus,
    countStatusChanged,

    isShowLineNumbers,
    showLineNumbersChanged,

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
    exportEditorContent2PureHTML,
    exportEditorContent2MD,
    exportEditorContent2PDF,
    downloadAsPageImage,

    // 转图功能相关
    originalMarkdown,
    convertedMarkdownV1,
    isImageReplaced,
    conversionMap,
    isConverting,
    conversionConfig,
    convertToImages,
    updateConversionMap,
    resetImageConversion, // 添加重置转图功能

    // 图片替换功能
    copyConvertedMarkdownV1,
    exportConvertedMarkdownV1,

    importDefaultContent,
    clearContent,

    copyToClipboard,
    pasteFromClipboard,

    undo,
    redo,

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

    editorContent2HTML,

    // 分页相关
    isPaginationMode,
    currentPageIndex,
    pages,
    pageRefs,
    totalPages,
    renderPage,
    togglePaginationMode,
    setNormalMode,
    setPaginationMode,
    goToPage,
    nextPage,
    prevPage,

    // 分页行号映射相关
    calculatePageLineMapping,
    getPageByLineNumber,
    getPageStartLine,
    getFirstVisiblePage,

    // 分页缩放相关
    pageSettings,
    pageScale,
    previewContainerSize,
    calculatePageScale,
    updatePreviewContainerSize,
    updatePageSettings,
    isContentTruncated,

    // 自动分页相关
    estimateContentHeight,
    findOptimalPaginationPoints,
    autoPaginateContent,
    applyAutoPagination,
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
    isUseJustify: store.isUseJustify,
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
