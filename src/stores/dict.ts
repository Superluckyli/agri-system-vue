import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSystemRoleAll } from '@/api/modules/system'
import { getCropVarietyAll } from '@/api/modules/crop'
import type { SysRole, BaseCropVariety } from '@/types/entity'

const CACHE_TTL = 10 * 60 * 1000 // 10分钟

interface CacheEntry<T> {
  data: T[]
  fetchedAt: number
}

function isStale(entry: CacheEntry<unknown> | null): boolean {
  if (!entry) return true
  return Date.now() - entry.fetchedAt > CACHE_TTL
}

/**
 * 全局字典缓存 Store
 * 缓存角色、品种等低频变更引用数据，避免重复请求
 */
export const useDictStore = defineStore('dict', () => {
  const rolesCache = ref<CacheEntry<SysRole> | null>(null)
  const varietiesCache = ref<CacheEntry<BaseCropVariety> | null>(null)
  const loading = ref(false)

  async function getRoles(forceRefresh = false): Promise<SysRole[]> {
    if (!forceRefresh && !isStale(rolesCache.value)) {
      return rolesCache.value!.data
    }
    loading.value = true
    try {
      const data = await getSystemRoleAll()
      rolesCache.value = { data, fetchedAt: Date.now() }
      return data
    } finally {
      loading.value = false
    }
  }

  async function getVarieties(forceRefresh = false): Promise<BaseCropVariety[]> {
    if (!forceRefresh && !isStale(varietiesCache.value)) {
      return varietiesCache.value!.data
    }
    loading.value = true
    try {
      const data = await getCropVarietyAll()
      varietiesCache.value = { data, fetchedAt: Date.now() }
      return data
    } finally {
      loading.value = false
    }
  }

  function invalidateAll() {
    rolesCache.value = null
    varietiesCache.value = null
  }

  return { loading, getRoles, getVarieties, invalidateAll }
})
