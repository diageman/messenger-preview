import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Читаем конфиг из КОРНЯ проекта
const env = readFileSync('./.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);
const MY_ID = 'd0ced572-9909-428f-8d70-6266bf3e0d1f';

async function clearAll() {
  console.log('🚀 Начинаю форсированную очистку 126 уведомлений...');
  const { data: chats } = await supabase.from('chats').select('id');
  
  if (!chats) return console.log('❌ Чаты не найдены');

  for (const chat of chats) {
    const { error } = await supabase.from('chat_reads').upsert({
      chat_id: chat.id,
      user_id: MY_ID,
      last_read_at: new Date().toISOString()
    }, { onConflict: 'chat_id,user_id' });
    
    if (error) console.error(`❌ Ошибка доступа (RLS) для чата ${chat.id}:`, error.message);
    else console.log(`✅ Чат ${chat.id} теперь помечен прочитанным`);
  }
  console.log('🎯 Готово! База синхронизирована. Теперь обнови страницу.');
}

clearAll();