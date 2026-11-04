import { LegalPage, legalMetadata } from "@/components/legal-page";
import { legalByPath } from "@/content/legal";

const doc = legalByPath("/iade")!;

export const dynamic = "force-static";
export const metadata = legalMetadata(doc);

export default function RefundPage() {
  return <LegalPage doc={doc} />;
}
