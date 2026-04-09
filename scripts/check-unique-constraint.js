/**
 * Проверка UNIQUE constraint на message_reactions
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
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'diage2x@gmail.com', password: 'G7Ws7QnB'
  });
  console.log('👤 User:', authData.user.id.slice(0, 8) + '...');

  // 1. Проверяем UNIQUE constraint — пробуем вставить ДУБЛИКАТ
  const { data: chats } = await supabase.from('chat_members').select('chat_id').eq('user_id', authData.user.id).limit(1);
  if (!chats?.length) { console.error('❌ No member chats'); return; }
  const { data: msgs } = await supabase.from('messages').select('id').eq('chat_id', chats[0].chat_id).limit(1);
  if (!msgs?.length) { console.error('❌ No messages'); return; }
  const messageId = msgs[0].id;
  const userId = authData.user.id;

  console.log('\n🧪 Тест UNIQUE constraint: вставляем ДВЕ одинаковые реакции...');

  // Первая вставка
  const { data: r1, error: e1 } = await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: userId, emoji: '🧪' }, { onConflict: 'message_id,user_id,emoji' })
    .select().single();

  if (e1) console.error('❌ First insert failed:', e1);
  else console.log('✅ First insert:', r1.id);

  // Вторая вставка (та же самая)
  const { data: r2, error: e2 } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji: '🧪' });

  if (e2) console.log('✅ Second insert BLOCKED:', e2.message);
  else console.log('❌ Second insert SUCCEEDED — дубли разрешены!', r2);

  // Проверяем сколько записей с этим emoji
  const { data: allReactions } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji')
    .eq('message_id', messageId)
    .eq('emoji', '🧪');

  console.log('\n📊 Всего записей с emoji 🧪:', allReactions?.length || 0);
  allReactions?.forEach(r => console.log(`  ${r.id.slice(0,8)}... | user: ${r.user_id.slice(0,8)}...`));

  // Чистим
  if (allReactions?.length) {
    await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('emoji', '🧪');
  }

  // 2. Проверяем индексы
  console.log('\n📋 Текущие записи реакций в этом чате:');
  const { data: chatReactions } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji')
    .eq('message_id', messageId);
  console.log('  Count:', chatReactions?.length || 0);
  chatReactions?.forEach(r => console.log(`  ${r.id.slice(0,8)}... | ${r.user_id.slice(0,8)}... | ${r.emoji}`));

  console.log('\n🏁 Проверка завершена.');
}

main().catch(console.error);
