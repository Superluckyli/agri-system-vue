<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, View, Download } from '@element-plus/icons-vue'

import {
  cancelPurchase,
  confirmPurchase,
  createPurchase,
  createPurchaseItems,
  createPurchasePayment,
  getPurchaseItemsByOrderId,
  getPurchasePaymentsByOrderId,
  listPurchase,
  receivePurchase,
  removePurchaseByIds,
  updatePurchase,
} from '@/api/modules/purchase'
import { getSupplierAll } from '@/api/modules/supplier'
import { getMaterialInfoAll } from '@/api/modules/material'
import { PURCHASE_STATUS_MAP } from '@/constants/task'
import type { MaterialInfo, PaymentRecord, PurchaseOrder, PurchaseOrderItem, SupplierInfo } from '@/types/entity'
import { useExport, type ExportColumn } from '@/composables/useExport'

// --- 查询 & 列表 ---

interface QueryParams {
  pageNum: number
  pageSize: number
  status: string
  supplierId: number | null
}

const loading = ref(false)
const loadError = ref('')
const list = ref<PurchaseOrder[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  status: '',
  supplierId: null,
})

const supplierOptions = ref<SupplierInfo[]>([])
const materialOptions = ref<MaterialInfo[]>([])

const fetchSuppliers = async () => {
  try {
    supplierOptions.value = await getSupplierAll()
  } catch {
    supplierOptions.value = []
  }
}

const fetchMaterials = async () => {
  try {
    materialOptions.value = await getMaterialInfoAll()
  } catch {
    materialOptions.value = []
  }
}

const getSupplierName = (supplierId?: number) => {
  if (!supplierId) return '-'
  const found = supplierOptions.value.find((s) => s.id === supplierId)
  return found?.name || `供应商ID: ${supplierId}`
}

const getMaterialName = (materialId?: number) => {
  if (!materialId) return '-'
  const found = materialOptions.value.find((m) => m.materialId === materialId)
  return found?.name || `物资ID: ${materialId}`
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listPurchase({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      status: queryParams.status || undefined,
      supplierId: queryParams.supplierId || undefined,
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载采购订单失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  void fetchList()
}

const resetQuery = () => {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.status = ''
  queryParams.supplierId = null
  void fetchList()
}

const handleSizeChange = (size: number) => {
  queryParams.pageSize = size
  void fetchList()
}

const handleCurrentChange = (page: number) => {
  queryParams.pageNum = page
  void fetchList()
}

// --- 新增/编辑表单 ---

interface OrderFormModel {
  id?: number
  supplierId: number | null
  payMethod: string
  remark: string
}

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<OrderFormModel>({
  id: undefined,
  supplierId: null,
  payMethod: '',
  remark: '',
})

const formRules: FormRules<OrderFormModel> = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
}

const resetForm = () => {
  form.id = undefined
  form.supplierId = null
  form.payMethod = ''
  form.remark = ''
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增采购订单'
  dialogVisible.value = true
}

const handleEdit = (row: PurchaseOrder) => {
  resetForm()
  dialogTitle.value = '编辑采购订单'
  form.id = row.id
  form.supplierId = row.supplierId ?? null
  form.payMethod = row.payMethod || ''
  form.remark = row.remark || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: PurchaseOrder = {
    id: form.id,
    supplierId: Number(form.supplierId),
    payMethod: form.payMethod.trim() || undefined,
    remark: form.remark.trim() || undefined,
  }

  try {
    if (payload.id) {
      await updatePurchase(payload)
      ElMessage.success('更新订单成功')
    } else {
      delete payload.id
      await createPurchase(payload)
      ElMessage.success('新增订单成功')
    }
    dialogVisible.value = false
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交失败'
    ElMessage.error(message)
  }
}

// --- 操作：删除/确认/取消/收货 ---

const handleDelete = (row: PurchaseOrder) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认删除订单「${row.orderNo || row.id}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removePurchaseByIds({ ids: row.id as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.pageNum > 1) {
        queryParams.pageNum -= 1
      }
      await fetchList()
    })
    .catch(() => {})
}

