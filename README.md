<div align="center">

<img src="https://fastly.jsdelivr.net/gh/zillionare/images@main/images/hot/logo/marktwain.png" width="30%">

</div>

<h1 align="center">Marktwain</h1>

## 项目介绍

本项目是 [Doocs/md](https://github.com/doocs/md) 的 fork。Doocs/md 解决了快速编辑公众号文章的问题，并提供了优雅的默认样式。

但是，如何安全地把文章发到任意平台，而不丢失这些优雅的样式呢？**编辑一次，发遍宇宙**，这就是 MarkTwain 要做的事。

我们的做法很简单，把平台可能不支持的特殊语法，比如代码高亮显示， Mermaid 图表（暂未实现），数学公式，警示语块事先转换成图片并上传到图床，并替换相应内容为图片链接。这样再复制粘贴到其它平台上，就能得到一致的视觉效果。实际上，这也是早期在编辑公众号标题、头条标题大家常做的事。

**MarkTwain永久免费，并且一直可通过 [MarkTwain](https://md.jieyu.ai) 在线使用**！

## 在线使用地址

**[MarkTwain](https://md.jieyu.ai)**

注：推荐使用 Chrome 浏览器，效果最佳。

## 功能特性

### Marktwain 独家功能

作为一个 Markdown 编辑器（即将 Markdown 转换为 Html），Marktwain 支持以下独特功能：

- [x] 支持 common mark 的 Admonition (类似 GFM Alerts)
- [x] 代码加行号功能。
- [x] 支持将 admonition, fenced block, math block, mermaid, plantULM和标题 转换成图片，上传图床
- [x] 将转图后的 markdown 替换为图片链接
- [x] 将转图后的博文复制粘贴后，即可发表到多数网站，保持视觉效果基本不变。
- [x] 导出与预览完全一致的 PDF。

![](https://cdn.jsdelivr.net/gh/zillionare/imgbed2@main/images/2025/08/20250910213510.png)

### doocs/md 支持的功能

以下常用编辑功能，由 doocs/md 支持。我们将保持同步更新。

- [x] 支持 Markdown 所有基础语法、数学公式
- [x] 提供对 Mermaid 图表的渲染和 [GFM 警告块](https://github.com/orgs/community/discussions/16925)的支持
- [x] 提供 PlantUML 渲染支持
- [x] 提供 ruby 注音扩展支持，支持两种格式：[文字]{注音}、[文字]^(注音)，支持 `・`、`．`、`。`、`-` 分隔符
- [x] 丰富的代码块高亮主题，提升代码可读性
- [x] 允许自定义主题色和 CSS 样式，灵活定制展示效果
- [x] 提供多图上传功能，并可自定义配置图床
- [x] 便捷的文件导入、导出功能，提升工作效率
- [x] 内置本地内容管理功能，支持草稿自动保存
- [x] 集成主流 AI 模型（如 DeepSeek、OpenAI、通义千问、腾讯混元、火山方舟 等等），辅助内容创作

## 目前支持哪些图床

| #   | 图床                                                   | 使用时是否需要配置                                                         | 备注                                                                                                                   |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | gitee                                                  | 否，但Gitee 图床图片，一般很难在其它网站上使用。                           | -                                                                                                                      |
| 2   | [GitHub](https://github.com)                           | 配置 `Repo`、`Token`、`仓库内路径`、`域名前缀` 参数                        | [如何获取 GitHub token？](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) |
| 3   | [阿里云](https://www.aliyun.com/product/oss)           | 配置 `AccessKey ID`、`AccessKey Secret`、`Bucket`、`Region` 参数           | [如何使用阿里云 OSS？](https://help.aliyun.com/document_detail/31883.html)                                             |
| 4   | [腾讯云](https://cloud.tencent.com/act/pro/cos)        | 配置 `SecretId`、`SecretKey`、`Bucket`、`Region` 参数                      | [如何使用腾讯云 COS？](https://cloud.tencent.com/document/product/436/38484)                                           |
| 5   | [七牛云](https://www.qiniu.com/products/kodo)          | 配置 `AccessKey`、`SecretKey`、`Bucket`、`Domain`、`Region` 参数           | [如何使用七牛云 Kodo？](https://developer.qiniu.com/kodo)                                                              |
| 6   | [MinIO](https://min.io/)                               | 配置 `Endpoint`、`Port`、`UseSSL`、`Bucket`、`AccessKey`、`SecretKey` 参数 | [如何使用 MinIO？](http://docs.minio.org.cn/docs/master/)                                                              |
| 7   | [公众号](https://mp.weixin.qq.com/)                    | 配置 `appID`、`appsecret`、`代理域名` 参数                                 | [如何使用公众号图床？](https://md-pages.doocs.org/tutorial)                                                            |
| 8   | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 配置 `AccountId`、`AccessKey`、`SecretKey`、`Bucket`、`Domain` 参数        | [如何使用 S3 API 操作 R2？](https://developers.cloudflare.com/r2/api/s3/api/)                                          |
| 9   | [又拍云](https://www.upyun.com/)                       | 配置 `Bucket`、`Operator`、`Password`、`Domain` 参数                       | [如何使用 又拍云？](https://help.upyun.com/)                                                                           |
| 10  | [Telegram](https://core.telegram.org/api)              | 配置 `Bot Token`、`Chat ID` 参数                                           | [如何使用 Telegram 图床？](https://github.com/zillionare/marktwain/blob/main/docs/telegram-usage.md)                   |
| 11  | [Cloudinary](https://cloudinary.com/)                  | 配置 `Cloud Name`、`API Key`、`API Secret` 参数                            | [如何使用 Cloudinary？](https://cloudinary.com/documentation/upload_images)                                            |
| 12  | 自定义上传                                             | 是                                                                         | [如何自定义上传？](/docs/custom-upload.md)                                                                             |

### GitHub 图床配置

GitHub 图床支持以下配置选项：

#### 基本配置

- **仓库** (owner/repo): GitHub 仓库，格式为 `用户名/仓库名`
- **分支**: 上传到的分支，默认为 `master`
- **Token**: GitHub Personal Access Token，需要有仓库写入权限

#### 高级配置

- **仓库内路径**: 图片在仓库中的存储路径，支持变量替换
  - `{year}`: 当前年份（4位）
  - `{month}`: 当前月份（2位）
  - 示例：`images/{year}/{month}` 会被替换为 `images/2025/09`
  - 默认：自动生成 `YYYY/MM/DD` 格式

- **域名前缀**: 自定义图片访问域名
  - CDN 加速示例：`https://fastly.jsdelivr.net/gh/owner/repo@main/`
  - 自定义域名示例：`https://img.example.com/`
  - 不填写时使用原始 GitHub 链接，但可能访问速度变慢。

#### 使用示例

配置示例：

- 仓库：`githubuser/repo`
- 分支：`main`
- 仓库内路径：`images/{year}/{month}`
- 域名前缀：`https://fastly.jsdelivr.net/gh/githubuser/repo@main/`

![](https://cdn.jsdelivr.net/gh/githubuser/repo@main/images/2025/08/20250914205647.png)

![demo1](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo1.gif)

![demo2](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo2.gif)

![demo3](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo3.gif)

![demo4](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo4.gif)

## 支持我们

本项目永久免费，并可通过[Marktwain](https://md.jieyu.ai)**免费**在线使用。

## 反馈与交流

如果你在使用过程中遇到问题，或者有好的建议，欢迎在 [Issues](https://github.com/zillionare/marktwain/issues) 中反馈。你也可以加入我们的交流群，和我们一起讨论，若群二维码失效，请添加好友，备注 `marktwain`，我们会拉你进群。

<div align="center">
<img src="https://images.jieyu.ai/images/hot/quantfans.png" width="200">
</div>
