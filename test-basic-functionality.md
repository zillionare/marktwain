# 基本功能测试

## 测试步骤

1. 打开浏览器：http://localhost:5175/md/
2. 检查是否有『转图』按钮
3. 检查设置面板是否有 GitHub 图床配置
4. 输入测试内容并验证渲染

## 测试内容

```markdown
# 测试文档

## Admonition 测试

!!! note "重要提示"
    这是一个测试 admonition。

## 代码块测试

```javascript
console.log("Hello World");
```

## 数学公式测试

$$
E = mc^2
$$
```

## 预期结果

1. 页面正常加载
2. 『转图』按钮出现在复制按钮左侧
3. 设置面板中有 GitHub 图床配置选项
4. 测试内容正确渲染，包括 admonition、代码块和数学公式
5. 每个特殊块都有唯一的 ID 和 data-block-type 属性

## 验证方法

在浏览器开发者工具中运行：

```javascript
// 检查转图按钮
const convertButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.includes('转图')
);
console.log('转图按钮:', convertButton ? '存在' : '不存在');

// 检查特殊块
const admonitionBlocks = document.querySelectorAll('[data-block-type="admonition"]');
const fencedBlocks = document.querySelectorAll('[data-block-type="fenced"]');
const mathBlocks = document.querySelectorAll('[data-block-type="math"]');

console.log('Admonition 块数量:', admonitionBlocks.length);
console.log('代码块数量:', fencedBlocks.length);
console.log('数学公式块数量:', mathBlocks.length);

// 检查 ID
admonitionBlocks.forEach((block, index) => {
  console.log(`Admonition ${index + 1} ID:`, block.id);
});
fencedBlocks.forEach((block, index) => {
  console.log(`Fenced ${index + 1} ID:`, block.id);
});
mathBlocks.forEach((block, index) => {
  console.log(`Math ${index + 1} ID:`, block.id);
});
```
