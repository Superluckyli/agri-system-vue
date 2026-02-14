<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import { listSystemUser, type ListSystemUserParams } from '@/api/modules/system'
import type { MpPage } from '@/api/types/http'
import type { SysUser } from '@/api/types/models'
import PageState from '@/components/page/PageState.vue'
import { usePageState } from '@/composables/usePageState'

interface UserFilterForm {
  username: string
  realName: string
  status: '' | number
}

const { loading, errorMessage, start, finish, fail } = usePageState()

const formRef = ref<FormInstance>()
const filterForm = reactive<UserFilterForm>({
  username: '',
  realName: '',
  status: '',
})

const pager = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<SysUser[]>([])

const rules: FormRules<UserFilterForm> = {
  username: [{ max: 32, message: '用户名最多 32 个字符', trigger: 'blur' }],
  realName: [{ max: 32, message: '姓名最多 32 个字符', trigger: 'blur' }],
}

const isEmpty = computed(() => tableData.value.length === 0)

function statusLabel(status: number | undefined): string {
  if (status === 1) {
    return '启用'
  }

  if (status === 0) {
    return '禁用'
  }

  return '未知'
}

function statusType(status: number | undefined): 'success' | 'danger' | 'info' {
  if (status === 1) {
    return 'success'
  }

  if (status === 0) {
    return 'danger'
  }

  return 'info'
}

function buildParams(): ListSystemUserParams {
  return {
    pageNum: pager.pageNum,
    pageSize: pager.pageSize,
    username: filterForm.username || undefined,
    realName: filterForm.realName || undefined,
    status: filterForm.status === '' ? undefined : filterForm.status,
  }
}

async function fetchUsers(): Promise<void> {
  start()
  try {
    const pageData: MpPage<SysUser> = await listSystemUser(buildParams())
    tableData.value = pageData.records ?? []
    pager.total = Number(pageData.total ?? 0)
    finish()
  } catch (error) {
    fail(error)
  }
}

async function handleSearch(): Promise<void> {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  pager.pageNum = 1
  await fetchUsers()
}

async function handleReset(): Promise<void> {
  formRef.value?.resetFields()
  pager.pageNum = 1
  await fetchUsers()
}

async function handlePageChange(pageNum: number): Promise<void> {
  pager.pageNum = pageNum
  await fetchUsers()
}

async function handleSizeChange(pageSize: number): Promise<void> {
  pager.pageSize = pageSize
  pager.pageNum = 1
  await fetchUsers()
}

onMounted(() => {
  void fetchUsers()
})
</script>

<template>
  <div class="page">
    <div class="page__header">
      <h2>用户列表</h2>
      <p>对接 `/system/user/list`，支持筛选、分页与状态显示。</p>
    </div>

    <el-card class="filter-card">
      <el-form ref="formRef" :model="filterForm" :rules="rules" inline>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="filterForm.username" placeholder="输入用户名" clearable />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="filterForm.realName" placeholder="输入姓名" clearable />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="filterForm.status" placeholder="全部状态" style="width: 160px">
            <el-option label="全部" value="" />
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
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
      empty-description="暂无用户数据"
      @retry="fetchUsers"
    >
      <el-card>
        <el-table :data="tableData" border stripe>
          <el-table-column prop="userId" label="用户ID" width="100" />
          <el-table-column prop="username" label="用户名" min-width="140" />
          <el-table-column prop="realName" label="姓名" min-width="140" />
          <el-table-column prop="deptName" label="部门" min-width="140" />
          <el-table-column prop="phone" label="手机号" min-width="150" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="180" />
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
