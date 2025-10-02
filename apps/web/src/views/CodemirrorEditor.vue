<script setup lang="ts">
import type { Editor } from 'codemirror'
import type { ComponentPublicInstance } from 'vue'
import { fromTextArea } from 'codemirror'
import { Eye, Pen } from 'lucide-vue-next'
import {
  AIPolishButton,
  AIPolishPopover,
  useAIPolish,
} from '@/components/AIPolish'
import DocumentArea from '@/components/CodemirrorEditor/DocumentArea.vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { SearchTab } from '@/components/ui/search-tab'
import { checkImage, toBase64 } from '@/utils'
import { createExtraKeys } from '@/utils/editor'
import { fileUpload } from '@/utils/file'
import { toast } from '@/utils/toast'

const searchTabRef = useTemplateRef<InstanceType<typeof SearchTab>>(`searchTabRef`)
let resizeObserver: ResizeObserver | null = null
const store = useStore()
const displayStore = useDisplayStore()

const { isDark, output, editor, convertedMarkdownV1 } = storeToRefs(store)
const { editorRefresh } = store

const { toggleShowUploadImgDialog } = displayStore

// 添加 tab 控制相关状态
const activeTab = ref<`original` | `converted`>(`original`)

const backLight = ref(false)
const isCoping = ref(false)
const isImgLoading = ref(false)

function startCopy() {
  backLight.value = true
  isCoping.value = true
}

// 拷贝结束
function endCopy() {
  backLight.value = false
  setTimeout(() => {
    isCoping.value = false
  }, 800)
}

const showEditor = ref(true)

// 切换编辑/预览视图（仅限移动端）
function toggleView() {
  showEditor.value = !showEditor.value
}

const {
  AIPolishBtnRef,
  AIPolishPopoverRef,
  selectedText,
  position,
  isDragging,
  startDrag,
  initPolishEvent,
  recalcPos,
} = useAIPolish()

const previewRef = useTemplateRef<HTMLDivElement>(`previewRef`)

const timeout = ref<NodeJS.Timeout>()

// 滚动回调函数，提取到外部作用域以便在 watch 中使用
let editorScrollCB: (() => void) | null = null
let previewScrollCB: (() => void) | null = null
// Add lock flags to prevent feedback loops between editor and preview scroll
let isSyncingFromEditor = false // when true, ignore preview->editor callbacks
let isSyncingFromPreview = false // when true, ignore editor->preview callbacks

let lastPreviewScrollTop = 0
// Debounce timer for scroll events
let scrollDebounceTimer: NodeJS.Timeout | null = null

// 更新分页模式的缩放
function updatePaginationScale() {
  if (!store.isPaginationMode)
    return

  // 确保在DOM更新后计算尺寸
  nextTick(() => {
    const newScale = store.calculatePageScale()
    console.log(`[Pagination] 更新缩放比例:`, {
      containerWidth: document.querySelector(`.pagination-container`)?.clientWidth,
      containerHeight: document.querySelector(`.pagination-container`)?.clientHeight,
      pageWidth: store.pageSettings.width,
      pageHeight: store.pageSettings.height,
      calculatedScale: newScale,
    })

    // 仅在需要时更新，避免不必要的渲染
    if (Math.abs(store.pageScale - newScale) > 0.01) {
      store.pageScale = newScale
    }
  })
}

