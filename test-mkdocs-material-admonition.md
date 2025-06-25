# mkdocs-material 风格 Admonition 测试

这个文件用于测试新实现的 mkdocs-material 风格的 admonition 样式。

## 基本类型测试

!!! note "重要提示"
这是一个 note 类型的 admonition。
它应该有蓝色的左边框和浅蓝色的背景。

!!! tip "小贴士"
这是一个 tip 类型的 admonition。
它应该有绿色的左边框和浅绿色的背景。

!!! important "重要信息"
这是一个 important 类型的 admonition。
它应该有紫色的左边框和浅紫色的背景。

!!! warning "警告"
这是一个 warning 类型的 admonition。
它应该有橙色的左边框和浅橙色的背景。

!!! caution "注意"
这是一个 caution 类型的 admonition。
它应该有红色的左边框和浅红色的背景。

## 扩展类型测试

!!! question "问题"
这是一个 question 类型的 admonition。
它应该有浅蓝色的左边框和背景。

!!! hint "提示"
这是一个 hint 类型的 admonition。
它应该有绿色的左边框和背景。

!!! example "示例"
这是一个 example 类型的 admonition。
它应该有紫色的左边框和背景。

!!! abstract "摘要"
这是一个 abstract 类型的 admonition。
它应该有青色的左边框和背景。

## 复杂内容测试

!!! note "包含代码的提示"
这个 admonition 包含代码块：

    ```javascript
    function hello() {
        console.log("Hello, mkdocs-material!");
    }
    ```

    还有行内代码：`console.log()`

!!! tip "包含列表的提示"
这个 admonition 包含列表：

    - 第一项
    - 第二项
    - 第三项

    1. 有序列表第一项
    2. 有序列表第二项

!!! warning "包含链接的警告"
这个 admonition 包含链接：[GitHub](https://github.com)

    还有**粗体**和*斜体*文本。

## 嵌套测试

!!! important "外层重要信息"
这是外层的 admonition。

    !!! note "内层提示"
        这是嵌套在内层的 admonition。
        嵌套应该正常工作。

## 无标题测试

!!! note
这是一个没有自定义标题的 note。

!!! tip
这是一个没有自定义标题的 tip。
