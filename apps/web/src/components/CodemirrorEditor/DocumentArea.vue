<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { ref, watch } from 'vue'
import { useDisplayStore } from '@/stores'

const displayStore = useDisplayStore()
const documentContent = ref(``)
const isLoading = ref(false)
const error = ref(``)

// Load README.md content
async function loadDocument() {
  isLoading.value = true
  error.value = ``
  try {
    const response = await fetch(`/README.md`)
    if (response.ok) {
      const markdown = await response.text()
      // Convert markdown to HTML using marked
      let html = marked.parse(markdown) as string
      // Sanitize HTML for security
      html = DOMPurify.sanitize(html)
      documentContent.value = html
    }
    else {
      error.value = `无法加载文档内容`
    }
  }
  catch (err) {
    console.error(`Failed to load document:`, err)
    error.value = `加载文档时出现错误`
  }
  finally {
    isLoading.value = false
  }
}

// Load document when component is shown
watch(() => displayStore.isShowDocumentArea, (isShow) => {
  if (isShow && !documentContent.value) {
    loadDocument()
  }
})
</script>

<template>
  <div v-if="displayStore.isShowDocumentArea" class="document-area">
    <!-- Document Content -->
    <div class="document-content">
      <div v-if="isLoading" class="loading">
        <div class="text-gray-500">
          加载中...
        </div>
      </div>

      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
      </div>

      <div
        v-else
        class="prose prose-sm max-w-none dark:prose-invert"
        v-html="documentContent"
      />
    </div>
  </div>
</template>

<style scoped>
.document-area {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.document-content {
   flex: 1;
   overflow: auto;
   padding: 24px;
   max-width: 1024px;
   margin: 0 auto;
 }

.loading, .error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
}

.error {
  color: #dc2626;
}

/* Custom styles for markdown content */
.prose {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.prose h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  margin-top: 1.5rem;
}

.prose h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  margin-top: 1.25rem;
}

.prose h3 {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.prose p {
  margin-bottom: 0.75rem;
  line-height: 1.625;
}

.prose ul, .prose ol {
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
}

.prose li {
  margin-bottom: 0.25rem;
}

.prose code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.prose pre {
  background-color: #f3f4f6;
  padding: 0.75rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.prose blockquote {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  font-style: italic;
  margin-bottom: 0.75rem;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

.prose th, .prose td {
  border: 1px solid #d1d5db;
  padding: 0.75rem;
  text-align: left;
}

.prose th {
  background-color: #f9fafb;
  font-weight: 500;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 0.25rem;
}

.prose a {
  color: #2563eb;
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .document-area {
    background: #1f2937;
  }

  .prose code {
    background-color: #374151;
  }

  .prose pre {
    background-color: #374151;
  }

  .prose th {
    background-color: #374151;
  }

  .prose a {
    color: #60a5fa;
  }
}
</style>
