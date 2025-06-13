import CryptoJS from 'crypto-js'

/**
 * 图片缓存项接口
 */
interface ImageCacheItem {
  md5: string
  url: string
  uploadTime: number
  lastAccessed: number
  type: string // 图片类型：code, mermaid, math, admonition
  isUploaded: boolean // 是否已上传到GitHub（true=GitHub URL, false=dataURL）
}

/**
 * 图片缓存管理器
 */
class ImageCacheManager {
  private readonly CACHE_KEY = `github_image_cache`
  private readonly CACHE_DURATION = 2 * 24 * 60 * 60 * 1000 // 2天，单位毫秒
  private cache: Map<string, ImageCacheItem> = new Map()

  constructor() {
    this.loadCache()
    this.cleanExpiredCache()
  }

  /**
   * 计算base64内容的MD5值
   */
  private calculateMD5(base64Content: string): string {
    return CryptoJS.MD5(base64Content).toString()
  }

  /**
   * 从localStorage加载缓存
   */
  private loadCache(): void {
    try {
      const cacheData = localStorage.getItem(this.CACHE_KEY)
      if (cacheData) {
        const parsedData = JSON.parse(cacheData)
        this.cache = new Map(Object.entries(parsedData))
        console.log(`Loaded ${this.cache.size} items from image cache`)
      }
    }
    catch (error) {
      console.error(`Failed to load image cache:`, error)
      this.cache = new Map()
    }
  }

  /**
   * 保存缓存到localStorage
   */
  private saveCache(): void {
    try {
      const cacheData = Object.fromEntries(this.cache)
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
      console.log(`Saved ${this.cache.size} items to image cache`)
    }
    catch (error) {
      console.error(`Failed to save image cache:`, error)
    }
  }

  /**
   * 清理过期的缓存项
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [md5, item] of this.cache.entries()) {
      if (now - item.uploadTime > this.CACHE_DURATION) {
        this.cache.delete(md5)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired cache items`)
      this.saveCache()
    }
  }

  /**
   * 检查图片是否已缓存
   */
  public hasImage(base64Content: string): boolean {
    const md5 = this.calculateMD5(base64Content)
    const item = this.cache.get(md5)

    if (!item) {
      return false
    }

    // 检查是否过期
    const now = Date.now()
    if (now - item.uploadTime > this.CACHE_DURATION) {
      this.cache.delete(md5)
      this.saveCache()
      return false
    }

    // 更新最后访问时间
    item.lastAccessed = now
    this.saveCache()
    return true
  }

  /**
   * 获取缓存的图片URL
   */
  public getImageUrl(base64Content: string): string | null {
    const md5 = this.calculateMD5(base64Content)
    const item = this.cache.get(md5)

    if (!item) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - item.uploadTime > this.CACHE_DURATION) {
      this.cache.delete(md5)
      this.saveCache()
      return null
    }

    // 更新最后访问时间
    item.lastAccessed = now
    this.saveCache()

