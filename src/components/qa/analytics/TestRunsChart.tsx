import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import type { TestRun } from "@/types/qa";

interface TestRunsChartProps {
  runs: TestRun[];
}

export function TestRunsChart({ runs }: TestRunsChartProps) {
  // Get last 7 days of data
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE"),
      count: 0,
    };
  });

  // Count runs per day
  runs.forEach((run) => {
    const runDate = format(startOfDay(parseISO(run.started_at)), "yyyy-MM-dd");
    const day = days.find((d) => d.date === runDate);
    if (day) {
      day.count += 1;
    }
  });

  const hasData = days.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No test runs in the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(24, 95%, 55%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(24, 95%, 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(label) => `Day: ${label}`}
          formatter={(value: number) => [value, "Runs"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(24, 95%, 55%)"
          strokeWidth={2}
          fill="url(#colorRuns)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
