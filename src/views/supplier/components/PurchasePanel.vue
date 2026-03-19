<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, View, Download } from '@element-plus/icons-vue'

import {
  cancelPurchase,
  confirmPurchase,
  createPurchase,
  createPurchaseItems,
  getPurchaseItemsByOrderId,
  getPurchasePaymentsByOrderId,
  listPurchase,
  receivePurchase,
  removePurchaseByIds,
  updatePurchase,
  updatePurchaseItems,
  updatePurchasePay,
} from '@/api/modules/purchase'
import { PAY_METHOD_OPTIONS, PURCHASE_STATUS_MAP } from '@/constants/task'
import type { MaterialInfo, PaymentRecord, PurchaseOrder, PurchaseOrderItem, SupplierInfo } from '@/types/entity'
import { useExport, type ExportColumn } from '@/composables/useExport'
import {
  applyMaterialDefaultsToPurchaseItem,
  getLatestPurchaseOrderState,
  mapPurchaseItemsToEditableItems,
  saveDraftPurchaseOrderEdit,
  toPurchaseOrderItemPayload,
} from '@/views/purchase/purchaseOrderShared'

const props = defineProps<{
  supplier: SupplierInfo | null
  supplierOptions: SupplierInfo[]
  materialOptions: MaterialInfo[]
  prefill?: string
}>()

// --- 查询 & 列表 ---

interface QueryParams {
  pageNum: number
  pageSize: number
  status: string
}

const loading = ref(false)
const loadError = ref('')
const list = ref<PurchaseOrder[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  status: '',
})

const getSupplierName = (supplierId?: number) => {
  if (!supplierId) return '-'
  const found = props.supplierOptions.find((s) => s.id === supplierId)
  return found?.name || `供应商ID: ${supplierId}`
}

const getMaterialName = (materialId?: number) => {
  if (!materialId) return '-'
  const found = props.materialOptions.find((m) => m.materialId === materialId)
  return found?.name || `物资ID: ${materialId}`
}

const fetchList = async (): Promise<PurchaseOrder[]> => {
  if (!props.supplier?.id) return []
  loading.value = true
  loadError.value = ''
  try {
    const res = await listPurchase({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      status: queryParams.status || undefined,
      supplierId: props.supplier.id,
    })
    list.value = res.items || []
    total.value = Number(res.total || 0)
    syncCurrentOrder(list.value)
    return list.value
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载采购订单失败'
    list.value = []
    total.value = 0
    syncCurrentOrder([])
    return []
  } finally {
    loading.value = false
  }
}

watch(() => props.supplier?.id, (newId) => {
  currentOrder.value = null
  orderItems.value = []
  orderPayments.value = []
  drawerVisible.value = false
  if (newId) {
    queryParams.pageNum = 1
    queryParams.status = ''
    void fetchList()
  } else {
    list.value = []
    total.value = 0
  }
})

const handleQuery = () => {
  queryParams.pageNum = 1
  void fetchList()
}

const resetQuery = () => {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.status = ''
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

interface ItemFormRow {
  materialId: number | null
  purchaseQty: number
  unitPrice: number
  lineAmount: number
}

interface OrderFormModel {
  id?: number
  supplierId: number | null
  remark: string
  items: ItemFormRow[]
}

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<OrderFormModel>({
  id: undefined,
  supplierId: null,
  remark: '',
  items: [],
})

const formRules: FormRules<OrderFormModel> = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
}

const formTotalAmount = computed(() =>
  Number(form.items.reduce((sum, row) => sum + (row.lineAmount || 0), 0).toFixed(2))
)
const formTotal = computed(() => formTotalAmount.value.toFixed(2))

const calcLineAmount = (row: ItemFormRow) => {
  row.lineAmount = Number(((row.purchaseQty || 0) * (row.unitPrice || 0)).toFixed(2))
}

const addItemRow = () => {
  form.items.push({ materialId: null, purchaseQty: 1, unitPrice: 0, lineAmount: 0 })
}

const removeItemRow = (index: number) => {
  form.items.splice(index, 1)
}

const handleMaterialChange = (row: ItemFormRow) => {
  if (row.materialId === null) return
  const existing = form.items.filter(i => i !== row && i.materialId === row.materialId)
  const duplicate = existing[0]
  if (duplicate) {
    duplicate.purchaseQty += row.purchaseQty
    calcLineAmount(duplicate)
    form.items.splice(form.items.indexOf(row), 1)
    ElMessage.info('相同物资已合并数量')
    return
  }
  Object.assign(row, applyMaterialDefaultsToPurchaseItem(row, props.materialOptions))
}

const resetForm = () => {
  form.id = undefined
  form.supplierId = props.supplier?.id ?? null
  form.remark = ''
  form.items = []
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增采购订单'
  dialogVisible.value = true
}

