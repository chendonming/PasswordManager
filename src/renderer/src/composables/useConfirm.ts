import { ref } from 'vue'

type ConfirmOptions = {
  title?: string
  message: string
}

const visible = ref(false)
const options = ref<ConfirmOptions | null>(null)
let resolver: ((value: boolean) => void) | null = null

export const useConfirm = (): {
  visible: typeof visible
  options: typeof options
  confirm: (message: string, title?: string) => Promise<boolean>
  handleConfirm: () => void
  handleCancel: () => void
} => {
  const confirm = (message: string, title = '确认'): Promise<boolean> => {
    options.value = { title, message }
    visible.value = true
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  const handleConfirm = (): void => {
    visible.value = false
    if (resolver) resolver(true)
    resolver = null
  }

  const handleCancel = (): void => {
    visible.value = false
    if (resolver) resolver(false)
    resolver = null
  }

  return {
    visible,
    options,
    confirm,
    handleConfirm,
    handleCancel
  }
}
