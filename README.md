# 微信 Markdown 编辑器

[![GitHub stars](https://img.shields.io/github/stars/zillionare/marktwain?style=flat-square)](https://github.com/zillionare/marktwain/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zillionare/marktwain?style=flat-square)](https://github.com/zillionare/marktwain/network)
[![GitHub issues](https://img.shields.io/github/issues/zillionare/marktwain?style=flat-square)](https://github.com/zillionare/marktwain/issues)

> [!tip]
> 一款通过浏览器扩展使用的 Markdown 编辑器，支持公众号、知乎、CSDN、星球等几乎所有你能想到的平台：因为我们会把扩展语法块（比如代码块、admonition块、数学公式块）自动截图上传到图床，所以，无论你发布到哪个平台，格式都能保持！

## ✨ 功能特性

- 📝 **Markdown 语法支持** - 支持标准 Markdown 语法和扩展语法
- 📝 **Markdown 语法支持** - 支持标准 Common mark和Github 的Admonition
- 🌎 **多平台发布支持** - 支持多种平台，包括微信公众号、知乎、CSDN、星球等
- 🎨 **自定义主题样式** - 多种内置主题，支持自定义样式
- 📁 **内容管理** - 本地存储，支持多文档管理
- 🖼️ **Github图床支持** - 支持Github图床及配置
- 🤖 **AI 助手** - 集成 AI 功能，辅助内容创作
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔄 **实时预览** -所见即所得的编辑体验
- 📤 **多格式导出** - 支持导出 HTML、Markdown、图片等格式

## 🚀 快速开始

### 在线使用

访问 [https://zillionare.github.io/marktwain](https://zillionare.github.io/marktwain) 立即开始使用。

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

详细安装指南请参考 [浏览器扩展安装指南](docs/BROWSER_EXTENSION_GUIDE.md)。

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

感谢 [Doocs](https://github.com/doocs/md)项目！本项目基于 Doocs/md 修改。

## 📞 联系我们

- GitHub Issues: [提交问题](https://github.com/zillionare/marktwain/issues)
- 讨论区: [GitHub Discussions](https://github.com/zillionare/marktwain/discussions)
