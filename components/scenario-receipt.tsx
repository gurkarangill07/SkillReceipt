import Link from "next/link";
import type { ReceiptEvidence } from "../lib/contracts";
import { EXERCISES } from "../lib/exercise-catalog";
import { Icon } from "./icon";

export function ScenarioReceipt({ evidence, privateView }: { evidence: ReceiptEvidence; privateView: boolean }) {
  const scenario = EXERCISES.find((exercise) => exercise.id === evidence.submission.scenario!.roleId)!;
  const { evaluation } = evidence;
  const failed = evaluation.checks.filter((check) => !check.passed);
  return <>
    {evidence.submission.demo && <p className="notice notice-demo"><Icon name="info" size={18} />Worked example · example answers were loaded during this attempt.</p>}
    <section className="result-overview"><div className="result-score"><p className="eyebrow">{scenario.title.toUpperCase()}</p><div className="score-number">{evaluation.score}<span>/100</span></div><span className="result-tier">{evaluation.tier}</span></div><div className="result-context"><span className="tag">{7 - failed.length} of 7 checks passed</span><h2>{failed.length ? "You know what to work on next." : "Every check passed. Nice work."}</h2><p>{scenario.subtitle}. This score covers the decisions and practical exercise below.</p></div></section>
    <section className="receipt-section"><p className="eyebrow">YOUR SKILL BREAKDOWN</p><h2>Every point, explained.</h2><div className="career-skill-grid">{evaluation.checks.map((check) => <article className="panel skill-result" key={check.id}><div><span className={`check-symbol ${check.passed ? "pass" : "fail"}`}><Icon name={check.passed ? "check" : "close"} size={14} /></span><h3>{check.label}</h3><strong>{check.pointsEarned}/{check.pointsPossible}</strong></div><p>{check.passed ? "Passed" : "Practice next"}</p><details><summary>Answer & scoring rule</summary><p>{check.rule}</p>{check.observations.map((observation) => <p className="small" key={observation}>{observation}</p>)}</details></article>)}</div></section>
    {privateView && <section className="practice-plan panel"><p className="eyebrow">YOUR NEXT STEPS</p><h2>{failed.length ? "Make your next attempt stronger." : "Try a different area."}</h2>{failed.length ? <ol>{failed.slice(0, 3).map((check) => <li key={check.id}><strong>{check.label}</strong><p>{check.observations.at(-1)}</p></li>)}</ol> : <p>Explore another challenge to build evidence across more skills.</p>}<div className="button-row"><Link className="button button-dark" href={`/challenge/${scenario.id}`}>Try again<Icon name="arrow" size={16} /></Link><Link className="text-link" href="/start">Find another exercise</Link></div></section>}
    <details className="panel evidence-drawer"><summary>Submitted answers & report details</summary><pre className="config-preview">{JSON.stringify(evidence.submission.scenario!.answers, null, 2)}</pre><dl><dt>Assessment / rubric</dt><dd>{evidence.assessmentVersion} / {evidence.rubricVersion}</dd><dt>Created</dt><dd>{evidence.createdAt}</dd><dt>Artifact fingerprint</dt><dd className="fingerprint-text">{evidence.fingerprint}</dd></dl><p className="micro muted">A score for this work sample. Identity and independent completion are not verified.</p></details>
  </>;
}
