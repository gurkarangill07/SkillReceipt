"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientScenario } from "../lib/scenarios";
type ScenarioField = ClientScenario["questions"][number];
import { Icon } from "./icon";
import { AssessmentSession, useAssessmentSession } from "./assessment-session";

export function ScenarioChallenge({ scenario }: { scenario: ClientScenario }) {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [demo, setDemo] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const session = useAssessmentSession({ enabled: step >= 0, demo });
  const fields = [...scenario.questions, ...scenario.exercise];
  const complete = fields.every((field) => Boolean(answers[field.id]?.trim()));
  async function loadExample() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/challenges/${scenario.id}/example`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || !result.answers || typeof result.answers !== "object" || fields.some((field) => typeof result.answers[field.id] !== "string")) throw new Error(result.error || "The example could not load. Please try again.");
      setDemo(true);
      setAnswers(result.answers); setStep(3);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The example could not load."); }
    finally { setPending(false); }
  }
  async function submit() {
    if (lock.current || !complete || !session.canSubmit()) return;
    lock.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demo, session: session.snapshot(), scenario: { kind: "scenario-v1", roleId: scenario.id, answers } }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (response.status !== 201) throw new Error(result.error || "Your result could not be saved.");
      session.finish();
      router.push(`/receipts/${result.id}`); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); lock.current = false; setPending(false); }
  }
  function input(field: ScenarioField) {
    return field.options ? <div className="answer-options">{field.options.map((option) => <label className={`answer-option ${answers[field.id] === option.value ? "selected" : ""}`} key={option.value}><input type="radio" name={field.id} value={option.value} checked={answers[field.id] === option.value} onChange={() => setAnswers((current) => ({ ...current, [field.id]: option.value }))} /><span><strong>{option.label}</strong></span></label>)}</div> : <label className="numeric-answer"><span className="sr-only">{field.label}</span><input type="text" inputMode="decimal" autoComplete="off" maxLength={100} placeholder="Your answer" value={answers[field.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} /></label>;
  }
  return <div className="shell career-shell challenge-shell"><Link className="text-link small" href="/start">← All challenges</Link><div className="career-page-heading"><div><p className="eyebrow">{scenario.title.toUpperCase()}</p><h1>{step < 0 ? scenario.subtitle : step < 3 ? "Make your call." : "Put it into practice."}</h1></div><span className="tag">{demo ? "Example attempt" : scenario.duration}</span></div>
    <AssessmentSession checks={session} />
    {step < 0 ? <section className="panel simple-brief"><div><span className="tag">{scenario.category} · Starter</span><h2>{scenario.subtitle}</h2><p>{scenario.brief}</p><div className="simple-outline"><span><strong>3</strong>decisions</span><span><strong>1</strong>practical exercise</span><span><strong>100</strong>possible points</span></div><details><summary>Scoring rules</summary><p>Three decisions earn 20 points each. Four practical checks earn 10 points each. You can review every rule after submitting. No timer.</p></details></div><div className="brief-actions"><button className="button button-dark" onClick={() => setStep(0)}>Start challenge<Icon name="arrow" size={16} /></button><button className="text-button" disabled={pending} onClick={loadExample}>{pending ? "Loading example…" : "Try a worked example"}</button><p className="micro muted">Examples are labeled on the receipt.</p></div></section> : !session.started ? null : <div className="work-layout scenario-layout"><div><ol className="flow-progress" aria-label="Challenge progress">{["Decisions", "Practical exercise", "Your receipt"].map((label, index) => <li key={label} className={index <= (step < 3 ? 0 : 1) ? "current" : ""}><span>{index + 1}</span>{label}</li>)}</ol>{demo && <p className="demo-inline">Worked example · you can edit the answers. The example label stays on the receipt.</p>}<fieldset className="challenge-fieldset" disabled={pending || session.paused}><legend className="sr-only">{scenario.title} challenge</legend>{step < 3 ? <section className="panel question-panel"><p className="eyebrow">DECISION {step + 1} OF 3 · 20 POINTS</p><h2 tabIndex={-1} key={step}>{scenario.questions[step].prompt}</h2>{input(scenario.questions[step])}<div className="question-actions"><button className="text-button" onClick={() => setStep((current) => current - 1)}>← Back</button><button className="button button-dark" disabled={!answers[scenario.questions[step].id]} onClick={() => setStep((current) => current + 1)}>{step === 2 ? "Open exercise" : "Next"}<Icon name="arrow" size={16} /></button></div></section> : <section className="panel question-panel practical-panel"><p className="eyebrow">PRACTICAL EXERCISE · 40 POINTS</p><h2>{scenario.exerciseTitle}</h2><div className="practical-fields">{scenario.exercise.map((field, index) => <div key={field.id} className="practical-field"><div className="practical-label"><strong>{index + 1}. {field.label}</strong><span className="micro muted">10 points</span></div><p>{field.prompt}</p>{input(field)}</div>)}</div><div className="question-actions"><button className="text-button" onClick={() => setStep(2)}>← Review decisions</button><button className="button button-dark" disabled={!complete} onClick={submit}>{pending ? "Checking your work…" : "Get my receipt"}<Icon name="arrow" size={16} /></button></div></section>}</fieldset>{error && <p className="notice notice-error" role="alert">{error}</p>}</div><aside className="work-sidebar panel scenario-source"><p className="eyebrow">YOUR SOURCE MATERIAL</p><h3>{scenario.artifactTitle}</h3><pre>{scenario.artifact}</pre><p className="micro muted">Use these facts for your answers. Take your time.</p><details><summary>Worked example</summary><p className="small muted">Load a completed example to explore the result. Your receipt will be labeled.</p><button className="text-button" disabled={pending} onClick={loadExample}>Load example answers</button></details></aside></div>}
    {step < 0 && error && <p className="notice notice-error" role="alert">{error}</p>}
  </div>;
}
