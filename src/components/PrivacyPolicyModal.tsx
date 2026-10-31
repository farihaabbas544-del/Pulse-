import React from 'react';
import { PulseChatLogo } from './PulseChatLogo';
import { X, ShieldCheck, Lock, EyeOff, Database, Trash2, Key, Users } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PulseChatLogo size="sm" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                PulseChat Privacy Policy
              </h2>
              <p className="text-xs text-slate-400">Last updated: October 2026 · Official Transparency Disclosure</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-emerald-900 dark:text-emerald-200">
              PulseChat is committed to preserving digital privacy, minimizing user data exposure, and providing transparent controls over your conversations, media, and contact relations.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>1. Account Information & Usernames</span>
            </h3>
            <p>
              When you register on PulseChat, we collect your full name, unique handle (e.g. <code>@username</code>), and email address. Your username serves as your public address across PulseChat, allowing teammates and contacts to find and message you without exposing private telephone numbers or personal identifiers.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>2. Messages & Secure Delivery</span>
            </h3>
            <p>
              Direct conversations, group discussions, and spaces are delivered using real-time WebSockets and stored securely on persistent database servers. Messages support text, file attachments, voice memos, stickers, and reactions. You have the ability to edit or delete your messages at any time.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              <span>3. View Once Media Protection</span>
            </h3>
            <p>
              When you choose <strong>Send as View Once</strong>, media is locked behind one-time cryptographic viewing authorization. The instant the recipient opens and closes the image, access is revoked permanently on the server. While PulseChat prohibits re-opening, users should exercise discretion as no web application can prevent physical external camera recordings.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>4. Status Updates & 24-Hour Expiration</span>
            </h3>
            <p>
              Status stories (photos, videos, posters) are published strictly to your contact network and are automatically purged from active delivery after 24 hours. Status owners have direct access to their viewer logs and can delete any status item before expiration.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>5. Security Practices & Password Hashing</span>
            </h3>
            <p>
              User passwords are salted and cryptographically hashed with PBKDF2 (SHA-512) before storage. PulseChat never stores plain-text passwords or credit card numbers. Payment transactions are processed directly by certified payment gateways (Razorpay) adhering to PCI-DSS Level 1 specifications.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-emerald-600" />
              <span>6. Data Retention, Deletion & User Rights</span>
            </h3>
            <p>
              In compliance with GDPR and international data standards, you have the right to export your communication history or request immediate deletion of your account and associated media assets by contacting our privacy compliance desk.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors hover:opacity-90"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
};
