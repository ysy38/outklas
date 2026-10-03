import { z } from "zod";
import { activateFromWebhook } from "@/server/sessions";
import { iyzicoConfigured, verifyIyzicoSignature } from "@/modules/billing/iyzico";

const payloadSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["pro", "exam_pass"]),
  status: z.enum(["active", "canceled"]),
  periodEnd: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  if (!iyzicoConfigured()) return Response.json({ error: "iyzico is not configured" }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-iyz-signature") ?? "";
  if (!verifyIyzicoSignature(raw, signature, process.env.IYZICO_SECRET ?? "")) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  const parsed = payloadSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return Response.json({ error: "invalid payload" }, { status: 400 });
  await activateFromWebhook({
    profileId: parsed.data.userId,
    plan: parsed.data.plan,
    status: parsed.data.status,
    periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
  });
  return Response.json({ ok: true });
}
