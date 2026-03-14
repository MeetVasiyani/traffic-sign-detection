export default function ResultCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 shadow-sm ${className}`}>
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-primary">{title}</h3>
      )}
      {children}
    </div>
  );
}
