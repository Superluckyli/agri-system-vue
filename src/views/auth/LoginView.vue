<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

import { login } from '@/api/modules'
import type { LoginBody } from '@/types/entity'
import { usePageState } from '@/composables/usePageState'
import { MENU_ACCESS } from '@/constants/permission'
import { useAuthStore } from '@/stores/auth'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'
import AuthLayout from '@/layouts/AuthLayout.vue'

interface LoginForm {
  username: string
  password: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { loading, errorMessage, start, finish, fail } = usePageState()

const registerTarget = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect ? { path: '/register', query: { redirect } } : { path: '/register' }
})

const formRef = ref<FormInstance>()
const form = reactive<LoginForm>({
  username: 'admin',
  password: '123456',
})

const rules: FormRules<LoginForm> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度应在 3 到 32 位之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度应在 6 到 32 位之间', trigger: 'blur' },
  ],
}

const isApiBaseEmpty = !import.meta.env.VITE_API_BASE_URL

async function handleSubmit(): Promise<void> {
  if (loading.value) {
    return
  }

  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  start()
  try {
    const payload: LoginBody = {
      username: form.username.trim(),
      password: form.password,
    }

    const loginResult = await login(payload)
    authStore.setAuth(loginResult)

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const roles = resolveUserRoles(authStore.roles, authStore.user)
    const defaultPath = hasAnyRole(roles, MENU_ACCESS.dashboard)
      ? '/dashboard'
      : hasAnyRole(roles, MENU_ACCESS.myTask)
        ? '/task/my'
        : '/403'
    const nextPath = redirect || defaultPath
    await router.replace(nextPath)
    finish()
  } catch (error) {
    fail(error)
  }
}
</script>

<template>
  <AuthLayout title="欢迎登录" subtitle="使用您的账户登录农事管理平台。">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable size="large" />
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

      <el-alert
        v-if="errorMessage"
        title="登录失败"
        :description="errorMessage"
        type="error"
        :closable="false"
        show-icon
        role="alert"
        class="auth-error"
      />

      <el-empty v-if="isApiBaseEmpty" description="未配置 VITE_API_BASE_URL，当前将请求同源地址。" :image-size="80" />

      <el-button type="primary" native-type="submit" class="auth-submit" :loading="loading" size="large">
        登录
      </el-button>

      <div class="auth-footer">
        还没有账户？<router-link :to="registerTarget">立即注册</router-link>
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
