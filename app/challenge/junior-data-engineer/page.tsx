import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "../../../lib/server/account-http";
import { PipelineChallenge } from "../../../components/pipeline-challenge";
export const metadata: Metadata = { title: "Junior Data Engineer work sample" };
export default async function EngineerChallenge({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const account = await currentAccount(); if(!account) redirect("/login?role=candidate"); if(account.role !== "candidate") redirect("/employer");
  return <PipelineChallenge initialDemo={(await searchParams).demo === "1"} />;
}
