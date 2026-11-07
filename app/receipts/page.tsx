import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentAccount } from "../../lib/server/account-http";
import { Icon } from "../../components/icon";
import { ReceiptList } from "../../components/receipt-list";

export const metadata: Metadata = { title: "My scores", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ReceiptsPage() {
  const account = await currentAccount();
  if (account) redirect(account.role === "candidate" ? "/dashboard" : "/employer");
  return <div className="shell page-shell receipts-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron" size={12} /><span aria-current="page">My scores</span></nav><div className="page-heading"><div><p className="eyebrow">YOUR WORK, ON RECORD</p><h1>My scores<span className="brand-dot">.</span></h1><p className="page-lede">A record of each submission. Room to keep practicing.</p></div><Link href="/start" className="button button-dark"><Icon name="plus" size={17} />Choose a role</Link></div><div className="notice notice-neutral session-note"><Icon name="lock" /><p>These older receipts belong to this browser session. Create a candidate account to keep this session’s results with your account. Anonymous access depends on the original cookie; clearing or losing it removes access.</p></div><Suspense fallback={<div className="notice notice-neutral" role="status"><span className="spinner" />Loading your private receipts…</div>}><ReceiptList /></Suspense></div>;
}
