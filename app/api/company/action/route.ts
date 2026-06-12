import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ALLOWED_ACTIONS = ['sync_so', 'sync_mo', 'sync_po', 'sync_pr', 'sync_material_prep', 'run_mo_match'] as const
type AllowedAction = typeof ALLOWED_ACTIONS[number]

const ACTION_LABELS: Record<AllowedAction, string> = {
  sync_so: '同步銷售訂單',
  sync_mo: '同步製令',
  sync_po: '同步採購單',
  sync_pr: '同步請購單',
  sync_material_prep: '同步批備料單',
  run_mo_match: '比對7天出單表製令',
}

export async function POST(request: NextRequest) {
  // 驗證登入
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_MY_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_MY_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 })
  }

  const { action } = await request.json() as { action?: string }
  if (!action || !(ALLOWED_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ success: false, error: `無效的 action` }, { status: 400 })
  }

  const companyUrl = process.env.COMPANY_EIP_URL
  const webhookSecret = process.env.COMPANY_WEBHOOK_SECRET

  // run_mo_match 直接在本機執行（不需要公司 EIP）
  if (action === 'run_mo_match') {
    const origin = request.nextUrl.origin
    const res = await fetch(`${origin}/api/company/mo-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await safeJson(res)
    return NextResponse.json({
      success: res.ok && json.success,
      action,
      label: ACTION_LABELS[action as AllowedAction],
      result: json,
      error: json.error,
    }, { status: res.ok ? 200 : res.status })
  }

  if (!companyUrl || !webhookSecret) {
    return NextResponse.json({ success: false, error: '尚未設定公司 EIP 連線資訊（COMPANY_EIP_URL / COMPANY_WEBHOOK_SECRET）' }, { status: 500 })
  }

  const res = await fetch(`${companyUrl}/api/webhook/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify({ action }),
  })

  const json = await safeJson(res)
  return NextResponse.json({
    success: res.ok && json.success !== false,
    action,
    label: ACTION_LABELS[action as AllowedAction],
    result: json,
    error: json.error,
  }, { status: res.ok ? 200 : res.status })
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return { error: `公司 EIP 回應為空（HTTP ${res.status}）` }
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { error: `公司 EIP 回應非 JSON（HTTP ${res.status}）：${text.slice(0, 200)}` }
  }
}
