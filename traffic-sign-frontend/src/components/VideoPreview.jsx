import { FiX } from "react-icons/fi";

export default function VideoPreview({ src, onClear }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-gray-50">
      {onClear && (
        <button
          onClick={onClear}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
      <video
        src={src}
        controls
        className="h-auto max-h-[420px] w-full"
      />
    </div>
  );
}
