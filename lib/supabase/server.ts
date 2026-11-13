import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient, inDemo } from "@/lib/demoStore";

/**
 * Supabase-klient för användning i server-komponenter, route handlers och
 * server actions. Läser/skriver sessionen via cookies.
 */
export async function createClient(): Promise<SupabaseClient> {
  // Demon på /demo: en låtsasdatabas i minnet, se lib/demoStore.ts.
  if (inDemo()) return createDemoClient() as unknown as SupabaseClient;
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Körs i en server-komponent utan skrivrättigheter till cookies —
            // det är okej eftersom middleware.ts hanterar sessionsförnyelse.
          }
        },
      },
    }
  );
}
