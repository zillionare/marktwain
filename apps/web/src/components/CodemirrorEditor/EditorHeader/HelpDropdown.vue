<script setup lang="ts">
import { useDisplayStore } from '@/stores'

const aboutDialogVisible = ref(false)
const displayStore = useDisplayStore()

// 切换文档显示状态
function toggleDocument() {
  displayStore.toggleShowDocumentArea()
}
</script>

<template>
  <!-- 帮助菜单 -->
  <MenubarMenu>
    <MenubarTrigger>帮助</MenubarTrigger>
    <MenubarContent align="start">
      <MenubarCheckboxItem @click="aboutDialogVisible = true">
        <span>关于</span>
      </MenubarCheckboxItem>
      <MenubarCheckboxItem @click="toggleDocument">
        <span>文档</span>
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 各弹窗挂载 -->
  <AboutDialog :visible="aboutDialogVisible" @close="aboutDialogVisible = false" />
</template>
