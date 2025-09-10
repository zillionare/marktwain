<script setup lang="ts">
import { ClipboardPasteIcon, Contact2Icon, CopyIcon, Redo2Icon, RotateCcwIcon, TableIcon, Undo2Icon, UploadCloudIcon } from 'lucide-vue-next'

const { toggleShowInsertFormDialog, toggleShowUploadImgDialog, toggleShowInsertMpCardDialog } = useDisplayStore()

const { copyToClipboard, pasteFromClipboard, undo, redo, restoreOriginalMarkdown, isConverted, copyConvertedMarkdownV1, isImageReplaced } = useStore()
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>
      编辑
    </MenubarTrigger>
    <MenubarContent align="start">
      <MenubarItem @click="undo()">
        <Undo2Icon class="mr-2 h-4 w-4" />
        撤销
      </MenubarItem>
      <MenubarItem @click="redo()">
        <Redo2Icon class="mr-2 h-4 w-4" />
        重做
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="toggleShowUploadImgDialog()">
        <UploadCloudIcon class="mr-2 h-4 w-4" />
        上传图片
      </MenubarItem>
      <MenubarItem @click="toggleShowInsertFormDialog()">
        <TableIcon class="mr-2 h-4 w-4" />
        插入表格
      </MenubarItem>
      <MenubarItem @click="toggleShowInsertMpCardDialog()">
        <Contact2Icon class="mr-2 h-4 w-4" />
        插入公众号名片
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="copyToClipboard()">
        <CopyIcon class="mr-2 h-4 w-4" />
        复制
      </MenubarItem>
      <MenubarItem @click="pasteFromClipboard()">
        <ClipboardPasteIcon class="mr-2 h-4 w-4" />
        粘贴
      </MenubarItem>
      <MenubarItem
        :disabled="!isImageReplaced"
        @click="copyConvertedMarkdownV1()"
      >
        <CopyIcon class="mr-2 h-4 w-4" />
        转图后 MD
      </MenubarItem>
      <MenubarSeparator v-if="isConverted" />
      <MenubarItem
        v-if="isConverted"
        @click="restoreOriginalMarkdown()"
      >
        <RotateCcwIcon class="mr-2 h-4 w-4" />
        恢复原始 MD
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
