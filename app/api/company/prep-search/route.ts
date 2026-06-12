import { NextRequest, NextResponse } from 'next/server'
import { getCompanyServiceClient } from '@/lib/supabaseCompany'

export const dynamic = 'force-dynamic'

// 批備料單搜尋（erp_material_prep_lines 僅開放 service_role，需走後端）
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q) {
    return NextResponse.json({ success: true, rows: [] })
  }

  const supabase = getCompanyServiceClient()
  const like = `%${q}%`
  const { data, error } = await supabase
    .from('erp_material_prep_lines')
    .select('id, slip_no, slip_date, mo_number, fg_part, mo_qty, line_no, mbp_part, notice_qty, remark')
    .or(`slip_no.ilike.${like},mo_number.ilike.${like},fg_part.ilike.${like},mbp_part.ilike.${like}`)
    .order('slip_no', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, rows: data ?? [] })
}
