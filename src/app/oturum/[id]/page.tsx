import { notFound } from "next/navigation";
import { SessionPlayer } from "@/components/player/session-player";
import { currentProfile, readGuestId } from "@/server/auth";
import { loadPlayer } from "@/server/sessions";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, guestId] = await Promise.all([currentProfile(), readGuestId()]);
  const loaded = await loadPlayer(id, profile?.id ?? null, guestId ?? "");
  if (!loaded) notFound();
  if (loaded.session.status === "submitted") {
    const { redirect } = await import("next/navigation");
    redirect(`/oturum/${id}/sonuc`);
  }
  return (
    <SessionPlayer
      sessionId={id}
      mode={loaded.session.mode}
      exam={loaded.session.exam}
      endsAt={loaded.session.endsAt ? loaded.session.endsAt.toISOString() : null}
      items={loaded.items}
    />
  );
}
