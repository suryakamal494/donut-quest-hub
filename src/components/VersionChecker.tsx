import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

declare const __BUILD_ID__: string;

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export function VersionChecker() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (active && buildId && buildId !== "dev" && buildId !== __BUILD_ID__) {
          setStale(true);
        }
      } catch {
        // Silently ignore — not critical
      }
    };

    // First check after 10s (let app settle), then every 5 min
    const initialTimer = setTimeout(check, 10_000);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      active = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
      >
        <RefreshCw className="h-4 w-4" />
        New version available — tap to refresh
      </button>
    </div>
  );
}
