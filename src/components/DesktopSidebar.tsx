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
  Moon, 
  Sun,
  LogOut 
} from 'lucide-react';

interface DesktopSidebarProps {
  currentUser: User;
  activeTab: 'chats' | 'status' | 'privacy';
  onSelectTab: (tab: 'chats' | 'status' | 'privacy') => void;
  onOpenAddContacts: () => void;
  onOpenUpgrade: () => void;
  onOpenAccount: () => void;
  onOpenPrivacyPolicy: () => void;
  onChangeDP: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  onLogout: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenAddContacts,
  onOpenUpgrade,
  onOpenAccount,
  onOpenPrivacyPolicy,
  onChangeDP,
  onToggleDarkMode,
  isDarkMode,
  onLogout,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    {
      id: 'chats',
      label: 'Home',
      icon: MessageSquare,
      active: activeTab === 'chats',
      onClick: () => onSelectTab('chats'),
    },
    {
      id: 'status',
      label: 'Status',
      icon: CircleDashed,
      active: activeTab === 'status',
      onClick: () => onSelectTab('status'),
    },
    {
      id: 'add-contacts',
      label: 'Add Contacts',
      icon: UserPlus,
      active: false,
      onClick: onOpenAddContacts,
      highlight: true,
    },
    {
      id: 'upgrade',
      label: 'Upgrade',
      icon: Sparkles,
      active: false,
      onClick: onOpenUpgrade,
      badge: currentUser.plan === 'free' ? 'PRO' : currentUser.plan.toUpperCase(),
      badgeColor: currentUser.plan === 'pro' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' : 'text-blue-500 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings,
      active: false,
      onClick: onOpenAccount,
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: ShieldCheck,
      active: activeTab === 'privacy',
      onClick: onOpenPrivacyPolicy,
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex flex-col justify-between h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out z-30 shrink-0 ${
        isHovered ? 'w-60 shadow-xl' : 'w-[68px]'
      }`}
    >
      {/* Top Section: Logo & Profile */}
      <div className="flex flex-col py-4">
        {/* Brand Logo */}
        <div className="flex items-center px-4 mb-6 overflow-hidden">
          <PulseChatLogo size="md" withText={isHovered} />
        </div>

        {/* User Profile Card */}
        <div
          className={`flex items-center px-3 py-2.5 mx-2 rounded-2xl transition-colors cursor-pointer ${
            isHovered ? 'bg-slate-50 dark:bg-slate-800/80' : ''
          }`}
          onClick={onOpenAccount}
          title="Open Account & Settings"
        >
          <div className="relative shrink-0">
            <Avatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              avatarColor={currentUser.avatarColor}
              size="md"
              showCameraHover={true}
              onCameraClick={(e?: React.MouseEvent) => {
                if (e) e.stopPropagation();
                onChangeDP();
              }}
            />
          </div>

          {isHovered && (
            <div className="ml-3 overflow-hidden text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </span>
                <SubscriptionBadge plan={currentUser.plan} size="sm" />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                @{currentUser.username}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 px-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${
                  item.active
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="w-5 flex justify-center shrink-0">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      item.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                </div>

                {isHovered && (
                  <div className="ml-3.5 flex items-center justify-between flex-1 overflow-hidden">
                    <span className="text-xs truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Theme & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-full flex items-center h-10 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
        >
          <div className="w-5 flex justify-center shrink-0">
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </div>
          {isHovered && (
            <span className="ml-3.5 text-xs text-slate-700 dark:text-slate-300">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="Log Out"
          className="w-full flex items-center h-10 px-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
        >
          <div className="w-5 flex justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          {isHovered && <span className="ml-3.5 text-xs font-medium">Log Out</span>}
        </button>
      </div>
    </aside>
  );
};
