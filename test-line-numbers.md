# 测试代码行号功能

这是一个简单的测试文档，用于验证代码块行号功能是否正常工作。

## JavaScript 代码示例

```javascript
function fibonacci(n) {
  if (n <= 1) {
    return n
  }
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10))
```

## Python 代码示例

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = bubble_sort(numbers)
print("排序后的数组:", sorted_numbers)
```

## 说明

开启"代码行号"功能后，代码块应该在左侧显示行号。行号有以下特点：

1. 按序递增：1, 2, 3, 4...
2. 右对齐显示
3. 与代码内容之间有分隔线
4. 行号不可选中
5. 支持深色/浅色主题
