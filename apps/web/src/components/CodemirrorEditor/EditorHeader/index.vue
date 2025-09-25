<script setup lang="ts">
import {
  ChevronDownIcon,
  Image,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-vue-next'
import { altSign, ctrlKey, ctrlSign, shiftSign } from '@/configs/shortcut-key'
import { useStore } from '@/stores'
import { addPrefix, processClipboardContent } from '@/utils'
import EditDropdown from './EditDropdown.vue'
import FileDropdown from './FileDropdown.vue'
import HelpDropdown from './HelpDropdown.vue'
import SettingsDropdown from './SettingsDropdown.vue'
import StyleDropdown from './StyleDropdown.vue'

const emit = defineEmits([`startCopy`, `endCopy`])

const store = useStore()

const {
  isCiteStatus,
  isCountStatus,
  output,
  primaryColor,
  isOpenPostSlider,
  editor,
  isConverting,
  isImageReplaced,
} = storeToRefs(store)

const {
  editorRefresh,
  citeStatusChanged,
  countStatusChanged,
  formatContent,
  convertToImages,
  copyConvertedMarkdownV1,
} = store

// 工具函数，添加格式
function addFormat(cmd: string) {
  (editor.value as any).options.extraKeys[cmd](editor.value)
}

const formatItems = [
  {
    label: `加粗`,
    kbd: [ctrlSign, `B`],
    cmd: `${ctrlKey}-B`,
  },
  {
    label: `斜体`,
    kbd: [ctrlSign, `I`],
    cmd: `${ctrlKey}-I`,
  },
  {
    label: `删除线`,
    kbd: [ctrlSign, `D`],
    cmd: `${ctrlKey}-D`,
  },
  {
    label: `超链接`,
    kbd: [ctrlSign, `K`],
    cmd: `${ctrlKey}-K`,
  },
  {
    label: `行内代码`,
    kbd: [ctrlSign, `E`],
    cmd: `${ctrlKey}-E`,
  },
  {
    label: `标题`,
    kbd: [ctrlSign, `H`],
    cmd: `${ctrlKey}-H`,
  },
  {
    label: `无序列表`,
    kbd: [ctrlSign, `U`],
    cmd: `${ctrlKey}-U`,
  },
  {
    label: `有序列表`,
    kbd: [ctrlSign, `O`],
    cmd: `${ctrlKey}-O`,
  },
  {
    label: `格式化`,
    kbd: [altSign, shiftSign, `F`],
    cmd: `formatContent`,
  },
] as const

const copyMode = useStorage(addPrefix(`copyMode`), `txt`)

const { copy: copyContent } = useClipboard({
  legacy: true,
})

// 转图处理函数
async function handleConvertToImages() {
  try {
    // 检查转图时的模式切换
    if (store.isPaginationMode) {
      store.setNormalMode()
      toast.info(`转图需要在普通模式下进行，已自动为您切换`)
      // 等待模式切换完成后再继续
      await nextTick()
    }

    await convertToImages()
    toast.success(`转图完成`)
  }
  catch (error) {
    toast.error(`转图失败: ${(error as Error).message}`)
  }
}

// 复制到微信公众号
async function copy() {
  // 如果是 Markdown 源码，直接复制并返回
  if (copyMode.value === `md`) {
    const mdContent = editor.value?.getValue() || ``
    await copyContent(mdContent)
    toast.success(`已复制 Markdown 源码到剪贴板。`)
    return
  }

  // 如果是转图后 MD，调用专用函数并返回
  if (copyMode.value === `image-replaced-md`) {
    const success = await copyConvertedMarkdownV1()
    if (!success) {
      toast.error(`复制转图后 MD 失败，请检查是否已完成图片替换操作`)
    }
    return
  }

  // 如果是复制富文本，执行新的复制逻辑
  if (copyMode.value === `rich-text`) {
    try {
      const clipboardDiv = document.getElementById(`output`)!
      const htmlContent = clipboardDiv.innerHTML
      const plainText = clipboardDiv.textContent || ``

      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: `text/html` }),
        'text/plain': new Blob([plainText], { type: `text/plain` }),
      })

      await navigator.clipboard.write([clipboardItem])
      toast.success(`已复制富文本到剪贴板`)
    }
    catch (error) {
      toast.error(`复制富文本失败，请联系开发者。${error}`)
    }
    return
  }

  // 以下处理非 Markdown 的复制流程
  emit(`startCopy`)

  // 检查公众号格式复制时的模式切换
  if (copyMode.value === `txt` && store.isPaginationMode) {
    store.setNormalMode()
    toast.info(`复制为公众号格式需要在普通模式下进行，已自动为您切换`)
    // 等待模式切换完成后再继续
    await nextTick()
  }

  setTimeout(() => {
    nextTick(async () => {
      await processClipboardContent(primaryColor.value)
      const clipboardDiv = document.getElementById(`output`)!
      clipboardDiv.focus()
      window.getSelection()!.removeAllRanges()

      const temp = clipboardDiv.innerHTML

      if (copyMode.value === `txt`) {
        // execCommand 已废弃，且会丢失 SVG 等复杂内容
        try {
          const plainText = clipboardDiv.textContent || ``
          const clipboardItem = new ClipboardItem({
            'text/html': new Blob([temp], { type: `text/html` }),
            'text/plain': new Blob([plainText], { type: `text/plain` }),
          })
          // FIX: https://stackoverflow.com/questions/62327358/javascript-clipboard-api-safari-ios-notallowederror-message
          // NotAllowedError: the request is not allowed by the user agent or the platform in the current context,
          // possibly because the user denied permission.
          setTimeout(async () => {
            await navigator.clipboard.write([clipboardItem])
          }, 0)
        }
        catch (error) {
          toast.error(`复制失败，请联系开发者。${error}`)
          return
        }
      }

      clipboardDiv.innerHTML = output.value

      if (copyMode.value === `html`) {
        await copyContent(temp)
      }
      else if (copyMode.value === `html-and-style`) {
        await copyContent(store.editorContent2HTML())
      }

      // 输出提示
      toast.success(
        copyMode.value === `html`
          ? `已复制 HTML 源码，请进行下一步操作。`
          : `已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。`,
      )
      window.dispatchEvent(
        new CustomEvent(`copyToMp`, {
          detail: {
            content: output.value,
          },
        }),
      )
      editorRefresh()
      emit(`endCopy`)
    })
  }, 350)
}
</script>

