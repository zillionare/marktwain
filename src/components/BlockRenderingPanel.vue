<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/stores'
import { AlertCircle, Calculator, Code, Image, MessageSquare } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

const store = useStore()
const {
  isBlockRenderingEnabled,
  editor,
} = storeToRefs(store)

// 预览当前文档中的特殊语法块
const specialBlocks = computed(() => {
  if (!editor.value)
    return []
  return store.previewSpecialBlocks(editor.value.getValue())
})

// 获取块类型的图标
function getBlockIcon(type: string) {
  switch (type) {
    case `code`:
      return Code
    case `mermaid`:
      return Image
    case `math`:
      return Calculator
    case `admonition`:
      return MessageSquare
    default:
      return AlertCircle
  }
}

// 获取块类型的颜色
function getBlockColor(type: string) {
  switch (type) {
    case `code`:
      return `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`
    case `mermaid`:
      return `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`
    case `math`:
      return `bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`
    case `admonition`:
      return `bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`
    default:
      return `bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`
  }
}

// 获取块类型的显示名称
function getBlockTypeName(type: string, lang?: string) {
  switch (type) {
    case `code`:
      return `代码块 (${lang || `text`})`
    case `mermaid`:
      return `Mermaid 图表`
    case `math`:
      return `数学公式`
    case `admonition`:
      return `提示框 (${lang || `note`})`
    default:
      return `未知块`
  }
}

// 处理开关切换
function handleToggle() {
  store.toggleBlockRendering()
  if (isBlockRenderingEnabled.value) {
    toast.success(`已启用特殊语法块渲染`)
  }
  else {
    toast.success(`已禁用特殊语法块渲染`)
  }
}
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Image class="h-5 w-5" />
        特殊语法块渲染
      </CardTitle>
      <CardDescription>
        将代码块、Mermaid图表、数学公式和提示框渲染为图片，提高跨平台兼容性
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- 开关控制 -->
      <div class="flex items-center justify-between">
        <Label for="block-rendering-switch" class="text-sm font-medium">
          启用特殊语法块渲染
        </Label>
        <Switch
          id="block-rendering-switch"
          :checked="isBlockRenderingEnabled"
          @update:checked="handleToggle"
        />
      </div>

      <Separator />

      <!-- 当前文档中的特殊语法块预览 -->
      <div class="space-y-3">
        <h4 class="text-sm font-medium">
          当前文档中的特殊语法块
        </h4>

        <div v-if="specialBlocks.length === 0" class="text-muted-foreground text-sm">
          当前文档中没有检测到特殊语法块
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(block, index) in specialBlocks"
            :key="index"
            class="bg-muted/50 flex items-start gap-3 border rounded-lg p-3"
          >
            <component
              :is="getBlockIcon(block.type)"
              class="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center gap-2">
                <Badge :class="getBlockColor(block.type)" variant="secondary">
                  {{ getBlockTypeName(block.type, block.lang) }}
                </Badge>
              </div>
              <div class="text-muted-foreground truncate text-xs font-mono">
                {{ block.content.substring(0, 100) }}{{ block.content.length > 100 ? '...' : '' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能说明 -->
      <div class="space-y-2 text-muted-foreground text-xs">
        <p><strong>支持的语法块类型：</strong></p>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li>代码块：```language 语法的代码块</li>
          <li>Mermaid图表：```mermaid 语法的图表</li>
          <li>数学公式：$$ 包围的块级数学公式</li>
          <li>提示框：> [!NOTE] 等 GitHub 风格的提示框</li>
        </ul>
        <p class="mt-2">
          <strong>注意：</strong>启用此功能后，特殊语法块将被渲染为图片并上传到 GitHub，
          这可能会增加处理时间。图片将替换原始的语法块内容。
        </p>
      </div>
    </CardContent>
  </Card>
</template>
