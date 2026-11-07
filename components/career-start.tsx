"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ROLE_CATALOG } from "../lib/career";
import { Icon } from "./icon";

export function CareerStart() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<{ name: string; skills: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sample, setSample] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const roles = ROLE_CATALOG.filter((role) => `${role.title} ${role.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));

  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) || file.size > 2 * 1024 * 1024 || !file.size) { setError("Choose a nonempty PDF, DOCX or TXT résumé, up to 2 MB."); return; }
    setBusy(true); setError(""); setSample(false);
    try {
      const response = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-Resume-Name": encodeURIComponent(file.name) }, body: file, signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.skills)) throw new Error(result.error || "Please try another résumé file.");
      setProfile(result);
    } catch (failure) { setError(failure instanceof Error && failure.name !== "TimeoutError" ? failure.message : "The upload took too long. Try a smaller file."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <section className="career-flow" aria-labelledby="start-title">
    <ol className="flow-progress" aria-label="Your journey">{["Your background", "Your target role", "Work sample", "Your skill score"].map((label, index) => <li key={label} className={index + 1 <= step ? "current" : ""}><span>{index + 1 < step ? "✓" : index + 1}</span>{label}</li>)}</ol>
    <div className="start-panel panel">
      {step === 1 ? <><p className="eyebrow">LET’S START WITH YOU</p><h1 id="start-title">Your experience is the starting point.</h1><p className="start-lede">Add your résumé. Then choose the job you want to work toward.</p>
        <input ref={input} type="file" className="sr-only" id="resume-upload" accept=".pdf,.docx,.txt" onChange={(event) => upload(event.target.files?.[0])} disabled={busy} />
        <label htmlFor="resume-upload" className={`upload-zone ${busy ? "upload-busy" : ""}`}><span className="upload-symbol"><Icon name={profile ? "check" : "file"} size={30} /></span><strong>{busy ? "Reading your résumé…" : profile ? profile.name : "Choose your résumé"}</strong><span>{profile ? "Choose another file" : "PDF, DOCX or TXT · up to 2 MB"}</span></label>
        <p className="privacy-line"><Icon name="lock" size={14} />Read in memory on this local app. No file is saved or shared with employers.</p>
        {profile && <div className="resume-context"><span className="micro muted">{sample ? "Illustrative sample résumé" : "Mentioned in your résumé · self-reported"}</span><div className="skill-chips">{profile.skills.length ? profile.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>) : <span className="small">Résumé added. Choose your role next.</span>}</div><p className="micro muted">Your résumé never determines your assessment score.</p></div>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="start-actions"><button className="button button-dark" disabled={busy || !profile} onClick={() => setStep(2)}>Choose my role<Icon name="arrow" size={17} /></button><button className="text-button" disabled={busy} onClick={() => { setProfile({ name: "Sample résumé · for demonstration", skills: ["SQL", "Python", "ETL"] }); setSample(true); setError(""); }}>Use a sample résumé</button></div><button className="skip-resume text-button" disabled={busy} onClick={() => setStep(2)}>Continue without a résumé</button>
      </> : <><button className="text-button" onClick={() => setStep(1)}>← Your background</button><p className="eyebrow">ONE ROLE. WORK THAT FEELS FAMILIAR.</p><h1 id="start-title">What’s your next role?</h1><p className="start-lede">Choose a practical work sample built around a real job scenario.</p><label className="sr-only" htmlFor="role-search">Search supported job roles</label><div className="role-search"><Icon name="grid" size={19} /><input id="role-search" autoComplete="off" placeholder="Try “Junior Data Engineer”" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="role-results" aria-live="polite">{roles.map((role) => <Link key={role.id} href={role.id === "junior-data-engineer" ? `/challenge/junior-data-engineer${sample ? "?demo=1" : ""}` : "/assessment"} className="role-option"><div><span className="tag">{role.duration} · estimate</span><h2>{role.title}</h2><p>{role.subtitle}</p><div className="skill-chips">{role.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div><span className="round-icon"><Icon name="arrow" size={22} /></span></Link>)}{!roles.length && <p className="notice notice-neutral">This demo currently has Data Engineer and Data Analyst work samples. Try one of those roles.</p>}</div><p className="micro muted">A focused work sample checks specific skills. It doesn’t assess every requirement of a job.</p></>}
    </div>
  </section>;
}
