import { useAuthStore } from '@/stores/auth'
import type { ReportAiSummaryEvent, ReportAiSummaryRequest } from '@/types/entity'

import { normalizeAnalyticsFilter } from '@/utils/reportFilter'

export interface StreamReportAiSummaryOptions {
  signal?: AbortSignal
  onEvent?: (event: ReportAiSummaryEvent) => void
}

const REPORT_AI_STREAM_ENDPOINT = '/api/report/analytics/ai-summary/stream'

function isAbortLikeError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function parseEventBlock(block: string): ReportAiSummaryEvent | null {
  const payload = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!payload) {
    return null
  }

  return JSON.parse(payload) as ReportAiSummaryEvent
}

function flushEventBuffer(
  buffer: string,
  signal?: AbortSignal,
  onEvent?: (event: ReportAiSummaryEvent) => void,
): string {
  // 一个网络 chunk 里可能包含多条 SSE 事件，
  // 所以需要逐块拆开并在派发前再次检查 abort。
  const normalized = buffer.replace(/\r\n/g, '\n')
  const blocks = normalized.split('\n\n')
  const remainder = blocks.pop() ?? ''

  for (const block of blocks) {
    if (signal?.aborted) {
      break
    }

    const parsed = parseEventBlock(block)
    if (parsed) {
      onEvent?.(parsed)
    }
  }

  return remainder
}

export async function streamReportAiSummary(
  request: ReportAiSummaryRequest,
  options: StreamReportAiSummaryOptions = {},
): Promise<void> {
  const authStore = useAuthStore()
  // 如果外部在真正发请求前就取消了，这里直接静默返回。
  if (options.signal?.aborted) {
    return
  }

  let response: Response
  try {
    response = await fetch(REPORT_AI_STREAM_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      },
      body: JSON.stringify({
        currentTab: request.currentTab,
        filters: normalizeAnalyticsFilter(request.filters),
      }),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || isAbortLikeError(error)) {
      return
    }
    throw error
  }

  if (!response.ok) {
    throw new Error(`AI summary stream request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('AI summary stream response has no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const abortListener = () => {
    // 取消时显式通知底层 reader，避免继续读取未消费数据。
    void reader.cancel().catch(() => {})
  }

  options.signal?.addEventListener('abort', abortListener, { once: true })

  let buffer = ''

  try {
    while (!options.signal?.aborted) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      buffer = flushEventBuffer(buffer, options.signal, options.onEvent)
    }

    if (!options.signal?.aborted) {
      buffer += decoder.decode()
      flushEventBuffer(buffer, options.signal, options.onEvent)
    }
  } catch (error) {
    if (!options.signal?.aborted && !isAbortLikeError(error)) {
      throw error
    }
  } finally {
    options.signal?.removeEventListener('abort', abortListener)
    reader.releaseLock()
  }
}
