/**
 * Seed script для создания демо-данных в Supabase
 * Запуск: node scripts/seed-demo-data.js
 * 
 * ПРЕДВАРИТЕЛЬНО:
 * 1. Настрой Supabase (см. SUPABASE_SETUP.md)
 * 2. Создай пользователя через Dashboard
 * 3. Скопируй user ID из Authentication → Users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем .env файл
const envPath = join(__dirname, '..', 'apps', 'web', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// НАСТРОЙКИ
// =====================================================

// Замени на ID пользователя из Supabase Dashboard → Authentication → Users
const USER_ID = 'YOUR_USER_ID_HERE';

// Organization ID (создаётся автоматически при миграции)
const ORG_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// DEMO DATA
// =====================================================

const departments = [
  { name: 'Диспетчерская служба', description: 'Приём и обработка заказов' },
  { name: 'Бухгалтерия', description: 'Финансовый учёт и расчёты' },
  { name: 'HR-отдел', description: 'Подбор и адаптация сотрудников' },
  { name: 'IT-отдел', description: 'Техническая поддержка и разработка' },
  { name: 'Поддержка', description: 'Работа с обращениями клиентов' },
];

const profiles = [
  {
    id: USER_ID,
    full_name: 'Анна Петрова',
    role: 'Старший оператор',
    email: 'anna@taxiline.local',
    phone: '+7 (999) 123-45-67',
    status: 'online',
    avatar_url: null,
  },
  {
    full_name: 'Мария Иванова',
    role: 'Руководитель отдела',
    email: 'maria@taxiline.local',
    phone: '+7 (999) 234-56-78',
    status: 'online',
  },
  {
    full_name: 'Алексей Петров',
    role: 'Оператор',
    email: 'alexey@taxiline.local',
    phone: '+7 (999) 345-67-89',
    status: 'busy',
  },
  {
    full_name: 'Дмитрий Соколов',
    role: 'IT-директор',
    email: 'dmitry@taxiline.local',
    phone: '+7 (999) 456-78-90',
    status: 'online',
  },
  {
    full_name: 'Елена Волкова',
    role: 'HR-директор',
    email: 'elena@taxiline.local',
    phone: '+7 (999) 567-89-01',
    status: 'away',
  },
];

// =====================================================
// SEED FUNCTIONS
// =====================================================

async function seedDepartments() {
  console.log('📁 Seed departments...');
  
  for (const dept of departments) {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        organization_id: ORG_ID,
        name: dept.name,
        description: dept.description,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.log(`   ⚠️  Department exists: ${dept.name}`);
      } else {
        console.error(`   ❌ Error: ${dept.name} - ${error.message}`);
      }
    } else {
      console.log(`   ✅ Created: ${dept.name}`);
    }
  }
}

async function seedProfiles() {
  console.log('');
  console.log('👥 Seed profiles...');
  
  for (const profile of profiles) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: profile.id || undefined,
        organization_id: ORG_ID,
        full_name: profile.full_name,
        role: profile.role,
        email: profile.email,
        phone: profile.phone,
        status: profile.status,
        avatar_url: profile.avatar_url,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.log(`   ⚠️  Profile exists: ${profile.full_name}`);
      } else if (error.code === '23503') {
        console.log(`   ⚠️  User not in auth: ${profile.full_name} (skip)`);
      } else {
        console.error(`   ❌ Error: ${profile.full_name} - ${error.message}`);
      }
    } else {
      console.log(`   ✅ Created: ${profile.full_name}`);
    }
  }
}

async function seedDepartmentMembers() {
  console.log('');
  console.log('🔗 Seed department members...');
  
  // Get all departments
  const { data: depts } = await supabase
    .from('departments')
    .select('id, name')
    .eq('organization_id', ORG_ID);
  
  if (!depts || depts.length === 0) {
    console.log('   ⚠️  No departments found');
    return;
  }
  
  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('organization_id', ORG_ID);
  
  if (!profiles || profiles.length === 0) {
    console.log('   ⚠️  No profiles found');
    return;
  }
  
  // Assign profiles to departments based on role
  for (const profile of profiles) {
    let deptName;
    let role = 'member';
    
    if (profile.role.includes('Руководитель') || profile.role.includes('Директор')) {
      role = 'head';
    }
    
    if (profile.role.includes('Диспетчер') || profile.role.includes('Оператор')) {
      deptName = 'Диспетчерская служба';
    } else if (profile.role.includes('Бухгалтер')) {
      deptName = 'Бухгалтерия';
    } else if (profile.role.includes('HR')) {
      deptName = 'HR-отдел';
    } else if (profile.role.includes('IT')) {
      deptName = 'IT-отдел';
    } else if (profile.role.includes('Поддержка')) {
      deptName = 'Поддержка';
    } else {
      deptName = 'Диспетчерская служба';
    }
    
    const dept = depts.find(d => d.name === deptName);
    
    if (dept) {
      const { error } = await supabase
        .from('department_members')
        .insert({
          department_id: dept.id,
          user_id: profile.id,
          role: role,
        });
      
      if (error) {
        if (error.code === '23505') {
          console.log(`   ⚠️  Member exists: ${profile.full_name} → ${deptName}`);
        } else {
          console.error(`   ❌ Error: ${profile.full_name} - ${error.message}`);
        }
      } else {
        console.log(`   ✅ Added: ${profile.full_name} → ${deptName} (${role})`);
      }
    }
  }
}

async function seedUserSettings() {
  console.log('');
  console.log('⚙️  Seed user settings...');
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', ORG_ID);
  
  if (!profiles) return;
  
  for (const profile of profiles) {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: profile.id,
        preferences: {
          theme: 'dark',
          density: 'default',
          textSize: 'medium',
          animations: true,
          showAvatars: true,
          sidebarMode: 'expanded',
          chatListMode: 'full',
          enterToSend: true,
        },
      });
    
    if (error) {
      console.error(`   ❌ Error: ${profile.id} - ${error.message}`);
    } else {
      console.log(`   ✅ Settings: ${profile.id}`);
    }
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Supabase Demo Data Seed               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  // Проверка подключения
  const { error: connError } = await supabase.from('organizations').select('count').limit(1);
  
  if (connError) {
    console.error('❌ Нет подключения к Supabase');
    console.error('   Выполни миграцию сначала');
    process.exit(1);
  }
  
  console.log('✅ Supabase connected');
  console.log('');
  
  // Seed data
  await seedDepartments();
  await seedProfiles();
  await seedDepartmentMembers();
  await seedUserSettings();
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('Следующий шаг:');
  console.log('1. Запусти приложение: pnpm dev:web');
  console.log('2. Войди под созданным пользователем');
  console.log('3. Проверь что данные отображаются');
}

main();
