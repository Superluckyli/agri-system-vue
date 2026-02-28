// 任务状态常量映射
export const TASK_STATUS = {
    PENDING_ASSIGN: 0, // 待分配
    PENDING_ACCEPT: 1, // 待接单
    IN_PROGRESS: 2,    // 已接单/执行中
    COMPLETED: 3,      // 已完成
    OVERDUE: 4         // 已逾期 (可能由定时任务或逻辑触发)
} as const

export const TASK_STATUS_MAP: Record<number, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
    [TASK_STATUS.PENDING_ASSIGN]: { text: '待分配', type: 'info' },
    [TASK_STATUS.PENDING_ACCEPT]: { text: '待接单', type: 'warning' },
    [TASK_STATUS.IN_PROGRESS]: { text: '执行中', type: '' },
    [TASK_STATUS.COMPLETED]: { text: '已完成', type: 'success' },
    [TASK_STATUS.OVERDUE]: { text: '已逾期', type: 'danger' }
}

// 任务优先级常量映射
export const TASK_PRIORITY = {
    HIGH: 1,   // 高
    MEDIUM: 2, // 中
    LOW: 3     // 低
} as const

export const TASK_PRIORITY_MAP: Record<number, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
    [TASK_PRIORITY.HIGH]: { text: '高', type: 'danger' },
    [TASK_PRIORITY.MEDIUM]: { text: '中', type: 'warning' },
    [TASK_PRIORITY.LOW]: { text: '低', type: 'info' }
}
