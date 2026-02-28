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

export interface CropBatch extends UnknownRecord {
  batchId?: number
  varietyId?: number
  plotId?: string
  sowingDate?: string
  expectedHarvestDate?: string
  currentStage?: string
  isActive?: number
  cropName?: string
}

export interface GrowthStageLog extends UnknownRecord {
  logId?: number
  batchId?: number
  stageName?: string
  logDate?: string
  imageUrl?: string
  description?: string
}

export interface BaseCropVariety extends UnknownRecord {
  varietyId?: number
  cropName?: string
  growthCycleDays?: number
  idealHumidityMin?: number
  idealHumidityMax?: number
  idealTempMin?: number
  idealTempMax?: number
  createTime?: string
}

export interface IotSensorData extends UnknownRecord {
  dataId?: number
  plotId?: string
  sensorType?: string
  value?: number
  unit?: string
  createTime?: string
}

export interface AgriTaskRule extends UnknownRecord {
  ruleId?: number
  ruleName?: string
  sensorType?: string
  minVal?: number
  maxVal?: number
  autoTaskType?: string
  priority?: number
  isEnable?: number
}

export interface MaterialInfo extends UnknownRecord {
  materialId?: number
  name?: string
  category?: string
  price?: number
  stockQuantity?: number
  unit?: string
  updateTime?: string
}

export interface MaterialInoutLog extends UnknownRecord {
  logId?: number
  materialId?: number
  type?: number
  quantity?: number
  relatedTaskId?: number
  remark?: string
  createTime?: string
}

export interface AgriTask {
  taskId?: number
  batchId?: number
  taskName?: string
  taskType?: string
  priority?: number
  planTime?: string
  status?: number
  executorId?: number
  creatorId?: number
  assigneeId?: number
  landId?: number
  extParams?: string
  createBy?: number
  createTime?: string
}

export interface TaskAssignRequest {
  taskId: number
  executorId: number
  remark?: string
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

export interface TaskAcceptDTO {
  taskId?: number
}

export interface TaskRejectDTO {
  taskId?: number
  reason?: string
}

// 补充类型别名导出
export type User = SysUser
export type Role = SysRole
export type Task = AgriTask
export type TaskAssignDTO = TaskAssignRequest
export type DashboardVO = DashboardData
