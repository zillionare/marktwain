<script setup lang="ts">
import { Edit, Eye, FileText, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/stores'

const props = defineProps<{
  open: boolean
}>()

const emits = defineEmits([`update:open`])

const store = useStore()
const { templates } = storeToRefs(store)
const { addTemplate, updateTemplate, deleteTemplate } = store

// 对话框状态
const isOpen = computed({
  get: () => props.open,
  set: value => emits(`update:open`, value),
})

// 编辑状态
const editingTemplate = ref<{ id?: string, name: string, description: string, content: string } | null>(null)
const isEditing = computed(() => editingTemplate.value !== null)

// 预览状态
const isPreviewMode = ref(false)
const previewError = ref(``)
const previewContainer = ref<HTMLElement | null>(null)

// 删除确认状态
const deleteConfirmOpen = ref(false)
const templateToDelete = ref<string | null>(null)

// 表单验证
const nameError = ref(``)
const descriptionError = ref(``)
const contentError = ref(``)

function validateForm() {
  nameError.value = ``
  descriptionError.value = ``
  contentError.value = ``

  if (!editingTemplate.value?.name.trim()) {
    nameError.value = `模板名称不能为空`
    return false
  }

  if (!editingTemplate.value?.description.trim()) {
    descriptionError.value = `模板说明不能为空`
    return false
  }

  if (!editingTemplate.value?.content.trim()) {
    contentError.value = `模板内容不能为空`
    return false
  }

  // 检查名称是否重复（编辑时排除自己）
  const existingTemplate = templates.value.find(t =>
    t.name === editingTemplate.value?.name && t.id !== editingTemplate.value?.id,
  )
  if (existingTemplate) {
    nameError.value = `模板名称已存在`
    return false
  }

  return true
}

function startAdd() {
  editingTemplate.value = { name: ``, description: ``, content: `` }
  isPreviewMode.value = false
}

function startEdit(template: any) {
  editingTemplate.value = {
    id: template.id,
    name: template.name,
    description: template.description || ``,
    content: template.content,
  }
  isPreviewMode.value = false
}

function cancelEdit() {
  editingTemplate.value = null
  nameError.value = ``
  descriptionError.value = ``
  contentError.value = ``
  isPreviewMode.value = false
  previewError.value = ``
}

function saveTemplate() {
  if (!validateForm() || !editingTemplate.value)
    return

  const templateData = {
    name: editingTemplate.value.name,
    description: editingTemplate.value.description,
    content: editingTemplate.value.content,
  }

  if (editingTemplate.value.id) {
    // 更新现有模板
    updateTemplate(editingTemplate.value.id, templateData.name, templateData.content, templateData.description)
  }
  else {
    // 添加新模板
    addTemplate(templateData.name, templateData.content, templateData.description)
  }

  cancelEdit()
}

function handleDelete(templateId: string) {
  templateToDelete.value = templateId
  deleteConfirmOpen.value = true
}

function confirmDelete() {
  if (templateToDelete.value) {
    deleteTemplate(templateToDelete.value)
    // 如果正在编辑被删除的模板，取消编辑
    if (editingTemplate.value?.id === templateToDelete.value) {
      cancelEdit()
    }
    templateToDelete.value = null
  }
  deleteConfirmOpen.value = false
}

// 预览功能 - 安全地渲染HTML内容
function showPreview() {
  if (!editingTemplate.value)
    return

  isPreviewMode.value = true
  previewError.value = ``

  nextTick(() => {
    if (!previewContainer.value)
      return

    try {
      // 创建一个沙盒环境来安全地渲染内容
      const iframe = document.createElement(`iframe`)
      iframe.style.width = `100%`
      iframe.style.height = `400px`
      iframe.style.border = `1px solid #e2e8f0`
      iframe.style.borderRadius = `6px`
      iframe.sandbox = `allow-same-origin` // 限制iframe权限

      // 清空容器并添加iframe
      previewContainer.value.innerHTML = ``
      previewContainer.value.appendChild(iframe)

      // 在iframe中渲染内容
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (iframeDoc) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 16px;
                color: #333;
              }
              pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
              code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            ${editingTemplate.value?.content || ``}
          </body>
          </html>
        `

        iframeDoc.open()
        iframeDoc.write(htmlContent)
        iframeDoc.close()
      }
    }
    catch (error) {
      previewError.value = `预览渲染失败: ${error instanceof Error ? error.message : `未知错误`}`
      if (previewContainer.value) {
        previewContainer.value.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded">${previewError.value}</div>`
      }
    }
  })
}

