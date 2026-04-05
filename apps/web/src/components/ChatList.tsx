import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@messenger/ui';
import { Avatar, Badge, Button, Input, ScrollArea, Separator } from '@messenger/ui';
import { motion } from 'framer-motion';
import { MessageSquare, Pin, Search, X, Archive, Users, Pencil, Trash2, MoreVertical } from 'lucide-react';
import type { Chat, ChatCategory } from '../types/chat';
import { NewChatModal } from './NewChatModal';

interface ChatWithPeer extends Chat { peerAvatar?: string; peerStatus?: string; }
const categoryLabels = { all: 'Все', direct: 'Личные', groups: 'Команды', unread: 'Непрочитанные', important: 'Важные' };

export interface ChatListProps {
  chats: Chat[]; selectedChatId: string | null; onSelectChat: (id: string) => void;
  searchQuery: string; onSearchChange: (q: string) => void;
  activeCategory: ChatCategory; onCategoryChange: (c: ChatCategory) => void;
  isSearchOpen: boolean; onSearchOpenChange: (o: boolean) => void; unreadTotal: number;
  onDeleteChatForMe?: (id: string) => void; onDeleteChatForAll?: (id: string) => void;
}
export function ChatList({ chats, selectedChatId, onSelectChat, searchQuery, onSearchChange, activeCategory, onCategoryChange, isSearchOpen, onSearchOpenChange, unreadTotal, onDeleteChatForMe, onDeleteChatForAll }: ChatListProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = React.useState(false);
  const { pinned, recent, other } = React.useMemo(() => {
    const l = chats as ChatWithPeer[];
    const unpinned = l.filter(c => !c.isPinned);
    const r = unpinned.slice(0, 5);
    return {
      pinned: l.filter(c => c.isPinned),
      recent: r,
      other: unpinned.filter(c => !r.some(x => x.id === c.id)),
    };
  }, [chats]);
  const Item = (c: ChatWithPeer, i: number) => <ChatListItem key={c.id} chat={c} isSelected={selectedChatId === c.id} onSelect={() => onSelectChat(c.id)} onDeleteChatForMe={onDeleteChatForMe} onDeleteChatForAll={onDeleteChatForAll} delay={i * 0.03} />;
  return (<div className="relative flex h-full flex-col bg-bg-panel">
    <div className="flex h-14 items-center justify-between border-b border-border-soft px-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary"><MessageSquare className="h-4 w-4 text-text-muted" />Диалоги</h2>
      <div className="flex items-center gap-2">{unreadTotal > 0 && <Badge className="bg-accent-yellow-muted text-accent-yellow text-xs font-semibold">{unreadTotal}</Badge>}<Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text-primary" onClick={() => onSearchOpenChange(!isSearchOpen)}>{isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}</Button></div>
    </div>
    {isSearchOpen && <div className="border-b border-border-soft px-4 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><Input placeholder="Поиск..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="h-9 bg-bg-elevated border-border-soft pl-9" autoFocus /></div></div>}
    <div className="border-b border-border-soft px-2 py-2"><div className="flex gap-1 overflow-x-auto">{(Object.keys(categoryLabels) as ChatCategory[]).map(c => <Button key={c} variant="ghost" size="sm" onClick={() => onCategoryChange(c)} className={cn('whitespace-nowrap text-xs', activeCategory === c ? 'bg-bg-elevated text-text-primary font-medium' : 'text-text-muted')}>{categoryLabels[c]}</Button>)}</div></div>    <ScrollArea className="flex-1"><div className="flex flex-col">
      {pinned.length > 0 && <div className="mb-3"><div className="px-4 py-2"><div className="flex items-center gap-2"><Pin className="h-3.5 w-3.5 text-accent-yellow" /><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Закреплённые</span></div></div><div className="space-y-0.5">{pinned.map((c, i) => Item(c, i))}</div><Separator className="my-2 bg-border-soft" /></div>}
      {recent.length > 0 && <div className="mb-3"><div className="px-4 py-2"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Недавние</span></div><div className="space-y-0.5">{recent.map((c, i) => Item(c, i))}</div>{other.length > 0 && <Separator className="my-2 bg-border-soft" />}</div>}
      {other.length > 0 && <div className="mb-3"><div className="px-4 py-2"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Все чаты</span></div><div className="space-y-0.5">{other.map((c, i) => Item(c, i))}</div></div>}
      {chats.length === 0 && <div className="flex flex-col items-center justify-center py-12"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated"><Search className="h-5 w-5 text-text-muted" /></div><p className="text-sm text-text-muted">Нет чатов</p></div>}
    </div></ScrollArea>
    <div className="border-t border-border-soft bg-bg-elevated p-3"><Button variant="ghost" disabled className="w-full justify-start text-text-muted opacity-50"><Archive className="mr-2 h-4 w-4" />Архив</Button><Button variant="ghost" className="w-full justify-start text-text-secondary hover:text-text-primary" onClick={() => navigate('/contacts')}><Users className="mr-2 h-4 w-4" />Все контакты</Button></div>
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setModalOpen(true)} className="absolute bottom-16 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-accent-yellow text-black shadow-lg"><Pencil className="h-6 w-6" /></motion.button>
    <NewChatModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
  </div>);
}interface ChatListItemProps { chat: ChatWithPeer; isSelected: boolean; onSelect: () => void; onDeleteChatForMe?: (id: string) => void; onDeleteChatForAll?: (id: string) => void; delay?: number; }
function ChatListItem({ chat, isSelected, onSelect, onDeleteChatForMe, onDeleteChatForAll, delay = 0 }: ChatListItemProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (!menuOpen) return; const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [menuOpen]);
  const delMe = () => { setMenuOpen(false); if (onDeleteChatForMe && confirm(`Удалить диалог с «${chat.name}» у себя?`)) onDeleteChatForMe(chat.id); };
  const delAll = () => { setMenuOpen(false); if (onDeleteChatForAll && confirm(`Удалить диалог с «${chat.name}» у всех?`)) onDeleteChatForAll(chat.id); };
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className={cn('group relative flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors', isSelected ? 'bg-bg-elevated' : 'hover:bg-bg-hover')}>
      {isSelected && <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-yellow" />}
      <button onClick={() => { if (!menuOpen) onSelect(); }} className="flex flex-1 items-start gap-3 text-left min-w-0">
        <div className="relative shrink-0">{chat.type === 'direct' ? <Avatar size="md" fallback={chat.peerAvatar || '?'} status={chat.peerStatus as any} showStatus /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-sm font-bold text-text-secondary">G</div>}{chat.isPinned && <Pin className="absolute -right-0.5 -top-0.5 h-3 w-3 text-accent-yellow" />}</div>
        <div className="flex-1 overflow-hidden"><div className="flex items-center justify-between"><span className="truncate text-sm font-medium text-text-primary">{chat.name}</span><span className="shrink-0 text-xs text-text-muted">{chat.timestamp}</span></div>{chat.description && <p className="mt-0.5 truncate text-xs text-text-muted">{chat.description}</p>}<div className="mt-1 flex items-center justify-between"><span className="truncate text-sm text-text-secondary">{chat.lastMessage}</span>{chat.unreadCount > 0 && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-yellow text-[10px] font-bold text-black" style={{ minWidth: '1.25rem' }}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>}</div></div>
      </button>
      {(onDeleteChatForMe || onDeleteChatForAll) && <div ref={menuRef} className="relative shrink-0" onClick={e => e.stopPropagation()}><div onClick={() => setMenuOpen(!menuOpen)} className={cn('flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors', menuOpen ? 'bg-bg-hover text-text-primary' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:bg-bg-hover hover:text-text-primary')} role="button" tabIndex={0}><MoreVertical className="h-4 w-4" /></div>{menuOpen && <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border-soft bg-bg-panel shadow-lg">{onDeleteChatForMe && <button onClick={e => { e.stopPropagation(); delMe(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover"><Trash2 className="h-4 w-4" />Удалить у себя</button>}{onDeleteChatForAll && <button onClick={e => { e.stopPropagation(); delAll(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Удалить у всех</button>}</div>}</div>}
    </motion.div>);
}