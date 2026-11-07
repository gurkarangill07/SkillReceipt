import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "../../lib/server/account-http";
import { ProfileAccess } from "../../components/account-actions";
import { ReceiptList } from "../../components/receipt-list";
import { Icon } from "../../components/icon";
export const metadata: Metadata = { title: "Candidate workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const account = await currentAccount();
  if (!account) redirect("/login?role=candidate"); if (account.role !== "candidate") redirect("/employer");
  return <div className="shell page-shell dashboard-page"><div className="page-heading"><div><p className="eyebrow">YOUR CANDIDATE WORKSPACE</p><h1>Welcome, {account.name.split(" ")[0]}.</h1><p className="page-lede">One place for your résumé, work samples and next steps.</p></div><Link className="button button-dark" href="/start">Find a work sample<Icon name="arrow" size={16} /></Link></div><div className="dashboard-top"><section className="panel profile-card"><p className="eyebrow">YOUR PROFILE</p><h2>Your background, ready to share.</h2><div className="candidate-id"><span>Candidate ID</span><strong>{account.candidateId}</strong></div><p className="small muted">{account.resume ? account.resume.name : "Add a résumé before sharing your profile with employers."}</p><div className="button-row"><Link href="/start" className="button button-outline button-small">{account.resume ? "Update résumé" : "Add résumé"}</Link>{account.resume && <a href="/api/profile/resume" className="text-link small">Download résumé</a>}</div></section><section className="panel next-step-card"><span className="tag">SHORT WORK SAMPLE</span><h2>Three decisions.<br />A little code.<br />A clear next step.</h2><p>Start with a friendly data-engineering scenario. Your results explain what worked and what to improve.</p><Link href="/challenge/junior-data-engineer" className="text-link">Explore the challenge<Icon name="arrow" size={16} /></Link></section></div><section className="dashboard-results"><div className="section-line-heading"><div><p className="eyebrow">PROGRESS, ONE ATTEMPT AT A TIME</p><h2>Your results</h2></div></div><ReceiptList /></section><ProfileAccess initial={account} /></div>;
}
