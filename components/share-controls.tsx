"use client";

import { useEffect, useRef, useState } from "react";
import { isRecord, postJson } from "../lib/client/http";
import { Icon } from "./icon";

export function ShareControls({ receiptId, initialToken }: { receiptId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [origin, setOrigin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const lock = useRef(false);
  const copyLock = useRef(false);
  const lastRevoked = useRef<string | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);
  const link = token && origin ? new URL(`/evidence/${encodeURIComponent(token)}`, origin).href : "";

  async function changeSharing(enabled: boolean) {
    if (lock.current || copyLock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    setMessage("");
    setCopyMessage("");
    try {
      const response = await postJson(`/api/receipts/${encodeURIComponent(receiptId)}/share`, { enabled });
      if (response.status !== 200 || !isRecord(response.body)) throw new Error("The server did not confirm the sharing change.");
      const nextToken = response.body.shareToken;
      if (enabled) {
        if (typeof nextToken !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(nextToken) || nextToken === lastRevoked.current) throw new Error("The server did not return a new evidence link.");
        setToken(nextToken);
        setMessage("Sharing enabled. Anyone with this link can read this evidence.");
      } else {
        if (nextToken !== null) throw new Error("The server did not confirm revocation.");
        lastRevoked.current = token;
        setToken(null);
        setMessage("Link revoked. Fresh requests to the old link are unavailable. Your private receipt is unchanged.");
      }
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : "Sharing could not be changed."} Refresh this receipt to confirm the current sharing state before retrying.`);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  async function copyLink() {
    if (!link || copyLock.current) return;
    copyLock.current = true;
    setCopying(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await Promise.race([
        navigator.clipboard.writeText(link),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Clipboard timed out")), 3000); }),
      ]);
      setCopyMessage("Evidence link copied.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setCopyMessage("Automatic copy is unavailable. Select the link below and copy it manually.");
    } finally {
      clearTimeout(timeout);
      copyLock.current = false;
      setCopying(false);
    }
  }

  return <section className="share-panel panel" aria-labelledby="sharing-title"><div className="panel-title"><span className="round-icon"><Icon name={token ? "link" : "lock"} size={19} /></span><div><p className="eyebrow">OPTIONAL PUBLIC RECEIPT LINK</p><h2 id="sharing-title">{token ? "Your evidence link is on." : "Create an evidence link."}</h2></div><span className={`tag ${token ? "tag-green" : ""}`}>{token ? "Link enabled" : "Link off"}</span></div><p>Candidate ID profile access is controlled separately on your dashboard. Anyone with an enabled link can read the submitted work, result, session conditions, and any name or reflection you included. You can turn the link off later, but downloaded or saved copies cannot be recalled.</p><div aria-busy={pending}>
    {token ? <><label htmlFor="evidence-link">Read-only evidence link</label><div className="share-link-row"><input id="evidence-link" className="text-input mono" ref={linkInput} value={link} readOnly onFocus={(event) => event.currentTarget.select()} aria-describedby="share-link-help" /><button type="button" className="button button-dark button-small" disabled={!link || pending || copying} onClick={copyLink}><Icon name="copy" size={16} />{copying ? "Copying…" : "Copy link"}</button></div><p className="micro muted" id="share-link-help">This selectable field also works if clipboard access is unavailable.</p><div className="button-row">{link && <a className="button button-outline button-small" href={link} target="_blank" rel="noopener noreferrer">Open employer view<Icon name="external" size={15} /></a>}<button className="text-button danger-text" type="button" onClick={() => changeSharing(false)} disabled={pending || copying}>{pending ? "Revoking link…" : "Revoke link"}</button></div></> : <button type="button" className="button button-dark" disabled={pending} onClick={() => changeSharing(true)}>{pending ? <><span className="spinner" />Enabling sharing…</> : <><Icon name="link" size={17} />Enable evidence link</>}</button>}
    </div>{message && <p className="status-message small" role="status">{message}</p>}{copyMessage && <p className="status-message small" role="status">{copyMessage}</p>}{error && <p className="notice notice-error" role="alert">{error}</p>}<p className="micro muted local-link-note"><Icon name="info" size={14} />A localhost link works only where this server is reachable. This prototype does not publish your evidence to the internet.</p></section>;
}
