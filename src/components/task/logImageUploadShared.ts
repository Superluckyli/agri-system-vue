import type { UploadedImageItem } from '@/types/entity'

export const MAX_LOG_IMAGE_COUNT = 9
export const MAX_LOG_IMAGE_SIZE_MB = 5
export const LOG_IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const LOG_IMAGE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

const LOG_IMAGE_SIZE_LIMIT_BYTES = MAX_LOG_IMAGE_SIZE_MB * 1024 * 1024

export interface LogImageValidationResult {
  valid: boolean
  reason?: string
}

const getFileExtension = (fileName: string): string => {
  const normalizedName = fileName.trim().toLowerCase()
  const segments = normalizedName.split('.')
  return segments.length > 1 ? segments[segments.length - 1] ?? '' : ''
}

export function isAllowedLogImage(file: File): LogImageValidationResult {
  const fileExtension = getFileExtension(file.name)
  const hasFileType = Boolean(file.type)
  const hasAllowedMimeType = LOG_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as typeof LOG_IMAGE_ALLOWED_MIME_TYPES[number])
  const hasAllowedExtension = LOG_IMAGE_ALLOWED_EXTENSIONS.includes(fileExtension as typeof LOG_IMAGE_ALLOWED_EXTENSIONS[number])
  const isAllowedType = hasFileType ? hasAllowedMimeType : hasAllowedExtension

  if (!isAllowedType) {
    return {
      valid: false,
      reason: '仅支持 jpg、jpeg、png、webp 格式图片',
    }
  }

  if (file.size > LOG_IMAGE_SIZE_LIMIT_BYTES) {
    return {
      valid: false,
      reason: `单张图片不能超过 ${MAX_LOG_IMAGE_SIZE_MB}MB`,
    }
  }

  return { valid: true }
}

export function serializeUploadedImageUrls(items: UploadedImageItem[]): string {
  return items
    .filter((item) => item.status === 'success' && Boolean(item.url?.trim()))
    .map((item) => item.url.trim())
    .join(',')
}

export function parseUploadedImageUrls(imageUrls?: string | null): string[] {
  if (!imageUrls) {
    return []
  }

  return imageUrls
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function canSubmitWithImages(items: UploadedImageItem[]): boolean {
  return items.every((item) => item.status === 'success' && Boolean(item.url?.trim()))
}
