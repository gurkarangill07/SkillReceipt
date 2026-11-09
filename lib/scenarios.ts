import type { Evaluation, ScenarioWork } from "./contracts";

export type ScenarioField = {
  id: string; label: string; prompt: string; rule: string; practice: string;
  answer: string; options?: readonly { value: string; label: string }[];
};
export type Scenario = {
  id: string; title: string; category: string; subtitle: string; duration: string;
  skills: string[]; brief: string; artifactTitle: string; artifact: string;
  questions: ScenarioField[]; exerciseTitle: string; exercise: ScenarioField[];
};
export type ClientScenarioField = Omit<ScenarioField, "answer" | "rule" | "practice">;
export type ClientScenario = Omit<Scenario, "questions" | "exercise"> & { questions: ClientScenarioField[]; exercise: ClientScenarioField[] };
export function toClientScenario(scenario: Scenario): ClientScenario {
  const fields = (items: ScenarioField[]) => items.map(({ id, label, prompt, options }) => ({ id, label, prompt, ...(options ? { options } : {}) }));
  return { ...scenario, questions: fields(scenario.questions), exercise: fields(scenario.exercise) };
}
const choices = (...labels: string[]) => labels.map((label, index) => ({ value: String(index), label }));

export const SCENARIOS: Scenario[] = [
  {
    id: "frontend-developer", title: "Frontend Developer", category: "Development",
    subtitle: "Make a checkout work for everyone", duration: "4–6 min",
    skills: ["Accessibility", "Forms", "Responsive UI"],
    brief: "A small shop is losing orders on mobile. Review its checkout, make three design decisions, then match four reported bugs to concrete fixes.",
    artifactTitle: "Checkout review · issue report",
    artifact: "01  The Buy control is a clickable <div>.\n02  Email has placeholder text but no label.\n03  The layout is fixed at 1200px wide.\n04  A failed payment only turns the border red.",
    questions: [
      { id: "control", label: "Semantic controls", prompt: "What should submit the checkout form?", options: choices('A <button type="submit">', "A clickable <div>", "An <a> with no destination"), answer: "0", rule: "A native submit button provides keyboard and form behavior.", practice: "Build a form and complete it using only Tab, Enter and Space." },
      { id: "loading", label: "Submission states", prompt: "A payment request is still processing. What should the UI do?", options: choices("Keep accepting clicks", "Show progress and prevent duplicate submission", "Clear the cart immediately"), answer: "1", rule: "A visible pending state and disabled repeat action avoid accidental duplicate requests.", practice: "Model idle, pending, success and error states; test a double click." },
      { id: "error", label: "Actionable errors", prompt: "The server rejects the email address. What helps the customer recover?", options: choices("A red border alone", "Reload and erase the form", "A text error connected to the field, keeping their input"), answer: "2", rule: "An associated text message explains how to recover without losing input.", practice: "Connect an inline message with aria-describedby and preserve typed values." },
    ],
    exerciseTitle: "Match each issue to the fix you would ship.",
    exercise: [
      { id: "keyboard", label: "Keyboard checkout", prompt: "The Buy control cannot receive keyboard focus.", options: choices("Increase its font size", "Use a native button", "Add a hover animation"), answer: "1", rule: "Native buttons support keyboard focus and activation.", practice: "Replace the clickable div with a button and test keyboard activation." },
      { id: "label", label: "Field labels", prompt: "The email prompt disappears as soon as someone types.", options: choices("Add a persistent label linked with htmlFor/id", "Use a longer placeholder", "Hide the field"), answer: "0", rule: "A persistent associated label stays available while typing.", practice: "Give each input a visible label associated with its ID." },
      { id: "mobile", label: "Mobile layout", prompt: "Checkout scrolls horizontally on a 375px screen.", options: choices("Require a desktop", "Zoom the whole page out", "Use a fluid width with max-width and responsive spacing"), answer: "2", rule: "A fluid container adapts to the viewport without requiring horizontal scrolling.", practice: "Test a 375px viewport and replace the fixed width with a fluid container." },
      { id: "feedback", label: "Accessible feedback", prompt: "A screen reader does not announce a failed payment.", options: choices("Make the red brighter", "Provide text in an appropriate live region", "Play an unrelated animation"), answer: "1", rule: "A text live region can announce the payment failure.", practice: "Use an appropriate alert or live region for dynamic error feedback." },
    ],
  },
  {
    id: "qa-engineer", title: "QA Engineer", category: "Quality",
    subtitle: "Find the edges of a discount rule", duration: "4–6 min",
    skills: ["Boundary testing", "Bug reports", "Regression"],
    brief: "A shop offers a discount on eligible carts. Plan a test, write a useful bug report, and classify four boundary cases using the published rule.",
    artifactTitle: "Discount acceptance criteria",
    artifact: "Cart totals are whole cents.\nMinimum eligible total: 5,000 cents (inclusive).\nA valid coupon is also required.\nEligible carts receive exactly 10% off.\nAn invalid coupon never receives a discount.",
    questions: [
      { id: "boundary", label: "Boundary coverage", prompt: "Which set best checks the minimum spend boundary?", options: choices("100, 200, 300 cents", "4,999, 5,000, 5,001 cents", "Only 10,000 cents"), answer: "1", rule: "Test immediately below, at and above the inclusive threshold.", practice: "For each threshold, write below/at/above cases before testing typical values." },
      { id: "report", label: "Reproducible reports", prompt: "A valid 5,000-cent cart gets no discount. What goes in the report?", options: choices("Steps, exact inputs, expected 500-cent discount, actual result and environment", "Only 'checkout broken'", "A guess at who caused it"), answer: "0", rule: "A reproducible report includes concrete inputs, steps, expected and actual results.", practice: "Write a report another teammate can reproduce without asking follow-up questions." },
      { id: "regression", label: "Regression strategy", prompt: "The boundary bug is fixed. What should happen next?", options: choices("Close it without testing", "Delete the failing test", "Retest the fix and nearby valid/invalid cases"), answer: "2", rule: "Verify the fix and neighboring behavior to catch regressions.", practice: "Keep a test for the original bug and run neighboring coupon and spend cases." },
    ],
    exerciseTitle: "Enter the expected discount in whole cents.",
    exercise: [
      { id: "below", label: "Below threshold", prompt: "4,999-cent cart · valid coupon", answer: "0", rule: "4,999 is below the 5,000-cent threshold: discount is 0.", practice: "Check that spending below the inclusive boundary remains ineligible." },
      { id: "at", label: "Exact threshold", prompt: "5,000-cent cart · valid coupon", answer: "500", rule: "The threshold is inclusive: 10% of 5,000 is 500 cents.", practice: "Distinguish greater than from greater than or equal to in acceptance criteria." },
      { id: "invalid", label: "Invalid coupon", prompt: "8,000-cent cart · invalid coupon", answer: "0", rule: "An invalid coupon gives no discount even when spend is high enough.", practice: "Test combinations of valid spend and invalid coupon, not just happy paths." },
      { id: "eligible", label: "Eligible cart", prompt: "8,000-cent cart · valid coupon", answer: "800", rule: "10% of 8,000 cents is 800 cents.", practice: "Calculate the expected result independently before comparing with the app." },
    ],
  },
  {
    id: "product-analyst", title: "Product Analyst", category: "Business",
    subtitle: "Read an experiment before shipping", duration: "4–6 min",
    skills: ["Conversion", "Experiments", "Product metrics"],
    brief: "A team is testing a shorter signup flow. Calculate the observed metrics and decide what evidence the team needs before rolling it out.",
    artifactTitle: "Signup experiment · observed results",
    artifact: "Control: 1,000 visitors → 100 signups\nVariant: 1,000 visitors → 125 signups\nSupport tickets: control 8 · variant 20\nVisitors were randomly assigned.\nNo confidence interval or significance test is provided.",
    questions: [
      { id: "metric", label: "Success metric", prompt: "Which primary metric directly measures this experiment's goal?", options: choices("Page views alone", "Number of button colors", "Signups divided by visitors"), answer: "2", rule: "Signup conversion rate measures the share of visitors who sign up.", practice: "Define the numerator, denominator and observation window for each metric." },
      { id: "decision", label: "Evidence quality", prompt: "The variant has more signups. What is a sound next step?", options: choices("Claim the variant is proven better", "Check uncertainty, sample quality and guardrails before rollout", "Ignore all results"), answer: "1", rule: "Observed uplift alone does not establish statistical reliability or safe rollout.", practice: "Separate observed differences from evidence of a reliable causal effect." },
      { id: "guardrail", label: "Guardrail metrics", prompt: "Which change deserves investigation before launch?", options: choices("Support tickets rose from 8 to 20", "The two groups have equal visitor counts", "The variant has 125 signups"), answer: "0", rule: "Higher support burden can reveal confusion introduced by the variant.", practice: "Pair conversion metrics with user-experience and support guardrails." },
    ],
    exerciseTitle: "Calculate the observed results. Enter numbers only.",
    exercise: [
      { id: "control", label: "Control conversion (%)", prompt: "100 signups / 1,000 visitors × 100", answer: "10", rule: "100 ÷ 1,000 × 100 = 10%.", practice: "Divide conversions by eligible visitors before multiplying by 100." },
      { id: "variant", label: "Variant conversion (%)", prompt: "125 signups / 1,000 visitors × 100", answer: "12.5", rule: "125 ÷ 1,000 × 100 = 12.5%.", practice: "Use the same denominator definition for both experiment groups." },
      { id: "absolute", label: "Absolute increase (percentage points)", prompt: "Variant rate minus control rate", answer: "2.5", rule: "12.5% − 10% = 2.5 percentage points.", practice: "Keep percentage-point changes separate from relative percentage changes." },
      { id: "relative", label: "Relative uplift (%)", prompt: "(Variant rate − control rate) / control rate × 100", answer: "25", rule: "(12.5 − 10) ÷ 10 × 100 = 25% observed uplift.", practice: "Use the control rate as the denominator for relative uplift." },
    ],
  },
  {
    id: "security-analyst", title: "Cybersecurity Analyst", category: "Security",
    subtitle: "Triage a suspicious sign-in", duration: "4–6 min",
    skills: ["Incident triage", "Phishing", "Access control"],
    brief: "A fictional employee reports a suspicious MFA request. Review a short incident timeline, choose a safe response, and classify four response actions.",
    artifactTitle: "Incident timeline · fictional company",
    artifact: "09:10  Employee receives an unexpected MFA prompt.\n09:12  A new session appears from an unfamiliar device.\n09:14  A mailbox forwarding rule is created.\n09:16  Employee reports the activity to the help desk.\nDevice and account ownership still need verification.",
    questions: [
      { id: "triage", label: "Incident triage", prompt: "Which evidence makes this more than a failed login attempt?", options: choices("An unfamiliar device name by itself", "A successful new session followed by a mailbox rule change", "The time of day alone"), answer: "1", rule: "A successful session plus a sensitive account change warrants incident investigation.", practice: "Correlate authentication and account-change events before drawing conclusions." },
      { id: "contain", label: "Containment", prompt: "What is a reasonable immediate response under the incident runbook?", options: choices("Revoke suspicious sessions and secure the account while preserving logs", "Delete all audit logs", "Wait for another mailbox rule"), answer: "0", rule: "Contain account access while preserving the evidence needed for investigation.", practice: "Write a runbook that distinguishes containment from evidence destruction." },
      { id: "verify", label: "Safe verification", prompt: "How should the help desk verify the employee?", options: choices("Ask for their password", "Ask them to approve the suspicious prompt", "Use a known trusted contact channel and approved verification steps"), answer: "2", rule: "Use an established channel; never request credentials or approve unknown MFA prompts.", practice: "Practice identity verification through your organization's approved channels." },
    ],
    exerciseTitle: "Classify each action using the incident timeline.",
    exercise: [
      { id: "logs", label: "Preserve evidence", prompt: "Export relevant sign-in and mailbox audit events to the incident record.", options: choices("Appropriate", "Unsafe"), answer: "0", rule: "Preserved audit events support investigation and a reliable timeline.", practice: "Record timestamps, sources and actions in an access-controlled incident record." },
      { id: "password", label: "Credential handling", prompt: "Ask the employee to paste their password into the ticket.", options: choices("Appropriate", "Unsafe"), answer: "1", rule: "Passwords must not be collected in support tickets.", practice: "Use approved credential reset procedures without collecting the old password." },
      { id: "rule", label: "Persistence checks", prompt: "Review unauthorized forwarding rules and remove them after recording evidence.", options: choices("Appropriate", "Unsafe"), answer: "0", rule: "Unauthorized mailbox rules can persist after a password reset and need review.", practice: "Include forwarding rules and delegated access in an account compromise checklist." },
      { id: "close", label: "Recovery verification", prompt: "Close the incident immediately after a password reset without further checks.", options: choices("Appropriate", "Unsafe"), answer: "1", rule: "Recovery needs validation of sessions, persistence and continued suspicious activity.", practice: "Define recovery and monitoring criteria before closing an incident." },
    ],
  },
];

