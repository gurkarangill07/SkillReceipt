# Hackathon scope: resume to employer evidence

This is the current product scope. It supersedes the older account-portal specifications and the earlier catalog-only guest revision.

## Candidate journey

Home → name and resume → suggested skill exercises → required camera/fullscreen checks → assessment → score and integrity report → optional publication → employer report.

There are no accounts, logins, passwords or email fields. A browser-owned Candidate ID connects the resume keyword summary and completed reports. Upload supports text-based PDF, DOCX and UTF-8 TXT, up to 2 MB; PDFs are limited to ten pages. The original resume bytes and extracted text are discarded. Only its filename and recognized skill keywords are retained.

Recommendations rank the six implemented exercises using explicit resume keyword matches and explain those matches. They do not claim arbitrary-role generation or score resume claims. Unmatched backgrounds can browse the full catalog.

## Work samples

Data Engineer uses three decisions and the isolated JavaScript runner's four published cases. Data Analyst retains the editable sales dataset and six-rule evaluator. Frontend, QA, Product Analytics and Cybersecurity each use three decisions and a four-check practical exercise with their own source material. Frontend/security tasks assess the submitted decisions; they do not claim to execute a complete website or investigate a real incident.

The server validates submissions, computes scores and fingerprints the assessed artifact. Session observations, resume context and claimed scores do not affect grading. Existing receipt versions remain readable. Normal scenario payloads omit scoring answer keys; worked examples are explicit and labeled. The engineer example scores 80/100, with partial coding credit. Other completed examples score 100/100.

## Session checks

Normal attempts require explicit consent, a live camera, one stable face in view, fullscreen and an owner-bound server session. MediaPipe checks face presence/count on the device. Tab/focus changes, fullscreen exits, sustained face/camera failures and connection problems pause the exercise. The candidate must restore the checks and explicitly resume; there is no practice fallback. Copy/paste/cut/drop actions are blocked and logged without collecting clipboard contents. Camera tracks stop on completion/navigation, including late permission resolution. Worked examples stay visibly unmonitored.

The server preserves bounded ordered event categories, elapsed times, server receipt timestamps and connection-gap observations. The receipt API requires the monitored session and builds the official report from its stored log. Review events remain separate from the skill score. These observations do not prove independent completion, identity or liveness. No footage, audio, screen capture, browsing history or clipboard contents are retained. Automated camera tests run the real detector on controlled NASA portrait streams; physical camera hardware has not been verified. See [the full policy](PROCTORING.md) and [the featured engineering demonstration](DEMO.md).

## Employer journey and consent

A candidate publishes only after completing an assessment. Publication starts off. It exposes the name, Candidate ID, resume keyword summary and all completed reports, including labeled examples. Employer search needs no login and supports skill/role/name/ID, minimum score and example filters. Only positively earned assessment checks/aliases satisfy a skill search; resume-only claims do not. Score filters use the matching exercise rather than an unrelated high score.

Reports include the actual submitted answers/code/data, published checks, score and session context. They exclude private receipt IDs, share tokens, owner hashes and the candidate's private practice-plan section. No employers, candidates or scores are fabricated in an empty installation.

Hiding a profile blocks fresh employer searches and report requests. Individual read-only receipt links are separately enabled/revoked. Downloaded or previously saved copies cannot be recalled. Browser ownership lasts 30 days; clearing its cookie removes private access. CSV/JSON downloads provide a portable copy.

## Hosting

Local development uses ignored `.data/` files. The private Blob abstraction supports profiles, receipts and monitoring sessions through server-only `BLOB_READ_WRITE_TOKEN`. Reads bypass provider caches and request identity encoding so compression cannot weaken the ETags used for conditional writes. Deployment without its storage connection fails closed. The monitoring revision was deployed on November 8, 2026 to the existing app at https://skillreceipt-nine.vercel.app/. Source uploads exclude local receipts, environment secrets and test artifacts. The runtime is pinned to Node24.
