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

const store = useStore()
const displayStore = useDisplayStore()

const { isDark, output, editor, convertedMarkdownV1 } = storeToRefs(store)
const { editorRefresh } = store

const { toggleShowUploadImgDialog } = displayStore

// 添加 tab 控制相关状态
const activeTab = ref<`original` | `converted`>(`original`)

const backLight = ref(false)
const isCoping = ref(false)

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

// 使浏览区与编辑区滚动条建立同步联系
function leftAndRightScroll() {
  const scrollCB = (text: string) => {
    // AIPolishBtnRef.value?.close()

    let source: HTMLElement
    let target: HTMLElement

    clearTimeout(timeout.value)
    if (text === `preview`) {
      source = previewRef.value!
      target = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!

      if (editorScrollCB) {
        editor.value!.off(`scroll`, editorScrollCB)
      }
      timeout.value = setTimeout(() => {
        if (editorScrollCB) {
          editor.value!.on(`scroll`, editorScrollCB)
        }
      }, 300)
    }
    else {
      source = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
      target = previewRef.value!

      if (previewScrollCB) {
        target.removeEventListener(`scroll`, previewScrollCB, false)
      }
      timeout.value = setTimeout(() => {
        if (previewScrollCB) {
          target.addEventListener(`scroll`, previewScrollCB, false)
        }
      }, 300)
    }

    // 分页模式下的同步逻辑
    if (store.isPaginationMode) {
      if (text === `editor`) {
        // 编辑区滚动时，检查分页符是否在上半部分，只有在上半部分时才切换页面
        const editorElement = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
        const lineHeight = editor.value!.defaultTextHeight()
        const scrollTop = editorElement.scrollTop
        const visibleHeight = editorElement.clientHeight
        const halfHeight = visibleHeight / 2

        // 计算可视区域的行号范围
        const firstVisibleLine = Math.floor(scrollTop / lineHeight) + 1 // CodeMirror 行号从1开始
        // const _lastVisibleLine = Math.floor((scrollTop + visibleHeight) / lineHeight) + 1
        const halfVisibleLine = Math.floor((scrollTop + halfHeight) / lineHeight) + 1

        // 检查内容中的分页符位置
        const content = editor.value!.getValue()
        const lines = content.split(`\n`)

        // 查找在上半部分的分页符
        let targetPage = -1
        for (let i = firstVisibleLine - 1; i < halfVisibleLine && i < lines.length; i++) {
          if (lines[i].trim() === `---`) {
            // 找到分页符在上半部分，计算对应的页面
            const pageAfterSeparator = store.getPageByLineNumber(i + 2, content) // 分页符后的页面
            if (pageAfterSeparator !== -1 && pageAfterSeparator !== store.currentPageIndex) {
              targetPage = pageAfterSeparator
              break
            }
          }
        }

        // 如果没有找到分页符在上半部分，使用当前可见区域的第一行所在页面
        if (targetPage === -1) {
          const currentPage = store.getPageByLineNumber(firstVisibleLine, content)
          if (currentPage !== -1 && currentPage !== store.currentPageIndex) {
            targetPage = currentPage
          }
        }

        // 切换到目标页面
        if (targetPage !== -1) {
          store.goToPage(targetPage)
        }
      }
      else if (text === `preview`) {
        // 预览区切换页面时，编辑区滚动到对应页面的起始行
        const startLine = store.getPageStartLine(store.currentPageIndex, editor.value!.getValue())
        if (startLine !== -1) {
          const lineHeight = editor.value!.defaultTextHeight()
          const targetScrollTop = (startLine - 1) * lineHeight // 转换为0基础的像素位置

          const editorElement = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
          editorElement.scrollTo(0, targetScrollTop)
        }
      }
    }
    else {
      // 普通模式下的百分比同步
      const percentage
        = source.scrollTop / (source.scrollHeight - source.offsetHeight)
      const height = percentage * (target.scrollHeight - target.offsetHeight)

      target.scrollTo(0, height)
    }
  }

  // 将回调函数赋值给外部变量
  editorScrollCB = () => {
    scrollCB(`editor`)
  }

  previewScrollCB = () => {
    scrollCB(`preview`)
  }

  if (previewRef.value) {
    previewRef.value.addEventListener(`scroll`, previewScrollCB, false)
  }
  if (editor.value && editorScrollCB) {
    editor.value.on(`scroll`, editorScrollCB)
  }
}

onMounted(() => {
  store.resetImageConversion()

  setTimeout(() => {
    leftAndRightScroll()
  }, 300)

  // 监听预览区域尺寸变化，用于分页模式缩放计算
  let resizeObserver: ResizeObserver | null = null

  const updateContainerSize = (width: number, height: number) => {
    if (store.isPaginationMode) {
      // 分页模式：获取pagination-container的实际可用尺寸
      // 减去padding (20px * 2 = 40px)
      const availableWidth = width - 40
      const availableHeight = height - 40
      store.updatePreviewContainerSize(availableWidth, availableHeight)
    }
    else {
      // 普通模式：直接使用容器尺寸
      store.updatePreviewContainerSize(width, height)
    }
  }

  if (previewRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        updateContainerSize(width, height)
      }
    })
    resizeObserver.observe(previewRef.value)

    // 组件卸载时清理observer
    onUnmounted(() => {
      resizeObserver?.disconnect()
    })
  }

  // 监听分页模式变化，重新计算尺寸
  watch(() => store.isPaginationMode, () => {
    if (previewRef.value) {
      const rect = previewRef.value.getBoundingClientRect()
      updateContainerSize(rect.width, rect.height)
    }
  })

  // 监听分页切换，同步编辑区滚动
  watch(() => store.currentPageIndex, (newPageIndex) => {
    if (store.isPaginationMode && editor.value) {
      const startLine = store.getPageStartLine(newPageIndex, editor.value.getValue())
      if (startLine !== -1) {
        const lineHeight = editor.value.defaultTextHeight()
        const targetScrollTop = (startLine - 1) * lineHeight // 转换为0基础的像素位置

        const editorElement = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
        if (editorElement) {
          // 临时移除滚动监听，避免循环触发
          if (editorScrollCB) {
            editor.value.off(`scroll`, editorScrollCB)
          }
          editorElement.scrollTo(0, targetScrollTop)

          // 延迟恢复滚动监听
          setTimeout(() => {
            if (editor.value && editorScrollCB) {
              editor.value.on(`scroll`, editorScrollCB)
            }
          }, 300)
        }
      }
    }
  })
})

