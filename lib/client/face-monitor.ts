import type { FaceDetector } from "@mediapipe/tasks-vision";
export type FaceObservation = { faces: number; dark: boolean; stalled: boolean };

/** Frames stay in this module. Only face counts and health categories leave it. */
export async function createFaceMonitor(video: HTMLVideoElement, observe: (value: FaceObservation) => void, failure: () => void) {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks("/proctoring/vision");
  const detector: FaceDetector = await FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: "/proctoring/blaze_face_short_range.tflite", delegate: "CPU" }, runningMode: "VIDEO", minDetectionConfidence: 0.65 });
  const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let previousFrame = -1, changedAt = performance.now(), stopped = false;
  const timer = window.setInterval(() => {
    if (stopped || video.readyState < 2 || document.hidden) return;
    try {
      const now = performance.now();
      if (video.currentTime !== previousFrame) { previousFrame = video.currentTime; changedAt = now; }
      const faces = detector.detectForVideo(video, now).detections.length;
      let brightness = 255;
      if (context) {
        context.drawImage(video, 0, 0, 32, 24);
        const data = context.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        brightness = sum / (32 * 24);
      }
      observe({ faces, dark: brightness < 18, stalled: now - changedAt > 5000 });
    } catch { failure(); }
  }, 750);
  return () => { stopped = true; window.clearInterval(timer); detector.close(); canvas.width = 0; };
}
