# MarkTwain 编辑器示例

这是一个 Markdown 编辑器的示例文档，展示了各种 Markdown 语法和功能。

## MarkTwain的亮点

感谢 Doocs/md项目！这个项目是在他们的基础上拓展的，增加了以下功能：

1. 支持common mark的Admonition
2. 支持多平台（无视觉差别的）发布！一些平台不支持公式，Admonition（比如公众号和知乎）甚至代码块（比如头条），我们通过将这些块转换成图片，再替换为图床链接，来达到兼容的目标。
3. 支持导出转换后的markdown文本，这样可以方便地在知乎、头条、CSDN、星球等平台导入。

## 如何使用转图功能
当你编辑好markdown的文本内容之后，就可以点击右上工具栏中的『转图』按钮，此时程序会将其它平台可能不兼容的文字块（比如Admonition, 公式，代码）转换为图片上传到图床，再将文字替换为图片链接。

在『转图』之前，你还需要对图床进行配置。这个项目默认使用Github图床。

## 标题示例

### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

## 文本格式

**粗体文本**

*斜体文本*

~~删除线文本~~

`行内代码`

## 列表

### 无序列表
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3

### 有序列表
1. 第一项
2. 第二项
3. 第三项

## 链接和图片

[链接示例](https://example.com)

![图片示例](https://via.placeholder.com/300x200)

## 代码块

### JavaScript 代码
```javascript
function hello() {
    console.log("Hello, World!");
    return "欢迎使用 Markdown 编辑器";
}

// 调用函数
hello();
```

### Python 代码
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# 计算斐波那契数列
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

### HTML 代码
```html
<!DOCTYPE html>
<html>
<head>
    <title>示例页面</title>
</head>
<body>
    <h1>欢迎</h1>
    <p>这是一个示例页面。</p>
</body>
</html>
```

## 数学公式

### 行内公式
这是一个行内公式：$E = mc^2$，它展示了质能方程。

### 块级公式

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\begin{aligned}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &= \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} &= 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} &= \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} &= 0
\end{aligned}
$$

## Admonition 块

!!! note "重要提示"
    这是一个 CommonMark 风格的 admonition 块。
    它可以包含多行内容。支持嵌套！
    ```python
      print("hello")
    ```
    它会在两个空行之后结束。你也可以通过添加<\!--note-->这样的注释来结束它


!!! warning "警告"
    这是一个警告类型的 admonition。
  

!!! tip "小贴士"
    这是一个提示类型的 admonition。


> [!tip] "github风格的Admonition块"
> 这是一个小tips。每一行都要使用 > 来引起。支持嵌套！

## 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

## 引用

> 这是一个引用块。
> 它可以包含多行内容。
>
> 引用块可以嵌套其他元素。

## 分割线

---

## 结语

这个示例展示了 Markdown 编辑器支持的各种语法和功能。您可以使用这些语法来创建丰富的文档内容。

## 关于开发者

我是一名软件开发者、Python技术专家、创业者、量化交易员和自媒体博主。我开设有《匡醍.量化24课》、《匡醍.因子挖掘与机器学习策略》和《匡醍.量化人的Numpy和Pandas》等量化课程。

我维护着以下开源软件：

- [Quantstats-Reloaded](https://github.com/zillionare/quantstats-reloaded)，一个量化策略指标分析库
- [Zigzag](https://github.com/zillionare/ZigZag)，一个重要的顶底检测工具。
- [MarkTwain](https://github.com/zillionare/marktwain/)，即您正在使用的这份软件。
