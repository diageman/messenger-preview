import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ручной парсинг .env.local
const envStr = readFileSync('./.env.local', 'utf-8');
const getEnv = (key) => {
  const match = envStr.match(new RegExp(`${key}=([^\r\n]+)`));
  return match ? match[1].trim() : null;
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function run() {
  console.log('🚀 Диагностика уведомлений...');
  
  // Узнаем, кто мы в системе на самом деле
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Вы не авторизованы в Supabase (проверьте сессию в браузере)');
    return;
  }
  
  console.log(`👤 Ваш реальный ID: ${user.id}`);
  console.log(`📧 Email: ${user.email}`);

  // Проверяем текущие записи в chat_reads
  const { data: reads, error: readError } = await supabase
    .from('chat_reads')
    .select('*')
    .eq('user_id', user.id);

  if (readError) {
    console.error('❌ Ошибка при чтении chat_reads:', readError.message);
  } else {
    console.log(`✅ Найдено записей о прочтении: ${reads.length}`);
    console.table(reads.map(r => ({ chat: r.chat_id, read_at: r.last_read_at })));
  }

  // Пробуем обновить одну запись, чтобы проверить RLS
  if (reads.length > 0) {
    const targetChat = reads[0].chat_id;
    console.log(`📝 Проверка RLS: Обновляю статус для чата ${targetChat}...`);
    const { error: upsertError } = await supabase.from('chat_reads').upsert({
      chat_id: targetChat,
      user_id: user.id,
      last_read_at: new Date().toISOString()
    });

    if (upsertError) console.error('❌ Ошибка записи (RLS/Permissions):', upsertError.message);
    else console.log('✅ Запись успешно обновлена в базе!');
  }
}

run();