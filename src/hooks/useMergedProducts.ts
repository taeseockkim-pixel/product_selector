import { useState, useEffect, useCallback } from 'react'
import { PRODUCTS } from '../data/products'
import type { Product } from '../types'
import type { OverrideLayer } from '../types/overrides'
import { EMPTY_OVERRIDES } from '../types/overrides'
import { mergeProducts } from '../utils/mergeProducts'

const LS_KEY = 'cimon-product-overrides'

async function loadOverrides(): Promise<OverrideLayer> {
  try {
    const res = await fetch('/api/overrides', { signal: AbortSignal.timeout(5000) })
    if (res.ok) return (await res.json()) as OverrideLayer
  } catch {
    // API 미사용 환경 (로컬 개발) → localStorage 폴백
  }
  const stored = localStorage.getItem(LS_KEY)
  return stored ? (JSON.parse(stored) as OverrideLayer) : { ...EMPTY_OVERRIDES }
}

export function useMergedProducts() {
  const [overrides, setOverrides] = useState<OverrideLayer>(EMPTY_OVERRIDES)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const data = await loadOverrides()
    setOverrides(data)
    setReady(true)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const products: Product[] = ready ? mergeProducts(PRODUCTS, overrides) : PRODUCTS

  return { products, overrides, ready, refresh }
}
