import React, { useState } from 'react';
import { PulseChatLogo } from './PulseChatLogo';
import { Avatar } from './Avatar';
import { SubscriptionBadge } from './SubscriptionBadge';
import { User } from '../types';
import { 
  MessageSquare, 
  CircleDashed, 
  UserPlus, 
  Sparkles, 
  Settings, 
  ShieldCheck, 
  ChevronUp, 
  ChevronDown,
  Moon,
  Sun,
  LogOut 
} from 'lucide-react';

interface MobileNavigationProps {
  currentUser: User;
  activeTab: 'chats' | 'status' | 'privacy';
  onSelectTab: (tab: 'chats' | 'status' | 'privacy') => void;
  onOpenAddContacts: () => void;
  onOpenUpgrade: () => void;
  onOpenAccount: () => void;
  onOpenPrivacyPolicy: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  onLogout: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenAddContacts,
  onOpenUpgrade,
  onOpenAccount,
  onOpenPrivacyPolicy,
  onToggleDarkMode,
  isDarkMode,
  onLogout,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = (action: () => void) => {
    action();
    setIsExpanded(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-all duration-300">
      
      {/* Expanded Menu Panel */}
      {isExpanded && (
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200 border-b border-slate-100 dark:border-slate-800">
          {/* User Profile Bar */}
          <div 
            onClick={() => handleSelect(onOpenAccount)}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl cursor-pointer"
          >
            <Avatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              avatarColor={currentUser.avatarColor}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </span>
                <SubscriptionBadge plan={currentUser.plan} size="sm" />
              </div>
              <p className="text-xs text-slate-500 truncate">@{currentUser.username}</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Settings</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleSelect(() => onSelectTab('chats'))}
              className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-semibold ${
                activeTab === 'chats'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Chats & Messaging</span>
            </button>

            <button
              onClick={() => handleSelect(() => onSelectTab('status'))}
              className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-semibold ${
                activeTab === 'status'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <CircleDashed className="w-4 h-4 text-emerald-600" />
              <span>Status Updates</span>
            </button>

            <button
              onClick={() => handleSelect(onOpenAddContacts)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-left text-xs font-semibold"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Add Contacts</span>
            </button>

            <button
              onClick={() => handleSelect(onOpenUpgrade)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-left text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Upgrade Plan</span>
            </button>

            <button
              onClick={() => handleSelect(onOpenPrivacyPolicy)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-left text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Privacy Policy</span>
            </button>

            <button
              onClick={() => {
                onToggleDarkMode();
                setIsExpanded(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-left text-xs font-semibold"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <button
            onClick={() => handleSelect(onLogout)}
            className="w-full flex items-center justify-center gap-2 p-2.5 mt-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* Compact Collapsed Bar (Always visible on mobile) */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => onSelectTab('chats')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
            activeTab === 'chats' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chats</span>
        </button>

        <button
          onClick={() => onSelectTab('status')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
            activeTab === 'status' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
          }`}
        >
          <CircleDashed className="w-5 h-5" />
          <span className="text-[10px] font-medium">Status</span>
        </button>

        {/* Central Slider/Menu Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1.5 rounded-full bg-emerald-500 text-white shadow-md flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-transform"
        >
          <span>Menu</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onOpenAddContacts}
          className="p-2 rounded-xl flex flex-col items-center gap-1 text-slate-500 hover:text-emerald-600"
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add</span>
        </button>

        <button
          onClick={onOpenAccount}
          className="p-2 rounded-xl flex flex-col items-center gap-1 text-slate-500 hover:text-emerald-600"
        >
          <Avatar
            name={currentUser.name}
            avatarUrl={currentUser.avatarUrl}
            avatarColor={currentUser.avatarColor}
            size="xs"
          />
          <span className="text-[10px] font-medium">Me</span>
        </button>
      </div>

    </div>
  );
};
