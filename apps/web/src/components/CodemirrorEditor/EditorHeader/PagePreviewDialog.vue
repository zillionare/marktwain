<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/stores'
import { addPrefix } from '@/utils'

// 预设接口定义
interface PagePreset {
  id: string
  name: string
  width: number
  height: number
  pixelRatio: number
}

// 默认预设
const defaultPresets: PagePreset[] = [
  {
    id: `preset-1`,
    name: `iPhone 14`,
    width: 390,
    height: 844,
    pixelRatio: 3,
  },
  {
    id: `preset-2`,
    name: `iPad`,
    width: 768,
    height: 1024,
    pixelRatio: 2,
  },
  {
    id: `preset-3`,
    name: `Desktop`,
    width: 1200,
    height: 1600,
    pixelRatio: 1,
  },
]

const store = useStore()

// 对话框状态
const isOpen = ref(false)

// 预设数据存储
const presets = useStorage<PagePreset[]>(addPrefix(`pagePresets`), defaultPresets)

// 当前选中的预设ID
const activePresetId = ref(presets.value[0]?.id || ``)

// 当前预设数据
const currentPreset = computed(() => {
  return presets.value.find(p => p.id === activePresetId.value) || presets.value[0]
})

// 新增预设表单数据
const newPresetForm = ref({
  name: ``,
  width: 1200,
  height: 1600,
  pixelRatio: 1,
})

// 是否显示新增预设表单
const showAddForm = ref(false)

// 打开对话框
function open() {
  isOpen.value = true
}

// 应用预设到页面设置
function applyPreset(preset: PagePreset) {
  // 立即应用预设
  store.updatePageSettings(preset.width, preset.height)
  // 注意：当前store的pageSettings不支持pixelRatio属性

  // Recalculate page scale and refresh - calculatePageScale需要容器尺寸参数
  // 使用默认容器尺寸或从DOM获取
  const containerWidth = 800 // 默认容器宽度
  const containerHeight = 600 // 默认容器高度
  store.calculatePageScale(containerWidth, containerHeight)
  store.editorRefresh()
  toast.success(`已应用预设: ${preset.name}`)
}

// 监听当前预设变化，应用预设
// 移除 immediate 选项避免组件初始化时的递归更新
watch(currentPreset, (newPreset) => {
  if (newPreset) {
    applyPreset(newPreset)
  }
})

// 添加新预设
function addPreset() {
  if (!newPresetForm.value.name.trim()) {
    toast.error(`请输入预设名称`)
    return
  }

  const newPreset: PagePreset = {
    id: `preset-${Date.now()}`,
    name: newPresetForm.value.name.trim(),
    width: newPresetForm.value.width,
    height: newPresetForm.value.height,
    pixelRatio: newPresetForm.value.pixelRatio,
  }

  presets.value.push(newPreset)
  activePresetId.value = newPreset.id

  // 重置表单
  newPresetForm.value = {
    name: ``,
    width: 1200,
    height: 1600,
    pixelRatio: 1,
  }
  showAddForm.value = false

  toast.success(`预设添加成功`)
}

// 删除预设
function deletePreset(presetId: string) {
  if (presets.value.length <= 1) {
    toast.error(`至少需要保留一个预设`)
    return
  }

  const index = presets.value.findIndex(p => p.id === presetId)
  if (index > -1) {
    presets.value.splice(index, 1)

    // 如果删除的是当前选中的预设，切换到第一个预设
    if (activePresetId.value === presetId) {
      activePresetId.value = presets.value[0]?.id || ``
    }

    toast.success(`预设删除成功`)
  }
}

// 防抖定时器
let applyPresetTimer: NodeJS.Timeout | null = null

// 更新预设数据
function updatePreset(presetId: string, field: keyof Omit<PagePreset, `id`>, value: any) {
  const preset = presets.value.find(p => p.id === presetId)
  if (preset) {
    ;(preset as any)[field] = value

    // 如果是当前预设，使用防抖延迟应用，避免频繁更新
    if (presetId === activePresetId.value) {
      if (applyPresetTimer) {
        clearTimeout(applyPresetTimer)
      }
      applyPresetTimer = setTimeout(() => {
        applyPreset(preset)
        applyPresetTimer = null
      }, 300) // 300ms 防抖延迟
    }
  }
}

