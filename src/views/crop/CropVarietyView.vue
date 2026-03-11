<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'

import {
  createCropVariety,
  listCropVariety,
  removeCropVarietyByIds,
  updateCropVariety,
} from '@/api/modules/crop'
import type { BaseCropVariety } from '@/types/entity'

interface QueryParams {
  pageNum: number
  pageSize: number
  cropName: string
}

interface VarietyFormModel {
  varietyId?: number
  cropName: string
  growthCycleDays: number | null
  idealHumidityMin: number | null
  idealHumidityMax: number | null
  idealTempMin: number | null
  idealTempMax: number | null
}

const loading = ref(false)
const loadError = ref('')
const list = ref<BaseCropVariety[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  cropName: '',
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<VarietyFormModel>({
  varietyId: undefined,
  cropName: '',
  growthCycleDays: null,
  idealHumidityMin: null,
  idealHumidityMax: null,
  idealTempMin: null,
  idealTempMax: null,
})

const rules: FormRules<VarietyFormModel> = {
  cropName: [{ required: true, message: '请输入作物名称', trigger: 'blur' }],
  growthCycleDays: [{ required: true, message: '请输入生长周期', trigger: 'change' }],
  idealHumidityMin: [{ required: true, message: '请输入最小湿度', trigger: 'change' }],
  idealHumidityMax: [{ required: true, message: '请输入最大湿度', trigger: 'change' }],
  idealTempMin: [{ required: true, message: '请输入最低温度', trigger: 'change' }],
  idealTempMax: [{ required: true, message: '请输入最高温度', trigger: 'change' }],
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCropVariety({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      cropName: queryParams.cropName || undefined,
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载品种列表失败'
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
  queryParams.cropName = ''
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
  form.varietyId = undefined
  form.cropName = ''
  form.growthCycleDays = null
  form.idealHumidityMin = null
  form.idealHumidityMax = null
  form.idealTempMin = null
  form.idealTempMax = null
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增作物品种'
  dialogVisible.value = true
}

const handleEdit = (row: BaseCropVariety) => {
  resetForm()
  dialogTitle.value = '编辑作物品种'
  form.varietyId = row.varietyId
  form.cropName = row.cropName || ''
  form.growthCycleDays = row.growthCycleDays ?? null
  form.idealHumidityMin = row.idealHumidityMin ?? null
  form.idealHumidityMax = row.idealHumidityMax ?? null
  form.idealTempMin = row.idealTempMin ?? null
  form.idealTempMax = row.idealTempMax ?? null
  dialogVisible.value = true
}

const validateRange = () => {
  if (
    form.idealHumidityMin !== null &&
    form.idealHumidityMax !== null &&
    form.idealHumidityMin > form.idealHumidityMax
  ) {
    ElMessage.warning('湿度最小值不能大于最大值')
    return false
  }

  if (form.idealTempMin !== null && form.idealTempMax !== null && form.idealTempMin > form.idealTempMax) {
    ElMessage.warning('温度最小值不能大于最大值')
    return false
  }

  return true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || !validateRange()) return

  const payload: BaseCropVariety = {
    varietyId: form.varietyId,
    cropName: form.cropName.trim(),
    growthCycleDays: Number(form.growthCycleDays),
    idealHumidityMin: Number(form.idealHumidityMin),
    idealHumidityMax: Number(form.idealHumidityMax),
    idealTempMin: Number(form.idealTempMin),
    idealTempMax: Number(form.idealTempMax),
  }

  try {
    if (payload.varietyId) {
      await updateCropVariety(payload)
      ElMessage.success('更新品种成功')
    } else {
      delete payload.varietyId
      await createCropVariety(payload)
      ElMessage.success('新增品种成功')
    }
    dialogVisible.value = false
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交失败'
    ElMessage.error(message)
  }
}

const handleDelete = (row: BaseCropVariety) => {
  if (!row.varietyId) return
  ElMessageBox.confirm(`确认删除品种「${row.cropName || row.varietyId}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeCropVarietyByIds({ ids: row.varietyId as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.pageNum > 1) {
        queryParams.pageNum -= 1
      }
      await fetchList()
    })
    .catch(() => {})
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
          <div class="title">作物品种库</div>
          <div class="subtitle">维护作物品种及生长环境参数</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="68px">
        <el-form-item label="作物名称">
          <el-input
            v-model="queryParams.cropName"
            placeholder="请输入作物名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="6">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增品种</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="品种ID" prop="varietyId" align="center" width="100" />
        <el-table-column label="作物名称" prop="cropName" min-width="140" />
        <el-table-column label="生长周期(天)" prop="growthCycleDays" align="center" width="120" />
        <el-table-column label="理想湿度(%)" min-width="140" align="center">
          <template #default="scope">
            {{ scope.row.idealHumidityMin ?? '-' }} ~ {{ scope.row.idealHumidityMax ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="理想温度(°C)" min-width="140" align="center">
          <template #default="scope">
            {{ scope.row.idealTempMin ?? '-' }} ~ {{ scope.row.idealTempMax ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" align="center" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无作物品种数据" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="作物名称" prop="cropName">
          <el-input v-model="form.cropName" placeholder="例如：水稻、小麦、玉米" />
        </el-form-item>
        <el-form-item label="生长周期(天)" prop="growthCycleDays">
          <el-input-number v-model="form.growthCycleDays" :min="1" :max="999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="理想最小湿度" prop="idealHumidityMin">
          <el-input-number v-model="form.idealHumidityMin" :min="0" :max="100" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="理想最大湿度" prop="idealHumidityMax">
          <el-input-number v-model="form.idealHumidityMax" :min="0" :max="100" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="理想最低温度" prop="idealTempMin">
          <el-input-number v-model="form.idealTempMin" :min="-50" :max="80" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="理想最高温度" prop="idealTempMax">
          <el-input-number v-model="form.idealTempMax" :min="-50" :max="80" :precision="1" style="width: 100%" />
        </el-form-item>
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
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}
</style>
