import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import router from '@/router'
import type { LoginBody, LoginData, SysUser } from '@/types/entity'
import { resolveUserRoles } from '@/utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<SysUser | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const roles = ref<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'))

  const setToken = (t: string) => {
    token.value = t
    localStorage.setItem('token', t)
  }

  const setUser = (u: SysUser | null) => {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  const setRoles = (r: string[]) => {
    roles.value = r
    localStorage.setItem('roles', JSON.stringify(r))
  }

  const syncRoles = (rawRoles?: unknown, currentUser?: SysUser | null) => {
    const normalizedRoles = resolveUserRoles(rawRoles, currentUser ?? user.value)
    setRoles(normalizedRoles)
  }

  const login = async (form: LoginBody) => {
    const data = await http.post('/login', form) as LoginData
    setToken(data.token)
    setUser(data.user || null)
    syncRoles(data.roles, data.user || null)
  }

  const logout = () => {
    token.value = ''
    user.value = null
    roles.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('roles')
    router.replace('/login')
  }

  const setAuth = (data: Partial<LoginData> | null) => {
    if (data?.token) setToken(data.token)
    if (data?.user) setUser(data.user)
    syncRoles(data?.roles, data?.user || user.value)
  }

  if (token.value && roles.value.length === 0) {
    syncRoles(roles.value, user.value)
  }

  return { token, user, roles, setToken, setUser, setRoles, setAuth, login, logout, syncRoles }
})
