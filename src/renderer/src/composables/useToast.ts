import { ref } from 'vue'

type Toast = {
  id: number
  message: string
  type?: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])

export const useToastStore = (): {
  toasts: typeof toasts
  show: (message: string, type?: Toast['type'], duration?: number) => void
  remove: (id: number) => void
} => {
  const show = (message: string, type: Toast['type'] = 'info', duration = 4000): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      const idx = toasts.value.findIndex((t) => t.id === id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }, duration)
  }

  const remove = (id: number): void => {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return {
    toasts,
    show,
    remove
  }
}
