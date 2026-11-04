'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { authApi, setAuthToken, type LoginResponseData } from './api-client'
import { getInstitution, resolveInstitutionId } from './data'

export interface AuthUser {
  userId?: string
  name: string
  firstName: string
  email: string
  role: 'customer' | 'manager' | 'admin'
  initials: string
  institutionId: string
  contextTitle: string
  contextSubtitle: string
  searchPlaceholder: string
  walletBalance?: number
  reservedBalance?: number
}

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; requires2Fa?: boolean; tempToken?: string; message?: string; error?: string }>
  verify2Fa: (tempToken: string, otp: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUser: (fields: Partial<AuthUser>) => void
  isLoading: boolean
}

const MOCK_USERS: Record<string, AuthUser> = {
  'aryan.20224031@mnnit.ac.in': {
    userId: '00000000-0000-0000-0010-000000000001',
    name: 'Aryan Mehta',
    firstName: 'Aryan',
    email: 'aryan.20224031@mnnit.ac.in',
    role: 'customer',
    initials: 'AM',
    institutionId: 'mnnit',
    contextTitle: 'MNNIT Allahabad',
    contextSubtitle: 'Student · B.Tech CSE',
    searchPlaceholder: 'Search books, authors, ISBN…',
    walletBalance: 3000,
    reservedBalance: 425,
  },
  'store.staff@unikart.in': {
    userId: '00000000-0000-0000-0010-000000000002',
    name: 'Store Staff',
    firstName: 'Staff',
    email: 'store.staff@unikart.in',
    role: 'manager',
    initials: 'SS',
    institutionId: 'mnnit',
    contextTitle: 'Unikart · MNNIT',
    contextSubtitle: 'Store Manager',
    searchPlaceholder: 'Search orders, members, ISBN…',
  },
  'platform.admin@unikart.in': {
    userId: '00000000-0000-0000-0010-000000000003',
    name: 'Platform Admin',
    firstName: 'Admin',
    email: 'platform.admin@unikart.in',
    role: 'admin',
    initials: 'PA',
    institutionId: '',
    contextTitle: 'All institutions',
    contextSubtitle: 'Platform Admin · 4 stores',
    searchPlaceholder: 'Search institutions, users, txn IDs…',
  },
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const refreshUser = React.useCallback(async () => {
    try {
      const live = await authApi.getMe()
      if (live) {
        const parts = live.fullName.trim().split(' ')
        const mappedRole: 'customer' | 'manager' | 'admin' =
          live.role.toLowerCase() === 'platform_admin' || live.role.toLowerCase() === 'admin'
            ? 'admin'
            : live.role.toLowerCase() === 'store_manager' || live.role.toLowerCase() === 'manager'
            ? 'manager'
            : 'customer'

        const instId = resolveInstitutionId({
          code: live.institutionCode,
          id: live.institutionId,
          name: live.institutionName,
          email: live.email,
        })
        const instShortName = instId ? getInstitution(instId).shortName : (live.institutionName || 'Unikart Campus Store')

        const updated: AuthUser = {
          userId: live.userId,
          name: live.fullName,
          firstName: parts[0] || 'User',
          email: live.email,
          role: mappedRole,
          initials: instShortName.slice(0, 2).toUpperCase() || parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'UK',
          institutionId: instId,
          contextTitle: live.institutionName || (instId ? getInstitution(instId).name : 'Unikart Campus Store'),
          contextSubtitle: `${live.designation || 'Member'}`,
          searchPlaceholder: 'Search books, authors, ISBN…',
          walletBalance: live.walletBalance,
          reservedBalance: live.reservedBalance,
        }
        setUser(updated)
        localStorage.setItem('unikart_session', JSON.stringify(updated))
      }
    } catch {
      // offline or token expired
    }
  }, [])

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('unikart_session')
      if (stored) {
        setUser(JSON.parse(stored))
      }
      refreshUser()
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [refreshUser])

  const mapBackendProfile = (data: LoginResponseData): AuthUser => {
    const u = data.user
    if (!u) throw new Error('Missing user profile data')

    const parts = u.fullName.trim().split(' ')
    const mappedRole: 'customer' | 'manager' | 'admin' =
      u.role.toLowerCase() === 'platform_admin' || u.role.toLowerCase() === 'admin'
        ? 'admin'
        : u.role.toLowerCase() === 'store_manager' || u.role.toLowerCase() === 'manager'
        ? 'manager'
        : 'customer'

    const instId = resolveInstitutionId({
      code: u.institutionCode,
      id: u.institutionId,
      name: u.institutionName,
      email: u.email,
    })
    const instShortName = instId ? getInstitution(instId).shortName : (u.institutionName || 'Unikart Campus Store')

    return {
      userId: u.userId,
      name: u.fullName,
      firstName: parts[0] || 'User',
      email: u.email,
      role: mappedRole,
      initials: instShortName.slice(0, 2).toUpperCase() || parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'UK',
      institutionId: instId,
      contextTitle: u.institutionName || (instId ? getInstitution(instId).name : 'Unikart Campus Store'),
      contextSubtitle: `${u.designation || 'Member'}`,
      searchPlaceholder: 'Search books, authors, ISBN…',
      walletBalance: u.walletBalance,
      reservedBalance: u.reservedBalance,
    }
  }

  const login = React.useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; requires2Fa?: boolean; tempToken?: string; message?: string; error?: string }> => {
      const normalized = email.toLowerCase().trim()

      let backendErrorMessage: string | null = null
      try {
        // Attempt live Spring Boot backend authentication
        const res = await authApi.login(normalized, password)

        if (res.requires2Fa) {
          return {
            ok: true,
            requires2Fa: true,
            tempToken: res.tempToken,
            message: res.message || 'Staff 2FA OTP has been issued',
          }
        }

        if (res.token && res.user) {
          setAuthToken(res.token)
          const mapped = mapBackendProfile(res)
          setUser(mapped)
          localStorage.setItem('unikart_session', JSON.stringify(mapped))
          router.push(`/${mapped.role}`)
          return { ok: true }
        }
      } catch (err: any) {
        console.warn('Live backend authentication failed or unreachable:', err.message)
        backendErrorMessage = err.message
      }

      // Offline / Demo Fallback for hardcoded mock users
      const found = MOCK_USERS[normalized]
      if (found) {
        await new Promise((r) => setTimeout(r, 300))
        const uKey = normalized.replace(/[^a-z0-9]/g, '_')
        let effectiveUser = { ...found }
        try {
          const savedProfile = localStorage.getItem(`unikart_profile_${uKey}`)
          if (savedProfile) {
            effectiveUser = { ...effectiveUser, ...JSON.parse(savedProfile) }
          }
          const savedStore = localStorage.getItem(`unikart_store_${uKey}`)
          if (savedStore) {
            const parsedStore = JSON.parse(savedStore)
            if (typeof parsedStore.walletBalance === 'number') {
              effectiveUser.walletBalance = parsedStore.walletBalance
            }
          }
        } catch {}
        localStorage.setItem('unikart_session', JSON.stringify(effectiveUser))
        setUser(effectiveUser)
        router.push(`/${effectiveUser.role}`)
        return { ok: true }
      }

      return {
        ok: false,
        error: backendErrorMessage || 'Invalid email or password. Please verify your credentials.',
      }
    },
    [router],
  )

  const updateUser = React.useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...fields }
      if (fields.name) {
        const parts = fields.name.trim().split(' ')
        updated.firstName = parts[0] || updated.firstName
      }
      try {
        localStorage.setItem('unikart_session', JSON.stringify(updated))
        const uKey = updated.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
        localStorage.setItem(`unikart_profile_${uKey}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const verify2Fa = React.useCallback(
    async (tempToken: string, otp: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await authApi.verify2Fa(tempToken, otp)
        if (res.token && res.user) {
          setAuthToken(res.token)
          const mapped = mapBackendProfile(res)
          setUser(mapped)
          localStorage.setItem('unikart_session', JSON.stringify(mapped))
          router.push(`/${mapped.role}`)
          return { ok: true }
        }
      } catch (err: any) {
        return { ok: false, error: err.message || 'Invalid or expired OTP' }
      }
      return { ok: false, error: 'Failed to verify 2FA' }
    },
    [router],
  )

  const logout = React.useCallback(() => {
    try {
      setAuthToken(null)
      localStorage.removeItem('unikart_session')
      localStorage.removeItem('unikart_cart')
      localStorage.removeItem('unikart_store')
    } catch {
      // ignore
    }
    setUser(null)
    router.push('/login')
  }, [router])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      login,
      verify2Fa,
      logout,
      refreshUser,
      updateUser,
      isLoading,
    }),
    [user, login, verify2Fa, logout, refreshUser, updateUser, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
