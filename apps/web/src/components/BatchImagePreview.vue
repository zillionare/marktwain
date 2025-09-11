<script setup lang="ts">
import type { ImageItem } from '@/composables/useBatchImagePreview'
import { batchImagePreviewState, useBatchImagePreview } from '@/composables/useBatchImagePreview'
import { useStore } from '@/stores'

const {
  hideBatchPreview,
  uploadImage,
  uploadAllImages,
  retryUpload,
  downloadImage,
  totalImages,
  uploadedCount,
  uploadingCount,
} = useBatchImagePreview()

const { replaceBlocksWithImageLinks } = useStore()

function handleOverlayClick() {
  hideBatchPreview()
}

function close() {
  hideBatchPreview()
}

// 新增图片替换功能
async function handleImageReplacement() {
  const success = await replaceBlocksWithImageLinks()
  if (success) {
    hideBatchPreview()
    // 通知父组件切换到 v1 模式
    const event = new CustomEvent(`switchToV1`, {
      detail: { switchToV1: true },
    })
    window.dispatchEvent(event)
  }
}

function handleImageLoad() {
  console.log(`图片加载完成`)
}

function handleImageError() {
  console.error(`图片加载失败`)
}

function getStatusClass(imageItem: ImageItem): string {
  if (imageItem.uploaded)
    return `status-uploaded`
  if (imageItem.uploading)
    return `status-uploading`
  if (imageItem.error)
    return `status-error`
  return `status-pending`
}

function getStatusText(imageItem: ImageItem): string {
  if (imageItem.uploaded)
    return `已上传`
  if (imageItem.uploading)
    return `上传中`
  if (imageItem.error)
    return `上传失败`
  return `待上传`
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes)
    return `未知大小`
  if (bytes < 1024)
    return `${bytes} B`
  const kb = bytes / 1024
  return `${kb.toFixed(1)} KB`
}

// 格式化URL显示
function formatUrl(url: string): string {
  if (url.length <= 50)
    return url
  const start = url.substring(0, 25)
  const end = url.substring(url.length - 20)
  return `${start}...${end}`
}
</script>

