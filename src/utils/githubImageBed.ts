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

  // 使用环境变量或默认值
  const config = {
    repo: envRepo || `zillionare/images`,
    branch: envBranch || `main`,
    token: envToken || ``, // 必须通过环境变量设置
    basePath: envBasePath || `images/{year}/{month}/`,
    baseUrl: envBaseUrl || `https://images.jieyu.ai`,
  }

  // 验证token是否存在
  if (!config.token || config.token === ``) {
    throw new Error(`GitHub token is required. Please set VITE_GITHUB_IMAGE_TOKEN environment variable.`)
  }

  return config
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
 * 生成最终的访问URL
 */
function generateAccessUrl(config: GitHubImageBedConfig, path: string): string {
  return `${config.baseUrl}/${path}`
}

/**
 * 从URL提取存储路径
 */
function extractStoragePathFromUrl(url: string, baseUrl: string): string {
  return url.replace(`${baseUrl}/`, ``)
}

/**
 * 预生成图片URL（不等待上传完成）
 */
export function generateImageUrl(prefix: string = `image`): string {
  const config = getGitHubImageBedConfig()
  const uniqueFilename = generateUniqueFilename(prefix)
  const storagePath = generateStoragePath(config.basePath, uniqueFilename)
  return generateAccessUrl(config, storagePath)
}

/**
 * 异步上传图片到GitHub（不阻塞返回）
 */
export async function uploadImageToGitHubAsync(
  base64Content: string,
  targetUrl: string,
): Promise<void> {
  try {
    const config = getGitHubImageBedConfig()

    // 验证base64内容
    if (!base64Content || base64Content.length === 0) {
      throw new Error(`Base64 content is empty`)
    }

    // 从目标URL提取存储路径
    const storagePath = extractStoragePathFromUrl(targetUrl, config.baseUrl)

    // 异步上传到GitHub
    console.log(`Uploading image to GitHub asynchronously: ${storagePath}`)
    await uploadToGitHub(config, base64Content, storagePath)

    console.log(`Image uploaded successfully: ${targetUrl}`)
  }
  catch (error) {
    console.error(`Failed to upload image to GitHub:`, error)
    // 不抛出错误，避免影响用户体验
  }
}

/**
 * 主要的上传函数（修改为立即返回URL）
 */
export async function uploadImageToGitHub(
  base64Content: string,
  _filename: string,
  prefix: string = `image`,
): Promise<string> {
  try {
    const config = getGitHubImageBedConfig()

    // 验证base64内容
    if (!base64Content || base64Content.length === 0) {
      throw new Error(`Base64 content is empty`)
    }

    // 生成唯一文件名
    const uniqueFilename = generateUniqueFilename(prefix)

    // 生成存储路径
    const storagePath = generateStoragePath(config.basePath, uniqueFilename)

    // 生成访问URL
    const accessUrl = generateAccessUrl(config, storagePath)

    // 异步上传（不等待完成）
    uploadImageToGitHubAsync(base64Content, accessUrl)

    console.log(`Image URL generated: ${accessUrl}`)
    return accessUrl
  }
  catch (error) {
    console.error(`Failed to upload image to GitHub:`, error)

    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes(`401`)) {
        throw new Error(`GitHub authentication failed. Please check your VITE_GITHUB_IMAGE_TOKEN environment variable.`)
      }
      if (error.message.includes(`403`)) {
        throw new Error(`GitHub access forbidden. Your token needs "Contents: Write" permission. Please regenerate your token with proper permissions.`)
      }
      if (error.message.includes(`Resource not accessible by personal access token`)) {
        throw new Error(`Token permission insufficient. Please ensure your GitHub token has "repo" or "Contents: Write" permission.`)
      }
      if (error.message.includes(`404`)) {
        throw new Error(`GitHub repository not found. Please check VITE_GITHUB_IMAGE_REPO configuration.`)
      }
    }

    throw error
  }
}

/**
 * 获取配置信息（用于调试）
 */
export function getConfigInfo(): GitHubImageBedConfig & { token: string } {
  try {
    const config = getGitHubImageBedConfig()
    return {
      repo: config.repo,
      branch: config.branch,
      basePath: config.basePath,
      baseUrl: config.baseUrl,
      token: config.token ? `***` : `NOT_SET`,
    }
  }
  catch (error) {
    console.error(`Failed to get GitHub config:`, error)
    return {
      repo: `ERROR`,
      branch: `ERROR`,
      basePath: `ERROR`,
      baseUrl: `ERROR`,
      token: `ERROR`,
    }
  }
}

/**
 * 测试GitHub API连接
 */
export async function testGitHubConnection(): Promise<{ success: boolean, message: string }> {
  try {
    const config = getGitHubImageBedConfig()

    // 测试仓库访问
    const response = await fetch(`https://api.github.com/repos/${config.repo}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: `application/vnd.github.v3+json`,
      },
    })

    if (response.ok) {
      const repoData = await response.json()
      return {
        success: true,
        message: `Successfully connected to ${repoData.full_name}`,
      }
    }
    else {
      const errorData = await response.json()
      return {
        success: false,
        message: `GitHub API error: ${response.status} - ${errorData.message}`,
      }
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : `Unknown error`}`,
    }
  }
}
