/**
 * Script для проверки состояния БД
 * Запуск: node scripts/check-db-state.js
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

async function checkDbState() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Database State Check                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Проверка организаций
  console.log('📁 Организации:');
  const { data: orgs } = await supabase.from('organizations').select('*');
  if (orgs && orgs.length > 0) {
    orgs.forEach(org => {
      console.log(`   ✅ ${org.name} (${org.slug})`);
    });
  } else {
    console.log('   ❌ Нет организаций');
  }

  // 2. Проверка профилей
  console.log('\n👥 Профили пользователей:');
  const { data: profiles } = await supabase.from('profiles').select('*');
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`   ✅ ${p.full_name} - ${p.email} (${p.role})`);
    });
  } else {
    console.log('   ❌ Нет профилей в таблице profiles');
    console.log('   Нужно создать пользователя через Dashboard → Authentication → Users');
    console.log('   Затем добавить профиль вручную в таблицу profiles');
  }

  // 3. Проверка департаментов
  console.log('\n🏢 Департаменты:');
  const { data: depts } = await supabase.from('departments').select('*');
  if (depts && depts.length > 0) {
    depts.forEach(d => {
      console.log(`   ✅ ${d.name}`);
    });
  } else {
    console.log('   ❌ Нет департаментов');
  }

  // 4. Проверка чатов
  console.log('\n💬 Чаты:');
  const { data: chats } = await supabase.from('chats').select('*');
  if (chats && chats.length > 0) {
    console.log(`   ✅ Найдено чатов: ${chats.length}`);
    chats.slice(0, 5).forEach(c => {
      console.log(`      - ${c.name || 'Без названия'} (${c.type})`);
    });
  } else {
    console.log('   ℹ️  Чатов пока нет (это нормально)');
  }

  // 5. Проверка сообщений
  console.log('\n📨 Сообщения:');
  const { data: messages } = await supabase.from('messages').select('*');
  if (messages && messages.length > 0) {
    console.log(`   ✅ Найдено сообщений: ${messages.length}`);
  } else {
    console.log('   ℹ️  Сообщений пока нет (это нормально)');
  }

  console.log('\n═══════════════════════════════════════');
  
  if (!profiles || profiles.length === 0) {
    console.log('\n⚠️  ВНИМАНИЕ: Нет профилей пользователей!');
    console.log('\nДля исправления:');
    console.log('1. Открой Supabase Dashboard → Authentication → Users');
    console.log('2. Создай пользователя (например, anna@taxiline.local / demo123)');
    console.log('3. Скопируй User ID созданного пользователя');
    console.log('4. Открой Table Editor → profiles → Insert Row');
    console.log('5. Вставь ID пользователя и заполни поля:');
    console.log('   - id: <User ID из шага 3>');
    console.log('   - organization_id: 00000000-0000-0000-0000-000000000001');
    console.log('   - full_name: Анна Петрова');
    console.log('   - email: anna@taxiline.local');
    console.log('   - role: Оператор');
    console.log('   - status: online');
  } else {
    console.log('\n✅ База данных готова к работе!');
    console.log('Запусти приложение: pnpm dev:web');
  }
}

checkDbState();
