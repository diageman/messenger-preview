/**
 * Pair-specific bug forensic audit
 * Compares broken pair vs working pair
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

async function forensicAudit() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  PAIR-SPECIFIC BUG FORENSIC AUDIT      ║');
  console.log('╚════════════════════════════════════════╝\n');

  const brokenPair = {
    userA: 'demo1@mail.ru',
    userB: 'd1ageman@yandex.ru',
  };

  // 1. Find user profiles
  console.log('1. USER PROFILES');
  console.log('═══════════════════════════════════════');
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, organization_id, status')
    .in('email', [brokenPair.userA, brokenPair.userB]);

  if (profilesError) {
    console.log(`❌ Error: ${profilesError.message}`);
    return;
  }

  if (profiles.length === 0) {
    console.log('❌ No profiles found for this pair');
    return;
  }

  profiles.forEach(p => {
    console.log(`✅ ${p.email}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Name: ${p.full_name}`);
    console.log(`   Role: ${p.role}`);
    console.log(`   Org: ${p.organization_id}`);
    console.log(`   Status: ${p.status}`);
  });

  // 2. Find direct chats for this pair
  console.log('\n2. DIRECT CHATS');
  console.log('═══════════════════════════════════════');
  
  const userIds = profiles.map(p => p.id);
  
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select(`
      *,
      chat_members (
        user_id,
        role,
        profiles:user_id (
          email,
          full_name
        )
      )
    `)
    .eq('type', 'direct')
    .in('direct_chat_key', userIds.map(id => userIds.map(uid => `${id}_${uid}`).join('_')).flat());

  if (chatsError) {
    console.log(`❌ Error: ${chatsError.message}`);
  } else if (!chats || chats.length === 0) {
    console.log('❌ No direct chats found for this pair');
    console.log('   This is likely the root cause!');
  } else {
    chats.forEach(c => {
      console.log(`✅ Chat: ${c.id}`);
      console.log(`   Type: ${c.type}`);
      console.log(`   Key: ${c.direct_chat_key}`);
      console.log(`   Created by: ${c.created_by}`);
      console.log(`   Members: ${c.chat_members?.length || 0}`);
      c.chat_members?.forEach(m => {
        console.log(`   - ${m.profiles?.email} (${m.role})`);
      });
    });
  }

  // 3. Check messages
  console.log('\n3. MESSAGES');
  console.log('═══════════════════════════════════════');
  
  if (chats && chats.length > 0) {
    const chatIds = chats.map(c => c.id);
    
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          email,
          full_name
        )
      `)
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (messagesError) {
      console.log(`❌ Error: ${messagesError.message}`);
    } else if (!messages || messages.length === 0) {
      console.log('⚠️  No messages found in these chats');
    } else {
      console.log(`✅ Found ${messages.length} messages`);
      messages.slice(0, 5).forEach(m => {
        console.log(`   [${new Date(m.created_at).toLocaleString()}] ${m.sender?.email}: ${m.content?.substring(0, 50)}`);
      });
    }
  }

  // 4. Check for duplicates
  console.log('\n4. DUPLICATE CHATS CHECK');
  console.log('═══════════════════════════════════════');
  
  // Generate expected direct_chat_key
  const sortedIds = [...userIds].sort().join('_');
  console.log(`Expected direct_chat_key: ${sortedIds}`);
  
  const { data: allChats, error: allChatsError } = await supabase
    .from('chats')
    .select('id, direct_chat_key, created_at')
    .eq('type', 'direct')
    .eq('direct_chat_key', sortedIds);

  if (allChatsError) {
    console.log(`❌ Error: ${allChatsError.message}`);
  } else if (!allChats || allChats.length === 0) {
    console.log('✅ No duplicate chats found');
  } else if (allChats.length === 1) {
    console.log(`✅ Single chat found: ${allChats[0].id}`);
  } else {
    console.log(`❌ DUPLICATE CHATS FOUND: ${allChats.length}`);
    allChats.forEach(c => {
      console.log(`   - ${c.id} (created: ${new Date(c.created_at).toLocaleString()})`);
    });
    console.log('   This could cause visibility issues!');
  }

  // 5. Find working pair for comparison
  console.log('\n5. WORKING PAIR (COMPARISON)');
  console.log('═══════════════════════════════════════');
  
  const { data: workingChats, error: workingChatsError } = await supabase
    .from('chats')
    .select(`
      id,
      direct_chat_key,
      chat_members (
        user_id,
        profiles:user_id (
          email
        )
      ),
      messages (
        id
      )
    `)
    .eq('type', 'direct')
    .not('direct_chat_key', 'is', null);

  if (workingChatsError) {
    console.log(`❌ Error: ${workingChatsError.message}`);
  } else {
    const workingPairs = workingChats
      .filter(c => c.messages && c.messages.length > 0)
      .slice(0, 3);

    if (workingPairs.length === 0) {
      console.log('⚠️  No working pairs found for comparison');
    } else {
      workingPairs.forEach(c => {
        const emails = c.chat_members?.map(m => m.profiles?.email).join(', ') || 'unknown';
        console.log(`✅ Working: ${c.id}`);
        console.log(`   Users: ${emails}`);
        console.log(`   Messages: ${c.messages.length}`);
      });
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Audit complete.');
}

forensicAudit();
