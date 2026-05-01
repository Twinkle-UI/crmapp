import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * KPI Card — matches the sketch exactly:
 *   [ Label ]
 *   [ Big number ]
 *   [ Subtitle e.g. "This month" / "Across all teams" ]
 *
 * An icon sits in the top-right corner with a colored background.
 */
export const KpiCard = ({ label, value, subtitle, icon: Icon, color = 'primary', loading, delay = 0 }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
    );
  }

  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="transition-shadow hover:shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {Icon && (
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colorMap[color])}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
