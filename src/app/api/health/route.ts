import { databaseInfo, getDb, sql } from "@/db/client";

export const dynamic = "force-dynamic";

function describe(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code ?? null;
  return { code, message: raw.replace(/\b[a-z]+:\/\/\S+/gi, "[url]").slice(0, 300) };
}

export async function GET() {
  const started = Date.now();
  const info = databaseInfo();
  const region = process.env.VERCEL_REGION ?? null;
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, ...info, region, ms: Date.now() - started });
  } catch (error) {
    return Response.json({ ok: false, ...info, region, ms: Date.now() - started, error: describe(error) }, { status: 503 });
  }
}
