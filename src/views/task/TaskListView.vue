<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search, User, View, Download } from '@element-plus/icons-vue'

import { assignTask, createTask, listTask } from '@/api/modules/task'
import { listSystemUser } from '@/api/modules/system'
import type { AgriTask, SysUser, TaskAssignRequest } from '@/types/entity'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP, TASK_STATUS_V2 } from '@/constants/task'
import { ROLE_TECHNICIAN, ROLE_WORKER } from '@/constants/permission'
import { resolveUserRoles } from '@/utils/permission'
import { useExport, type ExportColumn } from '@/composables/useExport'

const loading = ref(false)
const list = ref<AgriTask[]>([])
const total = ref(0)
const route = useRoute()

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  taskName: '',
  statusV2: undefined as string | undefined,
})

const drawerVisible = ref(false)
const currentDetail = ref<AgriTask | null>(null)

const assignDialogVisible = ref(false)
const assignFormRef = ref<FormInstance>()
const assignableUsers = ref<SysUser[]>([])
const userNameMap = ref<Record<number, string>>({})
const userRoleLabelMap = ref<Record<number, string>>({})

interface AssignFormModel {
  taskId: number | null
  assigneeId: number | null
  remark: string
}

const assignForm = ref<AssignFormModel>({
  taskId: null,
  assigneeId: null,
  remark: '',
})

const assignRules = ref<FormRules<AssignFormModel>>({
  assigneeId: [{ required: true, message: '请选择执行人', trigger: 'change' }],
})

interface CreateFormModel {
  batchId: number | null
  taskName: string
  taskType: string
  priority: number
  planTime: string
}

const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = ref<CreateFormModel>({
  batchId: null,
  taskName: '',
  taskType: '',
  priority: 2,
  planTime: '',
})

const createRules: FormRules<CreateFormModel> = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  taskType: [{ required: true, message: '请输入任务类型', trigger: 'blur' }],
  planTime: [{ required: true, message: '请选择计划时间', trigger: 'change' }],
}

const applyRouteFilter = () => {
  const statusQuery = route.query.statusV2 ?? route.query.status
  const taskNameQuery = route.query.taskName

  if (typeof statusQuery === 'string' && statusQuery.trim() !== '') {
    queryParams.value.statusV2 = statusQuery.trim()
  } else {
    queryParams.value.statusV2 = undefined
  }

  if (typeof taskNameQuery === 'string') {
    queryParams.value.taskName = taskNameQuery
  }
}

const getList = async () => {
  loading.value = true
  try {
    const res = await listTask(queryParams.value)
    list.value = res.items || []
    total.value = Number(res.total || 0)
  } catch (error) {
    console.error('获取任务列表失败', error)
  } finally {
    loading.value = false
  }
}

const roleLabelOfUser = (user: SysUser): string => {
  const roles = resolveUserRoles([], user)
  const hasTech = roles.includes(ROLE_TECHNICIAN)
  const hasWorker = roles.includes(ROLE_WORKER)

  if (hasTech && hasWorker) return '技术员/工人'
  if (hasTech) return '技术员'
  if (hasWorker) return '工人'
  return '-'
}

const isAssignableUser = (user: SysUser): boolean => {
  if (user.userId === undefined || user.userId === null) return false
  if (user.status !== undefined && Number(user.status) !== 1) return false

  const roles = resolveUserRoles([], user)
  return roles.includes(ROLE_TECHNICIAN) || roles.includes(ROLE_WORKER)
}

const getAssignableUsers = async () => {
  try {
    const res = await listSystemUser({ pageNum: 1, pageSize: 500, status: 1 })
    assignableUsers.value = (res.items || []).filter((user) => isAssignableUser(user))

    const nameMap: Record<number, string> = {}
    const roleMap: Record<number, string> = {}
    assignableUsers.value.forEach((user) => {
      const id = Number(user.userId)
      if (Number.isFinite(id) && id > 0) {
        nameMap[id] = user.realName || user.username || `用户${id}`
        roleMap[id] = roleLabelOfUser(user)
      }
    })

    userNameMap.value = nameMap
    userRoleLabelMap.value = roleMap
  } catch (error) {
    console.error('获取可派单人员失败', error)
  }
}