// 暴露给父组件的方法
defineExpose({
  open,
})
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>分页预览设置</DialogTitle>
        <DialogDescription>
          配置不同设备的屏幕参数预设，设置将立即生效
        </DialogDescription>
      </DialogHeader>

      <div class="mt-6">
        <Tabs v-model="activePresetId" class="w-full">
          <div class="flex items-center justify-between mb-4">
            <TabsList class="grid w-full grid-cols-auto gap-2">
              <TabsTrigger
                v-for="preset in presets"
                :key="preset.id"
                :value="preset.id"
                class="relative group"
              >
                {{ preset.name }}
                <Button
                  v-if="presets.length > 1"
                  variant="ghost"
                  size="sm"
                  class="ml-2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="deletePreset(preset.id)"
                >
                  <Trash2 class="h-3 w-3" />
                </Button>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              @click="showAddForm = !showAddForm"
            >
              <Plus class="h-4 w-4 mr-2" />
              新增预设
            </Button>
          </div>

          <!-- 新增预设表单 -->
          <div v-if="showAddForm" class="mb-6 p-4 border rounded-lg bg-muted/50">
            <h4 class="text-sm font-medium mb-3">
              新增预设
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="new-name">名称</Label>
                <Input
                  id="new-name"
                  v-model="newPresetForm.name"
                  placeholder="输入预设名称"
                />
              </div>
              <div class="space-y-2">
                <Label for="new-width">屏幕宽度 (px)</Label>
                <Input
                  id="new-width"
                  v-model.number="newPresetForm.width"
                  type="number"
                  min="100"
                />
              </div>
              <div class="space-y-2">
                <Label for="new-height">屏幕高度 (px)</Label>
                <Input
                  id="new-height"
                  v-model.number="newPresetForm.height"
                  type="number"
                  min="100"
                />
              </div>
              <div class="space-y-2">
                <Label for="new-ratio">像素比</Label>
                <Input
                  id="new-ratio"
                  v-model.number="newPresetForm.pixelRatio"
                  type="number"
                  min="0.5"
                  max="4"
                  step="0.1"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" @click="showAddForm = false">
                取消
              </Button>
              <Button size="sm" @click="addPreset">
                添加
              </Button>
            </div>
          </div>

          <!-- 预设配置内容 -->
          <TabsContent
            v-for="preset in presets"
            :key="preset.id"
            :value="preset.id"
            class="mt-0"
          >
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-4">
                <div class="space-y-2">
                  <Label :for="`name-${preset.id}`">预设名称</Label>
                  <Input
                    :id="`name-${preset.id}`"
                    :model-value="preset.name"
                    placeholder="输入预设名称"
                    @update:model-value="updatePreset(preset.id, 'name', $event)"
                  />
                </div>

                <div class="space-y-2">
                  <Label :for="`width-${preset.id}`">屏幕宽度 (px)</Label>
                  <Input
                    :id="`width-${preset.id}`"
                    :model-value="preset.width"
                    type="number"
                    min="100"
                    @update:model-value="updatePreset(preset.id, 'width', Number($event))"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div class="space-y-2">
                  <Label :for="`height-${preset.id}`">屏幕高度 (px)</Label>
                  <Input
                    :id="`height-${preset.id}`"
                    :model-value="preset.height"
                    type="number"
                    min="100"
                    @update:model-value="updatePreset(preset.id, 'height', Number($event))"
                  />
                </div>

                <div class="space-y-2">
                  <Label :for="`ratio-${preset.id}`">像素比</Label>
                  <Input
                    :id="`ratio-${preset.id}`"
                    :model-value="preset.pixelRatio"
                    type="number"
                    min="0.5"
                    max="4"
                    step="0.1"
                    @update:model-value="updatePreset(preset.id, 'pixelRatio', Number($event))"
                  />
                </div>
              </div>
            </div>

            <!-- 预览信息 -->
            <div class="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 class="text-sm font-medium mb-2">
                当前设置
              </h4>
              <div class="text-sm text-muted-foreground space-y-1">
                <div>分辨率: {{ preset.width }} × {{ preset.height }}</div>
                <div>像素比: {{ preset.pixelRatio }}x</div>
                <div>实际像素: {{ preset.width * preset.pixelRatio }} × {{ preset.height * preset.pixelRatio }}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template>
