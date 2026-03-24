import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { ReportAiDrawerSectionState } from '../reportAiSummaryShared'
import type { ReportAiSummarySection } from '@/types/entity'
import ReportAiDrawer from '@/components/report/ReportAiDrawer.vue'

const SECTION_LABELS: Record<ReportAiSummarySection, string> = {
  conclusion: '结论',
  reason: '原因分析',
  risk: '风险提示',
  attention: '关注建议',
}

function createSection(
  key: ReportAiSummarySection,
  overrides: Partial<ReportAiDrawerSectionState> = {},
): ReportAiDrawerSectionState {
  return {
    key,
    label: SECTION_LABELS[key],
    text: '',
    completed: false,
    evidence: [],
    ...overrides,
  }
}

const successFixture = {
  sections: {
    conclusion: createSection('conclusion', { text: '整体任务推进稳定。', completed: true }),
    reason: createSection('reason', {
      text: '本周执行进度保持正常。',
      completed: true,
      evidence: [{ label: '任务完成率', value: 91, unit: '%' }],
    }),
    risk: createSection('risk', { text: '短期无明显异常。', completed: true }),
    attention: createSection('attention', { text: '继续关注降雨影响。', completed: true }),
  } satisfies Record<ReportAiSummarySection, ReportAiDrawerSectionState>,
}

const streamingFixture = {
  sections: {
    conclusion: createSection('conclusion'),
    reason: createSection('reason', {
      text: '已输出原因分析。',
      evidence: [{ label: '任务完成率', value: 91, unit: '%' }],
    }),
    risk: createSection('risk'),
    attention: createSection('attention'),
  } satisfies Record<ReportAiSummarySection, ReportAiDrawerSectionState>,
}

type DrawerProps = InstanceType<typeof ReportAiDrawer>['$props']

function mountDrawer(props: Partial<DrawerProps> = {}) {
  return mount(ReportAiDrawer, {
    props: {
      visible: true,
      status: 'idle',
      sections: successFixture.sections,
      ...props,
    },
    global: {
      stubs: {
        'el-drawer': {
          props: ['modelValue'],
          template: '<aside v-if="modelValue" class="el-drawer-stub"><slot /></aside>',
        },
        'el-button': {
          emits: ['click'],
          template: `<button @click="$emit('click')"><slot /></button>`,
        },
        'el-empty': {
          template: '<div class="el-empty-stub"><slot name="description" /><slot /></div>',
        },
        'el-skeleton': {
          template: '<div class="el-skeleton-stub" />',
        },
      },
    },
  })
}

describe('ReportAiDrawer', () => {
  it('renders the four fixed sections as streaming skeletons', () => {
    const wrapper = mountDrawer({
      status: 'streaming',
      sections: {
        conclusion: createSection('conclusion'),
        reason: createSection('reason'),
        risk: createSection('risk'),
        attention: createSection('attention'),
      },
    })

    expect(wrapper.text()).toContain('结论')
    expect(wrapper.text()).toContain('原因分析')
    expect(wrapper.text()).toContain('风险提示')
    expect(wrapper.text()).toContain('关注建议')
    expect(wrapper.findAll('[data-testid="report-ai-section-skeleton"]').length).toBe(4)
  })

  it('keeps streamed content visible while empty sections still show loading skeletons', () => {
    const wrapper = mountDrawer({
      status: 'streaming',
      sections: streamingFixture.sections,
    })

    const reasonSection = wrapper.get('[data-testid="report-ai-section-reason"]')
    const conclusionSection = wrapper.get('[data-testid="report-ai-section-conclusion"]')

    expect(reasonSection.text()).toContain('已输出原因分析。')
    expect(reasonSection.text()).toContain('任务完成率')
    expect(reasonSection.find('[data-testid="report-ai-section-skeleton"]').exists()).toBe(false)
    expect(conclusionSection.find('[data-testid="report-ai-section-skeleton"]').exists()).toBe(true)
  })

  it('renders evidence under the matching section container', () => {
    const wrapper = mountDrawer({
      status: 'done',
    })

    const reasonSection = wrapper.get('[data-testid="report-ai-section-reason"]')
    const riskSection = wrapper.get('[data-testid="report-ai-section-risk"]')

    expect(wrapper.text()).toContain('结论')
    expect(wrapper.text()).toContain('原因分析')
    expect(wrapper.text()).toContain('风险提示')
    expect(wrapper.text()).toContain('关注建议')
    expect(reasonSection.text()).toContain('任务完成率')
    expect(riskSection.text()).not.toContain('任务完成率')
  })

  it('shows a retry button in the error state', () => {
    const wrapper = mountDrawer({
      status: 'error',
      error: '生成失败',
    })

    expect(wrapper.text()).toContain('生成失败')
    expect(wrapper.get('[data-testid="report-ai-retry"]').text()).toContain('重试')
  })

  it('emits close when the close affordance is clicked', async () => {
    const wrapper = mountDrawer()

    await wrapper.get('[data-testid="report-ai-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
