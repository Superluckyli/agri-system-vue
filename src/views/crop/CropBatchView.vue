<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, View } from '@element-plus/icons-vue'

import {
  createCropBatch,
  getCropVarietyAll,
  listCropBatch,
  removeCropBatchByIds,
  updateCropBatch,
} from '@/api/modules/crop'
import type { BaseCropVariety, CropBatch } from '@/types/entity'

const router = useRouter()

interface QueryParams {
  pageNum: number
  pageSize: number
  plotId: string
  currentStage: string
}

interface BatchFormModel {
  batchId?: number
  varietyId: number | null
  plotId: string
  sowingDate: string
  expectedHarvestDate: string
  currentStage: string
  isActive: number
}

const STAGE_OPTIONS = [
  'Seedling',
  'Tillering',
  'Jointing',
  'Heading',
  'Maturity',
  'Completed',
]

const loading = ref(false)
const loadError = ref('')
const list = ref<CropBatch[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  plotId: '',
  currentStage: '',
})

const varieties = ref<BaseCropVariety[]>([])
const varietyLoading = ref(false)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<BatchFormModel>({
  batchId: undefined,
  varietyId: null,
  plotId: '',
  sowingDate: '',
  expectedHarvestDate: '',
  currentStage: 'Seedling',
  isActive: 1,
})

const rules: FormRules<BatchFormModel> = {
  varietyId: [{ required: true, message: '请选择作物品种', trigger: 'change' }],
  plotId: [{ required: true, message: '请输入地块编号', trigger: 'blur' }],
  sowingDate: [{ required: true, message: '请选择种植日期', trigger: 'change' }],
  expectedHarvestDate: [{ required: true, message: '请选择预计收获日期', trigger: 'change' }],
  currentStage: [{ required: true, message: '请选择当前阶段', trigger: 'change' }],
  isActive: [{ required: true, message: '请选择批次状态', trigger: 'change' }],
}

