<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'

import {
  createCropFarmland,
  listCropFarmland,
  removeCropFarmlandByIds,
  updateCropFarmland,
} from '@/api/modules/crop'
import { FARMLAND_STATUS_MAP } from '@/constants/task'
import type { AgriFarmland } from '@/types/entity'

interface QueryParams {
  pageNum: number
  pageSize: number
  name: string
}

interface FarmlandFormModel {
  id?: number
  code: string
  name: string
  area: number | null
  location: string
  status: number
  cropAdaptNote: string
}

const loading = ref(false)
const loadError = ref('')
const list = ref<AgriFarmland[]>([])
const total = ref(0)

const queryParams = reactive<QueryParams>({
  pageNum: 1,
  pageSize: 10,
  name: '',
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<FarmlandFormModel>({
  id: undefined,
  code: '',
  name: '',
  area: null,
  location: '',
  status: 1,
  cropAdaptNote: '',
})

const rules: FormRules<FarmlandFormModel> = {
  name: [{ required: true, message: '请输入农田名称', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'change' }],
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCropFarmland({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      name: queryParams.name || undefined,
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载农田列表失败'
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
  form.code = ''
  form.name = ''
  form.area = null
  form.location = ''
  form.status = 1
  form.cropAdaptNote = ''
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增农田'
  dialogVisible.value = true
}

const handleEdit = (row: AgriFarmland) => {
  resetForm()
  dialogTitle.value = '编辑农田'
  form.id = row.id
  form.code = row.code || ''
  form.name = row.name || ''
  form.area = row.area ?? null
  form.location = row.location || ''
  form.status = row.status ?? 1
  form.cropAdaptNote = row.cropAdaptNote || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: AgriFarmland = {
    id: form.id,
    code: form.code.trim() || undefined,
    name: form.name.trim(),
    area: Number(form.area),
    location: form.location.trim() || undefined,
    status: form.status,
    cropAdaptNote: form.cropAdaptNote.trim() || undefined,
  }

  try {
    if (payload.id) {
      await updateCropFarmland(payload)
      ElMessage.success('更新农田成功')
    } else {
      delete payload.id
      await createCropFarmland(payload)
      ElMessage.success('新增农田成功')
    }
    dialogVisible.value = false
    void fetchList()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交失败'
    ElMessage.error(message)
  }
}

const handleDelete = (row: AgriFarmland) => {
  if (!row.id) return
  ElMessageBox.confirm(`确认删除农田「${row.name || row.id}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeCropFarmlandByIds({ ids: row.id as number })
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
          <div class="title">农田管理</div>
          <div class="subtitle">维护农田地块信息、状态及作物适配</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="68px">
        <el-form-item label="农田名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入农田名称"
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
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增农田</el-button>
        </el-col>
      </el-row>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchList">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="ID" prop="id" align="center" width="80" />
        <el-table-column label="编号" prop="code" align="center" width="120" />
        <el-table-column label="名称" prop="name" min-width="140" />
        <el-table-column label="面积(亩)" prop="area" align="center" width="100" />
        <el-table-column label="位置" prop="location" min-width="160" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag
              v-if="scope.row.status != null && FARMLAND_STATUS_MAP[scope.row.status as number]"
              :type="FARMLAND_STATUS_MAP[scope.row.status as number]?.type"
            >
              {{ FARMLAND_STATUS_MAP[scope.row.status as number]?.text }}
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
          <el-empty description="暂无农田数据" />
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
        <el-form-item label="编号" prop="code">
          <el-input v-model="form.code" placeholder="可选，如 F-001" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：东区1号田" />
        </el-form-item>
        <el-form-item label="面积(亩)" prop="area">
          <el-input-number v-model="form.area" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="form.location" placeholder="例如：农场东侧" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option
              v-for="(val, key) in FARMLAND_STATUS_MAP"
              :key="key"
              :label="val.text"
              :value="Number(key)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="作物适配" prop="cropAdaptNote">
          <el-input v-model="form.cropAdaptNote" type="textarea" :rows="3" placeholder="适合种植的作物及注意事项" />
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
