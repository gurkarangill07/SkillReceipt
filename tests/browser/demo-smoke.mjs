import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { SCENARIOS } from "../../lib/scenarios.ts";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { installTestCamera, startMonitored } from "./camera-helper.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ permissions: ["camera"], viewport: { width: 1440, height: 1000 } });
await installTestCamera(context);
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("test-results", { recursive: true });
const checkOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${page.url()}`);
const capture = async (name) => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
};
let isolated;
try {
  isolated = process.env.SKILLRECEIPT_BROWSER_URL ? null : await startIsolatedApp();
  const origin = process.env.SKILLRECEIPT_BROWSER_URL || isolated.origin;
  await page.goto(origin); await page.getByRole("heading", { name: /Put your skills/ }).waitFor();
  await capture("home-desktop");
  await page.getByRole("link", { name: "Demonstrate my skills", exact: true }).click();
  await page.getByRole("textbox", { name: "What should we call you?" }).fill("Jordan Lee");
  await page.locator("#resume-upload").setInputFiles({ name: "invalid.exe", mimeType: "application/octet-stream", buffer: Buffer.from("test") });
  await page.locator("main [role=alert]").waitFor();
  await page.locator("#resume-upload").setInputFiles({ name: "jordan-resume.txt", mimeType: "text/plain", buffer: Buffer.from("Jordan Lee\nPRIVATE_EMAIL jordan@example.invalid\nJavaScript SQL Python ETL") });
  await page.getByRole("button", { name: "Find my exercises", exact: true }).waitFor();
  await capture("resume-desktop");
  await page.getByRole("button", { name: "Find my exercises", exact: true }).click();
  await page.getByRole("heading", { name: "Recommended exercises", exact: true }).waitFor();
  assert.equal(await page.locator(".challenge-card").count(), 3);
  assert.ok((await page.locator(".challenge-card").first().innerText()).includes("Junior Data Engineer"));
  const profile = await page.evaluate(async () => (await (await fetch("/api/candidate")).json()).candidate);
  assert.match(profile.id, /^SR-[A-F0-9]{10}$/); assert.equal(profile.visible, false);
  const employer = await browser.newContext(); const employerPage = await employer.newPage();
  employerPage.on("pageerror", (error) => errors.push(error.message));
  await employerPage.goto(`${origin}/employer`);
  await employerPage.getByRole("heading", { name: "No published results yet.", exact: true }).waitFor();
  await page.getByRole("button", { name: "Browse all exercises", exact: true }).click();
  assert.equal(await page.locator(".challenge-card").count(), 6);
  await page.getByRole("textbox", { name: "Search exercises" }).fill("QA");
  assert.equal(await page.locator(".challenge-card").count(), 1);
  await page.getByRole("textbox", { name: "Search exercises" }).fill("no-such-skill");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  assert.equal(await page.locator(".challenge-card").count(), 6);
  await capture("recommendations-desktop");
  console.log("Real résumé upload, parsed skill recommendations, candidate privacy and exercise search passed.");

  // Follow the real decision form, then submit a deliberately imperfect practical task.
  const qa = SCENARIOS.find((s) => s.id === "qa-engineer");
  await page.goto(`${origin}/challenge/qa-engineer`);
  await page.bringToFront();
  await startMonitored(page, "Start challenge");
  for (const [index, field] of qa.questions.entries()) {
    await page.locator(`input[name="${field.id}"][value="${field.answer}"]`).check();
    await page.getByRole("button", { name: index === 2 ? "Open exercise" : "Next", exact: true }).click();
  }
  for (const field of qa.exercise) await page.getByRole("textbox", { name: field.label, exact: true }).fill(field.id === "at" ? "0" : field.answer);
  await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
  assert.match(await page.locator(".score-number").innerText(), /90/);
  await page.getByRole("heading", { name: "Make your next attempt stronger." }).waitFor();
  await capture("qa-receipt");
  assert.ok((await page.locator(".session-report").innerText()).includes("Camera assessment"));
  const privateResultUrl = page.url();
  await page.getByRole("button", { name: "Publish profile for employers", exact: true }).click();
  await page.getByRole("link", { name: "View as an employer", exact: true }).waitFor();
  await employerPage.getByRole("textbox", { name: "Search candidates by skill, name or Candidate ID" }).fill("Boundary testing");
  await employerPage.getByRole("button", { name: "Search candidates", exact: true }).click();
  await employerPage.getByRole("heading", { name: "Jordan Lee", exact: true }).waitFor();
  assert.equal(await employerPage.locator(".employer-candidate").count(), 1);
  await employerPage.screenshot({ path: "test-results/employer-search.png", fullPage: true });
  await employerPage.getByRole("button", { name: "View report", exact: true }).click();
  await employerPage.getByRole("heading", { name: "Jordan Lee", exact: true }).waitFor();
  assert.match(await employerPage.locator(".score-number").innerText(), /90/);
  assert.ok((await employerPage.locator(".session-report").innerText()).includes("Camera assessment"));
  assert.equal(await employerPage.getByText("Make your next attempt stronger.", { exact: true }).count(), 0);
  await employerPage.screenshot({ path: "test-results/employer-report.png", fullPage: true });
  await page.bringToFront();
  await page.getByRole("button", { name: "Create share link", exact: true }).click();
  const linkInput = page.getByRole("textbox", { name: "Read-only evidence link" });
  await linkInput.waitFor();
  const sharedLink = await linkInput.inputValue();
  const visitor = await browser.newContext(); const publicPage = await visitor.newPage();
  await publicPage.goto(sharedLink); assert.match(await publicPage.locator(".score-number").innerText(), /90/);
  assert.equal(await publicPage.getByText("Make your next attempt stronger.", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Revoke link", exact: true }).click();
  await page.getByRole("button", { name: "Create share link", exact: true }).waitFor();
  assert.equal((await publicPage.goto(sharedLink)).status(), 404);
  await visitor.close();
  await page.getByRole("button", { name: "Hide from employer search", exact: true }).click();
  await page.getByRole("button", { name: "Publish profile for employers", exact: true }).waitFor();
  await employerPage.goto(`${origin}/employer?candidate=${profile.id}`);
  await employerPage.getByRole("heading", { name: "Report unavailable.", exact: true }).waitFor();
  await employer.close();
  console.log("Camera QA attempt (90/100), publish/search/employer report, privacy, shared link and revocation passed.");

  // Every new role has a complete example -> grading -> receipt interaction.
  for (const scenario of SCENARIOS) {
    await page.goto(`${origin}/challenge/${scenario.id}`);
    await page.getByRole("button", { name: "Try a worked example", exact: true }).click();
    await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
    await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
    assert.match(await page.locator(".score-number").innerText(), /100/);
    assert.ok((await page.locator("main").innerText()).includes("Worked example"));
    console.log(`${scenario.title} example passed.`);
  }
  await page.goto(`${origin}/challenge/junior-data-engineer`);
  await page.getByRole("button", { name: "View worked example", exact: true }).click();
  await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
  assert.equal(await page.locator(".score-orbit strong").innerText(), "80");
  await capture("engineering-receipt");

  await page.goto(`${origin}/assessment?fresh=1`);
  await page.getByRole("button", { name: "Load worked example", exact: true }).click();
  await page.getByRole("button", { name: "Submit & get receipt", exact: true }).click();
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/);
  assert.match(await page.locator(".score-number").innerText(), /100/);

  // Check the task and receipt layouts at phone width, including source material.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/start", "/employer", "/assessment", "/receipts", ...SCENARIOS.map((s) => `/challenge/${s.id}`)]) {
    await page.goto(origin + route); await checkOverflow();
  }
  await page.goto(`${origin}/start`);
  await capture("recommendations-mobile");
  await page.goto(`${origin}/challenge/product-analyst`);
  await page.getByRole("button", { name: "Try a worked example", exact: true }).click();
  assert.ok(await page.locator(".scenario-source").isVisible());
  await checkOverflow();
  await capture("product-mobile");
  await page.getByRole("button", { name: "Get my receipt", exact: true }).click();
  await page.waitForURL(/\/receipts\/[a-f0-9-]+$/); await checkOverflow();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${origin}/start`);
  await mobilePage.getByRole("button", { name: "Use a sample resume", exact: true }).click();
  await mobilePage.getByRole("button", { name: "Find my exercises", exact: true }).waitFor();
  await mobilePage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await mobilePage.screenshot({ path: "test-results/resume-mobile.png", fullPage: true });
  await mobilePage.getByRole("button", { name: "Find my exercises", exact: true }).click();
  await mobilePage.getByRole("heading", { name: "Recommended exercises", exact: true }).waitFor();
  assert.ok(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log("Browser smoke passed: résumé -> recommendations -> camera assessment -> score/feedback -> employer search/report; all six examples, mobile layouts and revocation. No page errors.");
} finally { await context.close(); await browser.close(); await isolated?.close(); }
