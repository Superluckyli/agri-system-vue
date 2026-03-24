import { describe, expect, it } from 'vitest'

import type { UploadedImageItem } from '@/types/entity'
import {
  MAX_LOG_IMAGE_COUNT,
  MAX_LOG_IMAGE_SIZE_MB,
  canSubmitWithImages,
  isAllowedLogImage,
  parseUploadedImageUrls,
  serializeUploadedImageUrls,
} from '../logImageUploadShared'

const makeFile = (name: string, type: string, sizeInBytes: number) => {
  const payload = new Uint8Array(sizeInBytes)
  return new File([payload], name, { type })
}

describe('logImageUploadShared', () => {
  it('defines the shared upload limits', () => {
    expect(MAX_LOG_IMAGE_COUNT).toBe(9)
    expect(MAX_LOG_IMAGE_SIZE_MB).toBe(5)
  })

  it('accepts jpg/png/webp files within the size limit, including extension fallback', () => {
    expect(isAllowedLogImage(makeFile('field.jpg', 'image/jpeg', 1024))).toEqual({ valid: true })
    expect(isAllowedLogImage(makeFile('field.png', 'image/png', 1024))).toEqual({ valid: true })
    expect(isAllowedLogImage(makeFile('field.webp', 'image/webp', 1024))).toEqual({ valid: true })
    expect(isAllowedLogImage(makeFile('field.JPEG', '', 1024))).toEqual({ valid: true })
  })

  it('rejects unsupported file types, mime-extension mismatches, and files over 5MB', () => {
    expect(isAllowedLogImage(makeFile('field.gif', 'image/gif', 1024))).toEqual({
      valid: false,
      reason: '仅支持 jpg、jpeg、png、webp 格式图片',
    })
    expect(isAllowedLogImage(makeFile('foo.jpg', 'image/gif', 1024))).toEqual({
      valid: false,
      reason: '仅支持 jpg、jpeg、png、webp 格式图片',
    })
    expect(isAllowedLogImage(makeFile('foo.jpg', 'text/plain', 1024))).toEqual({
      valid: false,
      reason: '仅支持 jpg、jpeg、png、webp 格式图片',
    })
    expect(isAllowedLogImage(makeFile('field.jpg', 'image/jpeg', 5 * 1024 * 1024))).toEqual({ valid: true })
    expect(isAllowedLogImage(makeFile('field.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1))).toEqual({
      valid: false,
      reason: '单张图片不能超过 5MB',
    })
  })

  it('serializes successful upload urls in order and ignores incomplete items', () => {
    const items: UploadedImageItem[] = [
      { name: 'a.jpg', url: '/uploads/task-log/a.jpg', status: 'success' },
      { name: 'b.jpg', url: '', status: 'uploading' },
      { name: 'c.jpg', url: '/uploads/task-log/c.jpg', status: 'success' },
      { name: 'd.jpg', url: '/uploads/task-log/d.jpg', status: 'error', errorMessage: 'upload failed' },
    ]

    expect(serializeUploadedImageUrls(items)).toBe('/uploads/task-log/a.jpg,/uploads/task-log/c.jpg')
  })

  it('parses comma-separated image urls into a trimmed array', () => {
    expect(parseUploadedImageUrls(' /a.jpg, ,/b.jpg ,, /c.jpg ')).toEqual(['/a.jpg', '/b.jpg', '/c.jpg'])
    expect(parseUploadedImageUrls(undefined)).toEqual([])
    expect(parseUploadedImageUrls('')).toEqual([])
  })

  it('allows submit only when all selected images are successful', () => {
    expect(canSubmitWithImages([])).toBe(true)
    expect(canSubmitWithImages([
      { name: 'a.jpg', url: '/uploads/task-log/a.jpg', status: 'success' },
    ])).toBe(true)
    expect(canSubmitWithImages([
      { name: 'a.jpg', url: '/uploads/task-log/a.jpg', status: 'success' },
      { name: 'b.jpg', url: '', status: 'uploading' },
    ])).toBe(false)
    expect(canSubmitWithImages([
      { name: 'a.jpg', url: '', status: 'error', errorMessage: 'upload failed' },
    ])).toBe(false)
  })
})
