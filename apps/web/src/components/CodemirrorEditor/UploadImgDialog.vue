<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { UploadCloud } from 'lucide-vue-next'
import { Field, Form } from 'vee-validate'
import { computed, onBeforeMount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import * as yup from 'yup'
import { useDisplayStore } from '@/stores'
import { checkImage } from '@/utils'

// 接收父组件的上传状态
const props = defineProps<{
  isImgLoading?: boolean
}>()

const emit = defineEmits([`uploadImage`])

const displayStore = useDisplayStore()

// 图床选择
const imgHost = ref(`unconfigured`)

// 上传状态管理
const isUploading = ref(false)
const uploadProgress = ref(0)

// github
const githubSchema = toTypedSchema(yup.object({
  repo: yup.string().required(`GitHub 仓库不能为空`),
  branch: yup.string().optional(),
  accessToken: yup.string().required(`GitHub Token 不能为空`),
  pathInRepo: yup.string().optional(),
  urlType: yup.string().required(`请选择图片访问链接类型`),
  customDomain: yup.string().when(`urlType`, {
    is: `custom`,
    then: s => s.required(`自定义域名不能为空`),
    otherwise: s => s.optional(),
  }),
}))

const githubConfig = ref(localStorage.getItem(`githubConfig`)
  ? JSON.parse(localStorage.getItem(`githubConfig`)!)
  : { repo: ``, branch: ``, accessToken: ``, pathInRepo: ``, urlType: `jsdelivr`, customDomain: `` })

// 监听表单中的 urlType 变化
const formUrlType = ref(githubConfig.value.urlType)

function githubSubmit(formValues: any) {
  localStorage.setItem(`githubConfig`, JSON.stringify(formValues))
  githubConfig.value = formValues
  formUrlType.value = formValues.urlType
  // 保存后立即切换到 GitHub 图床
  imgHost.value = `github`
  localStorage.setItem(`imgHost`, `github`)
  toast.success(`保存成功，已切换到 GitHub 图床`)
}

// 计算示例 URL
const githubExampleUrl = computed(() => {
  const { repo, branch, pathInRepo, urlType, customDomain } = githubConfig.value
  const branchName = branch || `main`
  const pathInRepoStr = pathInRepo || `images/{year}/{month}`
  const imageFileName = `example.jpg`

  if (urlType === `default`) {
    return `https://raw.githubusercontent.com/${repo}/${branchName}/${pathInRepoStr}/${imageFileName}`
  }
  else if (urlType === `jsdelivr`) {
    return `https://fastly.jsdelivr.net/gh/${repo}@${branchName}/${pathInRepoStr}/${imageFileName}`
  }
  else if (urlType === `custom` && customDomain) {
    // 处理自定义域名，支持带前缀的情况
    let domain = customDomain.trim()
    if (!domain.startsWith(`http://`) && !domain.startsWith(`https://`)) {
      domain = `https://${domain}`
    }
    // 如果域名以 / 结尾，去掉末尾的 /
    if (domain.endsWith(`/`)) {
      domain = domain.slice(0, -1)
    }
    return `${domain}/${pathInRepoStr}/${imageFileName}`
  }
  return ``
})

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
  // 保存后立即切换到阿里云 OSS 图床
  imgHost.value = `aliOSS`
  localStorage.setItem(`imgHost`, `aliOSS`)
  toast.success(`保存成功，已切换到阿里云 OSS 图床`)
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
  // 保存后立即切换到腾讯云 COS 图床
  imgHost.value = `txCOS`
  localStorage.setItem(`imgHost`, `txCOS`)
  toast.success(`保存成功，已切换到腾讯云 COS 图床`)
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
  // 保存后立即切换到七牛云图床
  imgHost.value = `qiniu`
  localStorage.setItem(`imgHost`, `qiniu`)
  toast.success(`保存成功，已切换到七牛云图床`)
}

