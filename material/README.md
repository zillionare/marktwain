# MarkTwain 浏览器扩展商店上架物料

本目录包含了MarkTwain浏览器扩展在Chrome Web Store和Firefox Add-ons商店上架所需的所有物料。

## 目录结构

```
material/
├── README.md                    # 本文件
├── store-requirements.md        # 商店要求详细说明
├── chrome/                      # Chrome Web Store 物料
│   ├── icons/                   # 图标文件
│   │   ├── icon-16.png         # 16x16 工具栏图标
│   │   ├── icon-48.png         # 48x48 扩展管理页图标
│   │   └── icon-128.png        # 128x128 商店展示图标
│   ├── screenshots/            # 截图文件
│   │   ├── screenshot-1.png    # 主界面截图 (1280x800)
│   │   ├── screenshot-2.png    # 功能展示截图
│   │   └── screenshot-3.png    # 使用场景截图
│   ├── promotional/            # 推广图片
│   │   ├── tile-440x280.png    # 小型推广图片
│   │   ├── marquee-1400x560.png # 大型推广图片
│   │   └── screenshot-640x400.png # 截图推广图片
│   ├── description.md          # 商店描述文本
│   └── privacy-policy.md       # 隐私政策
├── firefox/                    # Firefox Add-ons 物料
│   ├── icons/                  # 图标文件
│   │   ├── icon-48.png        # 48x48 基础图标
│   │   ├── icon-96.png        # 96x96 高分辨率图标
│   │   └── icon-128.png       # 128x128 商店展示图标
│   ├── screenshots/           # 截图文件
│   │   ├── screenshot-1.png   # 主界面截图 (1280x800)
│   │   ├── screenshot-2.png   # 功能展示截图
│   │   └── screenshot-3.png   # 使用场景截图
│   ├── description.md         # 商店描述文本
│   └── privacy-policy.md      # 隐私政策
├── html-templates/            # 用于截图的HTML模板
│   ├── main-interface.html    # 主界面展示
│   ├── editor-demo.html       # 编辑器功能演示
│   ├── publish-demo.html      # 发布功能演示
│   └── assets/               # 模板资源文件
└── docs/                     # 相关文档
    ├── submission-checklist.md # 提交清单
    ├── chrome-submission.md    # Chrome商店提交指南
    └── firefox-submission.md   # Firefox商店提交指南
```

## 商店要求概览

### Chrome Web Store
- **图标**: 16x16, 48x48, 128x128 PNG格式
- **截图**: 最多5张，1280x800或640x400像素
- **描述**: 简短描述132字符以内，详细描述不超过16,000字符
- **推广图片**: 可选，440x280, 920x680, 1400x560像素

### Firefox Add-ons (AMO)
- **图标**: 48x48, 96x96, 128x128 PNG格式
- **截图**: 最多10张，建议1280x800像素
- **描述**: 摘要250字符以内，详细描述不限制长度
- **隐私政策**: 如果收集用户数据则必需

## 使用说明

1. 查看 `store-requirements.md` 了解详细的商店要求
2. 使用 `html-templates/` 中的模板生成截图
3. 根据各商店要求准备相应的图标和截图
4. 参考描述模板编写商店描述
5. 使用提交清单确保所有物料准备完整

## 注意事项

- 所有图片文件应为PNG格式，背景透明
- 截图应展示扩展的核心功能和用户界面
- 描述文本应突出扩展的独特价值和主要功能
- 隐私政策必须准确描述数据收集和使用情况
