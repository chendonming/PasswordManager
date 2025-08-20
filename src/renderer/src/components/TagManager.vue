<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
    <!-- 标题和添加按钮 -->
    <div
      class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
    >
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">标签管理</h2>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all duration-150 flex items-center text-sm font-medium"
        @click="showCreateModal = true"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        添加标签
      </button>
    </div>

    <!-- 标签列表 -->
    <div class="p-6">
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
      </div>

      <div v-else-if="tags.length === 0" class="text-center py-8">
        <svg
          class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <p class="text-gray-500 dark:text-gray-400 mb-4">还没有标签</p>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          @click="showCreateModal = true"
        >
          创建第一个标签
        </button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow group"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: tag.color }"
              ></div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ tag.name }}
                </h3>
                <p v-if="tag.description" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ tag.description }}
                </p>
              </div>
            </div>

            <div
              class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                title="编辑标签"
                class="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                @click="editTag(tag)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                title="删除标签"
                class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                @click="deleteTag(tag)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑标签模态框 -->
    <Modal :visible="showCreateModal || showEditModal" @close="closeModal">
      <template #title>
        {{ editingTag ? '编辑标签' : '创建标签' }}
      </template>
      <template #content>
        <form class="space-y-4" @submit.prevent="saveTag">
          <!-- 标签名称 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标签名称 *
            </label>
            <input
              v-model="tagForm.name"
              type="text"
              required
              maxlength="50"
              placeholder="例如：工作、个人、重要"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- 标签颜色 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标签颜色
            </label>
            <div class="flex items-center space-x-2">
              <input
                v-model="tagForm.color"
                type="color"
                class="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
              <input
                v-model="tagForm.color"
                type="text"
                placeholder="#18a058"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- 标签描述 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述（可选）
            </label>
            <textarea
              v-model="tagForm.description"
              rows="3"
              maxlength="200"
              placeholder="为这个标签添加描述..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          <!-- 预览 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              预览
            </label>
            <div class="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: tagForm.color }"></div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ tagForm.name || '标签名称' }}
              </span>
            </div>
          </div>
        </form>
      </template>
      <template #actions>
        <button
          type="button"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mr-2"
          @click="closeModal"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="!tagForm.name.trim() || isSaving"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          @click="saveTag"
        >
          <div
            v-if="isSaving"
            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
          ></div>
          {{ editingTag ? '保存' : '创建' }}
        </button>
      </template>
    </Modal>

    <!-- 删除确认模态框 -->
    <Modal :visible="showDeleteModal" @close="showDeleteModal = false">
      <template #title>删除标签</template>
      <template #content>
        <p class="text-gray-700 dark:text-gray-300">
          确定要删除标签 <strong>{{ deletingTag?.name }}</strong> 吗？
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          此操作无法撤销，但不会影响已使用此标签的密码条目。
        </p>
      </template>
      <template #actions>
        <button
          type="button"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mr-2"
          @click="showDeleteModal = false"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="isSaving"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          @click="confirmDelete"
        >
          <div
            v-if="isSaving"
            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
          ></div>
          删除
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Modal from './Modal.vue'

interface Tag {
  id: number
  name: string
  color: string
  description?: string
  created_at: string
  updated_at: string
}

interface TagForm {
  name: string
  color: string
  description: string
}

const emit = defineEmits<{
  tagsUpdated: []
}>()

// 响应式数据
const tags = ref<Tag[]>([])
const isLoading = ref(false)
const isSaving = ref(false)

// 模态框状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

// 表单数据
const tagForm = ref<TagForm>({
  name: '',
  color: '#18a058',
  description: ''
})

// 编辑和删除状态
const editingTag = ref<Tag | null>(null)
const deletingTag = ref<Tag | null>(null)

// 加载所有标签
const loadTags = async (): Promise<void> => {
  try {
    isLoading.value = true
    const result = await window.api.getAllTags()
    if (Array.isArray(result)) {
      tags.value = result
    } else {
      console.error('获取标签失败:', result)
      tags.value = []
    }
  } catch (error) {
    console.error('加载标签失败:', error)
    tags.value = []
  } finally {
    isLoading.value = false
  }
}

// 创建标签
const createTag = async (): Promise<void> => {
  try {
    isSaving.value = true
    const result = await window.api.createTag({
      name: tagForm.value.name.trim(),
      color: tagForm.value.color,
      description: tagForm.value.description.trim() || undefined
    })

    if (result && result.id) {
      tags.value.push(result)
      emit('tagsUpdated')
      closeModal()
    } else {
      console.error('创建标签失败:', result)
    }
  } catch (error) {
    console.error('创建标签失败:', error)
  } finally {
    isSaving.value = false
  }
}

// 更新标签
const updateTag = async (): Promise<void> => {
  if (!editingTag.value) return

  try {
    isSaving.value = true
    const result = await window.api.updateTag(editingTag.value.id, {
      name: tagForm.value.name.trim(),
      color: tagForm.value.color,
      description: tagForm.value.description.trim() || undefined
    })

    if (result && result.id) {
      const index = tags.value.findIndex((t) => t.id === editingTag.value!.id)
      if (index !== -1) {
        tags.value[index] = result
      }
      emit('tagsUpdated')
      closeModal()
    } else {
      console.error('更新标签失败:', result)
    }
  } catch (error) {
    console.error('更新标签失败:', error)
  } finally {
    isSaving.value = false
  }
}

// 删除标签
const confirmDelete = async (): Promise<void> => {
  if (!deletingTag.value) return

  try {
    isSaving.value = true
    await window.api.deleteTagById(deletingTag.value.id)
    // deleteTagById doesn't return a result per PreloadAPI; assume success if no exception
    tags.value = tags.value.filter((t) => t.id !== deletingTag.value!.id)
    emit('tagsUpdated')
    showDeleteModal.value = false
    deletingTag.value = null
  } catch (error) {
    console.error('删除标签失败:', error)
  } finally {
    isSaving.value = false
  }
}

// 保存标签（创建或更新）
const saveTag = async (): Promise<void> => {
  if (editingTag.value) {
    await updateTag()
  } else {
    await createTag()
  }
}

// 编辑标签
const editTag = (tag: Tag): void => {
  editingTag.value = tag
  tagForm.value = {
    name: tag.name,
    color: tag.color,
    description: tag.description || ''
  }
  showEditModal.value = true
}

// 删除标签
const deleteTag = (tag: Tag): void => {
  deletingTag.value = tag
  showDeleteModal.value = true
}

// 关闭模态框
const closeModal = (): void => {
  showCreateModal.value = false
  showEditModal.value = false
  editingTag.value = null
  tagForm.value = {
    name: '',
    color: '#18a058',
    description: ''
  }
}

// 暴露方法供父组件调用
defineExpose({
  loadTags
})

// 组件挂载时加载标签
onMounted(() => {
  loadTags()
})
</script>
