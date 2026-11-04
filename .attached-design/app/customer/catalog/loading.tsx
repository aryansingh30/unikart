import { Skeleton } from '@/components/ui/primitives'

export default function CatalogLoading() {
  return (
    <div role="status" aria-label="Loading catalogue">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-56" />
      <Skeleton className="mt-8 h-14 w-full rounded-xl" />
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="mt-6 flex gap-8">
        <div className="hidden w-60 shrink-0 space-y-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <Skeleton className="aspect-[4/4.4] w-full rounded-[10px]" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-4 h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
