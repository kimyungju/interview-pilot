export interface RecordingSession {
  start(): void;
  stop(): Promise<Blob>;
  isActive(): boolean;
  cleanup(): void;
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function getSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export function createRecordingSession(
  videoTrack: MediaStreamTrack,
  audioTrack: MediaStreamTrack
): RecordingSession {
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let active = false;

  return {
    start() {
      const stream = new MediaStream([videoTrack, audioTrack]);
      const mimeType = getSupportedMime();
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();
      active = true;
    },

    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!recorder || recorder.state === "inactive") {
          active = false;
          reject(new Error("Recorder not active"));
          return;
        }

        recorder.onstop = () => {
          active = false;
          const mime = recorder?.mimeType || "video/webm";
          resolve(new Blob(chunks, { type: mime }));
          chunks = [];
          recorder = null;
        };

        recorder.stop();
      });
    },

    isActive() {
      return active;
    },

    cleanup() {
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // already stopped
        }
      }
      active = false;
      chunks = [];
      recorder = null;
    },
  };
}
