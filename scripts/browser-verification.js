/**
 * BROWSER VERIFICATION SCRIPT
 * Запускается в консоли браузера (F12)
 * 
 * ИНСТРУКЦИЯ:
 * 1. Открой 2 браузера (или инкогнито)
 * 2. Залогинься под разными пользователями
 * 3. Открой один direct chat в обоих
 * 4. В каждом браузере открой консоль (F12)
 * 5. Вставь этот скрипт в консоль
 * 6. Следуй инструкциям
 */

console.log('╔════════════════════════════════════════╗');
console.log('║  MESSENGER VERIFICATION SCRIPT         ║');
console.log('╚════════════════════════════════════════╝\n');

// Конфигурация теста
const TEST_CONFIG = {
  checkInterval: 1000,  // 1 second
  timeout: 30000,        // 30 seconds
  expectedPeerName: null,  // Will be set from chat
};

// Состояние теста
const TEST_STATE = {
  startTime: Date.now(),
  messagesSent: 0,
  messagesReceived: 0,
  lastMessageId: null,
  chatListFlicker: false,
  activeChatFlicker: false,
  identityMismatch: false,
  autoscrollWorking: false,
};

// ===== MONITORING =====

function monitorChatList() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.removedNodes.length > 0) {
        // Check if chat list was cleared
        const chatList = document.querySelector('[role="list"]') || document.querySelector('.chat-list');
        if (chatList && chatList.children.length === 0) {
          TEST_STATE.chatListFlicker = true;
          console.warn('❌ CHAT LIST FLICKER DETECTED - list was cleared');
        }
      }
    });
  });

  const chatList = document.querySelector('[role="list"]') || document.querySelector('.chat-list');
  if (chatList) {
    observer.observe(chatList, { childList: true, subtree: true });
    console.log('✅ Monitoring chat list for flicker...');
  }
  return observer;
}

function monitorActiveChat() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.removedNodes.length > 0) {
        // Check if messages were cleared
        const messagesContainer = document.querySelector('[role="log"]') || document.querySelector('.messages');
        if (messagesContainer && messagesContainer.children.length === 0) {
          TEST_STATE.activeChatFlicker = true;
          console.warn('❌ ACTIVE CHAT FLICKER DETECTED - messages were cleared');
        }
      }
    });
  });

  const messagesContainer = document.querySelector('[role="log"]') || document.querySelector('.messages');
  if (messagesContainer) {
    observer.observe(messagesContainer, { childList: true, subtree: true });
    console.log('✅ Monitoring active chat for flicker...');
  }
  return observer;
}

function monitorIdentity() {
  setInterval(() => {
    const chatListName = document.querySelector('[aria-label^="Чат с"]')?.textContent;
    const headerName = document.querySelector('header h3')?.textContent;
    
    if (chatListName && headerName && chatListName !== headerName) {
      TEST_STATE.identityMismatch = true;
      console.warn(`❌ IDENTITY MISMATCH: ChatList="${chatListName}" vs Header="${headerName}"`);
    }
  }, 2000);
  
  console.log('✅ Monitoring identity consistency...');
}

function monitorAutoscroll() {
  const messagesContainer = document.querySelector('[role="log"]') || document.querySelector('.messages');
  if (messagesContainer) {
    let lastScrollTop = messagesContainer.scrollTop;
    
    messagesContainer.addEventListener('DOMNodeInserted', () => {
      setTimeout(() => {
        const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
        if (isAtBottom) {
          TEST_STATE.autoscrollWorking = true;
        }
      }, 100);
    });
    
    console.log('✅ Monitoring autoscroll behavior...');
  }
}

// ===== TEST COMMANDS =====

window.VERIFICATION = {
  start: function() {
    console.log('\n🧪 STARTING VERIFICATION...\n');
    
    // Start monitoring
    monitorChatList();
    monitorActiveChat();
    monitorIdentity();
    monitorAutoscroll();
    
    // Log start time
    TEST_STATE.startTime = Date.now();
    
    console.log('\n📋 TEST CHECKLIST:');
    console.log('1. Send a message from THIS browser');
    console.log('2. Check if it appears instantly (<100ms)');
    console.log('3. Send a message from OTHER browser');
    console.log('4. Check if it appears in active chat immediately');
    console.log('5. Check if chat list preview updates at same time');
    console.log('6. Wait 15 seconds, watch for flicker');
    console.log('7. Check identity (name in list vs header)');
    console.log('8. Check autoscroll (new messages visible without manual scroll)\n');
    
    console.log('Type VERIFICATION.sendTestMessage() to send a test message');
    console.log('Type VERIFICATION.report() to see results\n');
  },
  
  sendTestMessage: function() {
    const textarea = document.querySelector('textarea[placeholder*="сообщение"]') || 
                     document.querySelector('textarea[placeholder*="message"]');
    const sendButton = document.querySelector('button[type="submit"]') || 
                       document.querySelector('button[aria-label*="Отправить"]');
    
    if (textarea && sendButton) {
      const testText = `Test message ${Date.now()}`;
      textarea.value = testText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      setTimeout(() => {
        sendButton.click();
        TEST_STATE.messagesSent++;
        console.log(`✅ Sent: "${testText}"`);
      }, 100);
    } else {
      console.error('❌ Could not find message input or send button');
    }
  },
  
  report: function() {
    const elapsed = ((Date.now() - TEST_STATE.startTime) / 1000).toFixed(1);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  VERIFICATION REPORT                   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Test duration: ${elapsed}s`);
    console.log(`📤 Messages sent: ${TEST_STATE.messagesSent}`);
    console.log(`📥 Messages received: ${TEST_STATE.messagesReceived}`);
    
    console.log('\n📊 RESULTS:\n');
    
    // Chat list flicker
    console.log(`${TEST_STATE.chatListFlicker ? '❌' : '✅'} Chat list flicker: ${TEST_STATE.chatListFlicker ? 'DETECTED' : 'NONE'}`);
    
    // Active chat flicker
    console.log(`${TEST_STATE.activeChatFlicker ? '❌' : '✅'} Active chat flicker: ${TEST_STATE.activeChatFlicker ? 'DETECTED' : 'NONE'}`);
    
    // Identity consistency
    console.log(`${TEST_STATE.identityMismatch ? '❌' : '✅'} Identity consistency: ${TEST_STATE.identityMismatch ? 'MISMATCH' : 'OK'}`);
    
    // Autoscroll
    console.log(`${TEST_STATE.autoscrollWorking ? '✅' : '⚠️'} Autoscroll: ${TEST_STATE.autoscrollWorking ? 'WORKING' : 'NOT VERIFIED'}`);
    
    console.log('\n═══════════════════════════════════════\n');
    
    if (TEST_STATE.chatListFlicker || TEST_STATE.activeChatFlicker || TEST_STATE.identityMismatch) {
      console.log('❌ ISSUES FOUND - see logs above');
    } else {
      console.log('✅ ALL CHECKS PASSED');
    }
  },
  
  help: function() {
    console.log('\n📖 COMMANDS:');
    console.log('VERIFICATION.start() - Start monitoring');
    console.log('VERIFICATION.sendTestMessage() - Send test message');
    console.log('VERIFICATION.report() - Show results');
    console.log('VERIFICATION.help() - Show this help\n');
  }
};

console.log('\n✅ Script loaded. Type VERIFICATION.help() for commands.\n');
