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
 * 优先从store设置读取，如果没有则从环境变量读取，最后使用默认配置
 */
function getGitHubImageBedConfig(storeConfig?: Partial<GitHubImageBedConfig>): GitHubImageBedConfig {
  // 从环境变量读取配置
  const envRepo = import.meta.env.VITE_GITHUB_IMAGE_REPO
  const envBranch = import.meta.env.VITE_GITHUB_IMAGE_BRANCH
  const envToken = import.meta.env.VITE_GITHUB_IMAGE_TOKEN
  const envBasePath = import.meta.env.VITE_GITHUB_IMAGE_BASE_PATH
  const envBaseUrl = import.meta.env.VITE_GITHUB_IMAGE_BASE_URL

  // 优先级：store设置 > 环境变量 > 默认值
  const config = {
    repo: storeConfig?.repo || envRepo || `zillionare/images`,
    branch: storeConfig?.branch || envBranch || `main`,
    token: storeConfig?.token || envToken || ``, // 必须设置
    basePath: storeConfig?.basePath || envBasePath || `images/{year}/{month}/`,
    baseUrl: storeConfig?.baseUrl || envBaseUrl || `https://images.jieyu.ai`,
  }

  // 验证token是否存在
  if (!config.token || config.token === ``) {
    throw new Error(`GitHub token is required. Please set it in settings or VITE_GITHUB_IMAGE_TOKEN environment variable.`)
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
 * 上传图片到GitHub仓库（带重试机制）
 */
async function uploadToGitHub(
  config: GitHubImageBedConfig,
  content: string,
  path: string,
  retryCount: number = 0,
): Promise<string> {
  const url = `https://api.github.com/repos/${config.repo}/contents/${path}`

  try {
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

      // 如果是409冲突错误且重试次数少于3次，则重试
      if (response.status === 409 && retryCount < 3) {
        console.warn(`GitHub API conflict (409), retrying in ${(retryCount + 1) * 1000}ms...`)
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000))

        // 生成新的文件名避免冲突
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        const pathParts = path.split(`/`)
        const fileName = pathParts.pop()!
        const fileNameParts = fileName.split(`.`)
        const extension = fileNameParts.pop()
        const baseName = fileNameParts.join(`.`)
        const newFileName = `${baseName}-${timestamp}-${randomSuffix}.${extension}`
        const newPath = [...pathParts, newFileName].join(`/`)

        console.log(`Retrying with new path: ${newPath}`)
        return await uploadToGitHub(config, content, newPath, retryCount + 1)
      }

      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result: GitHubApiResponse = await response.json()
    return result.content.download_url
  }
  catch (error) {
    if (retryCount < 2 && !(error instanceof Error && error.message.includes(`409`))) {
      console.warn(`Upload failed, retrying in ${(retryCount + 1) * 1000}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000))
      return await uploadToGitHub(config, content, path, retryCount + 1)
    }
    throw error
  }
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
export function generateImageUrl(prefix: string = `image`, storeConfig?: Partial<GitHubImageBedConfig>): string {
  const config = getGitHubImageBedConfig(storeConfig)
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
  storeConfig?: Partial<GitHubImageBedConfig>,
): Promise<string> {
  try {
    const config = getGitHubImageBedConfig(storeConfig)

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

    // 同步上传（等待完成）
    console.log(`Uploading image to GitHub: ${storagePath}`)
    await uploadToGitHub(config, base64Content, storagePath)

    console.log(`Image uploaded successfully: ${accessUrl}`)
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
export function getConfigInfo(storeConfig?: Partial<GitHubImageBedConfig>): GitHubImageBedConfig & { token: string } {
  try {
    const config = getGitHubImageBedConfig(storeConfig)
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
export async function testGitHubConnection(storeConfig?: Partial<GitHubImageBedConfig>): Promise<{ success: boolean, message: string }> {
  try {
    const config = getGitHubImageBedConfig(storeConfig)

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
