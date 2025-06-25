<script setup lang="ts">
import {
  codeBlockThemeOptions,
  colorOptions,
  fontFamilyOptions,
  fontSizeOptions,
  legendOptions,
  themeOptions,
  widthOptions,
} from '@/config'

import { useDisplayStore, useStore } from '@/stores'
import fileApi from '@/utils/file'
import { useStorage } from '@vueuse/core'
import { Moon, Sun, TestTube } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, useTemplateRef, watch } from 'vue'
import PickColors, { type Format } from 'vue-pick-colors'
import { toast } from 'vue-sonner'

const store = useStore()
const displayStore = useDisplayStore()

const { isDark, primaryColor } = storeToRefs(store)

function customStyle() {
  displayStore.toggleShowCssEditor()
  setTimeout(() => {
    store.cssEditor!.refresh()
  }, 50)
}

const isOpen = ref(false)

const addPostInputVal = ref(``)

watch(isOpen, () => {
  if (isOpen.value) {
    addPostInputVal.value = ``
  }
})

const pickColorsContainer = useTemplateRef<HTMLElement | undefined>(`pickColorsContainer`)
const format = ref<Format>(`rgb`)
const formatOptions = ref<Format[]>([`rgb`, `hex`, `hsl`, `hsv`])

// 图床配置
const githubImageBedConfig = useStorage(`githubConfig`, {
  repo: ``,
  accessToken: import.meta.env.VITE_GITHUB_IMAGE_TOKEN || ``,
  branch: `main`,
  path: `images/{year}/{month}`,
})

// 计算当前图床状态
const currentImageBedStatus = computed(() => {
  const config = githubImageBedConfig.value
  if (config.repo && config.accessToken) {
    return {
      type: `user`,
      message: `使用您的 GitHub 图床: ${config.repo}`,
      color: `text-green-600 dark:text-green-400`,
    }
  }
  else {
    return {
      type: `default`,
      message: `使用默认 bucketio 图床（公共服务）`,
      color: `text-orange-600 dark:text-orange-400`,
    }
  }
})

// 监听 GitHub 配置变化，自动设置图床类型
watch(githubImageBedConfig, (newConfig) => {
  // 如果配置了仓库和访问令牌，自动设置图床为 GitHub
  if (newConfig.repo && newConfig.accessToken) {
    localStorage.setItem(`imgHost`, `github`)
    console.log(`✅ 已自动设置图床类型为 GitHub`)
  }
}, { deep: true })

const isTestingImageBed = ref(false)

// 测试图床
async function testImageBed() {
  const config = githubImageBedConfig.value
  const hasUserConfig = config.repo && config.accessToken

  if (!hasUserConfig) {
    toast.info(`将测试默认 bucketio 图床（公共服务）`)
  }
  else {
    toast.info(`将测试您的 GitHub 图床: ${config.repo}`)
  }

  isTestingImageBed.value = true
  try {
    // 创建一个测试图片
    const canvas = document.createElement(`canvas`)
    canvas.width = 300
    canvas.height = 120
    const ctx = canvas.getContext(`2d`)!

    // 绘制测试图片
    ctx.fillStyle = hasUserConfig ? `#4CAF50` : `#FF9800`
    ctx.fillRect(0, 0, 300, 120)
    ctx.fillStyle = `white`
    ctx.font = `14px Arial`
    ctx.textAlign = `center`

    if (hasUserConfig) {
      ctx.fillText(`用户 GitHub 图床测试`, 150, 35)
      ctx.fillText(`仓库: ${config.repo}`, 150, 55)
    }
    else {
      ctx.fillText(`默认 bucketio 图床测试`, 150, 35)
      ctx.fillText(`公共服务`, 150, 55)
    }

    ctx.fillText(new Date().toLocaleTimeString(), 150, 85)

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(blob => resolve(blob!), `image/png`)
    })

    // 上传测试图片
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(`,`)[1])
      reader.readAsDataURL(blob)
    })

    // 使用现有的文件上传 API
    const testFile = new File([blob], `test.png`, { type: `image/png` })

    try {
      const imageUrl = await fileApi.fileUpload(base64, testFile)
      const bedType = hasUserConfig ? `用户图床` : `默认图床`
      toast.success(`${bedType}测试成功！图片已上传到：${imageUrl}`)
      console.log(`🎉 ${bedType}测试成功，图片 URL:`, imageUrl)
    }
    catch (error) {
      console.error(`图床测试失败:`, error)
      throw error
    }
  }
  catch (error) {
    console.error(`图床测试失败:`, error)
    toast.error(`图床测试失败：${error instanceof Error ? error.message : `未知错误`}`)
  }
  finally {
    isTestingImageBed.value = false
  }
}
</script>

