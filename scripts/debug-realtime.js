/**
 * Realtime Debug Script
 * Запусти в консоли браузера (F12) на странице чата
 */

// Check if Supabase client is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('🔍 REALTIME DEBUG TOOL');
  console.log('═══════════════════════════════════════');
  
  // Subscribe to all messages
  const channel = window.supabase
    .channel('debug:all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        console.log('📨 REALTIME MESSAGE RECEIVED:');
        console.log('   Event:', payload.eventType);
        console.log('   Table:', payload.table);
        console.log('   New message:', payload.new);
        console.log('   Sender ID:', payload.new.sender_id);
        console.log('   Chat ID:', payload.new.chat_id);
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connection established!');
        console.log('   Now send a message from another user...');
      }
    });

  console.log('📋 Subscription created');
  console.log('   Waiting for messages...');
  console.log('');
  console.log('To cleanup, run:');
  console.log('   window.supabase.removeChannel(channel)');
} else {
  console.log('❌ Supabase client not found');
  console.log('   Make sure you are on a page with the messenger app loaded');
}
