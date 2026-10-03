"use client";

import { useState } from "react";
import { signInAction, signUpAction } from "@/server/actions";

export function AuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  async function submit(formData: FormData) {
    const result = mode === "login" ? await signInAction(formData) : await signUpAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={submit} className="max-w-md space-y-4 rounded-3xl border border-line bg-card p-6">
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "text-pine" : "text-muted"}>
          Giriş
        </button>
        <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "text-pine" : "text-muted"}>
          Kayıt
        </button>
      </div>
      <label className="block text-sm">
        E-posta
        <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Parola
        <input name="password" type="password" required minLength={6} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
      </label>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {process.env.NODE_ENV === "development" ? (
        <p className="text-xs text-muted">Yerel yönetici: admin@ydslab.local / lab-admin</p>
      ) : null}
      <button className="rounded-full bg-pine px-4 py-2 text-cream">{mode === "login" ? "Giriş yap" : "Hesap aç"}</button>
    </form>
  );
}
