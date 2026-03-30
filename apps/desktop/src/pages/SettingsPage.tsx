export function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border-default px-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Панель парка</h2>
          <p className="text-sm text-text-tertiary">Настройки системы</p>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-text-primary">Панель парка</h3>
            <p className="mt-2 text-text-secondary">
              Здесь будут настройки профиля, уведомления и параметры приложения
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
