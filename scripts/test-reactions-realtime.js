/**
 * Проверка: есть ли второй пользователь для теста realtime
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Проверяю пользователей в системе...');

  // Пробуем залогиниться как User A
  const { data: authA, error: authAErr } = await supabase.auth.signInWithPassword({
    email: 'diage2x@gmail.com',
    password: 'G7Ws7QnB'
  });
  if (authAErr) { console.error('❌ User A login failed:', authAErr); return; }
  console.log('✅ User A logged in:', authA.user.id);

  // Ищем всех profiles
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').limit(10);
  console.log('\n👥 Profiles in DB:');
  profiles?.forEach(p => console.log(`  ${p.id.slice(0,8)}... | ${p.full_name} | ${p.email}`));

  // Пробуем найти второго пользователя
  if (profiles && profiles.length >= 2) {
    const otherUser = profiles.find(p => p.email !== 'diage2x@gmail.com');
    if (otherUser) {
      console.log(`\n✅ Найден второй пользователь: ${otherUser.email}`);
      console.log(`   ID: ${otherUser.id}`);
      console.log('\n📝 Для E2E теста с двумя РАЗНЫМИ аккаунтами нужно:');
      console.log('   1. Знать пароль второго пользователя');
      console.log('   2. Или создать нового пользователя');
    } else {
      console.log('\n⚠️ Все профили принадлежат diage2x@gmail.com');
      console.log('   Нужен отдельный аккаунт для теста realtime между пользователями');
    }
  }

  // Тест: вставляем реакцию напрямую и слушаем Realtime
  console.log('\n🎯 Тест Realtime: слушаем события 10 секунд...');
  
  const channel = supabase
    .channel('direct-test')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => {
        console.log('\n📥 REALTIME EVENT:', payload.eventType);
        console.log('   new:', payload.new);
        console.log('   old:', payload.old);
      }
    )
    .subscribe((status) => {
      console.log('📡 Channel status:', status);
    });

  // Ждём подписку
  await new Promise(r => setTimeout(r, 1500));

  // Получаем первое сообщение
  const { data: chats } = await supabase.from('chats').select('id').limit(1);
  if (!chats || chats.length === 0) { console.error('❌ No chats'); return; }
  const { data: msgs } = await supabase.from('messages').select('id, chat_id').limit(1);
  if (!msgs || msgs.length === 0) { console.error('❌ No messages'); return; }
  const messageId = msgs[0].id;
  const userId = authA.user.id;

  console.log('\n📝 Вставляем реакцию...');
  const { data: inserted, error: insErr } = await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: userId, emoji: '🧪' },
      { onConflict: 'message_id,user_id,emoji' })
    .select().single();

  if (insErr) console.error('❌ Insert error:', insErr);
  else console.log('✅ Inserted:', inserted);

  // Ждём SSE event
  await new Promise(r => setTimeout(r, 5000));

  // Удаляем
  if (inserted) {
    console.log('\n🗑 Deleting reaction...');
    const { error: delErr } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', inserted.id);
    
    if (delErr) console.error('❌ Delete error:', delErr);
    else console.log('✅ Deleted');

    await new Promise(r => setTimeout(r, 5000));
  }

  await supabase.removeChannel(channel);
  console.log('\n🏁 Тест завершён.');
  console.log('Если вы видите REALTIME EVENT выше — Supabase Realtime РАБОТАЕТ.');
  console.log('Если НЕТ — проблема в публикации или REPLICA IDENTITY.');
}

main().catch(console.error);
