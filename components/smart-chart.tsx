"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChartIcon, LineChartIcon, Table } from "lucide-react";

interface SmartChartProps {
  data: Record<string, unknown>[];
  columns?: string[];
}

type ChartType = "bar" | "pie" | "line" | "table";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function isNumeric(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && isFinite(parsed);
  }
  return false;
}

function isDateLike(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{4}-\d{2}$/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /^\d{4}$/,
  ];
  return datePatterns.some((pattern) => pattern.test(value));
}

function detectChartType(
  data: Record<string, unknown>[],
  columns: string[]
): ChartType {
  if (!data || data.length === 0 || columns.length === 0) return "table";

  const firstRow = data[0];
  const numericCols = columns.filter((col) => isNumeric(firstRow[col]));
  const nonNumericCols = columns.filter((col) => !isNumeric(firstRow[col]));
  const dateCols = columns.filter((col) => isDateLike(firstRow[col]));

  if (dateCols.length > 0 && numericCols.length > 0) {
    return "line";
  }

  if (
    columns.length === 2 &&
    nonNumericCols.length === 1 &&
    numericCols.length === 1 &&
    data.length <= 8
  ) {
    return "pie";
  }

  if (nonNumericCols.length >= 1 && numericCols.length >= 1) {
    return "bar";
  }

  return "table";
}

export function SmartChart({ data, columns: propColumns }: SmartChartProps) {
  const columns = useMemo(() => {
    if (propColumns && propColumns.length > 0) return propColumns;
    if (data && data.length > 0) return Object.keys(data[0]);
    return [];
  }, [data, propColumns]);

  const detectedType = useMemo(
    () => detectChartType(data, columns),
    [data, columns]
  );
  const [chartType, setChartType] = useState<ChartType>(detectedType);

  const { labelCol, numericCols, dateCol } = useMemo(() => {
    if (!data || data.length === 0)
      return { labelCol: "", numericCols: [], dateCol: "" };

    const firstRow = data[0];
    const numeric = columns.filter((col) => isNumeric(firstRow[col]));
    const dates = columns.filter((col) => isDateLike(firstRow[col]));
    const labels = columns.filter(
      (col) => !isNumeric(firstRow[col]) && !isDateLike(firstRow[col])
    );

    return {
      labelCol: labels[0] || dates[0] || columns[0] || "",
      numericCols: numeric,
      dateCol: dates[0] || "",
    };
  }, [data, columns]);

  const chartData = useMemo(() => {
    return data.map((row) => {
      const newRow: Record<string, unknown> = {};
      columns.forEach((col) => {
        const value = row[col];
        if (isNumeric(value)) {
          newRow[col] =
            typeof value === "string" ? parseFloat(value) : value;
        } else {
          newRow[col] = value;
        }
      });
      return newRow;
    });
  }, [data, columns]);

  if (!data || data.length === 0) return null;

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={numericCols[0]}
                nameKey={labelCol}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey={dateCol || labelCol}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {numericCols.map((col, index) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
      default:
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey={labelCol}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {numericCols.map((col, index) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 justify-end">
        <Button
          variant={chartType === "bar" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => setChartType("bar")}
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={chartType === "pie" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => setChartType("pie")}
        >
          <PieChartIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={chartType === "line" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => setChartType("line")}
        >
          <LineChartIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={chartType === "table" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => setChartType("table")}
        >
          <Table className="h-3.5 w-3.5" />
        </Button>
      </div>
      {chartType !== "table" && (
        <div className="bg-card rounded-lg border border-border p-4">
          {renderChart()}
        </div>
      )}
    </div>
  );
}
