"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/ErrorReporter";

// Sista skyddsnätet om själva grundlayouten kraschar. Ligger utanför
// språkhanteringen, så texten är kort och på två språk.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message, error.stack, `globalt fel${error.digest ? " digest " + error.digest : ""}`);
  }, [error]);
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
        <div>
          <h1>Något gick fel / Something went wrong</h1>
          <p>Vi tittar på det. We are looking into it.</p>
          <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "#0E0E10", color: "#fff", fontWeight: 600 }}>
            Försök igen / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