<template>
  <div
    class="relative overflow-hidden border-l-2 border-gray/20 bg-white transition-width duration-300 dark:bg-[#191919]"
    :class="[store.isOpenRightSlider ? 'w-100' : 'w-0 border-l-0']"
  >
    <div
      class="space-y-4 h-full overflow-auto p-4 transition-transform" :class="{
        'translate-x-0': store.isOpenRightSlider,
        'translate-x-full': !store.isOpenRightSlider,
      }"
    >
      <div class="space-y-2">
        <h2>主题</h2>
        <div class="grid grid-cols-3 justify-items-center gap-2">
          <Button
            v-for="{ label, value } in themeOptions" :key="value" class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.theme === value,
            }" @click="store.themeChanged(value)"
          >
            {{ label }}
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>字体</h2>
        <div class="grid grid-cols-3 justify-items-center gap-2">
          <Button
            v-for="{ label, value } in fontFamilyOptions" :key="value" variant="outline" class="w-full"
            :class="{ 'border-black dark:border-white border-2': store.fontFamily === value }" @click="store.fontChanged(value)"
          >
            {{ label }}
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>字号</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            v-for="{ value, desc } in fontSizeOptions" :key="value" variant="outline" class="w-full" :class="{
              'border-black dark:border-white border-2': store.fontSize === value,
            }" @click="store.sizeChanged(value)"
          >
            {{ desc }}
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>主题色</h2>
        <div class="grid grid-cols-3 justify-items-center gap-2">
          <Button
            v-for="{ label, value } in colorOptions" :key="value" class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.primaryColor === value,
            }" @click="store.colorChanged(value)"
          >
            <span
              class="mr-2 inline-block h-4 w-4 rounded-full" :style="{
                background: value,
              }"
            />
            {{ label }}
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>自定义主题色</h2>
        <div ref="pickColorsContainer">
          <PickColors
            v-if="pickColorsContainer" v-model:value="primaryColor" show-alpha :format="format"
            :format-options="formatOptions" :theme="store.isDark ? 'dark' : 'light'"
            :popup-container="pickColorsContainer" @change="store.colorChanged"
          />
        </div>
      </div>
      <div class="space-y-2">
        <h2>代码块主题</h2>
        <div>
          <Select v-model="store.codeBlockTheme" @update:model-value="store.codeBlockThemeChanged">
            <SelectTrigger>
              <SelectValue placeholder="Select a code block theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="{ label, value } in codeBlockThemeOptions" :key="label" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="space-y-2">
        <h2>图注格式</h2>
        <div class="grid grid-cols-3 justify-items-center gap-2">
          <Button
            v-for="{ label, value } in legendOptions" :key="value" class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.legend === value,
            }" @click="store.legendChanged(value)"
          >
            {{ label }}
          </Button>
        </div>
      </div>

      <div class="space-y-2">
        <h2>Mac 代码块</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.isMacCodeBlock,
            }" @click="!store.isMacCodeBlock && store.macCodeBlockChanged()"
          >
            开启
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !store.isMacCodeBlock,
            }" @click="store.isMacCodeBlock && store.macCodeBlockChanged()"
          >
            关闭
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>AI 工具箱</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.showAIToolbox,
            }" @click="!store.showAIToolbox && store.aiToolboxChanged()"
          >
            开启
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !store.showAIToolbox,
            }" @click="store.showAIToolbox && store.aiToolboxChanged()"
          >
            关闭
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>微信外链转底部引用</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.isCiteStatus,
            }" @click="!store.isCiteStatus && store.citeStatusChanged()"
          >
            开启
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !store.isCiteStatus,
            }" @click="store.isCiteStatus && store.citeStatusChanged()"
          >
            关闭
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>段落首行缩进</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.isUseIndent,
            }" @click="!store.isUseIndent && store.useIndentChanged()"
          >
            开启
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !store.isUseIndent,
            }" @click="store.isUseIndent && store.useIndentChanged()"
          >
            关闭
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>自定义 CSS 面板</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': displayStore.isShowCssEditor,
            }" @click="!displayStore.isShowCssEditor && customStyle()"
          >
            开启
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !displayStore.isShowCssEditor,
            }" @click="displayStore.isShowCssEditor && customStyle()"
          >
            关闭
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>编辑区位置</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.isEditOnLeft,
            }" @click="!store.isEditOnLeft && store.toggleEditOnLeft()"
          >
            左侧
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !store.isEditOnLeft,
            }" @click="store.isEditOnLeft && store.toggleEditOnLeft()"
          >
            右侧
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>预览模式</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            v-for="{ label, value } in widthOptions" :key="value" class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': store.previewWidth === value,
            }" @click="store.previewWidthChanged(value)"
          >
            {{ label }}
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>模式</h2>
        <div class="grid grid-cols-5 justify-items-center gap-2">
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': !isDark,
            }" @click="store.toggleDark(false)"
          >
            <Sun class="h-4 w-4" />
          </Button>
          <Button
            class="w-full" variant="outline" :class="{
              'border-black dark:border-white border-2': isDark,
            }" @click="store.toggleDark(true)"
          >
            <Moon class="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div class="space-y-2">
        <h2>转图设置</h2>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">图片最大宽度</label>
            <Input
              v-model.number="store.convertImageMaxWidth"
              type="number"
              min="200"
              max="2000"
              step="50"
              placeholder="800"
              class="mt-1"
            />
            <p class="mt-1 text-xs text-gray-500">
              转图时生成图片的最大宽度，单位：像素（默认 800px）
            </p>
          </div>
          <div class="space-x-2 flex items-center">
            <input
              id="convertImageHighRes"
              v-model="store.convertImageHighRes"
              type="checkbox"
              class="text-primary focus:ring-primary border-gray-300 rounded"
            >
            <label for="convertImageHighRes" class="text-sm font-medium">
              生成高分辨率图片
            </label>
          </div>
          <p class="text-xs text-gray-500">
            开启后图片像素密度为2倍，适合高清显示设备。
            <span class="text-orange-600 dark:text-orange-400">
              关闭后图片尺寸与设置值完全一致。
            </span>
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <h2>GitHub 图床配置</h2>

        <!-- 当前图床状态显示 -->
        <div class="border rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div class="space-x-2 flex items-center">
            <div class="h-2 w-2 rounded-full" :class="currentImageBedStatus.type === 'user' ? 'bg-green-500' : 'bg-orange-500'" />
            <span class="text-sm font-medium" :class="currentImageBedStatus.color">
              {{ currentImageBedStatus.message }}
            </span>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            {{ currentImageBedStatus.type === 'user'
              ? '图片将上传到您的仓库，通过 jsDelivr CDN 加速访问'
              : '图片将上传到公共图床，建议配置自己的仓库以确保数据安全'
            }}
          </p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">Repository</label>
            <Input
              v-model="githubImageBedConfig.repo"
              placeholder="owner/repo 格式，如：zillionare/marktwain"
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium">Access Token</label>
            <Input
              v-model="githubImageBedConfig.accessToken"
              type="password"
              placeholder="GitHub Personal Access Token"
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium">Branch</label>
            <Input
              v-model="githubImageBedConfig.branch"
              placeholder="分支名，默认为 main"
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium">存储路径</label>
            <Input
              v-model="githubImageBedConfig.path"
              placeholder="支持模板变量：images/{year}/{month}"
              class="mt-1"
            />
            <p class="mt-1 text-xs text-gray-500">
              支持模板变量：{year} - 年份，{month} - 月份
            </p>
          </div>
          <Button
            :disabled="isTestingImageBed"
            class="w-full"
            variant="outline"
            @click="testImageBed"
          >
            <TestTube class="mr-1 size-4" />
            {{ isTestingImageBed ? '测试中...' : '测试图床' }}
          </Button>
        </div>
      </div>

      <div class="space-y-2">
        <h2>样式配置</h2>
        <Button variant="destructive" @click="store.resetStyleConfirm">
          重置
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
