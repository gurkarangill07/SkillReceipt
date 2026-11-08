"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ENGINEER_TASKS as SIMPLE_TASKS } from "../lib/exercise-catalog";
import { CODING_CASES, CODING_STARTER, type CodingRun } from "../lib/coding-fixtures";
import type { PipelineWork } from "../lib/contracts";
import { Icon } from "./icon";
import { AssessmentSession, useAssessmentSession } from "./assessment-session";
import { PipelineBrief, PipelineSource } from "./pipeline-brief";


export function PipelineChallenge({ initialDemo = false }: { initialDemo?: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<"brief" | "work" | "review">("brief");
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<PipelineWork["answers"]>({ key: "", missing: "", load: "" });
  const [code, setCode] = useState(CODING_STARTER);
  const [run, setRun] = useState<CodingRun | null>(null);
  const [demo, setDemo] = useState(initialDemo);
  const [pending, setPending] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const session = useAssessmentSession({ enabled: stage !== "brief", demo, exercise: "junior-data-engineer", progress: `${stage}:${question}` });
  async function runTests() {
    if (running || !session.canSubmit()) return;
    session.record("code_run");
    setRunning(true); setError("");
    try {
      const response = await fetch("/api/coding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tests could not run.");
      setRun(result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Try running the tests again."); }
    finally { setRunning(false); }
  }
  async function submit() {
    if (lock.current || !session.canSubmit()) return;
    lock.current = true; setPending(true); setError("");
    try {
      const prepared = await session.prepareSubmission();
      const response = await fetch("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demo, ...prepared, workSample: { kind: "data-engineer-v2", answers, code, session: prepared.session } }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (response.status !== 201) throw new Error(result.error || "Your result could not be saved.");
      session.finish();
      router.push(`/receipts/${result.id}`); router.refresh();
    } catch (failure) { session.submissionFailed(); setError(failure instanceof Error ? failure.message : "Please try again."); setPending(false); lock.current = false; }
  }
  async function loadExample() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/challenges/junior-data-engineer/example", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || !result.answers || typeof result.code !== "string") throw new Error(result.error || "The example could not load.");
      setDemo(true); setAnswers(result.answers); setCode(result.code); setRun(null); setStage("review");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setPending(false); }
  }
  async function loadSolution() {
    if (running) return;
    setRunning(true); setError("");
    try {
      const response = await fetch("/api/challenges/junior-data-engineer/example", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solution: true }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || typeof result.code !== "string") throw new Error(result.error || "The solution could not load.");
      setDemo(true); setCode(result.code); setRun(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setRunning(false); }
  }
  const task = SIMPLE_TASKS[question];
  return <div className="shell career-shell challenge-shell"><Link className="text-link small" href="/start">← All challenges</Link><div className="career-page-heading"><div><p className="eyebrow">JUNIOR DATA ENGINEER · WORK SAMPLE</p><h1>{stage === "brief" ? "Make an orders pipeline reliable." : stage === "review" ? "Review your work before scoring." : question === 3 ? "Implement and test the logic." : "Make a data quality decision."}</h1></div><span className="tag">{demo ? "Example attempt" : "5–8 min"}</span></div>
  <AssessmentSession checks={session} showcase />
  {stage === "brief" && <PipelineBrief />}
  {stage === "brief" ? <section className="panel simple-brief"><div><span className="tag">DATA ENGINEERING · SIMULATED SCENARIO</span><h2>Make a retailer’s order feed reliable.</h2><p>A retailer imports checkout orders into its daily revenue report. Failed imports retry the same batch, and one order is missing its amount. Choose how to identify orders, handle the incomplete row and make retries safe. Then write a JavaScript function to total valid amounts.</p><div className="simple-outline"><span><strong>3</strong>decisions</span><span><strong>1</strong>JavaScript task</span><span><strong>100</strong>possible points</span></div><details><summary>Scoring rules</summary><p>Each decision earns 20 points. Four published coding tests earn 10 points each. No timer.</p></details></div><div className="brief-actions"><button className="button button-dark" disabled={pending} onClick={() => setStage("work")}>Start work sample<Icon name="arrow" size={16} /></button><button className="text-button" disabled={pending} onClick={loadExample}>{pending ? "Loading example…" : "View worked example"}</button><p className="micro muted">An example result is labeled as a worked example.</p></div></section> : !session.started ? null : <div className="work-layout professional-test"><div className="work-main">{demo && <p className="demo-inline">Worked example · this label stays on the receipt.</p>}<fieldset className="challenge-fieldset" disabled={pending || session.paused}><legend className="sr-only">Data engineering work sample</legend>
  {stage === "review" ? <section className="panel review-panel"><p className="eyebrow">YOUR WORK IS READY</p><h2>Three decisions and your code.</h2><p>Your answers and all four coding cases will be checked on the server.</p><div className="review-checklist">{SIMPLE_TASKS.map((item) => <span key={item.id}>✓ {item.label}: {item.options.find((option) => option.value === answers[item.id])?.label}</span>)}<span>✓ JavaScript ready for testing</span></div><div className="question-actions"><button className="text-button" onClick={() => { setQuestion(0); setStage("work"); }}>Review answers</button><button className="text-button" onClick={() => { setQuestion(3); setStage("work"); }}>Review my code</button><button className="button button-dark" onClick={submit}>{pending ? "Checking…" : "Get my receipt"}<Icon name="arrow" size={16} /></button></div></section> : question < 3 ? <section className="panel question-panel"><p className="eyebrow">DECISION {question + 1} OF 3 · 20 POINTS</p><h2>{task.question}</h2><p>{task.why}</p><div className="answer-options">{task.options.map((option) => <label className={`answer-option ${answers[task.id] === option.value ? "selected" : ""}`} key={option.value}><input type="radio" name={task.id} checked={answers[task.id] === option.value} value={option.value} onChange={() => setAnswers((current) => ({ ...current, [task.id]: option.value }))} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</div><div className="question-actions"><button className="text-button" disabled={question === 0} onClick={() => setQuestion((current) => Math.max(0, current - 1))}>← Back</button><button className="button button-dark" disabled={!answers[task.id]} onClick={() => setQuestion((current) => current + 1)}>{question === 2 ? "Continue to code" : "Next"}<Icon name="arrow" size={16} /></button></div></section> : <section className="panel coding-panel"><div className="coding-intro"><p className="eyebrow">JAVASCRIPT TASK · 40 POINTS</p><h2>Add the valid order amounts.</h2><p>Complete <code>totalRevenue(orders)</code>. Add each numeric <code>revenueCents</code> value, skip <code>null</code>, and return the total as a number.</p><div className="code-example"><span>Example</span><code>1200 + null + 850 → 2050 cents</code></div></div><label htmlFor="candidate-code" className="code-toolbar"><span>solution.js</span><span>JavaScript</span></label><textarea id="candidate-code" className="code-editor" disabled={running} value={code} maxLength={5000} spellCheck={false} autoCapitalize="off" autoCorrect="off" onChange={(event) => { setCode(event.target.value); setRun(null); }} aria-describedby="code-help" /><p id="code-help" className="micro muted">Plain JavaScript · 5,000 characters max · isolated runner</p><div className="code-run-row"><button className="button button-outline button-small" onClick={runTests} disabled={running}>{running ? "Running…" : "Run tests"}</button>{run && <span className="tag" role="status">{run.passed} / {run.total} passed</span>}<details className="presenter-tools"><summary>Worked solution</summary><button className="text-button" disabled={running} onClick={loadSolution}>Load solution · labels this as an example</button></details></div><div className="coding-cases">{CODING_CASES.map((example, index) => <div key={example.label}><span className={`test-dot ${run?.tests[index]?.passed ? "passed" : ""}`} /><span>{example.label}</span><span>{run ? run.tests[index]?.passed ? "Passed" : "Not passed" : "10 points"}</span></div>)}</div><div className="question-actions"><button className="text-button" onClick={() => setQuestion(2)}>← Back</button><button className="button button-dark" disabled={!code.trim() || running} onClick={() => setStage("review")}>Review & finish<Icon name="arrow" size={16} /></button></div></section>}
  </fieldset>{error && <p className="notice notice-error" role="alert">{error}</p>}</div><aside className="work-sidebar panel"><p className="eyebrow">YOUR PROGRESS</p><h3>Orders, made reliable.</h3><ol>{[...SIMPLE_TASKS.map((item) => item.label), "JavaScript basics"].map((label, index) => <li className={question === index && stage === "work" ? "active" : ""} key={label}><span>{index + 1}</span>{label}</li>)}</ol><p className="micro muted">Take your time. You can go back and change any answer.</p><PipelineSource /></aside></div>}
    {stage === "brief" && error && <p className="notice notice-error" role="alert">{error}</p>}
  </div>;
}