const detailDrawerVisible = ref(false)
const currentDetail = ref<CropBatch | null>(null)

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

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCropBatch({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      plotId: queryParams.plotId || undefined,
      currentStage: queryParams.currentStage || undefined,
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
  queryParams.plotId = ''
  queryParams.currentStage = ''
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
  form.batchId = undefined
  form.varietyId = null
  form.plotId = ''
  form.sowingDate = ''
  form.expectedHarvestDate = ''
  form.currentStage = 'Seedling'
  form.isActive = 1
}

const handleAdd = async () => {
  resetForm()
  dialogTitle.value = '新增种植批次'
  dialogVisible.value = true
  if (varieties.value.length === 0) {
    await fetchVarieties()
  }
}

const handleEdit = async (row: CropBatch) => {
  resetForm()
  dialogTitle.value = '编辑种植批次'
  form.batchId = row.batchId
  form.varietyId = row.varietyId ?? null
  form.plotId = row.plotId || ''
  form.sowingDate = row.sowingDate || ''
  form.expectedHarvestDate = row.expectedHarvestDate || ''
  form.currentStage = row.currentStage || 'Seedling'
  form.isActive = row.isActive ?? 1
  dialogVisible.value = true
  if (varieties.value.length === 0) {
    await fetchVarieties()
  }
}

const validateDateRange = () => {
  if (!form.sowingDate || !form.expectedHarvestDate) return true
  return new Date(form.expectedHarvestDate).getTime() >= new Date(form.sowingDate).getTime()
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (!validateDateRange()) {
    ElMessage.warning('预计收获日期不能早于种植日期')
    return
  }

  const payload: CropBatch = {
    batchId: form.batchId,
    varietyId: Number(form.varietyId),
    plotId: form.plotId.trim(),
    sowingDate: form.sowingDate,
    expectedHarvestDate: form.expectedHarvestDate,
    currentStage: form.currentStage,
    isActive: Number(form.isActive),
  }

  try {
    if (payload.batchId) {
      await updateCropBatch(payload)
      ElMessage.success('更新批次成功')
    } else {
      delete payload.batchId
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

const handleDelete = (row: CropBatch) => {
  if (!row.batchId) return
  ElMessageBox.confirm(`确认删除批次 #${row.batchId} 吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeCropBatchByIds({ ids: row.batchId as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.pageNum > 1) {
        queryParams.pageNum -= 1
      }
      await fetchList()
    })
    .catch(() => {})
}

const handleFinishBatch = (row: CropBatch) => {
  if (!row.batchId) return
  if (row.isActive === 0) {
    ElMessage.info('该批次已结束')
    return
  }

  ElMessageBox.confirm(`确认结束批次 #${row.batchId} 吗？`, '结束批次', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await updateCropBatch({
        ...row,
        batchId: Number(row.batchId),
        varietyId: Number(row.varietyId),
        isActive: 0,
        currentStage: row.currentStage || 'Completed',
      })
      ElMessage.success('批次已结束')
      await fetchList()
      if (currentDetail.value?.batchId === row.batchId) {
        currentDetail.value = { ...row, isActive: 0 }
      }
    })
    .catch(() => {})
}

const handleView = (row: CropBatch) => {
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

const getVarietyLabel = (row: CropBatch) => {
  if (row.cropName) return row.cropName
  const found = varieties.value.find((item) => item.varietyId === row.varietyId)
  return found?.cropName || `品种ID: ${row.varietyId ?? '-'}`
}

onMounted(() => {
  void Promise.all([fetchList(), fetchVarieties()])
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
        <el-form-item label="地块编号">
          <el-input
            v-model="queryParams.plotId"
            placeholder="请输入地块编号"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="当前阶段">
          <el-select v-model="queryParams.currentStage" placeholder="请选择阶段" clearable style="width: 220px">
            <el-option v-for="item in STAGE_OPTIONS" :key="item" :label="item" :value="item" />
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
        <el-table-column label="批次ID" prop="batchId" width="100" align="center" />
        <el-table-column label="作物品种" min-width="150">
          <template #default="scope">
            {{ getVarietyLabel(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="地块编号" prop="plotId" width="130" align="center" />
        <el-table-column label="种植日期" prop="sowingDate" width="130" align="center" />
        <el-table-column label="预计收获" prop="expectedHarvestDate" width="130" align="center" />
        <el-table-column label="当前阶段" prop="currentStage" width="120" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isActive === 1 ? 'success' : 'info'">
              {{ scope.row.isActive === 1 ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="330" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="success" @click="goGrowthLog(scope.row.batchId)">生长日志</el-button>
            <el-button
              v-if="scope.row.isActive === 1"
              link
              type="warning"
              @click="handleFinishBatch(scope.row)"
            >
              结束批次
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
        <el-form-item label="地块编号" prop="plotId">
          <el-input v-model="form.plotId" placeholder="例如：PLOT-A01" />
        </el-form-item>
        <el-form-item label="种植日期" prop="sowingDate">
          <el-date-picker
            v-model="form.sowingDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择种植日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预计收获日期" prop="expectedHarvestDate">
          <el-date-picker
            v-model="form.expectedHarvestDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择预计收获日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="当前阶段" prop="currentStage">
          <el-select v-model="form.currentStage" placeholder="请选择当前阶段" style="width: 100%">
            <el-option v-for="item in STAGE_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次状态" prop="isActive">
          <el-radio-group v-model="form.isActive">
            <el-radio :value="1">进行中</el-radio>
            <el-radio :value="0">已结束</el-radio>
          </el-radio-group>
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
          <el-descriptions-item label="批次ID">{{ currentDetail.batchId }}</el-descriptions-item>
          <el-descriptions-item label="作物品种">{{ getVarietyLabel(currentDetail) }}</el-descriptions-item>
          <el-descriptions-item label="地块编号">{{ currentDetail.plotId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="种植日期">{{ currentDetail.sowingDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预计收获">{{ currentDetail.expectedHarvestDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前阶段">{{ currentDetail.currentStage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次状态">
            <el-tag :type="currentDetail.isActive === 1 ? 'success' : 'info'">
              {{ currentDetail.isActive === 1 ? '进行中' : '已结束' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button type="primary" @click="goGrowthLog(currentDetail.batchId)">查看生长日志</el-button>
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
