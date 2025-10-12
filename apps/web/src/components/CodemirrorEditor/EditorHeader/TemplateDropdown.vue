<script setup lang="ts">
import { Edit, Plus, Save, Trash2 } from 'lucide-vue-next'
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
import { useStore } from '@/stores'

const store = useStore()
const { templates, isTemplateEditing, currentEditingTemplateId, editor } = storeToRefs(store)
const { insertTemplate, deleteTemplate } = store

// 模板名称输入对话框状态
const isTemplateNameDialogOpen = ref(false)
const templateName = ref(``)
const templateNameError = ref(``)

// 确认对话框状态
const isContentCheckDialogOpen = ref(false)
const isDeleteConfirmDialogOpen = ref(false)
const pendingAction = ref<(() => void) | null>(null)
const deleteTemplateInfo = ref<{ id: string, name: string } | null>(null)

// 检查编辑器内容是否为空（忽略空白符）
function isEditorEmpty(): boolean {
  if (!editor.value)
    return true
  const content = editor.value.getValue().trim()
  return content === ``
}

// 检查编辑器内容并提示用户
function checkEditorContent(action: () => void): void {
  if (isEditorEmpty()) {
    action() // 编辑器为空，直接执行操作
    return
  }

  // 编辑器不为空，显示确认对话框
  pendingAction.value = action
  isContentCheckDialogOpen.value = true
}

// 确认继续操作
function confirmContentCheck() {
  isContentCheckDialogOpen.value = false
  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }
}

// 取消操作
function cancelContentCheck() {
  isContentCheckDialogOpen.value = false
  pendingAction.value = null
}

// 新建模板
function handleNewTemplate() {
  checkEditorContent(() => {
    // 设置编辑状态
    isTemplateEditing.value = true
    currentEditingTemplateId.value = null // null表示新建
    // 不主动清空编辑器，让用户自己在工作区创作
  })
}

// 编辑模板
function handleEditTemplate(templateId: string) {
  const template = templates.value.find(t => t.id === templateId)
  if (!template)
    return

  checkEditorContent(() => {
    // 设置编辑状态
    isTemplateEditing.value = true
    currentEditingTemplateId.value = templateId

    // 把模板内容复制到工作区
    if (editor.value) {
      editor.value.setValue(template.content)
    }
  })
}

// 保存模板
function handleSaveTemplate() {
  if (!editor.value)
    return

  templateName.value = ``
  templateNameError.value = ``
  isTemplateNameDialogOpen.value = true
}

// 确认保存模板
function confirmSaveTemplate() {
  if (!templateName.value.trim()) {
    templateNameError.value = `模板名称不能为空`
    return
  }

  // 检查名称是否重复（编辑时排除自己）
  const existingTemplate = templates.value.find(t =>
    t.name === templateName.value && t.id !== currentEditingTemplateId.value,
  )
  if (existingTemplate) {
    templateNameError.value = `模板名称已存在`
    return
  }

  const content = editor.value!.getValue()

  if (currentEditingTemplateId.value) {
    // 更新现有模板
    store.updateTemplate(currentEditingTemplateId.value, templateName.value, content)
  }
  else {
    // 添加新模板
    store.addTemplate(templateName.value, content)
  }

  // 退出编辑状态
  isTemplateEditing.value = false
  currentEditingTemplateId.value = null

  // 关闭对话框
  isTemplateNameDialogOpen.value = false

  // 清空编辑器
  if (editor.value) {
    editor.value.setValue(``)
  }
}

// 取消保存模板
function cancelSaveTemplate() {
  isTemplateNameDialogOpen.value = false
  templateName.value = ``
  templateNameError.value = ``
}

// 删除模板
function handleDeleteTemplate(templateId: string, event: Event) {
  event.stopPropagation() // 阻止菜单项点击事件

  const template = templates.value.find(t => t.id === templateId)
  if (!template)
    return

  // 设置删除确认对话框信息
  deleteTemplateInfo.value = { id: templateId, name: template.name }
  isDeleteConfirmDialogOpen.value = true
}

