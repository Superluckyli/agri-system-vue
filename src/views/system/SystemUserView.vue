<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete, UserFilled } from '@element-plus/icons-vue'

import {
  listSystemUser,
  createSystemUser,
  updateSystemUser,
  removeSystemUserByUserIds,
  getUserRoles,
  assignUserRoles,
  listAllRoles
} from '@/api/modules/system'
import type { SysUser, SysRole } from '@/types/entity'

// ==== 角色颜色映射 ====
const ROLE_TAG_TYPE: Record<string, string> = {
  ADMIN: 'danger',
  FARM_OWNER: 'success',
  MANAGER: 'warning',
  FARMER: '',
  WORKER: 'info',
  DEMO: 'info',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '超级管理员',
  FARM_OWNER: '农场主',
  MANAGER: '管理员',
  FARMER: '农户',
  WORKER: '工人',
  DEMO: '演示账号',
}

function getRoleTagType(roleKey: string): string {
  return ROLE_TAG_TYPE[roleKey] || 'info'
}

function getRoleLabel(roleKey: string): string {
  return ROLE_LABEL[roleKey] || roleKey
}

// ==== 查询与列表数据 ====
const loading = ref(false)
const list = ref<SysUser[]>([])
const total = ref(0)
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  username: '',
  realName: ''
})

const getList = async () => {
  loading.value = true
  try {
    const res = await listSystemUser(queryParams.value)
    list.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取用户列表失败', error)
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
    username: '',
    realName: ''
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
const form = ref<SysUser>({
  username: '',
  password: '',
  realName: '',
  phone: '',
  deptName: '',
  status: 1
})

const rules = ref<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
})

const resetForm = () => {
  form.value = {
    userId: undefined,
    username: '',
    password: '',
    realName: '',
    phone: '',
    deptName: '',
    status: 1
  }
  formRef.value?.resetFields()
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增用户'
  rules.value.password = [{ required: true, message: '请输入密码', trigger: 'blur' }]
  dialogVisible.value = true
}

const handleUpdate = (row: SysUser) => {
  resetForm()
  dialogTitle.value = '修改用户'
  rules.value.password = []
  form.value = { ...row }
  form.value.password = ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (form.value.userId) {
          if (!form.value.password) {
            delete form.value.password
          }
          await updateSystemUser(form.value)
          ElMessage.success('修改成功')
        } else {
          await createSystemUser(form.value)
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

const handleDelete = (row: SysUser) => {
  const userIds = row.userId
  ElMessageBox.confirm(`是否确认删除用户 ID 为"${userIds}"的数据项？`, '二次确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await removeSystemUserByUserIds({ userIds: userIds as number })
      ElMessage.success('删除成功')
      if (list.value.length === 1 && queryParams.value.pageNum > 1) {
        queryParams.value.pageNum -= 1
      }
      getList()
    } catch (e) {
      console.error('删除处理', e)
    }
  }).catch(() => {})
}

// ==== 角色分配 ====
const allRoles = ref<SysRole[]>([])
const roleDialogVisible = ref(false)
const roleSubmitLoading = ref(false)
const selectedRoleIds = ref<number[]>([])
const currentRoleUserId = ref<number | null>(null)
const currentRoleUsername = ref('')

const handleAssignRole = async (row: SysUser) => {
  currentRoleUserId.value = row.userId!
  currentRoleUsername.value = row.realName || row.username || ''
  try {
    selectedRoleIds.value = await getUserRoles(row.userId!)
    roleDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取用户角色失败')
  }
}

const submitRoleAssign = async () => {
  if (currentRoleUserId.value == null) return
  roleSubmitLoading.value = true
  try {
    await assignUserRoles(currentRoleUserId.value, selectedRoleIds.value)
    ElMessage.success('角色分配成功')
    roleDialogVisible.value = false
    getList()
  } catch (error) {
    ElMessage.error('角色分配失败')
  } finally {
    roleSubmitLoading.value = false
  }
}

onMounted(async () => {
  getList()
  try {
    allRoles.value = await listAllRoles()
  } catch (_) {
    // 角色列表加载失败不阻塞页面
  }
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- 查询表单 -->
      <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="68px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable style="width: 200px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="queryParams.realName" placeholder="请输入真实姓名" clearable style="width: 200px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="primary" plain :icon="Plus" @click="handleAdd">新增用户</el-button>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="list" style="width: 100%; margin-top: 15px;">
        <el-table-column label="用户ID" align="center" prop="userId" width="80" />
        <el-table-column label="用户名" align="center" prop="username" />
        <el-table-column label="真实姓名" align="center" prop="realName" />
        <el-table-column label="手机号" align="center" prop="phone" width="120" />
        <el-table-column label="部门" align="center" prop="deptName" />
        <el-table-column label="角色" align="center" min-width="140">
          <template #default="{ row }">
            <template v-if="row.roleNames?.length">
              <el-tag
                v-for="role in row.roleNames"
                :key="role"
                :type="getRoleTagType(role)"
                size="small"
                style="margin: 2px"
              >
                {{ getRoleLabel(role) }}
              </el-tag>
            </template>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" key="status" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="160" />
        <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button link type="warning" :icon="UserFilled" @click="handleAssignRole(scope.row)">角色</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无用户数据" />
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

    <!-- 添加或修改用户配置对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入2-20位用户名" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item v-if="dialogTitle === '新增用户'" label="密码" prop="password">
          <el-input v-model="form.password" placeholder="请输入密码" type="password" show-password />
        </el-form-item>
        <el-form-item v-if="dialogTitle === '修改用户'" label="密码" prop="password">
          <el-input v-model="form.password" placeholder="为空则不修改密码" type="password" show-password />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="部门" prop="deptName">
          <el-input v-model="form.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 角色分配对话框 -->
    <el-dialog
      :title="`分配角色 - ${currentRoleUsername}`"
      v-model="roleDialogVisible"
      width="480px"
      append-to-body
      destroy-on-close
    >
      <el-checkbox-group v-model="selectedRoleIds">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <el-checkbox
            v-for="role in allRoles"
            :key="role.roleId"
            :value="role.roleId"
          >
            <el-tag :type="getRoleTagType(role.roleKey || '')" size="small" style="margin-right: 8px">
              {{ role.roleKey }}
            </el-tag>
            {{ role.roleName }}
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="roleSubmitLoading" @click="submitRoleAssign">确 定</el-button>
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
