# Marktwain 项目概述

## 项目简介

Marktwain 是一个基于 [Doocs/md](https://github.com/doocs/md) 的 Markdown 编辑器增强版本。它专注于解决如何将精心格式化的 Markdown 文档（包含代码高亮、数学公式、图表等）安全地发布到各种平台并保持视觉一致性的问题，实现“编辑一次，发遍宇宙”的目标。

其核心做法是将 Markdown 中平台可能不支持的特殊语法（如代码块、Mermaid 图表、数学公式、警示语块等）预先转换为图片并上传到图床，然后将原文中的这些内容替换为对应的图片链接。这样，无论复制到哪个平台，都能保持一致的视觉效果。

## 技术栈与架构

该项目是一个基于 Vue 3 和 TypeScript 的单页应用 (SPA)，使用 Vite 作为构建工具。它采用了 pnpm 工作区 (monorepo) 的结构来管理多个包和应用。

### 主要技术

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **包管理器**: pnpm
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **核心依赖**:
  - `marked`: Markdown 解析
  - `highlight.js`: 代码高亮
  - `katex`: 数学公式渲染
  - `mermaid`: 图表渲染
  - `html-to-image`: 将 HTML 转换为图片
  - `codemirror`: 代码编辑器
  - `pinia`: 状态管理
  - `vue-router`: 路由管理 (推测)
- **图床支持**: 支持多种图床，包括 GitHub, Gitee, 阿里云 OSS, 腾讯云 COS, 七牛云 Kodo, MinIO, 公众号, Cloudflare R2, 又拍云, Telegram, Cloudinary 以及自定义上传。

### 项目结构

```bash
marktwain/
├── apps/
│   ├── web/          # 主要的 Web 应用
│   └── vscode/       # VS Code 插件 (目前内容较少)
├── packages/
│   ├── config/       # 项目通用配置
│   ├── core/         # 核心 Markdown 处理逻辑
│   ├── shared/       # 共享类型、工具和常量
│   ├── md-cli/       # (推测) 可能用于 CLI 版本或打包
│   └── example/      # 示例代码
├── docs/             # 文档
├── scripts/          # 构建和发布脚本
├── public/           # 静态资源
└── ...
```

- `apps/web`: 这是主要的应用程序，包含了用户界面和大部分功能实现。
- `packages/core`: 包含 Markdown 解析、渲染和转换（如转图）的核心逻辑。
- `packages/shared`: 在 `core` 和 `web` 之间共享的类型定义、常量和通用工具函数。
- `packages/config`: 存放项目范围的 TypeScript 和 ESLint 配置。

## 开发与构建

### 环境准备

1.  安装 [Node.js](https://nodejs.org/) (建议使用 `.nvmrc` 文件中指定的版本，可通过 `nvm` 管理)。
2.  安装 [pnpm](https://pnpm.io/) 作为包管理器。

### 常用命令

- **安装依赖**: `pnpm install`
- **启动开发服务器**: `pnpm start` (等同于 `pnpm web dev`)
  - 这会启动 Vite 开发服务器，通常在 `http://localhost:5173`。
- **构建生产版本**: `pnpm web build`
  - 构建后的文件会输出到 `apps/web/dist` 目录。
- **构建 CLI 版本**: `pnpm build:cli`
  - 构建 Web 应用并将其打包到 `packages/md-cli` 中。
- **构建 VS Code 插件**: `pnpm vscode package`
  - 在 `apps/vscode` 目录下执行，生成 `.vsix` 文件。
- **代码检查与修复**: `pnpm lint`
- **类型检查**: `pnpm type-check` (或 `pnpm web type-check`)

### 开发流程

1.  克隆仓库。
2.  运行 `pnpm install` 安装所有依赖。
3.  运行 `pnpm start` 启动开发服务器进行开发。
4.  代码修改会通过 Vite 的 HMR (Hot Module Replacement) 实时反映在浏览器中。
5.  开发完成后，运行 `pnpm web build` 构建生产版本。

## 核心功能与模块

### Markdown 编辑与渲染 (`packages/core`)

- 使用 `marked` 解析 Markdown。
- 集成 `highlight.js` 进行代码高亮。
- 集成 `katex` 渲染数学公式。
- 集成 `mermaid` 渲染图表 (功能特性中提及)。
- 提供将特定 Markdown 块（如代码块、公式、图表、Admonition）转换为图片的功能。

### 转图功能

- 位于 `packages/core` 中。
- 识别 Markdown 中的特定块（代码、公式、图表等）。
- 利用 `html-to-image` 或类似库将这些块渲染为图片。
- 通过配置的图床 SDK (如 `tiny-oss`, `qiniu-js`, AWS S3 SDK 等) 上传图片。
- 将原始 Markdown 内容替换为生成的图片链接。

### 分页与导出

- 提供手动 (`---`) 和自动分页功能。
- 在分页模式下，为不同页面添加特定的 CSS 类 (`page-cover`, `page-1`, `page-2`, ..., `page-end`) 以便自定义样式。
- 提供导出为 PNG 图片的功能，可以导出单张长图或分页多图。

### 模板功能

- 允许用户保存可复用的 Markdown 片段或 HTML/CSS 设计作为模板。
- 可在后续编辑中方便地插入这些模板。

### 图床集成 (`apps/web`)

- 在前端集成了多种图床的上传逻辑。
- 用户可以在设置中配置不同图床的参数（如 Token, Bucket, Region 等）。
- 上传成功后，返回图片 URL 用于替换 Markdown 内容。

### VS Code 插件 (`apps/vscode`)

- 提供了一个基础的 VS Code 插件框架。
- 可以在 VS Code 中预览 Markdown (通过侧边栏)。
- 包含一些基本的设置命令 (字体、代码块样式等)。
