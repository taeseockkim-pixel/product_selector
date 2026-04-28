import { list, put, del } from '@vercel/blob'

interface SpecOverride { label: string; action: string; newLabel?: string; newValue?: string; source: 'user' }
interface ProductOverride { productId: string; appliedAt: string; appliedBy: string; reason?: string; descriptionOverride?: string; specOverrides?: SpecOverride[]; hidden?: boolean }
interface UserAddedProduct { id: string; [key: string]: unknown }
interface OverrideLayer { version: number; lastUpdated: string; overrides: ProductOverride[]; newProducts: UserAddedProduct[] }

const BLOB_PATHNAME = 'product-overrides.json'
const EMPTY: OverrideLayer = { version: 1, lastUpdated: new Date().toISOString(), overrides: [], newProducts: [] }

async function readOverrides(): Promise<OverrideLayer> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ...EMPTY }
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 })
    if (!blobs.length) return { ...EMPTY }
    const res = await fetch(`${blobs[0].url}?t=${Date.now()}`)
    return (await res.json()) as OverrideLayer
  } catch {
    return { ...EMPTY }
  }
}

async function writeOverrides(data: OverrideLayer): Promise<void> {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 10 })
  if (blobs.length > 0) await del(blobs.map(b => b.url))
  await put(BLOB_PATHNAME, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

function applyOp(layer: OverrideLayer, op: string, data: unknown): OverrideLayer {
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (req.method === 'GET') {
    const data = await readOverrides()
    return Response.json(data, { headers: { ...CORS, 'Cache-Control': 'no-cache, no-store' } })
  }

  if (req.method === 'POST') {
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!process.env.OVERRIDE_API_KEY || apiKey !== process.env.OVERRIDE_API_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
    }
    const body = (await req.json()) as { op: string; data: unknown }
    const current = await readOverrides()
    const updated = applyOp(current, body.op, body.data)
    await writeOverrides(updated)
    return Response.json(updated, { headers: CORS })
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS })
}
