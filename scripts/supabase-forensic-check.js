/**
 * Supabase forensic check - verify data integrity
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

async function forensicCheck() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  SUPABASE FORENSIC CHECK               ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Check profiles
  console.log('1. PROFILES CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, organization_id');

  if (profilesError) {
    console.log(`❌ Error: ${profilesError.message}`);
  } else {
    console.log(`✅ Found ${profiles?.length || 0} profiles`);
    profiles?.forEach(p => {
      console.log(`   - ${p.email} (${p.full_name})`);
    });
  }

  // 2. Check chats
  console.log('\n2. CHATS CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('id, type, direct_chat_key, created_at');

  if (chatsError) {
    console.log(`❌ Error: ${chatsError.message}`);
  } else {
    console.log(`✅ Found ${chats?.length || 0} chats`);
    chats?.forEach(c => {
      console.log(`   - ${c.type}: ${c.id.substring(0, 8)}...`);
    });
  }

  // 3. Check messages
  console.log('\n3. MESSAGES CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (messagesError) {
    console.log(`❌ Error: ${messagesError.message}`);
  } else {
    console.log(`✅ Found ${messages?.length || 0} messages`);
    messages?.forEach(m => {
      console.log(`   - [${new Date(m.created_at).toLocaleTimeString()}] ${m.content?.substring(0, 50)}`);
    });
  }

  // 4. Check RLS policies
  console.log('\n4. RLS POLICIES CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd')
    .in('tablename', ['chats', 'chat_members', 'messages']);

  if (policiesError) {
    console.log(`❌ Error: ${policiesError.message}`);
  } else {
    console.log(`✅ Found ${policies?.length || 0} policies`);
    policies?.forEach(p => {
      console.log(`   - ${p.tablename}.${p.policyname} (${p.cmd})`);
    });
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Check complete.');
}

forensicCheck();
