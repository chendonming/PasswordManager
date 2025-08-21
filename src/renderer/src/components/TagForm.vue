<template>
  <div class="p-4">
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
        <input
          v-model="form.name"
          class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">颜色</label>
        <input v-model="form.color" type="color" class="w-12 h-8 p-0 border-0 bg-transparent" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TagInput {
  id?: number
  name: string
  color: string
}

const props = defineProps<{ initial?: TagInput }>()
const { initial = { name: '', color: '#60a5fa' } } = props

const emits = defineEmits<{
  submit: [data: TagInput]
}>()

import { reactive, watch } from 'vue'

const form = reactive<TagInput>({ ...(initial as TagInput) })

watch(
  () => initial,
  (v) => {
    if (v) {
      form.name = v.name
      form.color = v.color
    }
  }
)

const submit = (): void => {
  if (!form.name || form.name.trim() === '') return
  emits('submit', { id: form.id, name: form.name.trim(), color: form.color })
}

// expose submit to parent via ref if needed
defineExpose({ submit })
</script>

<style scoped></style>
