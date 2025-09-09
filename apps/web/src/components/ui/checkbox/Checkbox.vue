<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  checked?: boolean
  disabled?: boolean
  class?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  checked: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: `update:checked`, checked: boolean): void
}>()

const buttonClass = computed(() => {
  return cn(
    `peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`,
    props.checked ? `bg-primary text-primary-foreground` : `bg-background`,
    props.disabled ? `cursor-not-allowed opacity-50` : `cursor-pointer`,
    props.class,
  )
})

function handleClick() {
  if (!props.disabled) {
    emit(`update:checked`, !props.checked)
  }
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="checkbox"
    :aria-checked="checked"
    :disabled="disabled"
    :class="buttonClass"
    @click="handleClick"
  >
    <Check v-if="checked" class="h-3 w-3" />
  </button>
</template>
