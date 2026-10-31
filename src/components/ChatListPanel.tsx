import React, { useState } from 'react';
import { Conversation, User, UserPlan } from '../types';
import { Avatar } from './Avatar';
import { SubscriptionBadge } from './SubscriptionBadge';
import { Search, Plus, Users, Hash, MessageSquare, X } from 'lucide-react';

interface ChatListPanelProps {
  currentUser: User;
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (convo: Conversation) => void;
  onOpenAddContacts: () => void;
  activeFilterTab: 'all' | 'direct' | 'group' | 'space';
  onChangeFilterTab: (tab: 'all' | 'direct' | 'group' | 'space') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ChatListPanel: React.FC<ChatListPanelProps> = ({
  currentUser,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenAddContacts,
  activeFilterTab,
  onChangeFilterTab,
  searchQuery,
  onSearchChange,
}) => {
  // Format message time
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations
  const filtered = conversations.filter((c) => {
    // Type tab filter
    if (activeFilterTab !== 'all' && c.type !== activeFilterTab) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchUsername = c.partnerUsername?.toLowerCase().includes(q);
      const matchLastMsg = c.lastMessage?.content.toLowerCase().includes(q);
      return matchName || matchUsername || matchLastMsg;
    }
    return true;
  });

  const directCount = conversations.filter((c) => c.type === 'direct').length;
  const groupCount = conversations.filter((c) => c.type === 'group').length;
  const spaceCount = conversations.filter((c) => c.type === 'space').length;

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shrink-0 select-none">
      
      {/* Top Header: User Profile & Quick Add */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              avatarColor={currentUser.avatarColor}
              size="md"
            />
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </span>
                <SubscriptionBadge plan={currentUser.plan} size="sm" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{currentUser.username}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAddContacts}
            title="Create new conversation or contact"
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats or messages..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs: Direct / Groups / Spaces */}
        <div className="flex items-center gap-1 mt-3 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-semibold">
          <button
            onClick={() => onChangeFilterTab('all')}
            className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
              activeFilterTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onChangeFilterTab('direct')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-lg transition-all ${
              activeFilterTab === 'direct'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Direct</span>
            {directCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full font-mono">
                {directCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onChangeFilterTab('group')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-lg transition-all ${
              activeFilterTab === 'group'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Groups</span>
            {groupCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full font-mono">
                {groupCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onChangeFilterTab('space')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-lg transition-all ${
              activeFilterTab === 'space'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Spaces</span>
            {spaceCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full font-mono">
                {spaceCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {searchQuery ? 'No conversations found' : 'No chats in this tab yet'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {searchQuery ? 'Try another search term' : 'Click the + button to create a conversation'}
            </p>
          </div>
        ) : (
          filtered.map((convo) => {
            const isSelected = selectedConversationId === convo.id;
            return (
              <div
                key={convo.id}
                onClick={() => onSelectConversation(convo)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-3 border-emerald-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Avatar / Icon */}
                <div className="relative shrink-0">
                  {convo.type === 'direct' ? (
                    <Avatar
                      name={convo.name}
                      avatarUrl={convo.avatarUrl}
                      avatarColor={convo.avatarColor || 'mint'}
                      size="md"
                      isOnline={convo.isOnline}
                      showOnlineStatus={true}
                    />
                  ) : convo.type === 'group' ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 flex items-center justify-center shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-200 flex items-center justify-center shadow-xs">
                      <Hash className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {convo.name}
                      </span>
                      {convo.type === 'direct' && (
                        <SubscriptionBadge plan={convo.partnerPlan} size="sm" />
                      )}
                    </div>
                    {convo.lastMessage && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                        {formatTime(convo.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {convo.lastMessage ? (
                        <span>
                          {convo.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {convo.lastMessage.content}
                        </span>
                      ) : (
                        <span className="italic text-slate-400 dark:text-slate-500">
                          {convo.type === 'direct' ? 'No messages yet' : convo.description || 'Channel ready'}
                        </span>
                      )}
                    </p>

                    {convo.unreadCount > 0 && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
