export default function LoadingSpinner({ size = "md", text = "Processing..." }) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-gray-200 border-t-accent`}
      />
      {text && <p className="text-sm text-secondary">{text}</p>}
    </div>
  );
}
