import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Trophy, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";

/**
 * CounselorPerformanceChart
 *
 * Horizontal bar chart — one bar per counselor, length proportional to revenue.
 * Tooltip shows both metrics (admissions count + revenue) since they tell different stories.
 */

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
      <p className="mb-2 text-sm font-semibold">{d.counselorName}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Admissions:</span>
          <span className="font-medium">{d.admissions}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-medium">{formatCurrency(d.revenue)}</span>
        </div>
      </div>
    </div>
  );
};

export const CounselorPerformanceChart = ({ data = [], loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Top Counselors
          </CardTitle>
          <CardDescription>
            Performance ranking by revenue generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No admissions yet in this period — counselor performance will appear
            once data is available
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = data.length * 44 + 60;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Top Counselors
          </CardTitle>
          <CardDescription>
            Performance ranking — admissions count and revenue generated
          </CardDescription>
        </div>
        {data[0] && (
          <div className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 sm:flex">
            <Trophy className="h-3.5 w-3.5" />
            Top: {data[0].counselorName}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: `${chartHeight}px`, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="counselorName"
                type="category"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      index === 0
                        ? "hsl(38 92% 55%)"
                        : index <= 2
                          ? "hsl(243 75% 59%)"
                          : "hsl(243 75% 59% / 0.6)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-1 border-t border-border pt-3">
          {data.map((c, i) => (
            <div
              key={c.counselorName}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-center font-mono text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="font-medium">{c.counselorName}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {c.admissions}
                  </span>{" "}
                  admissions
                </span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(c.revenue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
