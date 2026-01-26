import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ScenarioTypeChartProps {
  smokeCount: number;
  intraLoginCount: number;
  interLoginCount: number;
}

const COLORS = {
  smoke: "hsl(200, 95%, 50%)", // sky blue
  intra_login: "hsl(270, 70%, 60%)", // violet
  inter_login: "hsl(24, 95%, 55%)", // orange
};

export function ScenarioTypeChart({ smokeCount, intraLoginCount, interLoginCount }: ScenarioTypeChartProps) {
  const data = [
    { name: "Smoke", value: smokeCount, color: COLORS.smoke },
    { name: "Intra-Login", value: intraLoginCount, color: COLORS.intra_login },
    { name: "Inter-Login", value: interLoginCount, color: COLORS.inter_login },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No scenarios created yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={4}
          dataKey="value"
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
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
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
