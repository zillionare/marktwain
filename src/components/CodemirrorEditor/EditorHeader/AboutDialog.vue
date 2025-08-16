<script setup lang="ts">
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`])

function onUpdate(val: boolean) {
  if (!val) {
    emit(`close`)
  }
}

const links = [
  { label: `GitHub 仓库`, url: `https://github.com/zillionare/marktwain` },
  { label: `在线使用`, url: `https://zillionare.github.io/marktwain` },
]

function onRedirect(url: string) {
  window.open(url, `_blank`)
}
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>关于</DialogTitle>
      </DialogHeader>
      <div class="text-center">
        <h3>MarkTwain | 一次编辑，到处发布</h3>
        <p>基于 Doocs/md 项目开发的增强版 Markdown 编辑器</p>
        <div class="space-y-2 text-center">
          <p class="text-sm text-gray-600">
            在线访问：
          </p>
          <a href="https://zillionare.github.io/marktwain" target="_blank" class="text-blue-500 hover:text-blue-700">
            https://zillionare.github.io/marktwain
          </a>
        </div>
      </div>
      <DialogFooter class="sm:justify-evenly">
        <Button
          v-for="link in links"
          :key="link.url"
          @click="onRedirect(link.url)"
        >
          {{ link.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
