import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import type { TestResult } from "@/types/qa";

interface TestCaseTrendChartProps {
  results: TestResult[];
}

export function TestCaseTrendChart({ results }: TestCaseTrendChartProps) {
  // Group results by date and calculate pass rate
  const groupedByDate = results.reduce((acc, result) => {
    if (!result.executed_at) return acc;
    const date = format(parseISO(result.executed_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = { pass: 0, fail: 0, total: 0 };
    }
    acc[date].total += 1;
    if (result.status === "pass") {
      acc[date].pass += 1;
    } else if (result.status === "fail") {
      acc[date].fail += 1;
    }
    return acc;
  }, {} as Record<string, { pass: number; fail: number; total: number }>);

  // Convert to chart data and sort by date
  const chartData = Object.entries(groupedByDate)
    .map(([date, stats]) => ({
      date,
      label: format(parseISO(date), "MMM d"),
      passRate: Math.round((stats.pass / stats.total) * 100),
      executions: stats.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14); // Last 14 data points

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        No execution history available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number, name: string) => {
            if (name === "passRate") return [`${value}%`, "Pass Rate"];
            return [value, "Executions"];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-xs text-foreground">
              {value === "passRate" ? "Pass Rate" : "Executions"}
            </span>
          )}
        />
        <Line
          type="monotone"
          dataKey="passRate"
          stroke="hsl(152, 70%, 45%)"
          strokeWidth={2}
          dot={{ fill: "hsl(152, 70%, 45%)", strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: "hsl(152, 70%, 45%)" }}
        />
        <Line
          type="monotone"
          dataKey="executions"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
          yAxisId={0}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
