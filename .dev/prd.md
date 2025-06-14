## story

本项目(md)是一个markdown的渲染工具，它支持将markdown格式的文档渲染成html格式，从而适合发表到微信公众号。现在，我们将拓展该工具，使得它能更好地支持其它平台的渲染。主要方法是，把一些存在差异的功能，在本地渲染成图片，就能更好地适应各个平台。

主要步骤是：

1. 将特殊语法块在本地渲染成图片
2. 将图片上传到github仓库
3. 将特殊语法块替换成图片链接
4. 将替换后的markdown文件，在预览窗口中渲染成html。

## 需要在本地渲染的语法块

1. fenced block，比如python代码，mermaid等
2. admonition块。支持commonmark的admonition块语法
3. 块级公式
