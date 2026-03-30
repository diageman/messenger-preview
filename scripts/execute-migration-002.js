/**
 * Script для выполнения SQL миграции через Supabase Admin API
 * Запуск: node scripts/execute-migration-002.js
 */

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
console.log('║  Migration 002 Executor                ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Обнаружено: таблицы Phase 2 (chats, messages) не созданы');
console.log('Нужно выполнить миграцию: 002_phase2_chats.sql\n');

console.log('Для выполнения миграции нужен service_role key.');
console.log('Получите его в: Supabase Dashboard → Settings → API → service_role key');
console.log('(ключ начинается на eyJ...)\n');

rl.question('Введите service_role key: ', async (serviceKey) => {
  rl.close();
  
  if (!serviceKey || serviceKey.trim() === '') {
    console.log('\n❌ Ключ не предоставлен');
    console.log('\nАльтернативный способ:');
    console.log('1. Открой https://app.supabase.com/project/_/sql');
    console.log('2. Скопируй содержимое файла: supabase/migrations/002_phase2_chats.sql');
    console.log('3. Вставь в SQL Editor и нажми Run');
    process.exit(1);
  }

  const key = serviceKey.trim();
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '002_phase2_chats.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('\n📄 Читаю миграцию 002_phase2_chats.sql...');
  console.log(`   Размер: ${sql.length} байт`);

  // Разбиваем SQL на отдельные утверждения
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT ON'));

  console.log(`   Найдено операторов: ${statements.length}\n`);

  console.log('🔄 Выполняю миграцию...\n');

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const statementNum = i + 1;
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'text/plain',
          'Prefer': 'params=single-object'
        },
        body: statement
      });

      if (response.ok) {
        console.log(`   ✅ Оператор ${statementNum}/${statements.length}`);
        success++;
      } else {
        const errorText = await response.text();
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          console.log(`   ⚠️  Оператор ${statementNum}: уже существует (пропущено)`);
          skipped++;
        } else if (errorText.includes('does not exist')) {
          console.log(`   ⚠️  Оператор ${statementNum}: объект не найден (пропущено)`);
          skipped++;
        } else {
          console.log(`   ❌ Оператор ${statementNum}: ${errorText.substring(0, 100)}`);
          errors++;
        }
      }
    } catch (e) {
      console.log(`   ❌ Оператор ${statementNum}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Успешно: ${success}`);
  console.log(`⚠️  Пропущено: ${skipped}`);
  console.log(`❌ Ошибки: ${errors}`);
  console.log('═══════════════════════════════════════\n');

  if (errors === 0 || errors < statements.length * 0.1) {
    console.log('✅ Миграция в основном выполнена!\n');
    console.log('Следующий шаг:');
    console.log('1. Запусти: node scripts/check-schema.js (проверка)');
    console.log('2. Запусти: node scripts/check-db-state.js (данные)');
    console.log('3. Создай пользователя в Dashboard → Authentication → Users');
    console.log('4. Добавь профиль в таблицу profiles');
  } else {
    console.log('⚠️  Миграция выполнена с ошибками');
    console.log('Попробуйте ручной способ через Supabase Dashboard → SQL Editor');
  }

  process.exit(0);
});
