import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-1/3 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
