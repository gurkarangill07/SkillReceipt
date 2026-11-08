import { notFound } from "next/navigation";
import { ScenarioChallenge } from "../../../components/scenario-challenge";
import { getScenario, toClientScenario } from "../../../lib/scenarios";

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }) {
  const scenario = getScenario((await params).role);
  return { title: scenario ? `${scenario.title} challenge` : "Challenge unavailable" };
}
export default async function ChallengePage({ params }: { params: Promise<{ role: string }> }) {
  const scenario = getScenario((await params).role);
  if (!scenario) notFound();
  return <ScenarioChallenge key={scenario.id} scenario={toClientScenario(scenario)} />;
}
