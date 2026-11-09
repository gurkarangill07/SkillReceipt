import { json } from "../../../lib/server/http";
export async function GET() { return json({ error: "Accounts are disabled. Start a challenge without signing in." }, 410); }
export async function POST() { return json({ error: "Accounts are disabled. Start a challenge without signing in." }, 410); }
