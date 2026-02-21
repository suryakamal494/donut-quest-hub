import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { HealthCell } from "./HealthCell";
import { HealthLegend } from "./HealthLegend";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student"];

interface CrossLoginTabProps {
  allHealthData: HealthData[];
  features: { id: string; name: string; login_type: string }[];
  onCellClick: (data: HealthData) => void;
}

export function CrossLoginTab({ allHealthData, features, onCellClick }: CrossLoginTabProps) {
  const uniqueFeatureNames = useMemo(() => {
    const names = new Set<string>();
    features.forEach((f) => names.add(f.name));
    return Array.from(names);
  }, [features]);

  const grid = useMemo(() => {
    return uniqueFeatureNames.map((name) => {
      const cells: Record<string, HealthData | null> = {};
      LOGIN_TYPES.forEach((lt) => {
        const hd = allHealthData.find((d) => d.featureName === name && d.loginType === lt);
        cells[lt] = hd || null;
      });
      return { name, cells };
    });
  }, [uniqueFeatureNames, allHealthData]);

  return (
    <div className="space-y-3">
      <HealthLegend />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Feature</TableHead>
                  {LOGIN_TYPES.map((lt) => (
                    <TableHead key={lt} className="text-center min-w-[56px] text-xs">
                      {LOGIN_TYPE_LABELS[lt].split(" ")[0].substring(0, 4)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grid.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="sticky left-0 bg-card z-10 text-sm font-medium whitespace-nowrap">
                      {row.name}
                    </TableCell>
                    {LOGIN_TYPES.map((lt) => (
                      <TableCell key={lt} className="text-center p-1">
                        {row.cells[lt] ? (
                          <HealthCell
                            data={row.cells[lt]!}
                            compact
                            showScore
                            onClick={() => onCellClick(row.cells[lt]!)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                            N/A
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
