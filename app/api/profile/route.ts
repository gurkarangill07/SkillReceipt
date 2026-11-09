import { json } from "../../../lib/server/http";
export async function POST() { return json({ error: "Profiles are disabled. Share an individual receipt instead." }, 410); }
