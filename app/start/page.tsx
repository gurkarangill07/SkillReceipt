import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CareerStart } from "../../components/career-start";
import { currentAccount } from "../../lib/server/account-http";
export const metadata: Metadata = { title: "Choose your next role" };
export default async function StartPage() {
 const account = await currentAccount(); if (!account) redirect("/login?role=candidate"); if(account.role !== "candidate") redirect("/employer");
 return <div className="shell career-shell"><CareerStart account={account} /></div>;
}
