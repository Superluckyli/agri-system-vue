<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Postcard, Iphone } from '@element-plus/icons-vue'

import { register } from '@/api/modules'
import type { SysUser } from '@/types/entity'
import { usePageState } from '@/composables/usePageState'
import AuthLayout from '@/layouts/AuthLayout.vue'

interface RegisterForm {
  username: string
  realName: string
  phone: string
  password: string
  confirmPassword: string
}

const router = useRouter()
const route = useRoute()
const { loading, errorMessage, start, finish, fail } = usePageState()

const loginTarget = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect ? { path: '/login', query: { redirect } } : { path: '/login' }
})

const formRef = ref<FormInstance>()
const form = reactive<RegisterForm>({
  username: '',
  realName: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const validateConfirmPassword = (
  _rule: unknown,
  value: string,
  callback: (error?: string | Error) => void,
) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules<RegisterForm> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度应在 3 到 32 位之间', trigger: 'blur' },
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { max: 32, message: '真实姓名长度不能超过 32 位', trigger: 'blur' },
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度应在 6 到 32 位之间', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

async function handleSubmit(): Promise<void> {
  if (loading.value || !formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  start()
  try {
    const payload: SysUser = {
      username: form.username.trim(),
      password: form.password,
      realName: form.realName.trim(),
      phone: form.phone.trim() || undefined,
    }

    await register(payload)
    await ElMessageBox.alert(
      '注册成功！系统已为您分配默认角色（工人），管理员可为您调整权限。',
      '注册完成',
      { confirmButtonText: '前往登录', type: 'success' },
    )
    await router.replace(loginTarget.value)
    finish()
  } catch (error) {
    fail(error)
  }
}
</script>

<template>
  <AuthLayout title="创建账户" subtitle="加入智慧农事管理平台，开始管理您的农业生产。">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable size="large" />
      </el-form-item>

      <el-form-item label="真实姓名" prop="realName">
        <el-input v-model="form.realName" placeholder="请输入真实姓名" :prefix-icon="Postcard" clearable size="large" />
      </el-form-item>

      <el-form-item label="手机号（可选）" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号" :prefix-icon="Iphone" clearable size="large" />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          placeholder="请输入密码"
          :prefix-icon="Lock"
          size="large"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入密码"
          :prefix-icon="Lock"
          size="large"
        />
      </el-form-item>

      <el-alert
        v-if="errorMessage"
        title="注册失败"
        :description="errorMessage"
        type="error"
        :closable="false"
        show-icon
        class="auth-error"
      />

      <el-button type="primary" native-type="submit" class="auth-submit" :loading="loading" size="large">
        立即注册
      </el-button>

      <div class="auth-footer">
        已有账户？<router-link :to="loginTarget">去登录</router-link>
      </div>
    </el-form>
  </AuthLayout>
</template>

<style scoped>
.auth-error {
  margin-bottom: 14px;
}

.auth-submit {
  width: 100%;
  margin-top: 8px;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--agri-text-muted);
}

.auth-footer a {
  color: var(--agri-primary, #2f8a4c);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.auth-footer a:hover {
  opacity: 0.8;
}
</style>
