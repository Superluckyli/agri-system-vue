import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { LoginData, SysUser } from '@/api/types/models'

const TOKEN_KEY = 'agri-system-token'
const USER_KEY = 'agri-system-user'

function loadUserFromStorage(): SysUser | null {
  const rawUser = localStorage.getItem(USER_KEY)
  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as SysUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) ?? '')
  const user = ref<SysUser | null>(loadUserFromStorage())

  const isAuthenticated = computed(() => Boolean(token.value))

  function setToken(value: string): void {
    token.value = value
    if (value) {
      localStorage.setItem(TOKEN_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  function setUser(value: SysUser | null): void {
    user.value = value
    if (value) {
      localStorage.setItem(USER_KEY, JSON.stringify(value))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  function setAuth(payload: LoginData): void {
    setToken(payload.token)
    setUser(payload.user ?? null)
  }

  function logout(): void {
    setToken('')
    setUser(null)
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
  }
})
