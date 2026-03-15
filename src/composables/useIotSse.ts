import { ref, onUnmounted } from 'vue'
import type { IotSensorData } from '@/types/entity'

export interface SseOptions {
  /** 自动重连间隔(ms)，0 表示不重连 */
  reconnectInterval?: number
  /** 最大重连次数 */
  maxRetries?: number
}

/**
 * IoT SSE 实时数据订阅 composable
 */
export function useIotSse(options: SseOptions = {}) {
  const { reconnectInterval = 5000, maxRetries = 10 } = options

  const connected = ref(false)
  const latestData = ref<IotSensorData | null>(null)
  const error = ref<string>('')

  let eventSource: EventSource | null = null
  let retryCount = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (eventSource) {
      eventSource.close()
    }
    error.value = ''

    const url = '/api/iot/sse/subscribe'
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      connected.value = true
      retryCount = 0
    }

    eventSource.addEventListener('iot-data', (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as IotSensorData
        latestData.value = parsed
      } catch {
        // 忽略解析失败
      }
    })

    eventSource.onerror = () => {
      connected.value = false
      eventSource?.close()
      eventSource = null

      if (reconnectInterval > 0 && retryCount < maxRetries) {
        retryCount++
        retryTimer = setTimeout(connect, reconnectInterval)
      } else {
        error.value = '实时连接已断开'
      }
    }
  }

  function disconnect() {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
  }

  onUnmounted(disconnect)

  return { connected, latestData, error, connect, disconnect }
}
