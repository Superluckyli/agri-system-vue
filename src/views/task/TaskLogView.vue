<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'

import { createMaterialLogExecute, listMaterialInfo } from '@/api/modules/material'
import { createTaskLog, listTask, listTaskLog } from '@/api/modules/task'
import type { AgriTask, MaterialInfo, TaskExecutionLog } from '@/api/types/models'
import { ROLE_ADMIN, ROLE_FARM_OWNER } from '@/constants/permission'
import { TASK_STATUS } from '@/constants/task'
import { useAuthStore } from '@/stores/auth'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'

interface QueryParams {
  taskId: number | null
  pageNum: number
  pageSize: number
}

interface MaterialUsageItem {
  materialId: number | null
  quantity: number | null
}

interface ExecuteFormModel {
  taskId: number | null
  actualStartTime: string
  actualEndTime: string
  statusSnapshot: number
  photoUrl: string
  weather: string
  laborHours: number | null
  machineHours: number | null
  qualityScore: number
  problemDesc: string
  materialItems: MaterialUsageItem[]
}

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const loadError = ref('')
const total = ref(0)
const list = ref<TaskExecutionLog[]>([])

const ownTaskOptions = ref<AgriTask[]>([])
const materialOptions = ref<MaterialInfo[]>([])

const queryParams = reactive<QueryParams>({
  taskId: null,
  pageNum: 1,
  pageSize: 10,
})

const executeDialogVisible = ref(false)
const executeSubmitting = ref(false)
const executeFormRef = ref<FormInstance>()
const executeForm = reactive<ExecuteFormModel>({
  taskId: null,
  actualStartTime: '',
  actualEndTime: '',
  statusSnapshot: TASK_STATUS.COMPLETED,
  photoUrl: '',
  weather: '',
  laborHours: null,
  machineHours: null,
  qualityScore: 80,
  problemDesc: '',
  materialItems: [{ materialId: null, quantity: null }],
})

const currentRoles = computed(() => resolveUserRoles(authStore.roles, authStore.user))
const canViewAllLogs = computed(() => hasAnyRole(currentRoles.value, [ROLE_ADMIN, ROLE_FARM_OWNER]))
const currentUserId = computed(() => Number(authStore.user?.userId || 0))

const isExecutableStatus = (status: number | undefined): boolean => {
  return status === TASK_STATUS.IN_PROGRESS || status === TASK_STATUS.OVERDUE || status === TASK_STATUS.COMPLETED
}

const executableOwnTaskOptions = computed(() => {
  return ownTaskOptions.value.filter((task) => isExecutableStatus(Number(task.status)))
})

const validatePhotoUrl = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  const val = String(value || '').trim()
  if (!val) {
    callback(new Error('请填写执行照片URL'))
    return
  }
  if (val.length > 255) {
    callback(new Error('照片URL长度不能超过255字符'))
    return
  }
  if (!/^https?:\/\//i.test(val) && !val.startsWith('/')) {
    callback(new Error('请填写 http(s):// 或 / 开头的图片地址'))
    return
  }
  callback()
}

const executeRules = reactive<FormRules<ExecuteFormModel>>({
  taskId: [{ required: true, message: '请选择任务', trigger: 'change' }],
  actualStartTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  actualEndTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  statusSnapshot: [{ required: true, message: '请选择任务状态', trigger: 'change' }],
  photoUrl: [{ validator: validatePhotoUrl, trigger: 'blur' }],
})

const materialNameMap = computed(() => {
  const map: Record<number, string> = {}
  materialOptions.value.forEach((item) => {
    const id = Number(item.materialId)
    if (Number.isFinite(id) && id > 0) {
      map[id] = item.name || `农资${id}`
    }
  })
  return map
})

const materialUnitMap = computed(() => {
  const map: Record<number, string> = {}
  materialOptions.value.forEach((item) => {
    const id = Number(item.materialId)
    if (Number.isFinite(id) && id > 0) {
      map[id] = item.unit || ''
    }
  })
  return map
})

