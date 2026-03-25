import type {
  ReportAiSummaryEvent,
  ReportAiSummaryEvidenceItem,
  ReportAiSummaryResult,
  ReportAiSummarySection,
  ReportAiSummarySectionResult,
  ReportAiSummaryTab,
  ReportAnalyticsFilter,
} from '@/types/entity'

import { normalizeAnalyticsFilter } from '@/utils/reportFilter'

export interface ReportAiDrawerSectionState {
  key: ReportAiSummarySection
  label: string
  text: string
  completed: boolean
  evidence: ReportAiSummaryEvidenceItem[]
}

export interface ReportAiDrawerState {
  status: 'idle' | 'streaming' | 'done' | 'error'
  summary: string
  error: string
  sections: Record<ReportAiSummarySection, ReportAiDrawerSectionState>
  cachedResult: ReportAiSummaryResult | null
}

export const REPORT_AI_SECTION_ORDER: ReportAiSummarySection[] = [
  'conclusion',
  'reason',
  'risk',
  'attention',
]

export const REPORT_AI_SECTION_LABELS: Record<ReportAiSummarySection, string> = {
  conclusion: '结论',
  reason: '原因分析',
  risk: '风险提示',
  attention: '关注事项',
}

function createEmptySectionState(section: ReportAiSummarySection): ReportAiDrawerSectionState {
  return {
    key: section,
    label: REPORT_AI_SECTION_LABELS[section],
    text: '',
    completed: false,
    evidence: [],
  }
}

function createEmptySections(): Record<ReportAiSummarySection, ReportAiDrawerSectionState> {
  return REPORT_AI_SECTION_ORDER.reduce((acc, section) => {
    acc[section] = createEmptySectionState(section)
    return acc
  }, {} as Record<ReportAiSummarySection, ReportAiDrawerSectionState>)
}

function mergeSectionResult(
  current: ReportAiDrawerSectionState,
  incoming?: ReportAiSummarySectionResult,
): ReportAiDrawerSectionState {
  if (!incoming) {
    return current
  }

  return {
    ...current,
    text: incoming.text ?? current.text,
    completed: incoming.completed ?? true,
    evidence: incoming.evidence ?? current.evidence,
  }
}

export function initialReportAiState(): ReportAiDrawerState {
  return {
    status: 'idle',
    summary: '',
    error: '',
    sections: createEmptySections(),
    cachedResult: null,
  }
}

export function getReportAiSectionLabel(section: ReportAiSummarySection): string {
  return REPORT_AI_SECTION_LABELS[section]
}

export function buildReportAiCacheKey(
  currentTab: ReportAiSummaryTab,
  filters?: Partial<ReportAnalyticsFilter> | null,
  now = new Date(),
): string {
  // cache key 必须和真正发给后端的筛选口径一致，否则会出现“同一页看似同条件，实则命中错缓存”的问题。
  return JSON.stringify({
    currentTab,
    filters: normalizeAnalyticsFilter(filters, now),
  })
}

export function reduceReportAiEvent(
  state: ReportAiDrawerState,
  event: ReportAiSummaryEvent,
): ReportAiDrawerState {
  if (event.type === 'error') {
    return {
      ...state,
      status: 'error',
      error: event.message,
      cachedResult: null,
    }
  }

  if (event.type === 'done') {
    const result = event.result ?? {}
    const sections = { ...state.sections }
    for (const section of REPORT_AI_SECTION_ORDER) {
      sections[section] = mergeSectionResult(sections[section], result.sections?.[section])
    }

    return {
      ...state,
      status: 'done',
      error: '',
      summary: result.summary ?? state.summary,
      sections,
      cachedResult: {
        summary: result.summary ?? state.summary,
        sections: REPORT_AI_SECTION_ORDER.reduce((acc, section) => {
          acc[section] = {
            text: sections[section].text,
            completed: sections[section].completed,
            evidence: sections[section].evidence,
          }
          return acc
        }, {} as NonNullable<ReportAiSummaryResult['sections']>),
      },
    }
  }

  if (event.type === 'section-start') {
    return {
      ...state,
      status: 'streaming',
      error: '',
      sections: {
        // section 重启时必须清空旧文本和旧证据，避免重试/重流时把旧内容拼上去。
        ...state.sections,
        [event.section]: createEmptySectionState(event.section),
      },
      cachedResult: null,
    }
  }

  const current = state.sections[event.section]
  const nextChunk = event.type === 'section-chunk' ? (event.delta ?? event.summary ?? '') : ''
  const nextSection: ReportAiDrawerSectionState = {
    ...current,
    completed: current.completed,
    text: event.type === 'section-chunk' ? `${current.text}${nextChunk}` : current.text,
    evidence: event.type === 'evidence' ? [...current.evidence, ...event.evidence] : current.evidence,
  }

  return {
    ...state,
    status: 'streaming',
    error: '',
    sections: {
      ...state.sections,
      [event.section]: nextSection,
    },
    cachedResult: null,
  }
}
