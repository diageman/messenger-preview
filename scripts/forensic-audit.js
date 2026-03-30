/**
 * FORENSIC AUDIT SCRIPT
 * Проверка всех гипотез проблемы с данными
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем .env
const envPath = join(__dirname, '..', 'apps', 'web', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

console.log('╔════════════════════════════════════════╗');
console.log('║  FORENSIC AUDIT REPORT                 ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('1. CONFIGURATION CHECK');
console.log('═══════════════════════════════════════');
console.log(`   SUPABASE_URL: ${supabaseUrl}`);
console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 30)}...`);
console.log(`   Project Ref: ${supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || 'unknown'}`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  // 2. ПРОВЕРКА СУЩЕСТВОВАНИЯ ТАБЛИЦ ЧЕРЕЗ REST API
  console.log('2. TABLE EXISTENCE CHECK (REST API)');
  console.log('═══════════════════════════════════════');
  
  const tables = [
    'organizations',
    'profiles',
    'departments',
    'department_members',
    'user_settings',
    'user_presence',
    'chats',
    'chat_members',
    'messages',
    'chat_reads',
    'attachments',
    'archived_chats'
  ];

  const tableStatus = {};

  for (const table of tables) {
    try {
      const url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=0`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'count=exact'
        }
      });

      if (response.ok) {
        const range = response.headers.get('content-range');
        const count = range?.split('/')[1] || 'unknown';
        console.log(`   ✅ ${table} - существует (rows: ${count})`);
        tableStatus[table] = { exists: true, count: parseInt(count) || 0, rls: false };
      } else if (response.status === 404) {
        console.log(`   ❌ ${table} - НЕ СУЩЕСТВУЕТ (404)`);
        tableStatus[table] = { exists: false, count: 0, rls: false };
      } else if (response.status === 401 || response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('not found') || errorText.includes('does not exist')) {
          console.log(`   ❌ ${table} - НЕ СУЩЕСТВУЕТ`);
          tableStatus[table] = { exists: false, count: 0, rls: false };
        } else {
          console.log(`   ⚠️  ${table} - RLS блокирует (status: ${response.status})`);
          tableStatus[table] = { exists: true, count: 'blocked', rls: true };
        }
      } else if (response.status === 500) {
        const error = await response.json();
        console.log(`   ⚠️  ${table} - ошибка сервера: ${error.code || 'unknown'}`);
        tableStatus[table] = { exists: true, count: 'error', rls: true, error };
      } else {
        console.log(`   ❓ ${table} - неизвестный статус: ${response.status}`);
        tableStatus[table] = { exists: 'unknown', count: 'unknown', rls: false };
      }
    } catch (e) {
      console.log(`   ❌ ${table} - исключение: ${e.message}`);
      tableStatus[table] = { exists: 'error', count: 'error', rls: false, error: e.message };
    }
  }

  // 3. ПРОВЕРКА RLS ПОЛИТИК
  console.log('');
  console.log('3. RLS POLICY CHECK');
  console.log('═══════════════════════════════════════');
  
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('schemaname, tablename, policyname, cmd, qual, with_check')
    .in('tablename', tables);

  if (policiesError) {
    console.log(`   ⚠️  Не удалось получить политики: ${policiesError.message}`);
  } else if (policies && policies.length > 0) {
    const policyByTable = {};
    policies.forEach(p => {
      if (!policyByTable[p.tablename]) policyByTable[p.tablename] = [];
      policyByTable[p.tablename].push({
        name: p.policyname,
        cmd: p.cmd,
        hasQual: !!p.qual,
        hasCheck: !!p.with_check
      });
    });
    
    Object.entries(policyByTable).forEach(([table, pols]) => {
      const selectPolicy = pols.find(p => p.cmd === 'SELECT');
      const insertPolicy = pols.find(p => p.cmd === 'INSERT');
      const updatePolicy = pols.find(p => p.cmd === 'UPDATE');
      const deletePolicy = pols.find(p => p.cmd === 'DELETE');
      
      console.log(`   📋 ${table}:`);
      console.log(`      SELECT: ${selectPolicy ? '✅' : '❌'} ${selectPolicy?.name || '-'}`);
      console.log(`      INSERT: ${insertPolicy ? '✅' : '❌'} ${insertPolicy?.name || '-'}`);
      console.log(`      UPDATE: ${updatePolicy ? '✅' : '❌'} ${updatePolicy?.name || '-'}`);
      console.log(`      DELETE: ${deletePolicy ? '✅' : '❌'} ${deletePolicy?.name || '-'}`);
    });
  } else {
    console.log('   ℹ️  Политики не найдены (или нет доступа к pg_policies)');
  }

  // 4. ПРОВЕРКА ФУНКЦИИ current_user_organization()
  console.log('');
  console.log('4. FUNCTION CHECK: current_user_organization()');
  console.log('═══════════════════════════════════════');
  
  const { data: functions, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname, prosrc')
    .in('proname', ['current_user_organization', 'create_direct_chat', 'update_updated_at_column']);

  if (funcError) {
    console.log(`   ⚠️  Не удалось получить функции: ${funcError.message}`);
  } else if (functions && functions.length > 0) {
    functions.forEach(f => {
      console.log(`   ✅ Функция существует: ${f.proname}`);
    });
  } else {
    console.log('   ❌ Функции не найдены');
  }

  // 5. ПРЯМОЙ ЗАПРОС К ДАННЫМ (без auth)
  console.log('');
  console.log('5. DIRECT DATA CHECK (anonymous access)');
  console.log('═══════════════════════════════════════');
  
  for (const table of ['organizations', 'profiles', 'departments']) {
    if (tableStatus[table]?.exists && !tableStatus[table]?.rls) {
      const { data, error } = await supabase.from(table).select('*').limit(5);
      if (error) {
        console.log(`   ❌ ${table}: ${error.code} - ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: ${data?.length || 0} rows`);
        if (data && data.length > 0) {
          console.log(`      Пример: ${JSON.stringify(data[0]).substring(0, 100)}...`);
        }
      }
    } else if (tableStatus[table]?.rls) {
      console.log(`   ⚠️  ${table}: RLS блокирует прямой доступ`);
    }
  }

  // 6. АНАЛИЗ ПРИЧИН
  console.log('');
  console.log('6. ROOT CAUSE ANALYSIS');
  console.log('═══════════════════════════════════════');
  
  const issues = [];
  
  // Проверка на пустые таблицы
  Object.entries(tableStatus).forEach(([table, status]) => {
    if (status.exists === true && status.count === 0) {
      issues.push({
        type: 'EMPTY_TABLE',
        table,
        severity: 'warning',
        message: `Таблица ${table} существует, но пуста`
      });
    }
    if (status.exists === false) {
      issues.push({
        type: 'MISSING_TABLE',
        table,
        severity: 'critical',
        message: `Таблица ${table} НЕ СУЩЕСТВУЕТ`
      });
    }
    if (status.rls === true) {
      issues.push({
        type: 'RLS_BLOCKING',
        table,
        severity: 'high',
        message: `RLS блокирует доступ к таблице ${table}`
      });
    }
  });

  if (issues.length === 0) {
    console.log('   ✅ Критических проблем не найдено');
  } else {
    issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
      console.log(`   ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    });
  }

  // 7. ВЫВОДЫ
  console.log('');
  console.log('7. CONCLUSIONS');
  console.log('═══════════════════════════════════════');
  
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (criticalIssues.length > 0) {
    console.log('   🔴 CRITICAL: Таблицы не существуют!');
    console.log('   Нужно выполнить миграции SQL.');
  } else if (highIssues.length > 0) {
    console.log('   🟠 HIGH: RLS блокирует доступ.');
    console.log('   Данные могут существовать, но недоступны без auth.');
    console.log('   Это нормально для production, но требует настройки для dev.');
  } else if (warnings.length > 0) {
    console.log('   🟡 WARNING: Таблицы пусты.');
    console.log('   Нужно создать начальные данные (organization, profile, departments).');
  } else {
    console.log('   ✅ Все таблицы существуют и доступны.');
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('Audit complete.');
}

runAudit();
