/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User, Conversation, UserPlan } from './types';
import { AuthModal } from './components/AuthModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { ChatListPanel } from './components/ChatListPanel';
import { ChatArea } from './components/ChatArea';
import { StatusPage } from './components/StatusPage';
import { AddContactsModal } from './components/AddContactsModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { CallingModal } from './components/CallingModal';
import { VipQrDisplayModal } from './components/VipQrDisplayModal';
import { VipQrScannerModal } from './components/VipQrScannerModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Main UI Tabs
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'privacy'>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Filters & Search
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'direct' | 'group' | 'space'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showVipQrDisplay, setShowVipQrDisplay] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'plus' | 'pro' | null>(null);

  // Active Call state
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    isIncoming: boolean;
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    callType: 'voice' | 'video';
    offer?: any;
  } | null>(null);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pulsechat_theme') === 'dark';
  });

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pulsechat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pulsechat_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Auth Check
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setCurrentUser(res.user);
          if (res.user.settings?.darkMode !== undefined) {
            setIsDarkMode(res.user.settings.darkMode);
          }
          api.initWebSocket();
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => {
          setAuthChecked(true);
        });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load conversations when user logs in
  useEffect(() => {
    if (!currentUser) return;

    loadConversations();

    // Listen to real-time events: incoming calls, presence, conversations
    const unsubscribe = api.onWsMessage((event) => {
      if (event.type === 'call:offer') {
        // Incoming call!
        setActiveCall({
          callId: event.callId,
          isIncoming: true,
          partnerId: event.fromUserId,
          partnerName: event.callerName || 'PulseChat User',
          partnerAvatar: event.callerAvatar,
          callType: event.callType || 'voice',
          offer: event.offer,
        });
      } else if (event.type === 'conversation:created') {
        loadConversations();
      } else if (event.type === 'chat:message') {
        loadConversations();
      } else if (event.type === 'presence:update') {
        // Update presence in conversations
        setConversations((prev) =>
          prev.map((c) => {
            if (c.type === 'direct' && c.members.some((m) => m.userId === event.userId)) {
              return { ...c, isOnline: event.isOnline };
            }
            return c;
          })
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
      // Update selected conversation if it was modified
      if (selectedConversation) {
        const updated = res.conversations.find((c) => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setSelectedConversation(null);
    setConversations([]);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Start outgoing call
  const handleStartCall = (type: 'voice' | 'video') => {
    if (!selectedConversation || selectedConversation.type !== 'direct') return;

    const partnerMember = selectedConversation.members.find((m) => m.userId !== currentUser?.id);
    if (!partnerMember) return;

    setActiveCall({
      callId: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isIncoming: false,
      partnerId: partnerMember.userId,
      partnerName: selectedConversation.name,
      partnerAvatar: selectedConversation.avatarUrl,
      callType: type,
    });
  };

  // While checking auth token on page load
  if (!authChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F9FAF8] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-[24%] bg-[#6EE7B7] flex items-center justify-center shadow-md animate-pulse">
            <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
              <path
                d="M8 18.5C8 12.1487 13.3726 7 20 7C26.6274 7 32 12.1487 32 18.5C32 24.8513 26.6274 30 20 30C18.1523 30 16.4027 29.6054 14.8524 28.8953L8 31.5L9.95763 25.8778C8.7303 23.7386 8 21.2186 8 18.5Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-sans tracking-wide">
            Loading PulseChat...
          </span>
        </div>
      </div>
    );
  }

  // If user is not logged in, display AuthModal
  if (!currentUser) {
    return (
      <div className="h-screen w-screen relative overflow-hidden bg-[#F9FAF8] dark:bg-slate-950 flex items-center justify-center">
        {/* Soft mint aesthetic backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-[#F9FAF8] to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20" />
        <AuthModal
          onSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F9FAF8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* ---------------- 1. Desktop Collapsible Sidebar ---------------- */}
      <DesktopSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'privacy') setShowPrivacy(true);
        }}
        onOpenAddContacts={() => setShowAddContacts(true)}
        onOpenUpgrade={() => setShowUpgrade(true)}
        onOpenAccount={() => setShowAccount(true)}
        onOpenPrivacyPolicy={() => setShowPrivacy(true)}
        onChangeDP={() => setShowAccount(true)}
        onToggleDarkMode={handleToggleDarkMode}
        isDarkMode={isDarkMode}
        onLogout={handleLogout}
      />

      {/* ---------------- 2. Main Content Split ---------------- */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
        
        {activeTab === 'chats' ? (
          <>
            {/* Middle Panel: Conversation List (Visible or hidden on mobile when chat open) */}
            <div
              className={`h-full ${
                selectedConversation ? 'hidden md:flex' : 'flex'
              } w-full md:w-auto shrink-0`}
            >
              <ChatListPanel
                currentUser={currentUser}
                conversations={conversations}
                selectedConversationId={selectedConversation?.id || null}
                onSelectConversation={(convo) => setSelectedConversation(convo)}
                onOpenAddContacts={() => setShowAddContacts(true)}
                activeFilterTab={activeFilterTab}
                onChangeFilterTab={setActiveFilterTab}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Main Area: Chat Area or Empty Inbox */}
            <div
              className={`flex-1 h-full ${
                !selectedConversation ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ChatArea
                currentUser={currentUser}
                conversation={selectedConversation}
                onOpenAddContacts={() => setShowAddContacts(true)}
                onStartCall={handleStartCall}
                onBackToConversations={() => setSelectedConversation(null)}
              />
            </div>
          </>
        ) : activeTab === 'status' ? (
          /* WhatsApp-Style Status View */
          <StatusPage currentUser={currentUser} />
        ) : (
          /* Privacy Policy View */
          <div className="flex-1 p-8 overflow-y-auto">
            <button
              onClick={() => setActiveTab('chats')}
              className="mb-4 text-xs font-semibold text-emerald-600 hover:underline"
            >
              ← Back to chats
            </button>
            <PrivacyPolicyModal isOpen={true} onClose={() => setActiveTab('chats')} />
          </div>
        )}

      </div>

      {/* ---------------- 3. Mobile Collapsible Navigation ---------------- */}
      <MobileNavigation
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'privacy') setShowPrivacy(true);
        }}
        onOpenAddContacts={() => setShowAddContacts(true)}
        onOpenUpgrade={() => setShowUpgrade(true)}
        onOpenAccount={() => setShowAccount(true)}
        onOpenPrivacyPolicy={() => setShowPrivacy(true)}
        onToggleDarkMode={handleToggleDarkMode}
        isDarkMode={isDarkMode}
        onLogout={handleLogout}
      />

      {/* ---------------- 4. Global Modals ---------------- */}
      <AddContactsModal
        currentUser={currentUser}
        isOpen={showAddContacts}
        onClose={() => setShowAddContacts(false)}
        onConversationCreated={(convo) => {
          loadConversations();
          setSelectedConversation(convo);
          setActiveTab('chats');
        }}
      />

      <AccountSettingsModal
        currentUser={currentUser}
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onOpenUpgrade={() => {
          setShowAccount(false);
          setShowUpgrade(true);
        }}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <UpgradeModal
        currentUser={currentUser}
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onPlanUpdated={(newPlan) => {
          setCurrentUser((prev) => (prev ? { ...prev, plan: newPlan } : null));
          loadConversations();
        }}
        onOpenScanner={(tier) => {
          setScannerTarget(tier);
        }}
        onOpenVipQrCodes={() => {
          setShowVipQrDisplay(true);
        }}
      />

      <PrivacyPolicyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* VIP Passes Viewer & Downloader Modal */}
      <VipQrDisplayModal
        isOpen={showVipQrDisplay}
        onClose={() => setShowVipQrDisplay(false)}
        onOpenScanner={(tier) => {
          setShowVipQrDisplay(false);
          setScannerTarget(tier);
        }}
      />

      {/* Target Plan Specific VIP Scanner Modal */}
      <VipQrScannerModal
        scannerType={scannerTarget}
        isOpen={!!scannerTarget}
        onClose={() => setScannerTarget(null)}
        onSuccess={(tier) => {
          setCurrentUser((prev) => (prev ? { ...prev, plan: tier } : null));
          loadConversations();
        }}
      />

      {/* Voice & Video WebRTC Calling Modal */}
      {activeCall && (
        <CallingModal
          currentUser={currentUser}
          activeCall={activeCall}
          onClose={() => setActiveCall(null)}
        />
      )}

    </div>
  );
}
