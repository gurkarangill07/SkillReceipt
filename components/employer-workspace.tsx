"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ReceiptEvidence } from "../lib/contracts";
import type { CandidateReport, CandidateSearchResult } from "../lib/people";
import { Icon } from "./icon";
import { ReceiptView } from "./receipt-view";

type Search = { query: string; minScore: string; includeExamples: boolean };
const roleNames: Record<string, string> = {
  "frontend-developer": "Frontend Developer",
  "qa-engineer": "QA Engineer",
  "product-analyst": "Product Analyst",
  "security-analyst": "Cybersecurity Analyst",
};
function reportTitle(report: ReceiptEvidence) {
  if (report.submission.scenario) return roleNames[report.submission.scenario.roleId] ?? "Work sample";
  return report.submission.workSample ? "Data Engineering" : "Data Analysis";
}
function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function EmployerWorkspace({ initialCandidateId = "", initialQuery = "" }: { initialCandidateId?: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [minScore, setMinScore] = useState("0");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [search, setSearch] = useState<Search>({ query: initialQuery, minScore: "0", includeExamples: true });
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [candidateId, setCandidateId] = useState(initialCandidateId);
  const [candidate, setCandidate] = useState<CandidateReport | null>(null);
  const [reportIndex, setReportIndex] = useState(0);
  const [reportLoading, setReportLoading] = useState(Boolean(initialCandidateId));
  const [reportError, setReportError] = useState("");
  const [reportRetry, setReportRetry] = useState(0);
  const reportHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setSearchError("");
    const params = new URLSearchParams({ q: search.query, minScore: search.minScore, includeExamples: String(search.includeExamples) });
    void (async () => {
      try {
        const response = await fetch(`/api/employer/search?${params}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.candidates)) throw new Error(body.error || "Candidate search is unavailable. Please try again.");
        if (!controller.signal.aborted) setResults(body.candidates);
      } catch (error) {
        if (!controller.signal.aborted) { setResults([]); setSearchError(error instanceof Error ? error.message : "Candidate search is unavailable. Please try again."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [search]);

  useEffect(() => {
    if (!candidateId) { setCandidate(null); setReportError(""); setReportLoading(false); return; }
    const controller = new AbortController();
    setReportLoading(true); setReportError(""); setCandidate(null); setReportIndex(0);
    void (async () => {
      try {
        const response = await fetch(`/api/employer/candidates/${encodeURIComponent(candidateId)}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !body.candidate || !Array.isArray(body.reports) || !body.reports.length) {
          throw new Error(response.status === 404 ? "This profile is no longer available. The candidate may have turned off employer access." : body.error || "The report could not be loaded. Please try again.");
        }
        if (!controller.signal.aborted) setCandidate(body);
      } catch (error) {
        if (!controller.signal.aborted) setReportError(error instanceof Error ? error.message : "The report could not be loaded. Please try again.");
      } finally { if (!controller.signal.aborted) setReportLoading(false); }
    })();
    return () => controller.abort();
  }, [candidateId, reportRetry]);

  useEffect(() => {
    if (candidate) reportHeading.current?.focus({ preventScroll: true });
  }, [candidate]);

  function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setCandidateId("");
    setSearch({ query: query.trim(), minScore, includeExamples });
  }
  function resetSearch() {
    setQuery(""); setMinScore("0"); setIncludeExamples(true);
    setSearch({ query: "", minScore: "0", includeExamples: true });
  }
  const report = candidate?.reports[reportIndex];
  const filtered = Boolean(search.query || search.minScore !== "0" || !search.includeExamples);

  return <div className="employer-workspace">
    {!candidateId ? <>
      <div className="employer-intro"><p className="eyebrow">FOR EMPLOYERS</p><h1>Review skills through candidate work.</h1><p>Search by skill, name or Candidate ID, then inspect the work and scoring evidence behind each result.</p></div>
      <form className="employer-filters panel" onSubmit={runSearch}>
        <label className="employer-query"><span className="sr-only">Search candidates by skill, name or Candidate ID</span><Icon name="grid" size={19} /><input maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try JavaScript, accessibility, or a Candidate ID" autoComplete="off" /></label>
        <label className="employer-score-filter"><span>Minimum score</span><select value={minScore} onChange={(event) => setMinScore(event.target.value)}><option value="0">Any score</option><option value="50">50 / 100</option><option value="70">70 / 100</option><option value="80">80 / 100</option><option value="90">90 / 100</option></select></label>
        <button className="button button-dark" type="submit">Search candidates<Icon name="arrow" size={17} /></button>
        <label className="employer-example-filter"><input type="checkbox" checked={includeExamples} onChange={(event) => { const enabled = event.target.checked; setIncludeExamples(enabled); setSearch({ query: query.trim(), minScore, includeExamples: enabled }); }} /><span>Include worked examples</span></label>
      </form>
      <div className="employer-results-label"><p className="small" aria-live="polite">{loading ? "Searching…" : `${results.length} ${results.length === 1 ? "candidate" : "candidates"}${search.query ? ` matching “${search.query}”` : " with published results"}`}</p><button type="button" className="text-button" onClick={() => setSearch({ ...search })} disabled={loading}><Icon name="refresh" size={14} />Refresh</button></div>
      {loading ? <div className="employer-loading panel" role="status"><span className="spinner" />Loading published results…</div> : searchError ? <div className="employer-empty panel"><Icon name="info" size={26} /><h2>We couldn’t load the results.</h2><p role="alert">{searchError}</p><button className="button button-outline" onClick={() => setSearch({ ...search })}>Try again</button></div> : !results.length ? <div className="employer-empty panel"><Icon name="receipt" size={30} /><h2>{filtered ? "No matching candidates yet." : "No published results yet."}</h2><p>{filtered ? "Try a broader skill or a lower score. Candidates appear after they choose to publish their results." : "Candidates appear here after completing an exercise and choosing to publish their results."}</p><div className="button-row">{filtered && <button className="button button-outline" onClick={resetSearch}>Clear filters</button>}<Link className="button button-outline" href="/start">Try the job seeker flow<Icon name="arrow" size={16} /></Link></div></div> : <div className="employer-candidates">{results.map((result) => <article className="employer-candidate panel" key={result.candidate.id}>
        <div className="employer-candidate-main"><div className="employer-candidate-heading"><div className="employer-avatar" aria-hidden="true">{result.candidate.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div><h2>{result.candidate.name}</h2><p className="micro mono muted">{result.candidate.id}</p></div>{result.examplesOnly && <span className="tag tag-demo">Worked examples</span>}</div><div className="employer-tested-skills">{result.testedSkills.slice(0, 5).map((skill) => <span className="tag" key={skill}>{skill}</span>)}{result.testedSkills.length > 5 && <span className="micro muted">+{result.testedSkills.length - 5} more</span>}</div><p className="micro muted">{result.assessments} {search.query ? "matching" : "completed"} {result.assessments === 1 ? "exercise" : "exercises"} · Latest {shortDate(result.latestAt)}</p></div>
        <div className="employer-candidate-score"><strong>{result.topScore}<span>/100</span></strong><p className="micro muted">Best work-sample score</p><button className="button button-outline button-small" onClick={() => setCandidateId(result.candidate.id)}>View report<Icon name="arrow" size={15} /></button></div>
      </article>)}</div>}
      <p className="employer-directory-note micro muted">Skills shown come from the exercises taken. resume claims and worked examples remain distinct from assessment evidence.</p>
    </> : <>
      <button className="text-button employer-back" type="button" onClick={() => { setCandidateId(""); setSearch({ ...search }); }}>← Back to candidates</button>
      {reportLoading ? <div className="employer-loading panel" role="status"><span className="spinner" />Loading candidate report…</div> : reportError ? <div className="employer-empty panel"><Icon name="info" size={26} /><h1>Report unavailable.</h1><p role="alert">{reportError}</p><button className="button button-outline" onClick={() => setReportRetry((value) => value + 1)}>Try again</button></div> : candidate && report ? <>
        <section className="employer-report-profile panel"><div><p className="eyebrow">CANDIDATE REPORT</p><h1 ref={reportHeading} tabIndex={-1}>{candidate.candidate.name}</h1><p className="mono small muted">{candidate.candidate.id}</p></div><div className="employer-report-profile-facts"><span className="tag"><Icon name="file" size={14} />{candidate.reports.length} completed {candidate.reports.length === 1 ? "exercise" : "exercises"}</span><p className="micro muted">Published by the candidate</p></div></section>
        {candidate.candidate.resume && <details className="employer-resume-context panel"><summary>resume background <span className="micro muted">Self-reported</span></summary><p className="small muted">{candidate.candidate.resume.name}</p><div className="employer-tested-skills">{candidate.candidate.resume.skills.length ? candidate.candidate.resume.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>) : <p className="small muted">No supported skill keywords were found in this resume.</p>}</div><p className="micro muted">These keywords provide context. The scores below come from the submitted exercises.</p></details>}
        <section className="employer-report-picker" aria-label="Choose an assessment report"><label htmlFor="employer-assessment">Assessment</label><select id="employer-assessment" value={reportIndex} onChange={(event) => setReportIndex(Number(event.target.value))}>{candidate.reports.map((item, index) => <option key={`${item.fingerprint}-${index}`} value={index}>{reportTitle(item)} · {item.evaluation.score}/100 · {shortDate(item.createdAt)}{item.submission.demo ? " · Worked example" : ""}</option>)}</select></section>
        <div className="employer-report-meta"><p className="eyebrow">{reportTitle(report).toUpperCase()}</p><p className="micro muted">Completed {shortDate(report.createdAt)}</p></div>
        <ReceiptView evidence={report} privateView={false} />
      </> : null}
    </>}
  </div>;
}
