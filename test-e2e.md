# 端到端测试指南

## 测试步骤

### 1. 配置 GitHub 图床
1. 打开应用：http://localhost:5175/md/
2. 点击右侧设置按钮（齿轮图标）
3. 滚动到底部找到"GitHub 图床配置"
4. 填入以下配置：
   - Token: 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
   - Owner: zillionare
   - Repository: marktwain
   - 存储路径: images/{year}/{month}
5. 点击"测试图床"按钮验证配置

### 2. 测试内容
在编辑器中输入以下测试内容：

```markdown
# 转图功能测试

## Admonition 测试

!!! note "测试提示"
    这是一个测试 admonition 块。

## 代码块测试

```javascript
console.log("Hello World");
```

## 数学公式测试

$$
E = mc^2
$$
```

### 3. 测试转图功能
1. 输入测试内容后，等待预览渲染完成
2. 点击"转图"按钮
3. 观察是否有成功提示
4. 切换复制模式为"MD 格式"
5. 点击复制按钮
6. 检查剪贴板内容是否包含图片链接

### 4. 验证防重复功能
1. 再次点击"转图"按钮
2. 应该显示"内容未改变，不需要重复执行"

### 5. 测试内容变更
1. 修改任意一个块的内容
2. 再次点击"转图"按钮
3. 只有修改的块应该被重新转换

## 预期结果

1. 图床配置测试成功
2. 所有类型的块都能正确转换为图片
3. MD 格式复制时使用转换后的内容
4. 防重复功能正常工作
5. 内容变更检测正常工作
