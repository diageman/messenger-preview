import * as React from 'react';
import { cn } from '../lib/utils';
import { Car, Bike, Truck, Package } from 'lucide-react';

export interface VehicleAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'taxi' | 'courier' | 'bike' | 'cargo' | 'premium';
  trigger?: 'page-load' | 'section-enter' | 'action' | 'hover';
  duration?: number;
  enabled?: boolean;
  className?: string;
}

const VehicleIcon = ({ type }: { type: VehicleAnimationProps['type'] }) => {
  switch (type) {
    case 'taxi':
      return (
        <Car className="h-6 w-6 text-brand-yellow-primary" strokeWidth={1.5} />
      );
    case 'courier':
      return (
        <Package className="h-6 w-6 text-semantic-warning" strokeWidth={1.5} />
      );
    case 'bike':
      return (
        <Bike className="h-6 w-6 text-semantic-info" strokeWidth={1.5} />
      );
    case 'cargo':
      return (
        <Truck className="h-6 w-6 text-text-secondary" strokeWidth={1.5} />
      );
    case 'premium':
      return (
        <Car className="h-6 w-6 text-brand-yellow-primary" strokeWidth={1} />
      );
    default:
      return null;
  }
};

const VehicleAnimation = React.forwardRef<HTMLDivElement, VehicleAnimationProps>(
  (
    {
      type,
      trigger = 'page-load',
      duration = 600,
      enabled = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(trigger === 'page-load');

    if (!enabled) {
      return children ? <>{children}</> : null;
    }

    const handleHoverStart = () => {
      if (trigger === 'hover') {
        setIsVisible(true);
      }
    };

    const handleHoverEnd = () => {
      if (trigger === 'hover') {
        setIsVisible(false);
      }
    };

    const animationStyle: React.CSSProperties = {
      animation: `slideIn ${duration / 1000}s ease-out`,
    };

    return (
      <div
        ref={ref}
        className={cn('inline-block', className)}
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
        {...props}
      >
        {isVisible && (
          <div
            className="flex items-center gap-2"
            style={animationStyle}
          >
            <VehicleIcon type={type} />
            {children}
          </div>
        )}
      </div>
    );
  }
);
VehicleAnimation.displayName = 'VehicleAnimation';

export { VehicleAnimation };
