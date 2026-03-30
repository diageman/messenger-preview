/**
 * Script для детальной проверки схемы БД
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

async function checkSchema() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Database Schema Check                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Проверка существования таблиц через системное представление
  const { data: tableList, error: listError } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');

  const existingTables = new Set(tableList?.map(t => t.tablename) || []);

  // Проверка всех таблиц из миграций
  const tables = {
    'Phase 1A': ['organizations', 'profiles', 'departments', 'department_members', 'user_settings', 'user_presence'],
    'Phase 2': ['chats', 'chat_members', 'messages', 'chat_reads', 'attachments', 'archived_chats']
  };

  for (const [phase, tableList] of Object.entries(tables)) {
    console.log(`📁 ${phase}:`);
    
    for (const table of tableList) {
      if (existingTables.has(table)) {
        // Таблица существует, пробуем получить count
        try {
          const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          
          if (error && error.code === 'PGRST301') {
            console.log(`   ✅ ${table} - существует (RLS блокирует чтение)`);
          } else if (error) {
            console.log(`   ⚠️  ${table} - ${error.message}`);
          } else {
            console.log(`   ✅ ${table} - записей: ${data?.length || 0}`);
          }
        } catch (e) {
          console.log(`   ✅ ${table} - существует (ошибка чтения: ${e.message})`);
        }
      } else {
        console.log(`   ❌ ${table} - не существует`);
      }
    }
    console.log('');
  }

  // Проверка функций
  console.log('🔧 Функции:');
  const { data: functions } = await supabase
    .from('pg_proc')
    .select('proname')
    .in('proname', ['create_direct_chat', 'current_user_organization', 'update_updated_at_column']);
  
  if (functions && functions.length > 0) {
    console.log(`   ✅ Найдено функций: ${functions.length}`);
    functions.forEach(f => console.log(`      - ${f.proname}`));
  } else {
    console.log('   ℹ️  Функции не найдены (или нет доступа)');
  }

  console.log('\n═══════════════════════════════════════');
}

checkSchema();
