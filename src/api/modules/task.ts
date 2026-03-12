/* eslint-disable */
// V1 rewrite — task API module

import { del, get, post, put } from '@/api/http'
import type { AgriTask, TaskAssignRequest, TaskAcceptDTO, TaskRejectDTO, AgriTaskLog, AgriTaskMaterial } from '@/types/entity'
import type { MpPage } from '@/types/api'

export function createTask(body: AgriTask): Promise<void> {
  return post<void>('/task', body)
}

export function updateTask(body: Partial<AgriTask>): Promise<void> {
  return put<void>('/task', body)
}

export function assignTask(body: TaskAssignRequest): Promise<void> {
  return put<void>('/task/assign', body)
}

export function acceptTask(body: TaskAcceptDTO): Promise<void> {
  return post<void>('/task/accept', body)
}

export function rejectTask(body: TaskRejectDTO): Promise<void> {
  return post<void>('/task/reject', body)
}

export function completeTask(taskId: number): Promise<void> {
  return post<void>(`/task/${taskId}/complete`)
}

export interface ListTaskParams {
  pageNum?: number | string
  pageSize?: number | string
  taskName?: string
  statusV2?: string
  assigneeId?: number | string
}

export function listTask(params: ListTaskParams): Promise<MpPage<AgriTask>> {
  return get<MpPage<AgriTask>>('/task/list', { params })
}

export interface RemoveTaskByIdsParams {
  ids: number | string
}

export function removeTaskByIds(params: RemoveTaskByIdsParams): Promise<void> {
  return del<void>(`/task/${params.ids}`)
}

// --- Task Logs ---

export function listTaskLogByTask(taskId: number): Promise<AgriTaskLog[]> {
  return get<AgriTaskLog[]>(`/task/log/${taskId}`)
}

export interface ListTaskLogParams {
  pageNum?: number | string
  pageSize?: number | string
  taskId?: number | string
  batchId?: number | string
  action?: string
}

export function listTaskLog(params: ListTaskLogParams): Promise<MpPage<AgriTaskLog>> {
  return get<MpPage<AgriTaskLog>>('/task/log/list', { params })
}

export function createTaskLog(body: AgriTaskLog): Promise<void> {
  return post<void>('/task/log', body)
}

// --- Task Materials ---

export function listTaskMaterials(taskId: number): Promise<AgriTaskMaterial[]> {
  return get<AgriTaskMaterial[]>(`/task/${taskId}/materials`)
}

export function addTaskMaterial(taskId: number, body: AgriTaskMaterial): Promise<void> {
  return post<void>(`/task/${taskId}/materials`, body)
}
