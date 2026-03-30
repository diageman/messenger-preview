/**
 * Script для создания демо-данных через anon key
 * Запуск: node scripts/create-demo-data.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', 'apps', 'web', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoData() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Create Demo Data                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Создаём организацию
  console.log('📁 Создание организации...');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Таксопарк "Линия"',
      slug: 'taxi-line'
    })
    .select()
    .single();

  if (orgError) {
    if (orgError.code === '23505') {
      console.log('   ⚠️  Организация уже существует');
    } else {
      console.log(`   ❌ Ошибка: ${orgError.message}`);
      console.log('   Возможно, RLS блокирует вставку без аутентификации');
    }
  } else {
    console.log('   ✅ Организация создана');
  }

  // 2. Создаём департаменты
  console.log('\n🏢 Создание департаментов...');
  const departments = [
    { name: 'Диспетчерская служба', description: 'Приём и обработка заказов' },
    { name: 'Бухгалтерия', description: 'Финансовый учёт и расчёты' },
    { name: 'HR-отдел', description: 'Подбор и адаптация сотрудников' },
    { name: 'IT-отдел', description: 'Техническая поддержка и разработка' },
    { name: 'Поддержка', description: 'Работа с обращениями клиентов' }
  ];

  for (const dept of departments) {
    const { error } = await supabase
      .from('departments')
      .insert({
        organization_id: '00000000-0000-0000-0000-000000000001',
        name: dept.name,
        description: dept.description
      });

    if (error) {
      if (error.code === '23505') {
        console.log(`   ⚠️  ${dept.name} - уже существует`);
      } else {
        console.log(`   ❌ ${dept.name} - ${error.message}`);
      }
    } else {
      console.log(`   ✅ ${dept.name}`);
    }
  }

  // 3. Проверка профилей
  console.log('\n👥 Проверка профилей...');
  const { data: profiles } = await supabase.from('profiles').select('count');
  
  if (profiles && profiles.length > 0) {
    console.log(`   ✅ Профилей: ${profiles[0].count || 0}`);
  } else {
    console.log('   ℹ️  Профили отсутствуют');
    console.log('   Нужно создать пользователя через Dashboard → Authentication → Users');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Готово!');
  console.log('\nСледующий шаг:');
  console.log('1. Создай пользователя в Dashboard → Authentication → Users');
  console.log('   Email: anna@taxiline.local, Password: demo123');
  console.log('2. Добавь профиль пользователя через SQL:');
  console.log(`
INSERT INTO profiles (id, organization_id, full_name, role, email, status)
VALUES (
  'USER_ID_ИЗ_AUTH',  -- Замени на ID пользователя
  '00000000-0000-0000-0000-000000000001',
  'Анна Петрова',
  'Оператор',
  'anna@taxiline.local',
  'online'
);
`);
}

createDemoData();
