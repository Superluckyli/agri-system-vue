import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListTaskLog,
  mockCreateTaskLog,
  mockRouterPush,
  mockMessageSuccess,
  mockMessageError,
} = vi.hoisted(() => ({
  mockListTaskLog: vi.fn(),
  mockCreateTaskLog: vi.fn(),
  mockRouterPush: vi.fn(),
  mockMessageSuccess: vi.fn(),
  mockMessageError: vi.fn(),
}))

const route = reactive({ params: { batchId: '88' } as Record<string, unknown> })

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/api/modules/task', () => ({
  listTaskLog: mockListTaskLog,
  createTaskLog: mockCreateTaskLog,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: mockMessageSuccess,
      error: mockMessageError,
    },
  }
})

import GrowthLogView from '../GrowthLogView.vue'

const ElCardStub = defineComponent({
  name: 'ElCard',
  setup(_, { slots }) {
    return () => h('div', { class: 'el-card-stub' }, [slots.header?.(), slots.default?.()])
  },
})

const ElFormStub = defineComponent({
  name: 'ElForm',
  setup(_, { slots, expose }) {
    expose({
      validate: vi.fn().mockResolvedValue(true),
      clearValidate: vi.fn(),
    })
    return () => h('form', { class: 'el-form-stub' }, slots.default?.())
  },
})

const ElFormItemStub = defineComponent({
  name: 'ElFormItem',
  props: { label: String },
  setup(props, { slots }) {
    return () => h('label', { class: 'el-form-item-stub', 'data-label': props.label }, slots.default?.())
  },
})

const ElButtonStub = defineComponent({
  name: 'ElButton',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean,
    type: String,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    return () => h('button', {
      ...attrs,
      disabled: props.disabled || props.loading,
      'data-type': props.type,
      'data-loading': String(Boolean(props.loading)),
      onClick: (event: MouseEvent) => emit('click', event),
    }, slots.default?.())
  },
})

const ElDialogStub = defineComponent({
  name: 'ElDialog',
  props: {
    modelValue: Boolean,
    title: String,
  },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => props.modelValue
      ? h('section', { class: 'el-dialog-stub', 'data-title': props.title }, [slots.default?.(), slots.footer?.()])
      : null
  },
})

const ElInputStub = defineComponent({
  name: 'ElInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    placeholder: String,
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => props.type === 'textarea'
      ? h('textarea', {
        ...attrs,
        value: props.modelValue,
        placeholder: props.placeholder,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      })
      : h('input', {
        ...attrs,
        value: props.modelValue,
        placeholder: props.placeholder,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

const SimpleSlotStub = (name: string, tag = 'div') => defineComponent({
  name,
  setup(_, { slots }) {
    return () => h(tag, { class: `${name}-stub` }, slots.default?.())
  },
})

const ElImageStub = defineComponent({
  name: 'ElImage',
  props: {
    src: {
      type: String,
      default: '',
    },
    previewSrcList: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    return () => h('img', {
      class: 'el-image-stub',
      src: props.src,
      'data-preview-src-list': JSON.stringify(props.previewSrcList),
    })
  },
})

const LogImageUploaderStub = defineComponent({
  name: 'LogImageUploader',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  template: '<div data-testid="log-image-uploader-stub" :data-count="modelValue.length" :data-disabled="String(disabled)"></div>',
})

const globalStubs = {
  'el-card': ElCardStub,
  'el-form': ElFormStub,
  'el-form-item': ElFormItemStub,
  'el-button': ElButtonStub,
  'el-dialog': ElDialogStub,
  'el-input': ElInputStub,
  'el-alert': SimpleSlotStub('ElAlert'),
  'el-empty': SimpleSlotStub('ElEmpty'),
  'el-skeleton': SimpleSlotStub('ElSkeleton'),
  'el-timeline': SimpleSlotStub('ElTimeline'),
  'el-timeline-item': SimpleSlotStub('ElTimelineItem'),
  'el-image': ElImageStub,
  LogImageUploader: LogImageUploaderStub,
}

async function mountView() {
  const wrapper = mount(GrowthLogView, {
    global: {
      stubs: globalStubs,
    },
  })
  await flushPromises()
  return wrapper
}

async function openAddDialog(wrapper: Awaited<ReturnType<typeof mountView>>) {
  const addButton = wrapper.findAll('button').find((item) => item.text().includes('新增日志'))
  expect(addButton).toBeDefined()
  await addButton!.trigger('click')
  await flushPromises()
}

describe('GrowthLogView', () => {
  beforeEach(() => {
    route.params.batchId = '88'
    mockListTaskLog.mockReset()
    mockCreateTaskLog.mockReset()
    mockRouterPush.mockReset()
    mockMessageSuccess.mockReset()
    mockMessageError.mockReset()

    mockListTaskLog.mockResolvedValue({
      items: [
        {
          id: 1,
          action: 'growth_record',
          growthNote: '长势稳定',
          abnormalNote: '叶片轻微卷曲',
          imageUrls: ' https://img.example.com/a.jpg,  ,https://img.example.com/b.jpg ',
          createdAt: '2026-03-24 09:30:00',
        },
      ],
      total: 1,
      pageNum: 1,
      pageSize: 500,
    })
    mockCreateTaskLog.mockResolvedValue(undefined)
  })

  it('serializes successful upload urls into createTaskLog payload and uses parsed preview arrays for timeline images', async () => {
    const wrapper = await mountView()

    const images = wrapper.findAll('img.el-image-stub')
    expect(images).toHaveLength(2)
    expect(images[0]?.attributes('src')).toBe('https://img.example.com/a.jpg')
    expect(images[0]?.attributes('data-preview-src-list')).toBe(JSON.stringify([
      'https://img.example.com/a.jpg',
      'https://img.example.com/b.jpg',
    ]))

    await openAddDialog(wrapper)

    const textareas = wrapper.findAll('textarea')
    await textareas[0]!.setValue('作物继续生长')
    await textareas[1]!.setValue('')

    const uploader = wrapper.findComponent({ name: 'LogImageUploader' })
    expect(uploader.exists()).toBe(true)
    uploader.vm.$emit('update:modelValue', [
      { name: 'a.jpg', url: '/uploads/task-log/a.jpg', status: 'success' },
      { name: 'b.jpg', url: '/uploads/task-log/b.jpg', status: 'success' },
    ])
    await flushPromises()

    await wrapper.get('[data-testid="growth-log-submit"]').trigger('click')
    await flushPromises()

    expect(mockCreateTaskLog).toHaveBeenCalledWith(expect.objectContaining({
      batchId: 88,
      action: 'growth_record',
      growthNote: '作物继续生长',
      imageUrls: '/uploads/task-log/a.jpg,/uploads/task-log/b.jpg',
    }))
  })

  it('blocks submit while selected images are not all uploaded successfully', async () => {
    const wrapper = await mountView()
    await openAddDialog(wrapper)

    const uploader = wrapper.getComponent({ name: 'LogImageUploader' })
    uploader.vm.$emit('update:modelValue', [
      { name: 'failed.jpg', url: '', status: 'error', errorMessage: '上传失败' },
    ])
    await flushPromises()

    expect(wrapper.get('[data-testid="growth-log-submit"]').attributes('disabled')).toBeDefined()

    uploader.vm.$emit('update:modelValue', [
      { name: 'uploading.jpg', url: '', status: 'uploading' },
    ])
    await flushPromises()

    expect(wrapper.get('[data-testid="growth-log-submit"]').attributes('disabled')).toBeDefined()
  })
})
