/**
 * Diagnostic script для проверки direct chat creation
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

console.log('╔════════════════════════════════════════╗');
console.log('║  Direct Chat Diagnostic                ║');
console.log('╚════════════════════════════════════════╝\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  // 1. Проверка профилей
  console.log('1. PROFILES CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, organization_id');

  if (profilesError) {
    console.log('   ❌ Error: ' + profilesError.message);
  } else if (profiles && profiles.length > 0) {
    console.log('   ✅ Found ' + profiles.length + ' profile(s):');
    profiles.forEach(function(p) {
      console.log('      - ' + p.full_name + ' (' + p.email + ')');
      console.log('        ID: ' + p.id);
      console.log('        Org: ' + p.organization_id);
    });
  } else {
    console.log('   ❌ No profiles found');
  }

  // 2. Проверка организации
  console.log('\n2. ORGANIZATION CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: orgs } = await supabase.from('organizations').select('*');
  if (orgs && orgs.length > 0) {
    console.log('   ✅ Found ' + orgs.length + ' organization(s):');
    orgs.forEach(function(o) {
      console.log('      - ' + o.name + ' (' + o.slug + ')');
      console.log('        ID: ' + o.id);
    });
  } else {
    console.log('   ❌ No organizations found');
  }

  // 3. Проверка существующих чатов
  console.log('\n3. CHATS CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*, chat_members(user_id, profiles(user_id, full_name, email))');

  if (chatsError) {
    console.log('   ❌ Error: ' + chatsError.message);
  } else if (chats && chats.length > 0) {
    console.log('   ✅ Found ' + chats.length + ' chat(s):');
    chats.forEach(function(c) {
      console.log('      - ' + (c.name || 'Direct') + ' (' + c.type + ')');
      console.log('        ID: ' + c.id);
      console.log('        Key: ' + (c.direct_chat_key || 'N/A'));
      console.log('        Members:');
      if (c.chat_members) {
        c.chat_members.forEach(function(m) {
          console.log('          - ' + (m.profiles?.full_name || m.user_id));
        });
      }
    });
  } else {
    console.log('   ℹ️  No chats found (this is OK if none created yet)');
  }

  // 4. Проверка функции
  console.log('\n4. FUNCTION CHECK');
  console.log('═══════════════════════════════════════');
  
  console.log('   Testing create_direct_chat RPC...');
  console.log('   Note: This requires 2 profiles in same organization');
  
  if (profiles && profiles.length >= 2) {
    const user1 = profiles[0];
    const user2 = profiles[1];
    
    console.log('   User 1: ' + user1.full_name + ' (' + user1.id + ')');
    console.log('   User 2: ' + user2.full_name + ' (' + user2.id + ')');
    console.log('   Org: ' + user1.organization_id);
    
    const { data: chatId, error: rpcError } = await supabase.rpc('create_direct_chat', {
      p_org_id: user1.organization_id,
      p_user1_id: user1.id,
      p_user2_id: user2.id,
    });

    if (rpcError) {
      console.log('   ❌ RPC Error: ' + rpcError.code);
      console.log('      Message: ' + rpcError.message);
      console.log('      Details: ' + (rpcError.details || 'N/A'));
      console.log('      Hint: ' + (rpcError.hint || 'N/A'));
    } else {
      console.log('   ✅ RPC Success!');
      console.log('      Chat ID: ' + chatId);
      
      // Verify chat was created
      const { data: verifyChat } = await supabase
        .from('chats')
        .select('*, chat_members(user_id)')
        .eq('id', chatId)
        .single();
      
      if (verifyChat) {
        console.log('      Chat exists: ' + verifyChat.type);
        console.log('      Members: ' + (verifyChat.chat_members?.length || 0));
      }
    }
  } else {
    console.log('   ⚠️  Need at least 2 profiles to test RPC');
    console.log('   Create another user profile first.');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Diagnostic complete.');
}

diagnose();
