<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useStore } from '@/stores'
import { Download, FileCode, FileCog, Upload, ImageDown } from 'lucide-vue-next'

const store = useStore()

const {
  isDark,
  isEditOnLeft,
} = storeToRefs(store)

const {
  exportEditorContent2HTML,
  exportEditorContent2MD,
  exportConvertedMarkdown2MD,
  importMarkdownContent,
  downloadAsCardImage,
} = store

const editorStateDialogVisible = ref(false)
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>
      文件
    </MenubarTrigger>
    <MenubarContent align="start">
      <MenubarItem @click="importMarkdownContent()">
        <Upload class="mr-2 size-4" />
        导入 .md
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2MD()">
        <Download class="mr-2 size-4" />
        导出 .md
      </MenubarItem>
      <MenubarItem @click="exportConvertedMarkdown2MD()">
        <ImageDown class="mr-2 size-4" />
        导出转图后 .md
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2HTML()">
        <FileCode class="mr-2 size-4" />
        导出 .html
      </MenubarItem>
      <MenubarItem @click="downloadAsCardImage()">
        <Download class="mr-2 size-4" />
        导出 .png
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="editorStateDialogVisible = true">
        <FileCog class="mr-2 size-4" />
        导入/导出项目配置
      </MenubarItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isDark">
        深色模式
      </MenubarCheckboxItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isEditOnLeft">
        左侧编辑
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 各弹窗挂载 -->
  <EditorStateDialog :visible="editorStateDialogVisible" @close="editorStateDialogVisible = false" />
</template>
