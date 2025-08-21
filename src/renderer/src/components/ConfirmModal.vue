<template>
  <Modal :visible="visible" :title="title" @close="onCancel">
    <div class="py-2">{{ message }}</div>

    <template #footer>
      <button
        type="button"
        class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
        @click="onCancel"
      >
        取消
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors duration-200"
        @click="onConfirm"
      >
        确认
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { defineEmits, defineProps } from 'vue'

defineProps<{
  visible: boolean
  title?: string
  message: string
}>()

const emits = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const onConfirm = (): void => {
  emits('confirm')
}

const onCancel = (): void => {
  emits('cancel')
  emits('close')
}
</script>
