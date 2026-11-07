import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "../../lib/server/account-http";
import { EmployerSearch } from "../../components/employer-search";
export const metadata: Metadata = { title: "Employer workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function EmployerPage() {
  const account = await currentAccount(); if (!account) redirect("/login?role=employer"); if (account.role !== "employer") redirect("/dashboard");
  return <div className="shell page-shell employer-page"><div className="page-heading"><div><p className="eyebrow">EMPLOYER WORKSPACE</p><h1>Look beyond the résumé.</h1><p className="page-lede">Find a candidate by ID. Review the work behind their score.</p></div><span className="tag">Signed in as {account.name}</span></div><EmployerSearch /></div>;
}
