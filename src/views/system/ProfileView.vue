<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { updateSystemUserProfile, updateSystemUserPassword } from '@/api/modules/system'
import type { PasswordChangeRequest } from '@/types/entity'

const authStore = useAuthStore()

// --- Profile Form ---
const profileFormRef = ref<FormInstance>()
const profileForm = reactive({
  realName: '',
  phone: '',
  deptName: '',
})
const profileLoading = ref(false)

const profileRules: FormRules = {
  realName: [{ max: 50, message: '姓名不超过50个字符', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

onMounted(() => {
  const user = authStore.user
  if (user) {
    profileForm.realName = user.realName || ''
    profileForm.phone = user.phone || ''
    profileForm.deptName = user.deptName || ''
  }
})

async function handleProfileSave() {
  const valid = await profileFormRef.value?.validate().catch(() => false)
  if (!valid) return

  profileLoading.value = true
  try {
    const updated = await updateSystemUserProfile({
      realName: profileForm.realName,
      phone: profileForm.phone,
      deptName: profileForm.deptName,
    })
    authStore.setUser({ ...authStore.user, ...updated })
    ElMessage.success('资料更新成功')
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '更新失败')
  } finally {
    profileLoading.value = false
  }
}

// --- Password Form ---
const passwordFormRef = ref<FormInstance>()
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordLoading = ref(false)

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function handlePasswordChange() {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    const req: PasswordChangeRequest = {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    }
    await updateSystemUserPassword(req)
    ElMessage.success('密码修改成功')
    passwordFormRef.value?.resetFields()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <h2>个人中心</h2>

    <el-card shadow="never" class="profile-card">
      <template #header>基本资料</template>
      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="80px"
        style="max-width: 480px"
      >
        <el-form-item label="用户名">
          <el-input :model-value="authStore.user?.username" disabled />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="profileForm.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="profileForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="部门" prop="deptName">
          <el-input v-model="profileForm.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="profileLoading" @click="handleProfileSave">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="profile-card">
      <template #header>修改密码</template>
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        style="max-width: 480px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="passwordLoading" @click="handlePasswordChange">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 20px;
}

.profile-card {
  margin-bottom: 20px;
}
</style>
