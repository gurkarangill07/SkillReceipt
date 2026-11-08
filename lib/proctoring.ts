// Shared policy. Events carry categories and timing, never key presses or clipboard contents.
export const PROCTOR_POLICY = "camera-fullscreen-v1";
export const HEARTBEAT_MS = 10_000;
export const STALE_AFTER_MS = 30_000;
export const MAX_SESSION_MS = 60 * 60 * 1000;
export const MAX_EVENTS = 2000;
export const EVENT_KINDS = ["session_started", "heartbeat", "tab_hidden", "focus_lost", "fullscreen_exit", "camera_interrupted", "camera_obscured", "camera_stalled", "face_missing", "multiple_faces", "detector_unavailable", "paste_blocked", "copy_blocked", "cut_blocked", "drop_blocked", "context_menu_blocked", "shortcut_blocked", "network_offline", "connection_gap", "idle_started", "idle_ended", "resumed", "answer_changed", "code_run", "step_changed", "navigation_attempt", "session_submitted"] as const;
export type IntegrityEventKind = typeof EVENT_KINDS[number];
export type ClientIntegrityEvent = { seq: number; kind: IntegrityEventKind; elapsedMs: number };
export type IntegrityEvent = ClientIntegrityEvent & { receivedAt: string };
export type ProctorState = { camera: boolean; fullscreen: boolean; focused: boolean; visible: boolean; detector: boolean; faces: number; paused: boolean };
export type IntegrityAudit = { policy: string; startedAt: string; endedAt: string; heartbeats: number; connectionGaps: number; events: IntegrityEvent[] };
export const EVENT_LABELS: Record<IntegrityEventKind, string> = {
  session_started: "Session started", heartbeat: "Session check-in", tab_hidden: "Test tab left", focus_lost: "Window lost focus", fullscreen_exit: "Fullscreen exited", camera_interrupted: "Camera interrupted", camera_obscured: "Camera dark or covered", camera_stalled: "Camera frames stopped", face_missing: "No face in view", multiple_faces: "Multiple faces in view", detector_unavailable: "Face check unavailable", paste_blocked: "Paste blocked", copy_blocked: "Copy blocked", cut_blocked: "Cut blocked", drop_blocked: "Drag and drop blocked", context_menu_blocked: "Context menu blocked", shortcut_blocked: "Restricted shortcut blocked", network_offline: "Network disconnected", connection_gap: "Missing session check-ins", idle_started: "No input for 60 seconds", idle_ended: "Input resumed", resumed: "Test resumed", answer_changed: "Answer edited", code_run: "Coding tests run", step_changed: "Assessment step changed", navigation_attempt: "Page exit attempted", session_submitted: "Submission received",
};
export const REVIEW_EVENTS = new Set<IntegrityEventKind>(["tab_hidden", "focus_lost", "fullscreen_exit", "camera_interrupted", "camera_obscured", "camera_stalled", "face_missing", "multiple_faces", "detector_unavailable", "paste_blocked", "copy_blocked", "cut_blocked", "drop_blocked", "shortcut_blocked", "network_offline", "connection_gap", "navigation_attempt"]);
export const eventTime = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}`;
