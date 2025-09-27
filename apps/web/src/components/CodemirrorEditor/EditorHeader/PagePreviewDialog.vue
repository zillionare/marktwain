<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

// 默认预设 - 基础比例预设
const defaultPresets: PagePreset[] = [
  {
    id: `preset-1`,
    name: `1:1`,
    width: 480,
    height: 480,
    pixelRatio: 2,
  },
  {
    id: `preset-2`,
    name: `3:4`,
    width: 480,
    height: 640,
    pixelRatio: 2,
  },
  {
    id: `preset-3`,
    name: `4:3`,
    width: 640,
    height: 480,
    pixelRatio: 2,
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

// 计算实际像素值
const actualPixels = computed(() => {
  if (!currentPreset.value)
    return null
  const actualWidth = currentPreset.value.width * currentPreset.value.pixelRatio
  const actualHeight = currentPreset.value.height * currentPreset.value.pixelRatio
  return `实际像素 ${actualWidth} × ${actualHeight}`
})

// 新增预设表单数据
const newPresetForm = ref({
  name: ``,
  width: 800,
  height: 800,
  pixelRatio: 3,
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
    width: 800,
    height: 800,
    pixelRatio: 3,
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

// 根据预设获取预览框的CSS类
function getPresetBoxClass(preset: PagePreset) {
  const ratio = preset.width / preset.height

  // 根据宽高比确定预览框的尺寸
  if (Math.abs(ratio - 1) < 0.1) {
    // 1:1 比例 - 正方形
    return `w-20 h-20`
  }
  else if (ratio > 1) {
    // 横向比例 (如 4:3)
    return `w-24 h-18`
  }
  else {
    // 纵向比例 (如 3:4)
    return `w-18 h-24`
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
        <!-- 预设选择区域 -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium">
              选择预设
            </h3>
            <Button
              variant="outline"
              size="sm"
              @click="showAddForm = !showAddForm"
            >
              <Plus class="h-4 w-4 mr-2" />
              新增预设
            </Button>
          </div>

          <!-- 预设预览网格 -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div
              v-for="preset in presets"
              :key="preset.id"
              class="relative group cursor-pointer"
              @click="activePresetId = preset.id"
            >
              <!-- 预设预览框容器 -->
              <div class="flex flex-col items-center">
                <!-- 预设预览框 -->
                <div
                  class="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center transition-all duration-200 hover:border-gray-400 relative"
                  :class="[
                    {
                      'border-primary bg-primary/5': activePresetId === preset.id,
                      'bg-gray-50': activePresetId !== preset.id,
                    },
                    getPresetBoxClass(preset),
                  ]"
                >
                  <!-- 比例文字 -->
                  <span class="text-sm font-medium text-gray-600">{{ preset.name }}</span>

                  <!-- 删除按钮 -->
                  <Button
                    v-if="presets.length > 1"
                    variant="ghost"
                    size="sm"
                    class="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border"
                    @click.stop="deletePreset(preset.id)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>

                <!-- 预设名称 -->
                <div class="mt-2 text-center">
                  <span class="text-xs text-gray-500">{{ preset.width }}×{{ preset.height }}</span>
                </div>
              </div>
            </div>
          </div>
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
                min="1"
                max="10"
                step="1"
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

        <!-- 当前预设配置 -->
        <div v-if="currentPreset" class="border rounded-lg p-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label :for="`name-${currentPreset.id}`">预设名称</Label>
                <Input
                  :id="`name-${currentPreset.id}`"
                  :model-value="currentPreset.name"
                  placeholder="输入预设名称"
                  @update:model-value="updatePreset(currentPreset.id, 'name', $event)"
                />
              </div>

              <div class="space-y-2">
                <Label :for="`width-${currentPreset.id}`">屏幕宽度 (px)</Label>
                <Input
                  :id="`width-${currentPreset.id}`"
                  :model-value="currentPreset.width"
                  type="number"
                  min="100"
                  @update:model-value="updatePreset(currentPreset.id, 'width', Number($event))"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <Label :for="`height-${currentPreset.id}`">屏幕高度 (px)</Label>
                <Input
                  :id="`height-${currentPreset.id}`"
                  :model-value="currentPreset.height"
                  type="number"
                  min="100"
                  @update:model-value="updatePreset(currentPreset.id, 'height', Number($event))"
                />
              </div>

              <div class="space-y-2">
                <Label :for="`ratio-${currentPreset.id}`">像素比</Label>
                <Input
                  :id="`ratio-${currentPreset.id}`"
                  :model-value="currentPreset.pixelRatio"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  @update:model-value="updatePreset(currentPreset.id, 'pixelRatio', Number($event))"
                />
              </div>
            </div>
          </div>

          <!-- 实际像素信息 -->
          <div v-if="actualPixels" class="mt-6 p-4 rounded-lg">
            <div class="text-sm text-muted-foreground">
              {{ actualPixels }}
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
