import {
  FiAlertTriangle,
  FiCornerDownLeft,
  FiCornerDownRight,
  FiGitBranch,
} from "react-icons/fi";

const signIcons = {
  "gap-in-median": FiGitBranch,
  "right-hand-curve": FiCornerDownRight,
  "side-road-left": FiCornerDownLeft,
  "left-hand-curve": FiCornerDownLeft,
};

export default function PredictionBadge({ prediction, confidence }) {
  const Icon = signIcons[prediction] || FiAlertTriangle;
  const confidencePercent = (confidence * 100).toFixed(1);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold capitalize text-primary">
          {prediction.replace(/-/g, " ")}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-secondary">
            {confidencePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
