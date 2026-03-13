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

// 批次状态（后端初始值为 not_started）
export const BATCH_STATUS_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  not_started: { text: '未开始', type: 'info' },
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
  receiving: { text: '收货中', type: 'warning' },
  partial_received: { text: '部分收货', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' },
}

// 风险等级
export const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const

export const RISK_LEVEL_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  [RISK_LEVEL.LOW]: { text: '低', type: 'success' },
  [RISK_LEVEL.MEDIUM]: { text: '中', type: 'warning' },
  [RISK_LEVEL.HIGH]: { text: '高', type: 'danger' },
}

// 任务来源
export const TASK_SOURCE = {
  MANUAL: 'manual',
  RULE: 'rule',
  AI: 'ai',
} as const

export const TASK_SOURCE_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  [TASK_SOURCE.MANUAL]: { text: '手动创建', type: '' },
  [TASK_SOURCE.RULE]: { text: '规则触发', type: 'warning' },
  [TASK_SOURCE.AI]: { text: 'AI 推荐', type: 'info' },
}

// 物资变更类型
export const MATERIAL_CHANGE_TYPE = {
  OUT: 'OUT',
  IN: 'IN',
  ADJUST: 'ADJUST',
  DAMAGE: 'DAMAGE',
  RETURN: 'RETURN',
} as const

export const MATERIAL_CHANGE_TYPE_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  [MATERIAL_CHANGE_TYPE.OUT]: { text: '出库', type: 'danger' },
  [MATERIAL_CHANGE_TYPE.IN]: { text: '入库', type: 'success' },
  [MATERIAL_CHANGE_TYPE.ADJUST]: { text: '盘点调整', type: 'warning' },
  [MATERIAL_CHANGE_TYPE.DAMAGE]: { text: '损耗', type: 'danger' },
  [MATERIAL_CHANGE_TYPE.RETURN]: { text: '退货', type: 'info' },
}
