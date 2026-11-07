# SkillReceipt: a simple three-minute demonstration

**Pitch:** “Upload your résumé, choose a role, show a little real work, then share the evidence behind your score.”

Prepare one candidate account and a separate employer account using **Create an account** on the sign-in screen. Use different emails and passwords of at least ten characters. Use a synthetic résumé, not a real applicant's personal data. Accounts and results persist in this local installation; no accounts or passwords are shipped in source.

1. **Candidate workspace, 20 seconds.** Show the dark dashboard and stable Candidate ID. Select **Add résumé**, upload a short TXT/PDF/DOCX file, and explain that keywords provide context and never earn points. The sample résumé shortcut does not save a downloadable file; use an actual synthetic upload to demonstrate employer downloads.
2. **Find a role, 20 seconds.** Continue to role search, type **Junior Data Engineer**, and open the assessment. There are two supported roles in this prototype.
3. **A focused task, 40 seconds.** Show **Start my work sample**, select Practice, acknowledge the session conditions, and begin. Answer Order ID, Quarantine for review, and Upsert by the business key. Each question appears on its own, followed by a small JavaScript task. Show the example and **Run tests**. The starter function returns zero and passes two of four cases.
4. **A useful result, 35 seconds.** Finish with the starter code to receive **80/100**: three decision checks pass and coding earns 20/40. Show the published tests and the candidate's concrete coding improvement plan. A new attempt with a correct loop earns 100; the **Demo helper** can load the example and keeps the attempt labeled demo.
5. **Employer review, 40 seconds.** Return to the candidate dashboard, enable **Employer profile access**, and copy the Candidate ID. Sign out, select **For employers**, sign into the prepared employer account and search that ID. Show the résumé download, actual score and expandable check evidence. Private coaching and account email are excluded; any contact details in the résumé remain part of that file.
6. **Candidate control, 15 seconds.** Explain that the candidate can disable profile access to block new lookups/downloads. Public receipt links have their own revoke controls. Scores describe a particular work sample; identity, employer organizations and independent authorship are not verified.

For a very short pitch, **Presenter demo · sample attempt** on the brief skips to review, uses no camera and yields the same 80-point improvement story. Its demo label remains visible in the result and employer evidence. The coding page is accessible through **Review my code**.

Camera mode uses an explicit permission button and a local preview. It counts only this page's visibility changes; it does not inspect other tabs or guarantee that someone cannot cheat. Rehearse hardware permission and return-from-hidden behavior on the presentation device before choosing camera mode. No Ollama setup is required for the deterministic results and improvement plan.

Run `npm ci` then `npm run dev`, and open http://localhost:3000. If Turbopack's local compiler is restricted by the host, use `npm run dev -- --webpack`. For a built preview, use `npm run build -- --webpack` then `npm start`.