// 找到当前窗口中，第一个可见标题
function getFirstVisibleHeadline(): { lineNumber: number, text: string, level: number } | null {
  const wrapper = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)
  if (!wrapper || !editor.value)
    return null

  const cm = editor.value
  const totalLines = cm.lineCount()
  const viewTop = wrapper.scrollTop
  const viewBottom = viewTop + wrapper.clientHeight

  // 寻找可视区的第一行与最后一行，考虑到 line wrapping 的情况
  let firstLine = 0
  for (let i = 0; i < totalLines; i++) {
    // 获取行尾的坐标（用于判断整行是否在可视区域内）
    const lineBottom = cm.charCoords({ line: i, ch: cm.getLine(i).length }, `local`).bottom

    // 当行的底部超过可视区域顶部时，说明这行是可见的首行
    if (lineBottom > viewTop) {
      firstLine = i
      break
    }
  }

  // 找到可视区域底部对应的逻辑行
  let lastLine = totalLines - 1
  for (let i = totalLines - 1; i >= 0; i--) {
    const lineTop = cm.charCoords({ line: i, ch: 0 }, `local`).top

    // 当行的顶部小于可视区域底部时，说明这行是可见的末行
    if (lineTop < viewBottom) {
      lastLine = i
      break
    }
  }

  const headingRegex = /<h([1-6])(?:\s[^>]+)?>([\s\S]*?)<\/h\1>/gi

  let match

  console.log(`visible area`, firstLine, lastLine)
  for (let i = firstLine; i <= lastLine; i++) {
    const lineText = editor.value!.getLine(i).trim()
    if (lineText.startsWith(`#`)) {
      match = lineText.match(/^#+/)
      const level = match ? match[0].length : 0
      return {
        lineNumber: i,
        text: lineText.replace(/^#+(\s?)/, ``),
        level,
      }
    }

    match = headingRegex.exec(lineText)
    if (match !== null) {
      return {
        lineNumber: i,
        text: match[2].trim(),
        level: Number.parseInt(match[1], 10),
      }
    }
  }

  return null
}

function trySyncHeadline() {
  const visibleLine = getFirstVisibleHeadline()

  if (visibleLine) {
    const { lineNumber: _, text: mdText, level } = visibleLine

    if (mdText.length === 0)
      return false

    console.log(`find headline`, _, mdText)

    const container = previewRef.value
    if (!container)
      return false

    const headingElements = container.querySelectorAll(`h${level}`)
    let targetElement: HTMLElement | null = null

    for (const el of headingElements) {
      if (el.textContent?.trim().startsWith(mdText) && el.tagName === `H${level}`) {
        targetElement = el as HTMLElement
        break
      }
    }

    if (!targetElement)
      return false
    console.log(`found targetElement`, targetElement)

    const containerRect = container.getBoundingClientRect()
    const elementRect = targetElement.getBoundingClientRect()
    let targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top)

    // 确保不滚动超出范围
    const maxScroll = container.scrollHeight - container.clientHeight
    targetScrollTop = Math.min(targetScrollTop, maxScroll)

    // 执行滚动（预留20px顶部空间）
    lastPreviewScrollTop = targetScrollTop
    container.scrollTo({
      top: targetScrollTop - 20,
      behavior: `auto`,
    })

    console.log(`[HeadlineSync] 同步成功:`, {
      heading: mdText,
      _,
      scrollTop: targetScrollTop,
    })

    return true
  }

  return false
}

// Handle pagination mode scroll synchronization
function handlePaginationModeScroll(direction: `editor` | `preview`) {
  const editorElement = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)!
  if (direction === `editor`) {
    // 编辑器滚动 -> 预览区
    const lineHeight = editor.value!.defaultTextHeight()
    const scrollTop = editorElement.scrollTop
    const visibleHeight = editorElement.clientHeight

    const firstVisibleLine = Math.floor(scrollTop / lineHeight)
    const lastVisibleLine = Math.floor((scrollTop + visibleHeight) / lineHeight)

    const content = editor.value!.getValue()
    const lines = content.split(`\n`)
    const pageBreakLines = lines
      .map((line, index) => ({ line, index }))
      .filter(item => item.line.trim() === `---`)
      .map(item => item.index)

    const visibleBreakIndex = pageBreakLines.findIndex(
      line => line >= firstVisibleLine && line <= lastVisibleLine,
    )

    let targetPageIndex = 0
    if (visibleBreakIndex !== -1) {
      targetPageIndex = visibleBreakIndex + 1
    }
    else {
      targetPageIndex = pageBreakLines.filter(line => line < firstVisibleLine).length
    }

    if (targetPageIndex !== store.currentPageIndex) {
      store.goToPage(targetPageIndex)
    }
  }
  else {
    // 预览区滚动 -> 编辑器
    const content = editor.value!.getValue()
    const lines = content.split(`\n`)
    const pageBreakLines = lines
      .map((line, index) => ({ line, index }))
      .filter(item => item.line.trim() === `---`)
      .map(item => item.index)

    const targetLine = store.currentPageIndex === 0
      ? 0
      : (pageBreakLines[store.currentPageIndex - 1] + 1)

    const lineHeight = editor.value!.defaultTextHeight()
    const targetScrollTop = targetLine * lineHeight

    editorElement.scrollTo(0, targetScrollTop)
  }
}

