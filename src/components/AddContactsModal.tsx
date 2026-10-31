import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Contact, Conversation } from '../types';
import { Avatar } from './Avatar';
import { SubscriptionBadge } from './SubscriptionBadge';
import { X, Search, UserPlus, Users, Hash, Check, AlertCircle } from 'lucide-react';

interface AddContactsModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (convo: Conversation) => void;
}

export const AddContactsModal: React.FC<AddContactsModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onConversationCreated,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'direct' | 'group' | 'space'>('direct');

  // Direct Tab State
  const [contactName, setContactName] = useState('');
  const [usernameHandle, setUsernameHandle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('mint');
  const [matchedUsers, setMatchedUsers] = useState<any[]>([]);

  // Group & Space State
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [spaceTopic, setSpaceTopic] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const COLOR_OPTIONS = [
    { id: 'mint', name: 'Green', class: 'bg-[#6EE7B7]' },
    { id: 'purple', name: 'Purple', class: 'bg-purple-400' },
    { id: 'pink', name: 'Pink', class: 'bg-pink-400' },
    { id: 'orange', name: 'Orange', class: 'bg-amber-400' },
    { id: 'slate', name: 'Dark grey', class: 'bg-slate-500' },
  ];

  // Live search users as user types usernameHandle
  useEffect(() => {
    const clean = usernameHandle.trim().toLowerCase().replace(/^@/, '');
    if (clean.length >= 2) {
      api.searchUsers(clean).then((res) => {
        setMatchedUsers(res.users);
      }).catch(() => setMatchedUsers([]));
    } else {
      setMatchedUsers([]);
    }
  }, [usernameHandle]);

  // Create Direct Chat
  const handleCreateDirectChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.addContact({
        contactName: contactName.trim() || undefined,
        usernameOrHandle: usernameHandle.trim(),
        description: description.trim() || undefined,
        avatarColor: selectedColor,
      });

      setSuccess(res.message);
      // Fetch full conversations to switch to it
      const convosRes = await api.getConversations();
      const createdConvo = convosRes.conversations.find((c) => c.id === res.conversationId);
      if (createdConvo) {
        onConversationCreated(createdConvo);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to create direct chat');
    } finally {
      setLoading(false);
    }
  };

  // Create Group or Space
  const handleCreateGroupOrSpace = async (type: 'group' | 'space') => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const name = type === 'group' ? groupName : spaceTopic || groupName;
      if (!name.trim()) {
        throw new Error('Name is required');
      }

      const res = await api.createConversation({
        type,
        name: name.trim(),
        description: groupDescription.trim(),
        memberUsernames: groupMembers,
      });

      const convosRes = await api.getConversations();
      const createdConvo = convosRes.conversations.find((c) => c.id === res.conversation.id);
      if (createdConvo) {
        onConversationCreated(createdConvo);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to create ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create New Conversation
            </h2>
            <p className="text-xs text-slate-500">Connect with teammates and friends on PulseChat</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Direct / Group / Space */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 mx-5 mt-4 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('direct');
              setError(null);
            }}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'direct'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Direct</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('group');
              setError(null);
            }}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'group'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('space');
              setError(null);
            }}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'space'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Space</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Direct */}
        {activeTab === 'direct' && (
          <form onSubmit={handleCreateDirectChat} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username / Handle <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-xs">@</span>
                <input
                  type="text"
                  required
                  value={usernameHandle}
                  onChange={(e) => setUsernameHandle(e.target.value)}
                  placeholder="e.g. sarah"
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Matched Users autocomplete dropdown */}
              {matchedUsers.length > 0 && (
                <div className="mt-1.5 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {matchedUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setUsernameHandle(u.username);
                        if (!contactName) setContactName(u.name);
                        setMatchedUsers([]);
                      }}
                      className="p-2 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <Avatar name={u.name} avatarUrl={u.avatarUrl} avatarColor={u.avatarColor} size="xs" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">@{u.username}</span>
                      </div>
                      <SubscriptionBadge plan={u.plan} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Name (Optional)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Custom display nickname"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Design lead, colleague"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Five Avatar Color Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Avatar Colour
              </label>
              <div className="flex items-center gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${c.class} ${
                      selectedColor === c.id ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                    }`}
                    title={c.name}
                  >
                    {selectedColor === c.id && <Check className="w-3.5 h-3.5 text-slate-800" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : '+ Create Direct Chat'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Group */}
        {activeTab === 'group' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Mobile Engineering Team"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group Description
              </label>
              <input
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Topic or team charter..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Add Members by Username (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. alex, sarah, mark"
                onChange={(e) =>
                  setGroupMembers(
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleCreateGroupOrSpace('group')}
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{loading ? 'Creating...' : '+ Create Group'}</span>
            </button>
          </div>
        )}

        {/* Tab 3: Space */}
        {activeTab === 'space' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Space Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                value={spaceTopic}
                onChange={(e) => setSpaceTopic(e.target.value)}
                placeholder="e.g. Product Design Guild"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold block text-slate-900 dark:text-white">Included Channels:</span>
              <p># general · Main communication channel</p>
              <p># announcements · Broadcast updates</p>
              <p># collaborative-canvas · Live whiteboard for Pro</p>
              <p># team-polls · Community decision polls</p>
            </div>

            <button
              type="button"
              onClick={() => handleCreateGroupOrSpace('space')}
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Hash className="w-4 h-4" />
              <span>{loading ? 'Creating Space...' : '+ Create Collaborative Space'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