function closePreview() {
  isPreviewMode.value = false
  previewError.value = ``
  if (previewContainer.value) {
    previewContainer.value.innerHTML = ``
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="w-[95vw] h-[95vh] max-w-none max-h-none overflow-hidden">
      <DialogHeader>
        <DialogTitle>模板库管理</DialogTitle>
        <DialogDescription>
          管理您的模板，支持添加、编辑、删除和预览模板内容
        </DialogDescription>
      </DialogHeader>

      <div class="flex gap-4 h-[calc(95vh-120px)]">
        <!-- 左侧：模板列表 (20% 宽度) -->
        <div class="w-1/5 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              模板列表
            </h3>
            <Button size="sm" @click="startAdd">
              <Plus class="h-4 w-4" />
            </Button>
          </div>

          <div class="flex-1 overflow-y-auto border rounded-md">
            <div v-if="templates.length === 0" class="p-4 text-center text-muted-foreground text-sm">
              暂无模板
            </div>

            <div v-else class="divide-y">
              <div
                v-for="template in templates"
                :key="template.id"
                class="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                :class="{ 'bg-muted': editingTemplate?.id === template.id }"
                @click="startEdit(template)"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium truncate text-sm">
                      {{ template.name }}
                    </h4>
                    <p class="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {{ template.description || '无说明' }}
                    </p>
                    <p class="text-xs text-muted-foreground mt-2">
                      {{ new Date(template.updatedAt).toLocaleDateString() }}
                    </p>
                  </div>

                  <div class="flex flex-col gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0"
                      @click.stop="handleDelete(template.id)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：编辑和预览区域 (80% 宽度) -->
        <div class="flex-1 flex flex-col">
          <div v-if="isEditing" class="flex-1 flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">
                {{ editingTemplate?.id ? '编辑模板' : '添加模板' }}
              </h3>
              <div class="flex gap-2">
                <Button
                  v-if="!isPreviewMode"
                  variant="outline"
                  size="sm"
                  @click="showPreview"
                >
                  <Eye class="mr-2 h-4 w-4" />
                  预览
                </Button>
                <Button
                  v-if="isPreviewMode"
                  variant="outline"
                  size="sm"
                  @click="closePreview"
                >
                  <Edit class="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button variant="ghost" size="sm" @click="cancelEdit">
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- 编辑模式 -->
            <div v-if="!isPreviewMode" class="space-y-4 flex-1 flex flex-col">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <Label for="template-name">模板名称</Label>
                  <Input
                    id="template-name"
                    v-model="editingTemplate!.name"
                    placeholder="请输入模板名称"
                    :class="{ 'border-red-500': nameError }"
                  />
                  <p v-if="nameError" class="text-sm text-red-500 mt-1">
                    {{ nameError }}
                  </p>
                </div>

                <div>
                  <Label for="template-description">模板说明</Label>
                  <Input
                    id="template-description"
                    v-model="editingTemplate!.description"
                    placeholder="请输入模板说明"
                    :class="{ 'border-red-500': descriptionError }"
                  />
                  <p v-if="descriptionError" class="text-sm text-red-500 mt-1">
                    {{ descriptionError }}
                  </p>
                </div>
              </div>

              <div class="flex-1 flex flex-col">
                <Label for="template-content">模板内容</Label>
                <Textarea
                  id="template-content"
                  v-model="editingTemplate!.content"
                  placeholder="请输入模板内容（支持HTML）"
                  class="flex-1 min-h-[400px] font-mono text-sm"
                  :class="{ 'border-red-500': contentError }"
                />
                <p v-if="contentError" class="text-sm text-red-500 mt-1">
                  {{ contentError }}
                </p>
              </div>

              <div class="flex gap-2">
                <Button class="flex-1" @click="saveTemplate">
                  <Save class="mr-2 h-4 w-4" />
                  保存
                </Button>
                <Button variant="outline" class="flex-1" @click="cancelEdit">
                  取消
                </Button>
              </div>
            </div>

            <!-- 预览模式 -->
            <div v-if="isPreviewMode" class="flex-1 flex flex-col">
              <div class="mb-4">
                <h4 class="font-medium">
                  {{ editingTemplate?.name }}
                </h4>
                <p class="text-sm text-muted-foreground">
                  {{ editingTemplate?.description }}
                </p>
              </div>

              <div class="flex-1 border rounded-md overflow-hidden">
                <div v-if="previewError" class="p-4 text-red-500 bg-red-50 border-red-200">
                  {{ previewError }}
                </div>
                <div ref="previewContainer" class="preview h-full w-full" />
              </div>
            </div>
          </div>

          <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
            <div class="text-center">
              <FileText class="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>选择一个模板进行编辑，或添加新模板</p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="isOpen = false">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 删除确认对话框 -->
  <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除这个模板吗？此操作无法撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction @click="confirmDelete">
          删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
