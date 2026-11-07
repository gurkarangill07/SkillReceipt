import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export {};", shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // Allow the extensionless local imports that Next/TypeScript uses.
    if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    try { await access(fileURLToPath(candidate)); } catch { throw error; }
    return nextResolve(candidate.href, context);
  }
}
