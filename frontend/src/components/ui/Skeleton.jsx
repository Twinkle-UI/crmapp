import { cn } from '@/lib/utils';

export const Skeleton = ({ className, ...props }) => (
  <div className={cn('skeleton', className)} {...props} />
);
