/**
 * LoadingSkeleton — shown when the next card isn't preloaded in time.
 * Dark pulsing placeholder that fills the full viewport.
 */
export default function LoadingSkeleton() {
  return (
    <div className="feed-card-snap bg-black flex flex-col items-center justify-center">
      {/* Top accent bar (neutral) */}
      <div className="absolute top-0 left-0 right-0 h-1.5 skeleton-shimmer opacity-30" />

      {/* Background shimmer */}
      <div className="absolute inset-0 skeleton-shimmer opacity-20" />

      {/* Quote text placeholder */}
      <div className="relative z-10 px-8 w-full max-w-sm space-y-3 text-center">
        <div className="h-4 skeleton-shimmer rounded-full w-3/4 mx-auto" />
        <div className="h-4 skeleton-shimmer rounded-full w-full mx-auto" />
        <div className="h-4 skeleton-shimmer rounded-full w-5/6 mx-auto" />
        <div className="h-4 skeleton-shimmer rounded-full w-4/5 mx-auto" />
      </div>

      {/* Reaction button placeholder */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <div className="h-10 w-16 skeleton-shimmer rounded-full opacity-40" />
      </div>
    </div>
  );
}
