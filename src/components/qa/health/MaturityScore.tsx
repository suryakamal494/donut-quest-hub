import { cn } from "@/lib/utils";
import { getScoreColor } from "./HealthCell";

interface MaturityScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function MaturityScore({ score, size = "md", showLabel = true }: MaturityScoreProps) {
  const dims = size === "sm" ? 40 : size === "md" ? 56 : 72;
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = (dims - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const fontSize = size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: dims, height: dims }}>
        <svg width={dims} height={dims} className="-rotate-90">
          <circle
            cx={dims / 2}
            cy={dims / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dims / 2}
            cy={dims / 2}
            r={radius}
            fill="none"
            stroke={
              score >= 75 ? "hsl(142 76% 36%)" :
              score >= 50 ? "hsl(38 92% 50%)" :
              score >= 25 ? "hsl(24 95% 53%)" :
              "hsl(0 84% 60%)"
            }
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <span className={cn(
          "absolute inset-0 flex items-center justify-center font-bold",
          fontSize,
          getScoreColor(score)
        )}>
          {score}%
        </span>
      </div>
      {showLabel && (
        <span className="text-[10px] text-muted-foreground">Score</span>
      )}
    </div>
  );
}
