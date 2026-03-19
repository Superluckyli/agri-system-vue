<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, Download } from '@element-plus/icons-vue'

import { MANAGER_ROLES } from '@/constants/permission'
import {
  createMaterialInfo,
  listMaterialInfo,
  removeMaterialInfoByIds,
  updateMaterialInfo,
} from '@/api/modules/material'
import { useAuthStore } from '@/stores/auth'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'
import type { MaterialInfo } from '@/types/entity'
import { useExport, type ExportColumn } from '@/composables/useExport'

interface QueryParams {
  pageNum: number
  pageSize: number
  name: string
  category: string
  onlyLowStock: boolean
}

interface MaterialFormModel {
  materialId?: number
  name: string
  category: string
  unitPrice: number | null
  currentStock: number | null
  unit: string
  safeThreshold: number | null
}

const route = useRoute()
const authStore = useAuthStore()

const currentRoles = computed(() => resolveUserRoles(authStore.roles, authStore.user))
const canManage = computed(() => hasAnyRole(currentRoles.value, MANAGER_ROLES))

const loading = ref(false)
const loadError = ref('')
const list = ref<MaterialInfo[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  name: '',
  category: '',
  onlyLowStock: false,
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<MaterialFormModel>({
  materialId: undefined,
  name: '',
  category: '',
  unitPrice: null,
  currentStock: null,
  unit: '',
  safeThreshold: null,
})

const rules: FormRules<MaterialFormModel> = {
  name: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  category: [{ required: true, message: '请输入物料类型', trigger: 'blur' }],
  currentStock: [{ required: true, message: '请输入库存量', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
}

const CATEGORY_THRESHOLD_MAP: Record<string, number> = {
  Fertilizer: 100,
  Pesticide: 30,
  Seed: 80,
  Tool: 10,
}

function getWarnThreshold(item: MaterialInfo): number {
  const category = item.category || ''
  return CATEGORY_THRESHOLD_MAP[category] ?? 50
}

function isLowStock(item: MaterialInfo): boolean {
  const stock = Number(item.currentStock || 0)
  const threshold = item.safeThreshold ?? getWarnThreshold(item)
  return stock <= threshold
}

const filteredList = computed(() => {
  if (!queryParams.onlyLowStock) {
    return list.value
  }
  return list.value.filter((item) => isLowStock(item))
})

const displayTotal = computed(() => {
  if (queryParams.onlyLowStock) {
    return filteredList.value.length
  }
  return total.value
})

async function fetchList(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listMaterialInfo({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      name: queryParams.name || undefined,
      category: queryParams.category || undefined,
    })
    list.value = res.items || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载库存列表失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleQuery(): void {
  queryParams.pageNum = 1
  void fetchList()
}

function resetQuery(): void {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.name = ''
  queryParams.category = ''
  queryParams.onlyLowStock = false
  void fetchList()
}

function handleSizeChange(size: number): void {
  queryParams.pageSize = size
  void fetchList()
}

function handleCurrentChange(page: number): void {
  queryParams.pageNum = page
  void fetchList()
}

function ensureCanManage(): boolean {
  if (canManage.value) {
    return true
  }
  ElMessage.warning('当前账号为只读权限，不能修改库存信息')
  return false
}

function resetForm(): void {
  form.materialId = undefined
  form.name = ''
  form.category = ''
  form.unitPrice = null
  form.currentStock = null
  form.unit = ''
  form.safeThreshold = null
}

function handleAdd(): void {
  if (!ensureCanManage()) return
  resetForm()
  dialogTitle.value = '新增投入品'
  dialogVisible.value = true
}

function handleEdit(row: MaterialInfo): void {
  if (!ensureCanManage()) return
  resetForm()
  dialogTitle.value = '编辑投入品'
  form.materialId = row.materialId
  form.name = row.name || ''
  form.category = row.category || ''
  form.unitPrice = row.unitPrice ?? null
  form.currentStock = row.currentStock ?? null
  form.unit = row.unit || ''
  form.safeThreshold = row.safeThreshold ?? null
  dialogVisible.value = true
}

async function submitForm(): Promise<void> {
  if (!ensureCanManage()) return
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: MaterialInfo = {
    materialId: form.materialId,
    name: form.name.trim(),
    category: form.category.trim(),
    unitPrice: Number(form.unitPrice || 0),
    currentStock: Number(form.currentStock),
    unit: form.unit.trim(),
    safeThreshold: form.safeThreshold != null ? Number(form.safeThreshold) : undefined,
  }

  try {
    if (payload.materialId) {
      await updateMaterialInfo(payload)
      ElMessage.success('更新投入品成功')
    } else {
      delete payload.materialId
      await createMaterialInfo(payload)
      ElMessage.success('新增投入品成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '保存投入品失败'
    ElMessage.error(message)
  }
}

function handleDelete(row: MaterialInfo): void {
  if (!ensureCanManage()) return
  if (!row.materialId) return
  ElMessageBox.confirm(`确认删除投入品「${row.name || row.materialId}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeMaterialInfoByIds({ ids: row.materialId as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.pageNum > 1) {
        queryParams.pageNum -= 1
      }
      await fetchList()
    })
    .catch(() => {})
}

watch(
  () => route.query.lowStock,
  (value) => {
    queryParams.onlyLowStock = value === '1' || value === 'true'
  },
  { immediate: true },
)

const { exportToXlsx } = useExport()

const materialExportColumns: ExportColumn[] = [
  { header: '物料ID', key: 'materialId' },
  { header: '物料名称', key: 'name' },
  { header: '类型', key: 'category' },
  { header: '库存量', key: 'currentStock' },
  { header: '单位', key: 'unit' },
  { header: '预警阈值', key: 'safeThreshold' },
  { header: '默认采购价', key: 'unitPrice' },
]

const handleExport = async () => {
  try {
    const res = await listMaterialInfo({ pageNum: 1, pageSize: 9999 })
    exportToXlsx(res.items || [], materialExportColumns, '物资库存')
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">投入品库存管理</div>
          <div class="subtitle">维护物料台账并监控低库存状态</div>
        </div>
      </template>

      <el-alert v-if="!canManage" type="warning" :closable="false" style="margin-bottom: 12px">
        <template #title>当前账号为只读权限：可查询库存，不可新增/编辑/删除。</template>
      </el-alert>

      <el-form :model="queryParams" inline label-width="88px">
        <el-form-item label="物料名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入物料名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="物料类型">
          <el-input
            v-model="queryParams.category"
            placeholder="请输入物料类型"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="预警过滤">
          <el-switch v-model="queryParams.onlyLowStock" active-text="仅看低库存" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="12">
          <el-button v-if="canManage" type="primary" plain :icon="Plus" @click="handleAdd">新增投入品</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="filteredList" style="width: 100%">
        <el-table-column label="物料ID" prop="materialId" width="90" align="center" />
        <el-table-column label="物料名称" prop="name" min-width="150" />
        <el-table-column label="类型" prop="category" min-width="120" />
        <el-table-column label="库存量" min-width="140" align="center">
          <template #default="scope">
            <span>{{ scope.row.currentStock ?? '-' }} {{ scope.row.unit || '' }}</span>
            <el-tag v-if="isLowStock(scope.row)" type="danger" style="margin-left: 8px">预警</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警阈值" min-width="120" align="center">
          <template #default="scope">
            {{ scope.row.safeThreshold ?? getWarnThreshold(scope.row) }} {{ scope.row.unit || '' }}
          </template>
        </el-table-column>
        <el-table-column label="默认采购价" min-width="100" align="center">
          <template #default="scope">
            {{ scope.row.unitPrice ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updatedAt" min-width="180" />
        <el-table-column v-if="canManage" label="操作" width="160" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无库存记录" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="displayTotal > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="displayTotal"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="物料名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入物料名称" />
        </el-form-item>
        <el-form-item label="物料类型" prop="category">
          <el-input v-model="form.category" placeholder="例如：Fertilizer / Pesticide / Seed" />
        </el-form-item>
        <el-form-item label="库存量" prop="currentStock">
          <el-input-number v-model="form.currentStock" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" placeholder="例如：kg / L / bag" />
        </el-form-item>
        <el-form-item label="预警阈值">
          <el-input-number v-model="form.safeThreshold" :min="0" :precision="0" style="width: 100%" placeholder="低于此值触发预警" />
        </el-form-item>
        <el-form-item label="默认采购价">
          <el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <div style="margin-top: -8px; margin-bottom: 12px; color: #909399; font-size: 12px; line-height: 1.6">
          该价格用于新采购单默认带价和库存参考展示，不会回改历史采购明细成交价。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
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
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
