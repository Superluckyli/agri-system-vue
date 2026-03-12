/* eslint-disable */
// V1 rewrite — crop API module

import { del, get, post, put } from '@/api/http'
import type { AgriCropBatch, AgriFarmland, BaseCropVariety } from '@/types/entity'
import type { MpPage } from '@/types/api'

// --- Farmland ---

export interface ListFarmlandParams {
  pageNum?: number | string
  pageSize?: number | string
  name?: string
}

export function listFarmland(params: ListFarmlandParams): Promise<MpPage<AgriFarmland>> {
  return get<MpPage<AgriFarmland>>('/crop/farmland/list', { params })
}

export function createFarmland(body: AgriFarmland): Promise<void> {
  return post<void>('/crop/farmland', body)
}

export function updateFarmland(body: AgriFarmland): Promise<void> {
  return put<void>('/crop/farmland', body)
}

export interface RemoveFarmlandByIdsParams {
  ids: number | string
}

export function removeFarmlandByIds(params: RemoveFarmlandByIdsParams): Promise<void> {
  return del<void>(`/crop/farmland/${params.ids}`)
}

// --- Crop Batch ---

export interface ListCropBatchParams {
  pageNum?: number | string
  pageSize?: number | string
  batchNo?: string
  status?: string
  farmlandId?: number | string
}

export function listCropBatch(params: ListCropBatchParams): Promise<MpPage<AgriCropBatch>> {
  return get<MpPage<AgriCropBatch>>('/crop/batch/list', { params })
}

export function createCropBatch(body: AgriCropBatch): Promise<void> {
  return post<void>('/crop/batch', body)
}

export function updateCropBatch(body: AgriCropBatch): Promise<void> {
  return put<void>('/crop/batch', body)
}

export interface RemoveCropBatchByIdsParams {
  ids: number | string
}

export function removeCropBatchByIds(params: RemoveCropBatchByIdsParams): Promise<void> {
  return del<void>(`/crop/batch/${params.ids}`)
}

export function startBatch(id: number): Promise<void> {
  return put<void>(`/crop/batch/${id}/start`)
}

export function pauseBatch(id: number): Promise<void> {
  return put<void>(`/crop/batch/${id}/pause`)
}

export function harvestBatch(id: number): Promise<void> {
  return put<void>(`/crop/batch/${id}/harvest`)
}

export function abandonBatch(id: number, reason?: string): Promise<void> {
  return put<void>(`/crop/batch/${id}/abandon`, undefined, { params: { reason } })
}

export function archiveBatch(id: number): Promise<void> {
  return put<void>(`/crop/batch/${id}/archive`)
}

// --- Variety ---

export function createCropVariety(body: BaseCropVariety): Promise<void> {
  return post<void>('/crop/variety', body)
}

export function updateCropVariety(body: BaseCropVariety): Promise<void> {
  return put<void>('/crop/variety', body)
}

export function getCropVarietyAll(): Promise<BaseCropVariety[]> {
  return get<BaseCropVariety[]>('/crop/variety/all')
}

export interface ListCropVarietyParams {
  pageNum?: number | string
  pageSize?: number | string
  cropName?: string
}

export function listCropVariety(params: ListCropVarietyParams): Promise<MpPage<BaseCropVariety>> {
  return get<MpPage<BaseCropVariety>>('/crop/variety/list', { params })
}

export interface RemoveCropVarietyByIdsParams {
  ids: number | string
}

export function removeCropVarietyByIds(params: RemoveCropVarietyByIdsParams): Promise<void> {
  return del<void>(`/crop/variety/${params.ids}`)
}
