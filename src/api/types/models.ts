type UnknownRecord = Record<string, unknown>

export interface LoginBody {
  username: string
  password: string
}

export interface SysUser {
  userId?: number
  username?: string
  password?: string
  realName?: string
  phone?: string
  deptName?: string
  status?: number
  createTime?: string
}

export interface LoginData {
  token: string
  user?: SysUser
}

export interface SysMenu extends UnknownRecord {
  menuId?: number
  parentId?: number
  menuName?: string
  path?: string
  perms?: string
  type?: number
  orderNum?: number
}

export interface SysRole extends UnknownRecord {
  roleId?: number
  roleName?: string
  roleKey?: string
  createTime?: string
}

export interface CropBatch extends UnknownRecord {}

export interface GrowthStageLog extends UnknownRecord {}

export interface BaseCropVariety extends UnknownRecord {}

export interface IotSensorData extends UnknownRecord {}

export interface AgriTaskRule extends UnknownRecord {}

export interface MaterialInfo extends UnknownRecord {}

export interface MaterialInoutLog extends UnknownRecord {}

export interface AgriTask {
  taskId?: number
  batchId?: number
  taskName?: string
  taskType?: string
  priority?: number
  planTime?: string
  status?: number
  executorId?: number
  createBy?: number
  createTime?: string
}

export interface TaskAssignRequest {
  taskId: number
  executorId: number
}

export interface TaskExecutionLog extends UnknownRecord {
  logId?: number
  taskId?: number
  actualStartTime?: string
  actualEndTime?: string
  statusSnapshot?: number
  photoUrl?: string
  materialCostJson?: string
  problemDesc?: string
  createTime?: string
}

export interface DashboardSeriesItem extends UnknownRecord {
  name?: string
  type?: string
  data?: Array<number | string | null>
}

export interface ChartDataVO {
  xAxis?: string[]
  series?: DashboardSeriesItem[]
  title?: string
}

export interface NameValueItem {
  name?: string
  value?: number | string
}

export interface DashboardData {
  cropDistribution?: NameValueItem[]
  taskTrend?: ChartDataVO
  envMonitor?: NameValueItem[]
}
