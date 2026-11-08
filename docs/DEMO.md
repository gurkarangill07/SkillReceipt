# Judge demo: a scored work sample with an integrity trail

**Featured exercise: Junior Data Engineer — Reliable Orders Pipeline.** Open `/challenge/junior-data-engineer`. Allow 5–7 minutes, with a working webcam and a desktop browser that supports fullscreen. This revision is local only.

## Start locally

Use Node 24. Dependencies are already installed in the development checkout; a fresh checkout needs `npm ci` once. Run `npm run dev` (`npm.cmd run dev` in Windows PowerShell), then open `http://localhost:3000/challenge/junior-data-engineer`.

Keep good lighting and rehearse with the actual webcam. Camera access is required. Do not select **View worked example** when demonstrating integrity: it deliberately creates an unmonitored, labeled example.

## The story

Northstar Retail imports daily checkout orders. The import may retry the same batch, one amount is unknown and a zero-value order is legitimate. The candidate makes three data-quality decisions, writes a revenue function, runs its tests and receives a reproducible score alongside a separate session integrity report.

## Walkthrough

1. **Show the detailed brief.** Explain the source feed, retry behavior, missing values and the four published coding cases. Optional: start from `/start`, add a name and sample resume, and show the relevant recommendation. Resume skills never earn assessment points.
2. **Start work sample.** Point out the redesigned permission screen. Read the disclosure, tick consent and click **Enable camera**. Show the actual preview and **One face visible · checks active**. The begin button remains disabled without a working camera and a stable face. Click **Enter fullscreen & begin**.
3. **Demonstrate a blocked action.** Attempt Ctrl+V/Cmd+V in a test input. The content is blocked; **Paste blocked** appears in the live timeline. Clipboard contents are never collected.
4. **Show a tab or fullscreen interruption.** Switch tabs, or press Escape to leave fullscreen. Return to the assessment: it is paused, answer controls are disabled and the event is visible. Click **Resume test** to restore fullscreen and sync the session. Prior events remain in the report.
5. **Show the actual camera check.** Move out of view for at least 3 seconds. The assessment pauses and logs **No face in view**. Move back, wait for one stable face and resume. If time allows, have a second person enter view or cover the camera. Demonstrate **Stop camera & pause**, then **Reconnect camera**, wait for the face check and resume. The system never silently switches to practice.
6. **Complete the decisions.** Choose **Order ID**, **Quarantine for review** and **Upsert by the business key**. Each earns 20 points. The sidebar provides the source feed and distinguishes the retry policy from the coding calculation.
7. **Type and run the code.** The clipboard is blocked, so type this short function rather than pasting it:

   ```js
   function totalRevenue(orders) {
     let total = 0;
     for (const order of orders) {
       if (order.revenueCents !== null) total += order.revenueCents;
     }
     return total;
   }
   ```

   Click **Run tests**. Show the ordinary-amount, empty-list, null and genuine-zero cases. Each passing case earns 10 points. Code executes in the existing isolated server-side VM. The timeline records the test run without logging keystrokes.
8. **Review & finish**, then **Get my receipt**. Show the score, per-rule evidence, submitted code, **Camera assessment · integrity report**, review events, server check-ins and the complete timeline. The deliberate interruptions create **Review required** while a correct solution still scores 100. That separates demonstrated skill from observations requiring a conversation.
9. **Review as an employer.** Optionally publish the candidate profile, open a separate employer window, search JavaScript and inspect the report. The actual work and integrity timeline remain visible; private ownership capabilities do not. Download JSON evidence to show server receipt timestamps. Revoke profile publication and refresh the employer search to show candidate control.

## Explain precisely

“We require a camera and fullscreen, run face-presence checks on the device, pause interrupted attempts and preserve an event trail for review. The skill score comes from the actual submitted work. The observations support authenticity review; they are not proof of identity or a guarantee that outside help was impossible.”

No video or audio is recorded or uploaded. Face presence does not verify liveness or detect a photograph/replay. The browser cannot observe another device or every operating-system action. See [the full policy and limitations](PROCTORING.md).
