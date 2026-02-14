import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { Bug, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

interface DayData {
  date: string;
  label: string;
  count: number;
}

export function WeeklyBugTrendsChart() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayData[]>([]);
  const [totalWeek, setTotalWeek] = useState(0);

  useEffect(() => {
    if (currentProject) loadBugTrends();
  }, [currentProject]);

  const loadBugTrends = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 6);

      const { data: bugs } = await supabase
        .from("bugs")
        .select("created_at")
        .eq("project_id", currentProject.id)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: true });

      const dayMap = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        return {
          date: format(date, "yyyy-MM-dd"),
          label: format(date, "EEE"),
          count: 0,
        };
      });

      bugs?.forEach((bug) => {
        const bugDate = format(startOfDay(parseISO(bug.created_at)), "yyyy-MM-dd");
        const day = dayMap.find((d) => d.date === bugDate);
        if (day) day.count += 1;
      });

      setDays(dayMap);
      setTotalWeek(bugs?.length || 0);
    } catch (error) {
      console.error("Error loading bug trends:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center h-[220px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = days.some((d) => d.count > 0);

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4 text-destructive" />
            Weekly Bug Trends
          </CardTitle>
          <span className="text-sm text-muted-foreground font-medium">
            {totalWeek} this week
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
            No bugs reported in the last 7 days 🎉
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
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
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value} bugs`, "Reported"]}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                name="Bugs"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
