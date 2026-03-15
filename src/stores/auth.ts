import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import router from '@/router'
import type { LoginBody, LoginData, SysUser } from '@/types/entity'
import { resolveUserRoles } from '@/utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const user = ref<SysUser | null>(null)
  const roles = ref<string[]>([])

  const syncRoles = (rawRoles?: unknown, currentUser?: SysUser | null) => {
    roles.value = resolveUserRoles(rawRoles, currentUser ?? user.value)
  }

  const login = async (form: LoginBody) => {
    const data = await http.post('/login', form) as LoginData
    token.value = data.token
    user.value = data.user || null
    syncRoles(data.roles, data.user || null)
  }

  const logout = () => {
    token.value = ''
    user.value = null
    roles.value = []
    router.replace('/login')
  }

  const setAuth = (data: Partial<LoginData> | null) => {
    if (data?.token) token.value = data.token
    if (data?.user) user.value = data.user
    syncRoles(data?.roles, data?.user || user.value)
  }

  if (token.value && roles.value.length === 0) {
    syncRoles(roles.value, user.value)
  }

  return { token, user, roles, setAuth, login, logout, syncRoles }
}, {
  persist: {
    pick: ['token', 'user', 'roles'],
  },
})
