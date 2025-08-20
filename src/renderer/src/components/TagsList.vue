<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">标签管理</h3>
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        @click="$emit('create')"
      >
        新建标签
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="tag in tags"
        :key="tag.id"
        class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
      >
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: tag.color }"></div>
          <div>
            <div class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ tag.name }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ tag.count || 0 }} 项</div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            class="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
            @click="$emit('edit', tag)"
          >
            编辑
          </button>
          <button
            class="text-sm px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            @click="$emit('delete', tag.id)"
          >
            删除
          </button>
        </div>
      </div>
      <div v-if="tags.length === 0" class="text-sm text-gray-500">暂无标签</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tag {
  id: number
  name: string
  color: string
  count?: number
}

const { tags = [] } = withDefaults(defineProps<{ tags?: Tag[] }>(), {
  tags: () => []
})

defineEmits<{
  create: []
  edit: [tag: Tag]
  delete: [id: number]
}>()
</script>

<style scoped></style>
