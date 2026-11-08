import { EVENT_KINDS, MAX_EVENTS, MAX_SESSION_MS, PROCTOR_POLICY, type ClientIntegrityEvent, type IntegrityAudit, type ProctorState } from "./proctoring";
import { InputError, isRecord } from "./validation";

export function parseEvents(value: unknown): ClientIntegrityEvent[] {
  if (!Array.isArray(value) || value.length > 50) throw new InputError("Send at most 50 session events at a time.");
  return value.map((event) => {
    if (!isRecord(event) || !Number.isInteger(event.seq) || Number(event.seq) < 1 || Number(event.seq) > MAX_EVENTS || !EVENT_KINDS.includes(event.kind as never) || !Number.isInteger(event.elapsedMs) || Number(event.elapsedMs) < 0 || Number(event.elapsedMs) > MAX_SESSION_MS) throw new InputError("Invalid session event.");
    return { seq: Number(event.seq), kind: event.kind as ClientIntegrityEvent["kind"], elapsedMs: Number(event.elapsedMs) };
  });
}
export function parseProctorState(value: unknown): ProctorState {
  const flags = ["camera", "fullscreen", "focused", "visible", "detector", "paused"] as const;
  if (!isRecord(value) || flags.some((key) => typeof value[key] !== "boolean") || !Number.isInteger(value.faces) || Number(value.faces) < 0 || Number(value.faces) > 20) throw new InputError("Invalid live session status.");
  return Object.fromEntries([...flags.map((key) => [key, value[key]]), ["faces", value.faces]]) as ProctorState;
}
export const stateReady = (state: ProctorState) => state.camera && state.fullscreen && state.focused && state.visible && state.detector && state.faces === 1 && !state.paused;
export function parseAudit(value: unknown): IntegrityAudit {
  if (!isRecord(value) || value.policy !== PROCTOR_POLICY || !Array.isArray(value.events) || value.events.length > MAX_EVENTS + 300 || !Number.isInteger(value.heartbeats) || Number(value.heartbeats) < 1 || !Number.isInteger(value.connectionGaps) || Number(value.connectionGaps) < 0) throw new InputError("Invalid integrity report.");
  const date = (input: unknown) => { if (typeof input !== "string" || input.length > 30 || !Number.isFinite(Date.parse(input))) throw new InputError("Invalid integrity timestamp."); return input; };
  const startedAt = date(value.startedAt), endedAt = date(value.endedAt);
  if (Date.parse(endedAt) < Date.parse(startedAt)) throw new InputError("Invalid integrity duration.");
  const events = value.events.map((event) => {
    if (!isRecord(event) || !Number.isInteger(event.seq) || Number(event.seq) < 0 || Number(event.seq) > MAX_EVENTS || !EVENT_KINDS.includes(event.kind as never) || !Number.isInteger(event.elapsedMs) || Number(event.elapsedMs) < 0 || Number(event.elapsedMs) > MAX_SESSION_MS) throw new InputError("Invalid stored session event.");
    return { seq: Number(event.seq), kind: event.kind as ClientIntegrityEvent["kind"], elapsedMs: Number(event.elapsedMs), receivedAt: date(event.receivedAt) };
  });
  return { policy: PROCTOR_POLICY, startedAt, endedAt, heartbeats: Number(value.heartbeats), connectionGaps: Number(value.connectionGaps), events };
}