const handleEdit = async (row: PurchaseOrder) => {
  resetForm()
  dialogTitle.value = '编辑采购订单'
  form.id = row.id
  form.supplierId = row.supplierId ?? null
  form.remark = row.remark || ''
  // 加载已有明细
  if (row.id) {
    try {
      const items = await getPurchaseItemsByOrderId(row.id)
      form.items = mapPurchaseItemsToEditableItems(items || []) as ItemFormRow[]
    } catch {
      form.items = []
    }
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.id) {
      await saveDraftPurchaseOrderEdit(
        {
          id: form.id,
          supplierId: form.supplierId,
          remark: form.remark,
          items: form.items,
        },
        { updatePurchase, updatePurchaseItems },
      )
      ElMessage.success('更新订单成功')
    } else {
      const itemsPayload = toPurchaseOrderItemPayload(form.items)
      if (itemsPayload.length === 0) {
        ElMessage.warning('请至少添加一条物资明细')
        return
      }
      const payload = {
        supplierId: form.supplierId,
        remark: form.remark.trim() || undefined,
        items: itemsPayload,
      }
      await createPurchase(payload as any)
      ElMessage.success('新增订单成功')
    }
    dialogVisible.value = false
    await fetchList()
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

const syncCurrentOrder = (
  latestOrders: PurchaseOrder[] = list.value,
  latestItems: PurchaseOrderItem[] = orderItems.value,
) => {
  currentOrder.value = getLatestPurchaseOrderState({
    currentOrder: currentOrder.value,
    latestOrders,
    latestItems,
  })
}

const loadOrderDetail = async (id: number) => {
  detailLoading.value = true
  try {
    const [items, payments] = await Promise.all([
      getPurchaseItemsByOrderId(id),
      getPurchasePaymentsByOrderId(id),
    ])
    orderItems.value = items || []
    orderPayments.value = payments || []
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载详情失败'
    ElMessage.error(message)
    orderItems.value = []
    orderPayments.value = []
  } finally {
    syncCurrentOrder(list.value, orderItems.value)
    detailLoading.value = false
  }
}

const handleView = async (row: PurchaseOrder) => {
  currentOrder.value = row
  drawerVisible.value = true
  await loadOrderDetail(row.id as number)
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
  unitPrice: [{ required: true, message: '请输入成交价', trigger: 'change' }],
}

const handleAddItem = () => {
  itemForm.materialId = null
  itemForm.purchaseQty = null
  itemForm.unitPrice = null
  itemDialogVisible.value = true
}

const handleItemMaterialChange = () => {
  const nextItem = applyMaterialDefaultsToPurchaseItem(
    { ...itemForm, lineAmount: 0 },
    props.materialOptions,
  )
  itemForm.unitPrice = nextItem.unitPrice
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
    await loadOrderDetail(currentOrder.value.id)
    await fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '添加明细失败'
    ElMessage.error(message)
  }
}

// --- 付款弹窗 ---

const payDialogVisible = ref(false)
const payMethodSelected = ref('')

const handlePay = (row: PurchaseOrder) => {
  if (!row.id) return
  currentOrder.value = row
  payMethodSelected.value = ''
  payDialogVisible.value = true
}

const submitPay = async () => {
  if (!currentOrder.value?.id) return
  if (!payMethodSelected.value) {
    ElMessage.warning('请选择付款方式')
    return
  }
  try {
    await updatePurchasePay(currentOrder.value.id, { payMethod: payMethodSelected.value } as any)
    ElMessage.success('付款成功')
    payDialogVisible.value = false
    if (drawerVisible.value) {
      await loadOrderDetail(currentOrder.value.id)
    }
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '付款失败'
    ElMessage.error(message)
  }
}

// --- 导出 ---

const { exportToXlsx } = useExport()

const purchaseExportColumns: ExportColumn[] = [
  { header: '订单号', key: 'orderNo' },
  { header: '供应商', key: 'supplierId', formatter: (v) => getSupplierName(v as number) },
  { header: '总金额', key: 'totalAmount' },
  { header: '付款方式', key: 'payMethod' },
  { header: '状态', key: 'status', formatter: (v) => PURCHASE_STATUS_MAP[v as string]?.text || String(v ?? '') },
  { header: '创建时间', key: 'createdAt' },
]

