/* eslint-disable */
// V1 rewrite — material API module

import { del, get, post, put } from '@/api/http'
import type { MaterialInfo, MaterialStockLog } from '@/types/entity'
import type { MpPage } from '@/types/api'

export function createMaterialInfo(body: MaterialInfo): Promise<void> {
  return post<void>('/material/info', body)
}

export function updateMaterialInfo(body: MaterialInfo): Promise<void> {
  return put<void>('/material/info', body)
}

export interface ListMaterialInfoParams {
  pageNum?: number | string
  pageSize?: number | string
  name?: string
  category?: string | number
}

export function listMaterialInfo(params: ListMaterialInfoParams): Promise<MpPage<MaterialInfo>> {
  return get<MpPage<MaterialInfo>>('/material/info/list', { params })
}

export interface RemoveMaterialInfoByIdsParams {
  ids: number | string
}

export function removeMaterialInfoByIds(params: RemoveMaterialInfoByIdsParams): Promise<void> {
  return del<void>(`/material/info/${params.ids}`)
}

// --- Stock Log ---

export interface ListStockLogParams {
  pageNum?: number | string
  pageSize?: number | string
  materialId?: number | string
  changeType?: string
}

export function listStockLog(params: ListStockLogParams): Promise<MpPage<MaterialStockLog>> {
  return get<MpPage<MaterialStockLog>>('/material/stock-log/list', { params })
}
