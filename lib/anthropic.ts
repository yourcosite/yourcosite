import Anthropic from "@anthropic-ai/sdk";

// Server-only klient mot Claude. ANTHROPIC_API_KEY sätts som miljövariabel
// i Vercel (precis som Supabase-nycklarna) — finns den inte kastar vi ett
// tydligt fel istället för att krascha konstigt längre in i koden.
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY saknas. Lägg till den som miljövariabel i Vercel."
    );
  }
  return new Anthropic({ apiKey });
}

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
