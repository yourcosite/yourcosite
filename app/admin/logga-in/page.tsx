"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "@/components/TurnstileWidget";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (TURNSTILE_SITE_KEY && !captcha) {
      setError("Bekräfta att du inte är en robot.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      ...(captcha ? { options: { captchaToken: captcha } } : {}),
    });
    setCaptchaReset((n) => n + 1);

    if (signInError) {
      setLoading(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Fel e-post eller lösenord."
          : signInError.message
      );
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-[380px]">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="bg-surface rounded-2xl p-7">
          <h1 className="text-[22px] font-medium mb-1">Adminportal</h1>
          <p className="text-[13.5px] text-ink-dim mb-6">
            Endast för YourCoSite-personal.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold mb-1.5">
                E-post
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[14.5px]"
              />
            </div>
            <div>
              <label htmlFor="pw" className="block text-[13px] font-semibold mb-1.5">
                Lösenord
              </label>
              <input
                id="pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[14.5px]"
              />
            </div>

            <TurnstileWidget onToken={setCaptcha} resetSignal={captchaReset} />
            {error && <div className="text-[13.5px] text-warm font-medium">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-accent-ink font-semibold text-[15px] py-3.5 rounded-[10px] disabled:opacity-60"
            >
              {loading ? "Loggar in …" : "Logga in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
