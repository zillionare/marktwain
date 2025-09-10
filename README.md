<div align="center">

[![](https://fastly.jsdelivr.net/gh/zillionare/images@main/images/hot/logo/marktwain.png)](https://github.com/zillionare/marktwain)

</div>

<h1 align="center">Marktwain</h1>

<div align="center">

</div>

## 项目介绍

本项目是 [Doocs/md](https://github.com/doocs/md) 的 fork。Doocs/md 解决了快速编辑公众号文章的问题，并提供了优雅的默认样式。

MarkTwain 帮助你在此基础上，可以把文章发表到任意平台上。我们能做到这一点，是因为我们把特殊语法转换成为图片。

欢迎给项目点个 ⭐️，我们会持续更新和维护。

## 在线编辑器地址

[MarkTwain](https://zillionare.github.io/marktwain)

注：推荐使用 Chrome 浏览器，效果最佳。

## 功能特性

### Marktwain 新功能

- [x] 支持 common mark 的 Admonition (类似 GFM Alerts)
- [x] 支持将 admonition, fenced block 和 math block 转换成图片，上传图床
- [x] 将转图后的 markdown 替换为图片链接
- [x] 代码加行号功能。

### doocs/md 支持的功能

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
| 1   | 默认                                                   | 否                                                                         | -                                                                                                                      |
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
  - 不填写时使用原始 GitHub 链接

#### 使用示例

配置示例：

- 仓库：`zillionare/imgbed2`
- 分支：`main`
- 仓库内路径：`images/{year}/{month}`
- 域名前缀：`https://fastly.jsdelivr.net/gh/zillionare/imgbed2@main/`

上传后的文件将存储在：

```
github.com/zillionare/imgbed2@main/images/2025/09/1757504316806-538c0834-78c2-4416-bf25-57be7c92f19e.png
```

生成的图片链接：

```
https://fastly.jsdelivr.net/gh/zillionare/imgbed2@main/images/2025/09/1757504316806-538c0834-78c2-4416-bf25-57be7c92f19e.png
```

![demo1](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo1.gif)

![demo2](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo2.gif)

![demo3](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo3.gif)

![demo4](https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/demo4.gif)

## 如何开发和部署

```sh
# 安装 node 版本
nvm i && nvm use

# 安装依赖
pnpm i

# 启动开发模式
pnpm web dev

# 部署在 /md 目录
pnpm web build
# 访问 http://127.0.0.1:9000/md

# 部署在根目录
pnpm web build:h5-netlify
# 访问 http://127.0.0.1:9000/

# Chrome 插件启动及调试
pnpm web ext:dev
# 访问 chrome://extensions/ 打开开发者模式，加载已解压的扩展程序，选择 .output/chrome-mv3-dev 目录

# Chrome 插件打包
pnpm web ext:zip

# Firefox 扩展打包(how to build Firefox addon)
pnpm web firefox:zip # output zip file at in .output/md-{version}-firefox.zip
```

## 快速搭建私有服务

### 方式 1. 使用 npm cli

通过我们的 npm cli 你可以轻易搭建属于自己的微信 Markdown 编辑器。

```sh
# 安装
npm i -g @doocs/md-cli

# 启动
md-cli

# 访问
open http://127.0.0.1:8800/md/

# 启动并指定端口
md-cli port=8899

# 访问
open http://127.0.0.1:8899/md/
```

md-cli 支持以下命令行参数：

- `port` 指定端口号，默认 8800，如果被占用会随机使用一个新端口。
- `spaceId` dcloud 服务空间配置
- `clientSecret` dcloud 服务空间配置

### 方式 2. 使用 Docker 镜像

如果你是 Docker 用户，也可以直接使用一条命令，启动完全属于你的、私有化运行的实例。

```sh
docker run -d -p 8080:80 doocs/md:latest
```

容器运行起来之后，打开浏览器，访问 http://localhost:8080 即可。

关于本项目 Docker 镜像的更多详细信息，可以关注 https://github.com/doocs/docker-md

## 谁在使用

请查看 [USERS.md](USERS.md) 文件，了解使用本项目的公众号。

## 贡献指南

我们欢迎任何形式的贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 获取提交 PR、Issue 的流程与规范。

## 支持我们

如果本项目对你有所帮助，可以通过以下方式支持我们的持续开发。

<table style="margin: 0 auto">
  <tbody>
    <tr>
      <td align="center" style="width: 260px">
        <img
          src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/support1.jpg"
          style="width: 200px"
        /><br />
      </td>
      <td align="center" style="width: 260px">
        <img
          src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/support2.jpg"
          style="width: 200px"
        /><br />
      </td>
    </tr>
  </tbody>
</table>

## 反馈与交流

如果你在使用过程中遇到问题，或者有好的建议，欢迎在 [Issues](https://github.com/zillionare/marktwain/issues) 中反馈。你也可以加入我们的交流群，和我们一起讨论，若群二维码失效，请添加好友，备注 `md`，我们会拉你进群。

<table style="margin: 0 auto">
  <tbody>
    <tr>
      <td align="center" style="width: 260px">
        <img
          src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/doocs-md-wechat-group.jpg"
          style="width: 200px"
        /><br />
      </td>
      <td align="center" style="width: 260px">
        <img
          src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/wechat-ylb.jpg"
          style="width: 200px"
        /><br />
      </td>
    </tr>
  </tbody>
</table>
