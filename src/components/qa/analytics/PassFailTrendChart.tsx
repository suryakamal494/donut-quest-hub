import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import type { TestResult } from "@/types/qa";

interface PassFailTrendChartProps {
  results: TestResult[];
}

export function PassFailTrendChart({ results }: PassFailTrendChartProps) {
  // Get last 7 days of data
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE"),
      pass: 0,
      fail: 0,
    };
  });

  // Count results per day
  results.forEach((result) => {
    if (!result.executed_at) return;
    const resultDate = format(startOfDay(parseISO(result.executed_at)), "yyyy-MM-dd");
    const day = days.find((d) => d.date === resultDate);
    if (day) {
      if (result.status === "pass") {
        day.pass += 1;
      } else if (result.status === "fail") {
        day.fail += 1;
      }
    }
  });

  const hasData = days.some((d) => d.pass > 0 || d.fail > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No test results in the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-xs text-foreground capitalize">{value}</span>
          )}
        />
        <Bar dataKey="pass" fill="hsl(152, 70%, 45%)" radius={[4, 4, 0, 0]} name="Passed" />
        <Bar dataKey="fail" fill="hsl(0, 85%, 60%)" radius={[4, 4, 0, 0]} name="Failed" />
      </BarChart>
    </ResponsiveContainer>
  );
}
