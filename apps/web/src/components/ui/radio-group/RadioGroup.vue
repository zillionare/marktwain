<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string
  disabled?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: ``,
  disabled: false,
})

const emit = defineEmits<{
  (e: `update:modelValue`, value: string): void
}>()

const selectedValue = ref(props.modelValue)

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue
})

// 提供选择值给子组件
provide(`radioGroupValue`, selectedValue)
provide(`radioGroupDisabled`, props.disabled)
provide(`radioGroupEmit`, emit)
</script>

<template>
  <div
    :class="cn('space-y-2', props.class)"
    role="radiogroup"
  >
    <slot />
  </div>
</template>
