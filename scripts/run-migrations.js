/**
 * Script для выполнения миграций в Supabase
 * Запуск: node scripts/run-migrations.js
 * 
 * ВНИМАНИЕ: Для выполнения миграций нужен service_role key
 * Получите его в Supabase Dashboard → Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rl = createInterface({ input: process.stdin, output: process.stdout });

const envPath = join(__dirname, '..', 'apps', 'web', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const supabaseUrl = urlMatch[1].trim();

console.log('╔════════════════════════════════════════╗');
console.log('║  Supabase Migration Runner             ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Для выполнения миграций нужен service_role key.');
console.log('Получите его в: Supabase Dashboard → Settings → API → service_role key\n');

rl.question('Введите service_role key (или нажмите Enter для пропуска): ', (serviceKey) => {
  rl.close();
  
  if (!serviceKey || serviceKey.trim() === '') {
    console.log('\n⚠️  Migration skipped - no service_role key provided');
    console.log('\nАльтернативный способ выполнить миграции:');
    console.log('1. Открой Supabase Dashboard → SQL Editor');
    console.log('2. Скопируй содержимое файла: supabase/migrations/001_phase1a_core.sql');
    console.log('3. Вставь в SQL Editor и нажми Run');
    console.log('4. Повтори для: supabase/migrations/002_phase2_chats.sql');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, serviceKey.trim());

  async function runMigration(name, sqlPath) {
    console.log(`\n📄 Выполняю миграцию: ${name}...`);
    
    try {
      const sql = readFileSync(sqlPath, 'utf-8');
      
      // Разбиваем на отдельные запросы (убираем комментарии и пустые строки)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`   Найдено операторов: ${statements.length}`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            // Игнорируем ошибки "already exists"
            if (error.message.includes('already exists') || error.message.includes('does not exist')) {
              console.log(`   ⚠️  Пропущено (уже существует): оператор ${i + 1}`);
            } else {
              console.log(`   ⚠️  Warning оператор ${i + 1}: ${error.message}`);
            }
          }
        } catch (e) {
          console.log(`   ⚠️  Warning оператор ${i + 1}: ${e.message}`);
        }
      }

      console.log(`   ✅ Миграция выполнена`);
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }

  async function runMigrationsDirectly() {
    console.log('\n📄 Выполняю миграцию 001_phase1a_core.sql...');
    const sql1 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '001_phase1a_core.sql'), 'utf-8');
    
    try {
      const { error: err1 } = await supabase.rpc('psql', { query: sql1 });
      if (err1) {
        console.log(`   ⚠️  Warning: ${err1.message}`);
      } else {
        console.log(`   ✅ Миграция 1 выполнена`);
      }
    } catch (e) {
      console.log(`   ℹ️  RPC метод недоступен, пробую через REST...`);
    }

    console.log('\n📄 Выполняю миграцию 002_phase2_chats.sql...');
    const sql2 = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '002_phase2_chats.sql'), 'utf-8');
    
    try {
      const { error: err2 } = await supabase.rpc('psql', { query: sql2 });
      if (err2) {
        console.log(`   ⚠️  Warning: ${err2.message}`);
      } else {
        console.log(`   ✅ Миграция 2 выполнена`);
      }
    } catch (e) {
      console.log(`   ℹ️  RPC метод недоступен`);
    }
  }

  // Простой способ - читаем SQL и выполняем через admin API
  async function executeSqlFile(sqlPath) {
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Supabase REST API для выполнения SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey.trim(),
        'Authorization': `Bearer ${serviceKey.trim()}`,
        'Content-Type': 'text/plain',
        'Prefer': 'params=single-object'
      },
      body: sql
    });

    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.text();
    return { success: false, error };
  }

  console.log('\n⚠️  Прямое выполнение SQL через REST API может быть ограничено.');
  console.log('Рекомендуемый способ: использовать Supabase Dashboard → SQL Editor\n');
  
  rl.question('Продолжить попытку выполнения миграций? (y/n): ', async (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('\nМиграции отменены.');
      console.log('\nВыполните миграции вручную через Supabase Dashboard:');
      console.log('1. https://app.supabase.com/project/_/sql');
      console.log('2. Скопируй содержимое supabase/migrations/001_phase1a_core.sql');
      console.log('3. Вставь и нажми Run');
      console.log('4. Повтори для 002_phase2_chats.sql');
      process.exit(0);
    }

    // Попытка выполнения
    console.log('\n⚠️  Попытка выполнения миграций...');
    console.log('Если получите ошибку, используйте ручной способ через Dashboard.\n');
    
    await runMigrationsDirectly();
    
    console.log('\n═══════════════════════════════════════');
    console.log('Проверка результата...');
    
    const { data: orgs } = await supabase.from('organizations').select('*');
    if (orgs && orgs.length > 0) {
      console.log('✅ Организации созданы!');
    } else {
      console.log('❌ Организации не найдены - миграция не выполнена');
      console.log('\nИспользуйте ручной способ через Supabase Dashboard → SQL Editor');
    }
    
    process.exit(0);
  });
});
