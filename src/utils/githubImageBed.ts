/**
 * GitHub图床实现
 * 支持从环境变量读取配置，上传图片到GitHub仓库，并触发GitHub Pages构建
 */

interface GitHubImageBedConfig {
  repo: string
  branch: string
  token: string
  basePath: string
  baseUrl: string
}

interface GitHubApiResponse {
  content: {
    download_url: string
    sha: string
  }
}

/**
 * 获取GitHub图床配置
 * 优先从环境变量读取，如果没有则使用默认配置
 */
function getGitHubImageBedConfig(): GitHubImageBedConfig {
  // 从环境变量读取配置
  const envRepo = import.meta.env.VITE_GITHUB_IMAGE_REPO
  const envBranch = import.meta.env.VITE_GITHUB_IMAGE_BRANCH
  const envToken = import.meta.env.VITE_GITHUB_IMAGE_TOKEN
  const envBasePath = import.meta.env.VITE_GITHUB_IMAGE_BASE_PATH
  const envBaseUrl = import.meta.env.VITE_GITHUB_IMAGE_BASE_URL

  // 如果环境变量存在，使用环境变量
  if (envRepo && envBranch && envToken && envBasePath && envBaseUrl) {
    return {
      repo: envRepo,
      branch: envBranch,
      token: envToken,
      basePath: envBasePath,
      baseUrl: envBaseUrl,
    }
  }

  // 否则使用默认配置（需要在环境变量中设置token）
  return {
    repo: `zillionare/images`,
    branch: `main`,
    token: ``, // 需要通过环境变量VITE_GITHUB_IMAGE_TOKEN设置
    basePath: `images/{year}/{month}/`,
    baseUrl: `https://images.jieyu.ai`,
  }
}

/**
 * 生成存储路径
 * 支持year和month变量替换
 */
function generateStoragePath(basePath: string, filename: string): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, `0`)

  const path = basePath
    .replace(`{year}`, year)
    .replace(`{month}`, month)

  return `${path}${filename}`
}

/**
 * 生成唯一文件名
 */
function generateUniqueFilename(prefix: string, extension: string = `png`): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}.${extension}`
}

/**
 * 上传图片到GitHub仓库
 */
async function uploadToGitHub(
  config: GitHubImageBedConfig,
  content: string,
  path: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${config.repo}/contents/${path}`

  const response = await fetch(url, {
    method: `PUT`,
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': `application/vnd.github.v3+json`,
      'Content-Type': `application/json`,
    },
    body: JSON.stringify({
      message: `Upload image: ${path}`,
      content,
      branch: config.branch,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const result: GitHubApiResponse = await response.json()
  return result.content.download_url
}

/**
 * 触发GitHub Pages构建
 * 通过创建一个空的commit来触发构建
 */
async function triggerGitHubPagesBuild(config: GitHubImageBedConfig): Promise<void> {
  try {
    // 获取最新的commit SHA
    const refUrl = `https://api.github.com/repos/${config.repo}/git/refs/heads/${config.branch}`
    const refResponse = await fetch(refUrl, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: `application/vnd.github.v3+json`,
      },
    })

    if (!refResponse.ok) {
      console.warn(`Failed to get latest commit SHA for Pages build trigger`)
      return
    }

    const refData = await refResponse.json()
    const latestSha = refData.object.sha

    // 创建一个空的commit来触发构建
    const commitUrl = `https://api.github.com/repos/${config.repo}/git/commits`
    const commitResponse = await fetch(commitUrl, {
      method: `POST`,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': `application/vnd.github.v3+json`,
        'Content-Type': `application/json`,
      },
      body: JSON.stringify({
        message: `Trigger GitHub Pages build`,
        tree: latestSha,
        parents: [latestSha],
      }),
    })

    if (commitResponse.ok) {
      const commitData = await commitResponse.json()

      // 更新分支引用
      await fetch(refUrl, {
        method: `PATCH`,
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': `application/vnd.github.v3+json`,
          'Content-Type': `application/json`,
        },
        body: JSON.stringify({
          sha: commitData.sha,
        }),
      })
    }
  }
  catch (error) {
    console.warn(`Failed to trigger GitHub Pages build:`, error)
  }
}

/**
 * 生成最终的访问URL
 */
function generateAccessUrl(config: GitHubImageBedConfig, path: string): string {
  return `${config.baseUrl}/${path}`
}

/**
 * 等待图片可访问
 * GitHub Pages需要一些时间来构建和部署
 */
async function waitForImageAvailable(url: string, maxAttempts: number = 12, interval: number = 10000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { method: `HEAD` })
      if (response.ok) {
        return true
      }
    }
    catch {
      // 忽略网络错误，继续重试
    }

    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  return false
}

/**
 * 验证图片内容
 * 通过比较图片大小来简单验证
 */
async function validateImageContent(url: string, originalSize: number): Promise<boolean> {
  try {
    const response = await fetch(url, { method: `HEAD` })
    if (!response.ok)
      return false

    const contentLength = response.headers.get(`content-length`)
    if (!contentLength)
      return true // 如果无法获取大小，假设正确

    const remoteSize = Number.parseInt(contentLength, 10)
    // 允许10%的大小差异（由于压缩等因素）
    const sizeDiff = Math.abs(remoteSize - originalSize) / originalSize
    return sizeDiff <= 0.1
  }
  catch {
    console.warn(`Failed to validate image content`)
    return false
  }
}

/**
 * 主要的上传函数
 */
export async function uploadImageToGitHub(
  base64Content: string,
  _filename: string,
  prefix: string = `image`,
): Promise<string> {
  const config = getGitHubImageBedConfig()

  // 生成唯一文件名
  const uniqueFilename = generateUniqueFilename(prefix)

  // 生成存储路径
  const storagePath = generateStoragePath(config.basePath, uniqueFilename)

  try {
    // 上传到GitHub
    console.log(`Uploading image to GitHub: ${storagePath}`)
    await uploadToGitHub(config, base64Content, storagePath)

    // 触发GitHub Pages构建
    console.log(`Triggering GitHub Pages build...`)
    await triggerGitHubPagesBuild(config)

    // 生成访问URL
    const accessUrl = generateAccessUrl(config, storagePath)

    // 等待图片可访问
    console.log(`Waiting for image to be available...`)
    const isAvailable = await waitForImageAvailable(accessUrl)

    if (!isAvailable) {
      console.warn(`Image may not be immediately available, but upload was successful`)
    }

    // 验证图片内容（可选）
    if (isAvailable) {
      // 计算原始内容大小（base64解码后的大小）
      const originalSize = Math.ceil(base64Content.length * 0.75)
      const isValid = await validateImageContent(accessUrl, originalSize)
      if (!isValid) {
        console.warn(`Image content validation failed`)
      }
    }

    console.log(`Image uploaded successfully: ${accessUrl}`)
    return accessUrl
  }
  catch (error) {
    console.error(`Failed to upload image to GitHub:`, error)
    throw error
  }
}

/**
 * 获取配置信息（用于调试）
 */
export function getConfigInfo(): Omit<GitHubImageBedConfig, `token`> {
  const config = getGitHubImageBedConfig()
  return {
    repo: config.repo,
    branch: config.branch,
    basePath: config.basePath,
    baseUrl: config.baseUrl,
    token: `***`, // 隐藏token
  } as any
}
