import { VehicleAnimation } from '@messenger/ui';

export function LinePage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Линия</h2>
          <p className="text-xs text-text-tertiary">Активная смена</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-semantic-success opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-semantic-success"></span>
          </span>
          <span className="text-xs text-semantic-success">На линии</span>
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <VehicleAnimation type="taxi" duration={800} />
            <h3 className="mt-4 text-lg font-semibold text-text-primary">Добро пожаловать на линию</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Здесь будут активные заказы и маршруты
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
