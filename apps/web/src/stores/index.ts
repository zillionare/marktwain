import { initRenderer } from '@md/core'
import {
  defaultStyleConfig,
  themeMap,
  widthOptions,
} from '@md/shared/configs'
import CodeMirror from 'codemirror'
import { toPng } from 'html-to-image'
import { v4 as uuid } from 'uuid'
import DEFAULT_CONTENT from '@/assets/example/markdown.md?raw'

import DEFAULT_CSS_CONTENT from '@/assets/example/theme-css.txt?raw'
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
  sanitizeTitle,
} from '@/utils'
import { copyPlain } from '@/utils/clipboard'
import { fileUpload } from '@/utils/file'

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

  // 转图功能相关状态
  const originalMarkdown = ref<string>(``) // 保存原始 markdown (v0)
  const convertedMarkdown = ref<string>(``) // 保存转换后的 markdown
  const isConverted = ref<boolean>(false) // 标记是否已转换
  const conversionMap = ref<Map<string, string>>(new Map()) // 存储转换映射关系
  const isConverting = ref<boolean>(false) // 标记是否正在转换中

  // 转图配置
  const conversionConfig = useStorage(`conversionConfig`, {
    screenWidth: 800, // 屏幕宽度
    devicePixelRatio: 1, // 设备像素比
    convertAdmonition: true, // 转换 Admonition
    convertMathBlock: true, // 转换数学公式
    convertFencedBlock: true, // 转换代码块
  } as {
    screenWidth: number
    devicePixelRatio: number
    convertAdmonition: boolean
    convertMathBlock: boolean
    convertFencedBlock: boolean
    [key: string]: any // 添加索引签名以支持动态访问
  })

  // 是否开启 AI 工具箱
  const showAIToolbox = useStorage(`showAIToolbox`, true)
  const toggleAIToolbox = useToggle(showAIToolbox)

  // 是否统计字数和阅读时间
  const isCountStatus = useStorage(`isCountStatus`, defaultStyleConfig.isCountStatus)
  const toggleCountStatus = useToggle(isCountStatus)

  // 是否开启段落首行缩进
  const isUseIndent = useStorage(addPrefix(`use_indent`), false)
  const toggleUseIndent = useToggle(isUseIndent)

  const isUseJustify = useStorage(addPrefix(`use_justify`), false)
  const toggleUseJustify = useToggle(isUseJustify)

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
    })

    const raw = editor.value!.getValue()
    const { html: baseHtml, readingTime: readingTimeResult } = renderMarkdown(raw, renderer)
    readingTime.chars = raw.length
    readingTime.words = readingTimeResult.words
    readingTime.minutes = Math.ceil(readingTimeResult.minutes)
    output.value = postProcessHtml(baseHtml, readingTimeResult, renderer)

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

  // 下载卡片
  const downloadAsCardImage = async () => {
    const el = document.querySelector<HTMLElement>(`#output-wrapper>.preview`)!
    const url = await toPng(el, {
      backgroundColor: isDark.value ? `` : `#fff`,
      skipFonts: true,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      style: {
        margin: `0`,
      },
    })

    downloadFile(url, `${sanitizeTitle(posts.value[currentPostIndex.value].title)}.png`, `image/png`)
  }

  // 导出编辑器内容为 PDF
  const exportEditorContent2PDF = () => {
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
      console.log(`粘贴失败`, error)
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
    isConverted.value = false
    conversionMap.value.clear()
  }

  // 将数据URL转换为File对象
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(`,`)
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  // 生成元素ID
  const generateElementId = (element: HTMLElement): string => {
    const elementType = element.className.includes(`admonition`)
      ? `admonition`
      : element.className.includes(`katex`) ? `math` : `code`
    const contentHash = btoa(element.textContent?.slice(0, 50) || ``)
    return `${elementType}-${contentHash}`
  }

  // 获取markdown匹配模式
  const getMarkdownPattern = (elementId: string): RegExp => {
    const [type] = elementId.split(`-`)
    switch (type) {
      case `admonition`:
        return /^!!!\s+\w+\s*\n[\s\S]*?\n\s*\n\s*\n/gm
      case `math`:
        return /\$\$.*?\$\$/gs
      case `code`:
        return /```[\s\S]*?```/g
      default:
        return /^$/
    }
  }

  // 转换单个元素为图片
  const convertElementToImage = async (element: HTMLElement): Promise<{ elementId: string, imageUrl: string }> => {
    try {
      // 1. 设置预览区宽度
      const previewWrapper = document.querySelector(`#output-wrapper`) as HTMLElement
      const previewElement = document.querySelector(`.preview`) as HTMLElement
      const originalWidth = previewWrapper?.style.width
      const originalPreviewWidth = previewElement?.style.width

      if (previewWrapper) {
        previewWrapper.style.width = `${conversionConfig.value.screenWidth}px`
      }
      if (previewElement) {
        previewElement.style.width = `${conversionConfig.value.screenWidth}px`
      }

      // 2. 临时移除跨域样式表链接，避免 html2canvas 库访问跨域 cssRules 时出错
      const crossOriginLinks = Array.from(document.querySelectorAll(`link[rel="stylesheet"]`)).filter((link) => {
        try {
          const linkUrl = new URL((link as HTMLLinkElement).href, window.location.origin)
          return linkUrl.origin !== window.location.origin
        }
        catch {
          return false
        }
      })

      // 隐藏跨域样式表链接
      crossOriginLinks.forEach((link) => {
        (link as HTMLElement).style.display = `none`
      })

      // 3. 创建包装容器来添加留白，但不改变原元素的定位
      const wrapper = document.createElement(`div`)
      wrapper.style.cssText = `
        display: inline-block;
        margin: 5px 10px 5px 5px;
        padding: 5px 10px 5px 5px;
        background: ${isDark.value ? `` : `#fff`};
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        border: none;
        outline: none;
      `

      // 将元素包装起来，但保持原元素的样式不变
      const parent = element.parentNode
      const originalBorder = element.style.border
      const originalOutline = element.style.outline

      // 临时移除可能的边框
      element.style.border = `none`
      element.style.outline = `none`

      if (parent) {
        parent.insertBefore(wrapper, element)
        wrapper.appendChild(element)
      }

      // 4. 生成图片
      const imageDataUrl = await toPng(wrapper, {
        pixelRatio: conversionConfig.value.devicePixelRatio,
        backgroundColor: isDark.value ? `` : `#fff`,
        // 禁用 web fonts 嵌入以避免跨域问题
        skipFonts: true,
      })

      // 5. 恢复原始结构和样式
      element.style.border = originalBorder
      element.style.outline = originalOutline

      if (parent) {
        parent.insertBefore(element, wrapper)
        parent.removeChild(wrapper)
      }

      // 6. 恢复跨域样式表链接
      crossOriginLinks.forEach((link) => {
        (link as HTMLElement).style.display = ``
      })

      // 7. 恢复预览区宽度
      if (previewWrapper && originalWidth !== undefined) {
        previewWrapper.style.width = originalWidth
      }
      if (previewElement && originalPreviewWidth !== undefined) {
        previewElement.style.width = originalPreviewWidth
      }

      // 8. 显示转图预览并等待用户确认
      console.log(`转图预览:`, imageDataUrl)

      // 创建确认对话框
      const confirmed = await new Promise<boolean>((resolve) => {
        const previewWindow = window.open(``, `_blank`, `width=900,height=700,scrollbars=yes,resizable=yes`)
        if (previewWindow) {
          previewWindow.document.write(`
            <html>
              <head>
                <title>转图预览 - 确认上传</title>
                <style>
                  body { margin:0; padding:20px; background:#f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                  .container { max-width: 800px; margin: 0 auto; }
                  .preview-card { background:white; padding:20px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); margin-bottom:20px; }
                  .preview-img { max-width:100%; height:auto; border-radius:4px; }
                  .button-group { display:flex; gap:12px; justify-content:center; margin-top:20px; }
                  .btn { padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; transition:all 0.2s; }
                  .btn-primary { background:#007bff; color:white; }
                  .btn-primary:hover { background:#0056b3; }
                  .btn-secondary { background:#6c757d; color:white; }
                  .btn-secondary:hover { background:#545b62; }
                  .btn-danger { background:#dc3545; color:white; }
                  .btn-danger:hover { background:#c82333; }
                  .info { color:#666; margin:10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h2>转图预览效果</h2>
                  <div class="preview-card">
                    <img src="${imageDataUrl}" class="preview-img" />
                  </div>
                  <div class="info">
                    <p><strong>元素类型:</strong> ${element.tagName.toLowerCase()}</p>
                    <p><strong>转换时间:</strong> ${new Date().toLocaleString()}</p>
                    <p>请检查转换效果，如果满意请点击"确认上传"，否则点击"跳过"或"取消全部"</p>
                  </div>
                  <div class="button-group">
                    <button class="btn btn-primary" onclick="confirmUpload()">确认上传</button>
                    <button class="btn btn-secondary" onclick="skipElement()">跳过此元素</button>
                    <button class="btn btn-danger" onclick="cancelAll()">取消全部</button>
                  </div>
                </div>
                <script>
                  function confirmUpload() {
                    window.opener.postMessage({ action: 'confirm', result: true }, '*');
                    window.close();
                  }
                  function skipElement() {
                    window.opener.postMessage({ action: 'skip', result: false }, '*');
                    window.close();
                  }
                  function cancelAll() {
                    window.opener.postMessage({ action: 'cancel', result: false }, '*');
                    window.close();
                  }
                </script>
              </body>
            </html>
          `)
          previewWindow.document.close()
        }

        // 监听消息
        const handleMessage = (event: MessageEvent) => {
          if (event.data.action === `confirm`) {
            resolve(true)
            window.removeEventListener(`message`, handleMessage)
          }
          else if (event.data.action === `skip`) {
            resolve(false)
            window.removeEventListener(`message`, handleMessage)
          }
          else if (event.data.action === `cancel`) {
            resolve(false)
            window.removeEventListener(`message`, handleMessage)
          }
        }
        window.addEventListener(`message`, handleMessage)
      })

      if (!confirmed) {
        console.log(`用户取消了此元素的转换`)
        return { elementId: ``, imageUrl: `` }
      }

      // 7. 上传到图床
      const imageFile = dataURLtoFile(imageDataUrl, `converted-${Date.now()}.png`)
      const imageUrl = await fileUpload(originalMarkdown.value, imageFile)

      // 7. 记录转换映射
      const elementId = generateElementId(element)
      conversionMap.value.set(elementId, imageUrl)

      return { elementId, imageUrl }
    }
    catch (error) {
      console.error(`转换失败:`, error)
      throw error
    }
  }

  // 转换元素为图片
  const convertElementsToImages = async () => {
    const previewElement = document.querySelector(`#output-wrapper > .preview`)
    if (!previewElement)
      return

    const elementsToConvert = []

    // 根据配置识别需要转换的元素
    if (conversionConfig.value.convertAdmonition) {
      const admonitions = previewElement.querySelectorAll(`.admonition`)
      elementsToConvert.push(...admonitions)
      console.log(`找到 ${admonitions.length} 个 Admonition 元素`)
    }
    if (conversionConfig.value.convertMathBlock) {
      const mathBlocks = previewElement.querySelectorAll(`.block_katex`)
      elementsToConvert.push(...mathBlocks)
      console.log(`找到 ${mathBlocks.length} 个 Math Block 元素`)
    }
    if (conversionConfig.value.convertFencedBlock) {
      const fencedBlocks = previewElement.querySelectorAll(`pre code`)
      elementsToConvert.push(...fencedBlocks)
      console.log(`找到 ${fencedBlocks.length} 个 Fenced Block 元素`)
    }

    console.log(`总共找到 ${elementsToConvert.length} 个需要转换的元素`)

    // 依次转换每个元素
    for (let i = 0; i < elementsToConvert.length; i++) {
      const element = elementsToConvert[i] as HTMLElement
      console.log(`正在转换第 ${i + 1}/${elementsToConvert.length} 个元素:`, element)

      try {
        const result = await convertElementToImage(element)
        if (!result.elementId || !result.imageUrl) {
          console.log(`用户跳过了第 ${i + 1} 个元素`)
          continue
        }
        console.log(`第 ${i + 1} 个元素转换成功:`, result.imageUrl)
      }
      catch (error) {
        console.error(`第 ${i + 1} 个元素转换失败:`, error)
        // 继续转换下一个元素，不中断整个流程
        continue
      }
    }
  }

  // 替换为图床链接
  const replaceWithImageLinks = () => {
    let newMarkdown = originalMarkdown.value

    // 根据转换映射替换内容
    for (const [elementId, imageUrl] of conversionMap.value) {
      const markdownPattern = getMarkdownPattern(elementId)
      const imageMarkdown = `![](${imageUrl})`
      newMarkdown = newMarkdown.replace(markdownPattern, imageMarkdown)
    }

    convertedMarkdown.value = newMarkdown

    // 更新编辑器内容
    editor.value!.setValue(newMarkdown)
    isConverted.value = true
  }

  // 执行转图操作
  const convertToImages = async () => {
    try {
      isConverting.value = true

      // 1. 保存原始内容
      saveOriginalMarkdown()

      // 2. 转换元素为图片
      await convertElementsToImages()

      // 3. 替换为图床链接
      replaceWithImageLinks()

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

  // 恢复原始 markdown
  const restoreOriginalMarkdown = () => {
    if (!isConverted.value || !originalMarkdown.value) {
      return false
    }

    editor.value!.setValue(originalMarkdown.value)
    isConverted.value = false
    conversionMap.value.clear()
    return true
  }

  // 导出转图后的 markdown
  const exportConvertedMarkdown = () => {
    if (!isConverted.value || !convertedMarkdown.value) {
      return false
    }

    downloadMD(convertedMarkdown.value, `${posts.value[currentPostIndex.value].title}-converted`)
    return true
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
    downloadAsCardImage,

    // 转图功能相关
    originalMarkdown,
    convertedMarkdown,
    isConverted,
    conversionMap,
    isConverting,
    conversionConfig,
    convertToImages,
    restoreOriginalMarkdown,
    exportConvertedMarkdown,

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