const handleConfirm = (row: PurchaseOrder) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认提交订单「${row.orderNo || row.id}」吗？`, '确认订单', {
    type: 'info',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await confirmPurchase(row.id as number)
      ElMessage.success('订单已确认')
      await fetchList()
    })
    .catch(() => {})
}

const handleCancel = (row: PurchaseOrder) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认取消订单「${row.orderNo || row.id}」吗？`, '取消订单', {
    type: 'warning',
    confirmButtonText: '确认取消',
    cancelButtonText: '返回',
  })
    .then(async () => {
      await cancelPurchase(row.id as number)
      ElMessage.success('订单已取消')
      await fetchList()
    })
    .catch(() => {})
}

const handleReceive = (row: PurchaseOrder) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认收货订单「${row.orderNo || row.id}」吗？`, '确认收货', {
    type: 'success',
    confirmButtonText: '确认收货',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await receivePurchase(row.id as number)
      ElMessage.success('收货成功')
      await fetchList()
    })
    .catch(() => {})
}

// --- 详情 Drawer ---

const drawerVisible = ref(false)
const currentOrder = ref<PurchaseOrder | null>(null)
const orderItems = ref<PurchaseOrderItem[]>([])
const orderPayments = ref<PaymentRecord[]>([])
const detailLoading = ref(false)

const handleView = async (row: PurchaseOrder) => {
  currentOrder.value = row
  drawerVisible.value = true
  detailLoading.value = true
  try {
    const [items, payments] = await Promise.all([
      getPurchaseItemsByOrderId(row.id as number),
      getPurchasePaymentsByOrderId(row.id as number),
    ])
    orderItems.value = items || []
    orderPayments.value = payments || []
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载详情失败'
    ElMessage.error(message)
    orderItems.value = []
    orderPayments.value = []
  } finally {
    detailLoading.value = false
  }
}

// --- 子表弹窗: 新增订单明细 ---

interface ItemFormModel {
  materialId: number | null
  purchaseQty: number | null
  unitPrice: number | null
}

const itemDialogVisible = ref(false)
const itemFormRef = ref<FormInstance>()
const itemForm = reactive<ItemFormModel>({
  materialId: null,
  purchaseQty: null,
  unitPrice: null,
})

const itemRules: FormRules<ItemFormModel> = {
  materialId: [{ required: true, message: '请选择物资', trigger: 'change' }],
  purchaseQty: [{ required: true, message: '请输入采购数量', trigger: 'change' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'change' }],
}

const handleAddItem = () => {
  itemForm.materialId = null
  itemForm.purchaseQty = null
  itemForm.unitPrice = null
  itemDialogVisible.value = true
}

const submitItem = async () => {
  if (!itemFormRef.value || !currentOrder.value?.id) return
  const valid = await itemFormRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: PurchaseOrderItem = {
    materialId: Number(itemForm.materialId),
    purchaseQty: Number(itemForm.purchaseQty),
    unitPrice: Number(itemForm.unitPrice),
  }

  try {
    await createPurchaseItems(currentOrder.value.id, payload)
    ElMessage.success('明细添加成功')
    itemDialogVisible.value = false
    // 刷新子表
    orderItems.value = await getPurchaseItemsByOrderId(currentOrder.value.id)
    // 刷新主表（总金额可能变化）
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '添加明细失败'
    ElMessage.error(message)
  }
}

// --- 子表弹窗: 新增付款记录 ---

interface PaymentFormModel {
  payAmount: number | null
  payMethod: string
  payTime: string
}

const payDialogVisible = ref(false)
const payFormRef = ref<FormInstance>()
const payForm = reactive<PaymentFormModel>({
  payAmount: null,
  payMethod: '',
  payTime: '',
})

const payRules: FormRules<PaymentFormModel> = {
  payAmount: [{ required: true, message: '请输入付款金额', trigger: 'change' }],
  payMethod: [{ required: true, message: '请输入付款方式', trigger: 'blur' }],
}

const handleAddPayment = () => {
  payForm.payAmount = null
  payForm.payMethod = ''
  payForm.payTime = ''
  payDialogVisible.value = true
}

const submitPayment = async () => {
  if (!payFormRef.value || !currentOrder.value?.id) return
  const valid = await payFormRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: PaymentRecord = {
    payAmount: Number(payForm.payAmount),
    payMethod: payForm.payMethod.trim(),
    payTime: payForm.payTime || undefined,
  }

  try {
    await createPurchasePayment(currentOrder.value.id, payload)
    ElMessage.success('付款记录添加成功')
    payDialogVisible.value = false
    orderPayments.value = await getPurchasePaymentsByOrderId(currentOrder.value.id)
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '添加付款失败'
    ElMessage.error(message)
  }
}

const { exportToXlsx } = useExport()

const purchaseExportColumns: ExportColumn[] = [
  { header: '订单号', key: 'orderNo' },
  { header: '供应商ID', key: 'supplierId' },
  { header: '总金额', key: 'totalAmount' },
  { header: '付款方式', key: 'payMethod' },
  { header: '状态', key: 'status', formatter: (v) => PURCHASE_STATUS_MAP[v as string]?.text || String(v ?? '') },
  { header: '创建时间', key: 'createdAt' },
]

const handleExport = async () => {
  try {
    const res = await listPurchase({ pageNum: 1, pageSize: 9999 })
    exportToXlsx(res.records || [], purchaseExportColumns, '采购订单')
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

// --- 初始化 ---

onMounted(() => {
  void Promise.all([fetchList(), fetchSuppliers(), fetchMaterials()])
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">采购管理</div>
          <div class="subtitle">管理采购订单、明细及付款记录</div>
        </div>
      </template>

      <!-- 筛选表单 -->
      <el-form :model="queryParams" inline label-width="80px">
        <el-form-item label="订单状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 180px">
            <el-option v-for="(val, key) in PURCHASE_STATUS_MAP" :key="key" :label="val.text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="queryParams.supplierId" placeholder="全部供应商" clearable filterable style="width: 220px">
            <el-option
              v-for="item in supplierOptions"
              :key="item.id"
              :label="item.name || `ID: ${item.id}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="12">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增订单</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <!-- 主表 -->
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="ID" prop="id" align="center" width="80" />
        <el-table-column label="订单号" prop="orderNo" width="160" align="center" />
        <el-table-column label="供应商" min-width="150">
          <template #default="scope">
            {{ getSupplierName(scope.row.supplierId) }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" prop="totalAmount" width="120" align="right">
          <template #default="scope">
            {{ scope.row.totalAmount != null ? `¥${Number(scope.row.totalAmount).toFixed(2)}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.status && PURCHASE_STATUS_MAP[scope.row.status as string]"
              :type="PURCHASE_STATUS_MAP[scope.row.status as string]?.type"
            >
              {{ PURCHASE_STATUS_MAP[scope.row.status as string]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="180" align="center" />
        <el-table-column label="操作" min-width="280" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button
              v-if="scope.row.status === 'draft'"
              link
              type="primary"
              :icon="Edit"
              @click="handleEdit(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="scope.row.status === 'draft'"
              link
              type="success"
              @click="handleConfirm(scope.row)"
            >
              确认
            </el-button>
            <el-button
              v-if="scope.row.status === 'confirmed' || scope.row.status === 'receiving'"
              link
              type="warning"
              @click="handleReceive(scope.row)"
            >
              收货
            </el-button>
            <el-button
              v-if="scope.row.status !== 'completed' && scope.row.status !== 'cancelled'"
              link
              type="info"
              @click="handleCancel(scope.row)"
            >
              取消
            </el-button>
            <el-button
              v-if="scope.row.status === 'draft'"
              link
              type="danger"
              :icon="Delete"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无采购订单数据" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="total > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 30, 50]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑订单 Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="form.supplierId" placeholder="请选择供应商" filterable style="width: 100%">
            <el-option
              v-for="item in supplierOptions"
              :key="item.id"
              :label="item.name || `ID: ${item.id}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="付款方式" prop="payMethod">
          <el-input v-model="form.payMethod" placeholder="例如：银行转账、现金" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="订单备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 Drawer -->
    <el-drawer v-model="drawerVisible" title="订单详情" size="55%">
      <div v-if="currentOrder" v-loading="detailLoading" class="detail-wrapper">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ getSupplierName(currentOrder.supplierId) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">
            {{ currentOrder.totalAmount != null ? `¥${Number(currentOrder.totalAmount).toFixed(2)}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="付款方式">{{ currentOrder.payMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              v-if="currentOrder.status && PURCHASE_STATUS_MAP[currentOrder.status]"
              :type="PURCHASE_STATUS_MAP[currentOrder.status]?.type"
            >
              {{ PURCHASE_STATUS_MAP[currentOrder.status]?.text }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentOrder.createdAt || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.remark" label="备注" :span="2">
            {{ currentOrder.remark }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 订单明细 -->
        <div class="sub-section">
          <div class="sub-section-header">
            <span class="sub-section-title">订单明细</span>
            <el-button type="primary" size="small" :icon="Plus" @click="handleAddItem">新增明细</el-button>
          </div>
          <el-table :data="orderItems" style="width: 100%" size="small">
            <el-table-column label="物资" min-width="150">
              <template #default="scope">
                {{ getMaterialName(scope.row.materialId) }}
              </template>
            </el-table-column>
            <el-table-column label="采购数量" prop="purchaseQty" width="100" align="center" />
            <el-table-column label="已收数量" prop="receiveQty" width="100" align="center" />
            <el-table-column label="单价" width="100" align="right">
              <template #default="scope">
                {{ scope.row.unitPrice != null ? `¥${Number(scope.row.unitPrice).toFixed(2)}` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="行金额" width="110" align="right">
              <template #default="scope">
                {{ scope.row.lineAmount != null ? `¥${Number(scope.row.lineAmount).toFixed(2)}` : '-' }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无明细" :image-size="60" />
            </template>
          </el-table>
        </div>

        <!-- 付款记录 -->
        <div class="sub-section">
          <div class="sub-section-header">
            <span class="sub-section-title">付款记录</span>
            <el-button type="primary" size="small" :icon="Plus" @click="handleAddPayment">新增付款</el-button>
          </div>
          <el-table :data="orderPayments" style="width: 100%" size="small">
            <el-table-column label="付款金额" width="120" align="right">
              <template #default="scope">
                {{ scope.row.payAmount != null ? `¥${Number(scope.row.payAmount).toFixed(2)}` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="付款方式" prop="payMethod" width="120" align="center" />
            <el-table-column label="付款时间" prop="payTime" min-width="160" align="center" />
            <el-table-column label="状态" prop="status" width="100" align="center" />
            <template #empty>
              <el-empty description="暂无付款记录" :image-size="60" />
            </template>
          </el-table>
        </div>
      </div>
    </el-drawer>

    <!-- 新增明细 Dialog -->
    <el-dialog v-model="itemDialogVisible" title="新增订单明细" width="480px" destroy-on-close>
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="100px">
        <el-form-item label="物资" prop="materialId">
          <el-select v-model="itemForm.materialId" placeholder="请选择物资" filterable style="width: 100%">
            <el-option
              v-for="item in materialOptions"
              :key="item.materialId"
              :label="item.name || `ID: ${item.materialId}`"
              :value="item.materialId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="采购数量" prop="purchaseQty">
          <el-input-number v-model="itemForm.purchaseQty" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价" prop="unitPrice">
          <el-input-number v-model="itemForm.unitPrice" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增付款 Dialog -->
    <el-dialog v-model="payDialogVisible" title="新增付款记录" width="480px" destroy-on-close>
      <el-form ref="payFormRef" :model="payForm" :rules="payRules" label-width="100px">
        <el-form-item label="付款金额" prop="payAmount">
          <el-input-number v-model="payForm.payAmount" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="付款方式" prop="payMethod">
          <el-input v-model="payForm.payMethod" placeholder="例如：银行转账" />
        </el-form-item>
        <el-form-item label="付款时间" prop="payTime">
          <el-date-picker
            v-model="payForm.payTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择付款时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPayment">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.toolbar {
  margin-bottom: 12px;
}

.pagination {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.detail-wrapper {
  padding-right: 12px;
}

.sub-section {
  margin-top: 24px;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sub-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
</style>
