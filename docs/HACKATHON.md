# Hackathon scope: résumé to employer evidence

This is the current product scope. It supersedes the older account-portal specifications and the earlier catalog-only guest revision.

## Candidate journey

Home → name and résumé → suggested skill exercises → camera/practice session → assessment → score and feedback → optional publication → employer report.

There are no accounts, logins, passwords or email fields. A browser-owned Candidate ID connects the résumé keyword summary and completed reports. Upload supports text-based PDF, DOCX and UTF-8 TXT, up to 2 MB; PDFs are limited to ten pages. The original résumé bytes and extracted text are discarded. Only its filename and recognized skill keywords are retained.

Recommendations rank the six implemented exercises using explicit résumé keyword matches and explain those matches. They do not claim arbitrary-role generation or score résumé claims. Unmatched backgrounds can browse the full catalog.

## Work samples

Data Engineer uses three decisions and the isolated JavaScript runner's four published cases. Data Analyst retains the editable sales dataset and six-rule evaluator. Frontend, QA, Product Analytics and Cybersecurity each use three decisions and a four-check practical exercise with their own source material. Frontend/security tasks assess the submitted decisions; they do not claim to execute a complete website or investigate a real incident.

The server validates submissions, computes scores and fingerprints the assessed artifact. Session observations, résumé context and claimed scores do not affect grading. Existing receipt versions remain readable. Normal scenario payloads omit scoring answer keys; worked examples are explicit and labeled. The engineer example scores 80/100, with partial coding credit. Other completed examples score 100/100.

## Session checks

Before a normal attempt, the candidate chooses camera or practice and acknowledges the disclosed observations. Camera mode requires an explicit permission action and provides a local video preview, with no microphone or recording. Tab/focus changes and camera interruptions pause the exercise. The candidate can resume, reconnect or explicitly choose practice. Paste events and optional fullscreen exits are counted; clipboard content is not collected. Camera tracks stop on completion, navigation away and late permission resolution after leaving.

The report shows the mode and browser-reported observations. These are review context, not a cheating verdict, proof of independent completion, identity verification or certification. No footage, audio, screen capture, browsing history or clipboard contents are retained. Automated camera tests use a fake media device; physical camera hardware has not been verified by those tests.

## Employer journey and consent

A candidate publishes only after completing an assessment. Publication starts off. It exposes the name, Candidate ID, résumé keyword summary and all completed reports, including labeled examples. Employer search needs no login and supports skill/role/name/ID, minimum score and example filters. Only positively earned assessment checks/aliases satisfy a skill search; résumé-only claims do not. Score filters use the matching exercise rather than an unrelated high score.

Reports include the actual submitted answers/code/data, published checks, score and session context. They exclude private receipt IDs, share tokens, owner hashes and the candidate's private practice-plan section. No employers, candidates or scores are fabricated in an empty installation.

Hiding a profile blocks fresh employer searches and report requests. Individual read-only receipt links are separately enabled/revoked. Downloaded or previously saved copies cannot be recalled. Browser ownership lasts 30 days; clearing its cookie removes private access. CSV/JSON downloads provide a portable copy.

## Hosting

Local development uses ignored `.data/` files. Vercel uses private Blob JSON documents for profiles and receipts, configured through server-only `BLOB_READ_WRITE_TOKEN`. Reads bypass provider caches; conditional ETag writes prevent lost profile/sharing updates across functions. Deployment without its storage connection fails closed. Source uploads exclude local receipts, environment secrets and test artifacts. The runtime is pinned to Node24.
