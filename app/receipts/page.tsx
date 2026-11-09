import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "../../components/icon";
import { ReceiptList } from "../../components/receipt-list";
import { CandidatePublish } from "../../components/candidate-publish";
export const metadata: Metadata = { title: "My receipts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function ReceiptsPage() {
  return <div className="shell page-shell receipts-page"><div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>My results</h1><p className="page-lede">Your completed exercises and employer profile.</p></div><Link href="/start" className="button button-dark"><Icon name="plus" size={17} />Find an exercise</Link></div><CandidatePublish /><div className="notice notice-neutral session-note"><Icon name="lock" /><p>Saved for this browser for 30 days. Download your reports to keep a copy; clearing cookies removes private access.</p></div><Suspense fallback={<p role="status">Loading your results…</p>}><ReceiptList /></Suspense></div>;
}
