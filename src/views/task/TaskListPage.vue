<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import { listTask, type ListTaskParams } from '@/api/modules/task'
import type { MpPage } from '@/types/api'
import type { AgriTask } from '@/types/entity'
import { TASK_STATUS_MAP } from '@/constants/task'
import PageState from '@/components/page/PageState.vue'
import { usePageState } from '@/composables/usePageState'

interface TaskFilterForm {
  taskName: string
  statusV2: string
  assigneeId: string
}

const { loading, errorMessage, start, finish, fail } = usePageState()

const formRef = ref<FormInstance>()
const filterForm = reactive<TaskFilterForm>({
  taskName: '',
  statusV2: '',
  assigneeId: '',
})

const pager = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<AgriTask[]>([])

const rules: FormRules<TaskFilterForm> = {
  taskName: [{ max: 40, message: '任务名最多 40 个字符', trigger: 'blur' }],
  assigneeId: [
    {
      validator: (_, value: string, callback) => {
        if (!value) {
          callback()
          return
        }
        if (/^\d+$/.test(value)) {
          callback()
          return
        }
        callback(new Error('负责人ID必须为数字'))
      },
      trigger: 'blur',
    },
  ],
}

const isEmpty = computed(() => tableData.value.length === 0)

function buildParams(): ListTaskParams {
  return {
    pageNum: pager.pageNum,
    pageSize: pager.pageSize,
    taskName: filterForm.taskName || undefined,
    statusV2: filterForm.statusV2 || undefined,
    assigneeId: filterForm.assigneeId ? Number(filterForm.assigneeId) : undefined,
  }
}

async function fetchTasks(): Promise<void> {
  start()
  try {
    const pageData: MpPage<AgriTask> = await listTask(buildParams())
    tableData.value = pageData.records ?? []
    pager.total = Number(pageData.total ?? 0)
    finish()
  } catch (error) {
    fail(error)
  }
}

async function handleSearch(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  pager.pageNum = 1
  await fetchTasks()
}

async function handleReset(): Promise<void> {
  formRef.value?.resetFields()
  pager.pageNum = 1
  await fetchTasks()
}

async function handlePageChange(pageNum: number): Promise<void> {
  pager.pageNum = pageNum
  await fetchTasks()
}

async function handleSizeChange(pageSize: number): Promise<void> {
  pager.pageSize = pageSize
  pager.pageNum = 1
  await fetchTasks()
}

onMounted(() => {
  void fetchTasks()
})
</script>

<template>
  <div class="page">
    <div class="page__header">
      <h2>任务列表</h2>
      <p>对接 `/task/list`，支持任务筛选与分页查询。</p>
    </div>

    <el-card class="filter-card">
      <el-form ref="formRef" :model="filterForm" :rules="rules" inline>
        <el-form-item label="任务名" prop="taskName">
          <el-input v-model="filterForm.taskName" clearable placeholder="输入任务名" />
        </el-form-item>
        <el-form-item label="状态" prop="statusV2">
          <el-select v-model="filterForm.statusV2" placeholder="全部状态" clearable style="width: 150px">
            <el-option
              v-for="(item, key) in TASK_STATUS_MAP"
              :key="key"
              :label="item.text"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人ID" prop="assigneeId">
          <el-input v-model="filterForm.assigneeId" clearable placeholder="例如 3" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PageState
      :loading="loading"
      :error-message="errorMessage"
      :empty="isEmpty"
      empty-description="暂无任务数据"
      @retry="fetchTasks"
    >
      <el-card>
        <el-table :data="tableData" border stripe>
          <el-table-column prop="taskId" label="任务ID" width="100" />
          <el-table-column prop="taskName" label="任务名" min-width="180" />
          <el-table-column prop="taskType" label="任务类型" width="120" />
          <el-table-column prop="priority" label="优先级" width="100" />
          <el-table-column prop="assigneeName" label="负责人" width="120" />
          <el-table-column prop="planTime" label="计划时间" min-width="170" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="TASK_STATUS_MAP[row.statusV2]?.type ?? 'info'">
                {{ TASK_STATUS_MAP[row.statusV2]?.text ?? row.statusV2 }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :total="pager.total"
            :current-page="pager.pageNum"
            :page-size="pager.pageSize"
            :page-sizes="[10, 20, 50]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </el-card>
    </PageState>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.page__header h2 {
  margin: 0;
  color: #253d2f;
  font-size: 24px;
}

.page__header p {
  margin: 6px 0 0;
  color: var(--agri-text-muted);
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 12px;
}

.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
