<script setup lang="ts">
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

import { useDisplayStore } from '@/stores'
import { checkImage } from '@/utils'
import { toTypedSchema } from '@vee-validate/yup'
import { UploadCloud } from 'lucide-vue-next'
import { Field, Form } from 'vee-validate'
import * as yup from 'yup'

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

// 阿里云
const aliOSSSchema = toTypedSchema(yup.object({
  accessKeyId: yup.string().required(`AccessKey ID 不能为空`),
  accessKeySecret: yup.string().required(`AccessKey Secret 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  useSSL: yup.boolean().required(),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const aliOSSConfig = ref(localStorage.getItem(`aliOSSConfig`)
  ? JSON.parse(localStorage.getItem(`aliOSSConfig`)!)
  : {
      accessKeyId: ``,
      accessKeySecret: ``,
      bucket: ``,
      region: ``,
      useSSL: true,
      cdnHost: ``,
      path: ``,
    })

function aliOSSSubmit(formValues: any) {
  localStorage.setItem(`aliOSSConfig`, JSON.stringify(formValues))
  aliOSSConfig.value = formValues
  toast.success(`保存成功`)
}

// 腾讯云
const txCOSSchema = toTypedSchema(yup.object({
  secretId: yup.string().required(`Secret ID 不能为空`),
  secretKey: yup.string().required(`Secret Key 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const txCOSConfig = ref(localStorage.getItem(`txCOSConfig`)
  ? JSON.parse(localStorage.getItem(`txCOSConfig`)!)
  : {
      secretId: ``,
      secretKey: ``,
      bucket: ``,
      region: ``,
      cdnHost: ``,
      path: ``,
    })

function txCOSSubmit(formValues: any) {
  localStorage.setItem(`txCOSConfig`, JSON.stringify(formValues))
  txCOSConfig.value = formValues
  toast.success(`保存成功`)
}

// 七牛云
const qiniuSchema = toTypedSchema(yup.object({
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  region: yup.string().optional(),
  path: yup.string().optional(),
}))

const qiniuConfig = ref(localStorage.getItem(`qiniuConfig`)
  ? JSON.parse(localStorage.getItem(`qiniuConfig`)!)
  : {
      accessKey: ``,
      secretKey: ``,
      bucket: ``,
      domain: ``,
      region: ``,
      path: ``,
    })

function qiniuSubmit(formValues: any) {
  localStorage.setItem(`qiniuConfig`, JSON.stringify(formValues))
  qiniuConfig.value = formValues
  toast.success(`保存成功`)
}

// 又拍云
const upyunSchema = toTypedSchema(yup.object({
  bucket: yup.string().required(`Bucket 不能为空`),
  username: yup.string().required(`操作员用户名不能为空`),
  password: yup.string().required(`操作员密码不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  path: yup.string().optional(),
}))

const upyunConfig = ref(localStorage.getItem(`upyunConfig`)
  ? JSON.parse(localStorage.getItem(`upyunConfig`)!)
  : {
      bucket: ``,
      username: ``,
      password: ``,
      domain: ``,
      path: ``,
    })

function upyunSubmit(formValues: any) {
  localStorage.setItem(`upyunConfig`, JSON.stringify(formValues))
  upyunConfig.value = formValues
  toast.success(`保存成功`)
}

// Cloudinary
const cloudinarySchema = toTypedSchema(yup.object({
  cloudName: yup.string().required(`Cloud Name 不能为空`),
  apiKey: yup.string().required(`API Key 不能为空`),
  apiSecret: yup.string().required(`API Secret 不能为空`),
  folder: yup.string().optional(),
}))

const cloudinaryConfig = ref(localStorage.getItem(`cloudinaryConfig`)
  ? JSON.parse(localStorage.getItem(`cloudinaryConfig`)!)
  : {
      cloudName: ``,
      apiKey: ``,
      apiSecret: ``,
      folder: ``,
    })

function cloudinarySubmit(formValues: any) {
  localStorage.setItem(`cloudinaryConfig`, JSON.stringify(formValues))
  cloudinaryConfig.value = formValues
  toast.success(`保存成功`)
}

// Telegram
const telegramSchema = toTypedSchema(yup.object({
  botToken: yup.string().required(`Bot Token 不能为空`),
  chatId: yup.string().required(`Chat ID 不能为空`),
}))

const telegramConfig = ref(localStorage.getItem(`telegramConfig`)
  ? JSON.parse(localStorage.getItem(`telegramConfig`)!)
  : {
      botToken: ``,
      chatId: ``,
    })

function telegramSubmit(formValues: any) {
  localStorage.setItem(`telegramConfig`, JSON.stringify(formValues))
  telegramConfig.value = formValues
  toast.success(`保存成功`)
}

// 自定义
const formCustomConfig = ref(localStorage.getItem(`formCustomConfig`) || ``)

function formCustomSubmit() {
  localStorage.setItem(`formCustomConfig`, formCustomConfig.value)
  toast.success(`保存成功`)
}

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
              <SelectItem value="aliOSS">阿里云 OSS</SelectItem>
              <SelectItem value="txCOS">腾讯云 COS</SelectItem>
              <SelectItem value="qiniu">七牛云</SelectItem>
              <SelectItem value="upyun">又拍云</SelectItem>
              <SelectItem value="cloudinary">Cloudinary</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="formCustom">自定义</SelectItem>
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
