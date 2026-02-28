import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))
  const roles = ref<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'))

  const setToken = (t: string) => {
    token.value = t
    localStorage.setItem('token', t)
  }

  const setUser = (u: any) => {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  const setRoles = (r: string[]) => {
    roles.value = r
    localStorage.setItem('roles', JSON.stringify(r))
  }

  const login = async (form: any) => {
    const data: any = await http.post('/login', form)
    setToken(data.token)
    setUser(data.user)
    if (data.roles) {
      setRoles(data.roles)
    }
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

  const setAuth = (data: any) => {
    if (data?.token) setToken(data.token)
    if (data?.user) setUser(data.user)
    if (data?.roles) setRoles(data.roles)
  }

  return { token, user, roles, setToken, setUser, setRoles, setAuth, login, logout }
})
