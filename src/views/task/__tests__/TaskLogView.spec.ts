import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListTask,
  mockListTaskLog,
  mockCreateTaskLog,
  mockCompleteTask,
  mockCreateTaskMaterials,
  mockListMaterialInfo,
  mockMessageSuccess,
  mockMessageWarning,
  mockMessageError,
} = vi.hoisted(() => ({
  mockListTask: vi.fn(),
  mockListTaskLog: vi.fn(),
  mockCreateTaskLog: vi.fn(),
  mockCompleteTask: vi.fn(),
  mockCreateTaskMaterials: vi.fn(),
  mockListMaterialInfo: vi.fn(),
  mockMessageSuccess: vi.fn(),
  mockMessageWarning: vi.fn(),
  mockMessageError: vi.fn(),
}))

const route = reactive({ query: {} as Record<string, unknown> })

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    roles: ['WORKER'],
    user: { userId: 7, username: 'worker-7' },
  }),
}))

vi.mock('@/api/modules/task', () => ({
  listTask: mockListTask,
  listTaskLog: mockListTaskLog,
  createTaskLog: mockCreateTaskLog,
  completeTask: mockCompleteTask,
  createTaskMaterials: mockCreateTaskMaterials,
}))

vi.mock('@/api/modules/material', () => ({
  listMaterialInfo: mockListMaterialInfo,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: mockMessageSuccess,
      warning: mockMessageWarning,
      error: mockMessageError,
    },
  }
})

import TaskLogView from '../TaskLogView.vue'

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

const ElSelectStub = defineComponent({
  name: 'ElSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, null],
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, slots, emit }) {
    return () => h('select', {
      ...attrs,
      value: props.modelValue == null ? '' : String(props.modelValue),
      onChange: (event: Event) => emit('update:modelValue', Number((event.target as HTMLSelectElement).value)),
    }, slots.default?.())
  },
})

const ElOptionStub = defineComponent({
  name: 'ElOption',
  props: {
    label: String,
    value: {
      type: [String, Number],
      default: '',
    },
  },
  setup(props) {
    return () => h('option', { value: String(props.value) }, props.label)
  },
})

const ElInputNumberStub = defineComponent({
  name: 'ElInputNumber',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Number, String, null],
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      type: 'number',
      value: props.modelValue == null ? '' : String(props.modelValue),
      onInput: (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)),
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

