import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { startIsolatedApp } from "../helpers/next-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ permissions: ["camera"], viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.__testStreams = []; window.__mediaCalls = [];
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    window.__mediaCalls.push(constraints);
    const stream = await getMedia(constraints);
    window.__testStreams.push(stream);
    return stream;
  };
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let isolated;
try {
  isolated = process.env.SKILLRECEIPT_BROWSER_URL ? null : await startIsolatedApp();
  const origin = process.env.SKILLRECEIPT_BROWSER_URL || isolated.origin;
  await page.goto(`${origin}/challenge/junior-data-engineer`);
  await page.getByRole("button", { name: "Start challenge", exact: true }).click();
  assert.equal(await page.evaluate(() => window.__mediaCalls.length), 0);
  assert.ok(await page.getByRole("button", { name: "Begin test", exact: true }).isDisabled());
  assert.ok(await page.getByRole("button", { name: "Enable camera preview", exact: true }).isDisabled());
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enable camera preview", exact: true }).click();
  await page.locator("video").waitFor();
  assert.deepEqual(await page.evaluate(() => ({ audio: window.__mediaCalls[0].audio, tracks: window.__testStreams[0].getAudioTracks().length })), { audio: false, tracks: 0 });
  await page.getByRole("button", { name: "Begin test", exact: true }).click();
  await page.getByRole("heading", { name: "Which field identifies one order?", exact: true }).waitFor();
  assert.ok(await page.locator("video").isVisible());
  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return video && video.videoWidth > 0 && video.readyState >= 2;
  });
  await mkdir("test-results", { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/camera-preview.png", fullPage: true });

  // Actual backgrounding triggers the browser's visibility/focus events.
  const other = await context.newPage();
  await other.goto("about:blank"); await other.bringToFront();
  await page.bringToFront();
  // Headless browsers can keep all tabs visible, so also exercise the same native
  // blur event the app listens to when the window loses focus.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.getByRole("heading", { name: "Your test is paused.", exact: true }).waitFor();
  assert.ok(await page.getByRole("radio").first().isDisabled());
  await page.getByRole("button", { name: "Resume test", exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("paste", { bubbles: true })));
  assert.match(await page.locator(".session-metrics").innerText(), /Paste events\s*1/);

  await page.getByRole("radio", { name: /Order ID/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /Quarantine for review/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /Upsert by the business key/ }).check();
  await page.getByRole("button", { name: "Continue to code", exact: true }).click();
  await page.getByRole("button", { name: "Review & finish", exact: true }).click();
  const request = page.waitForRequest((request) => request.url().endsWith("/api/receipts") && request.method() === "POST");
  await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
  const submitted = (await request).postDataJSON();
  assert.equal(submitted.session.mode, "camera"); assert.equal(submitted.session.cameraStarted, true);
  assert.ok(submitted.session.focusLosses >= 1); assert.equal(submitted.session.pasteEvents, 1);
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
  assert.equal(await page.locator(".score-orbit strong").innerText(), "80");
  assert.ok(await page.evaluate(() => window.__testStreams.every((stream) => stream.getTracks().every((track) => track.readyState === "ended"))));
  console.log("Camera opt-in, live preview, interruption pause/resume, paste count, server submission and media cleanup passed.");
  await other.close();

  // Leaving an unfinished assessment also releases the camera.
  await page.goto(`${origin}/challenge/qa-engineer`);
  await page.getByRole("button", { name: "Start challenge", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enable camera preview", exact: true }).click();
  await page.locator("video").waitFor();
  await page.getByRole("button", { name: "Begin test", exact: true }).click();
  await page.evaluate(() => window.__testStreams[0].getVideoTracks()[0].dispatchEvent(new Event("mute")));
  await page.getByRole("heading", { name: "Your test is paused.", exact: true }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Resume test", exact: true }).isDisabled());
  await page.getByRole("button", { name: "Reconnect camera", exact: true }).click();
  await page.locator("video").waitFor();
  await page.getByRole("button", { name: "Resume test", exact: true }).click();
  const fullscreenButton = page.getByRole("button", { name: "Use full screen", exact: true });
  if (await fullscreenButton.isVisible()) {
    await fullscreenButton.click();
    if (await page.evaluate(() => Boolean(document.fullscreenElement))) {
      await page.evaluate(() => document.exitFullscreen());
      await page.getByRole("heading", { name: "Your test is paused.", exact: true }).waitFor();
      assert.match(await page.locator(".session-metrics").innerText(), /Camera interruptions\s*1/);
      await page.getByRole("button", { name: "Resume test", exact: true }).click();
      console.log("Camera interruption/reconnect and fullscreen-exit pause passed.");
    }
  }
  await page.getByRole("link", { name: /All challenges/ }).click();
  await page.waitForURL(/\/start$/);
  assert.ok(await page.evaluate(() => window.__testStreams.every((stream) => stream.getTracks().every((track) => track.readyState === "ended"))));
  console.log("Camera stops on navigation away from an unfinished scenario.");

  const denied = await browser.newContext();
  await denied.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  const fallback = await denied.newPage(); fallback.setDefaultTimeout(20_000);
  await fallback.goto(`${origin}/challenge/product-analyst`);
  await fallback.getByRole("button", { name: "Start challenge", exact: true }).click();
  await fallback.getByRole("checkbox").check();
  await fallback.getByRole("button", { name: "Enable camera preview", exact: true }).click();
  await fallback.locator(".assessment-session [role=alert]").waitFor();
  assert.match(await fallback.locator(".assessment-session [role=alert]").innerText(), /permission was denied/);
  await fallback.getByRole("button", { name: "Practice without camera", exact: true }).click();
  await fallback.getByRole("button", { name: "Begin test", exact: true }).click();
  await fallback.getByRole("heading", { name: /Which primary metric/ }).waitFor();
  assert.equal(await fallback.locator("video").count(), 0);
  console.log("Denied-camera fallback to an ordinary practice attempt passed.");
  await denied.close();

  // A permission request may resolve after navigation. Such a stream must be stopped.
  const delayed = await browser.newContext({ permissions: ["camera"] });
  await delayed.addInitScript(() => {
    const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getMedia(constraints); window.__lateStream = stream;
      await new Promise((resolve) => { window.__releaseCamera = resolve; });
      return stream;
    };
  });
  const latePage = await delayed.newPage();
  await latePage.goto(`${origin}/challenge/qa-engineer`);
  await latePage.getByRole("button", { name: "Start challenge", exact: true }).click();
  await latePage.getByRole("checkbox").check();
  await latePage.getByRole("button", { name: "Enable camera preview", exact: true }).click();
  await latePage.waitForFunction(() => typeof window.__releaseCamera === "function");
  await latePage.getByRole("link", { name: /All challenges/ }).click();
  await latePage.waitForURL(/\/start$/);
  await latePage.evaluate(() => window.__releaseCamera());
  await latePage.waitForFunction(() => window.__lateStream.getTracks().every((track) => track.readyState === "ended"));
  console.log("Late camera permission after navigation is stopped without attaching a preview.");
  await delayed.close();
  assert.deepEqual(errors, []);
} finally { await context.close(); await browser.close(); await isolated?.close(); }
