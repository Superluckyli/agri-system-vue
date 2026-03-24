import { computed, ref } from 'vue'

import { streamReportAiSummary } from '@/api/reportAi'
import type { ReportAiSummaryResult, ReportAiSummaryTab, ReportAnalyticsFilter } from '@/types/entity'

import {
  buildReportAiCacheKey,
  initialReportAiState,
  reduceReportAiEvent,
} from './reportAiSummaryShared'

interface UseReportAiSummaryOptions {
  getCurrentTab: () => ReportAiSummaryTab
  getFilters: () => Partial<ReportAnalyticsFilter>
}

function stateFromResult(result: ReportAiSummaryResult) {
  return reduceReportAiEvent(initialReportAiState(), {
    type: 'done',
    result,
  })
}

export function useReportAiSummary(options: UseReportAiSummaryOptions) {
  const visible = ref(false)
  const state = ref(initialReportAiState())
  const cache = new Map<string, ReportAiSummaryResult>()
  const activeKey = ref<string | null>(null)
  const activeController = ref<AbortController | null>(null)

  function close(): void {
    visible.value = false
  }

  function setVisible(next: boolean): void {
    visible.value = next
  }

  function abort(): void {
    activeController.value?.abort()
    activeController.value = null
    activeKey.value = null
    state.value = initialReportAiState()
  }

  async function startStream(key: string): Promise<void> {
    const controller = new AbortController()
    activeController.value = controller
    activeKey.value = key
    state.value = {
      ...initialReportAiState(),
      status: 'streaming',
    }

    try {
      await streamReportAiSummary(
        {
          currentTab: options.getCurrentTab(),
          filters: options.getFilters(),
        },
        {
          signal: controller.signal,
          onEvent(event) {
            if (controller.signal.aborted) {
              return
            }

            state.value = reduceReportAiEvent(state.value, event)
            if (event.type === 'done' && state.value.cachedResult) {
              cache.set(key, state.value.cachedResult)
            }
          },
        },
      )
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }

      state.value = {
        ...initialReportAiState(),
        status: 'error',
        error: error instanceof Error ? error.message : 'AI 解读生成失败',
      }
    } finally {
      if (activeController.value === controller) {
        activeController.value = null
        activeKey.value = null
      }
    }
  }

  async function open(): Promise<void> {
    visible.value = true
    const key = buildReportAiCacheKey(options.getCurrentTab(), options.getFilters())
    const cached = cache.get(key)

    if (cached) {
      state.value = stateFromResult(cached)
      return
    }

    if (activeController.value && activeKey.value === key) {
      return
    }

    if (activeController.value) {
      abort()
    }

    await startStream(key)
  }

  const fabProps = computed(() => ({
    usable: true,
    loading: state.value.status === 'streaming',
  }))

  const drawerProps = computed(() => ({
    visible: visible.value,
    status: state.value.status,
    sections: state.value.sections,
    error: state.value.error,
  }))

  return {
    state,
    fabProps,
    drawerProps,
    open,
    close,
    setVisible,
    abort,
  }
}
