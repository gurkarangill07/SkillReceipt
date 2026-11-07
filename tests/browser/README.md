# Browser acceptance record

Status: **partial integrated desktop inspection on November 7, 2026**. Native Brave loaded the actual production landing and assessment pages. The landing screenshot was visually inspected in chat; assessment accessibility showed the exact source, controls, labels and brief. Browser access was unstable and a manual cell interaction/state refresh was interrupted, so full editing/submission/sharing/coach/keyboard/console/mobile verification remains unrun. No local PNG artifacts are claimed.

HTTP acceptance passes on the combined app, but HTTP is not browser verification. User 2's separate fixture-browser results also do not count as integrated interactive acceptance. Complete the checklist below when stable browser access is available. No browser framework was installed for this merge.

## Interaction checklist for the integrated app

- At desktop and approximately 390 px width, inspect landing/assessment/private receipt/public evidence. Record page titles, keyboard focus, contrast, readable failure states, and contained table scrolling.
- Start the challenge, read all six rules, edit one cell using the keyboard, remove/restore a row, and enter a CAD total. Confirm slash dates are explicitly month/day/year.
- Refresh and verify draft restoration. Put malformed/wrong-version draft data in localStorage and check safe recovery. Test reset and its confirmation if provided.
- Submit an imperfect attempt: change only R001's date to `2026-10-02` in an otherwise correct artifact. Expect 80/100 with the date check failed and the affected order explained.
- Load the demo solution, observe its demo label, submit it, and verify 100/100 with all six checks passed and the exact submitted table. Confirm the demo label persists in private receipt, evidence, list, and JSON download.
- Confirm sharing is off initially. Read the disclosure, enable, test copy and its selectable fallback, then open the employer view in a separate session without owner cookies.
- Download CSV/JSON and inspect their contents; revoke sharing and make a fresh request to the old link. Owner access must continue. Re-enable and observe a different link.
- Start a retry and verify the old receipt is unchanged. Check My receipts includes both imperfect and successful attempts.
- Request local practice advice explicitly. Verify loading, success, error, cooldown, and disabled-button explanations. Advice must be visually separate, text-only, marked “AI-generated practice advice · not assessed,” and absent from public evidence and downloads.
- Simulate coach HTTP 503/offline. Confirm useful deterministic feedback and fully usable scoring/sharing/downloads. All-pass advice must suggest another exercise.
- Inspect runtime/browser-console errors, live-region announcements, skip link, labels, and keyboard access. Confirm no page-level horizontal overflow at mobile size.

Record actual browser/surface, date, viewports, interactions, failures/fixes, and screenshot paths in `docs/VALIDATION.md`. Do not mark this list complete before observing each outcome.
