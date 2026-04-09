/**
 * Диагностика RLS для реакций
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Логин
  const { data: authA } = await supabase.auth.signInWithPassword({
    email: 'diage2x@gmail.com', password: 'G7Ws7QnB'
  });
  const userId = authA.user.id;
  console.log('👤 User ID:', userId);

  // 1. Чаты где пользователь участник
  const { data: memberChats } = await supabase
    .from('chat_members')
    .select('chat_id, chat:chats(id, name), user:profiles(full_name)')
    .eq('user_id', userId);
  console.log('\n📋 Чаты где пользователь участник:', memberChats?.length || 0);
  memberChats?.forEach(c => console.log(`  Chat: ${c.chat?.id?.slice(0,8)}...`));

  // 2. Первое сообщение из чата где пользователь НЕ участник
  const { data: allMsgs } = await supabase
    .from('messages')
    .select('id, chat_id, content')
    .limit(5);
  console.log('\n📨 Сообщения:');
  for (const msg of allMsgs || []) {
    const isMember = memberChats?.some(c => c.chat_id === msg.chat_id);
    console.log(`  ${msg.id.slice(0,8)}... | chat: ${msg.chat_id.slice(0,8)}... | member: ${!!isMember} | "${msg.content}"`);
  }

  // 3. Пробуем INSERT в сообщение из чата где пользователь участник
  if (memberChats && memberChats.length > 0) {
    const memberChatId = memberChats[0].chat_id;
    const { data: chatMsgs } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', memberChatId)
      .limit(1);

    if (chatMsgs && chatMsgs.length > 0) {
      console.log('\n🧪 Тест INSERT в сообщение из СВОЕГО чата...');
      const { data, error } = await supabase
        .from('message_reactions')
        .upsert({ message_id: chatMsgs[0].id, user_id: userId, emoji: '🧪' },
          { onConflict: 'message_id,user_id,emoji' })
        .select().single();

      if (error) console.error('❌ RLS error:', error.message);
      else console.log('✅ INSERT успешен! Reaction ID:', data.id);

      // Чистим
      if (data) {
        await supabase.from('message_reactions').delete().eq('id', data.id);
      }
    }
  }

  // 4. Проверяем текущие политики
  console.log('\n📜 RLS Policies (через SQL):');
  const { data: policies } = await supabase.rpc('get_rls_policies', { table_name: 'message_reactions' }).catch(() => ({ data: null }));
  if (!policies) {
    console.log('   RPC не доступен — проверяем через raw SQL...');
    const { data: rawPolicies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'message_reactions');
    
    if (rawPolicies) {
      rawPolicies.forEach(p => {
        console.log(`\n   Policy: ${p.policyname}`);
        console.log(`   Cmd: ${p.cmd}`);
        console.log(`   Qual: ${p.qual?.slice(0, 100)}...`);
      });
    }
  }

  console.log('\n🏁 Диагностика завершена.');
}

main().catch(console.error);
