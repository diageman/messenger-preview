/**
 * Backend Flow Verification Script
 * Проверяет критичные настройки Supabase для работы MVP
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

async function verifyBackendFlow() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  BACKEND FLOW VERIFICATION             ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Проверка организации
  console.log('1. ORGANIZATION CHECK');
  console.log('═══════════════════════════════════════');
  const { data: orgs } = await supabase.from('organizations').select('id, name, slug');
  if (orgs && orgs.length > 0) {
    console.log(`   ✅ Organization exists: ${orgs[0].name}`);
    console.log(`      ID: ${orgs[0].id}`);
  } else {
    console.log('   ❌ Organization NOT found');
    console.log('      Run: INSERT INTO organizations ...');
  }

  // 2. Проверка профилей
  console.log('\n2. PROFILES CHECK');
  console.log('═══════════════════════════════════════');
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, organization_id');
  if (profiles && profiles.length > 0) {
    console.log(`   ✅ Found ${profiles.length} profile(s):`);
    profiles.forEach(p => {
      console.log(`      - ${p.full_name} (${p.email})`);
    });
  } else {
    console.log('   ❌ No profiles found');
    console.log('      Signup flow will create profile automatically');
  }

  // 3. Проверка realtime publication
  console.log('\n3. REALTIME PUBLICATION CHECK');
  console.log('═══════════════════════════════════════');
  const { data: pubTables, error: pubError } = await supabase
    .from('pg_publication_tables')
    .select('tablename')
    .eq('pubname', 'supabase_realtime');

  if (pubError) {
    console.log('   ⚠️  Cannot check publication (need superuser)');
    console.log('      Check manually in Supabase Dashboard:');
    console.log('      Database → Replication → Source');
  } else if (pubTables && pubTables.length > 0) {
    const tableNames = pubTables.map(t => t.tablename);
    const requiredTables = ['messages', 'chats', 'chat_members'];
    console.log('   ✅ Realtime publication tables:', tableNames.length);
    
    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`      ✅ ${table}`);
      } else {
        console.log(`      ❌ ${table} NOT IN PUBLICATION`);
        console.log(`         Run: ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`);
      }
    });
  } else {
    console.log('   ❌ No tables in realtime publication');
    console.log('      Add tables via Dashboard or SQL:');
    console.log('      ALTER PUBLICATION supabase_realtime ADD TABLE messages;');
  }

  // 4. Проверка RLS policies
  console.log('\n4. RLS POLICIES CHECK');
  console.log('═══════════════════════════════════════');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd')
    .in('tablename', ['messages', 'chats', 'chat_members', 'profiles']);

  if (policies && policies.length > 0) {
    const policyByTable = {};
    policies.forEach(p => {
      if (!policyByTable[p.tablename]) policyByTable[p.tablename] = [];
      policyByTable[p.tablename].push(`${p.policyname} (${p.cmd})`);
    });
    
    Object.entries(policyByTable).forEach(([table, pols]) => {
      console.log(`   ✅ ${table}: ${pols.length} policies`);
    });
  } else {
    console.log('   ⚠️  No policies found (or no access)');
  }

  // 5. Проверка chat_reads
  console.log('\n5. CHAT_READS CHECK');
  console.log('═══════════════════════════════════════');
  const { data: chatReads } = await supabase.from('chat_reads').select('*').limit(5);
  if (chatReads !== undefined) {
    console.log(`   ✅ chat_reads table exists (${chatReads.length} rows)`);
  } else {
    console.log('   ❌ chat_reads table NOT accessible');
  }

  // 6. MVP Flow Status
  console.log('\n6. MVP FLOW STATUS');
  console.log('═══════════════════════════════════════');
  
  const checks = {
    'Organization exists': orgs && orgs.length > 0,
    'Profiles accessible': profiles && profiles.length > 0,
    'Realtime enabled': pubTables && pubTables.length > 0,
    'RLS policies exist': policies && policies.length > 0,
    'chat_reads table': chatReads !== undefined,
  };

  let allPassed = true;
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('\n═══════════════════════════════════════');
  if (allPassed) {
    console.log('   ✅ ALL BACKEND FLOWS READY FOR MVP');
  } else {
    console.log('   ⚠️  SOME CHECKS FAILED — SEE ABOVE');
  }
}

verifyBackendFlow();
