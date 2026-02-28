<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'

import { login } from '@/api/modules'
import type { LoginBody } from '@/api/types/models'
import { usePageState } from '@/composables/usePageState'
import { MENU_ACCESS } from '@/constants/permission'
import { useAuthStore } from '@/stores/auth'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'

interface LoginForm {
  username: string
  password: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { loading, errorMessage, start, finish, fail } = usePageState()

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
  <div class="login-page">
    <el-card class="login-card">
      <div class="login-card__header">
        <h2>农业系统登录</h2>
        <p>使用后端账户登录并开始接口联调。</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>

        <el-alert
          v-if="errorMessage"
          title="登录失败"
          :description="errorMessage"
          type="error"
          :closable="false"
          show-icon
          role="alert"
          class="login-card__error"
        />

        <el-empty v-if="isApiBaseEmpty" description="未配置 VITE_API_BASE_URL，当前将请求同源地址。" :image-size="80" />

        <el-button type="primary" native-type="submit" class="login-card__submit" :loading="loading">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(151, 195, 133, 0.26), transparent 56%),
    radial-gradient(circle at bottom left, rgba(117, 154, 94, 0.2), transparent 46%);
}

.login-card {
  width: min(430px, 100%);
  border-radius: 16px;
  border: 1px solid var(--agri-border);
}

.login-card__header {
  margin-bottom: 10px;
}

.login-card__header h2 {
  margin: 0;
  color: #213b2a;
  font-size: 24px;
}

.login-card__header p {
  margin: 8px 0 0;
  color: var(--agri-text-muted);
  font-size: 14px;
}

.login-card__error {
  margin-bottom: 14px;
}

.login-card__submit {
  width: 100%;
  margin-top: 8px;
}
</style>