    console.log(`Cache hit for image type: ${item.type}, uploaded: ${new Date(item.uploadTime).toLocaleString()}`)
    return item.url
  }

  /**
   * 缓存新的图片
   */
  public cacheImage(base64Content: string, url: string, type: string, isUploaded: boolean = true): void {
    const md5 = this.calculateMD5(base64Content)
    const now = Date.now()

    const item: ImageCacheItem = {
      md5,
      url,
      uploadTime: now,
      lastAccessed: now,
      type,
      isUploaded,
    }

    this.cache.set(md5, item)
    this.saveCache()

    const status = isUploaded ? `uploaded` : `preview`
    console.log(`Cached new image: type=${type}, status=${status}, md5=${md5.substring(0, 8)}..., url=${url.substring(0, 50)}...`)
  }

  /**
   * 检查图片是否已上传到GitHub
   */
  public isImageUploaded(base64Content: string): boolean {
    const md5 = this.calculateMD5(base64Content)
    const item = this.cache.get(md5)

    if (!item) {
      return false
    }

    // 检查是否过期
    const now = Date.now()
    if (now - item.uploadTime > this.CACHE_DURATION) {
      this.cache.delete(md5)
      this.saveCache()
      return false
    }

    return item.isUploaded
  }

  /**
   * 获取图片的上传状态和URL
   */
  public getImageStatus(base64Content: string): { isUploaded: boolean, url: string | null } {
    const md5 = this.calculateMD5(base64Content)
    const item = this.cache.get(md5)

    if (!item) {
      return { isUploaded: false, url: null }
    }

    // 检查是否过期
    const now = Date.now()
    if (now - item.uploadTime > this.CACHE_DURATION) {
      this.cache.delete(md5)
      this.saveCache()
      return { isUploaded: false, url: null }
    }

    // 更新最后访问时间
    item.lastAccessed = now
    this.saveCache()

    return { isUploaded: item.isUploaded, url: item.url }
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): {
    totalItems: number
    typeBreakdown: Record<string, number>
    oldestItem: Date | null
    newestItem: Date | null
  } {
    const stats = {
      totalItems: this.cache.size,
      typeBreakdown: {} as Record<string, number>,
      oldestItem: null as Date | null,
      newestItem: null as Date | null,
    }

    let oldestTime = Infinity
    let newestTime = 0

    for (const item of this.cache.values()) {
      // 统计类型分布
      stats.typeBreakdown[item.type] = (stats.typeBreakdown[item.type] || 0) + 1

      // 找到最老和最新的项
      if (item.uploadTime < oldestTime) {
        oldestTime = item.uploadTime
        stats.oldestItem = new Date(item.uploadTime)
      }
      if (item.uploadTime > newestTime) {
        newestTime = item.uploadTime
        stats.newestItem = new Date(item.uploadTime)
      }
    }

    return stats
  }

  /**
   * 清空所有缓存
   */
  public clearCache(): void {
    console.log(`Clearing cache, current size: ${this.cache.size}`)

    // 清空内存缓存
    this.cache.clear()

    // 清空localStorage缓存
    try {
      // 先收集所有需要删除的键
      const keysToDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key === this.CACHE_KEY || key.includes(`github_image_cache`))) {
          keysToDelete.push(key)
        }
      }

      // 删除收集到的键
      keysToDelete.forEach((key) => {
        localStorage.removeItem(key)
        console.log(`Removed localStorage key: ${key}`)
      })

      console.log(`Cleared ${keysToDelete.length} localStorage keys`)
    }
    catch (error) {
      console.warn(`Failed to clear localStorage cache:`, error)
    }

    console.log(`Image cache cleared, total items now: ${this.cache.size}`)
  }

  /**
   * 手动清理过期缓存
   */
  public cleanExpired(): number {
    const initialSize = this.cache.size
    this.cleanExpiredCache()
    return initialSize - this.cache.size
  }

  /**
   * 强制重新加载缓存
   */
  public forceReload(): void {
    this.cache.clear()
    this.loadCache()
    console.log(`Cache force reloaded, total items: ${this.cache.size}`)
  }

  /**
   * 彻底清空所有缓存（包括强制刷新）
   */
  public forceClearAll(): void {
    console.log(`Force clearing all cache, current size: ${this.cache.size}`)

    // 清空内存缓存
    this.cache.clear()

    // 彻底清空localStorage
    try {
      // 方法1: 直接删除主键
      localStorage.removeItem(this.CACHE_KEY)

      // 方法2: 遍历所有localStorage键并删除相关的
      const allKeys = Object.keys(localStorage)
      const cacheKeys = allKeys.filter(key =>
        key === this.CACHE_KEY
        || key.includes(`github_image_cache`)
        || key.includes(`image_cache`)
        || key.includes(`cache`)
        || key.includes(`image_mode`)
        || key.includes(`original_content`)
        || key.includes(`image_content`)
        || key.includes(`content_hash`)
        || key.includes(`vueuse-`), // VueUse的存储键前缀
      )

      cacheKeys.forEach((key) => {
        localStorage.removeItem(key)
        console.log(`Force removed key: ${key}`)
      })

      console.log(`Force cleared ${cacheKeys.length} localStorage keys`)

      // 方法3: 如果还有问题，清空所有localStorage（谨慎使用）
      if (this.cache.size > 0) {
        console.warn(`Memory cache still has items, performing nuclear clear...`)
        this.cache = new Map()
      }
    }
    catch (error) {
      console.error(`Failed to force clear cache:`, error)
      // 最后手段：重新创建缓存实例
      this.cache = new Map()
    }

    console.log(`Force clear completed, final size: ${this.cache.size}`)
  }

  /**
   * 超级清空 - 清空所有可能的缓存和状态
   */
  public nuclearClear(): void {
    console.log(`Nuclear clear initiated...`)

    // 清空内存缓存
    this.cache.clear()

    // 获取所有localStorage键
    const allKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key)
        allKeys.push(key)
    }

    console.log(`Found ${allKeys.length} localStorage keys:`, allKeys)

    // 删除所有可能相关的键
    const keysToDelete = allKeys.filter(key =>
      key.includes(`cache`)
      || key.includes(`image`)
      || key.includes(`content`)
      || key.includes(`hash`)
      || key.includes(`mode`)
      || key.includes(`vueuse`)
      || key.includes(`md-`)
      || key.startsWith(`github_`),
    )

    keysToDelete.forEach((key) => {
      localStorage.removeItem(key)
      console.log(`Nuclear removed: ${key}`)
    })

    // 强制重新创建缓存实例
    this.cache = new Map()

    console.log(`Nuclear clear completed. Removed ${keysToDelete.length} keys.`)
  }
}

// 创建全局实例
export const imageCache = new ImageCacheManager()

// 导出类型
export type { ImageCacheItem }
