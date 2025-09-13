<script setup lang="ts">
import { Circle } from 'lucide-vue-next'
import { computed, inject } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  disabled?: boolean
  class?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

// 从父组件获取值
const radioGroupValue = inject<{ value: string }>(`radioGroupValue`)
const radioGroupDisabled = inject<boolean>(`radioGroupDisabled`, false)
const radioGroupEmit = inject<(e: `update:modelValue`, value: string) => void>(`radioGroupEmit`)

const isChecked = computed(() => {
  return radioGroupValue?.value === props.value
})

const isDisabled = computed(() => {
  return props.disabled || radioGroupDisabled
})

const buttonClass = computed(() => {
  return cn(
    `peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center`,
    isChecked.value ? `border-primary text-primary` : `border-input`,
    isDisabled.value ? `cursor-not-allowed opacity-50` : `cursor-pointer`,
    props.class,
  )
})

function handleClick() {
  if (!isDisabled.value && radioGroupEmit) {
    radioGroupEmit(`update:modelValue`, props.value)
  }
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="radio"
    :aria-checked="isChecked"
    :disabled="isDisabled"
    :class="buttonClass"
    @click="handleClick"
  >
    <Circle v-if="isChecked" class="h-2 w-2 fill-current text-current" />
  </button>
</template>
