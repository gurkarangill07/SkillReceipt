import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "../../../components/icon";
import { LocalCoach } from "../../../components/local-coach";
import { ReceiptView } from "../../../components/receipt-view";
import { ShareControls } from "../../../components/share-controls";
import { getCurrentReceipt } from "../../../lib/server/queries";

export const metadata: Metadata = { title: "Your private skill receipt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PrivateReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getCurrentReceipt(id);
  if (!receipt) notFound();
  return <div className="shell page-shell receipt-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/receipts" prefetch={false}>My receipts</Link><Icon name="chevron" size={12} /><span aria-current="page">Private receipt</span></nav><div className="page-heading"><div><p className="eyebrow">YOUR SKILL RECEIPT / JUNIOR DATA ANALYST</p><h1>Sales data cleanup<span className="brand-dot">.</span></h1><p className="page-lede">Your submitted work, with the checks to back it up.</p></div><span className="tag"><Icon name="lock" size={13} />Private owner view</span></div><ReceiptView evidence={receipt} /><section className="owner-actions" aria-labelledby="keep-title"><div><h2 id="keep-title">Keep the evidence. Keep practicing.</h2><p className="small muted">Downloads contain your actual submission. Starting again creates a new attempt and leaves this receipt unchanged.</p></div><div className="button-row"><a className="button button-outline button-small" href={`/api/receipts/${encodeURIComponent(receipt.id)}/download?format=csv`} download><Icon name="download" size={16} />Submitted CSV</a><a className="button button-outline button-small" href={`/api/receipts/${encodeURIComponent(receipt.id)}/download?format=json`} download><Icon name="download" size={16} />Evidence JSON</a><a className="button button-dark button-small" href="/assessment?fresh=1">Start another attempt<Icon name="arrow" size={16} /></a></div></section><ShareControls key={receipt.id} receiptId={receipt.id} initialToken={receipt.shareToken} /><LocalCoach key={`coach-${receipt.id}`} receiptId={receipt.id} checks={receipt.evaluation.checks} /></div>;
}
