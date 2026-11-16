import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeEnabledFor } from "@/lib/stripe";

// Säger om den inloggade kunden ska se kortbetalning i registreringen.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ enabled: !!user && stripeEnabledFor(user.email) });
}
