import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        // Default: брендовый бейдж
        default: 'bg-brand-yellow-muted text-brand-yellow-primary',
        // Secondary: нейтральный бейдж
        secondary: 'bg-background-tertiary text-text-secondary',
        // Outline: контурный бейдж
        outline: 'border border-border-default text-text-tertiary',
        // Success: позитивный статус
        success: 'bg-semantic-success/10 text-semantic-success',
        // Warning: предупреждение
        warning: 'bg-semantic-warning/10 text-semantic-warning',
        // Error: ошибка
        error: 'bg-semantic-error/10 text-semantic-error',
        // Info: информация
        info: 'bg-semantic-info/10 text-semantic-info',
        // Taxi segments (приглушённые)
        economy: 'bg-taxi-economy/10 text-taxi-economy',
        comfort: 'bg-taxi-comfort/10 text-taxi-comfort',
        business: 'bg-taxi-business/10 text-taxi-business',
        premium: 'bg-taxi-premium/10 text-taxi-premium',
        courier: 'bg-taxi-courier/10 text-taxi-courier',
        cargo: 'bg-taxi-cargo/10 text-taxi-cargo',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px]',
        default: 'px-2 py-0.5 text-xs',
        lg: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  animated?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, animated, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, className }),
          animated && 'animate-fade-in'
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
