import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Используем dotenv для надежности или ручной парсинг
const envContent = readFileSync('./.env.local', 'utf-8');
const config = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) config[key.trim()] = val.join('=').trim();
});

const url = config['VITE_SUPABASE_URL'];
const key = config['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error('❌ Не удалось найти URL или KEY в .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function diagnose() {
  console.log('🔗 Подключение к:', url);
  
  // 1. Проверяем сессию
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('👤 Статус: Анонимный пользователь (сессия не найдена)');
  } else {
    console.log('👤 Авторизован как:', session.user.email, '(ID:', session.user.id, ')');
  }

  // 2. Пробуем прочитать chat_reads
  console.log('📡 Пробую прочитать таблицу chat_reads...');
  const { data, error } = await supabase.from('chat_reads').select('*').limit(5);
  
  if (error) {
    console.error('❌ Ошибка чтения chat_reads:', error.message, error.details || '');
  } else {
    console.log('✅ Данные chat_reads получены:', data.length, 'записей');
    console.table(data);
  }

  // 3. Пробуем тестовый UPSERT (самая важная часть)
  if (session) {
    console.log('📝 Тестирую запись (UPSERT) для текущего пользователя...');
    const testChatId = '00000000-0000-0000-0000-000000000000'; // фейковый ID для теста RLS
    const { error: upsertError } = await supabase.from('chat_reads').upsert({
      chat_id: data?.[0]?.chat_id || testChatId,
      user_id: session.user.id,
      last_read_at: new Date().toISOString()
    });

    if (upsertError) {
      console.error('❌ UPSERT не удался:', upsertError.message);
      if (upsertError.message.includes('policy')) {
        console.log('💡 СКОРЕЕ ВСЕГО: RLS запрещает UPDATE/INSERT для этой таблицы.');
      }
    } else {
      console.log('✅ UPSERT прошел успешно! Значит RLS настроен верно или отключен.');
    }
  }
}

diagnose();