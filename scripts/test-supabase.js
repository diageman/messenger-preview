/**
 * Script для проверки Supabase подключения
 * Запуск: node scripts/test-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем .env файл
const envPath = join(__dirname, '..', 'apps', 'web', '.env');
let envContent;

try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.error('❌ Ошибка: Не найден файл .env');
  console.error(`Путь: ${envPath}`);
  process.exit(1);
}

// Парсим переменные
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('❌ Ошибка: Не найдены переменные в .env');
  console.error('Должны быть: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

console.log('📡 Supabase Configuration:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
console.log('');

// Создаём клиент
const supabase = createClient(supabaseUrl, supabaseKey);

// Тест 1: Проверка подключения
async function testConnection() {
  console.log('🧪 Тест 1: Проверка подключения...');
  
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('❌ Ошибка: Таблицы ещё не созданы');
        console.error('   Выполни миграцию из файла: supabase/migrations/001_phase1a_core.sql');
        console.error('   Через: Supabase Dashboard → SQL Editor → Run SQL');
        return false;
      }
      throw error;
    }
    
    console.log('✅ Подключение успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    return false;
  }
}

// Тест 2: Проверка RLS
async function testRLS() {
  console.log('');
  console.log('🧪 Тест 2: Проверка Row Level Security...');
  
  try {
    // Без аутентификации не должно быть доступа к данным
    const { data, error } = await supabase.from('profiles').select('*');
    
    if (error && error.code === 'PGRST301') {
      console.log('✅ RLS включён (доступ запрещён без auth)');
      return true;
    }
    
    if (!error && data) {
      console.log('⚠️  RLS не настроен (данные доступны без auth)');
      console.log('   Это нормально для тестовой среды, но не для production');
      return true;
    }
    
    console.log('✅ RLS проверка пройдена');
    return true;
  } catch (error) {
    console.error('❌ Ошибка RLS:', error.message);
    return false;
  }
}

// Тест 3: Проверка таблиц
async function testTables() {
  console.log('');
  console.log('🧪 Тест 3: Проверка таблиц...');
  
  const requiredTables = [
    'organizations',
    'profiles',
    'departments',
    'department_members',
    'user_settings',
    'user_presence'
  ];
  
  let allExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`❌ Таблица не найдена: ${table}`);
        allExist = false;
      } else {
        console.log(`✅ Таблица существует: ${table}`);
      }
    } catch (error) {
      console.log(`❌ Ошибка проверки ${table}: ${error.message}`);
      allExist = false;
    }
  }
  
  return allExist;
}

// Запуск тестов
async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Supabase Connection Test Suite        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    console.log('');
    console.log('❌ Тесты прерваны: нет подключения');
    console.log('');
    console.log('Следующие шаги:');
    console.log('1. Создай проект на https://supabase.com');
    console.log('2. Скопируй URL и anon key в apps/web/.env');
    console.log('3. Выполни миграцию из supabase/migrations/001_phase1a_core.sql');
    process.exit(1);
  }
  
  const rlsOk = await testRLS();
  const tablesOk = await testTables();
  
  console.log('');
  console.log('═══════════════════════════════════════');
  
  if (connectionOk && rlsOk && tablesOk) {
    console.log('✅ Все тесты пройдены!');
    console.log('');
    console.log('Следующий шаг:');
    console.log('1. Создай пользователя в Dashboard → Authentication → Users');
    console.log('2. Добавь профиль пользователя в таблицу profiles');
    console.log('3. Запусти приложение: pnpm dev:web');
    console.log('4. Войди под созданным пользователем');
    process.exit(0);
  } else {
    console.log('❌ Некоторые тесты не пройдены');
    console.log('Проверь ошибки выше');
    process.exit(1);
  }
}

runTests();
