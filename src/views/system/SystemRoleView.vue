<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'

import {
  listSystemRole,
  createSystemRole,
  updateSystemRole,
  removeSystemRoleByRoleIds
} from '@/api/modules/system'
import type { SysRole } from '@/types/entity'

// ==== 查询与列表数据 ====
const loading = ref(false)
const list = ref<SysRole[]>([])
const total = ref(0)
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  roleName: ''
})

const getList = async () => {
  loading.value = true
  try {
    const res = await listSystemRole(queryParams.value)
    list.value = res.items || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取角色列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.value.pageNum = 1
  getList()
}

const resetQuery = () => {
  queryParams.value = {
    pageNum: 1,
    pageSize: 10,
    roleName: ''
  }
  handleQuery()
}

const handleSizeChange = (val: number) => {
  queryParams.value.pageSize = val
  getList()
}

const handleCurrentChange = (val: number) => {
  queryParams.value.pageNum = val
  getList()
}

// ==== 表单与操作 ====
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()
const form = ref<SysRole>({
  roleName: '',
  roleKey: ''
})

const rules = ref<FormRules>({
  roleName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  roleKey: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '角色标识建议使用大写字母与下划线，例如：SUPER_ADMIN', trigger: 'blur' }
  ]
})

const resetForm = () => {
  form.value = {
    roleId: undefined,
    roleName: '',
    roleKey: ''
  }
  formRef.value?.resetFields()
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增角色'
  dialogVisible.value = true
}

const handleUpdate = (row: SysRole) => {
  resetForm()
  dialogTitle.value = '修改角色'
  form.value = { ...row }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (form.value.roleId) {
          await updateSystemRole(form.value)
          ElMessage.success('修改成功')
        } else {
          await createSystemRole(form.value)
          ElMessage.success('新增成功')
        }
        dialogVisible.value = false
        getList()
      } catch (error) {
        console.error('提交失败', error)
      }
    }
  })
}

const handleDelete = (row: SysRole) => {
  const roleIds = row.roleId
  ElMessageBox.confirm(`是否确认删除角色名称 为"${row.roleName}"的数据项？`, '系统提示', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await removeSystemRoleByRoleIds({ roleIds: roleIds as number })
      ElMessage.success('删除成功')
      // 防越界当前页减一处理
      if (list.value.length === 1 && queryParams.value.pageNum > 1) {
        queryParams.value.pageNum -= 1
      }
      getList()
    } catch (err: unknown) {
      const e = err as { message?: string; msg?: string }
      const msg = e?.message || e?.msg || ''
      if (msg.includes('绑定') || msg.includes('禁止')) {
        ElNotification({
          title: '删除受限',
          message: '该角色仍被用户绑定，请先解绑后再删除',
          type: 'warning',
          duration: 5000
        })
      }
      console.error('角色删除失败处理：', err)
    }
  }).catch(() => {})
}

onMounted(() => {
  getList()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- 查询表单 -->
      <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="68px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增角色</el-button>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="list" style="width: 100%; margin-top: 15px;">
        <el-table-column label="角色ID" align="center" prop="roleId" width="80" />
        <el-table-column label="角色名称" align="center" prop="roleName" />
        <el-table-column label="角色标识" align="center" prop="roleKey">
          <template #default="scope">
            <el-tag type="info" disable-transitions>{{ scope.row.roleKey }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" width="180" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无角色数据" />
        </template>
      </el-table>

      <!-- 分页组件 -->
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

    <!-- 添加或修改角色配置对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色标识" prop="roleKey">
          <el-input v-model="form.roleKey" placeholder="请输入角色标识区分" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
}
.mb8 {
  margin-bottom: 8px;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