// Handle normal mode scroll synchronization
function handleNormalModeScroll(direction: `editor` | `preview`) {
  if (direction === `editor`) {
    console.log(`sync editor to preview`)
    if (trySyncHeadline())
      return

    const container = previewRef.value!
    const cmWrapper = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)!

    // Calculate scroll percentage from editor wrapper (actual viewport)
    const cmScrollTop = cmWrapper.scrollTop
    const cmScrollHeight = cmWrapper.scrollHeight
    const cmClientHeight = cmWrapper.clientHeight
    const cmDenom = Math.max(1, cmScrollHeight - cmClientHeight)
    const percentage = cmDenom > 0 ? cmScrollTop / cmDenom : 0

    // Apply percentage to preview
    const pScrollHeight = container.scrollHeight
    const pClientHeight = container.clientHeight
    const pMax = Math.max(1, pScrollHeight - pClientHeight)
    const targetScrollTop = percentage * pMax

    // Store the target position before scrolling
    lastPreviewScrollTop = targetScrollTop

    console.debug(`[Preview->Editor] 预览区滚动同步 (百分比):`, {
      previewScrollHeight: pScrollHeight,
      previewClientHeight: pClientHeight,
      calculatedPercentage: percentage,
      editorScrollHeight: cmScrollHeight,
      editorClientHeight: cmClientHeight,
      targetEditorScrollTop: targetScrollTop,
    })

    container.scrollTo({
      top: targetScrollTop,
      behavior: `auto`,
    })
  }
  else {
    // Preview -> Editor: use percentage sync
    const p = previewRef.value!
    const pScrollTop = p.scrollTop
    const pScrollHeight = p.scrollHeight
    const pClientHeight = p.clientHeight
    const pDenom = Math.max(1, pScrollHeight - pClientHeight)
    const percentage = pDenom > 0 ? pScrollTop / pDenom : 0

    // Use .codeMirror-wrapper instead of .CodeMirror-scroll for correct viewport calculation
    const cmWrapper = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)!
    const cmScrollHeight = cmWrapper.scrollHeight
    const cmClientHeight = cmWrapper.clientHeight
    const cmMax = Math.max(1, cmScrollHeight - cmClientHeight)
    const targetScrollTop = percentage * cmMax

    // Debug logging for scroll sync
    console.log(`[Preview->Editor] 预览区滚动同步:`, {
      previewScrollTop: pScrollTop,
      previewScrollHeight: pScrollHeight,
      previewClientHeight: pClientHeight,
      previewScrollableHeight: pDenom,
      calculatedPercentage: percentage,
      editorScrollHeight: cmScrollHeight,
      editorClientHeight: cmClientHeight,
      editorScrollableHeight: cmMax,
      targetEditorScrollTop: targetScrollTop,
    })

    // Use scrollTo for immediate positioning
    cmWrapper.scrollTo(0, targetScrollTop)
  }
}

function leftAndRightScroll() {
  const scrollCB = (direction: `editor` | `preview`) => {
    // Clear existing debounce timer
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer)
    }

    // Debounce scroll events to prevent excessive firing
    scrollDebounceTimer = setTimeout(() => {
      // Set sync lock to prevent feedback loops
      if (direction === `preview`) {
        isSyncingFromPreview = true
      }
      else {
        isSyncingFromEditor = true
      }

      // Route to appropriate handler based on mode
      if (store.isPaginationMode) {
        handlePaginationModeScroll(direction)
      }
      else {
        handleNormalModeScroll(direction)
      }

      // Release lock on next frame to avoid feedback loops
      if (direction === `preview`) {
        requestAnimationFrame(() => {
          isSyncingFromPreview = false
        })
      }
      else {
        requestAnimationFrame(() => {
          isSyncingFromEditor = false
        })
      }
    }, 16) // ~60fps debounce
  }

  // Remove old listeners before adding new ones to prevent duplicates
  if (previewRef.value && previewScrollCB) {
    previewRef.value.removeEventListener(`scroll`, previewScrollCB, false)
  }
  const cmWrapper = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)
  if (cmWrapper && editorScrollCB) {
    cmWrapper.removeEventListener(`scroll`, editorScrollCB, false)
  }

  // Create callback functions
  editorScrollCB = () => {
    // Ignore editor->preview when preview-side initiated sync is in progress
    if (isSyncingFromPreview)
      return

    scrollCB(`editor`)
  }

  previewScrollCB = () => {
    // Store current scroll position
    if (previewRef.value) {
      lastPreviewScrollTop = previewRef.value.scrollTop

      // Debug logging for received scroll event
      console.log(`[ScrollEvent] 预览区滚动事件:`, {
        scrollTop: previewRef.value.scrollTop,
        scrollHeight: previewRef.value.scrollHeight,
        clientHeight: previewRef.value.clientHeight,
        isSyncingFromEditor,
      })
    }

    // Ignore preview->editor when editor-side initiated sync is in progress
    if (isSyncingFromEditor)
      return

    scrollCB(`preview`)
  }

  // Add new listeners
  if (previewRef.value) {
    previewRef.value.addEventListener(`scroll`, previewScrollCB, false)
  }
  const cmWrapperForListener = document.querySelector<HTMLElement>(`.codeMirror-wrapper`)
  if (cmWrapperForListener && editorScrollCB) {
    cmWrapperForListener.addEventListener(`scroll`, editorScrollCB, false)
  }
}

