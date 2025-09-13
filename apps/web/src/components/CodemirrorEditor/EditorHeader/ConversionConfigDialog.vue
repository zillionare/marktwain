<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/stores'

const store = useStore()
const { conversionConfig } = storeToRefs(store)

const isOpen = ref(false)

// 暴露给父组件的方法
function open() {
  isOpen.value = true
}

// 暴露方法给父组件
defineExpose({
  open,
})

// 获取配置项的辅助函数
function getConfig(key: string) {
  const config = conversionConfig.value[key as keyof typeof conversionConfig.value]
  if (!config || typeof config !== `object`) {
    // 初始化配置项
    conversionConfig.value[key as keyof typeof conversionConfig.value] = { enabled: false, width: null }
    return conversionConfig.value[key as keyof typeof conversionConfig.value] as { enabled: boolean, width: number | null }
  }
  return config as { enabled: boolean, width: number | null }
}

// 转换类型选项
const conversionTypeOptions = [
  {
    key: `convertAdmonition`,
    label: `Admonition`,
    description: `转换 Admonition 块为图片。截图宽度建议 500px`,
    defaultWidth: 500,
  },
  {
    key: `convertMathBlock`,
    label: `Math Block`,
    description: `转换数学公式块为图片。截图宽度建议 500px`,
    defaultWidth: 500,
  },
  {
    key: `convertFencedBlock`,
    label: `Fenced Block`,
    description: `转换代码块为图片。截图宽度建议 600px`,
    defaultWidth: 600,
  },
]

// 标题转换选项
const titleConversionOptions = [
  {
    key: `convertH2`,
    label: `二级标题`,
    defaultWidth: null,
  },
  {
    key: `convertH3`,
    label: `三级标题`,
    defaultWidth: null,
  },
  {
    key: `convertH4`,
    label: `四级标题`,
    defaultWidth: null,
  },
]

// 重置配置
function resetConfig() {
  conversionConfig.value = {
    devicePixelRatio: 2,
    screenWidth: 800,
    convertAdmonition: { enabled: true, width: 500 },
    convertMathBlock: { enabled: true, width: 500 },
    convertFencedBlock: { enabled: true, width: 600 },
    convertH2: { enabled: true, width: null },
    convertH3: { enabled: true, width: null },
    convertH4: { enabled: false, width: null },
  }
}

// 保存配置
function saveConfig() {
  isOpen.value = false
  // 配置会自动保存到 localStorage，因为使用了 useStorage
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>转图配置</DialogTitle>
        <DialogDescription>
          配置转图功能的参数和转换类型
        </DialogDescription>
      </DialogHeader>

      <Tabs default-value="blocks" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="blocks">
            块元素转换
          </TabsTrigger>
          <TabsTrigger value="headers">
            标题转换
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" class="space-y-6 py-4">
          <!-- 设备像素比设置 -->
          <div class="flex items-center justify-between">
            <div>
              <Label class="text-sm font-medium">设备像素比</Label>
              <p class="text-xs text-muted-foreground">
                设置图片的清晰度，1 为标准，2 为高清
              </p>
            </div>
            <Input
              v-model.number="conversionConfig.devicePixelRatio" type="number" min="1" max="3" step="1"
              placeholder="1" class="w-20"
            />
          </div>

          <!-- 转换类型及宽度设置 -->
          <div class="space-y-3">
            <Label class="text-sm font-medium">转换类型及宽度</Label>
            <div class="space-y-3">
              <div v-for="option in conversionTypeOptions" :key="option.key" class="flex items-start space-x-3 p-3 border rounded-lg">
                <!-- 启用开关 -->
                <Checkbox
                  :id="option.key" :checked="getConfig(option.key).enabled"
                  class="mt-0.5"
                  @update:checked="(checked) => {
                    const config = getConfig(option.key)
                    config.enabled = checked
                  }"
                />

                <!-- 标签和描述 -->
                <div class="flex-1 min-w-0">
                  <Label
                    :for="option.key"
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {{ option.label }}
                  </Label>
                  <p class="text-xs text-muted-foreground mt-1">
                    {{ option.description }}
                  </p>
                </div>

                <!-- 宽度设置 -->
                <div v-if="getConfig(option.key).enabled && option.defaultWidth !== null" class="flex items-center space-x-2">
                  <Checkbox
                    :id="`${option.key}-width`"
                    :checked="getConfig(option.key).width !== null"
                    @update:checked="(checked) => {
                      const config = getConfig(option.key)
                      if (checked) {
                        config.width = option.defaultWidth
                      }
                      else {
                        config.width = null
                      }
                    }"
                  />
                  <div class="flex items-center space-x-2">
                    <Input
                      v-if="getConfig(option.key).width !== null"
                      :model-value="getConfig(option.key).width"
                      type="number"
                      min="200"
                      max="1200"
                      step="50"
                      :placeholder="option.defaultWidth?.toString() || '500'"
                      class="w-20 h-8 text-xs"
                      @update:model-value="(value) => {
                        const config = getConfig(option.key)
                        config.width = value
                      }"
                    />
                    <span class="text-xs text-muted-foreground">px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="headers" class="space-y-6 py-4">
          <!-- 屏幕宽度设置 -->
          <div class="flex items-center justify-between">
            <div>
              <Label class="text-sm font-medium">屏幕宽度</Label>
              <p class="text-xs text-muted-foreground">
                设置标题转图时的屏幕宽度，0表示保持原宽度
              </p>
            </div>
            <Input
              v-model.number="conversionConfig.screenWidth" type="number" min="0" max="1200" step="50"
              placeholder="800" class="w-20"
            />
            <span class="text-xs text-muted-foreground ml-2">px</span>
          </div>

          <!-- 标题转换设置 -->
          <div class="space-y-3">
            <div class="space-y-3">
              <div v-for="option in titleConversionOptions" :key="option.key" class="flex items-start space-x-3 p-3 border rounded-lg">
                <!-- 启用开关 -->
                <Checkbox
                  :id="option.key" :checked="getConfig(option.key).enabled"
                  class="mt-0.5"
                  @update:checked="(checked) => {
                    const config = getConfig(option.key)
                    config.enabled = checked
                  }"
                />

                <!-- 标签和描述 -->
                <div class="flex-1 min-w-0">
                  <Label
                    :for="option.key"
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {{ option.label }}
                  </Label>
                  <p class="text-xs text-muted-foreground mt-1">
                    转标题时，我们将用当前标题的大小，在两侧填充空白到屏幕宽度之后再截图
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
