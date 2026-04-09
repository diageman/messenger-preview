/**
 * Проверяет применён ли REPLICA IDENTITY FULL для message_reactions
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

  // Логин как service_role (anon не может читать pg_class)
  // Пробуем через RPC или raw query
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'diage2x@gmail.com', password: 'G7Ws7QnB'
  });
  console.log('👤 Logged in as:', authData.user.id);

  // Проверяем REPLICA IDENTITY через information_schema или pg_class
  // Anon не имеет доступа к pg_class — проверяем косвенно
  
  console.log('\n🔍 Тест: вставляем реакцию и проверяем payload DELETE...');
  
  // Подписка
  const channel = supabase
    .channel('replica-test')
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'message_reactions' },
      (payload) => {
        console.log('\n📥 DELETE event received:');
        console.log('   payload.old:', JSON.stringify(payload.old, null, 2));
        console.log('   Has message_id:', !!payload.old?.message_id);
        console.log('   Has emoji:', !!payload.old?.emoji);
        console.log('   Has user_id:', !!payload.old?.user_id);
      }
    )
    .subscribe((status) => {
      console.log('📡 Status:', status);
    });

  await new Promise(r => setTimeout(r, 1500));

  // Находим сообщение из СВОЕГО чата
  const { data: memberChats } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', authData.user.id);
  
  if (!memberChats?.length) { console.error('❌ No member chats'); return; }
  const memberChatId = memberChats[0].chat_id;
  console.log('📂 Member chat:', memberChatId);

  const { data: msgs } = await supabase
    .from('messages')
    .select('id, chat_id')
    .eq('chat_id', memberChatId)
    .limit(1);
  
  if (!msgs?.length) { console.error('❌ No messages in member chat'); return; }
  const messageId = msgs[0].id;
  const userId = authData.user.id;

  // Вставляем реакцию
  console.log('\n📝 Inserting reaction...');
  const { data: inserted, error: insErr } = await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: userId, emoji: '🔬' },
      { onConflict: 'message_id,user_id,emoji' })
    .select().single();

  if (insErr) { console.error('❌ Insert error:', insErr); return; }
  console.log('✅ Inserted:', inserted.id);

  await new Promise(r => setTimeout(r, 1000));

  // Удаляем
  console.log('\n🗑 Deleting reaction...');
  const { error: delErr } = await supabase
    .from('message_reactions')
    .delete()
    .eq('id', inserted.id);

  if (delErr) { console.error('❌ Delete error:', delErr); return; }
  console.log('✅ Deleted');

  // Ждём DELETE event
  await new Promise(r => setTimeout(r, 5000));

  await supabase.removeChannel(channel);

  console.log('\n🏁 Результат:');
  console.log('Если payload.old содержит message_id, emoji, user_id → REPLICA IDENTITY FULL работает ✅');
  console.log('Если payload.old содержит ТОЛЬКО id → REPLICA IDENTITY FULL НЕ применён ❌');
  console.log('\nЧто делать если НЕ применён:');
  console.log('1. Открыть Supabase Dashboard → SQL Editor');
  console.log('2. Выполнить:');
  console.log('   ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;');
  console.log('3. Или запустить: supabase db push');
}

main().catch(console.error);
