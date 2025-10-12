# Bug 报告：CodeMirror 编辑器高度被限制为 300px

## Bug 描述

CodeMirror 编辑器的高度被固定限制在 300px，导致编辑器无法铺满整个容器，影响用户体验。期望的行为是编辑器能够自适应容器高度，只在"原始文档"和"转图后"的 tab 控制下留出必要的空间。

## 复现步骤

1. 打开编辑器页面
2. 在浏览器开发者工具中检查 CodeMirror 相关的 CSS 样式
3. 观察到 `.CodeMirror` 元素具有 `height: 300px` 属性

## 预期行为

CodeMirror 编辑器的高度应该能够自适应容器，铺满除了 tab 控制区域之外的所有可用空间。

## 实际行为

CodeMirror 编辑器的高度被固定为 300px。

## 根本原因分析

**问题已确认**：CodeMirror 的默认 CSS 文件 `/node_modules/.ignored/codemirror/lib/codemirror.css` 中第 6 行设置了：

```css
.CodeMirror {
  /* Set height, width, borders, and global font properties here */
  font-family: monospace;
  height: 300px;  /* 这里是问题所在 */
  color: black;
  direction: ltr;
}
```

这个默认样式导致所有 CodeMirror 编辑器实例的高度都被限制为 300px。

## 修复方案

**方案一：CSS 覆盖（推荐）**
在项目的 CSS 文件中添加覆盖样式：

```css
.CodeMirror {
  height: 100% !important;
}
```

**方案二：在组件样式中覆盖**
在 `CodemirrorEditor.vue` 的 `<style>` 部分添加：

```css
:deep(.CodeMirror) {
  height: 100% !important;
}
```

**方案三：通过 CodeMirror 配置**
在创建 CodeMirror 实例时通过 `setSize` 方法设置：

```javascript
textArea.setSize(null, `100%`)
```

## 实施的解决方案

**已采用纯CSS方案**：通过CSS样式覆盖解决高度问题，避免JavaScript动态计算的性能开销

### 1. 问题根本原因

- CodeMirror默认CSS设置了 `height: 300px` 的固定高度
- 父容器 `.codeMirror-wrapper` 已正确设置了 `height: 100%` 和 `flex: 1`
- 但CodeMirror内部容器没有正确继承父容器高度

### 2. CSS 样式覆盖解决方案

关键的CSS样式覆盖：

```css
/* Override CodeMirror default height and ensure it fills the container */
:deep(.CodeMirror) {
  height: 100% !important;  /* 改为100%，让编辑器填满父容器 */
  min-height: 200px;
}

:deep(.CodeMirror-scroll) {
  overflow-y: auto;
  overflow-x: auto;
  height: 100%;  /* 确保滚动容器也占满高度 */
}
```

### 3. 布局结构优化

确保父容器正确设置了flex布局：

```css
.codeMirror-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 编辑器内容区域占用剩余空间 */
.codeMirror-wrapper > div:not(.flex),
.codeMirror-wrapper > template + div {
  flex: 1;
  overflow: hidden;
}
```

## 修复状态

✅ **已修复** - 2024年1月26日

## 性能优化

- ❌ 移除了JavaScript动态计算，避免性能开销
- ❌ 移除了窗口resize事件监听器
- ❌ 移除了tab切换时的高度重计算
- ✅ 采用纯CSS解决方案，性能更优

## 影响范围

- 编辑器页面的用户体验 ✅ 改善
- 编辑器内容显示区域 ✅ 自适应容器高度
- 窗口大小调整 ✅ 自动响应（CSS处理）
- 性能表现 ✅ 显著提升

## 优先级

高 ✅ 已完成

## 相关文件

- `apps/web/src/views/CodemirrorEditor.vue` ✅ 已修改（移除JS代码，优化CSS）
- `node_modules/.ignored/codemirror/lib/codemirror.css` - 问题源头（第三方库文件）

## 技术细节

- CodeMirror 版本：项目中使用的版本
- 问题类型：CSS 样式冲突导致的高度限制
- 修复类型：纯CSS样式覆盖
- 测试状态：✅ 已在开发环境验证
- 性能改进：✅ 移除JavaScript动态计算，提升性能
