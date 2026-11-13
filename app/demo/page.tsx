"use client";

import EditorView from "@/components/EditorView";

// Öppen demo av redigeraren med ett påhittat företag (Mörkvik Barbershop).
// Ingen inloggning, inget sparas — se lib/demoClient.ts och lib/demoStore.ts.
export default function DemoPage() {
  return <EditorView demo />;
}
