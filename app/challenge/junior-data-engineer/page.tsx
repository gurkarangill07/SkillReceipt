import type { Metadata } from "next";
import { PipelineChallenge } from "../../../components/pipeline-challenge";
export const metadata: Metadata = { title: "Junior Data Engineer work sample" };
export default async function EngineerChallenge({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  return <PipelineChallenge initialDemo={(await searchParams).demo === "1"} />;
}
