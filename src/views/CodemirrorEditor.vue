<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
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
import {
  altKey,
  altSign,
  ctrlKey,
  ctrlSign,
  shiftKey,
  shiftSign,
} from '@/config'
import { useDisplayStore, useStore } from '@/stores'
import { checkImage, formatDoc, toBase64 } from '@/utils'
import { toggleFormat } from '@/utils/editor'
import fileApi from '@/utils/file'
import CodeMirror from 'codemirror'
import CryptoJS from 'crypto-js'
import html2canvas from 'html2canvas'
import { Eye, List, Pen } from 'lucide-vue-next'

const store = useStore()
const displayStore = useDisplayStore()
const { isDark, output, editor, readingTime } = storeToRefs(store)

const {
  editorRefresh,
  exportEditorContent2HTML,
  exportEditorContent2MD,
  exportConvertedMarkdown2MD,
  formatContent,
  importMarkdownContent,
  importDefaultContent,
  copyToClipboard,
  pasteFromClipboard,
  resetStyleConfirm,
  downloadAsCardImage,
  clearContent,
} = store

const {
  toggleShowInsertFormDialog,
  toggleShowInsertMpCardDialog,
  toggleShowUploadImgDialog,
} = displayStore

const isImgLoading = ref(false)
const timeout = ref<NodeJS.Timeout>()

const showEditor = ref(true)

const searchTabRef = ref<InstanceType<typeof SearchTab>>()

