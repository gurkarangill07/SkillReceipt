import type { DataRow } from "./contracts";
import type { PipelineWork } from "./contracts";
import { PIPELINE_TASKS, SIMPLE_TASKS } from "./career";
import type { ScenarioWork } from "./contracts";
import { getScenario } from "./scenarios";

export function scenarioToCsv(work: ScenarioWork): string {
  const scenario = getScenario(work.roleId)!;
  return [["check", "submitted_answer"], ...[...scenario.questions, ...scenario.exercise].map((field) => [field.label, field.options?.find((option) => option.value === work.answers[field.id])?.label ?? work.answers[field.id]])].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function pipelineToCsv(work: PipelineWork): string {
  const tasks = work.kind === "data-engineer-v2" ? SIMPLE_TASKS : PIPELINE_TASKS;
  return [["decision", "submitted_configuration"], ...tasks.map((task) => [task.label, work.answers[task.id] ?? ""]), ...(work.kind === "data-engineer-v2" ? [["JavaScript", work.code ?? ""]] : [])].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvCell(value: string): string {
  // Prefix formulas even when hidden behind leading whitespace/control characters.
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: readonly DataRow[]): string {
  const header = ["order_id", "order_date", "region", "revenue_cad"];
  return [header, ...rows.map((row) => [row.orderId, row.date, row.region, row.revenue])]
    .map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
