# Judge demo: from listed skills to reviewed work

**Length:** 4–5 minutes · **Exercise:** Junior Data Engineer — make a small shop's order pipeline reliable.

## The story

A shop receives orders from an API. Retries can send the same order twice, some order amounts are missing, and a failed load may be replayed. The candidate must choose a stable business key, decide how to handle incomplete rows, select a replay-safe loading strategy, then write JavaScript to total valid order amounts.

This lets the judges see the full product loop: resume parsing, role-relevant recommendations, practical decisions, executable code and test cases, a scored receipt, candidate-controlled publication, and employer review of the submitted evidence.

## Opening

> “SkillReceipt turns skills listed on a resume into practical work samples. Candidates see how each result was scored, and employers can review the work behind a candidate-published result.”

Start from a fresh browser session so no earlier candidate data appears in the workspace. The score card on the landing page is clearly labeled as a sample result, not the current candidate's score.

## Walkthrough

1. **Candidate context — 30 seconds.** Choose **Demonstrate my skills**. Enter a name and choose **Use a sample resume**. Point out the skills the parser recognizes, such as JavaScript, SQL, Python and ETL. Explain that these skills help recommend an exercise; they do not earn points.

2. **Relevant assessment — 20 seconds.** Open the recommended **Junior Data Engineer** exercise. The resume match explains why it was suggested. The task is a small but recognizable data reliability problem, not a trivia quiz.

3. **Make the engineering decisions — 60 seconds.** Start the challenge. Use **Order ID** as the business key so retries update the same order; quarantine rows with a missing amount for review; choose an upsert keyed by the business key so replaying a batch does not double-count it. Call out the scoring rule: each decision has a published rule and is worth 20 points.

4. **Run the code — 60–90 seconds.** In the JavaScript task, implement `totalRevenue(orders)`. Add numeric `revenueCents`, skip `null`, and preserve a genuine zero. Run the provided tests and show the case results. The task runs in an isolated server-side runner; the four coding cases are worth 10 points each. Review the code, then submit the work.

5. **Inspect the receipt — 45 seconds.** Show the score, each decision's scoring evidence, the coding test outcomes, the submitted code and a concrete next step. State that the score describes this work sample, not overall job readiness. If you load the worked example instead of completing the task, its receipt stays visibly labeled as an example.

6. **Show candidate choice — 30 seconds.** Publish the profile for employer search. Explain that publication is opt-in and can be turned off. Then open the employer view and search **JavaScript** to find the candidate's assessed work.

7. **Review as an employer — 45 seconds.** Open the report. Show the submitted JavaScript, per-case results, decision evidence and session report. Resume keywords remain separate from assessed evidence. The report is read-only; employers can see only the information included in the published profile and work sample.

8. **Close on control — 20 seconds.** Return to the candidate result and hide the profile from employer search. Refresh the employer search to show that the profile is no longer available.

## Camera option

If camera access is available and time permits, choose **Camera session**, acknowledge the session disclosure, enable the preview and begin the task. The current product shows an on-device preview and browser-reported session context. It does not record or share video. If camera access is unavailable, use practice mode and continue the assessment.

## Claims to keep precise

- Scores show performance on a specific work sample; they do not establish identity, independent authorship, certification or broad job competence.
- Session details are browser-reported context. They do not change the score or prove that outside help was impossible.
- Resume keywords are self-reported context. They never substitute for assessed work.
- Example answers are useful for previewing a receipt, but the example label remains visible to candidates and employers.
