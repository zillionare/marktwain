# 转图功能测试内容

这个文件包含用于测试转图功能的各种 Markdown 内容。

## CommonMark Admonition 测试

!!! note "重要提示"
    这是一个测试 CommonMark admonition 块。
    它应该能够被正确识别并转换为图片。

!!! warning "警告"
    这是一个警告类型的 admonition。

!!! tip "小贴士"
    这是一个提示类型的 admonition。

!!! question "问题"
    这是一个问题类型的 admonition。

## 代码块测试

```javascript
// 这是一个 JavaScript 代码块
function hello() {
    console.log("Hello, World!");
    return "转图功能测试";
}

// 调用函数
hello();
```

```python
# 这是一个 Python 代码块
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# 计算斐波那契数列
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

## 数学公式测试

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

## 混合内容测试

!!! example "代码示例"
    下面是一个计算阶乘的函数：
    
    ```javascript
    function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    ```
    
    数学表达式：$n! = n \times (n-1) \times ... \times 1$

## 结束标记测试

!!! info "信息"
    这个 admonition 使用注释结束标记。
<!--info-->

这段文字在注释标记后，应该不属于 admonition。

!!! note "另一个测试"
    这个 admonition 使用空行结束。


这段文字在空行后，应该不属于 admonition。
