"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Visas inget. Om kortet på startsidan saknar skärmdump ber den servern ta en,
// och laddar om sidan när den är klar.
export default function EnsureShowcaseImage() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/showcase/ensure", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) router.refresh(); })
      .catch(() => {});
  }, [router]);
  return null;
}
