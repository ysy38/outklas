import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentProfile } from "@/server/auth";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "YDS Lab hesabına giriş yap veya ücretsiz hesap aç. Seviye testin ve çalışma planın hesabında saklanır.",
  alternates: { canonical: "/giris" },
};

export default async function LoginPage() {
  if (await currentProfile()) redirect("/bugun");
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[0.9fr_1fr]">
      <div className="max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS Lab</p>
        <p className="display mt-4">Çalışman kaybolmaz, kaldığın yerden devam edersin.</p>
        <p className="mt-4 leading-7 text-muted">Hesap açmak ücretsiz. Her gün 10 soru çözebilirsin; daha fazlası için ücretli paket gerekir.</p>
      </div>
      <AuthForm />
    </section>
  );
}
