/**
 * Fix missing profiles for specific users
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

async function fixProfiles() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  FIX MISSING PROFILES                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const users = [
    {
      email: 'demo1@mail.ru',
      fullName: 'Demo User 1',
      role: 'Сотрудник',
    },
    {
      email: 'd1ageman@yandex.ru',
      fullName: 'Dmitry Cherevko',
      role: 'Руководитель группы 1',
    },
  ];

  const orgId = '00000000-0000-0000-0000-000000000001';

  for (const user of users) {
    console.log(`Processing: ${user.email}`);
    
    // 1. Find auth user
    const { data: authData, error: authError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', user.email)
      .single();

    if (authData) {
      console.log(`✅ Profile already exists: ${authData.id}`);
      continue;
    }

    console.log(`⚠️  Profile not found, need to check auth.users`);
    console.log(`   NOTE: Cannot query auth.users directly with anon key`);
    console.log(`   ACTION NEEDED: Run this SQL in Supabase Dashboard:`);
    console.log('');
    console.log('```sql');
    console.log(`-- Find auth user ID for ${user.email}`);
    console.log('SELECT id, email FROM auth.users');
    console.log(`WHERE email = '${user.email}';`);
    console.log('');
    console.log('-- Then create profile');
    console.log('INSERT INTO profiles (id, organization_id, full_name, role, email, status)');
    console.log('VALUES (');
    console.log('  \'AUTH_USER_ID_FROM_QUERY\',  -- Replace with actual ID');
    console.log(`  '${orgId}',`);
    console.log(`  '${user.fullName}',`);
    console.log(`  '${user.role}',`);
    console.log(`  '${user.email}',`);
    console.log(`  'online'`);
    console.log(');');
    console.log('```\n');
  }

  console.log('═══════════════════════════════════════');
  console.log('Manual SQL required - see above.');
}

fixProfiles();
