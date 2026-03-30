import { VehicleAnimation } from '@messenger/ui';

export function CrewPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border-default px-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Экипаж</h2>
          <p className="text-sm text-text-tertiary">Контакты и команда</p>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <VehicleAnimation type="bike" duration={500} />
            <h3 className="mt-4 text-xl font-semibold text-text-primary">Экипаж</h3>
            <p className="mt-2 text-text-secondary">
              Здесь будет список контактов вашей команды и партнёров
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
