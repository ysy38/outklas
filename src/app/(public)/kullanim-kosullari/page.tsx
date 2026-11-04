import { LegalPage, legalMetadata } from "@/components/legal-page";
import { legalByPath } from "@/content/legal";

const doc = legalByPath("/kullanim-kosullari")!;

export const dynamic = "force-static";
export const metadata = legalMetadata(doc);

export default function TermsPage() {
  return <LegalPage doc={doc} />;
}