export const getScenario = (id: string) => SCENARIOS.find((scenario) => scenario.id === id);
export const scenarioVersions = (work: ScenarioWork) => ({ assessmentVersion: `scenario-${work.roleId}-v1`, rubricVersion: "scenario-rules-v1" });
export const tierForScore = (score: number): Evaluation["tier"] => score >= 80 ? "Strong evidence on this task" : score >= 50 ? "Developing evidence on this task" : "More practice needed on this task";
export function evaluateScenario(work: ScenarioWork): Evaluation {
  const scenario = getScenario(work.roleId)!;
  const checks = [...scenario.questions, ...scenario.exercise].map((field, index) => {
    const actual = work.answers[field.id];
    const passed = field.options ? actual === field.answer : /^\d+(?:\.\d+)?$/.test(actual.trim()) && Number(actual.trim()) === Number(field.answer);
    const pointsPossible = index < scenario.questions.length ? 20 : 10;
    const label = field.options?.find((option) => option.value === actual)?.label ?? actual;
    return { id: `scenario-${field.id}` as const, label: field.label, rule: field.rule, passed, pointsPossible, pointsEarned: passed ? pointsPossible : 0,
      observations: [`Submitted: ${label}.`, passed ? "Meets the published rule." : field.practice] };
  });
  const score = checks.reduce((sum, check) => sum + check.pointsEarned, 0);
  return { score, tier: tierForScore(score), checks };
}
