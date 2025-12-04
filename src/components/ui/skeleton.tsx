import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  // Render as a span to allow using Skeleton inside inline/phrasing elements
  // while preserving sizing via utility classes. Use display block via
  // classes when needed (e.g. `block` or `mx-auto`).
  return <span className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
