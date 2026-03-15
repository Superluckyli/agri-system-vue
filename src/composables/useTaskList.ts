import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { assignTask, createTask, listTask } from '@/api/modules/task'
import { listSystemUser } from '@/api/modules/system'
import type { AgriTask, SysUser, TaskAssignRequest } from '@/types/entity'
import { ROLE_TECHNICIAN, ROLE_WORKER } from '@/constants/permission'
import { resolveUserRoles } from '@/utils/permission'

// ======================== 列表 + 分页 ========================

export function useTaskListData() {
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

  async function fetchList() {
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

  function handleQuery() {
    queryParams.value.pageNum = 1
    void fetchList()
  }

  function resetQuery() {
    queryParams.value = { pageNum: 1, pageSize: 10, taskName: '', statusV2: undefined }
    void fetchList()
  }

  function handleSizeChange(val: number) {
    queryParams.value.pageSize = val
    void fetchList()
  }

  function handleCurrentChange(val: number) {
    queryParams.value.pageNum = val
    void fetchList()
  }

  /** 从 route.query 同步筛选条件 */
  function applyRouteFilter() {
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

  watch(() => route.query, applyRouteFilter)

  return {
    loading, list, total, queryParams,
    fetchList, handleQuery, resetQuery, handleSizeChange, handleCurrentChange,
    applyRouteFilter,
  }
}

// ======================== 派单 ========================

export interface AssignFormModel {
  taskId: number | null
  assigneeId: number | null
  remark: string
}

export function useTaskAssign(onSuccess: () => void) {
  const assignDialogVisible = ref(false)
  const assignFormRef = ref<FormInstance>()
  const assignableUsers = ref<SysUser[]>([])
  const userNameMap = ref<Record<number, string>>({})
  const userRoleLabelMap = ref<Record<number, string>>({})

  const assignForm = ref<AssignFormModel>({
    taskId: null,
    assigneeId: null,
    remark: '',
  })

  const assignRules: FormRules<AssignFormModel> = {
    assigneeId: [{ required: true, message: '请选择执行人', trigger: 'change' }],
  }

  function roleLabelOfUser(user: SysUser): string {
    const roles = resolveUserRoles([], user)
    const hasTech = roles.includes(ROLE_TECHNICIAN)
    const hasWorker = roles.includes(ROLE_WORKER)
    if (hasTech && hasWorker) return '技术员/工人'
    if (hasTech) return '技术员'
    if (hasWorker) return '工人'
    return '-'
  }

  function isAssignableUser(user: SysUser): boolean {
    if (user.userId === undefined || user.userId === null) return false
    if (user.status !== undefined && Number(user.status) !== 1) return false
    const roles = resolveUserRoles([], user)
    return roles.includes(ROLE_TECHNICIAN) || roles.includes(ROLE_WORKER)
  }

  async function fetchAssignableUsers() {
    try {
      const res = await listSystemUser({ pageNum: 1, pageSize: 500, status: 1 })
      assignableUsers.value = (res.items || []).filter(isAssignableUser)
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

  function getAssigneeName(row: AgriTask): string {
    const id = Number(row.assigneeId)
    if (!Number.isFinite(id) || id <= 0) return '-'
    return userNameMap.value[id] || row.assigneeName || `用户ID:${id}`
  }

  function getAssigneeRoleLabel(userId?: number): string {
    const id = Number(userId)
    if (!Number.isFinite(id) || id <= 0) return '-'
    return userRoleLabelMap.value[id] || '-'
  }

  function openAssignDialog(task: AgriTask) {
    assignForm.value = { taskId: task.taskId ?? null, assigneeId: null, remark: '' }
    assignDialogVisible.value = true
  }

  async function submitAssign() {
    if (!assignFormRef.value) return
    const valid = await assignFormRef.value.validate().catch(() => false)
    if (!valid) return

    try {
      await assignTask({
        taskId: assignForm.value.taskId!,
        assigneeId: assignForm.value.assigneeId!,
        remark: assignForm.value.remark,
      } as TaskAssignRequest)
      ElMessage.success('派单成功')
      assignDialogVisible.value = false
      onSuccess()
    } catch (error) {
      console.error('派单失败', error)
    }
  }

  return {
    assignDialogVisible, assignFormRef, assignForm, assignRules,
    assignableUsers, userNameMap, userRoleLabelMap,
    fetchAssignableUsers, getAssigneeName, getAssigneeRoleLabel,
    openAssignDialog, submitAssign,
  }
}

// ======================== 创建 ========================

export interface CreateFormModel {
  batchId: number | null
  taskName: string
  taskType: string
  priority: number
  planTime: string
}

export function useTaskCreate(onSuccess: () => void) {
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

  function openCreateDialog() {
    createForm.value = { batchId: null, taskName: '', taskType: '', priority: 2, planTime: '' }
    createDialogVisible.value = true
  }

  async function submitCreate() {
    if (!createFormRef.value) return
    const valid = await createFormRef.value.validate().catch(() => false)
    if (!valid) return

    try {
      await createTask(createForm.value)
      ElMessage.success('创建成功')
      createDialogVisible.value = false
      onSuccess()
    } catch (error) {
      console.error('创建任务失败', error)
    }
  }

  return {
    createDialogVisible, createFormRef, createForm, createRules,
    openCreateDialog, submitCreate,
  }
}
