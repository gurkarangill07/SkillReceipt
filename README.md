# SkillReceipt

A résumé lists skills. SkillReceipt gives job seekers a practical exercise and employers a report of the work behind the score.

**No registration, login, email or password.**

## Run locally

Use Node 22 or a newer supported LTS:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. No API keys or model setup are needed. For a production preview, run `npm run build` and then `npm start`.

## The flow

1. **Add your background.** Enter a name and upload a PDF, DOCX or TXT résumé (up to 2 MB; text-based PDFs up to ten pages). A sample résumé is available. Only the filename and recognized skill keywords are saved; the original file and extracted text are not retained.
2. **Choose a suggested exercise.** Recognized résumé skills rank the six supported assessments. Recommendations show their matching keywords. You can browse all exercises when a skill is not covered. Résumé claims never earn assessment points.
3. **Take the assessment.** Choose a camera session or practice without a camera. Camera permission requires an explicit action. The local preview, tab/focus changes, paste counts, camera interruptions and optional fullscreen exits provide session context. Interruptions pause the exercise until you resume.
4. **Review your result.** Server-side checks produce the score, submitted answers, per-check evidence and specific next steps. Download CSV/JSON or create an optional read-only receipt link.
5. **Publish when ready.** Publishing makes your name, résumé skill summary and completed reports discoverable by employers. It starts off and can be turned off again. Example attempts remain labeled.
6. **Review as an employer.** Search by assessed skill, role, name or Candidate ID. Filter by minimum score and example attempts, then inspect the actual work, checks and session report. Résumé-only claims do not satisfy an assessed-skill search; an unrelated high score cannot satisfy another exercise's score filter.

## Six supported assessments

| Area | Work sample |
| --- | --- |
| Data engineering | Three pipeline decisions and JavaScript executed in an isolated QuickJS VM |
| Data analysis | Clean an editable sales report and reconcile CAD 1285.50 against six published rules |
| Frontend | Review checkout accessibility, form states and responsive fixes |
| QA | Select a boundary-testing strategy and calculate four expected discounts |
| Product analytics | Interpret an experiment and calculate conversion and uplift |
| Cybersecurity | Triage a suspicious session and classify response actions |

The engineer and scenario exercises award 20 points per decision and 10 per practical/coding check. Scoring is deterministic and server-owned. Each submission creates a separate receipt. The engineer's worked example scores **80/100**, leaving a clear coding improvement; completed examples in the other areas score **100/100**. Loading example answers labels the attempt, even after edits.

## Session checks and privacy

Camera video stays on the device. No footage, audio, screen recording, clipboard content or browsing history is saved. Only disclosed counts and session status accompany the result. These browser-reported observations can help a reviewer ask questions, but **do not make a test cheating-proof, verify identity or constitute certification**. They do not change the skill score.

Private profiles/results belong to an opaque HttpOnly browser cookie lasting 30 days. Clearing it removes private access, so download receipts you want to keep. Employer profile publication and individual receipt links are separate controls; turning one off does not revoke the other. Previously saved copies cannot be recalled.

## Demo and verification

Use the [two-minute demo script](docs/DEMO.md) and [current scope](docs/HACKATHON.md).

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

[Browser checks](tests/browser/README.md) cover the candidate-to-employer journey and session behavior. Camera automation uses a fake media device; physical camera hardware has not been verified by those checks. Actual results are in [docs/VALIDATION.md](docs/VALIDATION.md).

## Hosting

Profiles and receipts currently use ignored `.data/` files with one persistent server process. Durable shared storage must replace that store before Vercel deployment. This revision runs locally; it does not deploy the app. Historical account records remain protected, and login/registration are disabled.
