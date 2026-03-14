<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'

import {
  createSupplier,
  listSupplier,
  removeSupplierByIds,
  updateSupplier,
} from '@/api/modules/supplier'
import { SUPPLIER_STATUS_MAP } from '@/constants/task'
import type { SupplierInfo } from '@/types/entity'

interface QueryParams {
  pageNum: number
  pageSize: number
  name: string
}

interface SupplierFormModel {
  id?: number
  name: string
  contactName: string
  phone: string
  address: string
  status: number
  remark: string
}

const loading = ref(false)
const loadError = ref('')
const list = ref<SupplierInfo[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  name: '',
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<SupplierFormModel>({
  id: undefined,
  name: '',
  contactName: '',
  phone: '',
  address: '',
  status: 1,
  remark: '',
})

const phoneValidator = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (value && !/^1\d{10}$/.test(value)) {
    callback(new Error('请输入正确的11位手机号'))
  } else {
    callback()
  }
}

const rules: FormRules<SupplierFormModel> = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  phone: [{ validator: phoneValidator, trigger: 'blur' }],
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listSupplier({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      name: queryParams.name || undefined,
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载供应商列表失败'
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
  queryParams.name = ''
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
  form.id = undefined
  form.name = ''
  form.contactName = ''
  form.phone = ''
  form.address = ''
  form.status = 1
  form.remark = ''
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增供应商'
  dialogVisible.value = true
}

const handleEdit = (row: SupplierInfo) => {
  resetForm()
  dialogTitle.value = '编辑供应商'
  form.id = row.id
  form.name = row.name || ''
  form.contactName = row.contactName || ''
  form.phone = row.phone || ''
  form.address = row.address || ''
  form.status = row.status ?? 1
  form.remark = row.remark || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: SupplierInfo = {
    id: form.id,
    name: form.name.trim(),
    contactName: form.contactName.trim() || undefined,
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
    status: form.status,
    remark: form.remark.trim() || undefined,
  }

  try {
    if (payload.id) {
      await updateSupplier(payload)
      ElMessage.success('更新供应商成功')
    } else {
      delete payload.id
      await createSupplier(payload)
      ElMessage.success('新增供应商成功')
    }
    dialogVisible.value = false
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交失败'
    ElMessage.error(message)
  }
}

const handleDelete = (row: SupplierInfo) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认删除供应商「${row.name || row.id}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeSupplierByIds({ ids: row.id as number })
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
          <div class="title">供应商管理</div>
          <div class="subtitle">维护供应商信息及合作状态</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="100px">
        <el-form-item label="供应商名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入供应商名称"
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
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增供应商</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="ID" prop="id" align="center" width="80" />
        <el-table-column label="名称" prop="name" min-width="150" />
        <el-table-column label="联系人" prop="contactName" width="120" align="center" />
        <el-table-column label="电话" prop="phone" width="140" align="center" />
        <el-table-column label="地址" prop="address" min-width="180" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.status != null && SUPPLIER_STATUS_MAP[scope.row.status as number]"
              :type="SUPPLIER_STATUS_MAP[scope.row.status as number]?.type"
            >
              {{ SUPPLIER_STATUS_MAP[scope.row.status as number]?.text }}
            </el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无供应商数据" />
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：XX农资有限公司" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactName">
          <el-input v-model="form.contactName" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入11位手机号" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option
              v-for="(val, key) in SUPPLIER_STATUS_MAP"
              :key="key"
              :label="val.text"
              :value="Number(key)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
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