function openSearchWithSelection(cm: Editor) {
  const selected = cm.getSelection().trim()
  if (!searchTabRef.value)
    return

  if (selected) {
    // 自动带入选中文本
    searchTabRef.value.setSearchWord(selected)
  }
  else {
    // 仅打开面板
    searchTabRef.value.showSearchTab = true
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === `Escape` && searchTabRef.value?.showSearchTab) {
    searchTabRef.value.showSearchTab = false
    e.preventDefault()
    editor.value?.focus()
  }

  // Pagination keyboard shortcuts - only work in pagination mode
  if (store.isPaginationMode) {
    if (e.key === `ArrowRight`) {
      // Next page with right arrow
      e.preventDefault()
      store.nextPage()
    }
    else if (e.key === `ArrowLeft`) {
      // Previous page with left arrow
      e.preventDefault()
      store.prevPage()
    }
  }
}

// Handle auto-pagination functionality
function handleAutoPagination() {
  if (!editor.value) {
    toast.error(`编辑器未初始化`)
    return
  }

  try {
    // Apply auto-pagination with default options
    store.applyAutoPagination({
      targetPageHeight: store.pageSettings.height * 0.8, // Use 80% of page height as target
      minPageHeight: store.pageSettings.height * 0.5, // Minimum 50% of page height
      maxPageHeight: store.pageSettings.height * 1.2, // Maximum 120% of page height
      avoidBreakInHeaders: true,
      avoidBreakInParagraphs: true,
      avoidBreakInCodeBlocks: true,
    })

    toast.success(`自动分页完成`)
  }
  catch (error) {
    console.error(`Auto-pagination failed:`, error)
    toast.error(`自动分页失败，请检查内容格式`)
  }
}

function beforeUpload(file: File) {
  // validate image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }

  // check image host
  const imgHost = localStorage.getItem(`imgHost`) || `github`
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = config
  if (!isValidHost) {
    toast.error(`请先配置 ${imgHost} 图床参数`)
    return false
  }

  return true
}

// 图片上传结束
function uploaded(imageUrl: any) {
  if (!imageUrl) {
    toast.error(`上传图片未知异常`)
    return
  }
  toggleShowUploadImgDialog(false)
  // 上传成功，获取光标
  const cursor = editor.value!.getCursor()
  const markdownImage = `![](${imageUrl})`
  // 将 Markdown 形式的 URL 插入编辑框光标所在位置
  toRaw(store.editor!).replaceSelection(`\n${markdownImage}\n`, cursor as any)
  toast.success(`图片上传成功`)
}

async function uploadImage(
  file: File,
  cb?: { (url: any): void, (arg0: unknown): void } | undefined,
) {
  try {
    const imgHost = localStorage.getItem(`imgHost`)
    if (!imgHost) {
      toast.error(`图床未配置，请先配置图床`)
      return
    }

    isImgLoading.value = true

    const base64Content = await toBase64(file)
    const url = await fileUpload(base64Content, file)
    if (cb) {
      cb(url)
    }
    else {
      uploaded(url)
    }
  }
  catch (err) {
    toast.error((err as any).message)
  }
  finally {
    isImgLoading.value = false
  }
}

// 从文件列表中查找一个 md 文件并解析
async function getMd({ list }: { list: { path: string, file: File }[] }) {
  return new Promise<{ str: string, file: File, path: string }>((resolve) => {
    const { path, file } = list.find(item => item.path.match(/\.md$/))!
    const reader = new FileReader()
    reader.readAsText(file!, `UTF-8`)
    reader.onload = (evt) => {
      resolve({
        str: evt.target!.result as string,
        file,
        path,
      })
    }
  })
}

// 转换文件系统句柄中的文件为文件列表
async function showFileStructure(root: any) {
  const result = []
  let cwd = ``
  try {
    const dirs = [root]
    for (const dir of dirs) {
      cwd += `${dir.name}/`
      for await (const [, handle] of dir) {
        if (handle.kind === `file`) {
          result.push({
            path: cwd + handle.name,
            file: await handle.getFile(),
          })
        }
        else {
          result.push({
            path: `${cwd + handle.name}/`,
          })
          dirs.push(handle)
        }
      }
    }
  }
  catch (err) {
    console.error(err)
  }
  return result
}

