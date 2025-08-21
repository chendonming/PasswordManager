<template>
  <div class="fixed right-4 top-4 z-50 flex flex-col space-y-2">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="[
        'px-4 py-2 rounded-lg shadow-md text-sm',
        t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
      ]"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../composables/useToast'

const { toasts } = useToastStore()
</script>
