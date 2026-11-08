"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CandidateProfile } from "../lib/people";
import { EXERCISES, recommendExercises } from "../lib/recommendations";
import { Icon } from "./icon";

export function CareerStart() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [resume, setResume] = useState<CandidateProfile["resume"]>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const saveLock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/candidate", { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Your workspace could not load. Refresh to try again.");
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (data.candidate) { setCandidate(data.candidate); setName(data.candidate.name); setResume(data.candidate.resume); setStep(2); }
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function upload(file?: File) {
    if (!file || busy) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) || !file.size || file.size > 2 * 1024 * 1024) { setError("Choose a PDF, DOCX or TXT résumé, up to 2 MB."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-Resume-Name": encodeURIComponent(file.name) }, body: file, signal: AbortSignal.timeout(25_000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.skills)) throw new Error(data.error || "This file could not be read. Try a text-based résumé.");
      setResume(data);
    } catch (failure) { setError(failure instanceof Error && failure.name !== "TimeoutError" ? failure.message : "The file took too long to read. Try a smaller TXT file."); }
    finally { setBusy(false); if (uploadRef.current) uploadRef.current.value = ""; }
  }
  async function sample() {
    if (!name.trim()) setName("Alex Morgan");
    await upload(new File(["Alex Morgan\nEarly-career developer\nJavaScript, SQL, Python and ETL. Built small data pipelines and cleaned sales exports.\n"], "sample-resume.txt", { type: "text/plain" }));
  }
  async function save() {
    if (saveLock.current || !name.trim()) return;
    saveLock.current = true; setSaving(true); setError("");
    try {
      const response = await fetch("/api/candidate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), resume }), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || !data.candidate) throw new Error(data.error || "Your workspace could not be saved.");
      setCandidate(data.candidate); setStep(2); setShowAll(false); setQuery("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setSaving(false); saveLock.current = false; }
  }
  const ranked = recommendExercises(resume?.skills ?? []);
  const matched = ranked.filter((exercise) => exercise.matchedSkills.length > 0);
  const available = (showAll || !matched.length ? ranked : matched.slice(0, 3)).filter((exercise) => `${exercise.title} ${exercise.skills.join(" ")} ${exercise.resumeSignals.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  if (loading) return <p className="workspace-loading" role="status">Loading your workspace…</p>;
  return <section className="candidate-journey" aria-labelledby="start-title">
    <ol className="journey-steps" aria-label="Your next steps">{["Your résumé", "Skill exercises", "Score & report"].map((label, index) => <li key={label} className={index + 1 <= step ? "active" : ""}><span>{index + 1}</span>{label}</li>)}</ol>
    {step === 1 ? <div className="resume-layout"><div className="resume-intro"><p className="eyebrow">FOR JOB SEEKERS</p><h1 id="start-title">Start with your résumé.</h1><p>We’ll find the skills you’ve listed and suggest a short exercise to put them to the test.</p><div className="resume-process"><div><Icon name="file" size={20} /><span>Upload a résumé</span></div><div><Icon name="grid" size={20} /><span>Choose a suggested exercise</span></div><div><Icon name="receipt" size={20} /><span>Get a score employers can inspect</span></div></div><p className="small muted">No account or password. Your workspace belongs to this browser.</p></div><form className="panel resume-form" onSubmit={(event) => { event.preventDefault(); void save(); }}><label htmlFor="candidate-name">What should we call you?</label><input className="text-input" id="candidate-name" autoComplete="name" placeholder="Your name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} disabled={saving || busy} required /><label className="upload-zone" htmlFor="resume-upload"><span className="upload-symbol"><Icon name={resume ? "check" : "file"} size={28} /></span><strong>{busy ? "Reading your résumé…" : resume ? resume.name : "Choose your résumé"}</strong><span>PDF, DOCX or TXT · up to 2 MB</span></label><input ref={uploadRef} id="resume-upload" className="sr-only" type="file" accept=".pdf,.docx,.txt" disabled={busy || saving} onChange={(event) => void upload(event.target.files?.[0])} />{resume && <div className="resume-recognized"><p className="micro muted">Skills mentioned in your résumé</p><div className="skill-chips">{resume.skills.length ? resume.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>) : <p className="small">No catalog skills found. You can still choose an exercise.</p>}</div></div>}<p className="micro muted">Only the filename and recognized skills are saved. The original document and its text are not retained. A résumé never earns points.</p>{error && <p className="notice notice-error" role="alert">{error}</p>}<button type="submit" className="button button-dark" disabled={busy || saving || !name.trim()}>{saving ? "Saving…" : resume ? "Find my exercises" : "Choose an exercise"}<Icon name="arrow" size={17} /></button><button type="button" className="text-button" disabled={busy || saving} onClick={() => void sample()}>Use a sample résumé</button>{!resume && <p className="micro muted">You can also continue with your name and choose a skill yourself.</p>}</form></div> : <>
      <div className="recommendation-heading"><div><p className="eyebrow">{candidate?.name} · YOUR NEXT STEP</p><h1 id="start-title">{matched.length ? "Recommended exercises" : "Choose a skill to test"}</h1><p>{matched.length ? "Based on the skills in your résumé. Pick one to see what you can show." : "Pick a practical exercise. Your work determines the score."}</p></div><button className="text-button" onClick={() => setStep(1)}>{resume ? "Change résumé" : "Add résumé"}</button></div>
      <div className="candidate-context panel"><div><span className="micro muted">YOUR CANDIDATE ID</span><strong className="mono">{candidate?.id}</strong></div><div className="skill-chips">{resume?.skills.slice(0, 9).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div><Link href="/receipts" className="text-link small">My results<Icon name="arrow" size={15} /></Link></div>
      <div className="recommendation-tools"><p className="small muted">{showAll ? `${EXERCISES.length} exercises available` : matched.length ? "Suggested for your background" : "All exercises"}</p><button className="text-button" onClick={() => { setShowAll(!showAll); setQuery(""); }}>{showAll && matched.length ? "Show recommendations" : "Browse all exercises"}</button></div>{showAll && <label className="role-search"><Icon name="grid" size={19} /><span className="sr-only">Search exercises</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a skill or role…" /></label>}
      <div className="challenge-grid">{available.map((exercise) => <Link href={exercise.href} className="panel challenge-card" key={exercise.id}><div className="challenge-card-top"><span className="tag">{exercise.category}</span><span className="micro muted">{exercise.duration}</span></div><div><h2>{exercise.title}</h2><p>{exercise.subtitle}</p></div><div className="skill-chips">{exercise.skills.slice(0, 3).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>{exercise.matchedSkills.length > 0 && <p className="recommendation-reason">Matches your résumé: {exercise.matchedSkills.join(", ")}</p>}<div className="challenge-card-bottom"><span>View exercise</span><Icon name="arrow" size={19} /></div></Link>)}</div>{!available.length && <div className="empty-state panel"><h2>No exercises matched.</h2><button className="text-button" onClick={() => setQuery("")}>Clear search</button></div>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}<p className="catalog-note small muted"><Icon name="lock" size={15} />Your profile stays private until you choose to appear in employer search.</p>
    </>}
  </section>;
}
