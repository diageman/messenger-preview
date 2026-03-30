import * as React from 'react';
import { cn } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Check, Wifi, Coffee, Briefcase, Moon, CircleOff } from 'lucide-react';

export type UserStatus = 'online' | 'busy' | 'away' | 'dnd' | 'offline';

interface StatusOption {
  value: UserStatus;
  label: string;
  icon: React.ElementType;
  color: string;
}

const statusOptions: StatusOption[] = [
  { value: 'online', label: 'На линии', icon: Wifi, color: 'text-success' },
  { value: 'busy', label: 'Занят', icon: Briefcase, color: 'text-error' },
  { value: 'away', label: 'На перерыве', icon: Coffee, color: 'text-warning' },
  { value: 'dnd', label: 'Не беспокоить', icon: Moon, color: 'text-info' },
  { value: 'offline', label: 'Не в сети', icon: CircleOff, color: 'text-muted' },
];

interface StatusMenuProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
}

export function StatusMenu({ currentStatus, onStatusChange }: StatusMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentOption = statusOptions.find((o) => o.value === currentStatus) || statusOptions[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('gap-2', currentOption.color)}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="hidden text-xs font-medium md:inline">
          {currentOption.label}
        </span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border-soft bg-bg-elevated shadow-lg">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = currentStatus === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover',
                    isSelected ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  <Icon className={cn('h-4 w-4', option.color)} />
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-accent-yellow" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
