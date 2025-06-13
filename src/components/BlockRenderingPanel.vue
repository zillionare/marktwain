<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getConfigInfo, testGitHubConnection } from '@/utils/githubImageBed'
import { Image, Settings, TestTube } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

// 获取GitHub图床配置信息
const githubConfig = getConfigInfo()
const isTestingConnection = ref(false)

// 测试GitHub连接
async function handleTestConnection() {
  isTestingConnection.value = true
  try {
    const result = await testGitHubConnection()
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
      <!-- GitHub图床配置信息 -->
      <div class="space-y-2">
        <h4 class="flex items-center gap-2 text-sm font-medium">
          <Settings class="h-4 w-4" />
          GitHub图床配置
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
      </div>
    </CardContent>
  </Card>
</template>
