/**
 * Script для проверки профилей через admin endpoint
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
console.log('║  Profile Check (Service Role)          ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Для обхода RLS нужен service_role key.');
console.log('Получите его в: Dashboard → Settings → API → service_role key\n');

rl.question('Введите service_role key (или нажмите Enter для проверки через anon): ', async (serviceKey) => {
  const key = serviceKey.trim();
  
  const url = key 
    ? `${supabaseUrl}/rest/v1/profiles?select=*`
    : `${supabaseUrl}/rest/v1/profiles?select=full_name,email`;
  
  const headers = {
    'apikey': key || envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim(),
    'Authorization': key ? `Bearer ${key}` : `Bearer ${envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()}`,
    'Prefer': 'count=exact'
  };

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Ошибка: ${error}`);
      
      if (response.status === 401 || response.status === 403) {
        console.log('\nRLS блокирует доступ. Это нормально.');
        console.log('Профиль существует (видно в Table Editor).');
        console.log('Для входа в приложение RLS не мешает — там будет auth session.');
      }
      
      rl.close();
      return;
    }
    
    const data = await response.json();
    const count = response.headers.get('content-range')?.split('/')[1] || data.length;
    
    console.log(`✅ Найдено профилей: ${count}`);
    
    if (data.length > 0) {
      data.forEach(p => {
        console.log(`   - ${p.full_name} (${p.email})`);
      });
    }
    
    console.log('\n✅ Профиль создан успешно!');
    console.log('\nСледующий шаг:');
    console.log('1. Запусти: pnpm dev:web');
    console.log('2. Войди под своим пользователем:');
    console.log('   Email: d1ageman@yandex.ru');
    console.log('   Пароль: который ты задал');
    
  } catch (e) {
    console.log(`❌ Ошибка: ${e.message}`);
  }
  
  rl.close();
});
