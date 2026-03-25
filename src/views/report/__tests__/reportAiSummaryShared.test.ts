import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReportAiSummaryEvent } from '@/types/entity'

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockUseAuthStore,
}))

import { streamReportAiSummary } from '@/api/reportAi'
import { normalizeAnalyticsFilter } from '@/utils/reportFilter'
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

  it('resets a section to a fresh skeleton when section-start repeats', () => {
    const dirtyState = reduceReportAiEvent(
      reduceReportAiEvent(initialReportAiState(), {
        type: 'evidence',
        section: 'conclusion',
        evidence: [{ label: '完成率', value: 91, unit: '%' }],
      }),
      {
        type: 'section-chunk',
        section: 'conclusion',
        delta: '上一轮内容',
      },
    )

    const resetState = reduceReportAiEvent(dirtyState, {
      type: 'section-start',
      section: 'conclusion',
    })

    expect(resetState.sections.conclusion).toEqual({
      key: 'conclusion',
      label: '结论',
      text: '',
      completed: false,
      evidence: [],
    })
    expect(resetState.cachedResult).toBeNull()
    expect(resetState.status).toBe('streaming')
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

  it('treats a backend done event without result as a pure stream-finished signal', () => {
    const inFlight = reduceReportAiEvent(
      reduceReportAiEvent(initialReportAiState(), {
        type: 'section-chunk',
        section: 'conclusion',
        delta: '稳定。',
      }),
      {
        type: 'evidence',
        section: 'reason',
        evidence: [{ label: '完成率', value: 91, unit: '%' }],
      },
    )

    const state = reduceReportAiEvent(inFlight, { type: 'done' })

    expect(state.status).toBe('done')
    expect(state.summary).toBe('')
    expect(state.sections.conclusion.text).toBe('稳定。')
    expect(state.sections.reason.evidence).toEqual([{ label: '完成率', value: 91, unit: '%' }])
    expect(state.cachedResult).toEqual({
      summary: '',
      sections: {
        conclusion: { text: '稳定。', completed: false, evidence: [] },
        reason: { text: '', completed: false, evidence: [{ label: '完成率', value: 91, unit: '%' }] },
        risk: { text: '', completed: false, evidence: [] },
        attention: { text: '', completed: false, evidence: [] },
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

  it('sends auth, parses multiple backend SSE frames, and completes cleanly', async () => {
    const seenEvents: ReportAiSummaryEvent[] = []
    const expectedPayload = {
      currentTab: 'task',
      filters: normalizeAnalyticsFilter({ startDate: '2026-03-01', endDate: '2026-03-31' }),
    }

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('/api/report/analytics/ai-summary/stream')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer test-token',
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      })
      expect(JSON.parse(String(init?.body))).toEqual(expectedPayload)

      return new Response(createEventStream([
        'data: {"type":"section-chunk","section":"conclusion","delta":"稳定。"}\n\n',
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
        onEvent(event) {
          seenEvents.push(event)
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
      {
        type: 'evidence',
        section: 'reason',
        evidence: [{ label: '完成率', value: 91, unit: '%' }],
      },
      {
        type: 'done',
        result: {
          summary: '完成',
          sections: {
            conclusion: { text: '稳定。', completed: true },
            reason: { text: '执行稳定', completed: true },
            risk: { text: '风险可控', completed: true },
            attention: { text: '关注天气', completed: true },
          },
        },
      },
    ])
  })

  it('parses a data payload split across multiple chunks', async () => {
    const seenEvents: ReportAiSummaryEvent[] = []

    global.fetch = vi.fn(async () => {
      return new Response(createEventStream([
        'data: {"type":"section-chunk","section":"concl',
        'usion","delta":"稳',
        '定。"}\n\n',
        'data: {"type":"done","result":{"summary":"完成"}}\n\n',
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
        onEvent(event) {
          seenEvents.push(event)
        },
      },
    )

    expect(seenEvents).toEqual([
      {
        type: 'section-chunk',
        section: 'conclusion',
        delta: '稳定。',
      },
      {
        type: 'done',
        result: { summary: '完成' },
      },
    ])
  })

  it('aborts cleanly after receiving the first event', async () => {
    const abortController = new AbortController()
    const seenEvents: ReportAiSummaryEvent[] = []
    const cancelSpy = vi.fn().mockResolvedValue(undefined)
    const releaseLockSpy = vi.fn()
    const encoder = new TextEncoder()

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('/api/report/analytics/ai-summary/stream')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer test-token',
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      })
      expect(init?.signal).toBe(abortController.signal)

      return {
        ok: true,
        status: 200,
        body: {
          getReader() {
            return {
              async read() {
                return {
                  done: false,
                  value: encoder.encode(
                  'data: {"type":"section-start","section":"conclusion"}\n\n'
                    + 'data: {"type":"evidence","section":"reason","evidence":[{"label":"完成率","value":91,"unit":"%"}]}\n\n'
                    + 'data: {"type":"done"}\n\n',
                  ),
                }
              },
              cancel: cancelSpy,
              releaseLock: releaseLockSpy,
            }
          },
        },
      } as Response
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
    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(releaseLockSpy).toHaveBeenCalledTimes(1)
  })

  it('treats abort before fetch resolves as a clean cancel', async () => {
    const abortController = new AbortController()

    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        )
      })
    }) as typeof fetch

    const promise = streamReportAiSummary(
      {
        currentTab: 'task',
        filters: { startDate: '2026-03-01', endDate: '2026-03-31' },
      },
      {
        signal: abortController.signal,
      },
    )

    abortController.abort()

    await expect(promise).resolves.toBeUndefined()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
