<script setup lang="ts">
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

import { useDisplayStore } from '@/stores'
import { checkImage } from '@/utils'
import { toTypedSchema } from '@vee-validate/yup'
import { UploadCloud } from 'lucide-vue-next'
import { Field, Form } from 'vee-validate'
import * as yup from 'yup'
import { toast } from 'vue-sonner'

const emit = defineEmits([`uploadImage`])

const displayStore = useDisplayStore()

// github
const githubSchema = toTypedSchema(yup.object({
  repo: yup.string().required(`GitHub 仓库不能为空`),
  branch: yup.string().optional(),
  accessToken: yup.string().required(`GitHub Token 不能为空`),
}))

const githubConfig = ref(localStorage.getItem(`githubConfig`)
  ? JSON.parse(localStorage.getItem(`githubConfig`)!)
  : {
      repo: ``,
      branch: ``,
      accessToken: import.meta.env.VITE_GITHUB_IMAGE_TOKEN || ``
    })

function githubSubmit(formValues: any) {
  localStorage.setItem(`githubConfig`, JSON.stringify(formValues))
  githubConfig.value = formValues
  toast.success(`保存成功`)
}

// 注意：其他图床配置（阿里云、腾讯云、七牛云等）的实现已移除
// 如需要这些功能，请在模板中添加对应的配置表单

const imgHost = useStorage(`imgHost`, `default`)

const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)

function selectImg() {
  fileInput.value!.click()
}

function uploadImg() {
  const file = fileInput.value!.files![0]
  if (!file) {
    return
  }

  // validate image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg!)
    return
  }

  isUploading.value = true
  emit(`uploadImage`, file, () => {
    isUploading.value = false
    // Reset file input to allow selecting the same file again
    fileInput.value!.value = ''
  })
}

function testImgHost() {
  // 创建一个测试图片文件
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#4CAF50'
  ctx.fillRect(0, 0, 100, 100)
  ctx.fillStyle = 'white'
  ctx.font = '16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('TEST', 50, 55)

  canvas.toBlob((blob) => {
    if (blob) {
      const testFile = new File([blob], 'test.png', { type: 'image/png' })
      isUploading.value = true
      emit(`uploadImage`, testFile, (url: string) => {
        isUploading.value = false
        if (url) {
          toast.success(`图床测试成功！图片地址：${url}`)
        } else {
          toast.error(`图床测试失败`)
        }
      })
    }
  }, 'image/png')
}
</script>

<template>
  <Dialog v-model:open="displayStore.isShowUploadImgDialog">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>上传图片</DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- 上传区域 -->
        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <Button @click="selectImg" :disabled="isUploading">
              <UploadCloud class="mr-2 h-4 w-4" />
              选择图片
            </Button>
            <Button @click="testImgHost" variant="outline" :disabled="isUploading">
              测试图床
            </Button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="uploadImg"
            />
          </div>

          <div v-if="isUploading" class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p class="mt-2 text-sm text-gray-600">上传中...</p>
          </div>
        </div>

        <!-- 图床选择 -->
        <div class="space-y-4">
          <Label class="text-base font-medium">选择图床</Label>
          <Select v-model="imgHost">
            <SelectTrigger>
              <SelectValue placeholder="选择图床" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">默认</SelectItem>
              <SelectItem value="github">GitHub</SelectItem>
              <!-- 其他图床选项已移除，如需要请实现对应的配置表单 -->
            </SelectContent>
          </Select>
        </div>

        <!-- GitHub 配置 -->
        <div v-if="imgHost === 'github'" class="space-y-4">
          <Label class="text-base font-medium">GitHub 配置</Label>
          <Form :validation-schema="githubSchema" @submit="githubSubmit">
            <div class="space-y-4">
              <div>
                <Label for="github-repo">仓库 (owner/repo)</Label>
                <Field
                  id="github-repo"
                  name="repo"
                  v-model="githubConfig.repo"
                  as="Input"
                  placeholder="例如：username/image-repo"
                />
                <ErrorMessage name="repo" class="text-sm text-red-500" />
              </div>

              <div>
                <Label for="github-branch">分支 (可选)</Label>
                <Field
                  id="github-branch"
                  name="branch"
                  v-model="githubConfig.branch"
                  as="Input"
                  placeholder="默认为 main"
                />
              </div>

              <div>
                <Label for="github-token">Access Token</Label>
                <Field
                  id="github-token"
                  name="accessToken"
                  v-model="githubConfig.accessToken"
                  as="Input"
                  type="password"
                  placeholder="GitHub Personal Access Token"
                />
                <ErrorMessage name="accessToken" class="text-sm text-red-500" />
              </div>

              <Button type="submit" class="w-full">保存 GitHub 配置</Button>
            </div>
          </Form>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
