import { ref } from 'vue'
import axios from 'axios'

function normalizeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.msg as string | undefined
    if (responseMessage) {
      return responseMessage
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

export function usePageState() {
  const loading = ref(false)
  const errorMessage = ref('')

  function start(): void {
    loading.value = true
    errorMessage.value = ''
  }

  function finish(): void {
    loading.value = false
  }

  function fail(error: unknown): void {
    loading.value = false
    errorMessage.value = normalizeErrorMessage(error)
  }

  function clearError(): void {
    errorMessage.value = ''
  }

  return {
    loading,
    errorMessage,
    start,
    finish,
    fail,
    clearError,
  }
}
