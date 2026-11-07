import assert from "node:assert/strict";

import { getPracticeAdvice } from "../../lib/server/coach";
import { evaluationFixture } from "./fixtures";

// Explicit opt-in: never run as part of the offline/mock unit suite.
const evaluation = evaluationFixture(["dates", "total"]);
const before = structuredClone(evaluation);
const startedAt = performance.now();
try {
  const result = await getPracticeAdvice(evaluation);
  assert.deepEqual(evaluation, before);
  console.log(JSON.stringify({
    status: "passed", model: result.model,
    elapsedMs: Math.round(performance.now() - startedAt),
    advice: result.advice, evaluationUnchanged: true,
  }, null, 2));
} catch (error) {
  assert.deepEqual(evaluation, before);
  console.error(JSON.stringify({ status: "unavailable", error: (error as Error).message, evaluationUnchanged: true }));
  process.exitCode = 1;
}
