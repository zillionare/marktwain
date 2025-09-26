<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
defineEmits<{
  close: []
}>()

const documentContent = ref(``)
const isLoading = ref(false)

// Load README.md content
async function loadDocument() {
  isLoading.value = true
  try {
    // Fetch README.md from project root (considering base path)
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
      documentContent.value = `<p>无法加载文档内容</p>`
    }
  }
  catch (error) {
    console.error(`Failed to load document:`, error)
    documentContent.value = `<p>加载文档时出现错误</p>`
  }
  finally {
    isLoading.value = false
  }
}

// Load document when dialog becomes visible
watch(() => props.visible, (visible) => {
  if (visible && !documentContent.value) {
    loadDocument()
  }
})
</script>

<template>
  <Dialog :open="visible" @update:open="(open) => !open && $emit('close')">
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>项目文档</DialogTitle>
      </DialogHeader>

      <div class="flex-1 overflow-auto">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="text-gray-500">
            加载中...
          </div>
        </div>

        <div
          v-else
          class="prose prose-sm max-w-none dark:prose-invert"
          v-html="documentContent"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('close')">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
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