const getAssigneeName = (row: AgriTask): string => {
  const id = Number(row.assigneeId)
  if (!Number.isFinite(id) || id <= 0) return '-'
  return userNameMap.value[id] || row.assigneeName || `用户ID:${id}`
}

const getAssigneeRoleLabel = (userId?: number): string => {
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) return '-'
  return userRoleLabelMap.value[id] || '-'
}

const handleQuery = () => {
  queryParams.value.pageNum = 1
  void getList()
}

const resetQuery = () => {
  queryParams.value = {
    pageNum: 1,
    pageSize: 10,
    taskName: '',
    statusV2: undefined,
  }
  void getList()
}

const handleSizeChange = (val: number) => {
  queryParams.value.pageSize = val
  void getList()
}

const handleCurrentChange = (val: number) => {
  queryParams.value.pageNum = val
  void getList()
}

const handleView = (row: AgriTask) => {
  currentDetail.value = row
  drawerVisible.value = true
}

const handleCreate = () => {
  createForm.value.batchId = null
  createForm.value.taskName = ''
  createForm.value.taskType = ''
  createForm.value.priority = 2
  createForm.value.planTime = ''
  createDialogVisible.value = true
  createFormRef.value?.clearValidate()
}

const submitCreate = async () => {
  if (!createFormRef.value) return
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  const batchId = Number(createForm.value.batchId)
  const payload: AgriTask = {
    taskName: createForm.value.taskName.trim(),
    taskType: createForm.value.taskType.trim(),
    priority: Number(createForm.value.priority || 2),
    planTime: createForm.value.planTime,
  }

  if (Number.isFinite(batchId) && batchId > 0) {
    payload.batchId = batchId
  }

  try {
    await createTask(payload)
    ElMessage.success('创建任务成功')
    createDialogVisible.value = false
    queryParams.value.pageNum = 1
    void getList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '创建任务失败'
    ElMessage.error(message)
  }
}

const handleAssign = (row: AgriTask) => {
  if (row.statusV2 !== TASK_STATUS_V2.PENDING_REVIEW) {
    ElMessage.warning('只能派单待复核状态的任务')
    return
  }

  assignForm.value.taskId = row.taskId ?? null
  assignForm.value.assigneeId = null
  assignForm.value.remark = ''
  assignFormRef.value?.clearValidate()

  assignDialogVisible.value = true
  if (assignableUsers.value.length === 0) {
    void getAssignableUsers()
  }
}

const submitAssign = async () => {
  if (!assignFormRef.value) return
  const valid = await assignFormRef.value.validate().catch(() => false)
  if (!valid) return

  const taskId = Number(assignForm.value.taskId)
  const assigneeId = Number(assignForm.value.assigneeId)

  if (!Number.isFinite(taskId) || taskId <= 0 || !Number.isFinite(assigneeId) || assigneeId <= 0) {
    ElMessage.error('taskId 和 assigneeId 不能为空')
    return
  }

  const payload: TaskAssignRequest = {
    taskId,
    assigneeId,
    remark: assignForm.value.remark || '',
  }

  try {
    await assignTask(payload)
    ElMessage.success('派单成功')
    assignDialogVisible.value = false
    void getList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '派单失败'
    ElMessage.error(message)
  }
}

const { exportToXlsx } = useExport()

const exportColumns: ExportColumn[] = [
  { header: '任务ID', key: 'taskId' },
  { header: '任务名称', key: 'taskName' },
  { header: '任务类型', key: 'taskType' },
  { header: '优先级', key: 'priority', formatter: (v) => TASK_PRIORITY_MAP[v as number]?.text || String(v ?? '') },
  { header: '状态', key: 'statusV2', formatter: (v) => TASK_STATUS_MAP[v as string]?.text || String(v ?? '') },
  { header: '计划时间', key: 'planTime' },
  { header: '负责人', key: 'assigneeName' },
]

const handleExport = async () => {
  try {
    const res = await listTask({ pageNum: 1, pageSize: 9999 })
    exportToXlsx(res.items || [], exportColumns, '任务列表')
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  applyRouteFilter()
  void getAssignableUsers()
  void getList()
})

