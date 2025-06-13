<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/stores'
import { getConfigInfo, testGitHubConnection } from '@/utils/githubImageBed'
import { imageCache } from '@/utils/imageCache'
import { Database, Image, Settings, TestTube, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'

// 获取store
const store = useStore()
const {
  imageWidth,
  githubImageRepo,
  githubImageBranch,
  githubImageToken,
  githubImageBasePath,
  githubImageBaseUrl,
} = storeToRefs(store)

const { clearImageModeState } = store

// 获取GitHub图床配置信息
const isTestingConnection = ref(false)

// 计算属性：实时获取GitHub配置
const githubConfig = computed(() => {
  try {
    const storeConfig = {
      repo: githubImageRepo.value,
      branch: githubImageBranch.value,
      token: githubImageToken.value,
      basePath: githubImageBasePath.value,
      baseUrl: githubImageBaseUrl.value,
    }
    return getConfigInfo(storeConfig)
  }
  catch {
    return {
      repo: `ERROR`,
      branch: `ERROR`,
      basePath: `ERROR`,
      baseUrl: `ERROR`,
      token: `ERROR`,
    }
  }
})

// 缓存统计信息（响应式）
const cacheStats = ref(imageCache.getCacheStats())

// 更新缓存统计
function updateCacheStats() {
  cacheStats.value = imageCache.getCacheStats()
}

// 测试GitHub连接
async function handleTestConnection() {
  isTestingConnection.value = true
  try {
    // 准备store配置
    const storeConfig = {
      repo: githubImageRepo.value,
      branch: githubImageBranch.value,
      token: githubImageToken.value,
      basePath: githubImageBasePath.value,
      baseUrl: githubImageBaseUrl.value,
    }

    const result = await testGitHubConnection(storeConfig)
    if (result.success) {
      toast.success(`连接测试成功: ${result.message}`)
    }
    else {
      toast.error(`连接测试失败: ${result.message}`)
    }
  }
  catch (error) {
    toast.error(`连接测试出错: ${error instanceof Error ? error.message : `未知错误`}`)
  }
  finally {
    isTestingConnection.value = false
  }
}

// 清理过期缓存
function cleanExpiredCache() {
  const cleanedCount = imageCache.cleanExpired()
  updateCacheStats() // 更新统计
  if (cleanedCount > 0) {
    toast.success(`已清理 ${cleanedCount} 个过期缓存项`)
  }
  else {
    toast.info(`没有过期的缓存项`)
  }
}

// 清空所有缓存（使用超级清空）
function clearAllCache() {
  console.log(`=== CLEARING ALL CACHE ===`)
  console.log(`Before clear - cache stats:`, imageCache.getCacheStats())

  // 清空store状态
  clearImageModeState()

  // 使用核弹级清空
  imageCache.nuclearClear()

  // 更新UI统计
  updateCacheStats()

  console.log(`After clear - cache stats:`, imageCache.getCacheStats())
  console.log(`After update - cache stats:`, cacheStats.value)
  console.log(`=== CACHE CLEARING COMPLETED ===`)

  toast.success(`已清空所有缓存和状态`)
}

// 强制刷新缓存统计
function forceRefreshCache() {
  imageCache.forceReload()
  updateCacheStats()
  toast.info(`已强制刷新缓存统计`)
}

// 验证缓存状态
function verifyCacheState() {
  const memoryStats = imageCache.getCacheStats()
  const localStorageData = localStorage.getItem(`github_image_cache`)
  const localStorageSize = localStorageData ? Object.keys(JSON.parse(localStorageData)).length : 0

  console.log(`=== Cache State Verification ===`)
  console.log(`Memory cache size:`, memoryStats.totalItems)
  console.log(`LocalStorage cache size:`, localStorageSize)
  console.log(`LocalStorage raw data:`, `${localStorageData?.substring(0, 200)}...`)
  console.log(`All localStorage keys:`, Object.keys(localStorage))

  toast.info(`内存缓存: ${memoryStats.totalItems}, 本地存储: ${localStorageSize}`)
}

// 定时器引用
let statsUpdateTimer: number | null = null

// 组件挂载时启动定时更新
onMounted(() => {
  updateCacheStats()
  // 每5秒更新一次统计（用于实时显示缓存变化）
  statsUpdateTimer = window.setInterval(updateCacheStats, 5000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (statsUpdateTimer) {
    clearInterval(statsUpdateTimer)
    statsUpdateTimer = null
  }
})
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Image class="h-5 w-5" />
        GitHub图床配置
      </CardTitle>
      <CardDescription>
        配置GitHub图床用于存储转换后的图片，使用工具栏的"转图"按钮进行转换
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- GitHub图床设置表单 -->
      <div class="space-y-3">
        <h4 class="flex items-center gap-2 text-sm font-medium">
          <Settings class="h-4 w-4" />
          GitHub图床设置
        </h4>

        <div class="space-y-3">
          <!-- 仓库设置 -->
          <div class="space-y-1">
            <label class="text-xs font-medium">GitHub仓库</label>
            <input
              v-model="githubImageRepo"
              type="text"
              placeholder="owner/repository"
              class="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <p class="text-xs text-gray-500">
              格式：用户名/仓库名，如：zillionare/images
            </p>
          </div>

          <!-- 分支设置 -->
          <div class="space-y-1">
            <label class="text-xs font-medium">分支名</label>
            <input
              v-model="githubImageBranch"
              type="text"
              placeholder="main"
              class="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <!-- Token设置 -->
          <div class="space-y-1">
            <label class="text-xs font-medium">访问令牌 (Token)</label>
            <input
              v-model="githubImageToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              class="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <p class="text-xs text-gray-500">
              需要 Contents: Write 权限
            </p>
          </div>

          <!-- 存储路径设置 -->
          <div class="space-y-1">
            <label class="text-xs font-medium">存储路径</label>
            <input
              v-model="githubImageBasePath"
              type="text"
              placeholder="images/{year}/{month}/"
              class="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <p class="text-xs text-gray-500">
              支持变量：{year} = 年份，{month} = 月份
            </p>
          </div>

          <!-- 访问地址设置 -->
          <div class="space-y-1">
            <label class="text-xs font-medium">访问地址</label>
            <input
              v-model="githubImageBaseUrl"
              type="text"
              placeholder="https://images.jieyu.ai"
              class="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <p class="text-xs text-gray-500">
              图片的访问域名，通常是CDN地址
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <!-- GitHub图床配置信息 -->
      <div class="space-y-2">
        <h4 class="flex items-center gap-2 text-sm font-medium">
          <Settings class="h-4 w-4" />
          当前配置
        </h4>
        <div class="space-y-1 bg-muted/30 rounded-lg p-3 text-xs">
          <div><strong>仓库:</strong> {{ githubConfig.repo }}</div>
          <div><strong>分支:</strong> {{ githubConfig.branch }}</div>
          <div><strong>存储路径:</strong> {{ githubConfig.basePath }}</div>
          <div><strong>访问地址:</strong> {{ githubConfig.baseUrl }}</div>
          <div><strong>Token:</strong> {{ githubConfig.token }}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          :disabled="isTestingConnection"
          class="w-full"
          @click="handleTestConnection"
        >
          <TestTube class="mr-2 h-4 w-4" />
          {{ isTestingConnection ? '测试中...' : '测试GitHub连接' }}
        </Button>
      </div>

      <Separator />

      <!-- 图片缓存管理 -->
      <div class="space-y-2">
        <h4 class="flex items-center gap-2 text-sm font-medium">
          <Database class="h-4 w-4" />
          图片缓存管理
        </h4>

        <div class="space-y-2 bg-muted/30 rounded-lg p-3 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div><strong>缓存项数:</strong> {{ cacheStats.totalItems }}</div>
            <div><strong>有效期:</strong> 2天</div>
          </div>

          <div v-if="cacheStats.totalItems > 0" class="space-y-1">
            <div><strong>类型分布:</strong></div>
            <div class="space-y-1 ml-2">
              <div v-for="(count, type) in cacheStats.typeBreakdown" :key="type">
                {{ type }}: {{ count }}个
              </div>
            </div>

            <div v-if="cacheStats.oldestItem" class="space-y-1">
              <div><strong>最早:</strong> {{ cacheStats.oldestItem.toLocaleString() }}</div>
              <div><strong>最新:</strong> {{ cacheStats.newestItem?.toLocaleString() }}</div>
            </div>
          </div>

          <div v-else class="text-muted-foreground">
            暂无缓存项
          </div>
        </div>

        <div class="space-y-3">
          <!-- 图片宽度设置 -->
          <div class="space-y-2">
            <label class="text-sm font-medium">图片宽度 (像素)</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="imageWidth"
                type="number"
                min="400"
                max="1200"
                step="50"
                class="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
              <span class="text-xs text-gray-500">px</span>
            </div>
            <p class="text-xs text-gray-500">
              建议范围：400-1200像素，默认800像素
            </p>
          </div>

          <!-- 缓存管理按钮 -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                class="flex-1"
                @click="cleanExpiredCache"
              >
                <Database class="mr-2 h-4 w-4" />
                清理过期
              </Button>
              <Button
                variant="destructive"
                size="sm"
                class="flex-1"
                @click="clearAllCache"
              >
                <Trash2 class="mr-2 h-4 w-4" />
                清空缓存
              </Button>
            </div>
            <div class="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                class="flex-1"
                @click="forceRefreshCache"
              >
                <Database class="mr-2 h-4 w-4" />
                刷新统计
              </Button>
              <Button
                variant="secondary"
                size="sm"
                class="flex-1"
                @click="verifyCacheState"
              >
                <Database class="mr-2 h-4 w-4" />
                验证状态
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="space-y-2 text-muted-foreground text-xs">
        <p><strong>使用方法：</strong></p>
        <ol class="space-y-1 list-decimal list-inside ml-2">
          <li>确保GitHub Token配置正确并测试连接成功</li>
          <li>在编辑器中编写包含特殊语法块的Markdown内容</li>
          <li>点击工具栏中的"转图"按钮进行转换</li>
          <li>转换完成后可点击"原文"按钮切换回原始内容</li>
        </ol>

        <p class="mt-3">
          <strong>支持的语法块类型：</strong>
        </p>
        <ul class="space-y-1 list-inside list-disc ml-2">
          <li>代码块：```language 语法的代码块</li>
          <li>Mermaid图表：```mermaid 语法的图表</li>
          <li>数学公式：$$ 包围的块级数学公式</li>
          <li>提示框：> [!NOTE] 等 GitHub 风格的提示框</li>
        </ul>

        <p class="mt-3">
          <strong>注意：</strong>转图功能会生成内容副本用于预览和复制，不会修改原始编辑器内容。
          图片将上传到配置的GitHub仓库中。
        </p>

        <p class="mt-2">
          <strong>缓存机制：</strong>系统会自动缓存生成的图片2天，相同内容的语法块会直接使用缓存，
          避免重复上传，提高转换速度。
        </p>
      </div>
    </CardContent>
  </Card>
</template>
