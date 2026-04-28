import type { CategoryId, PlcSeriesId, SpecItem } from './index'

export type SpecAction = 'modify' | 'hide' | 'add'

export interface SpecOverride {
  label: string
  action: SpecAction
  newLabel?: string   // 'add' 시 새 label
  newValue?: string   // 'modify' | 'add' 시 새 값
  source: 'user'
}

export interface ProductOverride {
  productId: string
  appliedAt: string
  appliedBy: string
  reason?: string
  descriptionOverride?: string
  specOverrides?: SpecOverride[]
  hidden?: boolean
}

export interface UserAddedProduct {
  id: string          // 반드시 'user-' prefix
  isUserAdded: true
  addedAt: string
  addedBy: string
  modelName: string
  category: CategoryId
  series: string
  seriesLabel: string
  subType: string
  description: string
  specs: SpecItem[]
  plcSeries?: PlcSeriesId
  [key: string]: unknown
}

export interface OverrideLayer {
  version: number
  lastUpdated: string
  overrides: ProductOverride[]
  newProducts: UserAddedProduct[]
}

export const EMPTY_OVERRIDES: OverrideLayer = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  overrides: [],
  newProducts: [],
}
