"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let gotSession = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        gotSession = true;
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        gotSession = true;
        setReady(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!gotSession) setInvalid(true);
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password !== password2) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let role = "customer";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? "customer";
    }

    setLoading(false);
    router.push(role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6 font-sans">
      <div className="w-full max-w-[380px]">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Logo light={false} />
          </Link>
        </div>

        {invalid && !ready ? (
          <div className="bg-surface border border-line rounded-2xl p-7 text-center">
            <h1 className="text-[20px] font-medium mb-2">Länken fungerar inte längre</h1>
            <p className="text-[14px] text-ink-dim leading-relaxed">
              Återställningslänkar slutar gälla efter ett tag. Be om en ny länk
              och försök igen.
            </p>
          </div>
        ) : !ready ? (
          <div className="text-center text-[14px] text-ink-dim">Laddar …</div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-7">
            <h1 className="text-[22px] font-medium mb-1">Välj nytt lösenord</h1>
            <p className="text-[13.5px] text-ink-dim mb-6">
              Minst 8 tecken.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="pw" className="block text-[13px] font-semibold mb-1.5">
                  Nytt lösenord
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
              <div>
                <label htmlFor="pw2" className="block text-[13px] font-semibold mb-1.5">
                  Bekräfta lösenord
                </label>
                <input
                  id="pw2"
                  type="password"
                  required
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[14.5px]"
                />
              </div>

              {error && <div className="text-[13.5px] text-warm font-medium">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="bg-accent text-accent-ink font-semibold text-[15px] py-3.5 rounded-[10px] disabled:opacity-60"
              >
                {loading ? "Sparar …" : "Spara nytt lösenord"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
