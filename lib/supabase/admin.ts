import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-klient med service_role-nyckeln. Kringgår Row Level Security helt,
 * så den får ENDAST användas i serverkod (route handlers/server actions)
 * som själva kontrollerar att anroparen är inloggad som admin.
 *
 * Importera aldrig denna fil i en "use client"-komponent eller i kod som
 * skickas till webbläsaren — service_role-nyckeln får aldrig exponeras där.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
