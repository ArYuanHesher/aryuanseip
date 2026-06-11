'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseMine } from '@/lib/supabaseMine'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabaseMine.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleLogout() {
    await supabaseMine.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition"
          >
            登出
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-gray-600 text-sm">登入帳號：<span className="font-medium text-gray-800">{user?.email}</span></p>
        </div>
      </div>
    </div>
  )
}