// 上传 md 中的图片
async function uploadMdImg({
  md,
  list,
}: {
  md: { str: string, path: string, file: File }
  list: { path: string, file: File }[]
}) {
  // 获取所有相对地址的图片
  const mdImgList = [...(md.str.matchAll(/!\[(.*?)\]\((.*?)\)/g) || [])].filter(item => item)
  const root = md.path.match(/.+?\//)![0]
  const resList = await Promise.all<{ matchStr: string, url: string }>(
    mdImgList.map((item) => {
      return new Promise((resolve) => {
        let [, , matchStr] = item
        matchStr = matchStr.replace(/^.\//, ``) // 处理 ./img/ 为 img/ 统一相对路径风格
        const { file }
          = list.find(f => f.path === `${root}${matchStr}`) || {}
        uploadImage(file!, url => resolve({ matchStr, url }))
      })
    }),
  )
  resList.forEach((item) => {
    md.str = md.str
      .replace(`](./${item.matchStr})`, `](${item.url})`)
      .replace(`](${item.matchStr})`, `](${item.url})`)
  })
  editor.value!.setValue(md.str)
}

const codeMirrorWrapper = useTemplateRef<ComponentPublicInstance<HTMLDivElement>>(`codeMirrorWrapper`)

// 转换 markdown 中的本地图片为线上图片
// todo 处理事件覆盖
function mdLocalToRemote() {
  const dom = codeMirrorWrapper.value!

  dom.ondragover = evt => evt.preventDefault()
  dom.ondrop = async (evt) => {
    evt.preventDefault()
    if (evt.dataTransfer == null || !Array.isArray(evt.dataTransfer.items)) {
      return
    }

    for (const item of evt.dataTransfer.items.filter(item => item.kind === `file`)) {
      item
        .getAsFileSystemHandle()
        .then(async (handle: { kind: string, getFile: () => any }) => {
          if (handle.kind === `directory`) {
            const list = (await showFileStructure(handle)) as {
              path: string
              file: File
            }[]
            const md = await getMd({ list })
            uploadMdImg({ md, list })
          }
          else {
            const file = await handle.getFile()
            console.log(`file`, file)
            beforeUpload(file) && uploadImage(file)
          }
        })
    }
  }
}

const changeTimer = ref<NodeJS.Timeout>()

const editorRef = useTemplateRef<HTMLTextAreaElement>(`editorRef`)

function getEditorValue(activeTab: string) {
  if (activeTab === `original`) {
    console.log(`获取原始内容`)
    return store.posts[store.currentPostIndex]?.content || ``
  }
  else {
    return convertedMarkdownV1.value || ``
  }
}

function showConvertedPrompt(el: string) {
  // 转图后
  if (activeTab.value === `converted`) {
    if (el === `prompt`) {
      if (convertedMarkdownV1.value) { // 已转图，显示转图结果
        return { display: `none` }
      }
      else { // 显示『请转图』提示
        return {
          display: `block`,
        }
      }
    }

    if (el === `textarea`) {
      if (convertedMarkdownV1.value) { // 已转图，显示转图结果
        return { display: `block` }
      }
      else { // 显示『请转图』提示
        return { display: `none` }
      }
    }
  }

  if (activeTab.value === `original`) {
    // 在原始文档状态下，始终隐藏『请先转图』提示，始终显示编辑区
    if (el === `prompt`) {
      return { display: `none` }
    }
    else {
      return { display: `block` }
    }
  }
}
function createFormTextArea(dom: HTMLTextAreaElement) {
  const textArea = fromTextArea(dom, {
    mode: `text/x-markdown`,
    theme: isDark.value ? `darcula` : `xq-light`,
    lineNumbers: false,
    lineWrapping: true,
    styleActiveLine: true,
    autoCloseBrackets: true,
    extraKeys: createExtraKeys(openSearchWithSelection),
    undoDepth: 200,
  })

  textArea.on(`change`, (editor) => {
    clearTimeout(changeTimer.value)
    changeTimer.value = setTimeout(() => {
      editorRefresh()

      // 只有在原始文档 tab 激活时才更新 store 中的内容
      if (activeTab.value === `original`) {
        const currentPost = store.posts[store.currentPostIndex]
        const content = editor.getValue()
        if (content === currentPost.content) {
          return
        }

        currentPost.updateDatetime = new Date()
        currentPost.content = content
      }
    }, 300)
  })

  // 粘贴上传图片并插入
  textArea.on(`paste`, (_editor, event) => {
    if (!(event.clipboardData?.items) || isImgLoading.value) {
      return
    }

    const items = [...event.clipboardData.items].map(item => item.getAsFile()).filter(item => item != null && beforeUpload(item)) as File[]

    for (const item of items) {
      uploadImage(item)
      event.preventDefault()
    }
  })

  return textArea
}

// 初始化编辑器
onMounted(() => {
  const editorDom = editorRef.value

  if (editorDom == null) {
    return
  }

  // 根据当前激活的 tab 设置初始内容
  if (activeTab.value === `original`) {
    editorDom.value = store.posts[store.currentPostIndex].content
  }
  else {
    editorDom.value = convertedMarkdownV1.value || ``
  }

  nextTick(() => {
    editor.value = createFormTextArea(editorDom)

    initPolishEvent(editor.value)
    editorRefresh()
    mdLocalToRemote()
    leftAndRightScroll()

    // 初始化分页模式缩放
    updatePaginationScale()

    // 监听窗口大小变化，重新计算缩放
    window.addEventListener(`resize`, updatePaginationScale)

    // 监听预览容器尺寸变化
    const container = document.querySelector(`.pagination-container`)
    if (container) {
      resizeObserver = new ResizeObserver(updatePaginationScale)
      resizeObserver.observe(container)
    }
  })
})

// 监听暗色模式变化并更新编辑器主题
watch(isDark, () => {
  const theme = isDark.value ? `darcula` : `xq-light`
  toRaw(editor.value)?.setOption?.(`theme`, theme)
})

// 监听 tab 切换，更新编辑器内容
watch(activeTab, (newTab) => {
  if (!editor.value)
    return

  if (newTab === `original`) {
    editor.value.setValue(store.posts[store.currentPostIndex].content)
  }
  else {
    editor.value.setValue(convertedMarkdownV1.value || `请先执行转图操作`)
  }

  // 刷新预览区
  nextTick(() => {
    editorRefresh()
  })
})

// 监听预览内容变化，在DOM更新后恢复滚动位置
watch(output, () => {
  nextTick(() => {
    if (previewRef.value && lastPreviewScrollTop > 0) {
      requestAnimationFrame(() => {
        if (previewRef.value) {
          previewRef.value.scrollTop = lastPreviewScrollTop
        }
      })
    }
  })
})

// 历史记录的定时器
const historyTimer = ref<NodeJS.Timeout>()
onMounted(() => {
  // 定时，30 秒记录一次文章的历史记录
  historyTimer.value = setInterval(() => {
    const currentPost = store.posts[store.currentPostIndex]

    // 与最后一篇记录对比
    const pre = (currentPost.history || [])[0]?.content
    if (pre === currentPost.content) {
      return
    }

    currentPost.history ??= []
    currentPost.history.unshift({
      content: currentPost.content,
      datetime: new Date().toLocaleString(`zh-CN`),
    })

    currentPost.history.length = Math.min(currentPost.history.length, 10)
  }, 30 * 1000)
})

// 销毁时清理定时器和全局事件监听器
onUnmounted(() => {
  // 清理定时器 - 防止回调访问已销毁的DOM
  clearTimeout(historyTimer.value)
  clearTimeout(timeout.value)
  clearTimeout(changeTimer.value)

  // 清理全局事件监听器 - 防止全局事件触发已销毁的组件
  document.removeEventListener(`keydown`, handleGlobalKeydown)
  window.removeEventListener(`resize`, updatePaginationScale)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <!-- 根容器：使用Grid固定头部与底部 -->
  <div class="container grid">
    <EditorHeader @start-copy="startCopy" @end-copy="endCopy" />

    <!-- 文档显示区域：中间主区域 -->
    <div class="content-area relative flex-1 flex flex-col">
      <DocumentArea />

      <main class="container-main flex flex-1 flex-col" :class="{ hidden: displayStore.isShowDocumentArea }">
        <div class="container-main-section border-radius-10 relative flex flex-1 flex-col overflow-hidden border">
          <!-- 添加 tab 控制 -->
          <div class="flex border-b">
            <button
              class="px-4 py-2 font-medium" :class="{
                'border-b-2 border-blue-500 text-blue-500': activeTab === 'original',
                'text-gray-500': activeTab !== 'original',
              }" @click="activeTab = 'original'"
            >
              原始文档
            </button>
            <button
              class="px-4 py-2 font-medium" :class="{
                'border-b-2 border-blue-500 text-blue-500': activeTab === 'converted',
                'text-gray-500': activeTab !== 'converted',
              }" @click="activeTab = 'converted'"
            >
              转图后
            </button>
          </div>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              :default-size="15" :max-size="store.isOpenPostSlider ? 30 : 0"
              :min-size="store.isOpenPostSlider ? 10 : 0"
            >
              <PostSlider />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel class="flex">
              <div
                v-show="!store.isMobile || (store.isMobile && showEditor)" ref="codeMirrorWrapper"
                class="codeMirror-wrapper relative flex-1" :class="{
                  'order-1 border-l': !store.isEditOnLeft,
                  'border-r': store.isEditOnLeft,
                }"
              >
                <div class="p-4 text-gray-500 absolute" :style="showConvertedPrompt(`prompt`)">
                  请先执行转图操作
                </div>

                <SearchTab v-if="editor" ref="searchTabRef" :editor="editor" />
                <AIFixedBtn :is-mobile="store.isMobile" :show-editor="showEditor" />

                <EditorContextMenu :style="showConvertedPrompt(`textarea`)">
                  <textarea
                    id="editor" ref="editorRef" type="textarea" placeholder="Your markdown text here."
                    :value="getEditorValue(activeTab)"
                  />
                </EditorContextMenu>
              </div>
              <div
                v-show="!store.isMobile || (store.isMobile && !showEditor)"
                class="preview-wrapper relative flex-1 overflow-x-hidden transition-width flex flex-col"
                :class="[store.isOpenRightSlider ? 'w-0' : 'w-100']"
              >
                <!-- 预览模式切换 tab -->
                <div class="flex border-b bg-white dark:bg-gray-800 flex-shrink-0">
                  <button
                    class="px-4 py-2 font-medium" :class="{
                      'border-b-2 border-blue-500 text-blue-500': !store.isPaginationMode,
                      'text-gray-500': store.isPaginationMode,
                    }" @click="store.setNormalMode()"
                  >
                    普通模式
                  </button>
                  <button
                    class="px-4 py-2 font-medium" :class="{
                      'border-b-2 border-blue-500 text-blue-500': store.isPaginationMode,
                      'text-gray-500': !store.isPaginationMode,
                    }" @click="store.setPaginationMode()"
                  >
                    分页模式
                  </button>
                  <!-- 分页控制 -->
                  <div v-if="store.isPaginationMode" class="ml-auto flex items-center gap-2 px-4">
                    <!-- 自动分页按钮 -->
                    <button
                      class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      title="根据内容长度和页面高度自动插入分页符" @click="handleAutoPagination"
                    >
                      自动分页
                    </button>
                    <div class="w-px h-4 bg-gray-300 mx-1" />
                    <!-- 分页导航图标按钮 -->
                    <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                      <!-- 第一页按钮 -->
                      <button
                        class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        :disabled="store.currentPageIndex === 0" title="第一页" @click="store.goToPage(0)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <!-- 上一页按钮 -->
                      <button
                        class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        :disabled="store.currentPageIndex === 0" title="上一页" @click="store.prevPage()"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <!-- 页码显示 -->
                      <span class="text-sm text-gray-700 font-medium px-2 min-w-[60px] text-center">
                        {{ store.currentPageIndex + 1 }} of {{ store.totalPages }}
                      </span>
                      <!-- 下一页按钮 -->
                      <button
                        class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        :disabled="store.currentPageIndex === store.totalPages - 1" title="下一页"
                        @click="store.nextPage()"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <!-- 最后一页按钮 -->
                      <button
                        class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        :disabled="store.currentPageIndex === store.totalPages - 1" title="最后一页"
                        @click="store.goToPage(store.totalPages - 1)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 5l7 7-7 7M5 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div id="preview" ref="previewRef" class="w-full flex-1 overflow-auto">
                  <div
                    id="output-wrapper" class="w-full p-5"
                    :class="{ 'output_night': store.isDark, 'pagination-dark-bg': store.isPaginationMode }"
                  >
                    <!-- 分页模式：单页显示 -->
                    <div v-if="store.isPaginationMode" class="relative h-full w-full">
                      <!-- 内容截断警告 - 浮动样式 -->
                      <div v-if="store.isContentTruncated" class="truncation-warning-floating">
                        内容发生截断，请重新调整分页
                      </div>
                      <div class="pagination-container">
                        <div
                          v-for="(page, index) in store.pages" v-show="index === store.currentPageIndex" :key="index"
                          :ref="el => { if (el) store.pageRefs[index] = el as HTMLElement }" class="pagination-page"
                          :class="[
                            store.pages.length === 1 ? 'page-cover page-end'
                            : index === 0 ? 'page-cover'
                              : index === store.pages.length - 1 ? 'page-end'
                                : `page-${index + 1}`,
                          ]" :style="{
                            width: `${store.pageSettings.width}px`,
                            height: `${store.pageSettings.height}px`,
                            transform: `scale(${store.pageScale})`,
                            transformOrigin: 'center',
                          }"
                        >
                          <section
                            class="w-full h-full overflow-hidden" style="padding: 20px; box-sizing: border-box;"
                            v-html="store.renderPage(page)"
                          />
                        </div>
                      </div>
                    </div>
                    <!-- 普通模式：原有样式 -->
                    <div v-else class="preview border-x shadow-xl" :class="[store.previewWidth]">
                      <section id="output" class="w-full" v-html="output" />
                    </div>

                    <div v-if="isCoping" class="loading-mask">
                      <div class="loading-mask-box">
                        <div class="loading__img" />
                        <span>正在生成</span>
                      </div>
                    </div>
                  </div>
                  <BackTop target="preview" :right="store.isMobile ? 24 : 20" :bottom="store.isMobile ? 90 : 20" />
                </div>

                <FloatingToc />
              </div>
              <CssEditor class="order-2 flex-1" />
              <RightSlider class="order-2" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <!-- 移动端浮动按钮组 -->
        <div v-if="store.isMobile" class="fixed bottom-16 right-6 z-50 flex flex-col gap-2">
          <!-- 切换编辑/预览按钮 -->
          <button
            class="bg-primary flex items-center justify-center rounded-full p-3 text-white shadow-lg transition active:scale-95 hover:scale-105 dark:bg-gray-700 dark:text-white dark:ring-2 dark:ring-white/30"
            aria-label="切换编辑/预览" @click="toggleView"
          >
            <component :is="showEditor ? Eye : Pen" class="h-5 w-5" />
          </button>
        </div>

        <AIPolishButton
          v-if="store.showAIToolbox" ref="AIPolishBtnRef" :position="position"
          @click="AIPolishPopoverRef?.show"
        />

        <AIPolishPopover
          v-if="store.showAIToolbox" ref="AIPolishPopoverRef" :position="position"
          :selected-text="selectedText" :is-dragging="isDragging" :is-mobile="store.isMobile"
          @close-btn="AIPolishBtnRef?.close" @recalc-pos="recalcPos" @start-drag="startDrag"
        />

        <UploadImgDialog @upload-image="uploadImage" />

        <InsertFormDialog />

        <InsertMpCardDialog />

        <AlertDialog v-model:open="store.isOpenConfirmDialog">
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>提示</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将丢失本地自定义样式，是否继续？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction @click="store.resetStyle()">
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>

    <Footer />
  </div>
