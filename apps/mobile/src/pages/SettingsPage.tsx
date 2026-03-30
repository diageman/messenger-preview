export function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 items-center justify-between border-b border-border-default px-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Панель парка</h2>
          <p className="text-xs text-text-tertiary">Настройки</p>
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary">Панель парка</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Настройки профиля и приложения
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
