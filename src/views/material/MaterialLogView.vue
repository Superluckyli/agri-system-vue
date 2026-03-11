<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'

import { createMaterialLogExecute, listMaterialInfo, listMaterialLog } from '@/api/modules/material'
import type { MaterialInfo, MaterialInoutLog } from '@/types/entity'

type TimeRange = [string, string] | []

interface QueryParams {
  materialId: number | null
  timeRange: TimeRange
  pageNum: number
  pageSize: number
}

interface ExecuteFormModel {
  materialId: number | null
  type: number
  quantity: number | null
  relatedTaskId: number | null
  remark: string
}

const loading = ref(false)
const submitLoading = ref(false)
const loadError = ref('')
const dataTruncated = ref(false)

const materialOptions = ref<MaterialInfo[]>([])
const logs = ref<MaterialInoutLog[]>([])

const queryParams = reactive<QueryParams>({
  materialId: null,
  timeRange: [],
  pageNum: 1,
  pageSize: 10,
})

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<ExecuteFormModel>({
  materialId: null,
  type: 1,
  quantity: null,
  relatedTaskId: null,
  remark: '',
})

const rules: FormRules<ExecuteFormModel> = {
  materialId: [{ required: true, message: '请选择物料', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'change' }],
}

function parseTime(value?: string): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function parseNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

async function fetchMaterials(): Promise<void> {
  try {
    const res = await listMaterialInfo({ pageNum: 1, pageSize: 500 })
    materialOptions.value = res.records || []
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '加载物料选项失败'
    ElMessage.error(message)
    materialOptions.value = []
  }
}

async function fetchLogs(): Promise<void> {
  loading.value = true
  loadError.value = ''
  dataTruncated.value = false
  try {
    const res = await listMaterialLog({
      pageNum: 1,
      pageSize: 500,
      materialId: queryParams.materialId || undefined,
    })
    logs.value = res.records || []
    dataTruncated.value = Number(res.total || 0) > logs.value.length
    queryParams.pageNum = 1
  } catch (error) {
    logs.value = []
    loadError.value = error instanceof Error ? error.message : '加载出入库记录失败'
  } finally {
    loading.value = false
  }
}

const filteredLogs = computed(() => {
  if (!queryParams.timeRange || queryParams.timeRange.length !== 2) {
    return [...logs.value].sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))
  }
  const [start, end] = queryParams.timeRange
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return logs.value
    .filter((item) => {
      const t = parseTime(item.createTime)
      return t >= startTime && t <= endTime
    })
    .sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))
})

const total = computed(() => filteredLogs.value.length)

const pagedLogs = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return filteredLogs.value.slice(start, start + queryParams.pageSize)
})

function formatType(type?: number): { label: string; tag: string } {
  if (type === 1) return { label: '入库', tag: 'success' }
  if (type === 2) return { label: '出库', tag: 'warning' }
  return { label: '未知', tag: 'info' }
}

function getMaterialName(materialId?: number): string {
  const found = materialOptions.value.find((item) => item.materialId === materialId)
  return found?.name || `物料ID: ${materialId ?? '-'}`
}

function handleQuery(): void {
  queryParams.pageNum = 1
  void fetchLogs()
}

function resetQuery(): void {
  queryParams.materialId = null
  queryParams.timeRange = []
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  void fetchLogs()
}

function handleSizeChange(size: number): void {
  queryParams.pageSize = size
  queryParams.pageNum = 1
}

function handleCurrentChange(page: number): void {
  queryParams.pageNum = page
}

function resetForm(): void {
  form.materialId = null
  form.type = 1
  form.quantity = null
  form.relatedTaskId = null
  form.remark = ''
}

function openDialog(): void {
  resetForm()
  dialogVisible.value = true
}

async function submitForm(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const quantity = parseNumber(form.quantity)
  if (quantity <= 0) {
    ElMessage.warning('数量必须大于0')
    return
  }

  const payload: MaterialInoutLog = {
    materialId: parseNumber(form.materialId),
    type: parseNumber(form.type),
    quantity,
    relatedTaskId: form.relatedTaskId ? parseNumber(form.relatedTaskId) : undefined,
    remark: form.remark.trim() || undefined,
  }

  submitLoading.value = true
  try {
    await createMaterialLogExecute(payload)
    ElMessage.success('出入库登记成功')
    dialogVisible.value = false
    await Promise.all([fetchLogs(), fetchMaterials()])
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '出入库执行失败'
    ElMessage.error(message)
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  void Promise.all([fetchMaterials(), fetchLogs()])
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">出入库/使用登记</div>
          <div class="subtitle">记录物料入库、出库并追踪执行记录</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="88px">
        <el-form-item label="物料">
          <el-select v-model="queryParams.materialId" placeholder="全部物料" clearable filterable style="width: 220px">
            <el-option
              v-for="item in materialOptions"
              :key="item.materialId"
              :label="item.name || `物料ID: ${item.materialId}`"
              :value="item.materialId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryParams.timeRange"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="6">
          <el-button type="primary" plain :icon="Plus" @click="openDialog">登记出入库</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="dataTruncated" type="warning" :closable="false" style="margin-bottom: 12px">
        <template #title>
          出入库记录超过 500 条，当前仅拉取前 500 条用于查询和筛选。
        </template>
      </el-alert>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchLogs">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="pagedLogs" style="width: 100%">
        <el-table-column label="记录ID" prop="logId" width="90" align="center" />
        <el-table-column label="物料" min-width="160">
          <template #default="scope">
            {{ getMaterialName(scope.row.materialId) }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="scope">
            <el-tag :type="formatType(scope.row.type).tag">
              {{ formatType(scope.row.type).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120" align="center">
          <template #default="scope">
            {{ scope.row.quantity ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="关联任务ID" prop="relatedTaskId" width="110" align="center" />
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" min-width="180" />
        <template #empty>
          <el-empty description="暂无出入库记录" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="total > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="登记出入库" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="物料" prop="materialId">
          <el-select v-model="form.materialId" placeholder="请选择物料" filterable style="width: 100%">
            <el-option
              v-for="item in materialOptions"
              :key="item.materialId"
              :label="item.name || `物料ID: ${item.materialId}`"
              :value="item.materialId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="1">入库</el-radio>
            <el-radio :value="2">出库</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关联任务ID">
          <el-input-number v-model="form.relatedTaskId" :min="1" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选：填写执行说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">确认提交</el-button>
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
