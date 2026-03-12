/* eslint-disable */
// V1 — purchase API module

import { del, get, post, put } from '@/api/http'
import type { PurchaseOrder, PurchaseOrderItem, PaymentRecord } from '@/types/entity'
import type { MpPage } from '@/types/api'

export interface ListPurchaseParams {
  pageNum?: number | string
  pageSize?: number | string
  status?: string
  supplierId?: number | string
}

export function listPurchase(params: ListPurchaseParams): Promise<MpPage<PurchaseOrder>> {
  return get<MpPage<PurchaseOrder>>('/purchase/list', { params })
}

export function createPurchase(body: PurchaseOrder): Promise<void> {
  return post<void>('/purchase', body)
}

export function updatePurchase(body: PurchaseOrder): Promise<void> {
  return put<void>('/purchase', body)
}

export interface RemovePurchaseByIdsParams {
  ids: number | string
}

export function removePurchaseByIds(params: RemovePurchaseByIdsParams): Promise<void> {
  return del<void>(`/purchase/${params.ids}`)
}

export function confirmPurchase(id: number): Promise<void> {
  return put<void>(`/purchase/${id}/confirm`)
}

export function receivePurchase(id: number): Promise<void> {
  return post<void>(`/purchase/${id}/receive`)
}

// --- Items ---

export function listPurchaseItems(orderId: number): Promise<PurchaseOrderItem[]> {
  return get<PurchaseOrderItem[]>(`/purchase/${orderId}/items`)
}

export function addPurchaseItem(orderId: number, body: PurchaseOrderItem): Promise<void> {
  return post<void>(`/purchase/${orderId}/items`, body)
}

// --- Payments ---

export function listPurchasePayments(orderId: number): Promise<PaymentRecord[]> {
  return get<PaymentRecord[]>(`/purchase/${orderId}/payments`)
}

export function addPurchasePayment(orderId: number, body: PaymentRecord): Promise<void> {
  return post<void>(`/purchase/${orderId}/payment`, body)
}
