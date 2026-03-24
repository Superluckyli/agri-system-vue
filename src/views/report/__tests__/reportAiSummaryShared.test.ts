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
  REPORT_AI_SECTION_ORDER,
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

describe('report AI section contract', () => {
  it('uses the frozen backend section order', () => {
    expect(REPORT_AI_SECTION_ORDER).toEqual(['conclusion', 'reason', 'risk', 'attention'])
  })
})

describe('reduceReportAiEvent', () => {
  it('reduces backend section and evidence events without caching half-finished results', () => {
    const afterChunk = reduceReportAiEvent(initialReportAiState(), {
      type: 'section-chunk',
      section: 'conclusion',
      delta: '稳定。',
    })

    const state = reduceReportAiEvent(afterChunk, {
      type: 'evidence',
      section: 'reason',
      evidence: [{ label: '完成率', value: 91, unit: '%' }],
    })

    expect(state.sections.conclusion.text).toContain('稳定。')
    expect(state.sections.reason.evidence).toEqual([{ label: '完成率', value: 91, unit: '%' }])
    expect(state.sections.risk.text).toBe('')
    expect(state.sections.attention.text).toBe('')
    expect(state.cachedResult).toBeNull()
    expect(state.status).toBe('streaming')
  })

  it('caches only the backend done payload', () => {
    const state = reduceReportAiEvent(initialReportAiState(), {
      type: 'done',
      result: {
        summary: '整体稳定',
        sections: {
          conclusion: { text: '整体稳定', completed: true },
          reason: { text: '任务完成率较高', completed: true },
          risk: { text: '短期无明显风险', completed: true },
          attention: { text: '继续关注天气波动', completed: true },
        },
      },
    })

    expect(state.status).toBe('done')
    expect(state.summary).toBe('整体稳定')
    expect(state.cachedResult).toEqual({
      summary: '整体稳定',
      sections: {
        conclusion: { text: '整体稳定', completed: true, evidence: [] },
        reason: { text: '任务完成率较高', completed: true, evidence: [] },
        risk: { text: '短期无明显风险', completed: true, evidence: [] },
        attention: { text: '继续关注天气波动', completed: true, evidence: [] },
      },
    })
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

  it('sends auth, parses backend SSE data lines into callback events, and aborts cleanly', async () => {
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
        'data: {"type":"section-start","section":"conclusion"}\n\n',
        'data: {"type":"evidence","section":"reason","evidence":[{"label":"完成率","value":91,"unit":"%"}]}\n\n',
        'data: {"type":"done","result":{"summary":"完成","sections":{"conclusion":{"text":"稳定。","completed":true},"reason":{"text":"执行稳定","completed":true},"risk":{"text":"风险可控","completed":true},"attention":{"text":"关注天气","completed":true}}}}\n\n',
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
        type: 'section-start',
        section: 'conclusion',
      },
    ])
  })
})
