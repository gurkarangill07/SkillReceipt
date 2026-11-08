import type { Metadata } from "next";
import { EmployerWorkspace } from "../../components/employer-workspace";
import "../employer.css";

export const metadata: Metadata = { title: "Review candidate work", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmployerPage({ searchParams }: { searchParams: Promise<{ candidate?: string; q?: string }> }) {
  const params = await searchParams;
  const candidate = typeof params.candidate === "string" && /^SR-[A-F0-9]{10}$/.test(params.candidate) ? params.candidate : "";
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  return <div className="shell page-shell"><EmployerWorkspace key={`${candidate}:${query}`} initialCandidateId={candidate} initialQuery={query} /></div>;
}
