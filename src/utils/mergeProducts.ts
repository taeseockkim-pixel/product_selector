import type { Product, SpecItem } from '../types'
import type { OverrideLayer } from '../types/overrides'

export function mergeProducts(base: Product[], layer: OverrideLayer): Product[] {
  const result: Product[] = []

  for (const product of base) {
    const override = layer.overrides.find(o => o.productId === product.id)
    if (!override) { result.push(product); continue }
    if (override.hidden) continue

    const hiddenLabels = new Set(
      (override.specOverrides ?? []).filter(so => so.action === 'hide').map(so => so.label),
    )

    const specs: SpecItem[] = product.specs
      .filter(spec => !hiddenLabels.has(spec.label))
      .map(spec => {
        const so = override.specOverrides?.find(s => s.label === spec.label && s.action === 'modify')
        return so ? { ...spec, value: so.newValue!, source: 'user' as const } : spec
      })

    const added: SpecItem[] = (override.specOverrides ?? [])
      .filter(so => so.action === 'add')
      .map(so => ({ label: so.newLabel ?? so.label, value: so.newValue!, source: 'user' as const }))

    result.push({
      ...product,
      description: override.descriptionOverride ?? product.description,
      specs: [...specs, ...added],
    })
  }

  const existingIds = new Set(result.map(p => p.id))
  for (const np of layer.newProducts) {
    if (existingIds.has(np.id)) continue
    const { isUserAdded: _i, addedAt: _a, addedBy: _b, ...fields } = np
    result.push(fields as unknown as Product)
  }

  return result
}
