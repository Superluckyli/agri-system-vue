import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReportAiSummaryEvent } from '@/types/entity'

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockUseAuthStore,
}))

import { streamReportAiSummary } from '@/api/reportAi'
import {
  buildReportAiCacheKey,
  initialReportAiState,
  reduceReportAiEvent,
} from '../reportAiSummaryShared'

function createEventStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
}

describe('buildReportAiCacheKey', () => {
  it('builds a stable cache key from currentTab and normalized filters', () => {
    expect(buildReportAiCacheKey('task', { startDate: '2026-03-01', endDate: '2026-03-31' }))
      .toBe('{"currentTab":"task","filters":{"startDate":"2026-03-01","endDate":"2026-03-31","granularity":"day"}}')
  })
})

describe('reduceReportAiEvent', () => {
  it('reduces section events into drawer state without caching half-finished results', () => {
    const state = reduceReportAiEvent(initialReportAiState(), {
      type: 'section-chunk',
      section: 'conclusion',
      delta: '稳定。',
    })

    expect(state.sections.conclusion.text).toContain('稳定。')
    expect(state.cachedResult).toBeNull()
    expect(state.status).toBe('streaming')
  })
})

describe('streamReportAiSummary', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({ token: 'test-token' })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sends auth, parses SSE data lines into callback events, and aborts cleanly', async () => {
    const abortController = new AbortController()
    const seenEvents: ReportAiSummaryEvent[] = []

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('/api/report/analytics/ai-summary/stream')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer test-token',
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      })
      expect(init?.signal).toBe(abortController.signal)

      return new Response(createEventStream([
        'data: {"type":"section-chunk","section":"conclusion","delta":"稳定。"}\n\n',
        'data: {"type":"done","result":{"summary":"完成","sections":{"conclusion":{"text":"稳定。","completed":true}}}}\n\n',
      ]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }) as typeof fetch

    await streamReportAiSummary(
      {
        currentTab: 'task',
        filters: { startDate: '2026-03-01', endDate: '2026-03-31' },
      },
      {
        signal: abortController.signal,
        onEvent(event) {
          seenEvents.push(event)
          abortController.abort()
        },
      },
    )

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(seenEvents).toEqual([
      {
        type: 'section-chunk',
        section: 'conclusion',
        delta: '稳定。',
      },
    ])
  })
})
