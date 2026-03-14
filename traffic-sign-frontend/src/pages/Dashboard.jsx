import { Link } from "react-router-dom";
import { FiCamera, FiSearch, FiArrowRight } from "react-icons/fi";

const tasks = [
  {
    to: "/detection",
    icon: FiCamera,
    title: "Traffic Sign Detection",
    description:
      "Detect traffic signs in uploaded images or videos using YOLOv8 object detection with bounding-box visualization.",
    badge: "Object Detection",
  },
  {
    to: "/missing-sign",
    icon: FiSearch,
    title: "Missing Traffic Sign Prediction",
    description:
      "Analyze road images and predict which traffic sign should be present but is missing using a ResNet-18 classifier.",
    badge: "Classification",
  },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-primary">
          Traffic Sign Detection System
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          A deep learning system for detecting and predicting road traffic signs
          using computer vision. Select a task below to get started.
        </p>
      </section>

      {/* Task Cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        {tasks.map(({ to, icon: Icon, title, description, badge }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-secondary">
                {badge}
              </span>
            </div>

            <h3 className="text-base font-semibold text-primary">{title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-secondary">
              {description}
            </p>

            <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-accent">
              Open Task
              <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <section className="mt-10 grid grid-cols-3 gap-4">
        {[
          { label: "Supported Classes", value: "4" },
          { label: "Detection Model", value: "YOLOv8" },
          { label: "Classifier Model", value: "ResNet-18" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm"
          >
            <p className="text-xl font-bold text-primary">{value}</p>
            <p className="mt-0.5 text-xs text-secondary">{label}</p>
          </div>
        ))}
      </section>

      {/* Class list */}
      <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-primary">
          Prediction Classes
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "gap-in-median",
            "right-hand-curve",
            "side-road-left",
            "left-hand-curve",
          ].map((cls) => (
            <span
              key={cls}
              className="rounded-md border border-border bg-gray-50 px-3 py-1.5 text-xs font-medium text-secondary"
            >
              {cls}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
