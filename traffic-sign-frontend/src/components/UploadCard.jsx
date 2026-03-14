import FileDropZone from "./FileDropZone";

export default function UploadCard({
  title,
  description,
  onFileSelect,
  accept,
  children,
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-secondary">{description}</p>
      )}
      <div className="mt-4">
        <FileDropZone onFileSelect={onFileSelect} accept={accept} />
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
