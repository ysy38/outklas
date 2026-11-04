import { LegalPage, legalMetadata } from "@/components/legal-page";
import { legalByPath } from "@/content/legal";

const doc = legalByPath("/gizlilik")!;

export const dynamic = "force-static";
export const metadata = legalMetadata(doc);

export default function PrivacyPage() {
  return <LegalPage doc={doc} />;
}
