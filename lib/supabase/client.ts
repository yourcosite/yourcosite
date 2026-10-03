import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-klient för användning i klientkomponenter ("use client").
 * Använder de publika miljövariablerna som är säkra att exponera i webbläsaren.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