watch(
  () => route.query,
  () => {
    applyRouteFilter()
    queryParams.value.pageNum = 1
    void getList()
  },
)
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <el-form :model="queryParams" inline label-width="80px">
        <el-form-item label="任务名称" prop="taskName">
          <el-input
            v-model="queryParams.taskName"
            placeholder="请输入任务名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="任务状态" prop="statusV2">
          <el-select v-model="queryParams.statusV2" placeholder="请选择状态" clearable style="width: 220px">
            <el-option v-for="(val, key) in TASK_STATUS_MAP" :key="key" :label="val.text" :value="key" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="12">
          <el-button type="primary" :icon="Plus" @click="handleCreate">创建任务</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="list" style="width: 100%; margin-top: 16px">
        <el-table-column label="任务ID" prop="taskId" width="100" align="center" />
        <el-table-column label="任务名称" prop="taskName" min-width="180" show-overflow-tooltip />
        <el-table-column label="任务类型" prop="taskType" width="120" align="center" />

        <el-table-column label="优先级" width="100" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.priority !== undefined && TASK_PRIORITY_MAP[scope.row.priority]"
              :type="TASK_PRIORITY_MAP[scope.row.priority]?.type"
            >
              {{ TASK_PRIORITY_MAP[scope.row.priority]?.text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.statusV2 && TASK_STATUS_MAP[scope.row.statusV2]"
              :type="TASK_STATUS_MAP[scope.row.statusV2]?.type"
            >
              {{ TASK_STATUS_MAP[scope.row.statusV2]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="计划时间" prop="planTime" width="170" align="center" />
        <el-table-column label="负责人" width="150" align="center">
          <template #default="scope">
            {{ getAssigneeName(scope.row) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button
              v-if="scope.row.statusV2 === TASK_STATUS_V2.PENDING_REVIEW"
              link
              type="success"
              :icon="User"
              @click="handleAssign(scope.row)"
            >
              派单
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
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

    <el-drawer v-model="drawerVisible" title="任务详情" direction="rtl" size="30%">
      <div v-if="currentDetail" class="detail-container">
        <el-descriptions title="基础信息" :column="1" border>
          <el-descriptions-item label="任务ID">{{ currentDetail.taskId }}</el-descriptions-item>
          <el-descriptions-item label="任务名称">{{ currentDetail.taskName }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{ currentDetail.taskType }}</el-descriptions-item>
          <el-descriptions-item label="计划时间">{{ currentDetail.planTime }}</el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ getAssigneeName(currentDetail) }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人角色">
            {{ getAssigneeRoleLabel(currentDetail.assigneeId) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              v-if="currentDetail.statusV2 && TASK_STATUS_MAP[currentDetail.statusV2]"
              :type="TASK_STATUS_MAP[currentDetail.statusV2]?.type"
            >
              {{ TASK_STATUS_MAP[currentDetail.statusV2]?.text }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <el-dialog title="任务派单" v-model="assignDialogVisible" width="450px" append-to-body>
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="负责人" prop="assigneeId">
          <el-select v-model="assignForm.assigneeId" placeholder="请选择负责人" filterable style="width: 100%">
            <el-option
              v-for="user in assignableUsers"
              :key="user.userId"
              :label="`${user.realName || user.username} (${roleLabelOfUser(user)} / ID:${user.userId})`"
              :value="Number(user.userId)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input v-model="assignForm.remark" type="textarea" :rows="3" placeholder="可选：补充派单说明" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAssign">确定派单</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="手动创建任务" v-model="createDialogVisible" width="560px" append-to-body>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="createForm.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务类型" prop="taskType">
          <el-input v-model="createForm.taskType" placeholder="请输入任务类型，例如：Irrigate" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="createForm.priority" placeholder="请选择优先级" style="width: 100%">
            <el-option
              v-for="(val, key) in TASK_PRIORITY_MAP"
              :key="key"
              :label="val.text"
              :value="Number(key)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="计划时间" prop="planTime">
          <el-date-picker
            v-model="createForm.planTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择计划执行时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="批次ID">
          <el-input-number v-model="createForm.batchId" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCreate">确定创建</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.toolbar {
  margin-top: 12px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.detail-container {
  padding: 8px 16px;
}
</style>
