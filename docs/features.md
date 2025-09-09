## 1. Features

这个项目与 doocs/md 的不同点在于：

1. 支持common mark 的 admonition
2. 支持将 admonition, formula(数学公式)和fenced block 转成图片，自动上传到图床，然后替换原文

## 2. Admonition

要支持 note, tip, info, warning, attention, example, abstract, question 等类型。

Admonition 块的语法是：

!!! {tag}
this is content
it ends with two empty line

Admonition 语法块结束。

## 3. 转图功能

### 3.1. 设置

在配置 > 样式配置下，增加『转图配置』。

1. 增加 屏幕宽度（默认800px）， 设备像素比（默认为1）
2. 增加『转换下列类型』
   1. [ ] Admonition
   2. [ ] Math block
   3. [ ] Fenced Block

### 3.2. UI 交互

1. 在复制按钮左侧添加『转图』按钮
2. 点击『转图』按钮时，
   1. 先将预览区的屏幕宽度设置为『屏幕宽度』
   2. 根据『转换下列类型』中的设置，依次转换为图片上传到默认图床
3. 保存编辑区原始 markdown（内部记为 v0） 并将v0中被转图的部分替换为图床链接，以生成新的 markdown

## 4. 导出功能

在文件 下拉菜单中，新增导出『转图后 MD』菜单项，点击时，导出转图后的 MD

## 5. 复原功能

在 编辑 菜单中，增加一个 『恢复原始 md』的菜单，点击后，编辑区内容重置为转图前的 markdown 内容

## 6. 技术栈

1. 转图时，使用 html-to-image
2. 上传图床时，使用现有机制
