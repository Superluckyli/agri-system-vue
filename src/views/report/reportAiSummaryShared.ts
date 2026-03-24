import type {
  ReportAiSummaryEvent,
  ReportAiSummaryEvidenceItem,
  ReportAiSummaryResult,
  ReportAiSummarySection,
  ReportAiSummarySectionResult,
  ReportAiSummaryTab,
  ReportAnalyticsFilter,
} from '@/types/entity'

import { normalizeAnalyticsFilter } from './reportAnalyticsShared'

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
  'overview',
  'keyFindings',
  'risks',
  'recommendations',
  'conclusion',
]

export const REPORT_AI_SECTION_LABELS: Record<ReportAiSummarySection, string> = {
  overview: '概览',
  keyFindings: '关键发现',
  risks: '风险提示',
  recommendations: '行动建议',
  conclusion: '总结',
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
    completed: incoming.completed ?? current.completed,
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
  return JSON.stringify({
    currentTab,
    filters: normalizeAnalyticsFilter(filters, now),
  })
}

export function reduceReportAiEvent(
  state: ReportAiDrawerState,
  event: ReportAiSummaryEvent,
): ReportAiDrawerState {
  if (event.type === 'start') {
    return {
      ...initialReportAiState(),
      status: 'streaming',
    }
  }

  if (event.type === 'error') {
    return {
      ...state,
      status: 'error',
      error: event.message,
      cachedResult: null,
    }
  }

  if (event.type === 'done') {
    const sections = { ...state.sections }
    for (const section of REPORT_AI_SECTION_ORDER) {
      sections[section] = mergeSectionResult(sections[section], event.result.sections?.[section])
    }

    return {
      ...state,
      status: 'done',
      error: '',
      summary: event.result.summary ?? state.summary,
      sections,
      cachedResult: {
        summary: event.result.summary ?? state.summary,
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

  if ('section' in event) {
    const current = state.sections[event.section]
    const nextSection: ReportAiDrawerSectionState = {
      ...current,
      completed: event.type === 'section-done' ? true : current.completed,
      text:
        event.type === 'section-chunk'
          ? `${current.text}${event.delta}`
          : event.type === 'section-done' && event.text !== undefined
            ? event.text
            : current.text,
      evidence:
        event.type === 'section-evidence'
          ? [...current.evidence, ...event.evidence]
          : event.type === 'section-done' && event.evidence
            ? event.evidence
            : current.evidence,
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

  return {
    ...state,
    status: 'streaming',
    error: '',
    cachedResult: null,
  }
}
