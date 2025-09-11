<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { useStore } from '@/stores'

const store = useStore()
const { conversionConfig } = storeToRefs(store)

const isOpen = ref(false)

// 转换类型选项
const conversionTypeOptions = [
  {
    key: `convertAdmonition`,
    label: `Admonition`,
    description: `转换 Admonition 块为图片`,
  },
  {
    key: `convertMathBlock`,
    label: `Math Block`,
    description: `转换数学公式块为图片`,
  },
  {
    key: `convertFencedBlock`,
    label: `Fenced Block`,
    description: `转换代码块为图片`,
  },
  {
    key: `convertH2`,
    label: `二级标题`,
    description: `将二级标题转为图片`,
  },
  {
    key: `convertH3`,
    label: `三级标题`,
    description: `将三级标题转为图片`,
  },
  {
    key: `convertH4`,
    label: `四级标题`,
    description: `将二级标题转为图片`,
  },
]

// 重置配置
function resetConfig() {
  conversionConfig.value = {
    screenWidth: 800,
    devicePixelRatio: 1,
    convertAdmonition: true,
    convertMathBlock: true,
    convertFencedBlock: true,
    convertH2: true,
    convertH3: true,
    convertH4: false,
  }
}

// 保存配置
function saveConfig() {
  isOpen.value = false
  // 配置会自动保存到 localStorage，因为使用了 useStorage
}

defineExpose({
  open: () => { isOpen.value = true },
})
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>转图配置</DialogTitle>
        <DialogDescription>
          配置转图功能的参数和转换类型
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- 屏幕宽度设置 -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">屏幕宽度 (px)</Label>
          <Input
            v-model.number="conversionConfig.screenWidth" type="number" min="400" max="2000" step="50"
            placeholder="800" class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            设置转图时的预览宽度，建议 500-700px
          </p>
        </div>

        <!-- 设备像素比设置 -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">设备像素比</Label>
          <Input
            v-model.number="conversionConfig.devicePixelRatio" type="number" min="0.5" max="3" step="0.1"
            placeholder="1" class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            设置图片的清晰度，1 为标准，2 为高清
          </p>
        </div>

        <!-- 转换类型设置 -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">转换类型</Label>
          <div class="space-y-3 grid grid-cols-2">
            <div v-for="option in conversionTypeOptions" :key="option.key" class="flex items-start space-x-3">
              <Checkbox
                :id="option.key" :checked="conversionConfig[option.key]"
                @update:checked="(checked) => conversionConfig[option.key] = checked"
              />
              <div class="space-y-1">
                <Label
                  :for="option.key"
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {{ option.label }}
                </Label>
                <p class="text-xs text-muted-foreground">
                  {{ option.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="resetConfig">
          重置
        </Button>
        <Button @click="saveConfig">
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
