import { useState, useCallback, useRef } from "react";
import FileDropZone from "../components/FileDropZone";
import ImagePreview from "../components/ImagePreview";
import VideoPreview from "../components/VideoPreview";
import ResultCard from "../components/ResultCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { detectTrafficSigns, detectVideoStream } from "../services/api";
import { FiPlay, FiSquare } from "react-icons/fi";

export default function Detection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null); // "image" | "video"
  const [confidence, setConfidence] = useState(0.25);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Streaming state for video
  const [streamFrame, setStreamFrame] = useState(null); // current base64 frame
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamDetections, setStreamDetections] = useState([]);
  const [streamProcessed, setStreamProcessed] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const skipOptions = [2, 5, 10];
  const [skipIndex, setSkipIndex] = useState(0);
  const skipFrames = skipOptions[skipIndex];

  const abortRef = useRef(null);
  const streamAbortRef = useRef(null);

  const handleFileSelect = useCallback((selected) => {
    setResult(null);
    setError(null);
    setStreamFrame(null);
    setStreaming(false);

    const isVideo = selected.type.startsWith("video/");
    setFileType(isVideo ? "video" : "image");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }, []);

  const cancelAll = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (streamAbortRef.current) {
      streamAbortRef.current();
      streamAbortRef.current = null;
    }
  }, []);

  const handleClear = useCallback(() => {
    cancelAll();
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFileType(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setStreamFrame(null);
    setStreaming(false);
    setStreamProgress(0);
    setStreamDetections([]);
    setStreamProcessed(0);
  }, [preview, cancelAll]);

  const handleDetect = useCallback(async () => {
    if (!file) return;
    cancelAll();
    setError(null);
    setResult(null);

    // ── Video: use streaming ──
    if (fileType === "video") {
      setStreaming(true);
      setLoading(true);
      setStreamFrame(null);
      setStreamProgress(0);
      setStreamDetections([]);
      setStreamProcessed(0);

      const abort = detectVideoStream(file, confidence, skipFrames, {
        onFrame: (data) => {
          setStreamFrame(data.frame);
          setStreamProgress(data.progress || 0);
          setStreamDetections(data.detections || []);
          setStreamProcessed(data.processed || 0);
        },
        onDone: (data) => {
          setLoading(false);
          setStreaming(false);
          setResult({
            detections: data.detections || [],
            frames_processed: data.frames_processed || 0,
          });
        },
        onError: (err) => {
          setLoading(false);
          setStreaming(false);
          setError(err.message || "Video stream failed.");
        },
      });

      streamAbortRef.current = abort;
      return;
    }

    // ── Image: normal POST ──
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const data = await detectTrafficSigns(file, confidence, controller.signal);
      setResult(data);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Detection failed. Is the backend running?"
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [file, fileType, confidence, skipFrames, cancelAll]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page intro */}
      <div>
        <h2 className="text-xl font-bold text-primary">
          Traffic Sign Detection
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Upload an image or video to detect traffic signs with bounding boxes.
        </p>
      </div>

      {/* Upload area */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-primary">
          Upload File
        </h3>

        {!preview ? (
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept="image/jpeg,image/png,image/jpg,video/mp4,video/mov,video/avi"
            label="Drag & drop an image or video, or click to browse"
          />
        ) : fileType === "video" ? (
          <VideoPreview src={preview} onClear={handleClear} />
        ) : (
          <ImagePreview src={preview} alt="Uploaded file" onClear={handleClear} />
        )}

        {/* Controls */}
        {file && (
          <div className="mt-5 flex flex-wrap items-end gap-4">
            {/* Confidence slider */}
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-xs font-medium text-secondary">
                Confidence Threshold: {confidence.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-accent"
              />
            </div>

            {fileType === "video" && (
              <div className="min-w-[200px]">
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Skip Frames: every {skipFrames} frames
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={skipIndex}
                  onChange={(e) => setSkipIndex(parseInt(e.target.value, 10))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-accent"
                />
                <div className="mt-1 flex justify-between text-[11px] text-secondary">
                  <span>2</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
            )}

            {loading ? (
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <FiSquare className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={handleDetect}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <FiPlay className="h-4 w-4" />
                Run Detection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live streaming frames (video) */}
      {streaming && streamFrame && (
        <ResultCard title="Live Detection">
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={`data:image/jpeg;base64,${streamFrame}`}
              alt="Live annotated frame"
              className="h-auto w-full object-contain"
            />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>Frame {streamProcessed} processed</span>
              <span>{streamProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${streamProgress}%` }}
              />
            </div>
            {streamDetections.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {streamDetections.map((det) => (
                  <span
                    key={det}
                    className="rounded-md border border-accent bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-accent"
                  >
                    {det.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </ResultCard>
      )}

      {/* Loading spinner (image only, or video before first frame) */}
      {loading && !streaming && (
        <ResultCard>
          <LoadingSpinner text="Running detection model..." />
        </ResultCard>
      )}
      {loading && streaming && !streamFrame && (
        <ResultCard>
          <LoadingSpinner text="Uploading video and starting stream..." />
        </ResultCard>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <ResultCard title="Detection Results">
          {/* Image result */}
          {result.result_image_url && (
            <div className="overflow-hidden rounded-lg border border-border">
              <img
                src={result.result_image_url}
                alt="Detection result"
                className="h-auto w-full object-contain"
              />
            </div>
          )}

          {/* Video completion summary */}
          {result.frames_processed && !result.result_image_url && (
            <p className="text-sm text-secondary">
              Processed {result.frames_processed} frames.
            </p>
          )}

          {result.detections && result.detections.length > 0 ? (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-secondary">
                Detected Signs ({result.detections.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.detections.map((det, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-border bg-gray-50 px-3 py-1.5 text-xs font-medium capitalize text-primary"
                  >
                    {typeof det === "string"
                      ? det.replace(/-/g, " ")
                      : det.class?.replace(/-/g, " ") || `Detection ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-secondary">
              No traffic signs detected in the uploaded file.
            </p>
          )}
        </ResultCard>
      )}
    </div>
  );
}