</template>

<style lang="less" scoped>
@import url('../assets/less/app.less');
</style>

<style lang="less" scoped>
.container {
  height: 100vh;
  min-width: 100%;
  padding: 0;
  /* Fixed header & footer layout */
  display: grid;
  /* Use grid to fix header & footer */
  grid-template-rows: auto 1fr auto;
  /* header | main | footer */
  overflow: hidden;
  /* prevent body scroll */
}

/* Middle area should not scroll itself, allow children to shrink */
.content-area {
  min-height: 0;
  /* allow inner flex panels to compute height */
  overflow: hidden;
  /* scrolling occurs inside editor/preview content */
}

.container-main {
  overflow: hidden;
  min-height: 0;
  /* ensure ResizablePanel computes height correctly */
}

.container-main-section {
  min-height: 0;
  /* prevent inner overflow and allow child flex to shrink */
}

#output-wrapper {
  position: relative;
  user-select: text;
  height: 100% !important;
}

.loading-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));

  .loading-mask-box {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);

    .loading__img {
      width: 75px;
      height: 75px;
      background: url('../assets/images/favicon.png') no-repeat;
      margin: 1em auto;
      background-size: cover;
    }
  }
}

:deep(.preview-table) {
  border-spacing: 0;
}

.codeMirror-wrapper,
.preview-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.codeMirror-wrapper {
  overflow-x: auto;
}

