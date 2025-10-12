<script setup lang="ts">
import { ref } from 'vue'
import ConversionConfigDialog from './ConversionConfigDialog.vue'
import PagePreviewDialog from './PagePreviewDialog.vue'

// 转图配置对话框引用
const conversionConfigDialog = ref<{ open: () => void } | null>(null)
// 分页预览对话框引用
const pagePreviewDialog = ref<{ open: () => void } | null>(null)

// 打开转图配置对话框
function openConversionConfig() {
  conversionConfigDialog.value?.open()
}

// 打开分页预览对话框
function openPagePreviewConfig() {
  pagePreviewDialog.value?.open()
}
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>设置</MenubarTrigger>
    <MenubarContent class="w-56" align="start">
      <MenubarCheckboxItem @click="openConversionConfig">
        转图设置
      </MenubarCheckboxItem>
      <MenubarCheckboxItem @click="openPagePreviewConfig">
        分页预览
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 转图配置对话框 -->
  <ConversionConfigDialog ref="conversionConfigDialog" />

  <!-- 分页预览配置对话框 -->
  <PagePreviewDialog ref="pagePreviewDialog" />
</template>
