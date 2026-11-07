import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "../../../components/icon";
import { LocalCoach } from "../../../components/local-coach";
import { ReceiptView } from "../../../components/receipt-view";
import { ShareControls } from "../../../components/share-controls";
import { getCurrentReceipt } from "../../../lib/server/queries";

export const metadata: Metadata = { title: "Your private skill score", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PrivateReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const receipt = await getCurrentReceipt((await params).id);
  if (!receipt) notFound();
  const career = Boolean(receipt.submission.workSample);
  return <div className="shell page-shell receipt-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/receipts" prefetch={false}>My scores</Link><Icon name="chevron" size={12} /><span aria-current="page">Private result</span></nav><div className="page-heading"><div><p className="eyebrow">{career ? "YOUR ROLE-FOCUSED SKILL SCORE" : "YOUR SKILL RECEIPT / JUNIOR DATA ANALYST"}</p><h1>{career ? "Your next step, made clear." : "Sales data cleanup."}</h1><p className="page-lede">{career ? "A result you can understand. A plan you can use." : "Your submitted work, with the checks to back it up."}</p></div><span className="tag"><Icon name="lock" size={13} />Private owner view</span></div><ReceiptView evidence={receipt} privateView /><section className="owner-actions" aria-labelledby="keep-title"><div><h2 id="keep-title">Keep your evidence.</h2><p className="small muted">Download the exact submission and result. Every new attempt is a separate record.</p></div><div className="button-row"><a className="button button-outline button-small" href={`/api/receipts/${receipt.id}/download?format=csv`} download><Icon name="download" size={16} />{career ? "Work sample CSV" : "Submitted CSV"}</a><a className="button button-outline button-small" href={`/api/receipts/${receipt.id}/download?format=json`} download><Icon name="download" size={16} />Evidence JSON</a><a className="button button-dark button-small" href={career ? "/challenge/junior-data-engineer" : "/assessment?fresh=1"}>Start another attempt<Icon name="arrow" size={16} /></a></div></section><ShareControls key={receipt.id} receiptId={receipt.id} initialToken={receipt.shareToken} /><details className="optional-coach"><summary>Optional local practice coach</summary><LocalCoach receiptId={receipt.id} checks={receipt.evaluation.checks} /></details></div>;
}
