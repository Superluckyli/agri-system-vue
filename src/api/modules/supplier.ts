/* eslint-disable */
// V1 — supplier API module

import { del, get, post, put } from '@/api/http'
import type { SupplierInfo } from '@/types/entity'
import type { MpPage } from '@/types/api'

export interface ListSupplierParams {
  pageNum?: number | string
  pageSize?: number | string
  name?: string
}

export function listSupplier(params: ListSupplierParams): Promise<MpPage<SupplierInfo>> {
  return get<MpPage<SupplierInfo>>('/supplier/list', { params })
}

export function getSupplierAll(): Promise<SupplierInfo[]> {
  return get<SupplierInfo[]>('/supplier/all')
}

export function createSupplier(body: SupplierInfo): Promise<void> {
  return post<void>('/supplier', body)
}

export function updateSupplier(body: SupplierInfo): Promise<void> {
  return put<void>('/supplier', body)
}

export interface RemoveSupplierByIdsParams {
  ids: number | string
}

export function removeSupplierByIds(params: RemoveSupplierByIdsParams): Promise<void> {
  return del<void>(`/supplier/${params.ids}`)
}
