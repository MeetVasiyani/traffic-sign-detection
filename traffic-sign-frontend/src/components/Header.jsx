import { useLocation } from "react-router-dom";

const routeTitles = {
  "/": "Dashboard",
  "/detection": "Traffic Sign Detection",
  "/missing-sign": "Missing Sign Prediction",
};

export default function Header() {
  const { pathname } = useLocation();
  const title = routeTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold text-primary">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="h-2 w-2 rounded-full bg-success" />
          System Online
        </span>
      </div>
    </header>
  );
}
