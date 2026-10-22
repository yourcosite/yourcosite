"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/ErrorReporter";
import { useT } from "@/components/I18nProvider";

// Visas när en sida kraschar. Felet rapporteras till admin.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    reportClientError(error.message, error.stack, `sidfel${error.digest ? " digest " + error.digest : ""}`);
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center font-sans">
      <div className="max-w-md">
        <h1 className="text-[26px] font-semibold mb-3">{t("Något gick fel")}</h1>
        <p className="text-[15px] text-[#5b5a56] mb-6">
          {t("Vi har fått ett meddelande om felet och tittar på det. Försök igen om en stund.")}
        </p>
        <button onClick={reset} className="px-5 py-2.5 rounded-full bg-[#0E0E10] text-white text-[14px] font-semibold">
          {t("Försök igen")}
        </button>
      </div>
    </div>
  );
}
