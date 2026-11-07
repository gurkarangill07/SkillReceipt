"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="shell page-shell"><div className="empty-state panel"><p className="eyebrow">SOMETHING NEEDS ANOTHER LOOK</p><h1>This page couldn't be loaded.</h1><p>Try loading it again. If you were submitting work, check My receipts before retrying so you don't create a duplicate attempt. A connection error does not tell us whether the server saved your submission.</p><div className="button-row"><button className="button button-dark" type="button" onClick={reset}>Try loading again</button><a className="button button-outline" href="/receipts">My receipts</a><a className="text-link" href="/">Back to home</a></div></div></div>;
}
