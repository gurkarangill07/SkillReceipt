"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionContext } from "../lib/contracts";

type SessionCounts = { tabSwitches: number; focusLosses: number; interruptions: number; pasteEvents: number; fullscreenExits: number; activeSeconds: number };
const emptyCounts = (): SessionCounts => ({ tabSwitches: 0, focusLosses: 0, interruptions: 0, pasteEvents: 0, fullscreenExits: 0, activeSeconds: 0 });
const bounded = (value: number) => Math.min(86_400, Math.max(0, value));

export function useAssessmentSession({ enabled, demo }: { enabled: boolean; demo: boolean }) {
  const [mode, setMode] = useState<"camera" | "practice">("camera");
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reason, setReason] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<SessionCounts>(emptyCounts);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const countsRef = useRef<SessionCounts>(emptyCounts());
  const cameraStarted = useRef(false);
  const fullscreenStarted = useRef(false);
  const fullscreenGeneration = useRef(0);
  const startedRef = useRef(false);
  const running = useRef(false);
  const pausedRef = useRef(false);
  const finished = useRef(false);
  const frozen = useRef<SessionContext | null>(null);

  const updateCounts = useCallback((key: keyof SessionCounts) => {
    countsRef.current = { ...countsRef.current, [key]: bounded(countsRef.current[key] + 1) };
    if (mounted.current) setCounts(countsRef.current);
  }, []);
  const stopCamera = useCallback(() => {
    generation.current++;
    const previous = stream.current;
    stream.current = null;
    previous?.getTracks().forEach((track) => track.stop());
    if (mounted.current) { setCameraReady(false); setCameraBusy(false); }
  }, []);
  const pause = useCallback((message: string) => {
    if (finished.current || !running.current) return;
    pausedRef.current = true;
    if (mounted.current) { setPaused(true); setReason(message); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setFullscreenAvailable(Boolean(document.documentElement.requestFullscreen));
    return () => {
      mounted.current = false; running.current = false; startedRef.current = false;
      fullscreenGeneration.current++; stopCamera();
      if (fullscreenStarted.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    };
  }, [stopCamera]);
  useEffect(() => {
    if (!enabled || demo) {
      running.current = false;
      startedRef.current = false;
      stopCamera();
      if (fullscreenStarted.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
      setFullscreen(false);
      setStarted(false); setPaused(false); pausedRef.current = false;
    }
  }, [enabled, demo, stopCamera]);

  useEffect(() => {
    if (!enabled || demo || !started) return;
    running.current = true;
    const hidden = () => {
      if (document.hidden && !finished.current) { updateCounts("tabSwitches"); pause("You left the test tab. Your answers are saved here."); }
    };
    const blurred = () => {
      if (!finished.current && !document.hidden) { updateCounts("focusLosses"); pause("The test window lost focus. Return here when you’re ready."); }
    };
    const pasted = () => { if (!finished.current && !pausedRef.current) updateCounts("pasteEvents"); };
    const fullscreenChanged = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreen(active);
      if (active) fullscreenStarted.current = true;
      else if (fullscreenStarted.current && !finished.current) {
        updateCounts("fullscreenExits"); pause("Full screen ended. You can resume the test when ready.");
      }
    };
    const timer = window.setInterval(() => {
      if (!finished.current && !document.hidden && !pausedRef.current) updateCounts("activeSeconds");
    }, 1000);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blurred);
    document.addEventListener("paste", pasted);
    document.addEventListener("fullscreenchange", fullscreenChanged);
    return () => {
      running.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blurred);
      document.removeEventListener("paste", pasted);
      document.removeEventListener("fullscreenchange", fullscreenChanged);
    };
  }, [enabled, demo, started, pause, updateCounts]);

  async function enableCamera() {
    if (!consent || cameraBusy || finished.current) return;
    stopCamera();
    const current = generation.current;
    setCameraBusy(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs localhost or HTTPS and a supported browser.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false });
      if (!mounted.current || current !== generation.current || finished.current) { media.getTracks().forEach((track) => track.stop()); return; }
      const track = media.getVideoTracks()[0];
      if (!track || track.readyState !== "live") { media.getTracks().forEach((item) => item.stop()); throw new Error("No active camera was found. Try another camera or use practice mode."); }
      stream.current = media;
      cameraStarted.current = true;
      setCameraReady(true);
      let interrupted = false;
      const interruptedCamera = () => {
        if (current !== generation.current || finished.current || !mounted.current || interrupted) return;
        interrupted = true;
        setCameraReady(false);
        if (running.current) { updateCounts("interruptions"); pause("The camera was interrupted. Reconnect it or continue in practice mode."); }
      };
      track.addEventListener("ended", interruptedCamera);
      track.addEventListener("mute", interruptedCamera);
    } catch (failure) {
      if (mounted.current && current === generation.current) setError(failure instanceof Error && failure.name !== "NotAllowedError" ? failure.message : "Camera permission was denied. Allow access in your browser or choose practice mode.");
    } finally {
      if (mounted.current && current === generation.current) setCameraBusy(false);
    }
  }
  function chooseMode(next: "camera" | "practice") {
    if (next === "practice") stopCamera();
    setMode(next); setError("");
    if (started) pause(next === "practice" ? "Camera checks are off. Resume in practice mode when ready." : "Enable the camera before you resume.");
  }
  function hasLiveCamera() {
    return Boolean(stream.current?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled && !track.muted));
  }
  function begin() {
    if (!consent || finished.current || (mode === "camera" && !hasLiveCamera())) return;
    startedRef.current = true;
    setStarted(true); setPaused(false); pausedRef.current = false; setReason("");
  }
  function resume() {
    if (document.hidden || (mode === "camera" && !hasLiveCamera())) return;
    pausedRef.current = false; setPaused(false); setReason("");
  }
  async function requestFullscreen() {
    setError("");
    const requestGeneration = fullscreenGeneration.current;
    try {
      if (!document.documentElement.requestFullscreen) throw new Error("Full screen is unavailable in this browser. You can still continue.");
      await document.documentElement.requestFullscreen();
      if (!mounted.current || requestGeneration !== fullscreenGeneration.current || finished.current) {
        if (document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
        return;
      }
      if (document.fullscreenElement) { fullscreenStarted.current = true; setFullscreen(true); }
    } catch { if (mounted.current) setError("Full screen could not start. You can continue without it."); }
  }
  function canSubmit() {
    if (finished.current) return false;
    if (demo) return true;
    if (!enabled || !startedRef.current || pausedRef.current || document.hidden) return false;
    if (mode === "camera" && !hasLiveCamera()) {
      updateCounts("interruptions"); pause("The camera is no longer active. Reconnect it before continuing."); setCameraReady(false);
      return false;
    }
    return true;
  }
  function snapshot(): SessionContext {
    if (frozen.current) return { ...frozen.current };
    if (demo) return { mode: "presentation", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 0, focusLosses: 0, pasteEvents: 0, fullscreenExits: 0, fullscreenStarted: false };
    return { mode, cameraStarted: cameraStarted.current, ...countsRef.current, fullscreenStarted: fullscreenStarted.current };
  }
  function finish() {
    frozen.current = snapshot();
    finished.current = true; running.current = false;
    startedRef.current = false;
    stopCamera();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
  return { demo, enabled, mode, consent, setConsent, started: demo || started, paused: !demo && paused, reason, cameraReady, cameraBusy, stream: stream.current, fullscreen, fullscreenAvailable, error, counts, chooseMode, enableCamera, begin, resume, requestFullscreen, stopCamera: () => { stopCamera(); if (started) { updateCounts("interruptions"); pause("The camera is off. Reconnect it or switch to practice mode."); } }, canSubmit, snapshot, finish };
}

export type AssessmentSessionChecks = ReturnType<typeof useAssessmentSession>;

export function AssessmentSession({ checks }: { checks: AssessmentSessionChecks }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (video.current) video.current.srcObject = checks.stream; }, [checks.stream, checks.cameraReady]);
  if (!checks.enabled) return null;
  if (checks.demo) return <div className="session-live session-example" role="status"><strong>Worked example</strong><span>Camera and session checks are off. This attempt stays labeled as an example.</span></div>;
  const camera = <div className="session-video">{checks.cameraReady ? <video ref={video} autoPlay muted playsInline aria-label="Your on-device camera preview" /> : <span>{checks.cameraBusy ? "Waiting for permission…" : "Camera preview"}</span>}</div>;
  return <section className={`assessment-session panel ${checks.started ? "session-live" : "session-setup"}`} aria-label="Session checks">
    <div className="session-heading"><div><p className="eyebrow">SESSION CHECKS</p><h2>{checks.started ? checks.paused ? "Your test is paused." : "Your session is running." : "Choose how to take your test."}</h2></div><span className="tag">{checks.started ? checks.mode === "camera" ? checks.cameraReady ? "Camera on" : "Camera interrupted" : "Practice" : "Before you begin"}</span></div>
    <div className="session-body"><div>{!checks.started ? <><p>Camera mode shows an on-device preview and adds session context. Practice works without a camera.</p><div className="session-options" role="group" aria-label="Session mode"><button type="button" className={checks.mode === "camera" ? "selected" : ""} aria-pressed={checks.mode === "camera"} onClick={() => checks.chooseMode("camera")}>Camera session</button><button type="button" className={checks.mode === "practice" ? "selected" : ""} aria-pressed={checks.mode === "practice"} onClick={() => checks.chooseMode("practice")}>Practice without camera</button></div><label className="checkbox-label session-consent"><input type="checkbox" checked={checks.consent} onChange={(event) => checks.setConsent(event.target.checked)} /><span>I agree to include browser-reported session activity with this result. Camera preview stays on this device; video, audio and clipboard contents are not saved.</span></label></> : <><p className="small muted">{checks.paused ? checks.reason : "Keep this tab open while you work. Your camera stays on this device."}</p><div className="session-metrics"><span>Tab changes <strong>{checks.counts.tabSwitches}</strong></span><span>Focus changes <strong>{checks.counts.focusLosses}</strong></span><span>Paste events <strong>{checks.counts.pasteEvents}</strong></span></div></>}
      <div className="session-actions">{checks.mode === "camera" && !checks.cameraReady && <button type="button" className="button button-outline button-small" disabled={!checks.consent || checks.cameraBusy} onClick={checks.enableCamera}>{checks.cameraBusy ? "Connecting…" : checks.started ? "Reconnect camera" : "Enable camera preview"}</button>}{!checks.started ? <button type="button" className="button button-dark button-small" disabled={!checks.consent || (checks.mode === "camera" && !checks.cameraReady)} onClick={checks.begin}>Begin test</button> : checks.paused ? <><button type="button" className="button button-dark button-small" disabled={checks.mode === "camera" && !checks.cameraReady} onClick={checks.resume}>Resume test</button>{checks.mode === "camera" && <button type="button" className="text-button" onClick={() => checks.chooseMode("practice")}>Switch to practice</button>}</> : checks.mode === "camera" ? <button type="button" className="text-button" onClick={checks.stopCamera}>Stop camera & pause</button> : null}{checks.fullscreenAvailable && !checks.fullscreen && <button type="button" className="text-button" onClick={checks.requestFullscreen}>Use full screen</button>}</div>
      {checks.error && <p className="notice notice-error" role="alert">{checks.error}</p>}<p className="micro muted">These checks provide session context. They do not prove independent work or change your skill score.</p>
    </div>{checks.mode === "camera" && camera}</div>
  </section>;
}
