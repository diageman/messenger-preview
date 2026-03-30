/**
 * Проверка данных через service_role key (обходит RLS)
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
console.log('║  DATA CHECK (service_role - bypass RLS) ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Введите service_role key для обхода RLS:');
console.log('(Dashboard → Settings → API → service_role key)\n');

rl.question('service_role key: ', async (key) => {
  rl.close();
  
  if (!key || key.trim() === '') {
    console.log('\n❌ Ключ не предоставлен');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, key.trim());

  console.log('\n📊 ПРОВЕРКА ДАННЫХ (с bypass RLS):\n');

  const tables = {
    'organizations': ['id', 'name', 'slug'],
    'profiles': ['id', 'full_name', 'email', 'role', 'organization_id'],
    'departments': ['id', 'name', 'organization_id']
  };

  for (const [table, columns] of Object.entries(tables)) {
    console.log(`📁 ${table}:`);
    
    const { data, error } = await supabase
      .from(table)
      .select(columns.join(','));

    if (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ ${data.length} rows:`);
      data.forEach(row => {
        console.log(`      ${JSON.stringify(row)}`);
      });
    } else {
      console.log(`   ❌ ПУСТО (0 rows)`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('Проверка завершена.');
});
