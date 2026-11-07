import "server-only";
import { getQuickJS } from "quickjs-emscripten";
import { CODING_CASES, type CodingRun } from "../coding";
import { InputError } from "../validation";
import { evaluateEngineer } from "../career";
import type { Evaluation, PipelineWork } from "../contracts";

export function storedCodingEvaluation(work: PipelineWork, value: Record<string, unknown>): Evaluation {
  const checks = value.checks as { id?: string; observations?: unknown }[];
  const observations = checks.find((check) => check.id === "coding")?.observations;
  if (!Array.isArray(observations) || observations.length !== 4) throw new Error("Stored coding evidence is invalid.");
  const tests = CODING_CASES.map((example, index) => {
    const text = observations[index];
    if (text !== `Passed: ${example.label}.` && text !== `Not passed: ${example.label}.`) throw new Error("Stored coding observations are invalid.");
    return { label: example.label, passed: text === `Passed: ${example.label}.` };
  });
  const clean = evaluateEngineer(work, { tests, passed: tests.filter((test) => test.passed).length });
  if (JSON.stringify(value) !== JSON.stringify(clean)) throw new Error("Stored coding score is inconsistent.");
  return clean;
}

/** No host bindings, Node objects, network or filesystem are exposed to the VM. */
export async function runCoding(code: string): Promise<CodingRun> {
  if (typeof code !== "string" || code.length > 5000 || !code.trim()) throw new InputError("Write a JavaScript function of up to 5,000 characters.");
  const engine = await getQuickJS();
  const tests = [];
  for (const example of CODING_CASES) {
    const runtime = engine.newRuntime(); runtime.setMemoryLimit(8 * 1024 * 1024); runtime.setMaxStackSize(256 * 1024);
    const deadline = Date.now() + 120; runtime.setInterruptHandler(() => Date.now() > deadline);
    const context = runtime.newContext(); let passed = false;
    try {
      const result = context.evalCode(`"use strict";\n${code}\n;totalRevenue(${JSON.stringify(example.input)});`);
      if (result.error) result.error.dispose();
      else { passed = context.typeof(result.value) === "number" && context.getNumber(result.value) === example.expected; result.value.dispose(); }
    } finally { context.dispose(); runtime.dispose(); }
    tests.push({ label: example.label, passed });
  }
  return { tests, passed: tests.filter((test) => test.passed).length, total: tests.length };
}
