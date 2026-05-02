import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * DailyTrendChart — reusable area chart for daily counts over a date range.
 *
 * Used by both Registrations and Admissions widgets — the only differences
 * between them are the title, color, and which data series to show. So we
 * accept all three as props, keeping the component generic.
 *
 * Why area chart for this specific use case:
 *  - Daily counts often have peaks and valleys; the filled area visually
 *    emphasizes the volume rather than just the trend line
 *  - With many days (30+) on the x-axis, individual data points blend into
 *    a smooth shape that reads at a glance
 *  - Gradient fill gives a polished, modern look (Stripe/HubSpot style)
 */

const CustomTooltip = ({ active, payload, label, metricLabel }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {value} {metricLabel}
      </p>
    </div>
  );
};

export const DailyTrendChart = ({
  title,
  description,
  data = [],
  loading,
  color = "hsl(243 75% 59%)", // default primary purple
  metricLabel = "records",
  icon: Icon,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Total for the period — useful summary above the chart
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  // Pick a sensible tick interval so the x-axis isn't crowded.
  // For 7 days show all ticks; for 30 days show every 5th; for 90+ every 10th.
  const tickInterval =
    data.length > 30 ? Math.ceil(data.length / 8) : data.length > 14 ? 2 : 0;

  // Stable gradient ID per chart instance to avoid SVG defs collisions
  // when multiple charts are on the same page.
  const gradientId = `gradient-${title.replace(/\s/g, "")}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-semibold tracking-tight"
              style={{ color }}
            >
              {total}
            </p>
            <p className="text-xs text-muted-foreground">total in range</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No data in this period
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip metricLabel={metricLabel} />}
                  cursor={{
                    stroke: color,
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={color}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: color,
                    strokeWidth: 2,
                    stroke: "hsl(var(--card))",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
