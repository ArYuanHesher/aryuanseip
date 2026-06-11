'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const navItems = [
  { label: '首頁',     href: '/dashboard' },
  { label: '每日出單', href: '/daily-orders' },
  { label: '製令查詢', href: '/mo-search' },
  { label: '庫存',     href: '/inventory' },
  { label: '設定',     href: '/settings' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_MY_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_MY_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="w-full bg-gray-900 border-b border-gray-800 px-6 py-0 flex items-center justify-between h-12 shrink-0">
      {/* Logo */}
      <span className="text-white font-semibold text-sm tracking-wide mr-8">ARYUANSEIP</span>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                active
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* 登出 */}
      <button
        onClick={handleLogout}
        className="text-xs text-gray-500 hover:text-red-400 transition ml-4"
      >
        登出
      </button>
    </nav>
  )
}
