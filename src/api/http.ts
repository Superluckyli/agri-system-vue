import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosResponse,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'

import router from '@/router'
import { useAuthStore } from '@/stores/auth'

import type { R } from '@/api/types/http'

type ExtendedRequestConfig = InternalAxiosRequestConfig & {
  requestKey?: string
  skipDedupe?: boolean
}

const pendingRequestMap = new Map<string, AbortController>()

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

function stableStringify(input: unknown): string {
  if (input === null || input === undefined) {
    return ''
  }

  if (typeof input !== 'object') {
    return String(input)
  }

  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(',')}]`
  }

  const objectInput = input as Record<string, unknown>
  const entries = Object.keys(objectInput)
    .sort()
    .map((key) => `${key}:${stableStringify(objectInput[key])}`)

  return `{${entries.join(',')}}`
}

function createRequestKey(config: Pick<ExtendedRequestConfig, 'method' | 'url' | 'params' | 'data'>): string {
  return [
    (config.method ?? 'get').toLowerCase(),
    config.url ?? '',
    stableStringify(config.params),
    stableStringify(config.data),
  ].join('&')
}

function clearPendingRequest(config?: Pick<ExtendedRequestConfig, 'requestKey'>): void {
  const requestKey = config?.requestKey
  if (!requestKey) {
    return
  }

  pendingRequestMap.delete(requestKey)
}

function addPendingRequest(config: ExtendedRequestConfig): void {
  if (config.skipDedupe) {
    return
  }

  const requestKey = createRequestKey(config)
  config.requestKey = requestKey

  const previousController = pendingRequestMap.get(requestKey)
  if (previousController) {
    previousController.abort()
    pendingRequestMap.delete(requestKey)
  }

  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequestMap.set(requestKey, controller)
}

function isRResponse<T>(payload: unknown): payload is R<T> {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return typeof candidate.code === 'number' && typeof candidate.msg === 'string' && 'data' in candidate
}

function handleUnauthorized(): void {
  const authStore = useAuthStore()
  authStore.logout()

  const currentPath = router.currentRoute.value.fullPath
  if (router.currentRoute.value.path !== '/login') {
    router.replace({
      path: '/login',
      query: { redirect: currentPath },
    })
  }
}

http.interceptors.request.use(
  (config) => {
    const requestConfig = config as ExtendedRequestConfig
    addPendingRequest(requestConfig)

    const authStore = useAuthStore()
    if (authStore.token) {
      const headers = (requestConfig.headers ??= new AxiosHeaders())
      ;(headers as Record<string, string>).Authorization = `Bearer ${authStore.token}`
    }

    return requestConfig
  },
  (error) => Promise.reject(error),
)

http.interceptors.response.use(
  (response): AxiosResponse => {
    clearPendingRequest(response.config as ExtendedRequestConfig)

    const payload = response.data as unknown
    if (!isRResponse<unknown>(payload)) {
      return response
    }

    if (payload.code === 200) {
      response.data = payload.data
      return response
    }

    const businessMessage = payload.msg || '业务请求失败'
    ElMessage.error(businessMessage)
    throw new Error(businessMessage)
  },
  (error: AxiosError<{ msg?: string }>) => {
    clearPendingRequest(error.config as ExtendedRequestConfig | undefined)

    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      handleUnauthorized()
      return Promise.reject(error)
    }

    let message = '网络异常，请检查网络连接'
    if (error.response) {
      const statusMessageMap: Record<number, string> = {
        400: '请求参数错误',
        403: '无权限访问当前资源',
        404: '请求资源不存在',
        500: '服务器异常，请稍后再试',
      }

      message =
        error.response.data?.msg ??
        statusMessageMap[error.response.status] ??
        `请求失败（HTTP ${error.response.status}）`
    }

    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
)

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.get<T>(url, config).then((response) => response.data)
}

export function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
  return http.post<T, AxiosResponse<T>, D>(url, data, config).then((response) => response.data)
}

export function put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
  return http.put<T, AxiosResponse<T>, D>(url, data, config).then((response) => response.data)
}

export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.delete<T>(url, config).then((response) => response.data)
}

export function cancelAllPendingRequests(): void {
  pendingRequestMap.forEach((controller) => controller.abort())
  pendingRequestMap.clear()
}

export default http
