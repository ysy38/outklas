import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

export function supabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export async function createSupabaseServer() {
  const jar = await cookies();
  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        for (const cookie of list) jar.set(cookie.name, cookie.value, cookie.options);
      },
    },
  });
}
