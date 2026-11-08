"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CandidateProfile } from "../lib/people";
import { Icon } from "./icon";

export function CandidatePublish() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/candidate", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Your profile could not load. Refresh this page to retry.");
      const data = await response.json(); if (!controller.signal.aborted) setCandidate(data.candidate);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function publish() {
    if (!candidate || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/candidate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visible: !candidate.visible }), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || !data.candidate) throw new Error(data.error || "Your sharing setting could not be saved.");
      setCandidate(data.candidate);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Try again."); }
    finally { setBusy(false); lock.current = false; }
  }
  return <section className="candidate-publish panel" aria-label="Employer visibility"><div><p className="eyebrow">YOUR EMPLOYER PROFILE</p><h2>{candidate?.visible ? "Employers can find your work." : "Let your work open the conversation."}</h2><p>{candidate ? "Publishing makes your name, resume skill summary and all completed results available in employer search, including labeled examples. You can turn it off anytime." : "Add your name and resume to connect your results to your candidate profile."}</p>{candidate && <p className="candidate-label"><strong>{candidate.name}</strong><span className="mono">{candidate.id}</span><span className="tag">{candidate.visible ? "Visible to employers" : "Private"}</span></p>}</div><div className="candidate-publish-actions">{loading ? <p role="status">Loading profile…</p> : candidate ? <><button className={`button ${candidate.visible ? "button-outline" : "button-dark"}`} disabled={busy} onClick={publish}>{busy ? "Saving…" : candidate.visible ? "Hide from employer search" : "Publish profile for employers"}</button>{candidate.visible && <Link className="text-link" href={`/employer?candidate=${candidate.id}`}>View as an employer<Icon name="arrow" size={16} /></Link>}</> : <Link href="/start" className="button button-dark">Add my background<Icon name="arrow" size={16} /></Link>}</div>{error && <p className="notice notice-error" role="alert">{error}</p>}</section>;
}
