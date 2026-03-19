<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'

import { createIotRule, listIotRule, removeIotRuleById, updateIotRule } from '@/api/modules/iot'
import { createTask } from '@/api/modules/task'
import type { AgriTask, AgriTaskRule } from '@/types/entity'

interface QueryParams {
  ruleName: string
  sensorType: string
  createMode: '' | 'MANUAL' | 'AUTO' | 'AUTO_AI'
  isEnable: '' | '1' | '0'
  pageNum: number
  pageSize: number
}

interface RuleFormModel {
  ruleId?: number
  ruleName: string
  sensorType: string
  minVal: number | null
  maxVal: number | null
  autoTaskType: string
  priority: number
  createMode: 'MANUAL' | 'AUTO' | 'AUTO_AI'
  isEnable: number
  cooldownMinutes: number
}

interface TaskQuickForm {
  taskName: string
  taskType: string
  priority: number
  remark: string
}

const SENSOR_OPTIONS = [
  { label: '温度', value: 'temperature' },
  { label: '湿度', value: 'humidity' },
  { label: '光照', value: 'light' },
  { label: '土壤水分', value: 'soil_moisture' },
  { label: 'pH', value: 'ph' },
]

const CREATE_MODE_OPTIONS = [
  { label: '手动', value: 'MANUAL' },
  { label: '自动', value: 'AUTO' },
  { label: 'AI 协助', value: 'AUTO_AI' },
]

const PRIORITY_OPTIONS = [
  { label: '高', value: 1, tag: 'danger' },
  { label: '中', value: 2, tag: 'warning' },
  { label: '低', value: 3, tag: 'info' },
]

const loading = ref(false)
const loadError = ref('')
const list = ref<AgriTaskRule[]>([])
const dataTruncated = ref(false)

const queryParams = reactive<QueryParams>({
  ruleName: '',
  sensorType: '',
  createMode: '',
  isEnable: '',
  pageNum: 1,
  pageSize: 10,
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<RuleFormModel>({
  ruleId: undefined,
  ruleName: '',
  sensorType: '',
  minVal: null,
  maxVal: null,
  autoTaskType: '',
  priority: 2,
  createMode: 'AUTO',
  isEnable: 1,
  cooldownMinutes: 60,
})

const rules: FormRules<RuleFormModel> = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  sensorType: [{ required: true, message: '请选择传感器类型', trigger: 'change' }],
  minVal: [{ required: true, message: '请输入最小阈值', trigger: 'change' }],
  maxVal: [{ required: true, message: '请输入最大阈值', trigger: 'change' }],
  autoTaskType: [{ required: true, message: '请输入联动任务类型', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  isEnable: [{ required: true, message: '请选择是否启用', trigger: 'change' }],
}

const taskDialogVisible = ref(false)
const taskFormRef = ref<FormInstance>()
const currentRule = ref<AgriTaskRule | null>(null)

const taskForm = reactive<TaskQuickForm>({
  taskName: '',
  taskType: '',
  priority: 2,
  remark: '',
})

const taskRules: FormRules<TaskQuickForm> = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  taskType: [{ required: true, message: '请输入任务类型', trigger: 'blur' }],
}

function parseNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatSensorLabel(value?: string): string {
  const found = SENSOR_OPTIONS.find((item) => item.value === value)
  return found?.label || value || '-'
}

function formatCreateMode(mode?: string): string {
  const found = CREATE_MODE_OPTIONS.find((item) => item.value === mode)
  return found?.label || mode || '-'
}

function formatPriorityTag(value?: number): { label: string; type: string } {
  const found = PRIORITY_OPTIONS.find((item) => item.value === value)
  if (!found) {
    return { label: '未知', type: 'info' }
  }
  return { label: found.label, type: found.tag }
}

const filteredList = computed(() => {
  return list.value.filter((item) => {
    const nameHit = !queryParams.ruleName || (item.ruleName || '').includes(queryParams.ruleName.trim())
    const sensorHit = !queryParams.sensorType || item.sensorType === queryParams.sensorType
    const statusHit =
      queryParams.isEnable === '' || String(item.isEnable ?? '') === queryParams.isEnable
    const modeHit = !queryParams.createMode || item.createMode === queryParams.createMode
    return nameHit && sensorHit && statusHit && modeHit
  })
})

const tableTotal = computed(() => filteredList.value.length)

const pagedList = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return filteredList.value.slice(start, start + queryParams.pageSize)
})

