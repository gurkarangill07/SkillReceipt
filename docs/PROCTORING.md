# Local assessment integrity policy

Revision: November 8, 2026. This revision is local only; it has not been pushed or deployed.

## Required checks

Every normal exercise requires explicit consent, a live video track, successful on-device face detection, one face stable in view for at least 1.5 seconds, fullscreen and a server session. Denied camera permission has no practice fallback. Browsers without fullscreen support cannot start a normal attempt. Use a desktop Chrome/Edge browser for the judge rehearsal.

MediaPipe BlazeFace processes frames every 750 ms on the candidate device. Its runtime and pinned model are served by the app itself. `npm ci` copies the runtime from the pinned dependency using `scripts/prepare-proctoring.mjs`; the model is checked in under `public/proctoring/`. The model comes from [Google's versioned model distribution](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite); the [official detector documentation](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector?tab=Web) describes its output. No live camera data is sent to Google.

## What happens during an exercise

| Observation | Response |
| --- | --- |
| Tab hidden, window loses focus, fullscreen exits | Log event and pause; require explicit resume and fullscreen restoration |
| Camera track stops or is muted | Log event and pause; require camera reconnection |
| No face or multiple faces for 3 seconds | Log event and pause; one stable face is required to resume |
| Camera very dark/covered for 3 seconds | Log event and pause; improve lighting/uncover the camera |
| Camera video stops advancing for 5 seconds | Detect stalled frames and pause after sustained failure |
| Face detector fails | Pause; reconnect to restart checks |
| Copy, paste, cut, drop or context menu | Prevent the browser action and record the category; clipboard contents are never read |
| Interceptable print/save/source/developer-tool shortcuts | Prevent the action and log its category |
| Answer changes, step changes, coding test runs | Log activity categories without answer text or key presses |
| No keyboard/pointer input for 60 seconds | Mark inactivity; mark resumed input separately |
| Network loss or failed check-in | Pause, retain queued events, retry synchronization, require explicit resume |
| Missing server check-ins for more than 30 seconds | Server records a connection gap; stale sessions cannot submit |
| Page exit attempt | Log the category, issue the browser's standard unload confirmation when supported, and send a best-effort exit beacon |

Events sync shortly after activity and every 10 seconds. Repeated identical UI events are throttled to prevent floods. The session has a one-hour duration limit and a 2,000 client-event cap; the UI stops an expired/full session and requests a fresh attempt. Brief face-detection changes do not immediately create incidents. Controls and submission remain locked while paused.

## Server enforcement and reports

`POST /api/assessment-sessions` creates an owner-bound, exercise-bound session using the existing HttpOnly browser cookie. `POST /api/assessment-sessions/:id` accepts bounded ordered batches, adds server receipt timestamps, rejects reordered/replaced events and accepts identical retries. Logs use atomic local JSON writes or the existing private Blob document abstraction. The browser may retry after a lost response without duplicating events.

The receipt endpoint rejects ordinary submissions without an eligible monitored session. Client counters and client-supplied audits do not become the official integrity report: the server seals its own log and derives the counters. The session maps to one receipt, so a lost submission response can be retried without producing duplicate results. The log cannot be appended after sealing. Internal session IDs are excluded from receipt views, public reports and downloads. Existing older receipts remain readable and explicitly show that they have no server session log.

Candidate receipts, shared receipts and opted-in employer reports show the same separate integrity report: policy, check-in count, duration, observations needing review and complete event timeline. The JSON evidence download contains all event categories, elapsed times and server receipt timestamps. Skill scoring stays deterministic and independent of the review observations. Worked examples are always labeled unmonitored and have no server integrity report.

## What this implementation does not establish

The browser reports the signals; server receipt timestamps establish when reports arrived, not that the browser told the truth. A modified client can fabricate browser signals. Face detection is presence/count detection, not face recognition, identity verification, gaze analysis or liveness/virtual-camera detection. A photograph or replay can satisfy face presence. The app cannot see another device, read other tabs, prevent operating-system shortcuts, detect every extension or stop all external help. Lighting and detection errors can cause innocent interruptions; observations need human review.

No video, audio, snapshots, raw keystrokes, screen contents, clipboard contents or browsing history is collected. Original answers/code are stored only as the ordinary assessed artifact. Raw unsubmitted session logs currently have no automatic retention cleanup; add an agreed retention job before a production rollout with sustained usage. This local work does not claim hardware webcam or exhaustive accessibility verification.
