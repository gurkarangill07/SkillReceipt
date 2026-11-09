"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionContext } from "../lib/contracts";
import { createFaceMonitor, type FaceObservation } from "../lib/client/face-monitor";
import { EVENT_LABELS, HEARTBEAT_MS, MAX_EVENTS, MAX_SESSION_MS, REVIEW_EVENTS, STALE_AFTER_MS, eventTime, type ClientIntegrityEvent, type IntegrityEventKind, type ProctorState } from "../lib/proctoring";
import { Icon } from "./icon";

type Counts = { tabSwitches: number; focusLosses: number; interruptions: number; pasteEvents: number; fullscreenExits: number; activeSeconds: number };
const emptyCounts = (): Counts => ({ tabSwitches: 0, focusLosses: 0, interruptions: 0, pasteEvents: 0, fullscreenExits: 0, activeSeconds: 0 });
const exampleContext = (): SessionContext => ({ mode: "presentation", cameraStarted: false, ...emptyCounts(), fullscreenStarted: false });

export function useAssessmentSession({ enabled, demo, exercise, progress }: { enabled: boolean; demo: boolean; exercise: string; progress?: string | number }) {
  const [consent, setConsent] = useState(false), [started, setStarted] = useState(false), [paused, setPaused] = useState(false);
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [cameraBusy, setCameraBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false), [fullscreen, setFullscreen] = useState(false), [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false), [faceReady, setFaceReady] = useState(false), [faces, setFaces] = useState<number | null>(null);
  const [faceMessage, setFaceMessage] = useState("Enable your camera to check face visibility.");
  const [connected, setConnected] = useState(false), [counts, setCounts] = useState(emptyCounts), [events, setEvents] = useState<ClientIntegrityEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [cameraVersion, setCameraVersion] = useState(0);
  const video = useRef<HTMLVideoElement | null>(null), stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true), generation = useRef(0), running = useRef(false), pausedRef = useRef(false), finished = useRef(false), submitting = useRef(false);
  const id = useRef(""), begunAt = useRef(0), lastAck = useRef(0), sequence = useRef(0), queue = useRef<ClientIntegrityEvent[]>([]);
  const timeline = useRef<ClientIntegrityEvent[]>([]), countsRef = useRef(emptyCounts()), face = useRef({ detector: false, ready: false, faces: 0 });
  const sending = useRef<Promise<boolean> | null>(null), abort = useRef<AbortController | null>(null);
  const lastInput = useRef(0), idle = useRef(false), throttled = useRef<Record<string, number>>({});

  const record = useCallback((kind: IntegrityEventKind) => {
    if (!running.current || finished.current || sequence.current >= MAX_EVENTS) return;
    const now = performance.now();
    if (throttled.current[kind] && now - throttled.current[kind] < 750) return;
    throttled.current[kind] = now;
    const event = { seq: ++sequence.current, kind, elapsedMs: Math.min(MAX_SESSION_MS, Math.floor(now - begunAt.current)) };
    queue.current.push(event); timeline.current.push(event);
    if (mounted.current) setEvents([...timeline.current]);
    const keys: Partial<Record<IntegrityEventKind, keyof Counts>> = { tab_hidden: "tabSwitches", focus_lost: "focusLosses", camera_interrupted: "interruptions", camera_obscured: "interruptions", camera_stalled: "interruptions", paste_blocked: "pasteEvents", fullscreen_exit: "fullscreenExits" };
    const key = keys[kind];
    if (key) { countsRef.current = { ...countsRef.current, [key]: countsRef.current[key] + 1 }; if (mounted.current) setCounts(countsRef.current); }
  }, []);
  const pause = useCallback((message: string, kind?: IntegrityEventKind) => {
    if (!running.current || finished.current || submitting.current) return;
    if (kind) record(kind);
    pausedRef.current = true;
    if (mounted.current) { setPaused(true); setReason(message); }
  }, [record]);
  const hasCamera = useCallback(() => Boolean(stream.current?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled && !track.muted)), []);
  const liveState = useCallback((): ProctorState => ({ camera: hasCamera(), fullscreen: Boolean(document.fullscreenElement), focused: document.hasFocus(), visible: !document.hidden, detector: face.current.detector && face.current.ready, faces: face.current.faces, paused: pausedRef.current }), [hasCamera]);
  const stopCamera = useCallback(() => {
    generation.current++;
    const previous = stream.current; stream.current = null;
    previous?.getTracks().forEach((track) => track.stop());
    face.current = { detector: false, ready: false, faces: 0 };
    if (mounted.current) { setCameraReady(false); setCameraBusy(false); setFaceReady(false); setDetectorReady(false); setFaces(null); }
  }, []);
  const flush = useCallback(async (): Promise<boolean> => {
    if (sending.current) return sending.current;
    if (!id.current || finished.current) return false;
    const task = (async () => {
      do {
        const batch = queue.current.slice(0, 50);
        try {
          const response = await fetch(`/api/assessment-sessions/${id.current}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch, state: liveState() }), signal: abort.current?.signal ? AbortSignal.any([abort.current.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Session check-in failed.");
          queue.current = queue.current.filter((event) => event.seq > result.lastSeq);
          lastAck.current = performance.now();
          if (mounted.current) setConnected(true);
        } catch (failure) {
          if (mounted.current && !finished.current) { setConnected(false); pause("Your session log is disconnected. Reconnect and sync before resuming."); setError(failure instanceof Error ? failure.message : "Session check-in failed."); }
          return false;
        }
      } while (queue.current.length);
      return true;
    })();
    sending.current = task;
    try { return await task; } finally { sending.current = null; }
  }, [liveState, pause]);

  useEffect(() => {
    mounted.current = true;
    setFullscreenAvailable(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen));
    return () => { mounted.current = false; running.current = false; abort.current?.abort(); stopCamera(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [stopCamera]);
  useEffect(() => {
    if (!enabled || demo) { running.current = false; abort.current?.abort(); stopCamera(); id.current = ""; setStarted(false); setPaused(false); pausedRef.current = false; if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }
  }, [enabled, demo, stopCamera]);
  useEffect(() => { if (started && !demo) record("step_changed"); }, [progress, started, demo, record]);
  useEffect(() => {
    if (!started || demo || !events.length) return;
    const timer = window.setTimeout(() => { if (!submitting.current) void flush(); }, 400);
    return () => window.clearTimeout(timer);
  }, [events.length, started, demo, flush]);

  useEffect(() => {
    if (!cameraReady || !video.current) return;
    const element = video.current; element.srcObject = stream.current;
    let cancelled = false, cleanup: (() => void) | undefined;
    let goodAt = 0, issueAt = 0, previousIssue = "", reportedIssue = "";
    const current = generation.current;
    setFaceMessage("Loading on-device face checks…");
    const unavailable = () => {
      if (cancelled || current !== generation.current) return;
      face.current.detector = false; face.current.ready = false; setDetectorReady(false); setFaceReady(false); setFaceMessage("Face checks stopped. Reconnect your camera to try again.");
      if (reportedIssue !== "detector_unavailable") { reportedIssue = "detector_unavailable"; pause("Face detection is unavailable. Reconnect your camera before continuing.", "detector_unavailable"); }
    };
    const observe = (observation: FaceObservation) => {
      if (cancelled || current !== generation.current) return;
      const now = performance.now(), kind = observation.stalled ? "camera_stalled" : observation.dark ? "camera_obscured" : observation.faces > 1 ? "multiple_faces" : observation.faces === 0 ? "face_missing" : "";
      face.current.detector = true; face.current.faces = observation.faces; setDetectorReady(true); setFaces(observation.faces);
      if (!kind) {
        issueAt = 0; previousIssue = ""; reportedIssue = ""; if (!goodAt) goodAt = now;
        const ready = now - goodAt >= 1500; face.current.ready = ready; setFaceReady(ready); setFaceMessage(ready ? "One face visible · checks active" : "Hold still for a moment…");
      } else {
        goodAt = 0; face.current.ready = false; setFaceReady(false); if (previousIssue !== kind) { previousIssue = kind; issueAt = now; }
        const message = kind === "camera_stalled" ? "Your camera stopped sending frames." : kind === "camera_obscured" ? "Your camera is dark or covered. Improve your lighting." : kind === "multiple_faces" ? "More than one face is visible. Only the candidate should be in view." : "Move into the camera view so your face is visible.";
        setFaceMessage(message);
        if (now - issueAt >= 3000 && reportedIssue !== kind) { reportedIssue = kind; pause(message, kind); }
      }
    };
    void element.play().then(() => createFaceMonitor(element, observe, unavailable)).then((stop) => { if (cancelled) stop(); else cleanup = stop; }).catch(unavailable);
    return () => { cancelled = true; cleanup?.(); element.srcObject = null; };
  }, [cameraReady, cameraVersion, pause]);

  useEffect(() => {
    if (!enabled || demo || !started) return;
    const hidden = () => { if (document.hidden) pause("You left the assessment tab. Return and resume to continue.", "tab_hidden"); };
    const blur = () => { if (!document.hidden) pause("The assessment window lost focus. Return and resume to continue.", "focus_lost"); };
    const full = () => { const active = Boolean(document.fullscreenElement); setFullscreen(active); if (!active) pause("Fullscreen ended. Restore fullscreen before resuming.", "fullscreen_exit"); };
    const offline = () => { setConnected(false); pause("Your connection is offline. Reconnect to sync your session.", "network_offline"); };
    const block = (kind: IntegrityEventKind) => (event: Event) => { if (!running.current || finished.current) return; event.preventDefault(); record(kind); };
    const paste = block("paste_blocked"), copy = block("copy_blocked"), cut = block("cut_blocked"), drop = block("drop_blocked"), context = block("context_menu_blocked");
    const input = () => { lastInput.current = performance.now(); if (idle.current) { idle.current = false; record("idle_ended"); } };
    const key = (event: KeyboardEvent) => { input(); if (event.key === "F12" || ((event.ctrlKey || event.metaKey) && ["p", "s", "u", "i", "j", "k"].includes(event.key.toLowerCase()))) { event.preventDefault(); record("shortcut_blocked"); } };
    const change = () => record("answer_changed");
    const navigation = (event: BeforeUnloadEvent) => { if (!running.current || finished.current || submitting.current) return; record("navigation_attempt"); event.preventDefault(); event.returnValue = ""; void flush(); };
    const leaving = () => {
      if (!running.current || finished.current || submitting.current) return;
      record("navigation_attempt");
      navigator.sendBeacon(`/api/assessment-sessions/${id.current}`, new Blob([JSON.stringify({ events: queue.current.slice(0, 50), state: { ...liveState(), paused: true } })], { type: "application/json" }));
    };
    const link = (event: MouseEvent) => { if ((event.target as Element | null)?.closest("a[href]")) leaving(); };
    const timer = window.setInterval(() => {
      const now = performance.now(); setElapsed(Math.floor((now - begunAt.current) / 1000));
      if (!pausedRef.current && !document.hidden && !finished.current) { countsRef.current = { ...countsRef.current, activeSeconds: countsRef.current.activeSeconds + 1 }; setCounts(countsRef.current); }
      if (!pausedRef.current && now - lastInput.current >= 60_000 && !idle.current) { idle.current = true; record("idle_started"); }
      if (!hasCamera() && !pausedRef.current) { setCameraReady(false); pause("The camera stopped. Reconnect before resuming.", "camera_interrupted"); }
      if (now - lastAck.current > STALE_AFTER_MS) { setConnected(false); pause("Session check-ins stopped. Sync your session before resuming."); }
      if (now - begunAt.current >= MAX_SESSION_MS) pause("This one-hour session expired. Start a new attempt.");
      if (sequence.current >= MAX_EVENTS) pause("Session event limit reached. Start a new attempt.");
    }, 1000);
    const heartbeat = window.setInterval(() => { if (!submitting.current) void flush(); }, HEARTBEAT_MS);
    const online = () => { void flush(); };
    document.addEventListener("visibilitychange", hidden); window.addEventListener("blur", blur); document.addEventListener("fullscreenchange", full);
    window.addEventListener("offline", offline); window.addEventListener("online", online); window.addEventListener("beforeunload", navigation);
    window.addEventListener("pagehide", leaving); document.addEventListener("click", link, true);
    document.addEventListener("paste", paste, true); document.addEventListener("copy", copy, true); document.addEventListener("cut", cut, true); document.addEventListener("drop", drop, true); document.addEventListener("contextmenu", context, true);
    document.addEventListener("keydown", key, true); document.addEventListener("pointerdown", input, true); document.addEventListener("change", change, true);
    return () => {
      window.clearInterval(timer); window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", hidden); window.removeEventListener("blur", blur); document.removeEventListener("fullscreenchange", full);
      window.removeEventListener("offline", offline); window.removeEventListener("online", online); window.removeEventListener("beforeunload", navigation);
      window.removeEventListener("pagehide", leaving); document.removeEventListener("click", link, true);
      document.removeEventListener("paste", paste, true); document.removeEventListener("copy", copy, true); document.removeEventListener("cut", cut, true); document.removeEventListener("drop", drop, true); document.removeEventListener("contextmenu", context, true);
      document.removeEventListener("keydown", key, true); document.removeEventListener("pointerdown", input, true); document.removeEventListener("change", change, true);
    };
  }, [enabled, demo, started, record, pause, flush, hasCamera, liveState]);

  async function enableCamera() {
    if (!consent || cameraBusy || finished.current) return;
    stopCamera(); const current = generation.current; setCameraBusy(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Use localhost or HTTPS in a browser that supports camera access.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      if (!mounted.current || current !== generation.current || finished.current) { media.getTracks().forEach((track) => track.stop()); return; }
      const track = media.getVideoTracks()[0];
      if (!track || track.readyState !== "live") { media.getTracks().forEach((item) => item.stop()); throw new Error("No working camera found. Connect a camera to continue."); }
      stream.current = media; setCameraReady(true); setCameraVersion((value) => value + 1);
      let interrupted = false;
      const lost = () => { if (interrupted || current !== generation.current || finished.current || !mounted.current) return; interrupted = true; setCameraReady(false); face.current.ready = false; setFaceReady(false); pause("Camera access was interrupted. Reconnect to continue.", "camera_interrupted"); };
      track.addEventListener("ended", lost); track.addEventListener("mute", lost);
    } catch (failure) { if (mounted.current && current === generation.current) setError(failure instanceof Error && failure.name !== "NotAllowedError" ? failure.message : "Camera permission was denied. Allow camera access in your browser settings and try again. A camera is required for this assessment."); }
    finally { if (mounted.current && current === generation.current) setCameraBusy(false); }
  }
  async function begin() {
    if (!consent || !hasCamera() || !face.current.ready || busy || finished.current) return;
    setBusy(true); setError(""); const current = generation.current;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      setFullscreen(Boolean(document.fullscreenElement)); const state = liveState();
      if (!state.fullscreen || !state.focused || !face.current.ready) throw new Error("Keep your face in view and the fullscreen assessment focused, then try again.");
      abort.current = new AbortController();
      const response = await fetch("/api/assessment-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exercise, consent, state: { ...state, paused: false } }), signal: AbortSignal.any([abort.current.signal, AbortSignal.timeout(10_000)]) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Your monitored session could not start.");
      if (!mounted.current || current !== generation.current) return;
      id.current = result.id; begunAt.current = performance.now(); lastInput.current = begunAt.current; lastAck.current = begunAt.current;
      sequence.current = 0; queue.current = []; timeline.current = []; countsRef.current = emptyCounts(); throttled.current = {};
      running.current = true; pausedRef.current = false; setPaused(false); setStarted(true); setConnected(true); setEvents([]); setCounts(emptyCounts()); setReason("");
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Fullscreen is required. Use a supported desktop browser and try again."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function resume() {
    if (!hasCamera() || !face.current.ready || busy) return;
    setBusy(true); setError("");
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!document.hasFocus() || document.hidden) throw new Error("Return to the assessment window to resume.");
      if (!await flush()) return;
      pausedRef.current = false; record("resumed"); if (!await flush()) return;
      setPaused(false); setReason(""); lastInput.current = performance.now();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Restore fullscreen before resuming."); }
    finally { if (mounted.current) setBusy(false); }
  }
  function canSubmit() {
    if (finished.current) return false; if (demo) return true; if (!running.current || pausedRef.current) return false;
    const state = liveState();
    if (!state.camera || !state.fullscreen || !state.focused || !state.visible || !state.detector || state.faces !== 1 || !navigator.onLine) { pause("Restore your camera, face visibility, connection and fullscreen before submitting."); return false; }
    return true;
  }
  function snapshot(): SessionContext { return demo ? exampleContext() : { mode: "camera", cameraStarted: true, ...countsRef.current, fullscreenStarted: true, sessionId: id.current }; }
  async function prepareSubmission() {
    if (!canSubmit()) throw new Error("Resume your monitored session before submitting.");
    if (demo) return { session: exampleContext(), sessionSequence: 0 };
    if (!await flush() || !canSubmit()) throw new Error("Session events could not sync. Reconnect and resume before submitting.");
    if (queue.current.length && !await flush()) throw new Error("Wait for session events to sync.");
    submitting.current = true;
    return { session: snapshot(), sessionSequence: sequence.current };
  }
  function submissionFailed() { submitting.current = false; }
  function finish() { finished.current = true; running.current = false; abort.current?.abort(); stopCamera(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }
  function changeConsent(value: boolean) { setConsent(value); if (!value) { pause("Monitoring consent was withdrawn. Restore consent to continue.", "camera_interrupted"); stopCamera(); } }
  return { demo, enabled, consent, setConsent: changeConsent, started: demo || started, paused: !demo && paused, reason, error, busy, cameraBusy, cameraReady, fullscreen, fullscreenAvailable, detectorReady, faceReady, faces, faceMessage, connected, counts, events, elapsed, video, enableCamera, begin, resume, canSubmit, snapshot, prepareSubmission, submissionFailed, finish, record, stopCamera: () => { pause("You stopped the camera. Reconnect it before resuming.", "camera_interrupted"); stopCamera(); } };
}

export type AssessmentSessionChecks = ReturnType<typeof useAssessmentSession>;
export function AssessmentSession({ checks, showcase = false }: { checks: AssessmentSessionChecks; showcase?: boolean }) {
  if (!checks.enabled) return null;
  if (checks.demo) return <div className="session-example" role="status"><strong>Worked example · unmonitored</strong><span>Examples do not count as independent assessments. Start a fresh attempt to demonstrate the camera and integrity checks.</span></div>;
  const ready = checks.consent && checks.cameraReady && checks.detectorReady && checks.faceReady && checks.fullscreenAvailable;
  const incidents = checks.events.filter((event) => REVIEW_EVENTS.has(event.kind)).length;
  return <section className={`assessment-session panel integrity-session ${checks.paused ? "integrity-paused" : ""}`} aria-label="Session checks">
    <header className="integrity-heading"><div><p className="eyebrow">{checks.started ? "LIVE ASSESSMENT INTEGRITY" : "BEFORE YOU BEGIN"}</p><h2>{checks.started ? checks.paused ? "Your test is paused." : "Your session is protected." : "Get ready for your camera assessment."}</h2><p>{checks.started ? checks.paused ? checks.reason : "Stay in fullscreen with your face visible. Your session activity accompanies your result." : "A working camera and fullscreen are required throughout your assessment. Complete these checks to unlock the exercise."}</p></div><span className={`tag ${checks.started && !checks.paused ? "integrity-ok" : ""}`}><Icon name="lock" size={13} />{checks.started ? checks.paused ? "Action required" : "Monitoring active" : "Camera required"}</span></header>
    <div className="integrity-layout"><div className="integrity-content">
      {!checks.started ? <><ol className="integrity-checklist"><li><span className={checks.consent ? "check-ready" : ""}>1</span><div><strong>Understand the session checks</strong><p>We log tab and window changes, fullscreen exits, camera and face-presence issues, blocked clipboard actions, activity timing and connection gaps.</p></div></li><li><span className={checks.cameraReady && checks.faceReady ? "check-ready" : ""}>2</span><div><strong>Connect your camera</strong><p>Sit alone in good lighting with your face in view. Face checks run on this device; video and audio are never uploaded or recorded.</p></div></li><li><span className={checks.fullscreen ? "check-ready" : ""}>3</span><div><strong>Enter fullscreen and start</strong><p>The exercise pauses when required checks fail. Copy, paste, cut and drag and drop are blocked during the test.</p></div></li></ol><label className="integrity-consent"><input type="checkbox" checked={checks.consent} onChange={(event) => checks.setConsent(event.target.checked)} /><span>I agree to the camera and session checks described above and to including the event report with my result. No footage, audio, clipboard contents or browsing history is saved.</span></label></> : <><div className="integrity-status-grid"><span>Camera<strong>{checks.cameraReady ? "Connected" : "Reconnect"}</strong></span><span>Face check<strong>{checks.faceReady ? "One face visible" : "Needs attention"}</strong></span><span>Fullscreen<strong>{checks.fullscreen ? "Active" : "Restore"}</strong></span><span>Session log<strong>{checks.connected ? "Synced" : "Reconnecting"}</strong></span></div><div className="session-metrics"><span>Session time <strong>{eventTime(checks.elapsed * 1000)}</strong></span><span>Review events <strong>{incidents}</strong></span><span>Tab changes <strong>{checks.counts.tabSwitches}</strong></span><span>Blocked pastes <strong>{checks.counts.pasteEvents}</strong></span></div></>}
      <div className="session-actions">{(!checks.cameraReady || !checks.detectorReady) && <button type="button" className="button button-outline button-small" disabled={!checks.consent || checks.cameraBusy || checks.busy} onClick={checks.enableCamera}>{checks.cameraBusy ? "Connecting camera…" : checks.started || checks.cameraReady ? "Reconnect camera" : "Enable camera"}</button>}{!checks.started ? <button type="button" className="button button-dark" disabled={!ready || checks.busy} onClick={checks.begin}>{checks.busy ? "Starting session…" : "Enter fullscreen & begin"}<Icon name="arrow" size={16} /></button> : checks.paused ? <button type="button" className="button button-dark" disabled={!checks.cameraReady || !checks.faceReady || checks.busy} onClick={checks.resume}>{checks.busy ? "Checking session…" : "Resume test"}</button> : <button type="button" className="text-button" onClick={checks.stopCamera}>Stop camera & pause</button>}</div>
      {!checks.fullscreenAvailable && <p className="integrity-alert" role="alert">This assessment requires a browser with fullscreen support. Open it in a supported desktop browser.</p>}
      {checks.error && <p className="integrity-alert" role="alert">{checks.error}</p>}
    </div><aside className="integrity-camera"><div className="integrity-video">{checks.cameraReady ? <><video ref={checks.video} autoPlay muted playsInline aria-label="Your on-device camera preview" /><span className="camera-live-dot">LIVE · ON DEVICE</span></> : <div className="camera-placeholder"><Icon name="lock" size={27} /><strong>Your camera preview</strong><span>{checks.cameraBusy ? "Waiting for camera permission…" : "Your camera stays off until you give permission."}</span></div>}</div><p className={`camera-check-status ${checks.faceReady ? "check-ready-text" : ""}`} role="status">{checks.faceMessage}</p><p className="micro muted">No recordings. Face counts only. Checks are observations for review, not an identity verification or a cheating verdict.</p></aside></div>
    {checks.started && <details className="integrity-timeline" open={showcase || checks.paused}><summary>Live event timeline <span>{checks.events.length} events</span></summary>{checks.events.length ? <ol>{checks.events.slice(-12).reverse().map((event) => <li key={event.seq}><time>{eventTime(event.elapsedMs)}</time><span>{EVENT_LABELS[event.kind]}</span><span className={`tag ${REVIEW_EVENTS.has(event.kind) ? "integrity-review" : ""}`}>{REVIEW_EVENTS.has(event.kind) ? "Review" : "Activity"}</span></li>)}</ol> : <p className="micro muted">Your session has started. Activity and interruptions will appear here.</p>}</details>}
  </section>;
}
