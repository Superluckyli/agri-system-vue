import axios from 'axios'
import type { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Request interceptor
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
http.interceptors.response.use(
  (response) => {
    // Return complete blob response directly if it's a file download
    if (response.request.responseType === 'blob' || response.request.responseType === 'arraybuffer') {
      return response.data
    }

    const res = response.data
    if (res.code === 200) {
      return res.data
    } else {
      ElMessage.error(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || 'Error'))
    }
  },
  (error: AxiosError) => {
    const authStore = useAuthStore()

    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        ElMessage.error('登录状态已过期，请重新登录')
        authStore.logout()
      } else if (status === 403) {
        ElMessage.error('权限不足，无法执行该操作')
      } else {
        ElMessage.error(`请求错误：${status}`)
      }
    } else if (error.request) {
      if (error.message.includes('timeout')) {
        ElMessage.error('网络请求超时，请稍后重试')
      } else {
        ElMessage.error('网络连接失败，请检查您的网络')
      }
    } else {
      ElMessage.error('发生未知错误')
    }

    return Promise.reject(error)
  }
)

export const get = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => http.get(url, config)
export const post = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => http.post(url, data, config)
export const put = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => http.put(url, data, config)
export const del = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => http.delete(url, config)

export default http
