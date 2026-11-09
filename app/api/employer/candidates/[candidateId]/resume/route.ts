import { json } from "../../../../../../lib/server/http";
export async function GET() { return json({ error: "Profile access is disabled. Use a shared receipt link." }, 410); }
