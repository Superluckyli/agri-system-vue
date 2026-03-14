import { describe, expect, it } from 'vitest'
import { hasAnyRole, isKnownRole, resolveUserRoles } from '@/utils/permission'

describe('resolveUserRoles', () => {
  it('should resolve string array roles via alias map', () => {
    const result = resolveUserRoles(['ADMIN', 'WORKER'], null)
    expect(result).toContain('ADMIN')
    expect(result).toContain('WORKER')
  })

  it('should resolve comma-separated string', () => {
    const result = resolveUserRoles('ADMIN,WORKER', null)
    expect(result).toContain('ADMIN')
    expect(result).toContain('WORKER')
  })

  it('should resolve role aliases (e.g., admin -> ADMIN)', () => {
    const result = resolveUserRoles(['admin'], null)
    expect(result).toContain('ADMIN')
  })

  it('should return empty for unknown roles', () => {
    const result = resolveUserRoles(['UNKNOWN_ROLE_XYZ'], null)
    expect(result).toEqual([])
  })

  it('should extract roles from user object', () => {
    const user = { roles: ['ADMIN'] } as unknown as Parameters<typeof resolveUserRoles>[1]
    const result = resolveUserRoles([], user)
    expect(result).toContain('ADMIN')
  })

  it('should deduplicate roles', () => {
    const result = resolveUserRoles(['ADMIN', 'admin', 'ADMIN'], null)
    expect(result).toEqual(['ADMIN'])
  })
})

describe('hasAnyRole', () => {
  it('should return true when user has required role', () => {
    expect(hasAnyRole(['ADMIN'], ['ADMIN', 'FARM_OWNER'])).toBe(true)
  })

  it('should return false when user lacks required roles', () => {
    expect(hasAnyRole(['WORKER'], ['ADMIN', 'FARM_OWNER'])).toBe(false)
  })

  it('should return true when requiredRoles is empty', () => {
    expect(hasAnyRole([], [])).toBe(true)
  })

  it('should return false when currentRoles is empty but required is not', () => {
    expect(hasAnyRole([], ['ADMIN'])).toBe(false)
  })
})

describe('isKnownRole', () => {
  it('should return true for valid AppRole', () => {
    expect(isKnownRole('ADMIN')).toBe(true)
    expect(isKnownRole('WORKER')).toBe(true)
  })

  it('should return false for unknown role', () => {
    expect(isKnownRole('SUPERUSER')).toBe(false)
  })
})
