/**
 * 個人 Supabase client — 可讀寫
 * 用於此專案自己的資料表
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_MY_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_MY_SUPABASE_ANON_KEY!

export const supabaseMine = createClient(url, anonKey)

/**
 * Server-side only（API Route / Server Component）
 * 完整讀寫權限
 */
export function getMyServiceClient() {
  const serviceKey = process.env.MY_SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}
