import type { SessionContext } from "../lib/contracts";
import { Icon } from "./icon";

export function SessionReport({ session, demo = false }: { session?: SessionContext; demo?: boolean }) {
  const observations = session ? session.tabSwitches + session.interruptions + (session.focusLosses ?? 0) + (session.fullscreenExits ?? 0) : 0;
  return <section className="session-report panel" aria-label="Assessment session report">
    <div className="session-report-title"><div><p className="eyebrow">SESSION REPORT</p><h2>{demo || session?.mode === "presentation" ? "Worked example" : session?.mode === "camera" ? "Camera session" : "Practice session"}</h2></div><span className="tag">{demo ? "Example attempt" : !session ? "No session checks" : observations ? "Review observations" : "No interruptions reported"}</span></div>
    {session && !demo && <dl className="session-facts"><div><dt>Camera preview</dt><dd>{session.cameraStarted ? "Started" : "Not used"}</dd></div><div><dt>Time on task</dt><dd>{Math.floor(session.activeSeconds / 60)}m {session.activeSeconds % 60}s</dd></div><div><dt>Tab changes</dt><dd>{session.tabSwitches}</dd></div><div><dt>Camera interruptions</dt><dd>{session.interruptions}</dd></div><div><dt>Focus changes</dt><dd>{session.focusLosses ?? 0}</dd></div><div><dt>Paste events</dt><dd>{session.pasteEvents ?? 0}</dd></div><div><dt>Fullscreen</dt><dd>{session.fullscreenStarted ? `${session.fullscreenExits ?? 0} exits` : "Not used"}</dd></div></dl>}
    <p className="micro muted"><Icon name="info" size={13} /> {demo ? "Example answers were used; this attempt does not represent independent completion." : "Browser-reported observations, not a cheating verdict. No footage or clipboard content is stored. These observations do not change the skill score."}</p>
  </section>;
}
