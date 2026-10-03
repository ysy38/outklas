import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-16">
      <h1 className="mb-6 text-5xl">Hesabın</h1>
      <AuthForm />
    </section>
  );
}
