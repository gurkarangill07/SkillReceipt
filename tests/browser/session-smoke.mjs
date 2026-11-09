import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { installTestCamera } from "./camera-helper.mjs";

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await installTestCamera(context);
const page = await context.newPage(); page.setDefaultTimeout(30_000);
const errors = []; page.on("pageerror", (error) => errors.push(error.message));
page.on("response", async (response) => {
  if (response.url().includes("/api/assessment-sessions") && response.status() >= 400) console.log("Session API failure:", response.status(), await response.text());
});
let isolated;
const waitReady = async () => { await page.waitForFunction(() => document.querySelector(".camera-check-status")?.textContent.includes("One face visible")); };
const resume = async () => { await waitReady(); await page.getByRole("button", { name: "Resume test", exact: true }).click(); await page.getByRole("heading", { name: "Your session is protected.", exact: true }).waitFor(); };
const paused = async () => { await page.getByRole("heading", { name: "Your test is paused.", exact: true }).waitFor(); assert.ok(await page.locator(".challenge-fieldset").evaluate((element) => element.disabled)); };
try {
  isolated = process.env.SKILLRECEIPT_BROWSER_URL ? null : await startIsolatedApp();
  const origin = process.env.SKILLRECEIPT_BROWSER_URL || isolated.origin;
  await mkdir("test-results", { recursive: true });
  await page.goto(`${origin}/challenge/junior-data-engineer`);
  await page.getByRole("button", { name: "Start work sample", exact: true }).click();
  assert.equal(await page.evaluate(() => window.__mediaCalls.length), 0);
  assert.equal(await page.getByRole("button", { name: /Practice|Switch to practice/ }).count(), 0);
  assert.ok(await page.getByRole("button", { name: "Enter fullscreen & begin", exact: true }).isDisabled());
  assert.ok(await page.locator(".integrity-content").evaluate((element) => element.getBoundingClientRect().width > 600));
  await page.screenshot({ path: "test-results/camera-setup-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.ok(await page.locator(".integrity-content").evaluate((element) => element.getBoundingClientRect().width > 260));
  await page.screenshot({ path: "test-results/camera-setup-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await waitReady();
  assert.equal(await page.evaluate(() => window.__mediaCalls[0].audio), false);
  await page.getByRole("button", { name: "Enter fullscreen & begin", exact: true }).click();
  await page.getByRole("heading", { name: "Your session is protected.", exact: true }).waitFor();
  console.log("Desktop/mobile permission layout, explicit consent, real face detection and required fullscreen passed.");

  const pasteBlocked = await page.evaluate(() => { const event = new Event("paste", { bubbles: true, cancelable: true }); document.dispatchEvent(event); return event.defaultPrevented; });
  assert.equal(pasteBlocked, true);
  await page.locator(".integrity-timeline").getByText("Paste blocked", { exact: true }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await paused(); await resume();
  // Headless Chromium does not consistently hide background tabs; inject the native event/state.
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await paused();
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
  await resume();
  await page.evaluate(() => document.exitFullscreen()); await paused(); await resume();
  console.log("Clipboard blocking, focus-loss pause and required fullscreen restoration passed.");

  await page.evaluate(() => { window.__cameraMode = "absent"; }); await paused();
  await page.locator(".integrity-timeline").getByText("No face in view", { exact: true }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Resume test", exact: true }).isDisabled());
  await page.evaluate(() => { window.__cameraMode = "one"; }); await resume();
  await page.evaluate(() => { window.__cameraMode = "multiple"; }); await paused();
  await page.locator(".integrity-timeline").getByText("Multiple faces in view", { exact: true }).waitFor();
  await page.evaluate(() => { window.__cameraMode = "one"; }); await resume();
  await page.evaluate(() => { window.__cameraMode = "dark"; }); await paused();
  await page.locator(".integrity-timeline").getByText("Camera dark or covered", { exact: true }).waitFor();
  await page.evaluate(() => { window.__cameraMode = "one"; }); await resume();
  console.log("Real detector: absent face, multiple faces, covered-camera pauses and stable-face recovery passed.");

  await page.getByRole("button", { name: "Stop camera & pause", exact: true }).click(); await paused();
  await page.getByRole("button", { name: "Reconnect camera", exact: true }).click(); await resume();
  await context.setOffline(true); await paused();
  await context.setOffline(false); await resume();
  console.log("Camera stop/reconnect and network loss/resync passed.");

  await page.getByLabel("Order ID", { exact: false }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Quarantine for review", { exact: false }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Upsert by the business key", { exact: false }).check();
  await page.getByRole("button", { name: "Continue to code", exact: true }).click();
  await page.locator("#candidate-code").fill("function totalRevenue(orders) { return orders.reduce((sum, order) => sum + (order.revenueCents === null ? 0 : order.revenueCents), 0); }");
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.getByText("4 / 4 passed", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Review & finish", exact: true }).click();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith("/api/receipts") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
  const result = await resultPromise; assert.equal(result.status(), 201, await result.text());
  const receipt = await result.json(); assert.equal(receipt.evaluation.score, 100); assert.equal(receipt.submission.demo, false);
  const audit = receipt.submission.session.integrity;
  for (const kind of ["paste_blocked", "focus_lost", "tab_hidden", "fullscreen_exit", "face_missing", "multiple_faces", "camera_obscured", "camera_interrupted", "network_offline", "code_run"]) assert.ok(audit.events.some((event) => event.kind === kind), kind);
  assert.ok(audit.heartbeats > 1);
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
  await page.getByRole("heading", { name: "Camera assessment · integrity report", exact: true }).waitFor();
  assert.ok((await page.locator(".session-report").innerText()).includes("Review required"));
  assert.ok(await page.evaluate(() => window.__testStreams.every((stream) => stream.getTracks().every((track) => track.readyState === "ended"))));
  await page.screenshot({ path: "test-results/integrity-receipt.png", fullPage: true });
  console.log("Complete scored engineering attempt preserves every incident in its receipt and releases camera tracks.");

  const denied = await browser.newContext();
  await denied.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  const deniedPage = await denied.newPage();
  await deniedPage.goto(`${origin}/challenge/qa-engineer`);
  await deniedPage.getByRole("button", { name: "Start challenge", exact: true }).click();
  await deniedPage.getByRole("checkbox").check(); await deniedPage.getByRole("button", { name: "Enable camera", exact: true }).click();
  await deniedPage.getByText(/Camera permission was denied/).waitFor();
  assert.ok(await deniedPage.getByRole("button", { name: "Enter fullscreen & begin", exact: true }).isDisabled());
  assert.equal(await deniedPage.locator(".challenge-fieldset").count(), 0);
  await denied.close(); console.log("Camera denial cannot start an assessment or fall back to practice.");
  const delayed = await browser.newContext(); await installTestCamera(delayed);
  await delayed.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => { const stream = await original(constraints); window.__lateStream = stream; await new Promise((resolve) => { window.__releaseCamera = resolve; }); return stream; };
  });
  const latePage = await delayed.newPage();
  await latePage.goto(`${origin}/challenge/qa-engineer`); await latePage.getByRole("button", { name: "Start challenge", exact: true }).click();
  await latePage.getByRole("checkbox").check(); await latePage.getByRole("button", { name: "Enable camera", exact: true }).click();
  await latePage.waitForFunction(() => typeof window.__releaseCamera === "function");
  await latePage.getByRole("link", { name: /All challenges/ }).click(); await latePage.waitForURL(/\/start$/);
  await latePage.evaluate(() => window.__releaseCamera());
  await latePage.waitForFunction(() => window.__lateStream.getTracks().every((track) => track.readyState === "ended"));
  await delayed.close(); console.log("Late camera permission after leaving the assessment releases its tracks.");
  assert.deepEqual(errors, []);
} catch (error) {
  console.log("Session state at failure:", await page.locator(".assessment-session").innerText().catch(() => "Unavailable"));
  await page.screenshot({ path: "test-results/session-failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally { await context.close(); await browser.close(); await isolated?.close(); }
