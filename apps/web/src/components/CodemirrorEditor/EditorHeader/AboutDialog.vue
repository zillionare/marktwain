<script setup lang="ts">
import packageInfo from '../../../../package.json'

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
  { label: `开发者`, url: `http://ke.quantide.cn` },
  { label: `在线编辑器`, url: `https://md.quantide.cn` },
]

function onRedirect(url: string) {
  window.open(url, `_blank`)
}
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>关于Marktwain</DialogTitle>
      </DialogHeader>
      <div class="text-center">
        <h3>编辑一次 发遍宇宙</h3>
        <p class="text-sm text-muted-foreground mb-2">
          版本 {{ packageInfo.version }}
        </p>
        <p>要联系我们，请扫码关注开发者公众号 (Quantide)!</p>
        <img
          class="mx-auto my-5"
          src="https://fastly.jsdelivr.net/gh/zillionare/images@main/images/hot/logo/gzh.jpg"
          alt="MarkTwain 编辑器"
          style="width: 40%"
        >
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
