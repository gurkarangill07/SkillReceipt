import type { NextRequest } from "next/server";
import { getScenario } from "../../../../../lib/scenarios";
import { assertSameOrigin, errorResponse, json } from "../../../../../lib/server/http";
import { PIPELINE_TASKS } from "../../../../../lib/career";
import { CODING_STARTER, CODING_EXAMPLE } from "../../../../../lib/coding";
import { isRecord, readJson } from "../../../../../lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  try {
    assertSameOrigin(request);
    const role = (await params).role;
    if (role === "junior-data-engineer") {
      const value = await readJson(request);
      return json({ demo: true, answers: Object.fromEntries(PIPELINE_TASKS.filter((field) => ["key", "missing", "load"].includes(field.id)).map((field) => [field.id, field.correct])), code: isRecord(value) && value.solution === true ? CODING_EXAMPLE : CODING_STARTER });
    }
    const scenario = getScenario(role);
    if (!scenario) return json({ error: "Exercise unavailable." }, 404);
    return json({ demo: true, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) });
  } catch (error) { return errorResponse(error); }
}
