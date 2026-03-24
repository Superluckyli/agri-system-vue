import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUploadTaskLogImage, mockMessageWarning } = vi.hoisted(() => ({
  mockUploadTaskLogImage: vi.fn(),
  mockMessageWarning: vi.fn(),
}))

vi.mock('@/api/modules/task', () => ({
  uploadTaskLogImage: mockUploadTaskLogImage,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      warning: mockMessageWarning,
    },
  }
})

import LogImageUploader from '../LogImageUploader.vue'

const createObjectURLMock = vi.fn((file: File) => `blob:${file.name}`)
const revokeObjectURLMock = vi.fn()

const makeFile = (name: string, type: string, sizeInBytes = 1024) => {
  const payload = new Uint8Array(sizeInBytes)
  return new File([payload], name, { type })
}

const globalStubs = {
  'el-button': {
    props: ['disabled', 'type'],
    emits: ['click'],
    template: '<button :disabled="disabled" :data-type="type" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  'el-icon': { template: '<span class="el-icon-stub"><slot /></span>' },
}

async function selectFiles(wrapper: ReturnType<typeof mount>, files: File[]) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  })
  await input.trigger('change')
}

describe('LogImageUploader', () => {
  beforeEach(() => {
    mockUploadTaskLogImage.mockReset()
    mockMessageWarning.mockReset()
    createObjectURLMock.mockClear()
    revokeObjectURLMock.mockClear()

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })
  })

  it('uploads selected files immediately, shows preview state, and emits successful items', async () => {
    let resolveUpload: ((value: { url: string; name: string }) => void) | undefined
    mockUploadTaskLogImage.mockImplementation(
      () => new Promise((resolve) => {
        resolveUpload = resolve
      }),
    )

    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: globalStubs,
      },
    })

    const file = makeFile('field-a.jpg', 'image/jpeg')
    await selectFiles(wrapper, [file])

    expect(mockUploadTaskLogImage).toHaveBeenCalledTimes(1)
    expect(mockUploadTaskLogImage).toHaveBeenCalledWith(file)
    expect(createObjectURLMock).toHaveBeenCalledWith(file)
    expect(wrapper.get('[data-testid="upload-status-0"]').text()).toContain('上传中')
    expect(wrapper.get('[data-testid="upload-preview-0"]').attributes('src')).toBe('blob:field-a.jpg')

    resolveUpload?.({ url: '/uploads/task-log/field-a.jpg', name: 'field-a.jpg' })
    await flushPromises()

    expect(wrapper.get('[data-testid="upload-status-0"]').text()).toContain('上传成功')
    expect(wrapper.get('[data-testid="upload-preview-0"]').attributes('src')).toBe('/uploads/task-log/field-a.jpg')
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:field-a.jpg')

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toEqual([
      {
        name: 'field-a.jpg',
        url: '/uploads/task-log/field-a.jpg',
        status: 'success',
      },
    ])
  })

  it('keeps in-flight uploads working when the parent round-trips a cloned modelValue array', async () => {
    let resolveUpload: ((value: { url: string; name: string }) => void) | undefined
    mockUploadTaskLogImage.mockImplementation(
      () => new Promise((resolve) => {
        resolveUpload = resolve
      }),
    )

    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: globalStubs,
      },
    })

    await selectFiles(wrapper, [makeFile('round-trip.jpg', 'image/jpeg')])

    const uploadingValue = ((wrapper.emitted('update:modelValue') ?? []).at(-1)?.[0] as Array<Record<string, unknown>>)
      .map((item) => ({ ...item }))

    await wrapper.setProps({ modelValue: uploadingValue })
    await flushPromises()

    expect(wrapper.get('[data-testid="upload-status-0"]').text()).toContain('上传中')
    expect(wrapper.get('[data-testid="upload-preview-0"]').attributes('src')).toBe('blob:round-trip.jpg')

    resolveUpload?.({ url: '/uploads/task-log/round-trip.jpg', name: 'round-trip.jpg' })
    await flushPromises()

    expect(wrapper.get('[data-testid="upload-status-0"]').text()).toContain('上传成功')
    expect(wrapper.get('[data-testid="upload-preview-0"]').attributes('src')).toBe('/uploads/task-log/round-trip.jpg')
    expect((wrapper.emitted('update:modelValue') ?? []).at(-1)?.[0]).toEqual([
      {
        name: 'round-trip.jpg',
        url: '/uploads/task-log/round-trip.jpg',
        status: 'success',
      },
    ])
  })

  it('rejects invalid files before upload', async () => {
    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: globalStubs,
      },
    })

    const invalidFile = makeFile('field.gif', 'image/gif')
    await selectFiles(wrapper, [invalidFile])
    await flushPromises()

    expect(mockUploadTaskLogImage).not.toHaveBeenCalled()
    expect(mockMessageWarning).toHaveBeenCalledWith('仅支持 jpg、jpeg、png、webp 格式图片')
    expect(wrapper.find('[data-testid="upload-item-0"]').exists()).toBe(false)
  })

  it('enforces max-count behavior when extra files are selected', async () => {
    mockUploadTaskLogImage
      .mockResolvedValueOnce({ url: '/uploads/task-log/1.jpg', name: '1.jpg' })
      .mockResolvedValueOnce({ url: '/uploads/task-log/2.jpg', name: '2.jpg' })

    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
        maxCount: 2,
      },
      global: {
        stubs: globalStubs,
      },
    })

    await selectFiles(wrapper, [
      makeFile('1.jpg', 'image/jpeg'),
      makeFile('2.jpg', 'image/jpeg'),
      makeFile('3.jpg', 'image/jpeg'),
    ])
    await flushPromises()

    expect(mockUploadTaskLogImage).toHaveBeenCalledTimes(2)
    expect(mockMessageWarning).toHaveBeenCalledWith('最多只能上传 2 张图片')
    expect(wrapper.findAll('[data-testid^="upload-item-"]')).toHaveLength(2)
  })

  it('shows a failed upload state when the request rejects', async () => {
    mockUploadTaskLogImage.mockRejectedValue(new Error('上传失败，请重试'))

    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: globalStubs,
      },
    })

    await selectFiles(wrapper, [makeFile('failed.jpg', 'image/jpeg')])
    await flushPromises()

    expect(wrapper.get('[data-testid="upload-status-0"]').text()).toContain('上传失败')
    expect(wrapper.text()).toContain('上传失败，请重试')
    expect((wrapper.emitted('update:modelValue') ?? []).at(-1)?.[0]).toEqual([
      {
        name: 'failed.jpg',
        url: '',
        status: 'error',
        errorMessage: '上传失败，请重试',
      },
    ])
  })

  it('supports removing an uploaded item before submit', async () => {
    mockUploadTaskLogImage.mockResolvedValue({ url: '/uploads/task-log/remove-me.jpg', name: 'remove-me.jpg' })

    const wrapper = mount(LogImageUploader, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: globalStubs,
      },
    })

    await selectFiles(wrapper, [makeFile('remove-me.jpg', 'image/jpeg')])
    await flushPromises()

    await wrapper.get('[data-testid="remove-image-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-item-0"]').exists()).toBe(false)
    expect((wrapper.emitted('update:modelValue') ?? []).at(-1)?.[0]).toEqual([])
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:remove-me.jpg')
  })
})
