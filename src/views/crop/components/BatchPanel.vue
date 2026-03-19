<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, View } from '@element-plus/icons-vue'

import {
  abandonBatch,
  createCropBatch,
  harvestBatch,
  listCropBatch,
  removeCropBatchByIds,
  updateCropBatch,
} from '@/api/modules/crop'
import { BATCH_STATUS_MAP } from '@/constants/task'
import type { AgriCropBatch, AgriFarmland, BaseCropVariety } from '@/types/entity'

const props = defineProps<{
  farmland: AgriFarmland | null
  varieties: BaseCropVariety[]
  farmlandOptions: AgriFarmland[]
}>()

const router = useRouter()

interface BatchFormModel {
  id?: number
  batchNo?: string
  varietyId: number | null
  farmlandId: number | null
  plantingDate: string
  estimatedHarvestDate: string
}

const loading = ref(false)
const loadError = ref('')
const list = ref<AgriCropBatch[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const statusFilter = ref('')

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<BatchFormModel>({
  id: undefined,
  batchNo: undefined,
  varietyId: null,
  farmlandId: null,
  plantingDate: '',
  estimatedHarvestDate: '',
})

const rules: FormRules<BatchFormModel> = {
  varietyId: [{ required: true, message: '请选择作物品种', trigger: 'change' }],
  plantingDate: [{ required: true, message: '请选择种植日期', trigger: 'change' }],
  estimatedHarvestDate: [{ required: true, message: '请选择预计收获日期', trigger: 'change' }],
}

const detailDrawerVisible = ref(false)
const currentDetail = ref<AgriCropBatch | null>(null)

const fetchBatches = async () => {
  if (!props.farmland?.id) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCropBatch({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      farmlandId: props.farmland.id,
      status: statusFilter.value || undefined,
    })
    list.value = res.items || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载批次列表失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => props.farmland?.id,
  () => {
    pageNum.value = 1
    statusFilter.value = ''
    void fetchBatches()
  },
)

const handleStatusFilter = () => {
  pageNum.value = 1
  void fetchBatches()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  void fetchBatches()
}

const handleCurrentChange = (page: number) => {
  pageNum.value = page
  void fetchBatches()
}

const resetForm = () => {
  form.id = undefined
  form.batchNo = undefined
  form.varietyId = null
  form.farmlandId = props.farmland?.id ?? null
  form.plantingDate = ''
  form.estimatedHarvestDate = ''
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增种植批次'
  dialogVisible.value = true
}

const handleEdit = (row: AgriCropBatch) => {
  resetForm()
  dialogTitle.value = '编辑种植批次'
  form.id = row.id
  form.batchNo = row.batchNo
  form.varietyId = row.varietyId ?? null
  form.farmlandId = row.farmlandId ?? null
  form.plantingDate = row.plantingDate || ''
  form.estimatedHarvestDate = row.estimatedHarvestDate || ''
  dialogVisible.value = true
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
    batchNo: form.batchNo,
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
    void fetchBatches()
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
      if (list.value.length === 1 && pageNum.value > 1) {
        pageNum.value -= 1
      }
      await fetchBatches()
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
      await fetchBatches()
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
      await fetchBatches()
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
  const found = props.varieties.find((item) => item.varietyId === row.varietyId)
  return found?.cropName || `品种ID: ${row.varietyId ?? '-'}`
}
</script>

<template>
  <div class="batch-panel">
    <template v-if="!farmland">
      <el-empty description="请选择左侧农田查看批次" :image-size="120" />
    </template>

    <template v-else>
      <div class="panel-header">
        <span class="panel-title">{{ farmland.name }} - 批次履历</span>
      </div>

      <div class="panel-toolbar">
        <el-button type="primary" plain :icon="Plus" size="small" @click="handleAdd">新增批次</el-button>
        <el-select
          v-model="statusFilter"
          placeholder="全部状态"
          clearable
          size="small"
          style="width: 140px; margin-left: 12px"
          @change="handleStatusFilter"
        >
          <el-option v-for="(val, key) in BATCH_STATUS_MAP" :key="key" :label="val.text" :value="key" />
        </el-select>
      </div>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchBatches">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="list" style="width: 100%" size="default">
        <el-table-column label="批次编号" prop="batchNo" width="140" align="center" />
        <el-table-column label="作物品种" min-width="120">
          <template #default="scope">
            {{ getVarietyLabel(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="种植日期" prop="plantingDate" width="120" align="center" />
        <el-table-column label="预计收获" prop="estimatedHarvestDate" width="120" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.status && BATCH_STATUS_MAP[scope.row.status]"
              :type="BATCH_STATUS_MAP[scope.row.status]?.type"
              size="small"
            >
              {{ BATCH_STATUS_MAP[scope.row.status]?.text }}
            </el-tag>
            <el-tag v-else type="info" size="small">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="260" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="View" size="small" @click="handleView(scope.row)">详情</el-button>
            <el-button link type="primary" :icon="Edit" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="success" size="small" @click="goGrowthLog(scope.row.id)">日志</el-button>
            <el-button
              v-if="scope.row.status === 'growing'"
              link
              type="warning"
              size="small"
              @click="handleHarvest(scope.row)"
            >收获</el-button>
            <el-button
              v-if="scope.row.status === 'growing' || scope.row.status === 'draft'"
              link
              type="danger"
              size="small"
              @click="handleAbandon(scope.row)"
            >废弃</el-button>
            <el-button link type="danger" :icon="Delete" size="small" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="该农田暂无批次数据" :image-size="80" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="total > 0"
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          :total="total"
          background
          size="small"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </template>

    <!-- Batch form dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="580px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="作物品种" prop="varietyId">
          <el-select v-model="form.varietyId" placeholder="请选择作物品种" filterable style="width: 100%">
            <el-option
              v-for="item in varieties"
              :key="item.varietyId"
              :label="item.cropName || `品种ID: ${item.varietyId}`"
              :value="item.varietyId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="农田地块">
          <el-select v-model="form.farmlandId" disabled style="width: 100%">
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

    <!-- Detail drawer -->
    <el-drawer v-model="detailDrawerVisible" title="批次详情" size="42%">
      <div v-if="currentDetail" class="detail-wrapper">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="批次编号">{{ currentDetail.batchNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作物品种">{{ getVarietyLabel(currentDetail) }}</el-descriptions-item>
          <el-descriptions-item label="农田地块">{{ farmland?.name || '-' }}</el-descriptions-item>
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
.batch-panel {
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

.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}
</style>