<template>
  <div v-if="batchImagePreviewState.visible" class="batch-image-preview-overlay" @click="handleOverlayClick">
    <div class="batch-image-preview-container" @click.stop>
      <!-- 头部 -->
      <div class="batch-image-preview-header">
        <div class="header-left">
          <h3 class="batch-image-preview-title">
            图片预览
          </h3>
          <div class="image-stats">
            <span class="stats-text">
              共 {{ totalImages }} 张图片
              <span v-if="uploadedCount > 0">，已上传 {{ uploadedCount }} 张</span>
              <span v-if="uploadingCount > 0">，上传中 {{ uploadingCount }} 张</span>
            </span>
          </div>
        </div>
        <div class="header-right">
          <button
            v-if="!batchImagePreviewState.processing && totalImages > 0 && uploadingCount === 0 && uploadedCount < totalImages"
            class="header-upload-all-btn"
            @click="uploadAllImages"
          >
            <div v-if="uploadingCount > 0" class="btn-loading">
              <div class="btn-spinner" />
              全部上传中...
            </div>
            <div v-else class="btn-content">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              全部上传
            </div>
          </button>
          <button class="batch-image-preview-close" aria-label="关闭预览" @click="close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="batch-image-preview-content">
        <!-- 图片列表 -->
        <div class="image-list">
          <div
            v-for="imageItem in batchImagePreviewState.images"
            :key="imageItem.id"
            class="image-item"
          >
            <!-- 左侧图片 -->
            <div class="image-item-preview">
              <img
                :src="imageItem.imageUrl"
                :alt="imageItem.altText"
                class="image-item-image"
                @load="handleImageLoad"
                @error="handleImageError"
              >
            </div>

            <!-- 右侧信息和操作区 -->
            <div class="image-item-info">
              <div class="image-item-meta">
                <div class="meta-row">
                  <span class="meta-label">ID:</span>
                  <span class="meta-value">{{ imageItem.id }}</span>
                </div>
                <div v-if="imageItem.startLine && imageItem.endLine" class="meta-row">
                  <span class="meta-label">起止行:</span>
                  <span class="meta-value">{{ imageItem.startLine }}-{{ imageItem.endLine }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">大小:</span>
                  <span class="meta-value">{{ formatFileSize(imageItem.fileSize) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">内容 Hash:</span>
                  <span class="meta-value hash-value">{{ imageItem.contentHash }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">状态:</span>
                  <span class="meta-value status-value" :class="getStatusClass(imageItem)">
                    {{ getStatusText(imageItem) }}
                  </span>
                </div>
                <div v-if="imageItem.uploaded && imageItem.imageUrl.startsWith('http')" class="meta-row">
                  <span class="meta-label">链接:</span>
                  <span class="meta-value link-value">
                    <a :href="imageItem.imageUrl" target="_blank" class="upload-link">{{ formatUrl(imageItem.imageUrl) }}</a>
                  </span>
                </div>
                <div v-if="imageItem.error" class="meta-row error-row">
                  <span class="meta-label">错误:</span>
                  <span class="meta-value error-value">{{ imageItem.error }}</span>
                </div>
              </div>

              <div class="image-item-actions">
                <button
                  class="action-btn download-btn"
                  :disabled="!imageItem.imageUrl"
                  @click="downloadImage(imageItem.id)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  下载
                </button>

                <button
                  v-if="!imageItem.uploaded"
                  class="action-btn upload-btn"
                  :class="{ 'retry-btn': imageItem.error }"
                  :disabled="imageItem.uploading || !imageItem.imageUrl"
                  @click="imageItem.error ? retryUpload(imageItem.id) : uploadImage(imageItem.id)"
                >
                  <div v-if="imageItem.uploading" class="btn-loading">
                    <div class="btn-spinner" />
                    上传中...
                  </div>
                  <div v-else class="btn-content">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path v-if="imageItem.error" d="M4 12l1.41 1.41L11 7.83l5.59 5.58L18 12l-7-7z" />
                      <template v-else>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17,8 12,3 7,8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </template>
                    </svg>
                    {{ imageItem.error ? '重试' : '上传' }}
                  </div>
                </button>

                <div v-else class="uploaded-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  已上传
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div v-if="!batchImagePreviewState.processing && totalImages > 0" class="batch-image-preview-actions">
        <button
          class="action-btn secondary-btn"
          @click="close"
        >
          取消
        </button>
        <button
          v-if="uploadedCount > 0"
          class="action-btn primary-btn"
          @click="handleImageReplacement"
        >
          生成转图后 MD
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.batch-image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.batch-image-preview-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 90vw;
  max-height: 90vh;
  width: 1024px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.batch-image-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.batch-image-preview-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.image-stats {
  font-size: 14px;
  color: #6b7280;
}

.stats-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-upload-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background-color: #3b82f6;
  color: white;
  min-width: 120px;
  justify-content: center;
}

.header-upload-all-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.header-upload-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.batch-image-preview-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s;
}

.batch-image-preview-close:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.batch-image-preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.processing-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #6b7280;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.image-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.2s;
}

.image-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.image-item-preview {
  flex-shrink: 0;
  width: 60%;
  border-radius: 6px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.image-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  align-items: center;
}

.image-item-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.meta-label {
  font-weight: 500;
  color: #374151;
  min-width: 80px;
}

.meta-value {
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.hash-value {
  word-break: break-all;
  max-width: 200px;
}

.status-value {
  font-weight: 500;
}

.status-pending {
  color: #f59e0b;
}

.status-uploading {
  color: #3b82f6;
}

.status-uploaded {
  color: #10b981;
}

.status-error {
  color: #ef4444;
}

.error-row {
  background-color: #fef2f2;
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid #ef4444;
}

.error-value {
  color: #dc2626;
  font-weight: 500;
  word-break: break-word;
}

.link-value {
  word-break: break-all;
  max-width: 200px;
}

.upload-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 12px;
  transition: color 0.2s;
}

.upload-link:hover {
  color: #2563eb;
  text-decoration: underline;
}

.image-item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 80px;
  justify-content: center;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-btn {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.download-btn:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.upload-btn {
  background-color: #3b82f6;
  color: white;
}

.upload-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.upload-btn.retry-btn {
  background-color: #f59e0b;
  color: white;
}

.upload-btn.retry-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.uploaded-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #10b981;
  font-size: 13px;
  font-weight: 500;
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.batch-image-preview-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.secondary-btn {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.secondary-btn:hover {
  background-color: #e5e7eb;
}

.primary-btn {
  background-color: #3b82f6;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.success-btn {
  background-color: #10b981;
  color: white;
}

.success-btn:hover:not(:disabled) {
  background-color: #059669;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .batch-image-preview-container {
    background: #1f2937;
    color: #f9fafb;
  }

  .batch-image-preview-title {
    color: #f9fafb;
  }

  .batch-image-preview-close {
    color: #9ca3af;
  }

  .batch-image-preview-close:hover {
    background-color: #374151;
    color: #d1d5db;
  }

  .header-upload-all-btn {
    background-color: #3b82f6;
    color: white;
  }

  .header-upload-all-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .batch-image-preview-header,
  .batch-image-preview-actions {
    border-color: #374151;
  }

  .image-stats {
    color: #9ca3af;
  }

  .image-item {
    background: #374151;
    border-color: #4b5563;
  }

  .image-item:hover {
    background: #4b5563;
    border-color: #6b7280;
  }

  .image-item-preview {
    background: #1f2937;
  }

  .meta-label {
    color: #d1d5db;
  }

  .meta-value {
    color: #9ca3af;
  }

  .download-btn {
    background-color: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }

  .download-btn:hover:not(:disabled) {
    background-color: #4b5563;
  }

  .secondary-btn {
    background-color: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }

  .secondary-btn:hover {
    background-color: #4b5563;
  }

  .success-btn {
    background-color: #10b981;
    color: white;
  }

  .success-btn:hover:not(:disabled) {
    background-color: #059669;
  }
}
</style>