const applyTaskIdFromRoute = () => {
  const raw = route.query.taskId
  const first = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(first)
  queryParams.taskId = Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const isOwnTask = (taskId: number): boolean => {
  return ownTaskOptions.value.some((item) => Number(item.taskId) === taskId)
}

const hasTaskAccess = (taskId: number): boolean => {
  if (canViewAllLogs.value) return true
  return isOwnTask(taskId)
}

const ensureTaskAccessOrReset = () => {
  if (!canViewAllLogs.value && queryParams.taskId && !isOwnTask(queryParams.taskId)) {
    queryParams.taskId = null
  }
}

const loadOwnTasks = async () => {
  if (canViewAllLogs.value) {
    ownTaskOptions.value = []
    return
  }

  if (!Number.isFinite(currentUserId.value) || currentUserId.value <= 0) {
    ownTaskOptions.value = []
    return
  }

  try {
    const res = await listTask({
      pageNum: 1,
      pageSize: 500,
      executorId: currentUserId.value,
    })
    ownTaskOptions.value = res.records || []
    ensureTaskAccessOrReset()
  } catch (error) {
    ownTaskOptions.value = []
    console.error('加载我的任务失败', error)
  }
}

const loadMaterialOptions = async () => {
  try {
    const res = await listMaterialInfo({ pageNum: 1, pageSize: 500 })
    materialOptions.value = res.records || []
  } catch (error) {
    materialOptions.value = []
    console.error('加载农资列表失败', error)
  }
}

const fetchList = async (): Promise<void> => {
  loading.value = true
  loadError.value = ''

  try {
    if (!canViewAllLogs.value) {
      if (!queryParams.taskId) {
        list.value = []
        total.value = 0
        return
      }
      if (!hasTaskAccess(queryParams.taskId)) {
        list.value = []
        total.value = 0
        loadError.value = '无权限查看该任务的执行日志'
        return
      }
    }

    const res = await listTaskLog({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      taskId: queryParams.taskId || undefined,
    })

    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '获取执行日志失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = (): void => {
  queryParams.pageNum = 1
  void fetchList()
}

const resetQuery = (): void => {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.taskId = null
  void fetchList()
}

const handleSizeChange = (size: number): void => {
  queryParams.pageSize = size
  void fetchList()
}

const handleCurrentChange = (page: number): void => {
  queryParams.pageNum = page
  void fetchList()
}

const resetExecuteForm = (defaultTaskId: number | null = null) => {
  executeForm.taskId = defaultTaskId
  executeForm.actualStartTime = ''
  executeForm.actualEndTime = ''
  executeForm.statusSnapshot = TASK_STATUS.COMPLETED
  executeForm.photoUrl = ''
  executeForm.weather = ''
  executeForm.laborHours = null
  executeForm.machineHours = null
  executeForm.qualityScore = 80
  executeForm.problemDesc = ''
  executeForm.materialItems = [{ materialId: null, quantity: null }]
  executeFormRef.value?.clearValidate()
}

const openExecuteDialog = () => {
  if (!canViewAllLogs.value && executableOwnTaskOptions.value.length === 0) {
    ElMessage.warning('暂无可执行任务')
    return
  }

  const defaultTaskIdRaw = queryParams.taskId ?? Number(executableOwnTaskOptions.value[0]?.taskId)
  const defaultTaskId = Number(defaultTaskIdRaw)
  resetExecuteForm(Number.isFinite(defaultTaskId) && defaultTaskId > 0 ? defaultTaskId : null)
  executeDialogVisible.value = true

  if (materialOptions.value.length === 0) {
    void loadMaterialOptions()
  }
}

const addMaterialItem = () => {
  executeForm.materialItems.push({ materialId: null, quantity: null })
}

const removeMaterialItem = (index: number) => {
  if (executeForm.materialItems.length <= 1) {
    executeForm.materialItems[0] = { materialId: null, quantity: null }
    return
  }
  executeForm.materialItems.splice(index, 1)
}

const normalizeMaterialUsage = () => {
  const merged = new Map<number, number>()

  executeForm.materialItems.forEach((item) => {
    const materialId = Number(item.materialId)
    const quantity = Number(item.quantity)
    if (!Number.isFinite(materialId) || materialId <= 0) return
    if (!Number.isFinite(quantity) || quantity <= 0) return

    const current = merged.get(materialId) || 0
    merged.set(materialId, current + quantity)
  })

  return Array.from(merged.entries()).map(([materialId, qty]) => ({
    materialId,
    qty,
    materialName: materialNameMap.value[materialId] || `农资${materialId}`,
    unit: materialUnitMap.value[materialId] || '',
  }))
}

const submitExecuteLog = async () => {
  if (!executeFormRef.value) return

  const valid = await executeFormRef.value.validate().catch(() => false)
  if (!valid) return

  const taskId = Number(executeForm.taskId)
  if (!Number.isFinite(taskId) || taskId <= 0) {
    ElMessage.warning('任务ID无效')
    return
  }

  if (!hasTaskAccess(taskId)) {
    ElMessage.error('无权限提交该任务执行日志')
    return
  }

  if (!canViewAllLogs.value) {
    const exists = executableOwnTaskOptions.value.some((item) => Number(item.taskId) === taskId)
    if (!exists) {
      ElMessage.warning('该任务当前不允许执行填报')
      return
    }
  }

  const materialUsage = normalizeMaterialUsage()
  if (materialUsage.length === 0) {
    ElMessage.warning('请至少填写一条有效的农资消耗')
    return
  }

  const startAt = executeForm.actualStartTime
  const endAt = executeForm.actualEndTime
  if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
    ElMessage.warning('结束时间不能早于开始时间')
    return
  }

  const photoUrl = executeForm.photoUrl.trim()
  if (photoUrl.length > 255) {
    ElMessage.warning('照片URL过长，请控制在255字符以内')
    return
  }

  executeSubmitting.value = true
  try {
    for (const item of materialUsage) {
      await createMaterialLogExecute({
        materialId: item.materialId,
        type: 2,
        quantity: item.qty,
        relatedTaskId: taskId,
        remark: `任务执行消耗：${item.materialName}`,
      })
    }

    const payload: TaskExecutionLog = {
      taskId,
      actualStartTime: executeForm.actualStartTime,
      actualEndTime: executeForm.actualEndTime,
      statusSnapshot: Number(executeForm.statusSnapshot || TASK_STATUS.COMPLETED),
      photoUrl,
      materialCostJson: JSON.stringify({
        items: materialUsage,
        extra: {
          weather: executeForm.weather || null,
          laborHours: executeForm.laborHours,
          machineHours: executeForm.machineHours,
          qualityScore: executeForm.qualityScore,
        },
      }),
      problemDesc: executeForm.problemDesc || '执行完成',
    }

    await createTaskLog(payload)

    ElMessage.success('执行日志提交成功')
    executeDialogVisible.value = false

    queryParams.taskId = taskId
    queryParams.pageNum = 1
    await fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交执行日志失败'
    ElMessage.error(message)
  } finally {
    executeSubmitting.value = false
  }
}

onMounted(async () => {
  applyTaskIdFromRoute()
  await loadOwnTasks()

  if (!canViewAllLogs.value && !queryParams.taskId && ownTaskOptions.value.length > 0) {
    queryParams.taskId = Number(ownTaskOptions.value[0]?.taskId) || null
  }

  void fetchList()
})

watch(
  () => route.query.taskId,
  async () => {
    applyTaskIdFromRoute()
    await loadOwnTasks()
    queryParams.pageNum = 1
    void fetchList()
  },
)
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">执行日志</div>
          <div class="subtitle">执行者仅可查看自己的任务日志；管理员和农场主可查看全部。</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="80px">
        <el-form-item label="任务">
          <el-select
            v-if="!canViewAllLogs"
            v-model="queryParams.taskId"
            placeholder="请选择我的任务"
            clearable
            filterable
            style="width: 280px"
          >
            <el-option
              v-for="task in ownTaskOptions"
              :key="task.taskId"
              :label="`${task.taskName || '未命名任务'} (#${task.taskId})`"
              :value="Number(task.taskId)"
            />
          </el-select>

          <el-input-number
            v-else
            v-model="queryParams.taskId"
            :min="1"
            :precision="0"
            style="width: 220px"
            placeholder="输入任务ID"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button v-if="!canViewAllLogs" type="success" :icon="Plus" @click="openExecuteDialog">填写执行结果</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">重试</el-button>
      </el-alert>

      <el-alert
        v-if="!canViewAllLogs && !queryParams.taskId && !loadError"
        type="info"
        :closable="false"
        style="margin-bottom: 12px"
        title="请先选择一个任务，再查看日志"
      />

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="日志ID" prop="logId" width="90" align="center" />
        <el-table-column label="任务ID" prop="taskId" width="90" align="center" />
        <el-table-column label="开始时间" prop="actualStartTime" min-width="170" />
        <el-table-column label="结束时间" prop="actualEndTime" min-width="170" />
        <el-table-column label="状态快照" prop="statusSnapshot" width="100" align="center" />
        <el-table-column label="说明" prop="problemDesc" min-width="180" show-overflow-tooltip />
        <el-table-column label="照片" min-width="120" align="center">
          <template #default="scope">
            <el-image
              v-if="scope.row.photoUrl"
              :src="scope.row.photoUrl"
              :preview-src-list="[scope.row.photoUrl]"
              fit="cover"
              style="width: 56px; height: 56px; border-radius: 4px"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
        <template #empty>
          <el-empty description="暂无执行日志" />
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

    <el-dialog v-model="executeDialogVisible" title="填写执行结果" width="780px" append-to-body>
      <el-form ref="executeFormRef" :model="executeForm" :rules="executeRules" label-width="110px">
        <el-form-item label="任务" prop="taskId">
          <el-select
            v-model="executeForm.taskId"
            placeholder="请选择任务"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="task in executableOwnTaskOptions"
              :key="task.taskId"
              :label="`${task.taskName || '未命名任务'} (#${task.taskId})`"
              :value="Number(task.taskId)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="开始时间" prop="actualStartTime">
          <el-date-picker
            v-model="executeForm.actualStartTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择开始时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="结束时间" prop="actualEndTime">
          <el-date-picker
            v-model="executeForm.actualEndTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择结束时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="任务状态" prop="statusSnapshot">
          <el-select v-model="executeForm.statusSnapshot" style="width: 240px">
            <el-option :value="TASK_STATUS.IN_PROGRESS" label="执行中" />
            <el-option :value="TASK_STATUS.COMPLETED" label="已完成" />
            <el-option :value="TASK_STATUS.OVERDUE" label="已逾期" />
          </el-select>
        </el-form-item>

        <el-form-item label="照片URL" prop="photoUrl">
          <el-input
            v-model="executeForm.photoUrl"
            maxlength="255"
            show-word-limit
            placeholder="请填写图片URL（http(s):// 或 /开头，最长255）"
          />
        </el-form-item>

        <el-form-item label="农资消耗">
          <div class="material-list">
            <div v-for="(item, index) in executeForm.materialItems" :key="index" class="material-row">
              <el-select v-model="item.materialId" placeholder="选择农资" filterable style="flex: 1">
                <el-option
                  v-for="material in materialOptions"
                  :key="material.materialId"
                  :label="`${material.name || '未命名'} (${material.unit || '-'})`"
                  :value="Number(material.materialId)"
                />
              </el-select>

              <el-input-number v-model="item.quantity" :min="0.01" :precision="2" placeholder="数量" style="width: 160px" />

              <el-button type="danger" link @click="removeMaterialItem(index)">删除</el-button>
            </div>

            <el-button type="primary" link :icon="Plus" @click="addMaterialItem">新增一条农资消耗</el-button>
          </div>
        </el-form-item>

        <el-form-item label="执行说明" prop="problemDesc">
          <el-input
            v-model="executeForm.problemDesc"
            type="textarea"
            :rows="3"
            placeholder="可选：填写执行过程说明"
          />
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="天气" label-width="80px">
              <el-input v-model="executeForm.weather" placeholder="如：晴/多云/小雨" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="人工工时" label-width="80px">
              <el-input-number v-model="executeForm.laborHours" :min="0" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="机械工时" label-width="80px">
              <el-input-number v-model="executeForm.machineHours" :min="0" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="质量评分">
          <el-slider v-model="executeForm.qualityScore" :min="0" :max="100" show-input />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="executeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="executeSubmitting" @click="submitExecuteLog">提交执行结果</el-button>
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

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.material-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
