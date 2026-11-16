import { NextResponse } from "next/server";
import { withErrorLog } from "@/lib/errorLog";
import { sendWeeklyReport } from "@/lib/weeklyReport";

// Körs av Vercel Cron varje måndag morgon (vercel.json) och mejlar
// veckorapporten. Kan också köras för hand från Vercel, Cron Jobs, Run.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function GET_handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 401 });
  }
  const out = await sendWeeklyReport();
  return NextResponse.json(out);
}
export const GET = withErrorLog("GET /api/cron/weekly-report", GET_handler);
