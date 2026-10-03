import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Giriş",
  description: "YDS Lab hesabına gir veya yeni hesap aç. Teşhis ve günlük plan bu hesapta durur.",
  alternates: { canonical: "/giris" },
};

export default function LoginPage() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
      <div className="max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS Lab</p>
        <p className="mt-4 font-serif text-5xl leading-[1.05]">Bugünün listesi, bir sonraki oturumda da durur.</p>
        <p className="mt-4 leading-7 text-muted">Hesap ücretsizdir. Kota, günde on sorudan sonra gelir.</p>
      </div>
      <AuthForm />
    </section>
  );
}
