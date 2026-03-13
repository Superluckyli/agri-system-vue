<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, View } from '@element-plus/icons-vue'

import {
  createCropBatch,
  getCropFarmlandAll,
  getCropVarietyAll,
  harvestBatch,
  abandonBatch,
  listCropBatch,
  removeCropBatchByIds,
  updateCropBatch,
} from '@/api/modules/crop'
import type { AgriCropBatch, AgriFarmland, BaseCropVariety } from '@/types/entity'

const router = useRouter()

interface QueryParams {
  pageNum: number
  pageSize: number
  batchNo: string
  status: string
  farmlandId: number | null
}

interface BatchFormModel {
  id?: number
  varietyId: number | null
  farmlandId: number | null
  plantingDate: string
  estimatedHarvestDate: string
}

const BATCH_STATUS_MAP: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { text: '草稿', type: 'info' },
  growing: { text: '生长中', type: '' },
  paused: { text: '已暂停', type: 'warning' },
  harvested: { text: '已收获', type: 'success' },
  abandoned: { text: '已废弃', type: 'danger' },
  archived: { text: '已归档', type: 'info' },
}

const farmlandOptions = ref<AgriFarmland[]>([])

const loading = ref(false)
const loadError = ref('')
const list = ref<AgriCropBatch[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  batchNo: '',
  status: '',
  farmlandId: null,
})

const varieties = ref<BaseCropVariety[]>([])
const varietyLoading = ref(false)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<BatchFormModel>({
  id: undefined,
  varietyId: null,
  farmlandId: null,
  plantingDate: '',
  estimatedHarvestDate: '',
})

const rules: FormRules<BatchFormModel> = {
  varietyId: [{ required: true, message: '请选择作物品种', trigger: 'change' }],
  farmlandId: [{ required: true, message: '请选择农田地块', trigger: 'change' }],
  plantingDate: [{ required: true, message: '请选择种植日期', trigger: 'change' }],
  estimatedHarvestDate: [{ required: true, message: '请选择预计收获日期', trigger: 'change' }],
}

const detailDrawerVisible = ref(false)
const currentDetail = ref<AgriCropBatch | null>(null)

const fetchVarieties = async () => {
  varietyLoading.value = true
  try {
    varieties.value = await getCropVarietyAll()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '加载品种列表失败'
    ElMessage.error(message)
    varieties.value = []
  } finally {
    varietyLoading.value = false
  }
}

