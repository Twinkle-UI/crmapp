import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';

/**
 * The middle-right widget from the sketch:
 *   Two columns side-by-side — "Admission This Month" | "Register This Month"
 *   Each column shows the most recent records.
 */
export const ThisMonthLists = ({ admissions = [], registrations = [], loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Month — Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:divide-x sm:divide-border">
          <ListPane title="Admissions" emptyText="No admissions this month" items={admissions} renderRight={(a) => formatCurrency(a.feeAmount)} />
          <div className="sm:pl-6">
            <ListPane title="Registrations" emptyText="No registrations this month" items={registrations} renderRight={(r) => r.course || r.team?.name || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ListPane = ({ title, emptyText, items, renderRight }) => (
  <div>
    <p className="mb-3 text-sm font-medium">{title}</p>
    {items.length === 0 ? (
      <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
    ) : (
      <ul className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <li key={item._id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(item.createdAt || item.admittedOn)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{renderRight(item)}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
