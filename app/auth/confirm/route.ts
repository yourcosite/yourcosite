import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tar emot engångslänkar från adminportalen ("Logga in som kund" och
// "Tillbaka till admin"). Länken innehåller en engångskod (token_hash) som
// här byts mot en riktig inloggning på SERVERN, så att sessionen faktiskt
// sparas i webbläsarens kakor — den vanliga Supabase-länken lämnar bara
// koden i adressens #-del, som servern aldrig ser.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const rawNext = url.searchParams.get("next") || "/dashboard";
  // Bara interna sökvägar — aldrig en länk till en annan sajt.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!tokenHash) return NextResponse.redirect(new URL("/logga-in", url.origin));

  const supabase = await createClient();
  let { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (error) {
    ({ error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash }));
  }
  if (error) {
    const dest = next.startsWith("/admin") ? "/admin/logga-in" : "/logga-in";
    return NextResponse.redirect(new URL(dest, url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
