import { VehicleAnimation } from '@messenger/ui';

export function SignalsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border-default px-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Сигналы</h2>
          <p className="text-sm text-text-tertiary">Уведомления системы</p>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <VehicleAnimation type="premium" duration={700} />
            <h3 className="mt-4 text-xl font-semibold text-text-primary">Сигналы</h3>
            <p className="mt-2 text-text-secondary">
              Здесь будут отображаться системные уведомления и оповещения
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
