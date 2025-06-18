<script setup lang="ts">
import { browser } from 'wxt/browser'
import logo from '/mpmd/logo.svg'

function onOpenOption() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <div class="container popup-body">
    <div
      class="title"
      style="height: 40px; display: inline-flex; padding-left: 60px;"
    >
      <img style="height: 40px" :src="logo">
      <span
        style="
          font-size: 16px;
          line-height: 40px;
          font-weight: bold;
          margin-left: 8px;
        "
      >使用必读</span>
    </div>
    <section style="margin-top: 12px; line-height: 28px">
      <div>MarkTwain 是一款增强版 Markdown 编辑器，支持：</div>
      <div>• 实时预览和编辑</div>
      <div>• GitHub 图床上传</div>
      <div>• 多种主题样式</div>
      <div>• 数学公式和代码高亮</div>
      <div style="margin-top: 16px;">
        <button class="button" @click="onOpenOption">
          开始使用
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.popup-body {
  min-width: 300px;
  scroll-behavior: auto;
  margin-top: 20px;
}
.container {
  width: 100%;
  box-sizing: border-box;
  padding-right: 15px;
  padding-left: 15px;
  padding-bottom: 15px;
  margin-right: auto;
  margin-left: auto;
  font-size: 14px;
}
.button {
  padding: 2px 6px;
  background: #07c060;
  color: #fff;
  border-radius: 4px;
}
section a {
  text-decoration: underline;
}
</style>