/* Tab控制区域固定高度，不参与flex伸缩 */
.codeMirror-wrapper>.flex.border-b,
.preview-wrapper>.flex.border-b {
  flex-shrink: 0;
}

/* 编辑器内容区域占用剩余空间 */
.codeMirror-wrapper>div:not(.flex),
.codeMirror-wrapper>template+div {
  flex: 1;
  overflow: hidden;
}

/* Override CodeMirror default height and ensure it fills the container */
:deep(.CodeMirror) {
  height: 100% !important;
  min-height: 500px;
}

:deep(.CodeMirror-scroll) {
  overflow-y: auto;
  overflow-x: auto;
  height: 100%;
}

/* 预览内容区域已通过HTML结构中的flex-1类处理 */

/* 分页模式样式 */
.truncation-warning-floating {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background-color: #fee2e2;
  color: #dc2626;
  padding: 8px 16px;
  border-radius: 4px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  overflow: visible;
  box-sizing: border-box;
  position: relative;
  height: 100%;
  width: 100%;
}

.pagination-page {
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* 页面特定样式可以通过以下class进行自定义：
   .page-cover - 封面页
   .page-end - 结尾页
   .page-1, .page-2, .page-3... - 具体页码
*/

/* 分页模式深色背景 */
.pagination-dark-bg {
  background: #c0c0c0 !important;
}

/* 深色模式下的分页样式 */
.output_night .pagination-page {
  background: #1f2937;
  border-color: #374151;
}
</style>
