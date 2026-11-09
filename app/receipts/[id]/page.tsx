import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "../../../components/icon";
import { ReceiptView } from "../../../components/receipt-view";
import { getScenario } from "../../../lib/scenarios";
import { ShareControls } from "../../../components/share-controls";
import { getCurrentReceipt } from "../../../lib/server/queries";
import { CandidatePublish } from "../../../components/candidate-publish";

export const metadata: Metadata = { title: "Your private skill score", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PrivateReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const receipt = await getCurrentReceipt((await params).id);
  if (!receipt) notFound();
  const scenario = receipt.submission.scenario ? getScenario(receipt.submission.scenario.roleId) : undefined;
  const career = Boolean(receipt.submission.workSample || scenario);
  return <div className="shell page-shell receipt-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/receipts" prefetch={false}>My results</Link><Icon name="chevron" size={12} /><span aria-current="page">Assessment report</span></nav><div className="page-heading"><div><p className="eyebrow">ASSESSMENT COMPLETE</p><h1>{scenario ? `${scenario.title} report` : career ? "Your data engineering report" : "Your data analysis report"}</h1><p className="page-lede">Your score, the work behind it, and what to improve.</p></div><span className="tag"><Icon name="lock" size={13} />Private report</span></div><ReceiptView evidence={receipt} privateView /><CandidatePublish /><section className="owner-actions" aria-labelledby="keep-title"><div><h2 id="keep-title">Keep a copy</h2><p className="small muted">Download your submitted work and its assessment.</p></div><div className="button-row"><a className="button button-outline button-small" href={`/api/receipts/${receipt.id}/download?format=csv`} download><Icon name="download" size={16} />Submitted work</a><a className="button button-outline button-small" href={`/api/receipts/${receipt.id}/download?format=json`} download><Icon name="download" size={16} />Detailed report</a><a className="button button-dark button-small" href={scenario ? `/challenge/${scenario.id}` : career ? "/challenge/junior-data-engineer" : "/assessment?fresh=1"}>Try again<Icon name="arrow" size={16} /></a></div></section><ShareControls key={receipt.id} receiptId={receipt.id} initialToken={receipt.shareToken} /></div>;
}
