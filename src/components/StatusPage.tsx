import React, { useState, useEffect, useRef } from 'react';
import { User, StatusUpdate, ContactStatusGroup } from '../types';
import { Avatar } from './Avatar';
import { api } from '../services/api';
import { 
  Plus, 
  CircleDashed, 
  Trash2, 
  Eye, 
  X, 
  Upload, 
  Type, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';

interface StatusPageProps {
  currentUser: User;
}

export const StatusPage: React.FC<StatusPageProps> = ({ currentUser }) => {
  const [myStatuses, setMyStatuses] = useState<StatusUpdate[]>([]);
  const [contactsStatuses, setContactsStatuses] = useState<ContactStatusGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Status creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'photo' | 'poster'>('poster');
  const [posterText, setPosterText] = useState('');
  const [posterBg, setPosterBg] = useState('#064E3B'); // Dark forest green default
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Story Viewer state
  const [viewerGroup, setViewerGroup] = useState<{
    userName: string;
    isMine: boolean;
    updates: StatusUpdate[];
  } | null>(null);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  // Viewers list modal for owner
  const [showViewersList, setShowViewersList] = useState<StatusUpdate | null>(null);

  useEffect(() => {
    loadStatuses();
    const unsub = api.onWsMessage((event) => {
      if (event.type === 'status:created' || event.type === 'status:viewed') {
        loadStatuses();
      }
    });
    return () => unsub();
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await api.getStatuses();
      setMyStatuses(res.myStatuses);
      setContactsStatuses(res.contactsStatuses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Story Timer effect
  useEffect(() => {
    if (!viewerGroup) {
      setStoryProgress(0);
      return;
    }

    const currentUpdate = viewerGroup.updates[currentUpdateIndex];
    if (currentUpdate && !viewerGroup.isMine) {
      // Record view
      api.viewStatus(currentUpdate.id);
    }

    setStoryProgress(0);
    const interval = 50; // step
    const duration = 5000; // 5 seconds per story
    const stepIncrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Advance to next story
          if (currentUpdateIndex < viewerGroup.updates.length - 1) {
            setCurrentUpdateIndex((i) => i + 1);
            return 0;
          } else {
            // End of story group
            setViewerGroup(null);
            return 0;
          }
        }
        return prev + stepIncrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [viewerGroup, currentUpdateIndex]);

  // Handle photo file pick
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setCreateMode('photo');
    };
    reader.readAsDataURL(file);
  };

  // Submit new status
  const handleCreateStatus = async () => {
    try {
      if (createMode === 'poster') {
        if (!posterText.trim()) return;
        await api.createStatus({
          type: 'poster',
          caption: posterText.trim(),
          posterBg,
        });
      } else {
        if (!photoUrl) return;
        const uploadRes = await api.uploadFile(photoUrl, `status_${Date.now()}.jpg`, 'image/jpeg');
        await api.createStatus({
          type: 'photo',
          mediaUrl: uploadRes.url,
          caption: photoCaption.trim(),
        });
      }

      setShowCreateModal(false);
      setPosterText('');
      setPhotoUrl(null);
      setPhotoCaption('');
      loadStatuses();
    } catch (err: any) {
      alert(err.message || 'Failed to post status');
    }
  };

  // Delete status
  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Delete this status update?')) return;
    try {
      await api.deleteStatus(statusId);
      if (viewerGroup && viewerGroup.updates.length <= 1) {
        setViewerGroup(null);
      }
      loadStatuses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete status');
    }
  };

  // Time remaining before 24h expiration
  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expires = created + 24 * 60 * 60 * 1000;
    const diffHours = Math.max(0, Math.round((expires - Date.now()) / (1000 * 60 * 60)));
    return `${diffHours}h remaining`;
  };

  const POSTER_COLORS = [
    { name: 'Dark Forest', hex: '#064E3B' },
    { name: 'Fresh Emerald', hex: '#059669' },
    { name: 'Light Mint', hex: '#10B981' },
    { name: 'Midnight Navy', hex: '#0F172A' },
    { name: 'Plum Purple', hex: '#581C87' },
    { name: 'Warm Terracotta', hex: '#9A3412' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F9FAF8] dark:bg-slate-950 p-4 md:p-8 select-none">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Status</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Share photos, videos and posters that vanish after 24 hours.
          </p>
        </div>

        {/* ----------------- My Status Card ----------------- */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <Avatar
                name={currentUser.name}
                avatarUrl={currentUser.avatarUrl}
                avatarColor={currentUser.avatarColor}
                size="lg"
                statusRing={myStatuses.length > 0 ? 'unviewed' : 'none'}
              />
              <button
                onClick={() => setShowCreateModal(true)}
                title="Add status"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 transition-transform active:scale-90"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">My status</h3>
              {myStatuses.length > 0 ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono">
                    {myStatuses.length} active {myStatuses.length === 1 ? 'update' : 'updates'}
                  </span>
                  <button
                    onClick={() => {
                      setViewerGroup({
                        userName: 'My Status',
                        isMine: true,
                        updates: myStatuses,
                      });
                      setCurrentUpdateIndex(0);
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    View
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Tap to add a photo, video or poster</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Status</span>
          </button>
        </div>

        {/* ----------------- Contacts Updates ----------------- */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Recent Updates
          </h2>

          {contactsStatuses.length === 0 ? (
            // EMPTY STATE
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <CircleDashed className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-1">
                No status updates yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Post a photo, video or poster. It stays visible for 24 hours.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Create Your First Status</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-xs">
              {contactsStatuses.map((contact) => (
                <div
                  key={contact.userId}
                  onClick={() => {
                    setViewerGroup({
                      userName: contact.userName,
                      isMine: false,
                      updates: contact.updates,
                    });
                    setCurrentUpdateIndex(0);
                  }}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={contact.userName}
                      avatarUrl={contact.avatarUrl}
                      avatarColor={contact.avatarColor}
                      size="md"
                      statusRing={contact.hasUnviewed ? 'unviewed' : 'viewed'}
                    />

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {contact.userName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {getTimeRemaining(contact.updates[0].createdAt)}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    View
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ----------------- Create Status Modal ----------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Status</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="flex p-2 bg-slate-100 dark:bg-slate-800 m-4 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setCreateMode('poster')}
                className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                  createMode === 'poster' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Poster</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                  createMode === 'photo' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photo / Media</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <div className="px-4 pb-4 space-y-4">
              {createMode === 'poster' ? (
                <div>
                  {/* Poster Preview Canvas */}
                  <div
                    style={{ backgroundColor: posterBg }}
                    className="w-full h-48 rounded-2xl p-6 flex items-center justify-center text-center text-white font-bold text-lg shadow-inner overflow-hidden"
                  >
                    <p className="break-words max-h-full overflow-y-auto">
                      {posterText || 'Type your status update...'}
                    </p>
                  </div>

                  {/* Text Input */}
                  <div className="mt-3">
                    <textarea
                      value={posterText}
                      onChange={(e) => setPosterText(e.target.value)}
                      placeholder="What is on your mind?"
                      rows={2}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Poster Color:
                    </span>
                    <div className="flex gap-2">
                      {POSTER_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setPosterBg(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full transition-transform ${
                            posterBg === c.hex ? 'scale-115 ring-2 ring-offset-2 ring-emerald-500' : ''
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {photoUrl && (
                    <div className="w-full h-56 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center mb-3">
                      <img src={photoUrl} alt="preview" className="max-h-full object-contain" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStatus}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  Post Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Fullscreen Story Viewer ----------------- */}
      {viewerGroup && viewerGroup.updates[currentUpdateIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 select-none">
          {/* Top Segmented Progress Bar */}
          <div className="absolute top-4 left-4 right-4 max-w-lg mx-auto flex gap-1 z-30">
            {viewerGroup.updates.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      i < currentUpdateIndex
                        ? '100%'
                        : i === currentUpdateIndex
                        ? `${storyProgress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Top Header */}
          <div className="absolute top-8 left-4 right-4 max-w-lg mx-auto flex items-center justify-between text-white z-30">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm">{viewerGroup.userName}</span>
              <span className="text-[11px] text-white/70">
                {getTimeRemaining(viewerGroup.updates[currentUpdateIndex].createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {viewerGroup.isMine && (
                <button
                  onClick={() => handleDeleteStatus(viewerGroup.updates[currentUpdateIndex].id)}
                  title="Delete this status"
                  className="p-1.5 rounded-full bg-white/20 hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setViewerGroup(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Story Content Canvas */}
          <div className="relative w-full max-w-lg h-[75vh] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
            {viewerGroup.updates[currentUpdateIndex].type === 'poster' ? (
              <div
                style={{
                  backgroundColor: viewerGroup.updates[currentUpdateIndex].posterBg || '#064E3B',
                }}
                className="w-full h-full p-8 flex items-center justify-center text-center text-white text-2xl font-bold"
              >
                <p className="break-words leading-relaxed">
                  {viewerGroup.updates[currentUpdateIndex].caption}
                </p>
              </div>
            ) : (
              <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                <img
                  src={viewerGroup.updates[currentUpdateIndex].mediaUrl!}
                  alt="Status"
                  className="max-h-full max-w-full object-contain"
                />
                {viewerGroup.updates[currentUpdateIndex].caption && (
                  <div className="absolute bottom-6 left-4 right-4 p-3 bg-black/60 backdrop-blur-xs rounded-xl text-white text-xs text-center">
                    {viewerGroup.updates[currentUpdateIndex].caption}
                  </div>
                )}
              </div>
            )}

            {/* Click Navigation Areas (Tap left / right) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
              onClick={() => {
                if (currentUpdateIndex > 0) setCurrentUpdateIndex((i) => i - 1);
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
              onClick={() => {
                if (currentUpdateIndex < viewerGroup.updates.length - 1) {
                  setCurrentUpdateIndex((i) => i + 1);
                } else {
                  setViewerGroup(null);
                }
              }}
            />
          </div>

          {/* Viewers Counter for Owner */}
          {viewerGroup.isMine && (
            <div className="mt-4 flex items-center gap-1.5 text-white/80 text-xs">
              <Eye className="w-4 h-4" />
              <span>
                Viewed by {viewerGroup.updates[currentUpdateIndex].viewers.length} people
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
