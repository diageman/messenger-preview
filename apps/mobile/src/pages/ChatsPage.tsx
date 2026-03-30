import { VehicleAnimation } from '@messenger/ui';

export function ChatsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Чаты</h2>
          <p className="text-xs text-text-tertiary">Диалоги</p>
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <VehicleAnimation type="courier" duration={600} />
            <h3 className="mt-4 text-lg font-semibold text-text-primary">Чаты</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Диалоги с пассажирами и диспетчерами
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
