"use client";
import { useState } from "react";
import type { PublicAccount } from "../lib/accounts";

export function SignOut() {
  const [busy, setBusy] = useState(false);
  return <button className="text-button nav-signout" disabled={busy} onClick={async () => { setBusy(true); try {
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    if (response.ok) window.location.assign("/"); else setBusy(false);
  } catch { setBusy(false); } }}>{busy ? "Signing out…" : "Sign out"}</button>;
}

export function ProfileAccess({ initial }: { initial: PublicAccount }) {
  const [account, setAccount] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <section className="panel profile-access"><div><p className="eyebrow">YOU CONTROL ACCESS</p><h2>Share with an employer, on your terms.</h2><p>When enabled, any signed-in employer who has your Candidate ID can view your name, résumé and all work-sample results, including demo attempts. Your account email, password and session details stay hidden. Contact details in your uploaded résumé remain part of that file.</p></div><div className="candidate-id"><span>Your Candidate ID</span><strong>{account.candidateId}</strong><p>Share this ID when you’re ready.</p></div><label className="access-toggle"><input type="checkbox" checked={account.visible} disabled={busy} onChange={async (event) => {
    const enabled = event.target.checked; setBusy(true); setError("");
    try { const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setAccount(result.account); }
    catch { setError("Your sharing setting could not be changed. Please try again."); } finally { setBusy(false); }
  }} /><span><strong>{account.visible ? "Employer profile access is on" : "Employer profile access is off"}</strong><small>{busy ? "Saving…" : "Turn off to block new ID lookups and résumé downloads."}</small></span></label><p className="micro muted">Existing receipt links have separate revoke controls. Previously saved copies cannot be recalled.</p>{error && <p className="notice notice-error" role="alert">{error}</p>}</section>;
}