const fetchFarmlands = async () => {
  try {
    farmlandOptions.value = await getCropFarmlandAll()
  } catch (error) {
    farmlandOptions.value = []
    console.error('加载农田列表失败', error)
  }
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCropBatch({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      batchNo: queryParams.batchNo || undefined,
      status: queryParams.status || undefined,
      farmlandId: queryParams.farmlandId || undefined,
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载批次列表失败'
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
  queryParams.batchNo = ''
  queryParams.status = ''
  queryParams.farmlandId = null
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

const resetForm = () => {
  form.id = undefined
  form.varietyId = null
  form.farmlandId = null
  form.plantingDate = ''
  form.estimatedHarvestDate = ''
}

const handleAdd = async () => {
  resetForm()
  dialogTitle.value = '新增种植批次'
  dialogVisible.value = true
  if (varieties.value.length === 0) {
    await fetchVarieties()
  }
  if (farmlandOptions.value.length === 0) {
    await fetchFarmlands()
  }
}

const handleEdit = async (row: AgriCropBatch) => {
  resetForm()
  dialogTitle.value = '编辑种植批次'
  form.id = row.id
  form.varietyId = row.varietyId ?? null
  form.farmlandId = row.farmlandId ?? null
  form.plantingDate = row.plantingDate || ''
  form.estimatedHarvestDate = row.estimatedHarvestDate || ''
  dialogVisible.value = true
  if (varieties.value.length === 0) {
    await fetchVarieties()
  }
  if (farmlandOptions.value.length === 0) {
    await fetchFarmlands()
  }
}

const validateDateRange = () => {
  if (!form.plantingDate || !form.estimatedHarvestDate) return true
  return new Date(form.estimatedHarvestDate).getTime() >= new Date(form.plantingDate).getTime()
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (!validateDateRange()) {
    ElMessage.warning('预计收获日期不能早于种植日期')
    return
  }

  const payload: AgriCropBatch = {
    id: form.id,
    varietyId: Number(form.varietyId),
    farmlandId: Number(form.farmlandId),
    plantingDate: form.plantingDate,
    estimatedHarvestDate: form.estimatedHarvestDate,
  }

  try {
    if (payload.id) {
      await updateCropBatch(payload)
      ElMessage.success('更新批次成功')
    } else {
      delete payload.id
      await createCropBatch(payload)
      ElMessage.success('新增批次成功')
    }
    dialogVisible.value = false
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '保存批次失败'
    ElMessage.error(message)
  }
}

const handleDelete = (row: AgriCropBatch) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认删除批次 ${row.batchNo || '#' + row.id} 吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeCropBatchByIds({ ids: row.id as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.pageNum > 1) {
        queryParams.pageNum -= 1
      }
      await fetchList()
    })
    .catch(() => {})
}

const handleHarvest = (row: AgriCropBatch) => {
  if (!row.id) return
  if (row.status !== 'growing') {
    ElMessage.warning('仅生长中的批次可以收获')
    return
  }
  ElMessageBox.confirm(`确认收获批次 ${row.batchNo || '#' + row.id} 吗？`, '收获确认', {
    type: 'success',
    confirmButtonText: '确定收获',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await harvestBatch(row.id as number)
      ElMessage.success('批次已收获')
      await fetchList()
    })
    .catch(() => {})
}

const handleAbandon = (row: AgriCropBatch) => {
  if (!row.id) return
  ElMessageBox.confirm('确认废弃该批次吗？废弃后不可恢复。', '废弃批次', {
    confirmButtonText: '确定废弃',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      await abandonBatch(row.id as number)
      ElMessage.success('批次已废弃')
      await fetchList()
    })
    .catch(() => {})
}

const handleView = (row: AgriCropBatch) => {
  currentDetail.value = row
  detailDrawerVisible.value = true
}

const goGrowthLog = (batchId?: number) => {
  if (!batchId) return
  void router.push(`/crop/growth-log/${batchId}`)
}

const goTaskList = () => {
  void router.push('/task/list')
}

const getVarietyLabel = (row: AgriCropBatch) => {
  const found = varieties.value.find((item) => item.varietyId === row.varietyId)
  return found?.cropName || `品种ID: ${row.varietyId ?? '-'}`
}

const getFarmlandName = (row: AgriCropBatch) => {
  const found = farmlandOptions.value.find((item) => item.id === row.farmlandId)
  return found?.name || `地块ID: ${row.farmlandId ?? '-'}`
}

onMounted(() => {
  void Promise.all([fetchList(), fetchVarieties(), fetchFarmlands()])
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">种植批次管理</div>
          <div class="subtitle">管理批次生命周期、阶段进度及关联记录</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="90px">
        <el-form-item label="批次编号">
          <el-input
            v-model="queryParams.batchNo"
            placeholder="请输入批次编号"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="批次状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 180px">
            <el-option v-for="(val, key) in BATCH_STATUS_MAP" :key="key" :label="val.text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="农田地块">
          <el-select v-model="queryParams.farmlandId" placeholder="全部地块" clearable filterable style="width: 220px">
            <el-option
              v-for="item in farmlandOptions"
              :key="item.id"
              :label="item.name || `地块ID: ${item.id}`"
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
        <el-col :span="6">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增批次</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="ID" prop="id" width="80" align="center" />
        <el-table-column label="批次编号" prop="batchNo" width="140" align="center" />
        <el-table-column label="作物品种" min-width="150">
          <template #default="scope">
            {{ getVarietyLabel(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="农田地块" min-width="140">
          <template #default="scope">
            {{ getFarmlandName(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="种植日期" prop="plantingDate" width="130" align="center" />
        <el-table-column label="预计收获" prop="estimatedHarvestDate" width="130" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.status && BATCH_STATUS_MAP[scope.row.status]"
              :type="BATCH_STATUS_MAP[scope.row.status]?.type"
            >
              {{ BATCH_STATUS_MAP[scope.row.status]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="300" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="success" @click="goGrowthLog(scope.row.id)">生长日志</el-button>
            <el-button
              v-if="scope.row.status === 'growing'"
              link
              type="warning"
              @click="handleHarvest(scope.row)"
            >
              收获
            </el-button>
            <el-button
              v-if="scope.row.status === 'growing' || scope.row.status === 'draft'"
              link
              type="danger"
              @click="handleAbandon(scope.row)"
            >
              废弃
            </el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无种植批次数据" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="作物品种" prop="varietyId">
          <el-select
            v-model="form.varietyId"
            placeholder="请选择作物品种"
            :loading="varietyLoading"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in varieties"
              :key="item.varietyId"
              :label="item.cropName || `品种ID: ${item.varietyId}`"
              :value="item.varietyId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="农田地块" prop="farmlandId">
          <el-select v-model="form.farmlandId" placeholder="请选择农田地块" filterable style="width: 100%">
            <el-option
              v-for="item in farmlandOptions"
              :key="item.id"
              :label="item.name || `地块ID: ${item.id}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="种植日期" prop="plantingDate">
          <el-date-picker
            v-model="form.plantingDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择种植日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预计收获日期" prop="estimatedHarvestDate">
          <el-date-picker
            v-model="form.estimatedHarvestDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择预计收获日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailDrawerVisible" title="批次详情" size="42%">
      <div v-if="currentDetail" class="detail-wrapper">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">{{ currentDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="批次编号">{{ currentDetail.batchNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作物品种">{{ getVarietyLabel(currentDetail) }}</el-descriptions-item>
          <el-descriptions-item label="农田地块">{{ getFarmlandName(currentDetail) }}</el-descriptions-item>
          <el-descriptions-item label="种植日期">{{ currentDetail.plantingDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预计收获">{{ currentDetail.estimatedHarvestDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="实际收获">{{ currentDetail.actualHarvestDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              v-if="currentDetail.status && BATCH_STATUS_MAP[currentDetail.status]"
              :type="BATCH_STATUS_MAP[currentDetail.status]?.type"
            >
              {{ BATCH_STATUS_MAP[currentDetail.status]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.abandonReason" label="废弃原因">
            {{ currentDetail.abandonReason }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button type="primary" @click="goGrowthLog(currentDetail.id)">查看生长日志</el-button>
          <el-button @click="goTaskList">查看关联任务</el-button>
        </div>
      </div>
    </el-drawer>
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

.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}
</style>
