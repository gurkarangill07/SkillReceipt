import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, cp, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function mockOllama() {
  const state = { mode: "success", requests: [] };
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 65_536) { response.writeHead(413).end(); return; }
    }
    state.requests.push(JSON.parse(body));
    if (state.mode === "delay") await delay(250);
    if (state.mode === "offline") {
      response.writeHead(503, { "Content-Type": "application/json" }).end('{"error":"MOCK_PRIVATE_FAILURE"}');
    } else if (state.mode === "malformed") {
      response.writeHead(200, { "Content-Type": "application/json" }).end('{"done":true,"response":"not valid advice"}');
    } else {
      const allowed = state.requests.at(-1)?.format?.properties?.suggestions?.items?.enum ?? ["next"];
      const suggestion = state.mode === "markup"
        ? '<img src=x onerror="alert(1)">'
        : allowed[0];
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
        done: true, response: JSON.stringify({ suggestions: [suggestion] }),
      }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    state, url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

/** Real Next production server, copied build, temporary cwd and temporary data. */
export async function startIsolatedApp() {
  const root = process.cwd();
  try {
    await Promise.all([
      access(path.join(root, ".next/BUILD_ID")),
      access(path.join(root, "node_modules/next/dist/bin/next")),
      access(path.join(root, "package.json")),
    ]);
  } catch {
    throw new Error("HTTP integration requires User 1's runnable baseline, npm ci, and npm run build first. No test server or receipts were created.");
  }
  const sandbox = await mkdtemp(path.join(tmpdir(), "skillreceipt-http-"));
  let mock;
  let child;
  let output = "";
  let port;
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const running = child;
    const exited = once(running, "exit");
    running.kill("SIGTERM");
    await Promise.race([exited, delay(2_000)]);
    if (running.exitCode === null && running.signalCode === null) {
      running.kill("SIGKILL");
      await exited;
    }
    child = undefined;
  }
  try {
    await cp(path.join(root, ".next"), path.join(sandbox, ".next"), {
      recursive: true, filter: (source) => !source.startsWith(path.join(root, ".next/cache")),
    });
    await cp(path.join(root, "package.json"), path.join(sandbox, "package.json"));
    await symlink(path.join(root, "node_modules"), path.join(sandbox, "node_modules"), "dir");
    for (const name of await readdir(root)) {
      if (name === "public" || /^next\.config\.(mjs|js|ts|cjs)$/.test(name)) {
        await cp(path.join(root, name), path.join(sandbox, name), { recursive: true });
      }
    }
    mock = await mockOllama();
    port = await freePort();
    const dataKey = process.env.SKILLRECEIPT_TEST_DATA_ENV ?? "SKILLRECEIPT_DATA_DIR";
    if (!/^[A-Z][A-Z0-9_]*$/.test(dataKey) || /^(PATH|HOME|NODE_ENV|NODE_OPTIONS|OLLAMA_BASE_URL|OLLAMA_MODEL)$/.test(dataKey)) {
      throw new Error("Invalid test-only data environment variable name.");
    }
    const start = async () => {
      output = "";
      child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd: sandbox,
        env: {
          PATH: process.env.PATH, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
          [dataKey]: path.join(sandbox, "data"),
          OLLAMA_BASE_URL: mock.url, OLLAMA_MODEL: "mock-local-model",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("error", (error) => { output += error.message; });
      child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-4_000); });
      child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-4_000); });
      for (let i = 0; i < 160; i++) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Test Next server exited before readiness: ${output}`);
        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/receipts`, { signal: AbortSignal.timeout(1_000) });
          await response.arrayBuffer();
          if (response.status === 200) return;
        } catch { /* Wait for the production listener. */ }
        await delay(250);
      }
      throw new Error(`Test Next server did not become ready: ${output}`);
    };
    await start();
    return {
      origin: `http://127.0.0.1:${port}`, sandbox, mock,
      async restart() { await stop(); await start(); },
      async close() {
        try { await stop(); } finally {
          try { await mock.close(); } finally { await rm(sandbox, { recursive: true, force: true }); }
        }
      },
    };
  } catch (error) {
    await stop();
    await mock?.close();
    await rm(sandbox, { recursive: true, force: true });
    throw error;
  }
}
