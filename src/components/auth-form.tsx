"use client";

import { useState } from "react";
import { PendingButton } from "@/components/pending-button";
import { signInAction, signUpAction } from "@/server/actions";

export function AuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const login = mode === "login";

  async function submit(formData: FormData) {
    setError(null);
    const result = login ? await signInAction(formData) : await signUpAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="rounded-[28px] border border-line bg-card p-6 shadow-[0_30px_80px_-48px_rgba(18,32,40,0.45)] sm:p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{login ? "Giriş yap" : "Hesap aç"}</p>
      <h1 className="mt-3 text-4xl">{login ? "Tekrar hoş geldin." : "Ücretsiz hesabını aç."}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {login
          ? "Seviye testin, günlük çalışman ve denemelerin hesabında seni bekliyor."
          : "Sadece e-posta ve şifre yeterli. Seviye testinin sonunda da hesap açabilirsin."}
      </p>
      <div className="mt-6 grid grid-cols-2 rounded-full bg-paper p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`rounded-full py-2 ${login ? "bg-card text-ink shadow-sm" : "text-muted"}`}
        >
          Giriş yap
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`rounded-full py-2 ${login ? "text-muted" : "bg-card text-ink shadow-sm"}`}
        >
          Hesap aç
        </button>
      </div>
      <form action={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          E-posta
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="sen@posta.com"
            className="mt-1.5 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-pine"
          />
        </label>
        <label className="block text-sm">
          Şifre
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={login ? "current-password" : "new-password"}
            placeholder="En az 6 karakter"
            className="mt-1.5 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-pine"
          />
        </label>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {process.env.NODE_ENV === "development" ? (
          <p className="text-xs text-muted">Yerel yönetici: admin@ydslab.local / lab-admin</p>
        ) : null}
        <PendingButton pendingLabel={login ? "Giriş yapılıyor…" : "Hesabın açılıyor…"} className="w-full rounded-full bg-pine px-4 py-3 text-cream">
          {login ? "Giriş yap" : "Hesap aç"}
        </PendingButton>
      </form>
    </div>
  );
}
