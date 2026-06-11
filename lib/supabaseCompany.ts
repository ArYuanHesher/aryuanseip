/**
 * 公司 Supabase client — 唯讀
 * 只用於 SELECT，不做 INSERT / UPDATE / DELETE
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_COMPANY_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_COMPANY_SUPABASE_ANON_KEY!

export const supabaseCompany = createClient(url, anonKey)

/**
 * Server-side only（API Route / Server Component）
 * 擁有 service role，仍建議只做讀取
 */
export function getCompanyServiceClient() {
  const serviceKey = process.env.COMPANY_SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}