function openSearchWithSelection(cm: CodeMirror.Editor) {
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

function applyHeading(level: number, editor: CodeMirror.Editor) {
  editor.operation(() => {
    const ranges = editor.listSelections()

    ranges.forEach((range) => {
      const from = range.from()
      const to = range.to()

      for (let line = from.line; line <= to.line; line++) {
        const text = editor.getLine(line)
        // 去掉已有的 # 前缀（1~6 个）+ 空格
        const cleaned = text.replace(/^#{1,6}\s+/, ``).trimStart()
        const heading = `${`#`.repeat(level)} ${cleaned}`
        editor.replaceRange(
          heading,
          { line, ch: 0 },
          { line, ch: text.length },
        )
      }
    })
  })
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === `Escape` && searchTabRef.value?.showSearchTab) {
    searchTabRef.value.showSearchTab = false
    e.preventDefault()
    editor.value?.focus()
  }
}

onMounted(() => {
  setTimeout(() => {
    leftAndRightScroll()
  }, 300)
  document.addEventListener(`keydown`, handleGlobalKeydown)
})

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

const preview = ref<HTMLDivElement | null>(null)

// 使浏览区与编辑区滚动条建立同步联系
function leftAndRightScroll() {
  const scrollCB = (text: string) => {
    // AIPolishBtnRef.value?.close()

    let source: HTMLElement
    let target: HTMLElement

    clearTimeout(timeout.value)
    if (text === `preview`) {
      source = preview.value!
      target = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!

      editor.value!.off(`scroll`, editorScrollCB)
      timeout.value = setTimeout(() => {
        editor.value!.on(`scroll`, editorScrollCB)
      }, 300)
    }
    else {
      source = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
      target = preview.value!

      target.removeEventListener(`scroll`, previewScrollCB, false)
      timeout.value = setTimeout(() => {
        target.addEventListener(`scroll`, previewScrollCB, false)
      }, 300)
    }

    const percentage
      = source.scrollTop / (source.scrollHeight - source.offsetHeight)
    const height = percentage * (target.scrollHeight - target.offsetHeight)

    target.scrollTo(0, height)
  }

  function editorScrollCB() {
    scrollCB(`editor`)
  }

  function previewScrollCB() {
    scrollCB(`preview`)
  }

  preview.value!.addEventListener(`scroll`, previewScrollCB, false)
  editor.value!.on(`scroll`, editorScrollCB)
}

// 更新编辑器
function onEditorRefresh() {
  editorRefresh()
}

const backLight = ref(false)
const isCoping = ref(false)

function startCopy() {
  isCoping.value = true
  backLight.value = true
}

// 拷贝结束
function endCopy() {
  backLight.value = false
  setTimeout(() => {
    isCoping.value = false
  }, 800)
}

function beforeUpload(file: File) {
  // validate image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg!)
    return false
  }

  // check image host
  const imgHost = localStorage.getItem(`imgHost`) || `default`
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = imgHost === `default` || config
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

function uploadImage(
  file: File,
  cb?: { (url: any): void, (arg0: unknown): void } | undefined,
) {
  isImgLoading.value = true

  toBase64(file)
    .then(base64Content => fileApi.fileUpload(base64Content, file))
    .then((url) => {
      if (cb) {
        cb(url)
      }
      else {
        uploaded(url)
      }
    })
    .catch((err) => {
      toast.error(err.message)
    })
    .finally(() => {
      isImgLoading.value = false
    })
}

const changeTimer = ref<NodeJS.Timeout>()

// 监听暗色模式并更新编辑器
watch(isDark, () => {
  const theme = isDark.value ? `darcula` : `xq-light`
  toRaw(editor.value)?.setOption?.(`theme`, theme)
})

// 初始化编辑器
function initEditor() {
  const editorDom = document.querySelector<HTMLTextAreaElement>(`#editor`)!

  if (!editorDom.value) {
    editorDom.value = store.posts[store.currentPostIndex].content
  }

  nextTick(() => {
    editor.value = CodeMirror.fromTextArea(editorDom, {
      mode: `text/x-markdown`,
      theme: isDark.value ? `darcula` : `xq-light`,
      lineNumbers: false,
      lineWrapping: true,
      styleActiveLine: true,
      autoCloseBrackets: true,
      extraKeys: {
        [`${shiftKey}-${altKey}-F`]: function autoFormat(editor) {
          const value = editor.getValue()
          formatDoc(value).then((doc: string) => {
            editor.setValue(doc)
          })
        },

        [`${ctrlKey}-B`]: function bold(editor) {
          toggleFormat(editor, {
            prefix: `**`,
            suffix: `**`,
            check: s => s.startsWith(`**`) && s.endsWith(`**`),
          })
        },

        [`${ctrlKey}-I`]: function italic(editor) {
          toggleFormat(editor, {
            prefix: `*`,
            suffix: `*`,
            check: s => s.startsWith(`*`) && s.endsWith(`*`),
          })
        },

        [`${ctrlKey}-D`]: function del(editor) {
          toggleFormat(editor, {
            prefix: `~~`,
            suffix: `~~`,
            check: s => s.startsWith(`~~`) && s.endsWith(`~~`),
          })
        },

        [`${ctrlKey}-K`]: function link(editor) {
          toggleFormat(editor, {
            prefix: `[`,
            suffix: `]()`,
            check: s => s.startsWith(`[`) && s.endsWith(`]()`),
            afterInsertCursorOffset: -1,
          })
        },

        [`${ctrlKey}-E`]: function code(editor) {
          toggleFormat(editor, {
            prefix: `\``,
            suffix: `\``,
            check: s => s.startsWith(`\``) && s.endsWith(`\``),
          })
        },

        [`${ctrlKey}-1`]: (ed: CodeMirror.Editor) => applyHeading(1, ed),
        [`${ctrlKey}-2`]: (ed: CodeMirror.Editor) => applyHeading(2, ed),
        [`${ctrlKey}-3`]: (ed: CodeMirror.Editor) => applyHeading(3, ed),
        [`${ctrlKey}-4`]: (ed: CodeMirror.Editor) => applyHeading(4, ed),
        [`${ctrlKey}-5`]: (ed: CodeMirror.Editor) => applyHeading(5, ed),
        [`${ctrlKey}-6`]: (ed: CodeMirror.Editor) => applyHeading(6, ed),

        [`${ctrlKey}-U`]: function unorderedList(editor) {
          const selected = editor.getSelection()
          const lines = selected.split(`\n`)
          const isList = lines.every(line => line.trim().startsWith(`- `))
          const updated = isList
            ? lines.map(line => line.replace(/^- +/, ``)).join(`\n`)
            : lines.map(line => `- ${line}`).join(`\n`)
          editor.replaceSelection(updated)
        },

        [`${ctrlKey}-O`]: function orderedList(editor) {
          const selected = editor.getSelection()
          const lines = selected.split(`\n`)
          const isList = lines.every(line => /^\d+\.\s/.test(line.trim()))
          const updated = isList
            ? lines.map(line => line.replace(/^\d+\.\s+/, ``)).join(`\n`)
            : lines.map((line, i) => `${i + 1}. ${line}`).join(`\n`)
          editor.replaceSelection(updated)
        },
        [`${ctrlKey}-F`]: (cm: CodeMirror.Editor) => {
          openSearchWithSelection(cm)
        },
        [`${ctrlKey}-G`]: function search() {
          // use this to avoid CodeMirror's built-in search functionality
        },
      },
    })

    editor.value.on(`change`, (e) => {
      clearTimeout(changeTimer.value)
      changeTimer.value = setTimeout(() => {
        onEditorRefresh()
        if (e.getValue() !== store.posts[store.currentPostIndex].content) {
          store.posts[store.currentPostIndex].updateDatetime = new Date()
        }

        store.posts[store.currentPostIndex].content = e.getValue()
      }, 300)
    })

    // 粘贴上传图片并插入
    editor.value.on(`paste`, (_cm, e) => {
      if (!(e.clipboardData && e.clipboardData.items) || isImgLoading.value) {
        return
      }
      for (let i = 0, len = e.clipboardData.items.length; i < len; ++i) {
        const item = e.clipboardData.items[i]
        if (item.kind === `file`) {
          // 校验图床参数
          const pasteFile = item.getAsFile()!
          const isValid = beforeUpload(pasteFile)
          if (!isValid) {
            continue
          }
          uploadImage(pasteFile)
          e.preventDefault()
        }
      }
    })

    initPolishEvent(editor.value)
    onEditorRefresh()
    mdLocalToRemote()
  })

  // 定时，30 秒记录一次
  setInterval(() => {
    const pre = (store.posts[store.currentPostIndex].history || [])[0]?.content
    if (pre !== store.posts[store.currentPostIndex].content) {
      store.posts[store.currentPostIndex].history ??= []
      store.posts[store.currentPostIndex].history.unshift({
        datetime: new Date().toLocaleString(`zh-CN`),
        content: store.posts[store.currentPostIndex].content,
      })
      // 超长时，进行减负
      if (store.posts[store.currentPostIndex].history.length > 10) {
        store.posts[store.currentPostIndex].history.length = 10
      }
    }
  }, 30 * 1000)
}

const container = ref(null)

// 工具函数，添加格式
function addFormat(cmd: string | number) {
  (editor.value as any).options.extraKeys[cmd](editor.value)
}

const codeMirrorWrapper = ref<ComponentPublicInstance<HTMLDivElement> | null>(
  null,
)

// 转换 markdown 中的本地图片为线上图片
// todo 处理事件覆盖
function mdLocalToRemote() {
  const dom = codeMirrorWrapper.value!

  // 上传 md 中的图片
  const uploadMdImg = async ({
    md,
    list,
  }: {
    md: { str: string, path: string, file: File }
    list: { path: string, file: File }[]
  }) => {
    const mdImgList = [
      ...(md.str.matchAll(/!\[(.*?)\]\((.*?)\)/g) || []),
    ].filter((item) => {
      return item // 获取所有相对地址的图片
    })
    const root = md.path.match(/.+?\//)![0]
    const resList = await Promise.all<{ matchStr: string, url: string }>(
      mdImgList.map((item) => {
        return new Promise((resolve) => {
          let [, , matchStr] = item
          matchStr = matchStr.replace(/^.\//, ``) // 处理 ./img/ 为 img/ 统一相对路径风格
          const { file }
            = list.find(f => f.path === `${root}${matchStr}`) || {}
          uploadImage(file!, (url) => {
            resolve({ matchStr, url })
          })
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

  dom.ondragover = evt => evt.preventDefault()
  dom.ondrop = async (evt: any) => {
    evt.preventDefault()
    for (const item of evt.dataTransfer.items) {
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
}

onMounted(() => {
  initEditor()
})

const isOpenHeadingSlider = ref(false)

// 转图功能相关
const convertedMarkdown = useStorage(`convertedMarkdown`, ``)
const blockUploadStatus = useStorage(`blockUploadStatus`, {} as Record<string, { hash: string, url: string }>)

// 转图功能
async function convertToImages() {
  try {
    // 检查图床配置
    const imgHost = localStorage.getItem(`imgHost`) || `github`

    // 对于 GitHub 图床或 default（默认使用 GitHub），检查 githubConfig
    if (imgHost === `github` || imgHost === `default`) {
      const githubConfig = localStorage.getItem(`githubConfig`)
      if (!githubConfig) {
        toast.error(`请先在设置中配置 GitHub 图床参数`)
        return
      }

      const configObj = JSON.parse(githubConfig)
      if (!configObj.repo || !configObj.accessToken) {
        toast.error(`请先完整配置 GitHub 图床参数（仓库和访问令牌）`)
        return
      }
    }
    else {
      // 对于其他图床，使用原来的逻辑
      const config = localStorage.getItem(`${imgHost}Config`)
      if (!config) {
        toast.error(`请先在设置中配置 ${imgHost} 图床参数`)
        return
      }
    }

    const outputElement = document.getElementById(`output`)
    if (!outputElement) {
      toast.error(`预览区域未找到`)
      return
    }

    // 查找所有需要转换的块
    const admonitionBlocks = outputElement.querySelectorAll(`[data-block-type="admonition"]`)
    const fencedBlocks = outputElement.querySelectorAll(`[data-block-type="fenced"]`)
    const mathBlocks = outputElement.querySelectorAll(`[data-block-type="math"]`)

    const allBlocks = [...admonitionBlocks, ...fencedBlocks, ...mathBlocks]

    if (allBlocks.length === 0) {
      toast.info(`没有找到需要转换的块`)
      return
    }

    let currentMarkdown = editor.value?.getValue() || ``
    let hasChanges = false
    let processedCount = 0

    toast.info(`开始转换 ${allBlocks.length} 个块...`)

    for (const block of allBlocks) {
      const blockId = block.id
      const blockType = block.getAttribute(`data-block-type`)
      const blockContent = decodeURIComponent(block.getAttribute(`data-block-content`) || ``)

      // 计算内容的 MD5 哈希
      const contentHash = CryptoJS.MD5(blockContent).toString()

      // 检查是否已经上传过相同内容
      const existingUpload = blockUploadStatus.value[blockId]
      if (existingUpload && existingUpload.hash === contentHash) {
        console.info(`${blockType} 块内容未改变，跳过上传`)
        continue
      }

      try {
        // 截图
        const canvas = await html2canvas(block as HTMLElement, {
          backgroundColor: isDark.value ? `#1a1a1a` : `#ffffff`,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        })

        // 转换为 Blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob: Blob | null) => {
            resolve(blob!)
          }, `image/png`)
        })
        const file = new File([blob], `${blockType}-${Date.now()}.png`, { type: `image/png` })

        // 上传图片
        const base64Content = await toBase64(file)
        const imageUrl = await fileApi.fileUpload(base64Content, file)

        // 记录上传状态
        blockUploadStatus.value[blockId] = {
          hash: contentHash,
          url: imageUrl,
        }

        // 根据块类型替换 markdown 内容
        if (blockType === `admonition`) {
          console.log(`🔍 开始处理 admonition 块转换`)
          console.log(`📄 当前 markdown 内容:`, currentMarkdown)
          console.log(`🎯 目标内容哈希:`, contentHash)
          console.log(`🖼️ 图片 URL:`, imageUrl)

          // 查找并替换 admonition 块 - 使用与 MDAdmonition.ts 相同的正则表达式
          // 需要逐行匹配，因为 admonition 可能在文档的任何位置
          const lines = currentMarkdown.split(`\n`)
          let inAdmonition = false
          let admonitionStart = -1
          let admonitionType = ``
          let admonitionContent = ``
          let foundMatch = false

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // 检查是否是 admonition 开始
            const startMatch = line.match(/^!!!\s+(\w+)(?:\s+"([^"]*)")?/)
            if (startMatch && !inAdmonition) {
              console.log(`📍 找到 admonition 开始 (行 ${i}):`, line)
              inAdmonition = true
              admonitionStart = i
              admonitionType = startMatch[1]
              admonitionContent = ``
              continue
            }

            if (inAdmonition) {
              // 检查结束条件
              const isEndByComment = line.trim() === `<!--${admonitionType}-->`
              // 检查是否遇到两个连续的空行（三个换行符）
              const isEndByEmptyLines = line.trim() === ``
                && i + 1 < lines.length && lines[i + 1].trim() === ``
              const isEndOfFile = i === lines.length - 1

              // 如果遇到结束条件，先处理已累积的内容，不包含当前行
              if (isEndByComment || isEndByEmptyLines) {
                console.log(`🏁 找到 admonition 结束 (行 ${i}):`, {
                  isEndByComment,
                  isEndByEmptyLines,
                  isEndOfFile: false,
                  line,
                })

                // 处理内容 - 移除4空格缩进
                const processedContent = admonitionContent
                  .split(`\n`)
                  .map(contentLine => contentLine.replace(/^ {4}/, ``))
                  .join(`\n`)
                  .trim()

                console.log(`📝 原始内容:`, admonitionContent)
                console.log(`🔧 处理后内容:`, processedContent)

                // 使用原始内容计算哈希，因为渲染器使用的是 originalContent
                const matchHash = CryptoJS.MD5(admonitionContent).toString()
                console.log(`🔑 计算的哈希 (原始内容):`, matchHash)
                console.log(`🎯 目标哈希:`, contentHash)
                console.log(`✅ 哈希匹配:`, matchHash === contentHash)

                if (matchHash === contentHash) {
                  // 计算要替换的行范围
                  let endLine = i - 1 // 不包含当前的空行
                  if (isEndByComment) {
                    endLine = i // 包含注释行
                  }

                  console.log(`🔄 替换行范围: ${admonitionStart} - ${endLine}`)

                  // 替换整个 admonition 块
                  const originalBlock = lines.slice(admonitionStart, endLine + 1).join(`\n`)
                  console.log(`📋 原始块内容:`, originalBlock)

                  const newLines = [
                    ...lines.slice(0, admonitionStart),
                    `![](${imageUrl})`,
                    ...lines.slice(endLine + 1),
                  ]
                  currentMarkdown = newLines.join(`\n`)
                  console.log(`✨ 替换后的 markdown:`, currentMarkdown)
                  hasChanges = true
                  foundMatch = true
                  break
                }

                inAdmonition = false
                admonitionStart = -1
                admonitionType = ``
                admonitionContent = ``
              }
              else if (isEndOfFile) {
                // 文件结束，包含当前行
                if (admonitionContent) {
                  admonitionContent += `\n${line}`
                }
                else {
                  admonitionContent = line
                }

                console.log(`🏁 找到 admonition 结束 (文件结束):`, {
                  isEndByComment: false,
                  isEndByEmptyLines: false,
                  isEndOfFile: true,
                  line,
                })

                // 处理内容 - 移除4空格缩进
                const processedContent = admonitionContent
                  .split(`\n`)
                  .map(contentLine => contentLine.replace(/^ {4}/, ``))
                  .join(`\n`)
                  .trim()

                console.log(`📝 原始内容:`, admonitionContent)
                console.log(`🔧 处理后内容:`, processedContent)

                // 使用原始内容计算哈希，因为渲染器使用的是 originalContent
                const matchHash = CryptoJS.MD5(admonitionContent).toString()
                console.log(`🔑 计算的哈希 (原始内容):`, matchHash)
                console.log(`🎯 目标哈希:`, contentHash)
                console.log(`✅ 哈希匹配:`, matchHash === contentHash)

                if (matchHash === contentHash) {
                  console.log(`🔄 替换行范围: ${admonitionStart} - ${i}`)

                  // 替换整个 admonition 块
                  const originalBlock = lines.slice(admonitionStart, i + 1).join(`\n`)
                  console.log(`📋 原始块内容:`, originalBlock)

                  const newLines = [
                    ...lines.slice(0, admonitionStart),
                    `![](${imageUrl})`,
                    ...lines.slice(i + 1),
                  ]
                  currentMarkdown = newLines.join(`\n`)
                  console.log(`✨ 替换后的 markdown:`, currentMarkdown)
                  hasChanges = true
                  foundMatch = true
                  break
                }
              }
              else {
                // 累积内容
                if (admonitionContent) {
                  admonitionContent += `\n${line}`
                }
                else {
                  admonitionContent = line
                }
              }
            }
          }

          if (!foundMatch) {
            console.log(`❌ 未找到匹配的 CommonMark admonition 块，尝试查找 GMF admonition`)

            // 尝试查找 GMF 格式的 admonition (> [!type])
            const gmfLines = currentMarkdown.split(`\n`)
            let inGmfAdmonition = false
            let gmfAdmonitionStart = -1
            let gmfAdmonitionType = ``
            let gmfAdmonitionContent = ``

            for (let i = 0; i < gmfLines.length; i++) {
              const line = gmfLines[i]

              // 检查是否是 GMF admonition 开始
              const gmfStartMatch = line.match(/^>\s*\[!(\w+)\]/)
              if (gmfStartMatch && !inGmfAdmonition) {
                console.log(`📍 找到 GMF admonition 开始 (行 ${i}):`, line)
                inGmfAdmonition = true
                gmfAdmonitionStart = i
                gmfAdmonitionType = gmfStartMatch[1]
                gmfAdmonitionContent = ``
                continue
              }

              if (inGmfAdmonition) {
                // 检查是否是 GMF admonition 的内容行
                if (line.startsWith(`> `)) {
                  const content = line.substring(2) // 移除 "> "
                  if (gmfAdmonitionContent) {
                    gmfAdmonitionContent += `\n${content}`
                  }
                  else {
                    gmfAdmonitionContent = content
                  }
                }
                else if (line.trim() === ``) {
                  // 空行，继续
                  continue
                }
                else {
                  // 非空行且不以 "> " 开头，GMF admonition 结束
                  console.log(`🏁 找到 GMF admonition 结束 (行 ${i}):`, line)

                  console.log(`📝 GMF 原始内容:`, gmfAdmonitionContent)

                  const gmfMatchHash = CryptoJS.MD5(gmfAdmonitionContent).toString()
                  console.log(`🔑 GMF 计算的哈希:`, gmfMatchHash)
                  console.log(`🎯 目标哈希:`, contentHash)
                  console.log(`✅ GMF 哈希匹配:`, gmfMatchHash === contentHash)

                  if (gmfMatchHash === contentHash) {
                    // 计算要替换的行范围（不包含当前行）
                    const endLine = i - 1

                    console.log(`🔄 GMF 替换行范围: ${gmfAdmonitionStart} - ${endLine}`)

                    // 替换整个 GMF admonition 块
                    const originalBlock = gmfLines.slice(gmfAdmonitionStart, endLine + 1).join(`\n`)
                    console.log(`📋 GMF 原始块内容:`, originalBlock)

                    const newLines = [
                      ...gmfLines.slice(0, gmfAdmonitionStart),
                      `![](${imageUrl})`,
                      ...gmfLines.slice(endLine + 1),
                    ]
                    currentMarkdown = newLines.join(`\n`)
                    console.log(`✨ GMF 替换后的 markdown:`, currentMarkdown)
                    hasChanges = true
                    foundMatch = true
                    break
                  }

                  inGmfAdmonition = false
                  gmfAdmonitionStart = -1
                  gmfAdmonitionType = ``
                  gmfAdmonitionContent = ``
                  break
                }
              }
            }

            // 处理文件结束的情况
            if (inGmfAdmonition && !foundMatch) {
              console.log(`🏁 GMF admonition 在文件结束`)

              console.log(`📝 GMF 原始内容:`, gmfAdmonitionContent)

              const gmfMatchHash = CryptoJS.MD5(gmfAdmonitionContent).toString()
              console.log(`🔑 GMF 计算的哈希:`, gmfMatchHash)
              console.log(`🎯 目标哈希:`, contentHash)
              console.log(`✅ GMF 哈希匹配:`, gmfMatchHash === contentHash)

              if (gmfMatchHash === contentHash) {
                console.log(`🔄 GMF 替换行范围: ${gmfAdmonitionStart} - ${gmfLines.length - 1}`)

                // 替换整个 GMF admonition 块
                const originalBlock = gmfLines.slice(gmfAdmonitionStart).join(`\n`)
                console.log(`📋 GMF 原始块内容:`, originalBlock)

                const newLines = [
                  ...gmfLines.slice(0, gmfAdmonitionStart),
                  `![](${imageUrl})`,
                ]
                currentMarkdown = newLines.join(`\n`)
                console.log(`✨ GMF 替换后的 markdown:`, currentMarkdown)
                hasChanges = true
                foundMatch = true
              }
            }

            if (!foundMatch) {
              console.log(`❌ 未找到匹配的 GMF admonition 块`)
            }
          }
        }
        else if (blockType === `fenced`) {
          console.log(`🔍 开始处理 fenced 代码块转换`)
          console.log(`🎯 目标内容哈希:`, contentHash)
          console.log(`📄 目标内容:`, JSON.stringify(blockContent))
          console.log(`🖼️ 图片 URL:`, imageUrl)

          // 查找并替换代码块
          const fencedRegex = /```[\s\S]*?```/g
          const matches = [...currentMarkdown.matchAll(fencedRegex)]

          console.log(`📊 找到 ${matches.length} 个代码块`)

          for (const match of matches) {
            const matchContent = match[0]
            // 更精确的内容提取，处理各种语言标识符
            const codeContent = matchContent.replace(/^```[a-zA-Z0-9_+-]*\n?/, ``).replace(/\n?```$/, ``)
            const matchHash = CryptoJS.MD5(codeContent).toString()
            console.log(`🔑 fenced 计算的哈希:`, matchHash)
            console.log(`📝 fenced 内容:`, JSON.stringify(codeContent))
            console.log(`🎯 目标哈希:`, contentHash)
            console.log(`✅ 哈希匹配:`, matchHash === contentHash)

            if (matchHash === contentHash) {
              console.log(`✅ fenced 哈希匹配，替换成功`)
              currentMarkdown = currentMarkdown.replace(matchContent, `![](${imageUrl})`)
              hasChanges = true
              break
            }
          }
        }
        else if (blockType === `math`) {
          console.log(`🔍 开始处理 math 数学公式转换`)
          console.log(`🎯 目标内容哈希:`, contentHash)
          console.log(`🖼️ 图片 URL:`, imageUrl)

          // 查找并替换数学公式块
          const mathRegex = /\$\$[\s\S]*?\$\$/g
          const matches = [...currentMarkdown.matchAll(mathRegex)]

          for (const match of matches) {
            const matchContent = match[0]
            const mathContent = matchContent.replace(/^\$\$\s*/, ``).replace(/\s*\$\$$/, ``).trim()
            const matchHash = CryptoJS.MD5(mathContent).toString()
            console.log(`🔑 math 计算的哈希:`, matchHash, `内容:`, mathContent)
            if (matchHash === contentHash) {
              console.log(`✅ math 哈希匹配，替换成功`)
              currentMarkdown = currentMarkdown.replace(matchContent, `![](${imageUrl})`)
              hasChanges = true
              break
            }
          }
        }

        processedCount++
        toast.success(`${blockType} 块转换成功 (${processedCount}/${allBlocks.length})`)
      }
      catch (error) {
        console.error(`转换 ${blockType} 块失败:`, error)
        toast.error(`转换 ${blockType} 块失败: ${error instanceof Error ? error.message : `未知错误`}`)
      }
    }

    if (hasChanges) {
      convertedMarkdown.value = currentMarkdown
      toast.success(`所有块转换完成！复制 MD 格式时将使用转换后的内容`)
    }
    else {
      toast.info(`内容未改变，不需要重复执行`)
    }
  }
  catch (error) {
    console.error(`转图功能失败:`, error)
    toast.error(`转图功能失败: ${error instanceof Error ? error.message : `未知错误`}`)
  }
}
</script>

<template>
  <div ref="container" class="container flex flex-col">
    <EditorHeader
      @add-format="addFormat"
      @format-content="formatContent"
      @start-copy="startCopy"
      @end-copy="endCopy"
      @convert-to-images="convertToImages"
    />
    <AIPolishButton
      v-if="store.showAIToolbox"
      ref="AIPolishBtnRef"
      :position="position"
      @click="AIPolishPopoverRef?.show"
    />

    <AIPolishPopover
      v-if="store.showAIToolbox"
      ref="AIPolishPopoverRef"
      :position="position"
      :selected-text="selectedText"
      :is-dragging="isDragging"
      :is-mobile="store.isMobile"
      @close-btn="AIPolishBtnRef?.close"
      @recalc-pos="recalcPos"
      @start-drag="startDrag"
    />

    <main class="container-main flex flex-1 flex-col">
      <div
        class="container-main-section border-radius-10 relative flex flex-1 overflow-hidden border-1"
      >
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            :default-size="15"
            :max-size="store.isOpenPostSlider ? 30 : 0"
            :min-size="store.isOpenPostSlider ? 10 : 0"
          >
            <PostSlider />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel class="flex">
            <div
              v-show="!store.isMobile || (store.isMobile && showEditor)"
              ref="codeMirrorWrapper"
              class="codeMirror-wrapper relative flex-1"
              :class="{
                'order-1 border-l': !store.isEditOnLeft,
                'border-r': store.isEditOnLeft,
              }"
            >
              <SearchTab v-if="editor" ref="searchTabRef" :editor="editor" />
              <AIFixedBtn
                :is-mobile="store.isMobile"
                :show-editor="showEditor"
              />
              <ContextMenu>
                <ContextMenuTrigger>
                  <textarea
                    id="editor"
                    type="textarea"
                    placeholder="Your markdown text here."
                  />
                </ContextMenuTrigger>
                <ContextMenuContent class="w-64">
                  <ContextMenuItem inset @click="toggleShowUploadImgDialog()">
                    上传图片
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="toggleShowInsertFormDialog()">
                    插入表格
                  </ContextMenuItem>
                  <ContextMenuItem
                    inset
                    @click="toggleShowInsertMpCardDialog()"
                  >
                    插入公众号名片
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="resetStyleConfirm()">
                    重置样式
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="importDefaultContent()">
                    重置文档
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="clearContent()">
                    清空内容
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset @click="importMarkdownContent()">
                    导入 .md 文档
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="exportEditorContent2MD()">
                    导出 .md 文档
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="exportConvertedMarkdown2MD()">
                    导出转图后 .md
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="exportEditorContent2HTML()">
                    导出 .html
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="downloadAsCardImage()">
                    导出 .png
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset @click="copyToClipboard()">
                    复制
                    <ContextMenuShortcut>
                      {{ ctrlSign }} + C
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="pasteFromClipboard">
                    粘贴
                    <ContextMenuShortcut>
                      {{ ctrlSign }} + V
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="formatContent()">
                    格式化
                    <ContextMenuShortcut>
                      {{ altSign }} + {{ shiftSign }} + F
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
            <div
              v-show="!store.isMobile || (store.isMobile && !showEditor)"
              class="relative flex-1 overflow-x-hidden transition-width"
              :class="[store.isOpenRightSlider ? 'w-0' : 'w-100']"
            >
              <div
                id="preview"
                ref="preview"
                class="preview-wrapper w-full p-5"
              >
                <div
                  id="output-wrapper"
                  class="w-full"
                  :class="{ output_night: !backLight }"
                >
                  <div
                    class="preview border-x-1 shadow-xl"
                    :class="[store.previewWidth]"
                  >
                    <section id="output" class="w-full" v-html="output" />
                    <div v-if="isCoping" class="loading-mask">
                      <div class="loading-mask-box">
                        <div class="loading__img" />
                        <span>正在生成</span>
                      </div>
                    </div>
                  </div>
                </div>
                <BackTop
                  target="preview"
                  :right="store.isMobile ? 24 : 20"
                  :bottom="store.isMobile ? 90 : 20"
                />
              </div>
              <div
                class="bg-background absolute left-0 top-0 border rounded-2 rounded-lt-none p-2 text-sm shadow"
                @mouseenter="() => (isOpenHeadingSlider = true)"
                @mouseleave="() => (isOpenHeadingSlider = false)"
              >
                <List class="size-6" />
                <ul
                  class="overflow-auto transition-all"
                  :class="{
                    'max-h-0 w-0': !isOpenHeadingSlider,
                    'max-h-100 w-60 mt-2': isOpenHeadingSlider,
                  }"
                >
                  <li
                    v-for="(item, index) in store.titleList"
                    :key="index"
                    class="line-clamp-1 py-1 leading-6 hover:bg-gray-300 dark:hover:bg-gray-600"
                    :style="{ paddingLeft: `${item.level - 0.5}em` }"
                  >
                    <a :href="item.url">
                      {{ item.title }}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <CssEditor class="order-2 flex-1" />
            <RightSlider class="order-2" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <footer
        class="h-[30px] flex select-none items-center justify-end px-4 text-[12px]"
      >
        字数 {{ readingTime?.words }}， 阅读大约需
        {{ Math.ceil(readingTime?.minutes ?? 0) }} 分钟
      </footer>

      <button
        v-if="store.isMobile"
        class="bg-primary fixed bottom-16 right-6 z-50 flex items-center justify-center rounded-full p-3 text-white shadow-lg transition active:scale-95 hover:scale-105 dark:bg-gray-700 dark:text-white dark:ring-2 dark:ring-white/30"
        aria-label="切换编辑/预览"
        @click="toggleView"
      >
        <component :is="showEditor ? Eye : Pen" class="h-5 w-5" />
      </button>

      <UploadImgDialog @upload-image="uploadImage" />

      <InsertFormDialog />

      <InsertMpCardDialog />

      <!-- <RunLoading /> -->

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
  height: 100%;
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
}

.codeMirror-wrapper {
  overflow-x: auto;
  height: 100%;
}
</style>
