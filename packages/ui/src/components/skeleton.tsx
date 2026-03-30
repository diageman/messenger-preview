import * as React from 'react';
import { cn } from '../lib/utils';

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'animate-pulse rounded-md bg-background-tertiary',
      'bg-gradient-to-r from-background-tertiary via-background-elevated to-background-tertiary',
      'bg-[length:200%_100%]',
      className
    )}
    style={{
      animation: 'shimmer 2s linear infinite',
    }}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export { Skeleton };
