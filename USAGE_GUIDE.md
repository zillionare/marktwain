# 特殊语法块渲染功能使用指南

## 📖 功能概述

import { Separator } from '@/components/ui/separator'
import { getConfigInfo, testGitHubConnection } from '@/utils/githubImageBed'
import { imageCache } from '@/utils/imageCache'
import { Database, Image, Settings, TestTube, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

// 获取GitHub图床配置信息
const githubConfig = getConfigInfo()
const isTestingConnection = ref(false)

// 缓存统计信息
const cacheStats = computed(() => imageCache.getCacheStats())

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

// 清理过期缓存
function cleanExpiredCache() {
const cleanedCount = imageCache.cleanExpired()
if (cleanedCount > 0) {
toast.success(`已清理 ${cleanedCount} 个过期缓存项`)
}
else {
toast.info(`没有过期的缓存项`)
}
}

// 清空所有缓存
function clearAllCache() {
imageCache.clearCache()
toast.success(`已清空所有图片缓存`)
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
            variant="outline"
            size="sm"
            class="flex-1"
            @click="clearAllCache"
          >
            <Trash2 class="mr-2 h-4 w-4" />
            清空缓存
          </Button>
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
          <li>代码块：```language

语法的代码块</li>

<li>Mermaid图表：

```mermaid 语法的图表</li>
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
禁用特殊语法块渲染
- **GitHub配置显示** - 查看当前图床配置
- **连接测试按钮** - 测试GitHub API连接
- **语法块预览** - 显示当前文档中检测到的特殊语法块

#### 顶部工具栏功能

- **转图按钮** - 手动触发特殊语法块转换为图片
- **状态显示** - 按钮文字显示当前模式（"转图"或"原文"）
- **高亮状态** - 图片模式时按钮高亮显示

#### 状态指示

- **绿色徽章** - 功能已启用
- **灰色徽章** - 功能已禁用
- **数字徽章** - 显示检测到的语法块数量
- **按钮高亮** - 转图模式时按钮背景高亮

### 处理流程

```

编写Markdown → 点击转图按钮 → 检测语法块 → 渲染图片 → 上传GitHub → 替换链接 → 完成
↓ ↓ ↓ ↓ ↓ ↓ ↓
正常编辑 手动触发 识别语法块 生成PNG API上传 更新内容 显示图片

```

#### 缓存流程

```

再次点击转图 → 检查内容变化 → 使用缓存/重新生成 → 快速切换
↓ ↓ ↓ ↓
用户操作 哈希对比 智能判断 提升性能

```

## 📋 注意事项

### 处理时间

- **首次渲染** - 可能需要5-10秒
- **后续渲染** - 利用缓存，速度更快
- **图片可访问** - 上传后立即可用

### 网络要求

- **稳定网络连接** - 用于上传图片到GitHub
- **GitHub API访问** - 确保能访问api.github.com
- **图床域名访问** - 确保能访问images.jieyu.ai

### 存储说明

- **存储位置** - GitHub仓库：zillionare/images
- **路径格式** - images/{年份}/{月份}/文件名.png
- **文件命名** - 类型-时间戳-随机字符.png
- **访问地址** - https://images.jieyu.ai/路径

## 🐛 故障排除

### 常见问题

#### 1. 图片不显示或显示空白

**可能原因**：

- GitHub token权限不足
- 网络连接问题
- 图片还在上传中

**解决方法**：

1. 检查GitHub token权限（需要Contents: Write）
2. 点击"测试GitHub连接"验证配置
3. 等待几秒钟后刷新页面
4. 查看浏览器控制台错误信息

#### 2. 403权限错误

**错误信息**：`Resource not accessible by personal access token`

**解决方法**：

1. 重新生成GitHub token
2. 确保选择了正确的权限：
   - ✅ repo (完整仓库权限) 或
   - ✅ Contents: Write + Metadata: Read
3. 更新.env.local文件中的token
4. 重启开发服务器

#### 3. CSS跨域错误

**错误信息**：`Not allowed to access cross-origin stylesheet`

**解决方法**：

- 这个错误不影响功能，图片仍会正常生成
- 如果影响渲染质量，可以尝试刷新页面

#### 4. 语法块未被检测

**可能原因**：

- 语法块格式不正确
- 功能未启用
- 缓存问题

**解决方法**：

1. 检查语法块格式是否正确
2. 确认功能已启用（右侧面板开关）
3. 手动刷新页面
4. 重新编辑语法块内容

## 📊 性能优化

### 缓存机制

- **内容缓存** - 相同内容的语法块会复用已生成的图片
- **避免重复** - 减少不必要的渲染和上传
- **提升速度** - 显著提高后续处理速度

### 最佳实践

- **批量编辑** - 完成所有编辑后再启用功能
- **网络稳定** - 在网络稳定时使用功能
- **适度使用** - 避免过多的语法块影响性能

## 🔍 调试信息

### 控制台日志

打开浏览器开发者工具（F12），在Console标签页可以看到详细的处理日志：

```

Starting GitHub image upload with config: ...
Generated filename: code-1234567890-abc123.png
Storage path: images/2024/06/code-1234567890-abc123.png
Uploading image to GitHub: ...
Image uploaded successfully: https://images.jieyu.ai/...

```

### 状态监控

- **成功** - 控制台显示绿色成功信息
- **警告** - 控制台显示黄色警告信息
- **错误** - 控制台显示红色错误信息，并有详细错误描述

---

## 📞 获取帮助

如果遇到问题：

1. 查看浏览器控制台的详细错误信息
2. 使用"测试GitHub连接"功能验证配置
3. 参考 `SETUP_INSTRUCTIONS.md` 进行配置检查
4. 确认GitHub token权限设置正确
```
