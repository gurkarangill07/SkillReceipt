import { readFile } from "node:fs/promises";

export async function installTestCamera(context) {
  const image = await readFile(new URL("./fixtures/astronaut.png", import.meta.url));
  await context.addInitScript(({ source }) => {
    window.__cameraMode = "one"; window.__testStreams = []; window.__mediaCalls = [];
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.__mediaCalls.push(constraints);
      const portrait = new Image(); portrait.src = source; await portrait.decode();
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
      const drawing = canvas.getContext("2d");
      const draw = () => {
        drawing.fillStyle = window.__cameraMode === "dark" ? "#000" : "#ccc"; drawing.fillRect(0, 0, 640, 480);
        if (window.__cameraMode === "one") drawing.drawImage(portrait, 80, 0, 480, 480);
        if (window.__cameraMode === "multiple") { drawing.drawImage(portrait, 130, 10, 200, 230, 0, 40, 300, 350); drawing.drawImage(portrait, 130, 10, 200, 230, 340, 40, 300, 350); }
      };
      draw(); const timer = setInterval(draw, 100), stream = canvas.captureStream(15);
      stream.getVideoTracks()[0].addEventListener("ended", () => clearInterval(timer));
      window.__testStreams.push(stream); return stream;
    };
  }, { source: `data:image/png;base64,${image.toString("base64")}` });
}
export async function startMonitored(page, startLabel = "Start work sample") {
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Enter fullscreen & begin", exact: true }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll("button")].find((button) => button.textContent.includes("Enter fullscreen & begin"))?.disabled, undefined, { timeout: 30_000 });
  await page.getByRole("button", { name: "Enter fullscreen & begin", exact: true }).click();
  await page.getByRole("heading", { name: "Your session is protected.", exact: true }).waitFor();
}
