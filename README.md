# 微信 Markdown 编辑器

[![GitHub stars](https://img.shields.io/github/stars/doocs/md?style=flat-square)](https://github.com/doocs/md/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/doocs/md?style=flat-square)](https://github.com/doocs/md/network)
[![GitHub issues](https://img.shields.io/github/issues/doocs/md?style=flat-square)](https://github.com/doocs/md/issues)
[![GitHub license](https://img.shields.io/github/license/doocs/md?style=flat-square)](https://github.com/doocs/md/blob/main/LICENSE)

> [!tip]
> 一款高度简洁的微信 Markdown 编辑器：支持 Markdown 语法、自定义主题样式、内容管理、多图床、AI 助手等特性

## ✨ 功能特性

- 📝 **Markdown 语法支持** - 支持标准 Markdown 语法和扩展语法
- 🎨 **自定义主题样式** - 多种内置主题，支持自定义样式
- 📁 **内容管理** - 本地存储，支持多文档管理
- 🖼️ **多图床支持** - 支持多种图床服务，一键上传图片
- 🤖 **AI 助手** - 集成 AI 功能，辅助内容创作
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔄 **实时预览** - 所见即所得的编辑体验
- 📤 **多格式导出** - 支持导出 HTML、Markdown、图片等格式
- 🎯 **微信公众号优化** - 专为微信公众号排版优化

## 🚀 快速开始

### 在线使用

访问 [https://doocs.github.io/md](https://doocs.github.io/md) 立即开始使用。

### 本地开发

**环境要求**

- Node.js ≥ 20

**安装依赖**

```bash
npm install
```

**启动开发服务器**

```bash
npm run dev
```

**构建生产版本**

```bash
npm run build
```

## 📦 浏览器扩展

本项目支持构建为浏览器扩展，支持 Chrome、Firefox 和 Edge 浏览器。

**构建扩展**

```bash
# Chrome/Edge 扩展
npm run ext:zip

# Firefox 扩展
npm run firefox:zip
```

详细安装指南请参考 [浏览器扩展安装指南](BROWSER_EXTENSION_GUIDE.md)。

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Radix Vue + Tailwind CSS
- **编辑器**: CodeMirror 5
- **Markdown 解析**: Marked
- **数学公式**: KaTeX
- **图表**: Mermaid
- **状态管理**: Pinia

## 📖 使用指南

### 基本功能

1. **编辑器**: 左侧为 Markdown 编辑区，支持语法高亮和快捷键
2. **预览**: 右侧为实时预览区，所见即所得
3. **工具栏**: 顶部工具栏提供常用格式化功能
4. **设置**: 右侧设置面板可自定义主题和样式

### 高级功能

- **图片上传**: 支持拖拽上传和粘贴上传
- **表格插入**: 可视化表格编辑器
- **公众号名片**: 一键插入公众号名片
- **AI 助手**: 智能内容优化和生成

## 🤝 贡献指南

我们欢迎任何形式的贡献！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

## 📞 联系我们

- GitHub Issues: [提交问题](https://github.com/doocs/md/issues)
- 讨论区: [GitHub Discussions](https://github.com/doocs/md/discussions)


## Admonition 测试

!!! note "测试提示"
    这是一个测试 admonition 块。


> [!tip]
> tip content

## 代码块测试

![](https://fastly.jsdelivr.net/gh/bucketio/img11@main/images/2025/06/1750137696817-c3fd21d5-9c2b-4802-892e-d989c86c4a22.png)

## 数学公式测试

![](https://fastly.jsdelivr.net/gh/bucketio/img2@main/images/2025/06/1750137699573-59c9edf7-d27a-4945-ab63-785d4cf72676.png)
