# Sprint #2: 转图功能

## 功能概述

实现将 markdown 中的特殊块（admonition、fenced block、math block）转换为图片的功能。

## 详细需求

### 1. UI 交互

- 在复制按钮左侧添加『转图』按钮
- 点击时将 admonition、fenced block、math block 截图并上传到图床
- 替换原始 markdown 中的对应内容为图床链接

### 2. 渲染器改进

- 为 admonition、fenced block、math block 添加唯一 ID
- 便于后续跟踪和截图

### 3. 图床配置

- 在设置页面添加 GitHub 图床配置
- 支持模板变量 {year}、{month}
- 添加图床测试功能

### 4. 性能优化

- 使用 MD5 摘要防止重复上传
- 本地存储上传状态

### 5. 测试配置

GitHub 图床测试配置：

- Token: 从环境变量VITE_GITHUB_IMAGE_TOKEN读取
- Owner: zillionare
- Repository: marktwain
- 存储路径: images/{year}/{month}

### 6. 注意事项

- 测试时每种类型（admonition, fenced, math）只能使用一个图片，避免因测试对图床造成污染
