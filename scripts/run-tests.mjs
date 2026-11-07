import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const kind = process.argv[2];
if (!["unit", "integration"].includes(kind)) throw new Error("Choose unit or integration tests.");
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(name));
    else if (entry.name.endsWith(".test.ts")) files.push(name);
  }
  return files.sort();
}
let files;
try { files = await collect(`tests/${kind}`); } catch (error) {
  if (error.code !== "ENOENT") throw error;
  throw new Error("The integration suite belongs to User 3. Combine that branch and build the app before running test:e2e.");
}
if (!files.length) throw new Error(`No ${kind} tests found.`);
const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "--test", ...files], { stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
