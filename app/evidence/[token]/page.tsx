import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "../../../components/icon";
import { ReceiptView } from "../../../components/receipt-view";
import { getSharedEvidence } from "../../../lib/server/queries";
import { getScenario } from "../../../lib/scenarios";
export const metadata: Metadata = { title: "Shared receipt", robots: { index: false, follow: false, noarchive: true, nosnippet: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function SharedEvidencePage({ params }: { params: Promise<{ token: string }> }) {
  const evidence = await getSharedEvidence((await params).token);
  if (!evidence) notFound();
  const title = evidence.submission.scenario ? getScenario(evidence.submission.scenario.roleId)!.title : evidence.submission.workSample ? "Junior Data Engineer" : "Junior Data Analyst";
  return <div className="shell page-shell receipt-page public-evidence"><div className="reviewer-note"><Icon name="file" size={17} />SHARED RECEIPT · READ-ONLY</div><div className="page-heading"><div><p className="eyebrow">{title}</p><h1>The work behind the score.</h1><p className="page-lede">The task, the submitted answers, and every scoring rule.</p></div><span className="tag">Shared by its owner</span></div><ReceiptView evidence={evidence} /><p className="micro muted public-footer-note">A work-sample result. Identity and independent completion are not verified. The owner can turn this link off.</p></div>;
}
