<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search, User, View } from '@element-plus/icons-vue'

import { assignTask, createTask, listTask } from '@/api/modules/task'
import { listSystemUser } from '@/api/modules/system'
import type { AgriTask, SysUser, TaskAssignRequest } from '@/api/types/models'
import { TASK_PRIORITY_MAP, TASK_STATUS, TASK_STATUS_MAP } from '@/constants/task'
import { ROLE_FARMER, ROLE_WORKER } from '@/constants/permission'
import { resolveUserRoles } from '@/utils/permission'

const loading = ref(false)
const list = ref<AgriTask[]>([])
const total = ref(0)
const route = useRoute()

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  taskName: '',
  status: undefined as number | undefined,
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
  executorId: number | null
  remark: string
}

const assignForm = ref<AssignFormModel>({
  taskId: null,
  executorId: null,
  remark: '',
})

const assignRules = ref<FormRules<AssignFormModel>>({
  executorId: [{ required: true, message: '请选择执行人', trigger: 'change' }],
})

interface CreateFormModel {
  batchId: number | null
  taskName: string
  taskType: string
  priority: number
  planTime: string
  extParams: string
}

const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = ref<CreateFormModel>({
  batchId: null,
  taskName: '',
  taskType: '',
  priority: 2,
  planTime: '',
  extParams: '',
})

const createRules: FormRules<CreateFormModel> = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  taskType: [{ required: true, message: '请输入任务类型', trigger: 'blur' }],
  planTime: [{ required: true, message: '请选择计划时间', trigger: 'change' }],
}

const applyRouteFilter = () => {
  const statusQuery = route.query.status
  const taskNameQuery = route.query.taskName

  if (typeof statusQuery === 'string' && statusQuery.trim() !== '') {
    const parsed = Number(statusQuery)
    queryParams.value.status = Number.isFinite(parsed) ? parsed : undefined
  } else {
    queryParams.value.status = undefined
  }

  if (typeof taskNameQuery === 'string') {
    queryParams.value.taskName = taskNameQuery
  }
}

const getList = async () => {
  loading.value = true
  try {
    const res = await listTask(queryParams.value)
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    console.error('获取任务列表失败', error)
  } finally {
    loading.value = false
  }
}

const roleLabelOfUser = (user: SysUser): string => {
  const roles = resolveUserRoles([], user)
  const hasFarmer = roles.includes(ROLE_FARMER)
  const hasWorker = roles.includes(ROLE_WORKER)

  if (hasFarmer && hasWorker) return '农户/工人'
  if (hasFarmer) return '农户'
  if (hasWorker) return '工人'
  return '-'
}

const isAssignableUser = (user: SysUser): boolean => {
  if (user.userId === undefined || user.userId === null) return false
  if (user.status !== undefined && Number(user.status) !== 1) return false

  const roles = resolveUserRoles([], user)
  return roles.includes(ROLE_FARMER) || roles.includes(ROLE_WORKER)
}

const getAssignableUsers = async () => {
  try {
    const res = await listSystemUser({ pageNum: 1, pageSize: 500, status: 1 })
    assignableUsers.value = (res.records || []).filter((user) => isAssignableUser(user))

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

const getExecutorName = (row: AgriTask): string => {
  const id = Number(row.executorId ?? row.assigneeId)
  if (!Number.isFinite(id) || id <= 0) return '-'
  return userNameMap.value[id] || `用户ID:${id}`
}

const getExecutorRoleLabel = (userId?: number): string => {
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
    status: undefined,
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
  createForm.value.extParams = ''
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
    extParams: createForm.value.extParams.trim(),
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
  if (row.status !== TASK_STATUS.PENDING_ASSIGN) {
    ElMessage.warning('只能派单待分配状态的任务')
    return
  }

  assignForm.value.taskId = row.taskId ?? null
  assignForm.value.executorId = null
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
  const executorId = Number(assignForm.value.executorId)

  if (!Number.isFinite(taskId) || taskId <= 0 || !Number.isFinite(executorId) || executorId <= 0) {
    ElMessage.error('taskId 和 executorId 不能为空')
    return
  }

  const payload: TaskAssignRequest = {
    taskId,
    executorId,
    remark: assignForm.value.remark || '',
  }

  if (import.meta.env.DEV) {
    console.debug('[task.assign] payload', payload)
  }

  try {
    await assignTask(payload)
    ElMessage.success('派单成功')
    assignDialogVisible.value = false
    void getList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '派单失败'
    ElMessage.error(message)
    console.error('派单失败', error)
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

        <el-form-item label="任务状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 220px">
            <el-option v-for="(val, key) in TASK_STATUS_MAP" :key="key" :label="val.text" :value="Number(key)" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="toolbar">
        <el-col :span="6">
          <el-button type="primary" :icon="Plus" @click="handleCreate">创建任务</el-button>
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
              v-if="scope.row.status !== undefined && TASK_STATUS_MAP[scope.row.status]"
              :type="TASK_STATUS_MAP[scope.row.status]?.type"
            >
              {{ TASK_STATUS_MAP[scope.row.status]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="计划时间" prop="planTime" width="170" align="center" />
        <el-table-column label="执行人" width="150" align="center">
          <template #default="scope">
            {{ getExecutorName(scope.row) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button
              v-if="scope.row.status === TASK_STATUS.PENDING_ASSIGN"
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
          <el-descriptions-item label="执行人">
            {{ getExecutorName(currentDetail) }}
          </el-descriptions-item>
          <el-descriptions-item label="执行人角色">
            {{ getExecutorRoleLabel(Number(currentDetail.executorId ?? currentDetail.assigneeId)) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              v-if="currentDetail.status !== undefined && TASK_STATUS_MAP[currentDetail.status]"
              :type="TASK_STATUS_MAP[currentDetail.status as number]?.type"
            >
              {{ TASK_STATUS_MAP[currentDetail.status as number]?.text }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <el-dialog title="任务派单" v-model="assignDialogVisible" width="450px" append-to-body>
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="执行人" prop="executorId">
          <el-select v-model="assignForm.executorId" placeholder="请选择执行人" filterable style="width: 100%">
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
        <el-form-item label="备注">
          <el-input
            v-model="createForm.extParams"
            type="textarea"
            :rows="3"
            placeholder="可选：填写任务补充说明"
          />
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
