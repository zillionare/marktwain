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

#### 创建Personal Access Token

1. 访问 [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置Token信息：
   - **Token名称**: `MD Editor Image Bed`
   - **过期时间**: 建议选择 "No expiration" 或较长时间

#### 必需权限设置

⚠️ **重要**: 必须选择正确的权限，否则会出现403错误

**方式一：完整仓库权限（推荐）**

```
✅ repo (完整仓库访问权限)
  ✅ repo:status
  ✅ repo_deployment
  ✅ public_repo
  ✅ repo:invite
  ✅ security_events
```

**方式二：精确权限**

```
✅ Contents: Write (写入文件权限)
✅ Metadata: Read (读取仓库信息)
✅ Pull requests: Write (可选，用于触发构建)
```

4. 点击 "Generate token"
5. **立即复制Token**（只显示一次！）
6. 将Token添加到 `.env.local` 文件：
   ```bash
   VITE_GITHUB_IMAGE_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

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
