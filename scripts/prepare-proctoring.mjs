import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
await mkdir(path.join(root, "public/proctoring/vision"), { recursive: true });
await cp(path.join(root, "node_modules/@mediapipe/tasks-vision/wasm"), path.join(root, "public/proctoring/vision"), { recursive: true });
console.log("On-device face detector runtime prepared.");
