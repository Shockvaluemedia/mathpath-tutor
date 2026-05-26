import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200/80", className)}
      {...props}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="pt-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
      </div>
      <div className="flex items-start gap-3 flex-row-reverse">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <StatsSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, CardSkeleton, StatsSkeleton, LessonSkeleton, ChatSkeleton, DashboardSkeleton };