async function fetchList(): Promise<void> {
  loading.value = true
  loadError.value = ''
  dataTruncated.value = false
  try {
    const res = await listIotRule({ pageNum: 1, pageSize: 500 })
    list.value = res.items || []
    dataTruncated.value = Number(res.total || 0) > list.value.length
    queryParams.pageNum = 1
  } catch (error) {
    list.value = []
    loadError.value = error instanceof Error ? error.message : '加载预警规则失败'
  } finally {
    loading.value = false
  }
}

function handleQuery(): void {
  queryParams.pageNum = 1
}

function resetQuery(): void {
  queryParams.ruleName = ''
  queryParams.sensorType = ''
  queryParams.createMode = ''
  queryParams.isEnable = ''
  queryParams.pageNum = 1
  queryParams.pageSize = 10
}

function handleSizeChange(size: number): void {
  queryParams.pageSize = size
  queryParams.pageNum = 1
}

function handleCurrentChange(page: number): void {
  queryParams.pageNum = page
}

function resetForm(): void {
  form.ruleId = undefined
  form.ruleName = ''
  form.sensorType = ''
  form.minVal = null
  form.maxVal = null
  form.autoTaskType = ''
  form.priority = 2
  form.createMode = 'AUTO'
  form.isEnable = 1
  form.cooldownMinutes = 60
}

function handleAdd(): void {
  resetForm()
  dialogTitle.value = '新增预警规则'
  dialogVisible.value = true
}

function handleEdit(row: AgriTaskRule): void {
  resetForm()
  dialogTitle.value = '编辑预警规则'
  form.ruleId = row.ruleId
  form.ruleName = row.ruleName || ''
  form.sensorType = row.sensorType || ''
  form.minVal = row.minVal ?? null
  form.maxVal = row.maxVal ?? null
  form.autoTaskType = row.autoTaskType || ''
  form.priority = row.priority ?? 2
  form.isEnable = row.isEnable ?? 1
  form.createMode = row.createMode || 'AUTO'
  form.cooldownMinutes = row.cooldownMinutes ?? 60
  dialogVisible.value = true
}

