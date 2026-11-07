"use client";

export function Skeleton({ className = "", style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded bg-slate-200 animate-pulse ${className}`}
      style={style}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full mb-2" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <Skeleton className="h-4 w-1/4 mb-4" />
      <SkeletonText lines={3} />
      <Skeleton className="mt-4 h-8 w-1/3" />
    </div>
  );
}

export function SkeletonFinding({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 px-5 py-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonMetric({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

export function SkeletonPassport({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-6 w-1/3 mb-2" />
      <Skeleton className="h-8 w-1/2 mb-6" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonMetric key={i} />
        ))}
      </div>
    </div>
  );
}