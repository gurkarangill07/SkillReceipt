"use client";

import { useRef, useState } from "react";
import type { CheckResult } from "../lib/contracts";
import { ApiRequestError, isRecord, postJson } from "../lib/client/http";
import { practiceFeedback } from "../lib/client/display";
import { Icon } from "./icon";

export function LocalCoach({ receiptId, checks }: { receiptId: string; checks: CheckResult[] }) {
  const [pending, setPending] = useState(false);
  const [advice, setAdvice] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const failed = checks.filter((check) => !check.passed);

  async function requestAdvice() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      // No user content or prompt is sent. The server reads the authorized result.
      const response = await postJson(`/api/receipts/${encodeURIComponent(receiptId)}/coach`, undefined, 50_000);
      if (response.status !== 200 || !isRecord(response.body) || response.body.assessed !== false || typeof response.body.advice !== "string" || !response.body.advice.trim() || response.body.advice.length > 6000 || typeof response.body.model !== "string" || response.body.model.length > 160) throw new Error("The coach returned an unusable response.");
      setAdvice(response.body.advice);
      setModel(response.body.model);
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.status === 429) setError("A practice request is already running or cooling down. Wait a moment before trying again.");
      else if (failure instanceof ApiRequestError && failure.status === 404) setError("This session can no longer request advice for this receipt. Your official evidence is unchanged.");
      else setError("The local practice coach is unavailable or took too long. Use the published-rule suggestions below. Your receipt, downloads, and sharing are still available.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <section className="coach-panel" aria-labelledby="coach-title"><div className="panel-title"><span className="round-icon"><Icon name="spark" size={20} /></span><div><p className="eyebrow">PRACTICE, AT YOUR PACE</p><h2 id="coach-title">A next step, beyond the score.</h2></div></div><p>Rules score your work. The local coach helps you practice. Advice is optional, separate from this receipt, and never shared as evidence.</p><div className="practice-feedback"><h3>From the published rules</h3>{failed.length ? <ul>{failed.map((check) => <li key={check.id}><strong>{check.label}: </strong>{practiceFeedback[check.id]}</li>)}</ul> : <p>Every check passed on this task. Try a different synthetic dataset with new missing-value and duplicate cases, and write down your reconciliation steps. This result does not establish general expertise.</p>}</div><button className="button button-outline" type="button" disabled={pending} onClick={requestAdvice}>{pending ? <><span className="spinner" />Asking the local coach…</> : <><Icon name="spark" size={16} />{advice ? "Get new practice suggestions" : "Get practice suggestions"}</>}</button><p className="micro muted" role="status">{pending ? "Waiting up to 50 seconds. Your official results remain available above." : "Only rubric descriptions and check outcomes are used. No name or reflection is sent."}</p>{error && <p className="notice notice-neutral" role="status">{error}</p>}{advice && <div className="coach-advice" aria-live="polite"><span className="tag">AI-generated practice advice · not assessed</span>{error && <p className="micro muted">Previous advice is shown below; the latest request did not succeed.</p>}<p className="plain-text">{advice}</p><span className="mono micro muted">Local model: {model} · excluded from official evidence</span></div>}</section>;
}
