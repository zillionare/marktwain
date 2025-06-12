# GitHub图床功能设置说明

## 🚀 快速开始

### 1. 环境变量配置

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，设置您的GitHub配置：

```bash
# GitHub图床配置
VITE_GITHUB_IMAGE_REPO=zillionare/images
VITE_GITHUB_IMAGE_BRANCH=main
VITE_GITHUB_IMAGE_TOKEN=your_github_token_here
VITE_GITHUB_IMAGE_BASE_PATH=images/{year}/{month}/
VITE_GITHUB_IMAGE_BASE_URL=https://images.jieyu.ai
```

### 2. 获取GitHub Token

1. 访问 [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置以下权限：
   - `repo` - 完整的仓库访问权限
   - `workflow` - 工作流权限（用于触发GitHub Pages）
4. 复制生成的token到 `VITE_GITHUB_IMAGE_TOKEN`

### 3. 启动应用

```bash
npm run dev
```

### 4. 测试功能

1. 打开应用右侧面板
2. 找到 "特殊语法块渲染" 部分
3. 点击 "测试GitHub连接" 按钮
4. 如果显示连接成功，说明配置正确

## 🔧 故障排除

### 401 认证错误

- 检查 `VITE_GITHUB_IMAGE_TOKEN` 是否正确设置
- 确认token有足够的权限
- 验证token没有过期

### 403 权限错误

- 确认token对目标仓库有写入权限
- 检查仓库是否存在且可访问

### 404 仓库不存在

- 验证 `VITE_GITHUB_IMAGE_REPO` 配置是否正确
- 确认仓库名格式为 `owner/repo`

### CSS跨域错误

- 这个问题已经通过设置 `skipFonts: true` 解决
- 如果仍有问题，检查浏览器控制台的详细错误信息

## 📋 配置说明

### 必需配置

- `VITE_GITHUB_IMAGE_TOKEN` - GitHub访问令牌（必需）

### 可选配置

- `VITE_GITHUB_IMAGE_REPO` - 默认：`zillionare/images`
- `VITE_GITHUB_IMAGE_BRANCH` - 默认：`main`
- `VITE_GITHUB_IMAGE_BASE_PATH` - 默认：`images/{year}/{month}/`
- `VITE_GITHUB_IMAGE_BASE_URL` - 默认：`https://images.jieyu.ai`

### 路径变量

- `{year}` - 当前年份（如：2024）
- `{month}` - 当前月份，两位数（如：06）

## 🎯 使用方法

1. **启用功能**：在右侧面板开启"特殊语法块渲染"
2. **编写内容**：在编辑器中输入特殊语法块
3. **自动处理**：系统会自动检测并渲染为图片
4. **等待上传**：图片会上传到GitHub并替换原始内容
5. **访问验证**：等待1-2分钟让GitHub Pages构建完成

## 📝 支持的语法块

- ✅ **代码块**：```language
- ✅ **Mermaid图表**：```mermaid
- ✅ **数学公式**：$$...$$
- ✅ **GitHub提示框**：> [!NOTE]、> [!TIP]、> [!WARNING]等

## 🔒 安全注意事项

- ⚠️ **不要提交** `.env` 或 `.env.local` 文件到git
- ⚠️ **不要在代码中硬编码** GitHub token
- ⚠️ **定期更新** GitHub token
- ⚠️ **使用最小权限** 原则设置token权限

## 📞 获取帮助

如果遇到问题：

1. 检查浏览器控制台的错误信息
2. 使用"测试GitHub连接"功能验证配置
3. 查看 `BLOCK_RENDERING_FEATURE.md` 了解详细功能说明
4. 参考 `TEST_GITHUB_IMAGEBED.md` 进行功能测试
