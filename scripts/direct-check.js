/**
 * Прямая проверка таблиц через REST API
 */

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

async function checkTables() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Direct Table Check                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  const tables = [
    'organizations',
    'profiles', 
    'departments',
    'chats',
    'chat_members',
    'messages',
    'chat_reads',
    'attachments',
    'archived_chats'
  ];

  for (const table of tables) {
    try {
      // Пробуем получить доступ к таблице через REST API
      const url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=0`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });

      if (response.ok) {
        const count = response.headers.get('content-range')?.split('/')[1] || '0';
        console.log(`✅ ${table} - существует (записей: ${count})`);
      } else if (response.status === 404) {
        console.log(`❌ ${table} - не существует`);
      } else if (response.status === 401 || response.status === 403) {
        // RLS блокирует, но таблица существует
        const errorText = await response.text();
        if (errorText.includes('not found') || errorText.includes('does not exist')) {
          console.log(`❌ ${table} - не существует`);
        } else {
          console.log(`✅ ${table} - существует (RLS блокирует)`);
        }
      } else {
        const error = await response.text();
        console.log(`⚠️  ${table} - ${response.status}: ${error.substring(0, 50)}`);
      }
    } catch (e) {
      console.log(`❌ ${table} - ошибка: ${e.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
}

checkTables();
