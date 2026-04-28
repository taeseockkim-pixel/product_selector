import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { OverrideLayer, ProductOverride, UserAddedProduct } from '../types/overrides'
import { EMPTY_OVERRIDES } from '../types/overrides'

const LS_KEY = 'cimon-product-overrides'
const SS_KEY_NAME = 'cimon-admin-name'
const SS_KEY_KEY = 'cimon-admin-key'

function applyOpLocally(layer: OverrideLayer, op: string, data: unknown): OverrideLayer {
  const updated: OverrideLayer = {
    ...layer,
    overrides: [...layer.overrides],
    newProducts: [...layer.newProducts],
    lastUpdated: new Date().toISOString(),
  }
  if (op === 'upsert_override') {
    const d = data as ProductOverride
    const idx = updated.overrides.findIndex(o => o.productId === d.productId)
    if (idx >= 0) updated.overrides[idx] = d
    else updated.overrides.push(d)
  } else if (op === 'delete_override') {
    const d = data as { productId: string }
    updated.overrides = updated.overrides.filter(o => o.productId !== d.productId)
  } else if (op === 'add_product') {
    updated.newProducts.push(data as UserAddedProduct)
  } else if (op === 'remove_product') {
    const d = data as { id: string }
    updated.newProducts = updated.newProducts.filter(p => p.id !== d.id)
  }
  return updated
}

interface AdminContextValue {
  isAdmin: boolean
  adminName: string
  login: (key: string, name: string) => void
  logout: () => void
  saveOp: (
    op: string,
    data: unknown,
    currentOverrides: OverrideLayer,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState(() => sessionStorage.getItem(SS_KEY_KEY) ?? '')
  const [name, setName] = useState(() => sessionStorage.getItem(SS_KEY_NAME) ?? '')

  const login = useCallback((k: string, n: string) => {
    setKey(k)
    setName(n)
    sessionStorage.setItem(SS_KEY_KEY, k)
    sessionStorage.setItem(SS_KEY_NAME, n)
  }, [])

  const logout = useCallback(() => {
    setKey('')
    setName('')
    sessionStorage.removeItem(SS_KEY_KEY)
    sessionStorage.removeItem(SS_KEY_NAME)
  }, [])

  const saveOp = useCallback(
    async (
      op: string,
      data: unknown,
      currentOverrides: OverrideLayer,
      onRefresh: () => Promise<void>,
    ) => {
      let apiResponded = false
      try {
        const res = await fetch('/api/overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ op, data }),
        })
        apiResponded = true
        if (res.ok) { await onRefresh(); return }
        if (res.status === 401) { logout(); throw new Error('UNAUTHORIZED') }
        throw new Error(`저장 실패 (서버 오류 ${res.status})`)
      } catch (e) {
        if ((e as Error).message === 'UNAUTHORIZED') throw e
        if (apiResponded) {
          // 서버가 응답했지만 실패 → 사용자에게 알림, 폴백 없음
          alert((e as Error).message)
          throw e
        }
        // fetch 자체가 실패(네트워크 없음 / 엔드포인트 미존재) → dev 환경 localStorage 폴백
      }
      const updated = applyOpLocally(currentOverrides, op, data)
      localStorage.setItem(LS_KEY, JSON.stringify(updated))
      await onRefresh()
    },
    [key, logout],
  )

  return (
    <AdminContext.Provider value={{ isAdmin: key.length > 0, adminName: name, login, logout, saveOp }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}

export { EMPTY_OVERRIDES }
