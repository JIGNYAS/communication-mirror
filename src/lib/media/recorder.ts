export function supportedRecordingType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

export async function requestCameraAndMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot access a camera and microphone. Try current Chrome, Edge, Firefox, or Safari.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    throw new Error(mediaAccessErrorMessage(error));
  }
}

export function mediaAccessErrorMessage(error: unknown): string {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String(error.name)
    : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera or microphone access is blocked. Allow both in your browser's site settings, then try again.";
  }
  if (name === "NotFoundError") {
    return "No camera or microphone was found. Connect both devices and try again.";
  }
  return "The camera or microphone could not start. Close other apps using them, then retry.";
}

