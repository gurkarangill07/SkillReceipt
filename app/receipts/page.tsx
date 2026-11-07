import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "../../components/icon";
import { ReceiptList } from "../../components/receipt-list";

export const metadata: Metadata = { title: "My receipts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function ReceiptsPage() {
  return <div className="shell page-shell receipts-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron" size={12} /><span aria-current="page">My receipts</span></nav><div className="page-heading"><div><p className="eyebrow">YOUR WORK, ON RECORD</p><h1>My receipts<span className="brand-dot">.</span></h1><p className="page-lede">A record of each submission. Room to keep practicing.</p></div><Link href="/assessment" className="button button-dark"><Icon name="plus" size={17} />Open the challenge</Link></div><div className="notice notice-neutral session-note"><Icon name="lock" /><p>These private receipts belong to this anonymous browser session. There are no accounts. Clearing cookies, an expired session, or changing browsers loses private access; receipts remain on the server until locally removed. There is no account recovery.</p></div><Suspense fallback={<div className="notice notice-neutral" role="status"><span className="spinner" />Loading your private receipts…</div>}><ReceiptList /></Suspense></div>;
}
