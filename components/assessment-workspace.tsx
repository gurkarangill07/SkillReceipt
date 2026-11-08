"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DataRow } from "../lib/contracts";
import { clearDraft, createDemoDraft, createSourceDraft, readDraft, saveDraft, snapshotSubmission, type Draft } from "../lib/client/draft";
import { isRecord, postJson } from "../lib/client/http";
import { Icon } from "./icon";
import { AssessmentSession, useAssessmentSession } from "./assessment-session";

const columns: { field: keyof DataRow; label: string; limit: number }[] = [
  { field: "orderId", label: "Order ID", limit: 40 },
  { field: "date", label: "Order date", limit: 60 },
  { field: "region", label: "Region", limit: 60 },
  { field: "revenue", label: "Revenue (CAD)", limit: 40 },
];

export function AssessmentWorkspace({ startFresh = false }: { startFresh?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(createSourceDraft);
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("Preparing your workspace…");
  const [draftMessage, setDraftMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [replaceAction, setReplaceAction] = useState<"source" | "demo" | null>(null);
  const submitLock = useRef(false);
  const initialized = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const session = useAssessmentSession({ enabled: ready, demo: draft.demo });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (startFresh) {
      clearDraft();
      setDraft(createSourceDraft());
      setDraftMessage("A fresh source attempt is ready. Earlier receipts are unchanged.");
      // Remove the one-time action so refreshing restores this new draft.
      window.history.replaceState(window.history.state, "", "/assessment");
    } else {
      const restored = readDraft();
      setDraft(restored.draft);
      if (restored.state === "restored") setDraftMessage("Your saved draft was restored on this device.");
      if (restored.state === "invalid") setDraftMessage("The saved draft was incompatible or damaged. The original source has been loaded.");
      if (restored.state === "unavailable") setDraftMessage("Browser storage is unavailable. You can still work and submit, but keep this page open.");
    }
    setReady(true);
  }, [startFresh]);

  useEffect(() => {
    if (!ready) return;
    // The dataset is small. Save after every committed edit so an immediate
    // refresh cannot lose a pending debounced write.
    setStorageMessage(saveDraft(draft) ? "Draft saved on this device" : "Draft not saved — keep this page open. Browser storage is unavailable.");
  }, [draft, ready]);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const retained = draft.rows.filter((row) => !row.removed);
  const removed = draft.rows.filter((row) => row.removed);

  function editCell(key: string, field: keyof DataRow, value: string) {
    setDraft((current) => ({ ...current, rows: current.rows.map((row) => row.key === key ? { ...row, value: { ...row.value, [field]: value } } : row) }));
  }

  function toggleRow(key: string) {
    setDraft((current) => ({ ...current, rows: current.rows.map((row) => row.key === key ? { ...row, removed: !row.removed } : row) }));
    setError("");
  }

  function replaceDraft(action: "source" | "demo") {
    if (action === "source") {
      clearDraft();
      setDraft(createSourceDraft());
      setDraftMessage("Draft reset to the original source. Demo status and personal fields were cleared.");
    } else {
      setDraft((current) => createDemoDraft(current));
      setDraftMessage("Demo solution loaded. Editing it will keep this attempt labeled as a demo.");
    }
    setError("");
    setReplaceAction(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !ready || !session.canSubmit()) return;
    setError("");
    if (retained.length === 0) { setError("Restore at least one row before submitting. An empty artifact cannot be assessed."); return; }
    if (draft.total.length === 0) { setError("Enter your stated total revenue in CAD. A semantically incorrect answer can still be submitted and assessed."); return; }
    const snapshot = { ...snapshotSubmission(draft), session: session.snapshot() };
    submitLock.current = true;
    setPending(true);
    try {
      const result = await postJson("/api/receipts", snapshot);
      if (result.status !== 201 || !isRecord(result.body) || typeof result.body.id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result.body.id)) {
        throw new Error("The server did not confirm a new receipt. Check My receipts before submitting again.");
      }
      // The editor stays locked until navigation; the persisted artifact is exactly snapshot.
      session.finish();
      router.push(`/receipts/${result.body.id}`);
      router.refresh();
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : "Submission failed."} Your draft is still here. If the response was lost or timed out, check My receipts before retrying.`);
      submitLock.current = false;
      setPending(false);
    }
  }

  return <section className="workspace-section" id="workspace" aria-labelledby="workspace-title">
    <div className="workspace-heading"><div><p className="eyebrow">02 / YOUR WORKSPACE</p><h2 id="workspace-title">Make the data make sense.</h2></div><a className="button button-outline button-small" href="/api/dataset" download><Icon name="download" size={16} />Source CSV</a></div>
    <p className="workspace-intro">Edit the cells below. Remove rows from the valid output without losing the original draft. Nothing is corrected automatically.</p>
    <p className="draft-status micro" role="status"><Icon name="lock" size={13} />{storageMessage}</p>
    {draftMessage && <p className="notice notice-neutral" role="status">{draftMessage}</p>}
    {draft.demo && <div className="notice notice-demo" role="status"><Icon name="info" /><div><strong>Demo attempt — reference solution loaded</strong><p>This is a walkthrough. Every receipt from this draft keeps its demo label, even after edits. Reset to the source to start a normal attempt.</p></div></div>}
    <AssessmentSession checks={session} />
    {ready && !session.started && <div className="session-example-shortcut"><button type="button" className="text-button" onClick={() => replaceDraft("demo")}>Load worked example</button><p className="micro muted">Replaces the table with a completed example. The receipt will be labeled.</p></div>}
    {session.started && <form onSubmit={submit} noValidate>
      <fieldset disabled={!ready || pending || session.paused} className="workspace-fieldset" aria-busy={pending}>
        <legend className="sr-only">Sales cleanup submission</legend>
        <div className="editor-layout">
          <div className="editor-main">
            <div className="editor-panel panel">
              <div className="editor-toolbar"><span className="icon-label"><Icon name="grid" size={17} /><strong>Valid output</strong><span className="count-badge">{retained.length} / 9 rows</span></span><span className="micro muted">Changes are checked on submission</span></div>
              <p id="editor-scroll-help" className="table-scroll-hint micro">Scroll horizontally to view all four columns on smaller screens.</p>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Editable sales data" aria-describedby="editor-scroll-help">
                <table className="data-table editable-table"><caption className="sr-only">Retained rows for the submitted output. Row numbers refer to their stable position in this draft.</caption><thead><tr><th scope="col">#</th>{columns.map((column) => <th scope="col" key={column.field}>{column.label}</th>)}<th scope="col"><span className="sr-only">Row actions</span></th></tr></thead><tbody>
                  {retained.map((row) => {
                    const number = draft.rows.findIndex((candidate) => candidate.key === row.key) + 1;
                    return <tr key={row.key}><th scope="row" className="row-number mono">{String(number).padStart(2, "0")}</th>{columns.map((column) => <td key={column.field}><input aria-label={`Row ${number}, ${column.label}`} value={row.value[column.field]} maxLength={column.limit} autoComplete="off" spellCheck={false} inputMode={column.field === "revenue" ? "decimal" : "text"} onChange={(event) => editCell(row.key, column.field, event.target.value)} /></td>)}<td><button type="button" className="icon-button remove-row" aria-label={`Remove row ${number}, order ${row.value.orderId || "blank ID"}`} title={`Remove row ${number}`} onClick={() => toggleRow(row.key)}><Icon name="trash" size={16} /></button></td></tr>;
                  })}
                  {retained.length === 0 && <tr><td colSpan={6} className="empty-table">All rows have been removed. Restore rows below to build your valid output.</td></tr>}
                </tbody></table>
              </div>
              <div className="editor-bottom"><span className="micro">Expected output: <strong>9 valid orders</strong></span><span className="micro muted">Currency: CAD · dates: YYYY-MM-DD</span></div>
            </div>
            {removed.length > 0 && <details className="removed-rows panel" open><summary>{removed.length} removed {removed.length === 1 ? "row" : "rows"} <span className="muted">· excluded from submission</span></summary><ul>{removed.map((row) => { const number = draft.rows.findIndex((candidate) => candidate.key === row.key) + 1; return <li key={row.key}><span><span className="mono muted">Row {number}</span><strong>{row.value.orderId || "Blank ID"}</strong><span className="muted removed-value">{row.value.revenue || "Missing revenue"}</span></span><button type="button" className="text-button" onClick={() => toggleRow(row.key)} aria-label={`Restore row ${number}, order ${row.value.orderId || "blank ID"}`}><Icon name="refresh" size={14} />Restore</button></li>; })}</ul></details>}
            <div className="draft-actions"><button className="text-button" type="button" onClick={() => setReplaceAction("source")}><Icon name="refresh" size={15} />Reset to source</button><button className="text-button" type="button" onClick={() => setReplaceAction("demo")}><Icon name="spark" size={15} />Load demo solution</button></div>
            {replaceAction && <div className="notice notice-neutral replace-confirm" role="group" aria-label="Confirm draft replacement"><p>{replaceAction === "source" ? "Replace this draft with the original source? Current edits, personal fields, and demo status will be cleared." : "Replace the table and total with the reference solution? This attempt will be labeled as a demo, including after further edits."}</p><div className="button-row"><button type="button" className="button button-dark button-small" onClick={() => replaceDraft(replaceAction)}>{replaceAction === "source" ? "Reset draft" : "Load labeled demo"}</button><button type="button" className="button button-outline button-small" onClick={() => setReplaceAction(null)}>Keep editing</button></div></div>}

          </div>
          <aside className="submit-panel panel" aria-labelledby="submit-title"><span className="step-stamp mono">03 / WHEN YOU'RE READY</span><h3 id="submit-title">Reconcile.<br />Then make it a receipt.</h3><p className="small muted">Enter the total for your retained orders. Your exact submitted cells and total will be saved as a separate result.</p><label htmlFor="total">Total revenue</label><div className="money-input"><span className="mono">CAD</span><input id="total" value={draft.total} inputMode="decimal" autoComplete="off" maxLength={40} aria-describedby="total-help" onChange={(event) => setDraft((current) => ({ ...current, total: event.target.value }))} placeholder="0.00" /></div><p className="micro muted" id="total-help">Plain decimal only, up to two decimal places. No currency symbols, commas, or spaces.</p><div className="submit-facts"><span>Retained orders<strong>{retained.length}</strong></span><span>Removed rows<strong>{removed.length}</strong></span><span>Assessment<strong>{draft.demo ? "Demo attempt" : "Source attempt"}</strong></span></div>{error && <div className="notice notice-error" role="alert" tabIndex={-1} ref={errorRef}>{error}<a href="/receipts" className="inline-error-link">Open My receipts</a></div>}<button className="button button-dark submit-button" type="submit" disabled={!ready || pending}>{pending ? <><span className="spinner" />Checking your submission…</> : <>Submit & get receipt<Icon name="arrow" size={17} /></>}</button><p className="micro muted submit-note" role="status">{pending ? "Your submitted snapshot is frozen. Please wait for the server's result." : "Private by default. No score is calculated in your browser."}</p></aside>
        </div>
      </fieldset>
    </form>}
  </section>;
}