<template>
  <header class="header-container h-15 flex flex-wrap items-center justify-between px-5">
    <!-- 左侧菜单：移动端隐藏 -->
    <div class="space-x-2 hidden sm:flex">
      <Menubar class="menubar border-0">
        <FileDropdown />

        <MenubarMenu>
          <MenubarTrigger> 格式</MenubarTrigger>
          <MenubarContent class="w-60" align="start">
            <MenubarCheckboxItem
              v-for="{ label, kbd, cmd } in formatItems" :key="label" @click="
                cmd === 'formatContent' ? formatContent() : addFormat(cmd)
              "
            >
              {{ label }}
              <MenubarShortcut>
                <kbd v-for="item in kbd" :key="item" class="mx-1 bg-gray-2 dark:bg-stone-9">
                  {{ item }}
                </kbd>
              </MenubarShortcut>
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem :checked="isCiteStatus" @click="citeStatusChanged()">
              微信外链转底部引用
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem :checked="isCountStatus" @click="countStatusChanged()">
              统计字数和阅读时间
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <EditDropdown />
        <StyleDropdown />
        <SettingsDropdown />
        <HelpDropdown />
      </Menubar>
    </div>

    <!-- 右侧操作区：移动端保留核心按钮 -->
    <div class="space-x-2 flex flex-wrap">
      <!-- 展开/收起左侧内容栏 -->
      <Button variant="outline" size="icon" @click="isOpenPostSlider = !isOpenPostSlider">
        <PanelLeftOpen v-show="!isOpenPostSlider" class="size-4" />
        <PanelLeftClose v-show="isOpenPostSlider" class="size-4" />
      </Button>

      <!-- 转图按钮 -->
      <Button variant="outline" :disabled="isConverting" class="flex items-center gap-2" @click="handleConvertToImages">
        <Image class="w-4 h-4" />
        {{ isConverting ? '转换中...' : '转图' }}
      </Button>

      <!-- 复制按钮组 -->
      <div class="bg-background space-x-1 text-background-foreground mx-2 flex items-center border rounded-md">
        <Button variant="ghost" class="shadow-none" @click="copy">
          复制
        </Button>
        <Separator orientation="vertical" class="h-5" />
        <DropdownMenu v-model="copyMode">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="px-2 shadow-none">
              <ChevronDownIcon class="text-secondary-foreground h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" :align-offset="-5" class="w-[200px]">
            <DropdownMenuRadioGroup v-model="copyMode">
              <DropdownMenuRadioItem value="txt">
                公众号格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rich-text" :disabled="!isImageReplaced">
                转图后富文本
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html">
                HTML 格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html-and-style">
                HTML 格式（兼容样式）
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="md">
                MD 格式
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- 设置按钮 -->
      <Button variant="outline" size="icon" @click="store.isOpenRightSlider = !store.isOpenRightSlider">
        <Settings class="size-4" />
      </Button>
    </div>
  </header>
</template>

<style lang="less" scoped>
.container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-flow: dense; // 确保项目尽可能紧密地填充
}

// 或者手动设置行高
.container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto; // 根据内容自动调整行高
}

.menubar {
  user-select: none;
}

kbd {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #a8a8a8;
  padding: 1px 4px;
  border-radius: 2px;
}
</style>
