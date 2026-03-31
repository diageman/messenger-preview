/**
 * Avatar helper для чатов
 * Возвращает корректные display data для avatar
 */

export interface AvatarDisplayData {
  title: string;
  initials: string;
  avatarUrl?: string | null;
}

/**
 * Получить display data для чата
 * 
 * @param chatType - тип чата ('direct', 'group', 'channel')
 * @param chatName - имя чата из БД
 * @param participants - массив участников с полем avatar
 * @param currentUserId - ID текущего пользователя (для direct chat)
 * @param peerMember - peer member для direct chat (если есть)
 */
export function getChatAvatarData(
  chatType: string,
  chatName: string | null | undefined,
  participants: Array<{ id: string; name: string; avatar: string }>,
  currentUserId?: string,
  peerMember?: any
): AvatarDisplayData {
  // DIRECT CHAT: source of truth только peer profile
  if (chatType === 'direct') {
    // 1. Если есть peerMember (из profiles), берём из него
    if (peerMember?.profiles?.full_name) {
      const fullName = peerMember.profiles.full_name;
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      return {
        title: fullName,
        initials,
        avatarUrl: peerMember.profiles.avatar_url,
      };
    }
    
    // 2. Если peerMember нет, ищем в participants (исключая current user)
    if (currentUserId && participants.length > 0) {
      const peer = participants.find(p => p.id !== currentUserId);
      if (peer && peer.name !== 'Unknown') {
        const initials = peer.avatar?.toUpperCase() || '?';
        return {
          title: peer.name,
          initials: initials.slice(0, 2),
          avatarUrl: undefined,
        };
      }
    }
    
    // 3. Fallback для direct chat без peer
    return {
      title: 'Сотрудник',
      initials: '?',
      avatarUrl: undefined,
    };
  }
  
  // GROUP / CHANNEL: используем chat.name или first 2 participants
  if (chatName) {
    const initials = chatName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return {
      title: chatName,
      initials,
      avatarUrl: undefined,
    };
  }
  
  // Fallback для group/channel без имени
  if (participants.length >= 2) {
    const initials = participants
      .slice(0, 2)
      .map(p => p.avatar?.[0] || '?')
      .join('')
      .toUpperCase();
    
    return {
      title: 'Групповой чат',
      initials,
      avatarUrl: undefined,
    };
  }
  
  // Ultimate fallback
  return {
    title: 'Чат',
    initials: 'Ч',
    avatarUrl: undefined,
  };
}
