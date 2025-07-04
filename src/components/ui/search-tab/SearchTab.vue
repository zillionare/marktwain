<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import type CodeMirror from 'codemirror'
import { ChevronDown, ChevronRight, ChevronUp, Replace, ReplaceAll, X } from 'lucide-vue-next'

const props = defineProps<{
  editor: CodeMirror.Editor
}>()

const showSearchTab = ref(false)

const searchWord = ref(``)
const indexOfMatch = ref(0)
const showReplace = ref(false)
const replaceWord = ref(``)

const matchPositions = ref<CodeMirror.Position[][]>([])
const numberOfMatches = computed(() => {
  return matchPositions.value.length
})

const currentMatchPosition = computed(() => {
  if (!checkMatchNumber())
    return null
  return matchPositions.value[indexOfMatch.value]
})

watch(searchWord, () => {
  const debouncedSearch = useDebounceFn(() => {
    matchPositions.value = []

    if (searchWord.value === ``) {
      clearAllMarks()
    }
    else {
      indexOfMatch.value = 0
      findAllMatches()
    }
  }, 300)

  debouncedSearch()
})

watch([indexOfMatch, matchPositions], () => {
  markMatch()
})

watch(showSearchTab, async () => {
  if (!showSearchTab.value) {
    clearAllMarks()
  }
  else {
    markMatch()
  }
})

function clearAllMarks() {
  const editor = props.editor
  editor.getAllMarks().forEach(mark => mark.clear())
}

function markMatch() {
  const editor = props.editor
  clearAllMarks()
  matchPositions.value.forEach((pos, i) => {
    editor.markText(pos[0], pos[1], { className: i === indexOfMatch.value
      ? `current-match`
      : `search-match` })
  })
  if (matchPositions.value[indexOfMatch.value]?.[0])
    editor.scrollIntoView(matchPositions.value[indexOfMatch.value][0])
}

function findAllMatches() {
  const editor = props.editor
  if (!searchWord.value || !showSearchTab.value)
    return

  // 获取所有匹配项
  const cursor = editor.getSearchCursor(searchWord.value, undefined, true)
  let matchCount = 0
  const _matchPositions: CodeMirror.Position[][] = []
  while (cursor.findNext()) {
    _matchPositions.push([cursor.from(), cursor.to()])
    matchCount++
  }
  matchPositions.value = _matchPositions
  if (matchCount === indexOfMatch.value) {
    indexOfMatch.value -= 1
  }
}

function nextMatch() {
  if (!checkMatchNumber())
    return
  indexOfMatch.value = (indexOfMatch.value + 1) % numberOfMatches.value
}
function prevMatch() {
  if (!checkMatchNumber())
    return
  indexOfMatch.value = (indexOfMatch.value - 1 + numberOfMatches.value) % numberOfMatches.value
}

function toggleShowReplace() {
  showReplace.value = !showReplace.value
}

function closeSearchTab() {
  showSearchTab.value = false
}

function handleSearchInputKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case `Enter`:
      nextMatch()
      e.preventDefault()
  }
}

function handleReplaceInputKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case `Enter`:
      handleReplace()
      e.preventDefault()
  }
}

function handleReplace() {
  if (!checkMatchNumber())
    return
  const editor = props.editor
  if (!currentMatchPosition.value)
    return
  editor.setSelection(currentMatchPosition.value[0], currentMatchPosition.value[1])
  props.editor.replaceSelection(replaceWord.value)
  findAllMatches()
}

function handleReplaceAll() {
  if (!checkMatchNumber())
    return
  const editor = props.editor
  if (!currentMatchPosition.value)
    return
  matchPositions.value.forEach((pos) => {
    editor.setSelection(pos[0], pos[1])
    editor.replaceSelection(replaceWord.value)
  })
  findAllMatches()
}

function handleEditorChange() {
  const debouncedSearch = useDebounceFn(findAllMatches, 300)
  debouncedSearch()
}

function setSearchWord(word: string) {
  searchWord.value = word
  if (!showSearchTab.value) {
    showSearchTab.value = true
  }
}

onMounted(() => {
  const editor = props.editor
  editor.on(`changes`, handleEditorChange)
})
onUnmounted(() => {
  props.editor.off(`changes`, handleEditorChange)
})

/**
 * 检查是否有匹配项
 * 返回 false 表示没有匹配项
 * 返回 true 表示有匹配项
 */
function checkMatchNumber(): boolean {
  return numberOfMatches.value > 0
}

defineExpose({
  showSearchTab,
  searchWord,
  setSearchWord,
  handleEditorChange,
})
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="showSearchTab"
      class="bg-background absolute right-0 top-0 z-50 min-w-[300px] w-fit flex gap-1 border rounded-lg px-2 py-1 shadow-md transition-all"
      :class="showReplace ? 'items-start' : 'items-center'"
    >
      <!-- 折叠/展开按钮 -->
      <Button
        variant="ghost"
        title="切换替换"
        aria-label="切换替换"
        class="h-7 w-5 flex items-center justify-center p-0"
        @click="toggleShowReplace"
      >
        <component :is="showReplace ? ChevronDown : ChevronRight" class="h-3.5 w-3.5" />
      </Button>

      <!-- 查找 / 替换主体 -->
      <div class="flex flex-col gap-0.5">
        <!-- 查找行 -->
        <div class="flex items-center gap-1">
          <Input
            v-model="searchWord"
            placeholder="查找"
            class="h-7 w-40 text-sm"
            @keydown="handleSearchInputKeyDown"
          />
          <span class="w-10 select-none text-center text-xs">
            {{ numberOfMatches ? indexOfMatch + 1 : 0 }}/{{ numberOfMatches }}
          </span>
          <Button
            variant="ghost"
            size="xs"
            title="上一处"
            aria-label="上一处"
            class="h-6 w-6 p-0"
            @click="prevMatch"
          >
            <ChevronUp class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title="下一处"
            aria-label="下一处"
            class="h-6 w-6 p-0"
            @click="nextMatch"
          >
            <ChevronDown class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title="关闭"
            aria-label="关闭"
            class="h-6 w-6 p-0"
            @click="closeSearchTab"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>

        <!-- 替换行（可折叠） -->
        <div v-if="showReplace" class="flex items-center gap-1">
          <Input
            v-model="replaceWord"
            placeholder="替换"
            class="h-7 w-40 text-sm"
            @keydown="handleReplaceInputKeyDown"
          />
          <Button
            variant="ghost"
            size="xs"
            title="替换"
            aria-label="替换"
            class="h-6 w-6 p-0"
            @click="handleReplace"
          >
            <Replace class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title="全部替换"
            aria-label="全部替换"
            class="h-6 w-6 p-0"
            @click="handleReplaceAll"
          >
            <ReplaceAll class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="less">
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