const ElTableColumnStub = defineComponent({
  name: 'ElTableColumn',
  setup(_, { slots }) {
    const fakeRow = {
      imageUrls: ' https://img.example.com/a.jpg, , https://img.example.com/b.jpg ',
    }
    return () => h('div', { class: 'el-table-column-stub' }, slots.default?.({ row: fakeRow }))
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
  'el-select': ElSelectStub,
  'el-option': ElOptionStub,
  'el-input-number': ElInputNumberStub,
  'el-table': SimpleSlotStub('ElTable', 'table'),
  'el-table-column': ElTableColumnStub,
  'el-alert': SimpleSlotStub('ElAlert'),
  'el-empty': SimpleSlotStub('ElEmpty'),
  'el-pagination': SimpleSlotStub('ElPagination'),
  'el-tag': SimpleSlotStub('ElTag', 'span'),
  'el-image': ElImageStub,
  LogImageUploader: LogImageUploaderStub,
}

async function mountView() {
  const wrapper = mount(TaskLogView, {
    global: {
      stubs: globalStubs,
    },
  })
  await flushPromises()
  return wrapper
}

async function openExecuteDialog(wrapper: Awaited<ReturnType<typeof mountView>>) {
  const openButton = wrapper.findAll('button').find((item) => item.text().includes('填写执行结果'))
  expect(openButton).toBeTruthy()
  await openButton!.trigger('click')
  await flushPromises()
}

describe('TaskLogView', () => {
  beforeEach(() => {
    route.query = {}
    mockListTask.mockReset()
    mockListTaskLog.mockReset()
    mockCreateTaskLog.mockReset()
    mockCompleteTask.mockReset()
    mockCreateTaskMaterials.mockReset()
    mockListMaterialInfo.mockReset()
    mockMessageSuccess.mockReset()
    mockMessageWarning.mockReset()
    mockMessageError.mockReset()

    mockListTask.mockResolvedValue({
      items: [
        { taskId: 101, taskName: '喷洒叶面肥', statusV2: 'in_progress', assigneeId: 7 },
      ],
      total: 1,
      pageNum: 1,
      pageSize: 500,
    })
    mockListTaskLog.mockResolvedValue({ items: [], total: 0, pageNum: 1, pageSize: 10 })
    mockListMaterialInfo.mockResolvedValue({ items: [], total: 0, pageNum: 1, pageSize: 500 })
    mockCreateTaskLog.mockResolvedValue(undefined)
    mockCompleteTask.mockResolvedValue(undefined)
    mockCreateTaskMaterials.mockResolvedValue(undefined)
  })

  it('blocks execution-log submit while selected images are still uploading or failed', async () => {
    const wrapper = await mountView()
    await openExecuteDialog(wrapper)

    const uploader = wrapper.findComponent({ name: 'LogImageUploader' })
    expect(uploader.exists()).toBe(true)

    uploader.vm.$emit('update:modelValue', [
      { name: 'a.jpg', url: '', status: 'error', errorMessage: '上传失败' },
    ])
    await flushPromises()

    const submitButton = wrapper.get('[data-testid="execute-submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()

    uploader.vm.$emit('update:modelValue', [
      { name: 'b.jpg', url: '', status: 'uploading' },
    ])
    await flushPromises()

    expect(wrapper.get('[data-testid="execute-submit"]').attributes('disabled')).toBeDefined()
  })

  it('serializes successful image urls into the createTaskLog payload', async () => {
    const wrapper = await mountView()
    await openExecuteDialog(wrapper)

    const uploader = wrapper.findComponent({ name: 'LogImageUploader' })
    expect(uploader.exists()).toBe(true)

    uploader.vm.$emit('update:modelValue', [
      { name: 'a.jpg', url: '/uploads/task-log/a.jpg', status: 'success' },
      { name: 'b.jpg', url: '/uploads/task-log/b.jpg', status: 'success' },
    ])
    await flushPromises()

    const textareas = wrapper.findAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    await textareas[0]!.setValue('完成叶面肥喷施')
    await flushPromises()

    await wrapper.get('[data-testid="execute-submit"]').trigger('click')
    await flushPromises()

    expect(mockCreateTaskLog).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 101,
      action: 'execute_log',
      imageUrls: '/uploads/task-log/a.jpg,/uploads/task-log/b.jpg',
    }))
  })

  it('uses parsed image url arrays for existing log previews', async () => {
    mockListTaskLog.mockResolvedValueOnce({
      items: [
        {
          id: 1,
          taskId: 101,
          growthNote: '完成喷施',
          imageUrls: ' https://img.example.com/a.jpg, , https://img.example.com/b.jpg ',
          createdAt: '2026-03-24 09:00:00',
        },
      ],
      total: 1,
      pageNum: 1,
      pageSize: 10,
    })

    const wrapper = await mountView()

    const images = wrapper.findAll('img.el-image-stub')
    expect(images).toHaveLength(1)
    expect(images[0]?.attributes('src')).toBe('https://img.example.com/a.jpg')
    expect(images[0]?.attributes('data-preview-src-list')).toBe(JSON.stringify([
      'https://img.example.com/a.jpg',
      'https://img.example.com/b.jpg',
    ]))
  })

  it('clears uploader state after closing and reopening the execute dialog', async () => {
    const wrapper = await mountView()
    await openExecuteDialog(wrapper)

    const uploader = wrapper.getComponent({ name: 'LogImageUploader' })
    uploader.vm.$emit('update:modelValue', [
      { name: 'stale.jpg', url: '/uploads/task-log/stale.jpg', status: 'success' },
    ])
    await flushPromises()

    expect(wrapper.get('[data-testid="log-image-uploader-stub"]').attributes('data-count')).toBe('1')

    await wrapper.findAll('button').find((item) => item.text().includes('取消'))!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="log-image-uploader-stub"]').exists()).toBe(false)

    await openExecuteDialog(wrapper)
    await flushPromises()

    expect(wrapper.get('[data-testid="log-image-uploader-stub"]').attributes('data-count')).toBe('0')
  }, 20000)
})
