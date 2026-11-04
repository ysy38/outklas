import { LegalPage, legalMetadata } from "@/components/legal-page";
import { legalByPath } from "@/content/legal";

const doc = legalByPath("/mesafeli-satis")!;

export const dynamic = "force-static";
export const metadata = legalMetadata(doc);

export default function DistanceSalesPage() {
  return <LegalPage doc={doc} />;
}
