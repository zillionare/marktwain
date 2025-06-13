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
  public cacheImage(base64Content: string, url: string, type: string): void {
    const md5 = this.calculateMD5(base64Content)
    const now = Date.now()

    const item: ImageCacheItem = {
      md5,
      url,
      uploadTime: now,
      lastAccessed: now,
      type,
    }

    this.cache.set(md5, item)
    this.saveCache()

    console.log(`Cached new image: type=${type}, md5=${md5.substring(0, 8)}..., url=${url}`)
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
    this.cache.clear()
    localStorage.removeItem(this.CACHE_KEY)
    // 强制清空localStorage中的所有相关项
    try {
      localStorage.removeItem(this.CACHE_KEY)
      // 清空所有可能的缓存键变体
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(`github_image_cache`)) {
          localStorage.removeItem(key)
        }
      }
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
}

// 创建全局实例
export const imageCache = new ImageCacheManager()

// 导出类型
export type { ImageCacheItem }
