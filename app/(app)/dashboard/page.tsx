'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseCompany } from '@/lib/supabaseCompany'

type DailySheet = {
  sheet_date: string
  rows: {
    mo_status?: string | null
    mo_number?: string | null
    factory?: string
    po_status?: string | null
  }[]
}

type PjRecord = {
  id: number
  doc_type: string
  doc_no: string
  sub_no: string
  item_code: string | null
  description: string | null
  qty: number
  unit: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  customer_vendor: string | null
  remark: string | null
  extra: Record<string, unknown> | null
}

type MoLine = {
  id: number
  project_id: string
  begin_date: string | null
  end_date: string | null
  line_no: string
  mbp_part: string | null
  mbp_lot_no: string | null
  order_qty: number
  source_order: string | null
}

type SoLine = {
  id: number
  project_id: string
  line_no: string | null
  mbp_part: string | null
  order_qty_oru: number | null
  pdl_seq: number | null
  customer: string | null
  delivery_date: string | null
}

type SearchResult = {
  type: 'SO' | 'MO' | 'PO' | 'PR'
  rows: (PjRecord | MoLine | SoLine)[]
}

export default function DashboardPage() {
  const [sheets, setSheets] = useState<DailySheet[]>([])
  const [sheetsLoading, setSheetsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    supabaseCompany
      .from('daily_order_sheets')
      .select('sheet_date, rows')
      .order('sheet_date', { ascending: false })
      .limit(14)
      .then(({ data }) => {
        setSheets((data as DailySheet[]) ?? [])
        setSheetsLoading(false)
      })
  }, [])

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults([])
    setSearched(false)
    try {
      const found: SearchResult[] = []

      const [soRes, moRes, pjRes] = await Promise.all([
        supabaseCompany
          .from('erp_so_lines')
          .select('id, project_id, line_no, mbp_part, order_qty_oru, pdl_seq, customer, delivery_date')
          .ilike('project_id', `%${q}%`)
          .limit(50),
        supabaseCompany
          .from('erp_mo_lines')
          .select('id, project_id, begin_date, end_date, line_no, mbp_part, mbp_lot_no, order_qty, source_order')
          .or(`project_id.ilike.%${q}%,source_order.ilike.%${q}%`)
          .limit(50),
        supabaseCompany
          .from('erp_pj_sync')
          .select('id, doc_type, doc_no, sub_no, item_code, description, qty, unit, status, start_date, end_date, customer_vendor, remark, extra')
          .or(`doc_no.ilike.%${q}%,extra->>MBP_LOT_NO.ilike.%${q}%`)
          .limit(100),
      ])

      if (soRes.data?.length) found.push({ type: 'SO', rows: soRes.data as SoLine[] })
      if (moRes.data?.length) found.push({ type: 'MO', rows: moRes.data as MoLine[] })
      if (pjRes.data?.length) {
        const poRows = (pjRes.data as PjRecord[]).filter(r => r.doc_type === '採購單號')
        const prRows = (pjRes.data as PjRecord[]).filter(r => r.doc_type === '請購單號')
        if (poRows.length) found.push({ type: 'PO', rows: poRows })
        if (prRows.length) found.push({ type: 'PR', rows: prRows })
      }

      setResults(found)
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }, [query])

  return (
    <div className="flex gap-6 min-h-full">

      {/* 左側：每日出單表 */}
      <div className="w-64 shrink-0">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <h2 className="text-white text-sm font-medium mb-3">每日出單（近 14 天）</h2>
          {sheetsLoading ? (
            <p className="text-gray-500 text-xs">載入中...</p>
          ) : sheets.length === 0 ? (
            <p className="text-gray-500 text-xs">無資料</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left pb-1.5 font-medium">日期</th>
                  <th className="text-right pb-1.5 font-medium">製令</th>
                  <th className="text-right pb-1.5 font-medium">委外</th>
                  <th className="text-right pb-1.5 font-medium">常平</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map(s => {
                  const rows = Array.isArray(s.rows) ? s.rows : []
                  const total = rows.length
                  const withMo = rows.filter(r => r.mo_number).length
                  const oMatched = rows.filter(r => r.factory === 'O' && r.po_status === 'matched').length
                  const oTotal = rows.filter(r => r.factory === 'O').length
                  const cMatched = rows.filter(r => r.factory === 'C' && r.po_status === 'matched').length
                  const cTotal = rows.filter(r => r.factory === 'C').length
                  return (
                    <tr key={s.sheet_date} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                      <td className="py-1.5 text-gray-300 font-mono">{s.sheet_date.slice(5)}</td>
                      <td className="py-1.5 text-right">
                        <span className={withMo === total ? 'text-green-400' : 'text-yellow-400'}>{withMo}/{total}</span>
                      </td>
                      <td className="py-1.5 text-right">
                        {oTotal === 0
                          ? <span className="text-gray-700">—</span>
                          : <span className={oMatched === oTotal ? 'text-green-400' : 'text-orange-400'}>{oMatched}/{oTotal}</span>}
                      </td>
                      <td className="py-1.5 text-right">
                        {cTotal === 0
                          ? <span className="text-gray-700">—</span>
                          : <span className={cMatched === cTotal ? 'text-green-400' : 'text-orange-400'}>{cMatched}/{cTotal}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 右側：搜尋 */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleSearch()}
              placeholder="輸入單號查詢（銷售單 / 採購單 / 請購單 / 製令）..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching || !query.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition"
            >
              {searching ? '查詢中...' : '查詢'}
            </button>
          </div>
        </div>

        {searched && results.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-500 text-sm">找不到符合「{query}」的資料</p>
          </div>
        )}

        {results.map(r => (
          <div key={r.type} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-medium text-sm mb-3">
              {r.type === 'SO' && '📄 銷售訂單'}
              {r.type === 'MO' && '🏭 製令'}
              {r.type === 'PO' && '🛒 採購單'}
              {r.type === 'PR' && '📝 請購單'}
              <span className="ml-2 text-gray-500 text-xs font-normal">({r.rows.length} 筆)</span>
            </h3>
            <div className="overflow-x-auto">
              {r.type === 'SO' && (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 pr-4">工單號</th>
                    <th className="text-left py-1.5 pr-4">序號</th>
                    <th className="text-left py-1.5 pr-4">料號</th>
                    <th className="text-right py-1.5 pr-4">數量</th>
                    <th className="text-left py-1.5 pr-4">客戶</th>
                    <th className="text-left py-1.5">交期</th>
                  </tr></thead>
                  <tbody>
                    {(r.rows as SoLine[]).map(row => (
                      <tr key={row.id} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                        <td className="py-1.5 pr-4 text-white font-mono">{row.project_id}</td>
                        <td className="py-1.5 pr-4 text-gray-400">{row.line_no}</td>
                        <td className="py-1.5 pr-4 text-gray-300">{row.mbp_part}</td>
                        <td className="py-1.5 pr-4 text-gray-300 text-right">{row.order_qty_oru}</td>
                        <td className="py-1.5 pr-4 text-gray-400">{row.customer}</td>
                        <td className="py-1.5 text-gray-400">{row.delivery_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {r.type === 'MO' && (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 pr-4">製令號</th>
                    <th className="text-left py-1.5 pr-4">序號</th>
                    <th className="text-left py-1.5 pr-4">料號</th>
                    <th className="text-right py-1.5 pr-4">數量</th>
                    <th className="text-left py-1.5 pr-4">來源單</th>
                    <th className="text-left py-1.5">結束日</th>
                  </tr></thead>
                  <tbody>
                    {(r.rows as MoLine[]).map(row => (
                      <tr key={row.id} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                        <td className="py-1.5 pr-4 text-white font-mono">{row.project_id}</td>
                        <td className="py-1.5 pr-4 text-gray-400">{row.line_no}</td>
                        <td className="py-1.5 pr-4 text-gray-300">{row.mbp_part}</td>
                        <td className="py-1.5 pr-4 text-gray-300 text-right">{row.order_qty}</td>
                        <td className="py-1.5 pr-4 text-gray-400 font-mono">{row.source_order}</td>
                        <td className="py-1.5 text-gray-400">{row.end_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(r.type === 'PO' || r.type === 'PR') && (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 pr-4">單號</th>
                    <th className="text-left py-1.5 pr-4">項次</th>
                    <th className="text-left py-1.5 pr-4">料號</th>
                    <th className="text-left py-1.5 pr-4">品名</th>
                    <th className="text-right py-1.5 pr-4">數量</th>
                    <th className="text-left py-1.5 pr-4">批號</th>
                    <th className="text-left py-1.5 pr-4">廠商</th>
                    <th className="text-left py-1.5">狀態</th>
                  </tr></thead>
                  <tbody>
                    {(r.rows as PjRecord[]).map(row => {
                      const lotNo = row.extra?.MBP_LOT_NO ? String(row.extra.MBP_LOT_NO) : null
                      const lotMatch = lotNo && lotNo.toLowerCase().includes(query.trim().toLowerCase())
                      return (
                        <tr key={row.id} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                          <td className="py-1.5 pr-4 text-white font-mono">{row.doc_no}</td>
                          <td className="py-1.5 pr-4 text-gray-400">{row.sub_no}</td>
                          <td className="py-1.5 pr-4 text-gray-300">{row.item_code}</td>
                          <td className="py-1.5 pr-4 text-gray-400 max-w-[140px] truncate">{row.description}</td>
                          <td className="py-1.5 pr-4 text-gray-300 text-right">{row.qty}</td>
                          <td className="py-1.5 pr-4 font-mono">
                            {lotNo
                              ? <span className={lotMatch ? 'text-yellow-300 font-semibold' : 'text-gray-400'}>{lotNo}</span>
                              : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="py-1.5 pr-4 text-gray-400">{row.customer_vendor}</td>
                          <td className="py-1.5 text-gray-400">{row.status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
