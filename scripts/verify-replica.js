const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'diage2x@gmail.com', password: 'G7Ws7QnB'
  });

  // Пробуем выполнить ALTER TABLE через Supabase REST API — anon не имеет прав
  // Но мы можем проверить через EXPLAIN или попробовать получить информацию
  
  // Проверим через RPC или через информацию о таблицах
  console.log('Проверяем таблицы в схеме public...');
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  console.log('Таблицы:', tables?.map(t => t.table_name));
  
  // Проверяем есть ли таблица 'reactions' (возможно вы выполнили ALTER для неё)
  const hasReactions = tables?.some(t => t.table_name === 'reactions');
  const hasMessageReactions = tables?.some(t => t.table_name === 'message_reactions');
  
  console.log('\nreactions:', hasReactions ? '✅ существует' : '❌ не существует');
  console.log('message_reactions:', hasMessageReactions ? '✅ существует' : '❌ не существует');
  
  if (hasReactions && !hasMessageReactions) {
    console.log('\n⚠️ Возможно вы выполнили ALTER TABLE reactions, но нужно message_reactions!');
  }
  
  // Проверяем через прямой запрос к pg_class через Supabase Management API
  // Anon key не имеет доступа — покажем пользователю что нужно сделать
  
  console.log('\n============================================');
  console.log('ВЫПОЛНИТЕ В SUPABASE DASHBOARD → SQL EDITOR:');
  console.log('============================================');
  console.log('ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;');
  console.log('');
  console.log('ЗАТЕМ проверьте:');
  console.log("SELECT relreplident FROM pg_class WHERE relname = 'message_reactions';");
  console.log('Результат должен быть: f (FULL)');
  console.log('Если d (DEFAULT) — не применено.');
}

main().catch(console.error);
