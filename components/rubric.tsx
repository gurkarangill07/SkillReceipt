import { RUBRIC } from "../lib/assessment";
import { Icon } from "./icon";

export function Rubric() {
  return <details className="rubric-disclosure panel" id="rubric"><summary><span className="icon-label"><Icon name="file" />The published rubric</span><span className="rubric-summary">6 checks · 100 points <Icon name="chevron" size={16} /></span></summary><div className="rubric-body"><p>Each check awards all of its points or none. Some checks share prerequisites; they are not independent measures of ability.</p><ol className="rubric-list">{RUBRIC.map((check) => <li key={check.id}><div><strong>{check.label}</strong><p>{check.rule}</p></div><span className="points mono">{check.pointsPossible} pts</span></li>)}</ol><p className="micro muted">80–100: Strong evidence on this task · 50–79: Developing evidence on this task · 0–49: More practice needed on this task. These are prototype thresholds, not industry benchmarks. A high score does not override a failed check.</p></div></details>;
}
