<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Check, Close, EditPen, Refresh, Search, View } from '@element-plus/icons-vue'

import { acceptTask, listTask, rejectTask } from '@/api/modules/task'
import type { AgriTask } from '@/types/entity'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP, TASK_STATUS_V2 } from '@/constants/task'
import { MENU_ACCESS, ROLE_TECHNICIAN, ROLE_WORKER } from '@/constants/permission'
import { useAuthStore } from '@/stores/auth'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'

const authStore = useAuthStore()
const router = useRouter()

const currentRoles = computed(() => resolveUserRoles(authStore.roles, authStore.user))
const canAcceptOrReject = computed(() =>
  currentRoles.value.includes(ROLE_TECHNICIAN) || currentRoles.value.includes(ROLE_WORKER),
)
const canVisitTaskLog = computed(() => hasAnyRole(currentRoles.value, MENU_ACCESS.taskLog))

const loading = ref(false)
const list = ref<AgriTask[]>([])
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  taskName: '',
  statusV2: undefined as string | undefined,
  assigneeId: authStore.user?.userId || '',
})

const drawerVisible = ref(false)
const currentDetail = ref<AgriTask | null>(null)

const rejectDialogVisible = ref(false)
const rejectFormRef = ref<FormInstance>()
const rejectForm = ref({
  taskId: undefined as number | undefined,
  reason: '',
})

const rejectRules = ref<FormRules>({
  reason: [{ required: true, message: '请输入拒单原因', trigger: 'blur' }],
})

const getList = async () => {
  if (!queryParams.value.assigneeId) {
    ElMessage.warning('未获取到当前用户ID，无法加载我的任务')
    return
  }

  loading.value = true
  try {
    const res = await listTask(queryParams.value)
    list.value = res.items || []
    total.value = Number(res.total || 0)
  } catch (error) {
    console.error('获取我的任务失败', error)
  } finally {
    loading.value = false
  }
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
    assigneeId: authStore.user?.userId || '',
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

const handleExecute = (row: AgriTask) => {
  if (!canVisitTaskLog.value) {
    ElMessage.warning('当前账号无执行日志页面权限')
    return
  }
  const taskId = Number(row.taskId)
  if (!Number.isFinite(taskId) || taskId <= 0) {
    ElMessage.warning('任务ID无效，无法进入执行页')
    return
  }
  void router.push({ path: '/task/log', query: { taskId: String(taskId) } })
}

const showExecuteButton = (row: AgriTask): boolean => {
  if (!canVisitTaskLog.value) return false
  return row.statusV2 === TASK_STATUS_V2.IN_PROGRESS
}

const handleAccept = (row: AgriTask) => {
  if (!canAcceptOrReject.value) {
    ElMessage.warning('当前角色不支持接单')
    return
  }

  if (row.statusV2 !== TASK_STATUS_V2.PENDING_ACCEPT) {
    ElMessage.warning('仅待接单状态可以执行接单')
    return
  }

  ElMessageBox.confirm(`确认接单任务「${row.taskName || row.taskId}」吗？`, '接单确认', {
    confirmButtonText: '确定接单',
    cancelButtonText: '取消',
    type: 'success',
  })
    .then(async () => {
      await acceptTask(row.taskId!)
      ElMessage.success('接单成功')
      void getList()
    })
    .catch(() => undefined)
}

const handleReject = (row: AgriTask) => {
  if (!canAcceptOrReject.value) {
    ElMessage.warning('当前角色不支持拒单')
    return
  }

  if (row.statusV2 !== TASK_STATUS_V2.PENDING_ACCEPT) {
    ElMessage.warning('仅待接单状态可以执行拒单')
    return
  }

  rejectForm.value.taskId = row.taskId
  rejectForm.value.reason = ''
  rejectDialogVisible.value = true
}

const submitReject = async () => {
  if (!rejectFormRef.value) return

  const valid = await rejectFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await rejectTask(rejectForm.value.taskId!, {
      taskId: rejectForm.value.taskId!,
      reason: rejectForm.value.reason,
    })
    ElMessage.success('已拒单')
    rejectDialogVisible.value = false
    void getList()
  } catch (error) {
    console.error('拒单失败', error)
  }
}

onMounted(() => {
  void getList()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <el-form :model="queryParams" inline label-width="80px">
        <el-form-item label="任务名称">
          <el-input
            v-model="queryParams.taskName"
            placeholder="请输入任务名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="queryParams.statusV2" placeholder="请选择状态" clearable style="width: 180px">
            <el-option v-for="(val, key) in TASK_STATUS_MAP" :key="key" :label="val.text" :value="key" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="!canAcceptOrReject"
        title="当前角色无接单/拒单权限，仅展示任务列表。"
        type="info"
        :closable="false"
        style="margin-bottom: 12px"
      />

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="任务ID" prop="taskId" width="90" align="center" />
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
          </template>
        </el-table-column>

        <el-table-column label="计划时间" prop="planTime" width="170" align="center" />

        <el-table-column label="操作" width="260" align="center">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleView(scope.row)">详情</el-button>
            <el-button v-if="showExecuteButton(scope.row)" link type="warning" :icon="EditPen" @click="handleExecute(scope.row)">
              执行
            </el-button>
            <template v-if="canAcceptOrReject && scope.row.statusV2 === TASK_STATUS_V2.PENDING_ACCEPT">
              <el-button link type="success" :icon="Check" @click="handleAccept(scope.row)">接单</el-button>
              <el-button link type="danger" :icon="Close" @click="handleReject(scope.row)">拒单</el-button>
            </template>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无任务数据" />
        </template>
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

    <el-dialog title="拒单" v-model="rejectDialogVisible" width="420px" append-to-body>
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-width="90px">
        <el-form-item label="拒单原因" prop="reason">
          <el-input v-model="rejectForm.reason" type="textarea" :rows="4" placeholder="请输入拒单原因" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitReject">确认拒单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-container {
  padding: 8px 16px;
}
</style>
