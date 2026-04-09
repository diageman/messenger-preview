const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  const { data: authB } = await supabase.auth.signInWithPassword({
    email: 'd1ageman@yandex.ru', password: 'G7Ws7QnB'
  });
  console.log('👤 User B:', authB.user.id.slice(0, 8));

  // Считаем WAL position
  const channel = supabase.channel('fresh-wal-test')
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'message_reactions' },
      (payload) => {
        console.log('\n📥 DELETE event:');
        console.log('   payload.old:', JSON.stringify(payload.old, null, 2));
        console.log('   Has message_id:', !!payload.old?.message_id);
        console.log('   Has emoji:', !!payload.old?.emoji);
      }
    )
    .subscribe((status) => {
      console.log('📡 Channel:', status);
    });

  await new Promise(r => setTimeout(r, 3000));

  const supabaseA = createClient(supabaseUrl, supabaseKey);
  const { data: authA } = await supabaseA.auth.signInWithPassword({
    email: 'diage2x@gmail.com', password: 'G7Ws7QnB'
  });

  const { data: memberChats } = await supabaseA.from('chat_members').select('chat_id').eq('user_id', authA.user.id).limit(1);
  const { data: msgs } = await supabaseA.from('messages').select('id').eq('chat_id', memberChats[0].chat_id).limit(1);
  const messageId = msgs[0].id;

  console.log('\n📝 New INSERT + DELETE...');
  const { data: inserted } = await supabaseA
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: authA.user.id, emoji: '🆕' },
      { onConflict: 'message_id,user_id,emoji' })
    .select().single();

  console.log('✅ Inserted:', inserted.id);
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n🗑 Deleting...');
  await supabaseA.from('message_reactions').delete().eq('id', inserted.id);
  await new Promise(r => setTimeout(r, 5000));

  await supabase.removeChannel(channel);
  console.log('\n🏁 Done');
}

main().catch(console.error);
