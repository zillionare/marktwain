# 安全配置指南

## 环境变量配置

为了保护敏感信息，本项目已移除所有硬编码的 API 密钥和访问令牌。请按照以下步骤配置环境变量：

### 1. 创建环境变量文件

复制 `.env.example` 文件为 `.env.local`：

```bash
cp .env.example .env.local
```

### 2. 配置 GitHub 图床

在 `.env.local` 文件中设置您的 GitHub Personal Access Token：

```env
VITE_GITHUB_IMAGE_TOKEN=your_github_personal_access_token_here
```

#### 如何获取 GitHub Personal Access Token：

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 设置 token 名称和过期时间
4. 选择权限范围：
   - `repo` - 完整的仓库访问权限（用于上传图片到私有仓库）
   - 或者 `public_repo` - 仅公共仓库访问权限（如果只使用公共仓库）
5. 点击 "Generate token"
6. 复制生成的 token（注意：token 只会显示一次）

### 3. 开发环境

在开发环境中，Vite 会自动加载 `.env.local` 文件中的环境变量。

### 4. 生产环境

在生产环境中，请通过以下方式设置环境变量：

#### Vercel

在 Vercel 项目设置中添加环境变量：

- 变量名：`VITE_GITHUB_IMAGE_TOKEN`
- 值：您的 GitHub Personal Access Token

#### Netlify

在 Netlify 项目设置中添加环境变量：

- 变量名：`VITE_GITHUB_IMAGE_TOKEN`
- 值：您的 GitHub Personal Access Token

#### 其他平台

请参考相应平台的文档来设置环境变量。

## 安全注意事项

1. **永远不要**将 `.env.local` 文件提交到版本控制系统
2. **永远不要**在代码中硬编码 API 密钥或访问令牌
3. 定期轮换您的 GitHub Personal Access Token
4. 为 token 设置适当的权限范围，避免过度授权
5. 如果 token 泄露，请立即在 GitHub 中撤销并重新生成

## 故障排除

### 图床配置失败

如果图床配置失败，请检查：

1. 环境变量是否正确设置
2. GitHub token 是否有效且具有正确的权限
3. 仓库名称格式是否正确（如：`owner/repo`）

### 环境变量未生效

如果环境变量未生效，请：

1. 确认 `.env.local` 文件在项目根目录
2. 重启开发服务器
3. 检查变量名是否以 `VITE_` 开头（Vite 要求）
