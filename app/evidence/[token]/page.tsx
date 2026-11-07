import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "../../../components/icon";
import { ReceiptView } from "../../../components/receipt-view";
import { getSharedEvidence } from "../../../lib/server/queries";

export const metadata: Metadata = { title: "Shared work evidence", robots: { index: false, follow: false, noarchive: true, nosnippet: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function SharedEvidencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const evidence = await getSharedEvidence(token);
  if (!evidence) notFound();
  if (evidence.submission.workSample) return <div className="shell page-shell receipt-page public-evidence"><div className="reviewer-note"><Icon name="file" size={17} />SHARED EVIDENCE · READ-ONLY REVIEWER VIEW</div><div className="page-heading"><div><p className="eyebrow">JUNIOR DATA ENGINEER / PIPELINE WORK SAMPLE</p><h1>The work behind the score.</h1><p className="page-lede">Inspect the submitted decisions, published checks and session conditions.</p></div><span className="tag">Owner-enabled sharing</span></div><ReceiptView evidence={evidence} /><p className="micro muted">This work sample does not verify identity, independent authorship or hiring suitability. Fresh requests become unavailable after the owner revokes the link.</p></div>;
  return <div className="shell page-shell receipt-page public-evidence"><div className="reviewer-note"><Icon name="file" size={17} /><span>SHARED EVIDENCE · READ-ONLY REVIEWER VIEW</span></div><div className="page-heading"><div><p className="eyebrow">SKILLRECEIPT / JUNIOR DATA ANALYST</p><h1>Sales data cleanup<span className="brand-dot">.</span></h1><p className="page-lede">Inspect the submitted artifact and how it was checked.</p></div><span className="tag">One task · published rules</span></div><div className="notice notice-neutral public-boundary"><Icon name="info" /><p>This is a record of one submitted artifact, not a verified identity, qualification, authorship claim, or hiring recommendation. The owner enabled this link and may revoke it; saved copies cannot be recalled.</p></div><ReceiptView evidence={evidence} /><p className="micro muted public-footer-note">This page contains shared evidence only. No owner session is needed to read an enabled link. Availability is checked on fresh server requests.</p></div>;
}
