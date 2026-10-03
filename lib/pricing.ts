// Prisnivåer — måste hållas i synk med priserna som visas på /priser.
export const PLAN_PRICES: Record<string, number> = {
  bas: 149,
  standard: 249,
  premium: 399,
};

export const PLAN_LABELS: Record<string, string> = {
  bas: "Bas",
  standard: "Standard",
  premium: "Premium",
};

export function planPrice(plan: string | null | undefined): number {
  if (!plan) return 0;
  return PLAN_PRICES[plan] ?? 0;
}

export function formatKr(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}
