"use client";

import { useEffect, useState } from "react";
import { UI_PINS, dismissPin, isPinVisible } from "@/lib/uiPins";

// Pulserande prick som placeras i ett `relative`-element. Visas bara för
// återvändande kunder (se lib/whatsNew.ts). `onDismiss` exponeras via
// useNewPin så värdknappen kan släcka pinnen när den klickas.
export function useNewPin(id: string, siteCreatedAt?: string | null) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(isPinVisible(id, siteCreatedAt));
  }, [id, siteCreatedAt]);
  return {
    show,
    dismiss: () => {
      dismissPin(id);
      setShow(false);
    },
  };
}

export default function NewPin({ id, show, onDismiss }: { id: string; show: boolean; onDismiss: () => void }) {
  if (!show) return null;
  const entry = UI_PINS.find((e) => e.id === id);
  return (
    <span
      role="status"
      title={entry?.text}
      aria-label={entry ? `Nytt: ${entry.text}` : "Nytt"}
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className="absolute -top-1 -right-1 flex h-3 w-3 cursor-pointer"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-accent border border-ink/60" />
    </span>
  );
}
