# 代码块复制样式测试

这个文件用于测试代码块复制到公众号时的样式保持情况。

## JavaScript 代码块

```javascript
// 这是一个 JavaScript 代码块
function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// 测试函数
const result = fibonacci(10);
console.log(`斐波那契数列第10项: ${result}`);

// 异步函数示例
async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取数据失败:', error);
        throw error;
    }
}
```

## Python 代码块

```python
# 这是一个 Python 代码块
def fibonacci(n):
    """计算斐波那契数列的第n项"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# 使用列表推导式
numbers = [fibonacci(i) for i in range(10)]
print(f"前10项斐波那契数列: {numbers}")

# 类定义示例
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result
    
    def get_history(self):
        return self.history

# 使用示例
calc = Calculator()
result = calc.add(5, 3)
print(f"计算结果: {result}")
```

## HTML 代码块

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试页面</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .highlight {
            background-color: #ffeb3b;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>欢迎来到测试页面</h1>
        <p>这是一个包含<span class="highlight">高亮文本</span>的段落。</p>
        <button onclick="showAlert()">点击我</button>
    </div>
    
    <script>
        function showAlert() {
            alert('Hello, World!');
        }
    </script>
</body>
</html>
```

## CSS 代码块

```css
/* 这是一个 CSS 代码块 */
.button {
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.button:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .button {
        padding: 10px 20px;
        font-size: 14px;
    }
}

/* 动画效果 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in {
    animation: fadeIn 0.6s ease-out;
}
```

## 行内代码测试

这里有一些行内代码：`console.log('Hello')`、`document.getElementById('app')`、`const arr = [1, 2, 3]`。

行内代码应该有背景色和边框，在复制到公众号时也应该保持样式。

## 测试说明

请复制这些代码块到微信公众号编辑器中，检查：

1. 代码块的背景色是否保持
2. 语法高亮的颜色是否正确显示
3. 行内代码的样式是否保持
4. 代码块的边框和圆角是否正常
5. 字体是否为等宽字体
