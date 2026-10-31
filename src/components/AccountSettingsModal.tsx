import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { SubscriptionBadge } from './SubscriptionBadge';
import { api } from '../services/api';
import {
  X,
  Camera,
  Check,
  Trash2,
  Moon,
  Sun,
  Shield,
  Bell,
  Eye,
  LogOut,
  Sparkles,
  CreditCard,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';

interface AccountSettingsModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
  onOpenUpgrade: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onUserUpdated,
  onOpenUpgrade,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [about, setAbout] = useState(currentUser.about);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor);

  // Settings
  const [viewOnceProtection, setViewOnceProtection] = useState(
    currentUser.settings?.viewOnceProtection ?? true
  );
  const [readReceipts, setReadReceipts] = useState(
    currentUser.settings?.readReceipts ?? true
  );
  const [notifications, setNotifications] = useState(
    currentUser.settings?.notifications ?? true
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle DP upload
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const uploadRes = await api.uploadFile(dataUrl, `dp_${currentUser.id}_${Date.now()}.jpg`, file.type);
        setAvatarUrl(uploadRes.url);
        setMessage('Profile picture updated. Click "Save Profile" to apply changes permanently.');
      } catch (err: any) {
        setError(err.message || 'Failed to upload profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove DP
  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setMessage('Profile picture removed. You now have the clean initial avatar.');
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        username: username.trim(),
        about: about.trim(),
        avatarUrl,
        avatarColor,
        settings: {
          darkMode: isDarkMode,
          viewOnceProtection,
          readReceipts,
          notifications,
          lastSeen: 'everyone',
        },
      });

      onUserUpdated(res.user);
      setMessage('Profile and preferences saved successfully!');
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_COLORS = ['mint', 'purple', 'pink', 'orange', 'slate'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account & Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notification Messages */}
          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar
                  name={name}
                  avatarUrl={avatarUrl}
                  avatarColor={avatarColor}
                  size="xl"
                  showCameraHover={true}
                />
                <button
                  type="button"
                  title="Change Profile Picture (DP)"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-white dark:ring-slate-900 hover:bg-emerald-500 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{name}</h3>
                  <SubscriptionBadge plan={currentUser.plan} size="md" />
                </div>
                <p className="text-xs text-slate-500">@{username}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Change DP
                  </button>
                  {avatarUrl && (
                    <>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove DP
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Plan Tier
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs border border-slate-200 dark:border-slate-600 hover:border-emerald-500 transition-colors"
              >
                {currentUser.plan.toUpperCase()}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
          />

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Profile</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Handle
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                About / Bio Status
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Avatar Fallback Color options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Fallback Initial Color
              </label>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setAvatarColor(col)}
                    className={`px-3 py-1 rounded-lg text-xs capitalize border transition-all ${
                      avatarColor === col
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div className="pt-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preferences</h4>

              {/* Dark Mode */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-slate-500" />}
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Dark Mode
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Toggle dark and light application theme
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={onToggleDarkMode}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                />
              </div>

              {/* View Once Media Protection */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      View Once Media Protection
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Disallow re-opening and enforce 1-time view
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={viewOnceProtection}
                  onChange={(e) => setViewOnceProtection(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                />
              </div>

              {/* Read Receipts */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Read Receipts
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Show double green checkmarks when messages are read
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {loading ? 'Saving Changes...' : 'Save Profile & Settings'}
            </button>
          </form>

          {/* Account info & Logout */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              <p>Email: {currentUser.email}</p>
              <p className="mt-0.5">PulseChat ID: {currentUser.id.slice(0, 8)}</p>
            </div>

            <button
              onClick={onLogout}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
