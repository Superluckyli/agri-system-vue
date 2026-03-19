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
  roleNames?: string[]
  roleIds?: number[]
}

export interface LoginData {
  token: string
  user?: SysUser
  roles?: string[]
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

// --- V1 新增 ---

export interface AgriFarmland extends UnknownRecord {
  id?: number
  tenantId?: number
  orgId?: number
  code?: string
  name?: string
  area?: number
  location?: string
  status?: number
  managerUserId?: number
  cropAdaptNote?: string
  createdAt?: string
  updatedAt?: string
}

export interface AgriCropBatch extends UnknownRecord {
  id?: number
  tenantId?: number
  orgId?: number
  farmlandId?: number
  varietyId?: number
  batchNo?: string
  cropVariety?: string
  status?: string
  stage?: string
  plantingDate?: string
  estimatedHarvestDate?: string
  actualHarvestDate?: string
  ownerUserId?: number
  targetOutput?: number
  actualOutput?: number
  abandonReason?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
  // transient (JOIN)
  farmlandName?: string
  varietyName?: string
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
  cooldownMinutes?: number
  createMode?: 'MANUAL' | 'AUTO' | 'AUTO_AI'
}

export interface MaterialInfo extends UnknownRecord {
  materialId?: number
  tenantId?: number
  orgId?: number
  name?: string
  category?: string
  specification?: string
  unit?: string
  currentStock?: number
  safeThreshold?: number
  suggestPurchaseQty?: number
  supplierId?: number
  unitPrice?: number
  status?: number
  version?: number
  createdAt?: string
  updatedAt?: string
  // transient (JOIN)
  supplierName?: string
}

export interface MaterialStockLog extends UnknownRecord {
  id?: number
  materialId?: number
  changeType?: string
  qty?: number
  beforeStock?: number
  afterStock?: number
  relatedType?: string
  relatedId?: number
  operatorId?: number
  remark?: string
  createdAt?: string
}

export interface AgriTask {
  taskId?: number
  tenantId?: number
  orgId?: number
  batchId?: number
  taskNo?: string
  taskName?: string
  taskType?: string
  taskSource?: string
  riskLevel?: string
  needReview?: number
  priority?: number
  planTime?: string
  deadlineAt?: string
  statusV2?: string
  assigneeId?: number
  assigneeName?: string
  assignTime?: string
  assignBy?: number
  assignRemark?: string
  reviewerUserId?: number
  acceptTime?: string
  acceptBy?: number
  completedAt?: string
  rejectTime?: string
  rejectBy?: number
  rejectReason?: string
  rejectReasonType?: string
  suspendReason?: string
  cancelReason?: string
  suggestAction?: string
  precautionNote?: string
  createBy?: number
  createTime?: string
  updateBy?: number
  updateTime?: string
  sourceRuleId?: number
  sourceFarmlandId?: number
  version?: number
}

export interface TaskAssignRequest {
  taskId: number
  assigneeId: number
  remark?: string
}

export interface TaskAcceptDTO {
  taskId?: number
}

export interface TaskRejectDTO {
  taskId?: number
  reason?: string
}

export interface TaskReviewRequest {
  approved: boolean
  comment?: string
}

export interface AgriTaskLog extends UnknownRecord {
  id?: number
  taskId?: number
  batchId?: number
  action?: string
  fromStatus?: string
  toStatus?: string
  operatorId?: number
  targetUserId?: number
  growthNote?: string
  imageUrls?: string
  abnormalNote?: string
  remark?: string
  traceId?: string
  // transient (JOIN)
  operatorName?: string
  createdAt?: string
}

export interface AgriTaskMaterial extends UnknownRecord {
  id?: number
  taskId?: number
  materialId?: number
  suggestedQty?: number
  actualQty?: number
  unitPrice?: number
  deviationReason?: string
  // transient (JOIN)
  materialName?: string
  createdAt?: string
}

export interface SupplierInfo extends UnknownRecord {
  id?: number
  tenantId?: number
  name?: string
  contactName?: string
  phone?: string
  address?: string
  status?: number
  remark?: string
  createdAt?: string
}

export interface PurchaseOrder extends UnknownRecord {
  id?: number
  tenantId?: number
  orgId?: number
  orderNo?: string
  status?: string
  supplierId?: number
  totalAmount?: number
  payMethod?: string
  remark?: string
  createdBy?: number
  confirmedBy?: number
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface PurchaseOrderItem extends UnknownRecord {
  id?: number
  purchaseOrderId?: number
  materialId?: number
  purchaseQty?: number
  receiveQty?: number
  unitPrice?: number
  lineAmount?: number
  remark?: string
}

export interface PaymentRecord extends UnknownRecord {
  id?: number
  purchaseOrderId?: number
  payAmount?: number
  payMethod?: string
  payTime?: string
  status?: string
  operatorId?: number
  remark?: string
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

// Dashboard V2
export interface TaskCompletionVO {
  completed: number
  total: number
}

export interface FarmlandStatsVO {
  totalArea: number
  activeArea: number
  utilizationRate: number
}

export interface CropProgressItem {
  id?: number
  batchNo?: string
  cropVariety?: string
  farmlandName?: string
  progressPercent?: number
  stage?: string
  status?: string
  targetOutput?: number
  actualOutput?: number
  estimatedHarvestDate?: string
}

export interface AlertItem {
  title?: string
  description?: string
  level?: string
  time?: string
  sensorType?: string
}

export interface LowStockItem {
  materialId?: number
  name?: string
  category?: string
  unit?: string
  currentStock?: number
  safeThreshold?: number
  unitPrice?: number
  healthPercent?: number
  status?: string
}

export interface DashboardV2Data {
  taskCompletion?: TaskCompletionVO
  farmlandStats?: FarmlandStatsVO
  alertCount?: number
  monthlySpending?: number
  cropProgress?: CropProgressItem[]
  recentAlerts?: AlertItem[]
  lowStockMaterials?: LowStockItem[]
}

export interface PasswordChangeRequest {
  oldPassword: string
  newPassword: string
}

// 类型别名
export type User = SysUser
export type Role = SysRole
export type Task = AgriTask
export type TaskAssignDTO = TaskAssignRequest
export type DashboardVO = DashboardData