const searchTabRef
  = useTemplateRef<InstanceType<typeof SearchTab>>(`searchTabRef`)

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

onMounted(() => {
  document.addEventListener(`keydown`, handleGlobalKeydown)
})

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
function uploaded(imageUrl: string) {
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

const isImgLoading = ref(false)

async function uploadImage(
  file: File,
  cb?: { (url: any): void, (arg0: unknown): void } | undefined,
) {
  try {
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
    editorDom.value = convertedMarkdownV1.value || `请先执行转图操作`
  }

  nextTick(() => {
    editor.value = createFormTextArea(editorDom)

    initPolishEvent(editor.value)
    editorRefresh()
    mdLocalToRemote()
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
})
</script>

<template>
  <div class="container flex flex-col">
    <EditorHeader @start-copy="startCopy" @end-copy="endCopy" />

    <main class="container-main flex flex-1 flex-col">
      <div class="container-main-section border-radius-10 relative flex flex-1 overflow-hidden border">
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

              <div v-if="activeTab === 'converted' && !convertedMarkdownV1" class="p-4 text-gray-500">
                请先执行转图操作
              </div>

              <template v-else>
                <SearchTab v-if="editor" ref="searchTabRef" :editor="editor" />
                <AIFixedBtn :is-mobile="store.isMobile" :show-editor="showEditor" />

                <EditorContextMenu>
                  <textarea
                    id="editor" ref="editorRef" type="textarea" placeholder="Your markdown text here."
                    :value="activeTab === 'original' ? store.posts[store.currentPostIndex]?.content : convertedMarkdownV1"
                  />
                </EditorContextMenu>
              </template>
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
                    title="根据内容长度和页面高度自动插入分页符"
                    @click="handleAutoPagination"
                  >
                    自动分页
                  </button>
                  <div class="w-px h-4 bg-gray-300 mx-1" />
                  <button
                    class="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    :disabled="store.currentPageIndex === 0"
                    @click="store.prevPage()"
                  >
                    上一页
                  </button>
                  <span class="text-sm text-gray-600">
                    {{ store.currentPageIndex + 1 }} / {{ store.totalPages }}
                  </span>
                  <button
                    class="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    :disabled="store.currentPageIndex === store.totalPages - 1"
                    @click="store.nextPage()"
                  >
                    下一页
                  </button>
                </div>
              </div>

              <div id="preview" ref="previewRef" class="w-full flex-1 overflow-auto">
                <div id="output-wrapper" class="w-full p-5" :class="{ output_night: store.isDark }">
                  <!-- 分页模式：单页显示 -->
                  <div v-if="store.isPaginationMode">
                    <!-- 内容截断警告 -->
                    <div v-if="store.isContentTruncated" class="truncation-warning">
                      内容发生截断，请重新调整分页
                    </div>
                    <div
                      class="pagination-container"
                      :style="{
                        width: `${store.pageSettings.width * store.pageScale}px`,
                        height: `${store.pageSettings.height * store.pageScale}px`,
                        minWidth: `${store.pageSettings.width * store.pageScale}px`,
                        minHeight: `${store.pageSettings.height * store.pageScale}px`,
                      }"
                    >
                      <div
                        v-for="(page, index) in store.pages"
                        v-show="index === store.currentPageIndex"
                        :key="index"
                        :ref="el => { if (el) store.pageRefs[index] = el as HTMLElement }"
                        class="pagination-page"
                        :class="{ 'current-page': index === store.currentPageIndex }"
                        :style="{
                          width: `${store.pageSettings.width}px`,
                          height: `${store.pageSettings.height}px`,
                          transform: `scale(${store.pageScale})`,
                          transformOrigin: 'top left',
                        }"
                      >
                        <section class="w-full h-full overflow-hidden" style="padding: 20px; box-sizing: border-box;" v-html="store.renderPage(page)" />
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
}

.container-main {
  overflow: hidden;
}

#output-wrapper {
  position: relative;
  user-select: text;
  /* 移除固定高度，让内容自然流动 */
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
.codeMirror-wrapper > .flex.border-b,
.preview-wrapper > .flex.border-b {
  flex-shrink: 0;
}

/* 编辑器内容区域占用剩余空间 */
.codeMirror-wrapper > div:not(.flex),
.codeMirror-wrapper > template + div {
  flex: 1;
  overflow: hidden;
}

/* 预览内容区域已通过HTML结构中的flex-1类处理 */

/* 分页模式样式 */
.truncation-warning {
  background-color: #fee2e2;
  color: #dc2626;
  padding: 8px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
  font-weight: 500;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
}

.pagination-page {
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.pagination-page.current-page {
  /*border-color: #3b82f6;*/
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
}

/* 深色模式下的分页样式 */
.output_night .pagination-page {
  background: #1f2937;
  border-color: #374151;
}
</style>
