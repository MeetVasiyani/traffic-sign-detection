import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

/**
 * POST /detect
 * Sends an image file for traffic sign detection.
 * Returns { result_image_url, detections }
 */
export async function detectTrafficSigns(file, confidenceThreshold = 0.25, signal) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("confidence", confidenceThreshold);

  const response = await api.post("/detect", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    signal,
    timeout: 600000,
  });
  return response.data;
}

/**
 * Streaming video detection.
 * 1. POST /upload-video  → get stream_id
 * 2. GET  /detect-video-stream/:stream_id  → SSE with annotated frames
 *
 * onFrame(data)  — called for each annotated frame  { frame (b64), progress, detections }
 * onDone(data)   — called when stream ends          { done, detections, frames_processed }
 * onError(err)   — called on any error
 *
 * Returns an abort function.
 */
export function detectVideoStream(file, confidenceThreshold, skipFrames, { onFrame, onDone, onError }) {
  let aborted = false;
  let reader = null;

  const abort = () => {
    aborted = true;
    if (reader) {
      try { reader.cancel(); } catch (_) { /* ignore */ }
    }
  };

  (async () => {
    try {
      // Step 1: Upload the video
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confidence", confidenceThreshold);

      const uploadRes = await api.post("/upload-video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { stream_id } = uploadRes.data;

      if (aborted) return;

      // Step 2: Open SSE stream via fetch
      const response = await fetch(
        `${API_BASE_URL}/detect-video-stream/${stream_id}?skip=${skipFrames}`
      );
      if (!response.ok || !response.body) {
        throw new Error(`Stream failed with status ${response.status}`);
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (delimited by blank line)
        while (true) {
          const idx = buffer.indexOf("\n\n");
          const crlfIdx = buffer.indexOf("\r\n\r\n");
          const splitIdx = (crlfIdx !== -1 && (crlfIdx < idx || idx === -1)) ? crlfIdx : idx;
          if (splitIdx === -1) break;

          const rawEvent = buffer.slice(0, splitIdx);
          buffer = buffer.slice(splitIdx + (buffer[splitIdx] === "\r" ? 4 : 2));

          const lines = rawEvent.split(/\r?\n/);
          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));
          if (dataLines.length === 0) continue;

          const jsonStr = dataLines.join("\n");
          try {
            const data = JSON.parse(jsonStr);
            if (data.done) {
              if (!aborted) onDone(data);
            } else {
              if (!aborted) onFrame(data);
            }
          } catch (_) { /* skip malformed event */ }
        }
      }
    } catch (err) {
      if (!aborted && onError) onError(err);
    }
  })();

  return abort;
}

/**
 * POST /predict-missing-sign
 * Sends a road image for missing sign prediction.
 * Returns { prediction, confidence }
 */
export async function predictMissingSign(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/predict-missing-sign", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export default api;
