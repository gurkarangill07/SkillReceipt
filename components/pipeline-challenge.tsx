"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PIPELINE_TASKS, simulatePipeline } from "../lib/career";
import type { PipelineWork, SessionContext } from "../lib/contracts";
import { Icon } from "./icon";

const blankAnswers = () => Object.fromEntries(PIPELINE_TASKS.map((task) => [task.id, ""])) as PipelineWork["answers"];

export function PipelineChallenge({ initialDemo = false }: { initialDemo?: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<"brief" | "setup" | "work" | "review">("brief");
  const [answers, setAnswers] = useState(blankAnswers);
  const [question, setQuestion] = useState(0);
  const [mode, setMode] = useState<SessionContext["mode"]>("camera");
  const [consent, setConsent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraEverStarted, setCameraEverStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [demo, setDemo] = useState(initialDemo);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [switches, setSwitches] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const interrupted = useRef(0);
  const seconds = useRef(0);
  const lock = useRef(false);
  const cameraRequest = useRef(0);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream.current;
  }, [stage, cameraReady]);
  useEffect(() => () => { cameraRequest.current += 1; stream.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    if (stage !== "work" && stage !== "review") return;
    const visibility = () => {
      if (document.hidden) { setSwitches((count) => count + 1); setPaused(true); }
    };
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => { if (!document.hidden && !paused && !pending) seconds.current += 1; }, 1000);
    return () => { document.removeEventListener("visibilitychange", visibility); clearInterval(timer); };
  }, [stage, paused, pending]);

  function stopCamera() {
    cameraRequest.current += 1; setCameraBusy(false);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null; setCameraReady(false);
  }

  async function enableCamera() {
    if (!consent || cameraBusy) return;
    setCameraBusy(true); setError("");
    const requestId = ++cameraRequest.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs localhost or HTTPS and a supported browser.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false });
      if (requestId !== cameraRequest.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = media; setCameraReady(true); setCameraEverStarted(true);
      media.getVideoTracks()[0]?.addEventListener("ended", () => { setCameraReady(false); setPaused(true); interrupted.current += 1; });
    } catch { if (requestId === cameraRequest.current) setError("Camera access wasn’t available. Allow it in your browser and retry, or use practice mode without a camera."); }
    finally { if (requestId === cameraRequest.current) setCameraBusy(false); }
  }

  function presentation() {
    stopCamera(); setDemo(true); setMode("presentation"); setConsent(true); setError("");
    setAnswers(Object.fromEntries(PIPELINE_TASKS.map((task) => [task.id, task.id === "schema" ? "strings" : task.id === "partition" ? "ingestion_date" : task.correct])) as PipelineWork["answers"]);
    setStage("review");
  }

  async function submit() {
    if (lock.current || paused || PIPELINE_TASKS.some((task) => !answers[task.id])) return;
    lock.current = true; setPending(true); setError("");
    const session: SessionContext = { mode, cameraStarted: cameraEverStarted, tabSwitches: switches, interruptions: interrupted.current, activeSeconds: Math.min(seconds.current, 86_400) };
    try {
      const response = await fetch("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: [], total: "", displayName: "", reflection: "", demo, workSample: { kind: "data-pipeline-v1", answers, session } }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (response.status !== 201 || typeof result.id !== "string") throw new Error(result.error || "Your score couldn’t be saved. Please try again.");
      stopCamera(); router.push(`/receipts/${result.id}`); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); lock.current = false; setPending(false); }
  }

  const task = PIPELINE_TASKS[question];
  const simulation = simulatePipeline(answers);
  const active = stage === "work" || stage === "review";
  return <div className="shell career-shell challenge-shell">
    <Link href="/start" className="text-link small">← Choose another role</Link>
    <div className="career-page-heading"><div><p className="eyebrow">JUNIOR DATA ENGINEER / PRACTICAL WORK SAMPLE</p><h1>{stage === "brief" ? "Your first day on the data team." : stage === "setup" ? "A fair start. Clear conditions." : stage === "review" ? "Review your pipeline." : "Build a reliable pipeline."}</h1></div><span className="tag">{demo ? "Demo attempt" : "12–15 min estimate"}</span></div>
    {stage === "brief" && <div className="challenge-brief-layout"><section className="panel scenario-card"><p className="eyebrow">THE SITUATION</p><h2>The morning orders feed has a problem.</h2><p>A retailer’s export contains repeated orders, a later correction and an order with missing revenue. Yesterday’s job might retry, too.</p><p>Your job: configure a pipeline that keeps accurate orders, handles exceptions and can safely run again.</p><div className="pipeline-diagram"><span>Raw orders</span><Icon name="arrow" size={16} /><span>Your pipeline</span><Icon name="arrow" size={16} /><span>Reporting table</span></div><details className="brief-rubric"><summary>What earns the 100 points?</summary>{PIPELINE_TASKS.map((item) => <p key={item.id}><strong>{item.label} · {item.points} pts</strong><br />{item.why}</p>)}</details><p className="micro muted">Synthetic scenario. Six configuration decisions, not a full SQL/Python/cloud assessment. No speed scoring.</p></section><aside className="panel brief-start"><span className="round-icon"><Icon name="grid" size={24} /></span><h2>Real decisions.<br />Visible evidence.</h2><div className="skill-chips">{PIPELINE_TASKS.map((item) => <span className="tag" key={item.id}>{item.label}</span>)}</div><button className="button button-dark" onClick={() => setStage("setup")}>Set up my session<Icon name="arrow" size={16} /></button><button className="text-button" onClick={presentation}>Presenter demo · sample attempt</button><p className="micro muted">Your result starts private. You decide whether to share it.</p></aside></div>}
    {stage === "setup" && <section className="panel session-setup"><div><p className="eyebrow">FOCUSED SESSION</p><h2>Know what’s observed.</h2><p>In camera mode, your camera preview stays on this device. We count when the test tab becomes hidden and pause the workspace until you return.</p><ul className="session-facts"><li>No video or audio is recorded or uploaded.</li><li>No other tabs, browsing history or screen contents are read.</li><li>Session counts are client-reported context, not proof of identity or cheating. They never reduce your skill score.</li></ul><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand the session conditions and that counts will appear with evidence if I choose to share it.</span></label><div className="start-actions">{mode === "camera" && !cameraReady && <button className="button button-outline" onClick={enableCamera} disabled={!consent || cameraBusy}>{cameraBusy ? "Waiting for camera permission…" : "Enable local camera preview"}</button>}<button className="button button-dark" disabled={!consent || (mode === "camera" && !cameraReady)} onClick={() => { setPaused(false); setStage("work"); setError(""); }}>Start work sample<Icon name="arrow" size={16} /></button></div><button className="text-button skip-resume" onClick={() => { stopCamera(); setMode(mode === "practice" ? "camera" : "practice"); }}>{mode === "practice" ? "Use camera mode instead" : "Use practice mode without a camera"}</button>{mode === "practice" && <p className="notice notice-neutral">Practice mode · camera off. This condition stays visible with your result.</p>}{error && <p className="notice notice-error" role="alert">{error}</p>}</div><div className="camera-preview"><video ref={video} muted autoPlay playsInline aria-label="Your local camera preview" />{!cameraReady && <span>Camera preview<br /><small>Only on this device</small></span>}</div></section>}
    {active && <div className="work-layout"><div className="work-main">
      <div className="session-strip" role="status"><span><span className={`status-dot ${mode === "camera" && cameraReady ? "" : "status-neutral"}`} />{mode === "camera" ? cameraReady ? "Local camera preview on" : "Camera interrupted" : mode === "presentation" ? "Presentation demo · no camera" : "Practice mode · camera off"}</span><span>{switches} tab visibility {switches === 1 ? "change" : "changes"}</span></div>
      {demo && <p className="notice notice-demo">Demo attempt · labeled in your result and employer evidence.</p>}
      {paused && <div className="panel pause-panel" role="alert"><h2>Your session is paused.</h2><p>The test tab was hidden or the camera stopped. This is recorded as context, not a cheating finding.</p>{mode === "camera" && !cameraReady ? <button className="button button-outline" onClick={enableCamera} disabled={cameraBusy}>Reconnect camera</button> : <button className="button button-dark" onClick={() => setPaused(false)}>I’m ready to continue</button>}</div>}
      <fieldset className="challenge-fieldset" disabled={paused || pending}>
        <legend className="sr-only">{stage === "work" ? task.question : "Review and submit your pipeline configuration"}</legend>
        {stage === "work" ? <section className="panel question-panel"><p className="eyebrow">DECISION {question + 1} OF 6 · {task.points} POINTS</p><h2>{task.question}</h2><p>{task.why}</p><div className="answer-options">{task.options.map((option) => <label key={option.value} className={`answer-option ${answers[task.id] === option.value ? "selected" : ""}`}><input type="radio" name={task.id} value={option.value} checked={answers[task.id] === option.value} onChange={() => setAnswers((current) => ({ ...current, [task.id]: option.value }))} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</div><div className="question-actions"><button className="text-button" disabled={question === 0} onClick={() => setQuestion((index) => index - 1)}>← Previous</button><button className="button button-dark" disabled={!answers[task.id]} onClick={() => question < 5 ? setQuestion((index) => index + 1) : setStage("review")}>{question < 5 ? "Next decision" : "Run my pipeline"}<Icon name="arrow" size={16} /></button></div></section> : <section className="panel review-panel"><p className="eyebrow">SIMULATED RUN · SMALL SYNTHETIC FIXTURE</p><h2>Here’s what your configuration does.</h2><p className="small muted">Five incoming rows include a repeated correction and one missing amount. This preview is not your official score.</p><div className="run-metrics"><div><span>Incoming rows</span><strong>{simulation.input}</strong></div><div><span>Reporting rows</span><strong>{simulation.retained}</strong></div><div><span>Quarantined</span><strong>{simulation.quarantine}</strong></div><div><span>Rows after retry</span><strong>{simulation.afterRetry}</strong></div></div><div className="run-total"><span>Reporting revenue</span><strong>CAD {simulation.revenue.toFixed(2)}</strong></div><details><summary>Inspect the submitted configuration</summary><pre className="config-preview">{JSON.stringify(answers, null, 2)}</pre></details><div className="question-actions"><button className="text-button" onClick={() => setStage("work")}>← Review my decisions</button><button className="button button-dark" onClick={submit}>{pending ? "Checking and saving…" : "Get my skill score"}<Icon name="arrow" size={16} /></button></div><p className="micro muted">The server checks all six published rules. Your result is private until you enable sharing.</p></section>}
      </fieldset>{error && <p className="notice notice-error" role="alert">{error}</p>}
    </div><aside className="work-sidebar panel"><p className="eyebrow">YOUR WORK SAMPLE</p><h3>Orders ingestion</h3><ol>{PIPELINE_TASKS.map((item, index) => <li key={item.id} className={stage === "work" && question === index ? "active" : ""}><span>{answers[item.id] ? "✓" : index + 1}</span>{item.label}</li>)}</ol>{mode === "camera" && <><div className="mini-camera"><video ref={video} muted autoPlay playsInline aria-label="Local camera preview during test" /></div><button className="text-button small" onClick={() => { stopCamera(); interrupted.current += 1; setPaused(true); }}>Stop camera & pause</button></>}<p className="micro muted">Your résumé is not part of this submission. Only your decisions are scored.</p></aside></div>}
  </div>;
}