// MinIO
const minioOSSSchema = toTypedSchema(yup.object({
  endpoint: yup.string().required(`Endpoint 不能为空`),
  port: yup.string().optional(),
  useSSL: yup.boolean().required(),
  bucket: yup.string().required(`Bucket 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
}))

const minioOSSConfig = ref(localStorage.getItem(`minioConfig`)
  ? JSON.parse(localStorage.getItem(`minioConfig`)!)
  : {
      endpoint: ``,
      port: ``,
      useSSL: true,
      bucket: ``,
      accessKey: ``,
      secretKey: ``,
    })

function minioOSSSubmit(formValues: any) {
  localStorage.setItem(`minioConfig`, JSON.stringify(formValues))
  minioOSSConfig.value = formValues
  // 保存后立即切换到 MinIO 图床
  imgHost.value = `minio`
  localStorage.setItem(`imgHost`, `minio`)
  toast.success(`保存成功，已切换到 MinIO 图床`)
}

// Telegram 图床
const telegramSchema = toTypedSchema(
  yup.object({
    token: yup.string().required(`Bot Token 不能为空`),
    chatId: yup.string().required(`Chat ID 不能为空`),
  }),
)
const telegramConfig = ref(
  localStorage.getItem(`telegramConfig`)
    ? JSON.parse(localStorage.getItem(`telegramConfig`)!)
    : { token: ``, chatId: `` },
)
function telegramSubmit(values: any) {
  localStorage.setItem(`telegramConfig`, JSON.stringify(values))
  telegramConfig.value = values
  toast.success(`保存成功`)
}

// 公众号
// 当前是否为网页（http/https 协议）
const isWebsite = window.location.protocol.startsWith(`http`)

// Cloudflare Pages 环境
const isCfPage = import.meta.env.CF_PAGES === `1`

// 插件模式运行（如 chrome-extension://）
const isPluginMode = !isWebsite

// 是否需要填写 proxyOrigin（只在 非插件 且 非CF页面 时需要）
const isProxyRequired = computed(() => {
  return !isPluginMode && !isCfPage
})

const mpPlaceholder = computed(() => {
  if (isProxyRequired.value) {
    return `如：http://proxy.example.com`
  }
  return `可不填`
})
const mpSchema = computed(() =>
  toTypedSchema(yup.object({
    proxyOrigin: isProxyRequired.value
      ? yup.string().required(`代理域名不能为空`)
      : yup.string().optional(),
    appID: yup.string().required(`AppID 不能为空`),
    appsecret: yup.string().required(`AppSecret 不能为空`),
  })),
)

const mpConfig = ref(localStorage.getItem(`mpConfig`)
  ? JSON.parse(localStorage.getItem(`mpConfig`)!)
  : {
      proxyOrigin: ``,
      appID: ``,
      appsecret: ``,
    })

function mpSubmit(formValues: any) {
  localStorage.setItem(`mpConfig`, JSON.stringify(formValues))
  mpConfig.value = formValues
  // 保存后立即切换到微信公众号图床
  imgHost.value = `mp`
  localStorage.setItem(`imgHost`, `mp`)
  toast.success(`保存成功，已切换到微信公众号图床`)
}

// Cloudflare R2
const r2Schema = toTypedSchema(yup.object({
  accountId: yup.string().required(`Account ID 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  path: yup.string().optional(),
}))

const r2Config = ref(localStorage.getItem(`r2Config`)
  ? JSON.parse(localStorage.getItem(`r2Config`)!)
  : {
      accountId: ``,
      accessKey: ``,
      secretKey: ``,
      bucket: ``,
      domain: ``,
      path: ``,
    })

function r2Submit(formValues: any) {
  localStorage.setItem(`r2Config`, JSON.stringify(formValues))
  r2Config.value = formValues
  // 保存后立即切换到 Cloudflare R2 图床
  imgHost.value = `r2`
  localStorage.setItem(`imgHost`, `r2`)
  toast.success(`保存成功，已切换到 Cloudflare R2 图床`)
}

// 又拍云
const upyunSchema = computed(() => toTypedSchema(
  yup.object({
    bucket: yup.string().required(`Bucket 不能为空`),
    operator: yup.string().required(`操作员 不能为空`),
    password: yup.string().required(`密码 不能为空`),
    domain: yup.string().required(`CDN 域名不能为空`),
    path: yup.string().optional(),
  }),
))

const upyunConfig = ref(localStorage.getItem(`upyunConfig`)
  ? JSON.parse(localStorage.getItem(`upyunConfig`)!)
  : {
      bucket: ``,
      operator: ``,
      password: ``,
      domain: ``,
      path: ``,
    })

function upyunSubmit(formValues: any) {
  localStorage.setItem(`upyunConfig`, JSON.stringify(formValues))
  upyunConfig.value = formValues
  // 保存后立即切换到又拍云图床
  imgHost.value = `upyun`
  localStorage.setItem(`imgHost`, `upyun`)
  toast.success(`保存成功，已切换到又拍云图床`)
}

// Cloudinary
const cloudinarySchema = toTypedSchema(
  yup.object({
    cloudName: yup.string().required(`Cloud Name 不能为空`),
    apiKey: yup.string().required(`API Key 不能为空`),
    apiSecret: yup.string().optional(),
    uploadPreset: yup.string().when(`apiSecret`, {
      is: (v: string | undefined) => !v || v.length === 0,
      then: s => s.required(`未填写 apiSecret 时必须提供上传预设名`),
      otherwise: s => s.optional(),
    }),
    folder: yup.string().optional(),
    domain: yup.string().optional(),
  }),
)

const cloudinaryConfig = ref(
  localStorage.getItem(`cloudinaryConfig`)
    ? JSON.parse(localStorage.getItem(`cloudinaryConfig`)!)
    : {
        cloudName: ``,
        apiKey: ``,
        apiSecret: ``,
        uploadPreset: ``,
        folder: ``,
        domain: ``,
      },
)

function cloudinarySubmit(formValues: any) {
  localStorage.setItem(`cloudinaryConfig`, JSON.stringify(formValues))
  cloudinaryConfig.value = formValues
  // 保存后立即切换到 Cloudinary 图床
  imgHost.value = `cloudinary`
  localStorage.setItem(`imgHost`, `cloudinary`)
  toast.success(`保存成功，已切换到 Cloudinary 图床`)
}

const options = [
  {
    value: `unconfigured`,
    label: `未配置`,
  },
  {
    value: `github`,
    label: `GitHub`,
  },
  {
    value: `aliOSS`,
    label: `阿里云`,
  },
  {
    value: `txCOS`,
    label: `腾讯云`,
  },
  {
    value: `qiniu`,
    label: `七牛云`,
  },
  {
    value: `minio`,
    label: `MinIO`,
  },
  {
    value: `mp`,
    label: `公众号图床`,
  },
  {
    value: `r2`,
    label: `Cloudflare R2`,
  },
  {
    value: `upyun`,
    label: `又拍云`,
  },
  { value: `telegram`, label: `Telegram` },
  {
    value: `cloudinary`,
    label: `Cloudinary`,
  },

  {
    value: `formCustom`,
    label: `自定义代码`,
  },
]

const activeName = ref(`upload`)

onBeforeMount(() => {
  if (localStorage.getItem(`imgHost`)) {
    imgHost.value = localStorage.getItem(`imgHost`)!
  }
  else {
    imgHost.value = `unconfigured`
  }
})

function changeImgHost() {
  localStorage.setItem(`imgHost`, imgHost.value)
  toast.success(`图床已切换`)
}

function beforeImageUpload(file: File) {
  // check image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }
  // check image host
  const imgHost = localStorage.getItem(`imgHost`)
  if (!imgHost || imgHost === `unconfigured`) {
    toast.error(`请先配置图床`)
    return false
  }
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = config
  if (!isValidHost) {
    toast.error(`请先配置 ${imgHost} 图床参数`)
    return false
  }
  return true
}

// 开始上传
function startUpload(file: File) {
  if (!beforeImageUpload(file)) {
    return
  }

  isUploading.value = true
  uploadProgress.value = 0
  toast.info(`正在上传图片，请勿关闭窗口...`)

  // 模拟上传进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += Math.random() * 20
    }
  }, 200)

  // 触发上传事件
  emit(`uploadImage`, file)

  // 监听父组件的上传状态变化
  const unwatch = watch(() => props.isImgLoading, (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      // 上传完成（成功或失败）
      clearInterval(progressInterval)
      uploadProgress.value = 100
      setTimeout(() => {
        isUploading.value = false
        toast.success(`图片上传完成！可以关闭窗口了`)
      }, 500)
      unwatch() // 停止监听
    }
  }, { immediate: true })

  // 如果父组件已经在加载中，立即开始监听
  if (props.isImgLoading) {
    // 父组件已经在处理上传，等待完成
  }
}

const dragover = ref(false)

const { open, reset, onChange } = useFileDialog({
  accept: `image/*`,
})

onChange((files) => {
  if (files == null) {
    return
  }

  const file = files[0]
  startUpload(file)
  reset()
})

function onDrop(e: DragEvent) {
  dragover.value = false
  e.stopPropagation()
  const file = Array.from(e.dataTransfer!.files)[0]
  startUpload(file)
}
</script>

<template>
  <Dialog v-model:open="displayStore.isShowUploadImgDialog">
    <DialogContent class="max-w-max" @pointer-down-outside="ev => ev.preventDefault()">
      <DialogHeader>
        <DialogTitle>本地上传</DialogTitle>
      </DialogHeader>
      <Tabs v-model="activeName" class="w-max">
        <TabsList>
          <TabsTrigger value="upload">
            选择上传
          </TabsTrigger>
          <TabsTrigger v-for="item in options.filter(item => item.value !== 'unconfigured')" :key="item.value" :value="item.value">
            {{ item.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Label>
            <span class="my-4 block">
              图床
            </span>
            <Select v-model="imgHost" @update:model-value="changeImgHost">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in options"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <div
            class="bg-clip-padding mt-4 h-50 flex flex-col cursor-pointer items-center justify-evenly border-2 rounded border-dashed transition-colors hover:border-gray-700 hover:bg-gray-400/50 dark:hover:border-gray-200 dark:hover:bg-gray-500/50"
            :class="{
              'border-gray-700 bg-gray-400/50 dark:border-gray-200 dark:bg-gray-500/50': dragover,
              'cursor-not-allowed opacity-50': isUploading,
            }"
            @click="!isUploading && open()"
            @drop.prevent="!isUploading && onDrop"
            @dragover.prevent="!isUploading && (dragover = true)"
            @dragleave.prevent="!isUploading && (dragover = false)"
          >
            <!-- 上传中状态 -->
            <div v-if="isUploading" class="flex flex-col items-center space-y-4">
              <div class="relative">
                <div class="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  正在上传图片...
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  请勿关闭窗口
                </p>
                <div class="w-48 bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${uploadProgress}%` }"
                  />
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ Math.round(uploadProgress) }}%
                </p>
              </div>
            </div>

            <!-- 正常状态 -->
            <div v-else class="flex flex-col items-center">
              <UploadCloud class="size-20" />
              <p>
                将图片拖到此处，或
                <strong>点击上传</strong>
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="github">
          <Form :validation-schema="githubSchema" :initial-values="githubConfig" @submit="githubSubmit">
            <Field v-slot="{ field, errorMessage }" name="repo">
              <FormItem label="GitHub 仓库" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：owner/repo"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="branch">
              <FormItem label="分支" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="默认 main"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessToken">
              <FormItem label="Token" required :error="errorMessage">
                <div class="flex items-center w-full">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：cc1d0c1426d0fd0902bd2d7184b14da61b8abc46"
                    class="flex-1"
                  />
                  <Button
                    variant="link"
                    class="p-0 ml-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    as="a"
                    href="https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
                    target="_blank"
                  >
                    如何获取 GitHub Token？
                  </Button>
                </div>
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="pathInRepo">
              <FormItem label="仓库内路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="默认值: images/{year}/{month}"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field }" name="urlType">
              <FormItem label="图片访问链接">
                <div class="space-y-3">
                  <div class="flex items-center space-x-2">
                    <input
                      id="url-default"
                      v-bind="field"
                      v-model="field.value"
                      type="radio"
                      value="default"
                      class="h-4 w-4 text-blue-600"
                      @change="formUrlType = field.value"
                    >
                    <label for="url-default" class="text-sm font-medium">
                      使用 GitHub 默认值，较慢
                    </label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      id="url-jsdelivr"
                      v-bind="field"
                      v-model="field.value"
                      type="radio"
                      value="jsdelivr"
                      class="h-4 w-4 text-blue-600"
                      @change="formUrlType = field.value"
                    >
                    <label for="url-jsdelivr" class="text-sm font-medium">
                      使用 jsdelivr CDN
                    </label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      id="url-custom"
                      v-bind="field"
                      v-model="field.value"
                      type="radio"
                      value="custom"
                      class="h-4 w-4 text-blue-600"
                      @change="formUrlType = field.value"
                    >
                    <label for="url-custom" class="text-sm font-medium">
                      自定义域名
                    </label>
                  </div>
                </div>
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="customDomain">
              <FormItem
                v-show="formUrlType === 'custom'"
                label="自定义域名"
                :error="errorMessage"
              >
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://cdn.example.com 或 cdn.example.com"
                />
              </FormItem>
            </Field>

            <FormItem v-if="githubExampleUrl" label="示例地址">
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <code class="text-sm text-gray-700 dark:text-gray-300 break-all">
                  {{ githubExampleUrl }}
                </code>
              </div>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="aliOSS">
          <Form :validation-schema="aliOSSSchema" :initial-values="aliOSSConfig" @submit="aliOSSSubmit">
            <Field v-slot="{ field, errorMessage }" name="accessKeyId">
              <FormItem label="AccessKey ID" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：LTAI4GdoocsmdoxUf13ylbaNHk"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKeySecret">
              <FormItem label="AccessKey Secret" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：cc1d0c142doocs0902bd2d7md4b14da6ylbabc46"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="Bucket 所在区域" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：oss-cn-shenzhen"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
              <FormItem label="UseSSL" required :error="errorMessage">
                <Switch
                  :checked="field.value"
                  :name="field.name"
                  @update:checked="field.onChange"
                  @blur="field.onBlur"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="cdnHost">
              <FormItem label="自定义 CDN 域名" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://imagecdn.alidaodao.com，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认为根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://help.aliyun.com/document_detail/31883.html"
                target="_blank"
              >
                如何使用阿里云 OSS？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="txCOS">
          <Form :validation-schema="txCOSSchema" :initial-values="txCOSConfig" @submit="txCOSSubmit">
            <Field v-slot="{ field, errorMessage }" name="secretId">
              <FormItem label="SecretId" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：AKIDnQp1w3DOOCSs8F5MDp9tdoocsmdUPonW3"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：ukLmdtEJ9271f3DOocsMDsCXdS3YlbW0"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs-3212520134"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="Bucket 所在区域" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：ap-guangzhou"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="cdnHost">
              <FormItem label="自定义 CDN 域名" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://imagecdn.alidaodao.com，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://cloud.tencent.com/document/product/436/38484"
                target="_blank"
              >
                如何使用腾讯云 COS？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="qiniu">
          <Form :validation-schema="qiniuSchema" :initial-values="qiniuConfig" @submit="qiniuSubmit">
            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：6DD3VaLJ_SQgOdoocsyTV_YWaDmdnL2n8EGx7kG"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：qgZa5qrvDOOcsmdKStD1oCjZ9nB7MDvJUs_34SIm"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：md"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="Bucket 对应域名" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://images.123ylb.cn"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="存储区域" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：z2，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认为根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://developer.qiniu.com/kodo"
                target="_blank"
              >
                如何使用七牛云 Kodo？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="minio">
          <Form :validation-schema="minioOSSSchema" :initial-values="minioOSSConfig" @submit="minioOSSSubmit">
            <Field v-slot="{ field, errorMessage }" name="endpoint">
              <FormItem label="Endpoint" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：play.min.io"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="port">
              <FormItem label="Port" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="number"
                  placeholder="如：9000，可不填，http 默认为 80，https 默认为 443"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
              <FormItem label="UseSSL" required :error="errorMessage">
                <Switch
                  :checked="field.value"
                  :name="field.name"
                  @update:checked="field.onChange"
                  @blur="field.onBlur"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：zhangsan" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：asdasdasd" />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="http://docs.minio.org.cn/docs/master/minio-client-complete-guide"
                target="_blank"
              >
                如何使用 MinIO？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="mp">
          <Form :validation-schema="mpSchema" :initial-values="mpConfig" @submit="mpSubmit">
            <!-- 只有在需要代理时才显示 proxyOrigin 字段 -->
            <Field
              v-if="isProxyRequired"
              v-slot="{ field, errorMessage }"
              name="proxyOrigin"
            >
              <FormItem label="代理域名" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  :placeholder="mpPlaceholder"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="appID">
              <FormItem label="appID" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：wx6e1234567890efa3"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="appsecret">
              <FormItem label="appsecret" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：d9f1abcdef01234567890abcdef82397"
                />
              </FormItem>
            </Field>

            <FormItem>
              <div class="flex flex-col items-start">
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Getting_Started_Guide.html"
                  target="_blank"
                >
                  如何开启公众号开发者模式并获取应用账号密钥？
                </Button>
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://md-pages.doocs.org/tutorial/"
                  target="_blank"
                >
                  如何在浏览器插件中使用公众号图床？
                </Button>
              </div>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="r2">
          <Form :validation-schema="r2Schema" :initial-values="r2Config" @submit="r2Submit">
            <Field v-slot="{ field, errorMessage }" name="accountId">
              <FormItem label="AccountId" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: 0030f123e55a57546f4c281c564e560" class="min-w-[350px]" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: 358090b3a12824a6b0787gae7ad0fc72" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：md" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="域名" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：https://oss.example.com" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
              </FormItem>
            </Field>

            <FormItem>
              <div class="flex flex-col items-start">
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.cloudflare.com/r2/api/s3/api/"
                  target="_blank"
                >
                  如何使用 S3 API 操作 Cloudflare R2？
                </Button>
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.cloudflare.com/r2/buckets/cors/"
                  target="_blank"
                >
                  如何设置跨域(CORS)？
                </Button>
              </div>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="upyun">
          <Form :validation-schema="upyunSchema" :initial-values="upyunConfig" @submit="upyunSubmit">
            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: md" class="min-w-[350px]" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="operator">
              <FormItem label="操作员" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: operator" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="password">
              <FormItem label="操作员密码" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="域名" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：http://xxx.test.upcdn.net" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://help.upyun.com/"
                target="_blank"
              >
                如何使用 又拍云？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="telegram">
          <Form :validation-schema="telegramSchema" :initial-values="telegramConfig" @submit="telegramSubmit">
            <Field v-slot="{ field, errorMessage }" name="token">
              <FormItem label="Bot Token" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：123456789:ABCdefGHIjkl-MNOPqrSTUvwxYZ" />
              </FormItem>
            </Field>
            <Field v-slot="{ field, errorMessage }" name="chatId">
              <FormItem label="Chat ID" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：-1001234567890" />
              </FormItem>
            </Field>
            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://github.com/doocs/md/blob/main/docs/telegram-usage.md"
                target="_blank"
              >
                如何使用 Telegram？
              </Button>
            </FormItem>
            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="cloudinary">
          <Form
            :validation-schema="cloudinarySchema"
            :initial-values="cloudinaryConfig"
            @submit="cloudinarySubmit"
          >
            <Field v-slot="{ field, errorMessage }" name="cloudName">
              <FormItem label="Cloud Name" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：demo" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="apiKey">
              <FormItem label="API Key" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：1234567890" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="apiSecret">
              <FormItem label="API Secret" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="用于签名上传，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="uploadPreset">
              <FormItem label="Upload Preset" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="unsigned 时必填，signed 时可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="folder">
              <FormItem label="Folder" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：blog/image，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="自定义域名 / CDN" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://cdn.example.com，可不填"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://cloudinary.com/documentation/upload_images"
                target="_blank"
              >
                Cloudinary 使用文档
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="formCustom">
          <CustomUploadForm />
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
