<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { uploadTaskLogImage } from '@/api/modules/task'
import type { UploadedImageItem } from '@/types/entity'

import { LOG_IMAGE_ALLOWED_MIME_TYPES, MAX_LOG_IMAGE_COUNT, isAllowedLogImage } from './logImageUploadShared'

interface InternalUploadedImageItem extends UploadedImageItem {
  key: string
  previewUrl: string
  objectUrl?: string
}

const props = withDefaults(defineProps<{
  modelValue?: UploadedImageItem[]
  maxCount?: number
  disabled?: boolean
}>(), {
  modelValue: () => [],
  maxCount: MAX_LOG_IMAGE_COUNT,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: UploadedImageItem[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const items = ref<InternalUploadedImageItem[]>([])
const accept = computed(() => LOG_IMAGE_ALLOWED_MIME_TYPES.join(','))
let nextItemId = 0

const statusTextMap: Record<UploadedImageItem['status'], string> = {
  uploading: '上传中',
  success: '上传成功',
  error: '上传失败',
}

const createItemKey = () => `log-image-${Date.now()}-${nextItemId++}`

const toExternalItems = (source: InternalUploadedImageItem[]): UploadedImageItem[] => source.map((item) => ({
  name: item.name,
  url: item.url,
  status: item.status,
  errorMessage: item.errorMessage,
}))

const areExternalItemsEqual = (left: UploadedImageItem[], right: UploadedImageItem[]) => left.length === right.length
  && left.every((item, index) => {
    const other = right[index]
    return other
      && item.name === other.name
      && item.url === other.url
      && item.status === other.status
      && item.errorMessage === other.errorMessage
  })

const revokePreviewUrl = (item: InternalUploadedImageItem) => {
  if (item.objectUrl) {
    URL.revokeObjectURL(item.objectUrl)
  }
}

const consumeObjectUrl = (item: InternalUploadedImageItem): undefined => {
  if (item.objectUrl) {
    URL.revokeObjectURL(item.objectUrl)
  }
  return undefined
}

const replaceItems = (nextItems: InternalUploadedImageItem[]) => {
  for (const currentItem of items.value) {
    if (!nextItems.some((item) => item.key === currentItem.key)) {
      revokePreviewUrl(currentItem)
    }
  }
  items.value = nextItems
}

const syncFromModelValue = (value: UploadedImageItem[]) => {
  replaceItems(value.map((item) => ({
    key: createItemKey(),
    name: item.name,
    url: item.url,
    status: item.status,
    errorMessage: item.errorMessage,
    previewUrl: item.url,
  })))
}

const emitChange = () => {
  emit('update:modelValue', toExternalItems(items.value))
}

const updateItem = (key: string, updater: (item: InternalUploadedImageItem) => InternalUploadedImageItem) => {
  const index = items.value.findIndex((item) => item.key === key)
  if (index === -1) {
    return
  }

  const currentItem = items.value[index]
  if (!currentItem) {
    return
  }

  const nextItems = [...items.value]
  nextItems[index] = updater(currentItem)
  items.value = nextItems
  emitChange()
}

const clearFileInput = () => {
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

const uploadOne = async (key: string, file: File) => {
  try {
    const uploaded = await uploadTaskLogImage(file)
    updateItem(key, (item) => ({
      ...item,
      name: uploaded.name || item.name,
      url: uploaded.url,
      status: 'success',
      errorMessage: undefined,
      previewUrl: uploaded.url || item.previewUrl,
      objectUrl: consumeObjectUrl(item),
    }))
  } catch (error) {
    const errorMessage = error instanceof Error && error.message.trim() ? error.message : '上传失败，请重试'
    updateItem(key, (item) => ({
      ...item,
      status: 'error',
      errorMessage,
    }))
  }
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const selectedFiles = Array.from(target.files ?? [])

  if (!selectedFiles.length) {
    clearFileInput()
    return
  }

  const remainingCount = props.maxCount - items.value.length
  if (remainingCount <= 0) {
    ElMessage.warning(`最多只能上传 ${props.maxCount} 张图片`)
    clearFileInput()
    return
  }

  let filesToUpload = selectedFiles
  if (selectedFiles.length > remainingCount) {
    ElMessage.warning(`最多只能上传 ${props.maxCount} 张图片`)
    filesToUpload = selectedFiles.slice(0, remainingCount)
  }

  for (const file of filesToUpload) {
    const validation = isAllowedLogImage(file)
    if (!validation.valid) {
      ElMessage.warning(validation.reason || '图片校验失败')
      continue
    }

    const previewUrl = URL.createObjectURL(file)
    const nextItem: InternalUploadedImageItem = {
      key: createItemKey(),
      name: file.name,
      url: '',
      status: 'uploading',
      previewUrl,
      objectUrl: previewUrl,
    }

    items.value = [...items.value, nextItem]
    emitChange()
    void uploadOne(nextItem.key, file)
  }

  clearFileInput()
}

const removeItem = (index: number) => {
  const targetItem = items.value[index]
  if (!targetItem) {
    return
  }

  revokePreviewUrl(targetItem)
  items.value = items.value.filter((item) => item.key !== targetItem.key)
  emitChange()
}

watch(
  () => props.modelValue,
  (value) => {
    const nextValue = value ?? []
    if (areExternalItemsEqual(nextValue, toExternalItems(items.value))) {
      return
    }
    syncFromModelValue(nextValue)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  for (const item of items.value) {
    revokePreviewUrl(item)
  }
})
</script>

<template>
  <div class="log-image-uploader">
    <div class="log-image-uploader__header">
      <div>
        <div class="log-image-uploader__title">图片上传</div>
        <div class="log-image-uploader__meta">{{ items.length }}/{{ maxCount }}，支持 jpg/png/webp，单张不超过 5MB</div>
      </div>
      <input
        ref="inputRef"
        class="log-image-uploader__input"
        data-testid="upload-input"
        type="file"
        :accept="accept"
        :disabled="disabled || items.length >= maxCount"
        multiple
        @change="handleFileChange"
      />
    </div>

    <div v-if="items.length" class="log-image-uploader__grid">
      <div
        v-for="(item, index) in items"
        :key="item.key"
        :data-testid="`upload-item-${index}`"
        class="log-image-uploader__item"
      >
        <img
          v-if="item.previewUrl || item.url"
          :data-testid="`upload-preview-${index}`"
          class="log-image-uploader__preview"
          :src="item.status === 'success' && item.url ? item.url : item.previewUrl"
          :alt="item.name"
        />
        <div class="log-image-uploader__name">{{ item.name }}</div>
        <div
          :data-testid="`upload-status-${index}`"
          :class="['log-image-uploader__status', `is-${item.status}`]"
        >
          {{ statusTextMap[item.status] }}
        </div>
        <div v-if="item.errorMessage" class="log-image-uploader__error">{{ item.errorMessage }}</div>
        <button
          class="log-image-uploader__remove"
          type="button"
          :disabled="disabled"
          :data-testid="`remove-image-${index}`"
          @click="removeItem(index)"
        >
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-image-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-image-uploader__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.log-image-uploader__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.log-image-uploader__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.log-image-uploader__input {
  max-width: 100%;
}

.log-image-uploader__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.log-image-uploader__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.log-image-uploader__preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.log-image-uploader__name {
  word-break: break-all;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.log-image-uploader__status {
  font-size: 12px;
  font-weight: 500;
}

.log-image-uploader__status.is-uploading {
  color: var(--el-color-primary);
}

.log-image-uploader__status.is-success {
  color: var(--el-color-success);
}

.log-image-uploader__status.is-error,
.log-image-uploader__error {
  color: var(--el-color-danger);
}

.log-image-uploader__error {
  font-size: 12px;
  word-break: break-word;
}

.log-image-uploader__remove {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--el-color-danger);
  cursor: pointer;
}

.log-image-uploader__remove:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