const handleExport = async () => {
  try {
    const res = await listPurchase({
      pageNum: 1,
      pageSize: 9999,
      supplierId: props.supplier?.id || undefined,
    })
    exportToXlsx(res.items || [], purchaseExportColumns, '采购订单')
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

// --- 低库存预填充 ---

async function prefillLowStock() {
  if (props.prefill !== 'lowstock') return
  try {
    const { getMaterialInfoLowStock } = await import('@/api/modules/material')
    const lowStockItems = await getMaterialInfoLowStock()
    if (!lowStockItems?.length) return
    handleAdd()
  } catch { /* ignore */ }
}

onMounted(() => {
  if (props.supplier?.id) {
    void fetchList()
  }
  void prefillLowStock()
})
</script>

<template>
  <div class="purchase-panel">
    <template v-if="supplier">
      <div class="panel-header">
        <span class="panel-title">{{ supplier.name }} - 采购订单</span>
      </div>

      <!-- 筛选 -->
      <div class="panel-toolbar">
        <el-form :model="queryParams" inline size="default">
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 150px">
              <el-option v-for="(val, key) in PURCHASE_STATUS_MAP" :key="key" :label="val.text" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
        <div style="margin-left: auto; display: flex; gap: 8px">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增订单</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出</el-button>
        </div>
      </div>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <!-- 主表 -->
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="订单号" prop="orderNo" width="160" align="center" />
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
              v-if="scope.row.status === 'confirmed'"
              link
              type="success"
              @click="handlePay(scope.row)"
            >
              付款
            </el-button>
            <el-button
              v-if="scope.row.status === 'paid' || scope.row.status === 'partial_received'"
              link
              type="warning"
              @click="handleReceive(scope.row)"
            >
              收货
            </el-button>
            <el-button
              v-if="scope.row.status === 'draft' || scope.row.status === 'confirmed'"
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
    </template>

    <el-empty v-else description="请选择左侧供应商查看采购订单" :image-size="120" />

    <!-- 新增/编辑订单 Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="form.supplierId" placeholder="请选择供应商" filterable style="width: 100%" disabled>
            <el-option
              v-for="item in supplierOptions"
              :key="item.id"
              :label="item.name || `ID: ${item.id}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="订单备注" />
        </el-form-item>
        <el-form-item label="物资明细">
          <div style="width: 100%">
            <div style="margin-bottom: 8px; color: #909399; font-size: 12px; line-height: 1.6">
              选择物资后会自动带出默认采购价，保存时以本次采购成交价为准。
            </div>
            <el-table :data="form.items" size="small" style="width: 100%; margin-bottom: 8px">
              <el-table-column label="物资" min-width="150">
                <template #default="scope">
                  <el-select
                    v-model="scope.row.materialId"
                    placeholder="请选择物资"
                    filterable
                    size="small"
                    style="width: 100%"
                    @change="handleMaterialChange(scope.row)"
                  >
                    <el-option
                      v-for="m in materialOptions"
                      :key="m.materialId"
                      :label="m.name || `ID: ${m.materialId}`"
                      :value="m.materialId"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="110">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.purchaseQty"
                    :min="1"
                    :precision="0"
                    size="small"
                    style="width: 100%"
                    @change="calcLineAmount(scope.row)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="成交价" width="120">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.unitPrice"
                    :min="0.01"
                    :precision="2"
                    size="small"
                    style="width: 100%"
                    @change="calcLineAmount(scope.row)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="小计" width="90" align="right">
                <template #default="scope">
                  {{ scope.row.lineAmount != null ? `¥${Number(scope.row.lineAmount).toFixed(2)}` : '-' }}
                </template>
              </el-table-column>
              <el-table-column width="48" align="center">
                <template #default="scope">
                  <el-button type="danger" :icon="Delete" link size="small" @click="removeItemRow(scope.$index)" />
                </template>
              </el-table-column>
              <template #empty><div style="padding: 8px; color: #909399; text-align: center">暂无明细，请添加物资</div></template>
            </el-table>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <el-button type="primary" :icon="Plus" size="small" @click="addItemRow">添加物资</el-button>
              <span style="font-size: 13px; color: #303133">
                合计：<b>¥{{ formTotal }}</b>
              </span>
            </div>
          </div>
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
            <el-button v-if="currentOrder?.status === 'draft'" type="primary" size="small" :icon="Plus" @click="handleAddItem">新增明细</el-button>
          </div>
          <el-table :data="orderItems" style="width: 100%" size="small">
            <el-table-column label="物资" min-width="150">
              <template #default="scope">
                {{ getMaterialName(scope.row.materialId) }}
              </template>
            </el-table-column>
            <el-table-column label="采购数量" prop="purchaseQty" width="100" align="center" />
            <el-table-column label="已收数量" prop="receiveQty" width="100" align="center" />
            <el-table-column label="成交价" width="100" align="right">
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
          <el-select
            v-model="itemForm.materialId"
            placeholder="请选择物资"
            filterable
            style="width: 100%"
            @change="handleItemMaterialChange"
          >
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
        <el-form-item label="成交价" prop="unitPrice">
          <el-input-number v-model="itemForm.unitPrice" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- 付款弹窗 -->
    <el-dialog v-model="payDialogVisible" title="选择付款方式" width="420px">
      <el-form label-width="100px">
        <el-form-item label="付款方式" required>
          <el-select v-model="payMethodSelected" placeholder="请选择付款方式" style="width: 100%">
            <el-option v-for="m in PAY_METHOD_OPTIONS" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPay">确认付款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.purchase-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pagination {
  margin-top: 16px;
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