// 确认删除模板
function confirmDeleteTemplate() {
  if (!deleteTemplateInfo.value)
    return

  const templateId = deleteTemplateInfo.value.id
  deleteTemplate(templateId)

  // 如果正在编辑被删除的模板，退出编辑状态
  if (currentEditingTemplateId.value === templateId) {
    isTemplateEditing.value = false
    currentEditingTemplateId.value = null
    if (editor.value) {
      editor.value.setValue(``)
    }
  }

  // 关闭对话框并清理状态
  isDeleteConfirmDialogOpen.value = false
  deleteTemplateInfo.value = null
}

// 取消删除模板
function cancelDeleteTemplate() {
  isDeleteConfirmDialogOpen.value = false
  deleteTemplateInfo.value = null
}

// 插入模板
function handleInsertTemplate(templateId: string) {
  insertTemplate(templateId)
}
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>模板</MenubarTrigger>
    <MenubarContent class="w-64" align="start">
      <!-- 新建模板 -->
      <MenubarItem @click="handleNewTemplate">
        <Plus class="mr-2 h-4 w-4" />
        新建模板
      </MenubarItem>

      <!-- 保存模板 -->
      <MenubarItem
        :disabled="!isTemplateEditing"
        :class="{ 'opacity-50 cursor-not-allowed': !isTemplateEditing }"
        @click="handleSaveTemplate"
      >
        <Save class="mr-2 h-4 w-4" />
        保存模板
      </MenubarItem>

      <!-- 分隔线 -->
      <MenubarSeparator />

      <!-- 模板列表 -->
      <template v-if="templates.length > 0">
        <MenubarItem
          v-for="template in templates"
          :key="template.id"
          class="flex items-center justify-between group"
          @click="handleInsertTemplate(template.id)"
        >
          <div class="flex items-center flex-1">
            <FileText class="mr-2 h-4 w-4" />
            <span class="flex-1">{{ template.name }}</span>
          </div>
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="p-1 hover:bg-gray-100 rounded"
              title="编辑模板"
              @click="handleEditTemplate(template.id)"
            >
              <Edit class="h-3 w-3" />
            </button>
            <button
              class="p-1 hover:bg-red-100 rounded text-red-600"
              title="删除模板"
              @click="handleDeleteTemplate(template.id, $event)"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </MenubarItem>
      </template>

      <!-- 无模板提示 -->
      <MenubarItem v-else disabled>
        <Info class="mr-2 h-4 w-4" />
        暂无模板
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 模板名称输入对话框 -->
  <Dialog v-model:open="isTemplateNameDialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ currentEditingTemplateId ? '编辑模板' : '保存模板' }}
        </DialogTitle>
        <DialogDescription>
          请输入模板名称
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div>
          <Label for="template-name">模板名称</Label>
          <Input
            id="template-name"
            v-model="templateName"
            placeholder="请输入模板名称"
            :class="{ 'border-red-500': templateNameError }"
            @keyup.enter="confirmSaveTemplate"
          />
          <p v-if="templateNameError" class="text-sm text-red-500 mt-1">
            {{ templateNameError }}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="cancelSaveTemplate">
          取消
        </Button>
        <Button @click="confirmSaveTemplate">
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 内容检查确认对话框 -->
  <AlertDialog v-model:open="isContentCheckDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>编辑区不为空</AlertDialogTitle>
        <AlertDialogDescription>
          编辑区不为空，必须手动保存工作区内容并清空后，才能继续操作。
          <br><br>
          点击确定继续，取消则停止操作。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelContentCheck">
          取消
        </AlertDialogCancel>
        <AlertDialogAction @click="confirmContentCheck">
          确定
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 删除模板确认对话框 -->
  <AlertDialog v-model:open="isDeleteConfirmDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除模板"{{ deleteTemplateInfo?.name }}"吗？此操作无法撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelDeleteTemplate">
          取消
        </AlertDialogCancel>
        <AlertDialogAction class="bg-red-600 hover:bg-red-700" @click="confirmDeleteTemplate">
          删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
