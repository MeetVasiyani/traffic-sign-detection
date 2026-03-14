import { useCallback } from "react";
import { FiUploadCloud } from "react-icons/fi";

export default function FileDropZone({
  onFileSelect,
  accept = "image/*",
  label = "Drag & drop a file here, or click to browse",
  multiple = false,
}) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files?.length) {
        onFileSelect(multiple ? Array.from(files) : files[0]);
      }
    },
    [onFileSelect, multiple]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files?.length) {
        onFileSelect(multiple ? Array.from(files) : files[0]);
      }
    },
    [onFileSelect, multiple]
  );

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-accent hover:bg-blue-50/30"
    >
      <FiUploadCloud className="h-10 w-10 text-gray-400" />
      <p className="text-sm text-secondary text-center">{label}</p>
      <span className="text-xs text-gray-400">
        Supported: {accept.replace(/\*/g, "all")}
      </span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
