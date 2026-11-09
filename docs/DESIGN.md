> Current lead-requested dark portals, accounts, resume sharing and coding scope: [DARK_PORTALS_SPEC.md](DARK_PORTALS_SPEC.md). The specification below records an earlier version.

# SkillReceipt interface

User 2 owns the frontend on `codex/skillreceipt-work`. The existing implementation specification and shared contract remain canonical. This work consumes User 1's shared modules and API routes and User 3's coach endpoint; it does not scaffold another application or provide substitute scoring or persistence.

## Experience

The visitor moves from a concise explanation to the sales cleanup workspace, submits an exact snapshot to the real server, inspects a private receipt, and explicitly enables a read-only evidence link. Receipts always show failed checks alongside the score. Sharing and coaching never alter assessed evidence.

The visual direction is warm paper, forest green ink and controls, restrained lime accents, fine rules, and perforated receipt details. System sans-serif text, Georgia display accents, and monospace data need no network fonts. Inline SVG icons share one stroke style. No additional dependency is needed.

## Structure and ownership

- `app/`: real landing, assessment, receipts, private receipt, and dynamic public evidence pages, plus frontend loading/error/unavailable states.
- `components/`: navigation, icons, rubric, editable workspace, receipt evidence, sharing, local practice coach, and retry behavior.
- `lib/client/`: guarded draft persistence, response handling, and display formatting. No server modules are imported by client components.

Read-only receipt pages use the server query facade. Sensitive pages are dynamically rendered without route caching. Public evidence has no indexing, no owner controls, and no coaching. Public links use native navigation to require a fresh server request after revocation.

Loading UI is scoped to the assessment and the receipts list's inner Suspense boundary. There is intentionally no root `loading.tsx` around private/public receipt lookups: an outer streamed fallback can commit HTTP 200 before an asynchronous `notFound()` resolves. User 3 must verify real 404 and cache headers after the baseline is integrated.

## Interaction rules

- Drafts use a versioned, validated localStorage envelope with stable row keys independent of order IDs. Storage failure leaves the editor usable. Removed rows remain restorable. Source reset clears the prior saved draft and demo status.
- Loading the reference solution is explicit and permanently marks that draft as a demo until source reset. Edits do not remove that marker.
- Submission freezes copies of the retained rows and disables editing until the request resolves. Only a real HTTP 201 with a valid private receipt ID triggers navigation. No client score is sent.
- Sharing starts disabled, requires informed action, and changes only after a successful server response. Copy has a selectable fallback. A revoked link is removed; enabling again asks the server for a new token.
- Coaching starts on a button press, has a bounded wait, and renders untrusted advice as plain text. Published-rule practice feedback remains visible when coaching is unavailable.

## Accessibility and responsive behavior

One h1 per page, landmarks, a skip link, descriptive titles, visible keyboard focus, text labels for pass/fail, live status/error messages, and reduced-motion support. The assessment table has a labeled scroll container; all editable cells include row number and column name. At approximately 390 px the content stacks, controls wrap, and table scrolling stays inside its container.

## Validation

Actual commands, checks, dependency gaps, and screenshots are recorded in `docs/handoffs/USER_2.md`. Design intent is not evidence of a successful build or browser check.
