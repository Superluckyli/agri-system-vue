import {
  ALL_ROLES,
  ROLE_ADMIN,
  ROLE_ALIAS_MAP,
  ROLE_FARMER,
  ROLE_FARM_OWNER,
  ROLE_WORKER,
  type AppRole,
} from '@/constants/permission'
import type { SysUser } from '@/api/types/models'

function normalizeRoleValue(value: unknown): AppRole | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toUpperCase()
  if (!normalized) {
    return null
  }

  return ROLE_ALIAS_MAP[normalized] || null
}

function extractRoleStringsFromUnknown(input: unknown): string[] {
  if (typeof input === 'string') {
    return input
      .split(/[,|;]/)
      .map((item) => item.trim())
      .filter((item) => !!item)
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const key = obj.roleKey ?? obj.roleName ?? obj.role ?? obj.key ?? obj.code ?? obj.name
          return typeof key === 'string' ? key : ''
        }
        return ''
      })
      .filter((item) => !!item)
  }

  return []
}

export function resolveUserRoles(rawRoles: unknown, user: SysUser | null | undefined): AppRole[] {
  const candidates = new Set<string>()

  extractRoleStringsFromUnknown(rawRoles).forEach((item) => candidates.add(item))

  if (user) {
    if (typeof (user as Record<string, unknown>).roleKey === 'string') {
      candidates.add(String((user as Record<string, unknown>).roleKey))
    }
    if (typeof (user as Record<string, unknown>).roleName === 'string') {
      candidates.add(String((user as Record<string, unknown>).roleName))
    }
    if (typeof (user as Record<string, unknown>).role === 'string') {
      candidates.add(String((user as Record<string, unknown>).role))
    }
    extractRoleStringsFromUnknown((user as Record<string, unknown>).roles).forEach((item) =>
      candidates.add(item),
    )
    extractRoleStringsFromUnknown((user as Record<string, unknown>).authorities).forEach((item) =>
      candidates.add(item),
    )
  }

  const normalizedRoles = Array.from(candidates)
    .map((item) => normalizeRoleValue(item))
    .filter((item): item is AppRole => item !== null)

  if (normalizedRoles.length > 0) {
    return Array.from(new Set(normalizedRoles))
  }

  const username = user?.username?.toLowerCase() || ''
  if (username.includes('admin')) {
    return [ROLE_ADMIN]
  }
  if (username.includes('owner') || username.includes('boss')) {
    return [ROLE_FARM_OWNER]
  }
  if (username.includes('worker') || username.includes('operator')) {
    return [ROLE_WORKER]
  }
  if (username.includes('farmer') || username.includes('farm')) {
    return [ROLE_FARMER]
  }

  // Unknown role: use least privilege fallback.
  return [ROLE_FARMER]
}

export function hasAnyRole(currentRoles: string[] | AppRole[], requiredRoles: AppRole[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true
  }

  const normalizedCurrent = resolveUserRoles(currentRoles, null)
  if (normalizedCurrent.length === 0) {
    return false
  }

  return requiredRoles.some((role) => normalizedCurrent.includes(role))
}

export function isKnownRole(role: string): role is AppRole {
  return ALL_ROLES.includes(role as AppRole)
}
