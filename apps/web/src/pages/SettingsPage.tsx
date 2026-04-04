import * as React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { Separator } from '@messenger/ui';
import { Switch } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Palette,
  MessageSquare,
  Shield,
  Info,
  PenLine,
  Save,
  X,
  LogOut,
  Trash2,
  RotateCcw,
  Check,
  Monitor,
  Moon,
  Type,
  Sparkles,
  LayoutGrid,
  Clock,
  Eye,
  Keyboard,
  Smartphone,
  Globe,
  Mail,
  Phone,
  Briefcase,
  CircleUser,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '@/lib/supabase';
import { cn } from '@messenger/ui';

// ===== HELPERS =====
function yearWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (n1 > 1 && n1 < 5) return 'года';
  if (n1 === 1) return 'год';
  return 'лет';
}

function monthWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return 'месяцев';
  if (n1 > 1 && n1 < 5) return 'месяца';
  if (n1 === 1) return 'месяц';
  return 'месяцев';
}

export function SettingsPage() {
  const { profile: authProfile, updateProfile, signOut } = useAuth();
  const {
    notifications,
    appearance,
    chats,
    security,
    app,
    updateNotifications,
    updateAppearance,
    updateChats,
    updateSecurity,
    resetAllSettings,
    clearLocalData,
  } = useSettings();

  // Используем профиль из auth, а не из localStorage
  const profile = authProfile || {
    id: '',
    organization_id: '',
    full_name: '',
    role: '',
    avatar_url: null,
    phone: '',
    email: '',
    status: 'online' as const,
    created_at: '',
    updated_at: ''
  };

  // department загружается из Supabase через department_members

  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editedProfile, setEditedProfile] = React.useState({
    name: profile.full_name || '',
    role: profile.role || '',
    phone: profile.phone || '',
    status: profile.status,
  });
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
    yearsInCompany: '—',
    messageCount: '—',
    contactCount: '—',
    office: '—',
  });
  const [department, setDepartment] = React.useState<string>('');

  // Fetch real statistics from Supabase
  React.useEffect(() => {
    if (!authProfile) return;
    const { id, created_at, organization_id } = authProfile;

    async function fetchStats() {
      try {
        // Calculate tenure from created_at
        if (created_at) {
          const createdAt = new Date(created_at);
          const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          const years = Math.floor(diffDays / 365.25);
          const months = Math.floor((diffDays % 365.25) / 30.44);
          setStats(prev => ({
            ...prev,
            yearsInCompany: years > 0
              ? `${years} ${yearWord(years)}`
              : `${months} ${monthWord(months)}`,
          }));
        }

        // Count messages sent by user
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', id);
        setStats(prev => ({
          ...prev,
          messageCount: msgCount != null ? msgCount.toLocaleString('ru-RU') : '0',
        }));

        // Count contacts (other users in same organization)
        const { count: contactCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization_id)
          .neq('id', id);
        setStats(prev => ({
          ...prev,
          contactCount: contactCount != null ? contactCount.toLocaleString('ru-RU') : '0',
        }));

        // Get organization name for office
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organization_id)
          .single();
        if (orgData?.name) {
          setStats(prev => ({ ...prev, office: orgData.name }));
        }

        // Get department name
        const { data: deptData } = await supabase
          .from('department_members')
          .select('departments(name)')
          .eq('user_id', id)
          .single();
        if (deptData?.departments) {
          setDepartment((deptData.departments as any).name || '');
        }
      } catch (err) {
        console.error('[Settings] Failed to fetch stats:', err);
      }
    }

    fetchStats();
  }, [authProfile?.id, authProfile?.created_at, authProfile?.organization_id]);

  React.useEffect(() => {
    setEditedProfile({
      name: profile.full_name || '',
      role: profile.role || '',
      phone: profile.phone || '',
      status: profile.status,
    });
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    
    try {
      const { error } = await updateProfile({
        full_name: editedProfile.name,
        role: editedProfile.role,
        phone: editedProfile.phone,
        status: editedProfile.status,
      });
      
      if (error) {
        setSaveError('Не удалось сохранить профиль');
      } else {
        setIsEditingProfile(false);
      }
    } catch (err) {
      setSaveError('Произошла ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({
      name: profile.full_name || '',
      role: profile.role || '',
      phone: profile.phone || '',
      status: profile.status,
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="flex h-full flex-col bg-bg-app">
      {/* Page Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-bg-panel px-6">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Настройки</h1>
          <p className="text-sm text-text-muted">Параметры приложения</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            v{app.version}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          {/* Profile Header — Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden border-border-soft bg-gradient-to-r from-bg-elevated to-bg-panel">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <Avatar size="xl" fallback={profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)} status={profile.status === 'dnd' ? 'busy' : profile.status} showStatus />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-text-primary">{profile.full_name || 'Пользователь'}</h2>
                        <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                          <Briefcase className="h-3.5 w-3.5" />
                          {profile.role || '—'}
                          <span className="text-text-muted">•</span>
                          <LayoutGrid className="h-3.5 w-3.5" />
                          {department || '—'}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <Badge variant="default" size="sm">Основной сотрудник</Badge>
                          <Badge variant="success" size="sm">На линии</Badge>
                          <Badge variant="outline" size="sm" className="text-xs">
                            {profile.email}
                          </Badge>
                        </div>
                      </div>
                      {!isEditingProfile ? (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditingProfile(true)}>
                          <PenLine className="mr-1.5 h-3.5 w-3.5" />
                          Редактировать
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Отмена
                          </Button>
                          <Button variant="primary" size="sm" onClick={handleSaveProfile} disabled={saving}>
                            {saving ? (
                              <>
                                <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Сохранение...
                              </>
                            ) : (
                              <>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Сохранить
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    {saveError && (
                      <div className="mt-3 rounded-lg bg-error/10 p-3 text-sm text-error">
                        {saveError}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard label="В компании" value={stats.yearsInCompany} />
            <StatCard label="Сообщений" value={stats.messageCount} />
            <StatCard label="Контактов" value={stats.contactCount} />
            <StatCard label="Офис" value={stats.office} />
          </motion.div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SettingsSection icon={User} title="Профиль">
              {isEditingProfile ? (
                <div className="grid gap-4 py-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-medium text-text-secondary">ФИО</label>
                    <Input
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      className="h-9 bg-bg-panel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">Должность</label>
                    <Input
                      value={editedProfile.role}
                      onChange={(e) => setEditedProfile({ ...editedProfile, role: e.target.value })}
                      className="h-9 bg-bg-panel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">Телефон</label>
                    <Input
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      className="h-9 bg-bg-panel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">Статус</label>
                    <Select
                      value={editedProfile.status}
                      onChange={(value) => setEditedProfile({ ...editedProfile, status: value as any })}
                      options={[
                        { value: 'online', label: '🟢 На линии' },
                        { value: 'busy', label: '🔴 Занят' },
                        { value: 'away', label: '🟡 Отошёл' },
                        { value: 'dnd', label: '⛔ Не беспокоить' },
                        { value: 'offline', label: '⚫ Не в сети' },
                      ]}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-medium text-text-secondary">
                      Email
                      <span className="ml-2 text-xs text-text-muted">(не может быть изменён)</span>
                    </label>
                    <Input
                      type="email"
                      value={profile.email || ''}
                      disabled
                      className="h-9 bg-bg-panel opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-text-muted">
                      Для изменения email обратитесь к администратору
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border-soft py-2">
                  <SettingsRow label="ФИО" value={profile.full_name || '—'} icon={CircleUser} />
                  <SettingsRow label="Должность" value={profile.role || '—'} icon={Briefcase} />
                  <SettingsRow label="Телефон" value={profile.phone || '—'} icon={Phone} />
                  <SettingsRow label="Email" value={profile.email || '—'} icon={Mail} />
                  <SettingsRow label="Статус" value={profile.status === 'online' ? 'На линии' : (profile.status === 'dnd' ? 'Не беспокоить' : profile.status)} icon={CircleUser} />
                </div>
              )}
            </SettingsSection>
          </motion.div>

          {/* Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SettingsSection icon={Bell} title="Уведомления">
              <div className="divide-y divide-border-soft py-2">
                <SettingsRow
                  label="Звук уведомлений"
                  icon={Bell}
                  action={
                    <Switch
                      checked={notifications.sound}
                      onCheckedChange={(checked) => updateNotifications({ sound: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Push-уведомления"
                  icon={Smartphone}
                  action={
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => updateNotifications({ push: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Email-уведомления"
                  icon={Mail}
                  action={
                    <Select
                      value={notifications.email}
                      onChange={(value) => updateNotifications({ email: value as 'all' | 'important' | 'none' })}
                      options={[
                        { value: 'all', label: 'Все' },
                        { value: 'important', label: 'Только важные' },
                        { value: 'none', label: 'Отключены' },
                      ]}
                    />
                  }
                />
                <SettingsRow
                  label="Только важные"
                  icon={Shield}
                  action={
                    <Switch
                      checked={notifications.doNotDisturb}
                      onCheckedChange={(checked) => updateNotifications({ doNotDisturb: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Упоминания"
                  icon={User}
                  action={
                    <Switch
                      checked={notifications.mentions}
                      onCheckedChange={(checked) => updateNotifications({ mentions: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Сигналы системы"
                  icon={Bell}
                  action={
                    <Switch
                      checked={notifications.systemSignals}
                      onCheckedChange={(checked) => updateNotifications({ systemSignals: checked })}
                    />
                  }
                />
              </div>
            </SettingsSection>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SettingsSection icon={Palette} title="Внешний вид">
              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary">Тема</label>
                  <div className="flex gap-2">
                    <SegmentedButton
                      active={appearance.theme === 'dark'}
                      onClick={() => updateAppearance({ theme: 'dark' })}
                      icon={Moon}
                      label="Dark"
                    />
                    <SegmentedButton
                      active={appearance.theme === 'system'}
                      onClick={() => updateAppearance({ theme: 'system' })}
                      icon={Monitor}
                      label="System"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary">Плотность интерфейса</label>
                  <div className="flex gap-2">
                    <SegmentedButton
                      active={appearance.density === 'compact'}
                      onClick={() => updateAppearance({ density: 'compact' })}
                      label="Compact"
                      compact
                    />
                    <SegmentedButton
                      active={appearance.density === 'default'}
                      onClick={() => updateAppearance({ density: 'default' })}
                      label="Default"
                      compact
                    />
                    <SegmentedButton
                      active={appearance.density === 'spacious'}
                      onClick={() => updateAppearance({ density: 'spacious' })}
                      label="Spacious"
                      compact
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary">Размер текста</label>
                  <div className="flex gap-2">
                    <SegmentedButton
                      active={appearance.textSize === 'small'}
                      onClick={() => updateAppearance({ textSize: 'small' })}
                      icon={Type}
                      label="S"
                      compact
                    />
                    <SegmentedButton
                      active={appearance.textSize === 'medium'}
                      onClick={() => updateAppearance({ textSize: 'medium' })}
                      icon={Type}
                      label="M"
                      compact
                    />
                    <SegmentedButton
                      active={appearance.textSize === 'large'}
                      onClick={() => updateAppearance({ textSize: 'large' })}
                      icon={Type}
                      label="L"
                      compact
                    />
                  </div>
                </div>

                <Separator className="my-3 bg-border-soft" />

                <div className="space-y-1">
                  <SettingsRow
                    label="Анимации"
                    icon={Sparkles}
                    action={
                      <Switch
                        checked={appearance.animations}
                        onCheckedChange={(checked) => updateAppearance({ animations: checked })}
                      />
                    }
                  />
                  <SettingsRow
                    label="Показывать аватары"
                    icon={Eye}
                    action={
                      <Switch
                        checked={appearance.showAvatars}
                        onCheckedChange={(checked) => updateAppearance({ showAvatars: checked })}
                      />
                    }
                  />
                </div>
              </div>
            </SettingsSection>
          </motion.div>

          {/* Chats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SettingsSection icon={MessageSquare} title="Чаты и интерфейс">
              <div className="divide-y divide-border-soft py-2">
                <SettingsRow
                  label="Sidebar по умолчанию"
                  icon={LayoutGrid}
                  action={
                    <Select
                      value={chats.sidebarMode}
                      onChange={(value) => updateChats({ sidebarMode: value as 'expanded' | 'compact' })}
                      options={[
                        { value: 'expanded', label: 'Развёрнутый' },
                        { value: 'compact', label: 'Компактный' },
                      ]}
                    />
                  }
                />
                <SettingsRow
                  label="Список чатов"
                  icon={MessageSquare}
                  action={
                    <Select
                      value={chats.chatListMode}
                      onChange={(value) => updateChats({ chatListMode: value as 'full' | 'compact' })}
                      options={[
                        { value: 'full', label: 'Полный' },
                        { value: 'compact', label: 'Компактный' },
                      ]}
                    />
                  }
                />
                <SettingsRow
                  label="Enter отправляет сообщение"
                  icon={Keyboard}
                  action={
                    <Switch
                      checked={chats.enterToSend}
                      onCheckedChange={(checked) => updateChats({ enterToSend: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Сохранять размеры панелей"
                  icon={LayoutGrid}
                  action={
                    <Switch
                      checked={chats.preservePanelSizes}
                      onCheckedChange={(checked) => updateChats({ preservePanelSizes: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Превью вложений"
                  icon={Eye}
                  action={
                    <Switch
                      checked={chats.showAttachmentPreview}
                      onCheckedChange={(checked) => updateChats({ showAttachmentPreview: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Автопометка как прочитанное"
                  icon={Check}
                  action={
                    <Switch
                      checked={chats.autoMarkAsRead}
                      onCheckedChange={(checked) => updateChats({ autoMarkAsRead: checked })}
                    />
                  }
                />
              </div>
            </SettingsSection>
          </motion.div>

          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SettingsSection icon={Shield} title="Безопасность">
              <div className="divide-y divide-border-soft py-2">
                <SettingsRow
                  label="Двухфакторная аутентификация"
                  icon={Shield}
                  action={
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) => updateSecurity({ twoFactor: checked })}
                    />
                  }
                />
                <SettingsRow
                  label="Активные сессии"
                  icon={Smartphone}
                  value={`${security.activeSessions} устройства`}
                />
                <SettingsRow
                  label="Автоблокировка"
                  icon={Lock}
                  action={
                    <Switch
                      checked={security.autoLock}
                      onCheckedChange={(checked) => updateSecurity({ autoLock: checked })}
                    />
                  }
                />
                {security.autoLock && (
                  <SettingsRow
                    label="Таймаут автоблокировки"
                    icon={Clock}
                    action={
                      <Select
                        value={String(security.autoLockTimeout)}
                        onChange={(value) => updateSecurity({ autoLockTimeout: Number(value) })}
                        options={[
                          { value: '1', label: '1 минута' },
                          { value: '5', label: '5 минут' },
                          { value: '10', label: '10 минут' },
                          { value: '30', label: '30 минут' },
                        ]}
                      />
                    }
                  />
                )}
              </div>
            </SettingsSection>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <SettingsSection icon={Info} title="О приложении">
              <div className="divide-y divide-border-soft py-2">
                <SettingsRow label="Версия" value={app.version} icon={Info} />
                <SettingsRow label="Платформа" value={app.platform} icon={Monitor} />
                <SettingsRow label="Язык" value="Русский" icon={Globe} />
              </div>

              <Separator className="my-4 bg-border-soft" />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={clearLocalData}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Очистить данные
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={resetAllSettings}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Сброс настроек
                </Button>
              </div>
            </SettingsSection>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden border-error/30 bg-error/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-error" />
                  <h3 className="text-base font-semibold text-error">Завершение сессии</h3>
                </div>
                <p className="text-sm text-text-muted">
                  Выйти из системы на этом устройстве
                </p>
              </CardHeader>
              <CardFooter>
                <Button variant="destructive" size="sm" onClick={signOut}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Выйти из системы
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===== STAT CARD =====
interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="border-border-soft bg-bg-elevated">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

// ===== SETTINGS SECTION =====
interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, children }: SettingsSectionProps) {
  return (
    <Card className="border-border-soft bg-bg-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10">
            <Icon className="h-4 w-4 text-accent-yellow" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ===== SETTINGS ROW =====
interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

function SettingsRow({ label, value, icon: Icon, action }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-bg-hover">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-text-primary">{value}</span>}
        {action}
      </div>
    </div>
  );
}

// ===== SELECT COMPONENT =====
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

function Select({ value, onChange, options }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-2 rounded-md border border-border-soft bg-bg-panel px-2 text-xs text-text-secondary hover:border-border-subtle focus:border-accent-yellow focus:outline-none"
      >
        {selectedOption?.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-border-soft bg-bg-elevated shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-bg-hover',
                  value === option.value ? 'text-text-primary' : 'text-text-secondary'
                )}
              >
                {option.label}
                {value === option.value && <Check className="h-3 w-3 text-accent-yellow" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===== SEGMENTED BUTTON =====
interface SegmentedButtonProps {
  active?: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  compact?: boolean;
}

function SegmentedButton({ active, onClick, icon: Icon, label, compact = false }: SegmentedButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow'
          : 'border-border-soft bg-bg-panel text-text-secondary hover:border-border-subtle hover:text-text-primary',
        compact && 'px-2'
      )}
    >
      {Icon && <Icon className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />}
      {label}
    </button>
  );
}
