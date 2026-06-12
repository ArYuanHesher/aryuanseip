'use client'

import { useState } from 'react'

type ActionKey = 'sync_so' | 'sync_mo' | 'sync_po' | 'sync_pr' | 'run_mo_match'

const ACTIONS: { key: ActionKey; label: string; desc: string; color: string }[] = [
  { key: 'sync_mo',      label: '同步製令',             desc: '從 ARGO ERP 重新抓取製令資料到 Supabase',    color: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'sync_so',      label: '同步銷售訂單',          desc: '從 ARGO ERP 重新抓取銷售訂單資料',           color: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'sync_po',      label: '同步採購單',             desc: '從 ARGO ERP 重新抓取採購單資料',             color: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'sync_pr',      label: '同步請購單',             desc: '從 ARGO ERP 重新抓取請購單資料',             color: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'run_mo_match', label: '比對近7天出單表製令',    desc: '重新比對最近7天每日出單表的製令/批備料狀態',  color: 'bg-emerald-600 hover:bg-emerald-500' },
]

type TaskStatus = { loading: boolean; result: string | null; isError: boolean }

export default function SettingsPage() {
  const [tasks, setTasks] = useState<Record<ActionKey, TaskStatus>>({
    sync_so:      { loading: false, result: null, isError: false },
    sync_mo:      { loading: false, result: null, isError: false },
    sync_po:      { loading: false, result: null, isError: false },
    sync_pr:      { loading: false, result: null, isError: false },
    run_mo_match: { loading: false, result: null, isError: false },
  })

  const runAction = async (key: ActionKey) => {
    setTasks(prev => ({ ...prev, [key]: { loading: true, result: null, isError: false } }))
    try {
      const res = await fetch('/api/company/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: key }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setTasks(prev => ({ ...prev, [key]: { loading: false, result: json.error ?? '失敗', isError: true } }))
      } else {
        // 顯示結果摘要
        let summary = '完成'
        if (key === 'run_mo_match' && Array.isArray(json.result?.results)) {
          const total = (json.result.results as { updated: number }[]).reduce((s, r) => s + (r.updated ?? 0), 0)
          const days = json.result.results.length
          summary = `${days} 天出單表，更新 ${total} 筆製令狀態`
        } else if (json.result?.status === 'ok' || json.result?.success) {
          summary = json.result?.message ?? '同步完成'
        }
        setTasks(prev => ({ ...prev, [key]: { loading: false, result: summary, isError: false } }))
      }
    } catch (e) {
      setTasks(prev => ({ ...prev, [key]: { loading: false, result: String(e), isError: true } }))
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-white text-xl font-semibold mb-1">設定</h1>
      <p className="text-gray-500 text-sm mb-6">觸發公司 ERP 資料同步</p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-gray-300 text-sm font-medium mb-4">🔄 資料同步</h2>
        <div className="flex flex-col gap-3">
          {ACTIONS.map(a => {
            const task = tasks[a.key]
            return (
              <div key={a.key} className="flex items-center gap-4 py-2 border-b border-gray-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{a.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{a.desc}</div>
                  {task.result && (
                    <div className={`text-xs mt-1 ${task.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {task.isError ? '❌ ' : '✅ '}{task.result}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => void runAction(a.key)}
                  disabled={task.loading}
                  className={`shrink-0 px-4 py-2 rounded-xl text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${a.color}`}
                >
                  {task.loading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      執行中
                    </span>
                  ) : '執行'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-gray-300 text-sm font-medium mb-2">⚠️ 注意事項</h2>
        <ul className="text-gray-500 text-xs space-y-1 list-disc list-inside">
          <li>同步操作需要公司 EIP 在線上才能執行</li>
          <li>同步時間依資料量而定，通常 30 秒到 2 分鐘</li>
          <li>「比對出單表」只更新已儲存到 Supabase 的出單表，不會重新從 ARGO 抓取</li>
          <li>建議先執行「同步製令」再執行「比對出單表」</li>
        </ul>
      </div>
    </div>
  )
}

