import { Skeleton } from '../ui/skeleton';

const TableSkeleton = ({ rows = 3, cols = 5 }) => (
  <div className="space-y-2 pt-4">
    <Skeleton className="h-10 w-full" />
    {[...Array(rows)].map((_, i) => (
      <Skeleton key={`row-sk-${i}`} className="h-12 w-full" />
    ))}
  </div>
);

export default TableSkeleton;