async function submitForm(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (parseNumber(form.minVal) > parseNumber(form.maxVal)) {
    ElMessage.warning('最小阈值不能大于最大阈值')
    return
  }

  const payload: AgriTaskRule = {
    ruleId: form.ruleId,
    ruleName: form.ruleName.trim(),
    sensorType: form.sensorType,
    minVal: parseNumber(form.minVal),
    maxVal: parseNumber(form.maxVal),
    autoTaskType: form.autoTaskType.trim(),
    createMode: form.createMode,
    priority: parseNumber(form.priority),
    isEnable: parseNumber(form.isEnable),
    cooldownMinutes: parseNumber(form.cooldownMinutes),
  }

  try {
    if (payload.ruleId) {
      await updateIotRule(payload)
      ElMessage.success('更新规则成功')
    } else {
      delete payload.ruleId
      await createIotRule(payload)
      ElMessage.success('新增规则成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '保存规则失败'
    ElMessage.error(message)
  }
}

function handleDelete(row: AgriTaskRule): void {
  if (!row.ruleId) return
  ElMessageBox.confirm(`确认删除规则「${row.ruleName || row.ruleId}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeIotRuleById(row.ruleId as number)
      ElMessage.success('删除规则成功')
      await fetchList()
    })
    .catch(() => {})
}

function openQuickTaskDialog(row: AgriTaskRule): void {
  currentRule.value = row
  taskForm.taskName = `预警联动-${row.ruleName || '新任务'}`
  taskForm.taskType = row.autoTaskType || ''
  taskForm.priority = row.priority || 2
  taskForm.remark = `由IoT规则触发：${row.ruleName || ''}`
  taskDialogVisible.value = true
}

async function submitQuickTask(): Promise<void> {
  if (!taskFormRef.value) return
  const valid = await taskFormRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: AgriTask = {
    taskName: taskForm.taskName.trim(),
    taskType: taskForm.taskType.trim(),
    priority: parseNumber(taskForm.priority),
    planTime: new Date().toISOString(),
  }

  try {
    await createTask(payload)
    ElMessage.success('联动任务创建成功')
    taskDialogVisible.value = false
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '创建任务失败'
    ElMessage.error(message)
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
          <div class="title">IoT 预警规则管理</div>
          <div class="subtitle">规则阈值配置、启停管理及任务联动入口</div>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        <template #title>
          当前契约仅提供 `/iot/rule*` 与 `/iot/data/list`，暂无独立 `/iot/alert` 列表接口。TODO：后端补充后接入预警事件页。
        </template>
      </el-alert>

      <el-form :model="queryParams" inline label-width="88px">
        <el-form-item label="规则名称">
          <el-input
            v-model="queryParams.ruleName"
            placeholder="请输入规则名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="传感器类型">
          <el-select v-model="queryParams.sensorType" placeholder="全部类型" clearable style="width: 180px">
            <el-option v-for="item in SENSOR_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select v-model="queryParams.isEnable" placeholder="全部状态" clearable style="width: 160px">
            <el-option label="启用" value="1" />
            <el-option label="停用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="6">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增规则</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="dataTruncated" type="warning" :closable="false" style="margin-bottom: 12px">
        <template #title>
          规则数量超过 500 条，当前仅加载前 500 条用于管理视图。
        </template>
      </el-alert>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="pagedList" style="width: 100%">
        <el-table-column label="规则ID" prop="ruleId" width="90" align="center" />
        <el-table-column label="规则名称" prop="ruleName" min-width="160" />
        <el-table-column label="传感器类型" min-width="120">
          <template #default="scope">
            {{ formatSensorLabel(scope.row.sensorType) }}
          </template>
        </el-table-column>
        <el-table-column label="阈值区间" min-width="130" align="center">
          <template #default="scope">
            {{ scope.row.minVal ?? '-' }} ~ {{ scope.row.maxVal ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="联动任务类型" prop="autoTaskType" min-width="130" />
        <el-table-column label="优先级" width="90" align="center">
          <template #default="scope">
            <el-tag :type="formatPriorityTag(scope.row.priority).type">
              {{ formatPriorityTag(scope.row.priority).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isEnable === 1 ? 'success' : 'info'">
              {{ scope.row.isEnable === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="250" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="success" @click="openQuickTaskDialog(scope.row)">创建任务</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无预警规则数据" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="tableTotal > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="tableTotal"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="form.ruleName" placeholder="例如：低温预警规则" />
        </el-form-item>
        <el-form-item label="传感器类型" prop="sensorType">
          <el-select v-model="form.sensorType" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in SENSOR_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="最小阈值" prop="minVal">
          <el-input-number v-model="form.minVal" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大阈值" prop="maxVal">
          <el-input-number v-model="form.maxVal" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="联动任务类型" prop="autoTaskType">
          <el-input v-model="form.autoTaskType" placeholder="例如：Irrigate / KeepWarm" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="form.priority">
            <el-radio :value="1">高</el-radio>
            <el-radio :value="2">中</el-radio>
            <el-radio :value="3">低</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否启用" prop="isEnable">
          <el-radio-group v-model="form.isEnable">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="冷却时间(分钟)">
          <el-input-number v-model="form.cooldownMinutes" :min="1" :max="1440" :step="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" title="创建联动任务" width="560px" destroy-on-close>
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="110px">
        <el-form-item label="来源规则">
          <el-input :model-value="currentRule?.ruleName || '-'" disabled />
        </el-form-item>
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="taskForm.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务类型" prop="taskType">
          <el-input v-model="taskForm.taskType" placeholder="请输入任务类型" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="taskForm.priority">
            <el-radio :value="1">高</el-radio>
            <el-radio :value="2">中</el-radio>
            <el-radio :value="3">低</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" type="textarea" :rows="3" placeholder="可选：补充任务说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuickTask">创建任务</el-button>
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
