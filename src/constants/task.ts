// V1 任务状态常量 (status_v2 VARCHAR)
export const TASK_STATUS_V2 = {
  PENDING_REVIEW: 'pending_review',
  PENDING_ACCEPT: 'pending_accept',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED_REASSIGN: 'rejected_reassign',
  REJECTED_REVIEW: 'rejected_review',
  SUSPENDED: 'suspended',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const

export const TASK_STATUS_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  [TASK_STATUS_V2.PENDING_REVIEW]: { text: '待复核', type: 'warning' },
  [TASK_STATUS_V2.PENDING_ACCEPT]: { text: '待接单', type: 'info' },
  [TASK_STATUS_V2.IN_PROGRESS]: { text: '执行中', type: '' },
  [TASK_STATUS_V2.COMPLETED]: { text: '已完成', type: 'success' },
  [TASK_STATUS_V2.REJECTED_REASSIGN]: { text: '已拒单(重派)', type: 'danger' },
  [TASK_STATUS_V2.REJECTED_REVIEW]: { text: '已拒单(复核)', type: 'danger' },
  [TASK_STATUS_V2.SUSPENDED]: { text: '已暂停', type: 'warning' },
  [TASK_STATUS_V2.OVERDUE]: { text: '已逾期', type: 'danger' },
  [TASK_STATUS_V2.CANCELLED]: { text: '已取消', type: 'info' },
}

// 任务优先级常量映射
export const TASK_PRIORITY = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const

export const TASK_PRIORITY_MAP: Record<number, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  [TASK_PRIORITY.HIGH]: { text: '高', type: 'danger' },
  [TASK_PRIORITY.MEDIUM]: { text: '中', type: 'warning' },
  [TASK_PRIORITY.LOW]: { text: '低', type: 'info' },
}

// 批次状态
export const BATCH_STATUS_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  planned: { text: '计划中', type: 'info' },
  in_progress: { text: '生长中', type: '' },
  paused: { text: '已暂停', type: 'warning' },
  harvested: { text: '已收获', type: 'success' },
  abandoned: { text: '已废弃', type: 'danger' },
  archived: { text: '已归档', type: 'info' },
}

// 采购单状态
export const PURCHASE_STATUS_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { text: '草稿', type: 'info' },
  confirmed: { text: '已确认', type: '' },
  received: { text: '已收货', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' },
}
