import { useState, useCallback } from "react";
import FileDropZone from "../components/FileDropZone";
import ImagePreview from "../components/ImagePreview";
import ResultCard from "../components/ResultCard";
import PredictionBadge from "../components/PredictionBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { predictMissingSign } from "../services/api";
import { FiCpu } from "react-icons/fi";

export default function MissingSignPrediction() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((selected) => {
    setResult(null);
    setError(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }, []);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }, [preview]);

  const handlePredict = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await predictMissingSign(file);
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Prediction failed. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page intro */}
      <div>
        <h2 className="text-xl font-bold text-primary">
          Missing Traffic Sign Prediction
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Upload a road image to predict which traffic sign should be present but
          is missing.
        </p>
      </div>

      {/* Upload area */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-primary">
          Upload Road Image
        </h3>

        {!preview ? (
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept="image/jpeg,image/png,image/jpg"
            label="Drag & drop a road image, or click to browse"
          />
        ) : (
          <ImagePreview
            src={preview}
            alt="Uploaded road image"
            onClear={handleClear}
          />
        )}

        {file && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={handlePredict}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              <FiCpu className="h-4 w-4" />
              {loading ? "Predicting..." : "Predict Missing Sign"}
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <ResultCard>
          <LoadingSpinner text="Running classification model..." />
        </ResultCard>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <ResultCard title="Prediction Result">
          <PredictionBadge
            prediction={result.prediction}
            confidence={result.confidence}
          />

          {/* Prediction classes reference */}
          <div className="mt-6 border-t border-border pt-4">
            <h4 className="mb-2 text-xs font-medium text-secondary">
              All Prediction Classes
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                "gap-in-median",
                "right-hand-curve",
                "side-road-left",
                "left-hand-curve",
              ].map((cls) => (
                <span
                  key={cls}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    cls === result.prediction
                      ? "border-accent bg-blue-50 text-accent"
                      : "border-border bg-gray-50 text-secondary"
                  }`}
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        </ResultCard>
      )}
    </div>
  );
}
