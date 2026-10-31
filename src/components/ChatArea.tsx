import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, User } from '../types';
import { Avatar } from './Avatar';
import { SubscriptionBadge } from './SubscriptionBadge';
import { api } from '../services/api';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Eye,
  FileText,
  Music,
  Check,
  CheckCheck,
  CornerDownRight,
  SmilePlus,
  Trash2,
  Edit2,
  X,
  Play,
  Pause,
  Download,
  AlertCircle,
  Hash,
  Users,
  UserPlus
} from 'lucide-react';

interface ChatAreaProps {
  currentUser: User;
  conversation: Conversation | null;
  onOpenAddContacts: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onBackToConversations?: () => void;
}

const EMOJI_LIST = ['😊', '😂', '🔥', '❤️', '👍', '🎉', '🙌', '✨', '🙏', '😍', '👏', '🚀', '💯', '😎', '💡', '🌟', '🌿', '🍃', '🥳', '👀'];

const STICKER_PACK = [
  { name: 'Minty Wave', emoji: '👋', color: 'bg-emerald-100 text-emerald-800' },
  { name: 'High Five', emoji: '🙌', color: 'bg-teal-100 text-teal-800' },
  { name: 'Pure Spark', emoji: '✨', color: 'bg-amber-100 text-amber-800' },
  { name: 'Big Heart', emoji: '💚', color: 'bg-emerald-200 text-emerald-900' },
  { name: 'Rocket Launch', emoji: '🚀', color: 'bg-blue-100 text-blue-800' },
  { name: 'Coffee Break', emoji: '☕', color: 'bg-orange-100 text-orange-800' },
];

const GIF_PACK = [
  { id: '1', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '2', title: 'Celebration', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '3', title: 'Typing Cat', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
  { id: '4', title: 'Hello Wave', url: 'https://media.giphy.com/media/mG14fQspq4f55T4O00/giphy.gif' },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  conversation,
  onOpenAddContacts,
  onStartCall,
  onBackToConversations,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Pickers & Attachments
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'stickers' | 'gifs'>('emoji');
  const [gifSearch, setGifSearch] = useState('');

  // Replying & Editing
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // In-chat search
  const [showSearch, setShowSearch] = useState(false);
  const [searchWord, setSearchWord] = useState('');

  // Audio Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // View Once modal
  const [viewOnceActive, setViewOnceActive] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const viewOnceInputRef = useRef<HTMLInputElement | null>(null);

  // Load messages whenever conversation changes
  useEffect(() => {
    if (!conversation) return;
    
    // Set default channel for spaces
    if (conversation.type === 'space' && conversation.channels && conversation.channels.length > 0) {
      setSelectedChannelId(conversation.channels[0].id);
    } else {
      setSelectedChannelId(null);
    }

    loadMessages();

    // Mark as read
    api.markConversationRead(conversation.id);

    // Listen to real-time events
    const unsubscribe = api.onWsMessage((event) => {
      if (event.type === 'chat:message' && event.conversationId === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          return [...prev, event.message];
        });
        scrollToBottom();
        api.markConversationRead(conversation.id);
      } else if (event.type === 'message:updated') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, content: event.content, isEdited: true } : m
          )
        );
      } else if (event.type === 'message:deleted') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
          )
        );
      } else if (event.type === 'message:reactions') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, reactions: event.reactions } : m
          )
        );
      } else if (event.type === 'message:view_once_opened') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === event.messageId) {
              const viewedBy = m.viewedBy ? [...m.viewedBy] : [];
              if (!viewedBy.includes(event.userId)) viewedBy.push(event.userId);
              return { ...m, viewedBy };
            }
            return m;
          })
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id, selectedChannelId]);

  const loadMessages = async () => {
    if (!conversation) return;
    try {
      const res = await api.getMessages(conversation.id, selectedChannelId || undefined);
      setMessages(res.messages);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversation) return;

    if (editingMessage) {
      // Edit mode
      try {
        await api.editMessage(editingMessage.id, inputText);
        setEditingMessage(null);
        setInputText('');
      } catch (err: any) {
        alert(err.message || 'Failed to edit message');
      }
      return;
    }

    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');

    try {
      await api.sendMessage(conversation.id, {
        content,
        channelId: selectedChannelId,
        type: 'text',
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              content: replyingTo.content,
            }
          : null,
      });
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error('Send message failed:', err);
    }
  };

  // Upload file / photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isViewOnce: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      let msgType = 'file';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

      try {
        const uploadRes = await api.uploadFile(dataUrl, file.name, file.type);
        await api.sendMessage(conversation.id, {
          content: isViewOnce ? 'View once photo' : file.name,
          type: msgType,
          mediaUrl: uploadRes.url,
          mediaName: file.name,
          mediaSize: file.size,
          isViewOnce,
          channelId: selectedChannelId,
        });
      } catch (err: any) {
        alert('File upload failed: ' + err.message);
      } finally {
        setShowAttachMenu(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // View once open handler
  const handleOpenViewOnce = async (msg: Message) => {
    try {
      const res = await api.openViewOnce(msg.id);
      setViewOnceActive({
        url: res.mediaUrl,
        name: res.mediaName,
        type: res.mediaType,
      });
      // Locally update message as viewed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, viewedBy: [...(m.viewedBy || []), currentUser.id] }
            : m
        )
      );
    } catch (err: any) {
      alert(err.message || 'View Once media has expired');
    }
  };

  // Voice note recorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          if (conversation) {
            const uploadRes = await api.uploadFile(dataUrl, `voice_note_${Date.now()}.webm`, 'audio/webm');
            await api.sendMessage(conversation.id, {
              content: 'Voice Note',
              type: 'audio',
              mediaUrl: uploadRes.url,
              mediaName: 'Voice Note',
              mediaDuration: recordingSeconds,
              channelId: selectedChannelId,
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Audio Playback
  const togglePlayAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Reactions
  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await api.reactMessage(msgId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteMessage(msgId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // -------------------------------------------------------------------------
  // INITIAL EMPTY STATE WHEN NO CONVERSATION IS SELECTED
  // -------------------------------------------------------------------------
  if (!conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#F9FAF8] dark:bg-slate-950 p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-[#D1FAE5] dark:bg-emerald-950/80 flex items-center justify-center mb-6 shadow-sm">
          <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
            <path
              d="M8 18.5C8 12.1487 13.3726 7 20 7C26.6274 7 32 12.1487 32 18.5C32 24.8513 26.6274 30 20 30C18.1523 30 16.4027 29.6054 14.8524 28.8953L8 31.5L9.95763 25.8778C8.7303 23.7386 8 21.2186 8 18.5Z"
              fill="#10B981"
            />
          </svg>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">
          Your inbox is wonderfully quiet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          Add a friend using their PulseChat username to start your first conversation.
        </p>

        <button
          onClick={onOpenAddContacts}
          className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add your first contact</span>
        </button>
      </div>
    );
  }

  // Filter messages if search is active
  const visibleMessages = searchWord.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchWord.toLowerCase()))
    : messages;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#F9FAF8] dark:bg-slate-950 overflow-hidden relative">
      
      {/* ----------------- Top Header ----------------- */}
      <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToConversations && (
            <button
              onClick={onBackToConversations}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            {conversation.type === 'direct' ? (
              <Avatar
                name={conversation.name}
                avatarUrl={conversation.avatarUrl}
                avatarColor={conversation.avatarColor || 'mint'}
                size="md"
                isOnline={conversation.isOnline}
                showOnlineStatus={true}
              />
            ) : conversation.type === 'group' ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {conversation.name}
              </h3>
              {conversation.type === 'direct' && (
                <SubscriptionBadge plan={conversation.partnerPlan} size="sm" />
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {conversation.type === 'direct' ? (
                conversation.isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                ) : (
                  <span>@{conversation.partnerUsername || 'user'}</span>
                )
              ) : (
                <span>{conversation.membersCount} members</span>
              )}
            </p>
          </div>
        </div>

        {/* Space Channels Bar if Space */}
        {conversation.type === 'space' && conversation.channels && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {conversation.channels.map((chan) => (
              <button
                key={chan.id}
                onClick={() => setSelectedChannelId(chan.id)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedChannelId === chan.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                #{chan.name}
              </button>
            ))}
          </div>
        )}

        {/* Header Action Buttons: Voice Call, Video Call, Search */}
        <div className="flex items-center gap-1 md:gap-2">
          {conversation.type === 'direct' && (
            <>
              <button
                onClick={() => onStartCall('voice')}
                title="Start Voice Call"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall('video')}
                title="Start Video Call"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search messages"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showSearch
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* In-chat search bar */}
      {showSearch && (
        <div className="px-6 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-emerald-600" />
            <input
              type="text"
              autoFocus
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              placeholder="Search in this conversation..."
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchWord('');
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ----------------- Messages Scroll Area ----------------- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {searchWord ? 'No messages match your search.' : 'Send a friendly message to say hello!'}
            </p>
          </div>
        ) : (
          visibleMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const isViewOnceOpened = msg.isViewOnce && msg.viewedBy && msg.viewedBy.length > 0;

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Other User Avatar */}
                {!isMe && (
                  <Avatar
                    name={msg.senderName}
                    avatarUrl={msg.senderAvatar}
                    avatarColor={msg.senderColor}
                    size="sm"
                  />
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-xs transition-shadow ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs border border-slate-100 dark:border-slate-700/60'
                  }`}
                >
                  {/* Sender Name in Group/Space */}
                  {!isMe && conversation.type !== 'direct' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {msg.senderName}
                      </span>
                      <SubscriptionBadge plan={msg.senderPlan} size="sm" />
                    </div>
                  )}

                  {/* Quoted Reply Banner */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-xs border-l-2 flex flex-col ${
                        isMe
                          ? 'bg-emerald-700/50 border-white text-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-700/60 border-emerald-500 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-[10px]">{msg.replyTo.senderName}</span>
                      <span className="truncate text-[11px]">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Message Content by Type */}
                  {msg.isDeleted ? (
                    <p className="text-xs italic opacity-75">This message was deleted</p>
                  ) : msg.isViewOnce ? (
                    // VIEW ONCE MESSAGE CARD
                    <div className="p-3 bg-slate-900/10 dark:bg-slate-700/50 rounded-xl flex items-center justify-between gap-3 min-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none">Photo</p>
                          <p className="text-[10px] opacity-80 mt-1">
                            {isViewOnceOpened ? 'Opened' : 'View once'}
                          </p>
                        </div>
                      </div>

                      {isViewOnceOpened ? (
                        <span className="text-xs font-semibold opacity-70">Opened</span>
                      ) : (
                        <button
                          onClick={() => handleOpenViewOnce(msg)}
                          className="py-1 px-3 bg-white text-emerald-800 dark:bg-slate-900 dark:text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ) : msg.type === 'image' && msg.mediaUrl ? (
                    <div className="rounded-xl overflow-hidden mb-1 cursor-pointer">
                      <img
                        src={msg.mediaUrl}
                        alt="attachment"
                        className="max-h-72 w-full object-cover rounded-xl"
                        onClick={() => window.open(msg.mediaUrl!, '_blank')}
                      />
                      {msg.content && <p className="text-xs mt-2">{msg.content}</p>}
                    </div>
                  ) : msg.type === 'video' && msg.mediaUrl ? (
                    <div className="rounded-xl overflow-hidden mb-1">
                      <video src={msg.mediaUrl} controls className="max-h-72 w-full rounded-xl" />
                      {msg.content && <p className="text-xs mt-2">{msg.content}</p>}
                    </div>
                  ) : msg.type === 'audio' && msg.mediaUrl ? (
                    <div className="flex items-center gap-3 p-2 min-w-[220px]">
                      <button
                        onClick={() => togglePlayAudio(msg.mediaUrl!, msg.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isMe ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-5">
                          {[3, 7, 5, 8, 4, 9, 6, 4, 7, 5, 8, 3, 6, 7].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${h * 2}px` }}
                              className={`w-1 rounded-full ${
                                isMe ? 'bg-white/80' : 'bg-emerald-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono opacity-80 mt-1 block">
                          Voice Note • {msg.mediaDuration ? `${msg.mediaDuration}s` : 'Audio'}
                        </span>
                      </div>
                    </div>
                  ) : msg.type === 'file' && msg.mediaUrl ? (
                    <div className="flex items-center gap-3 p-2 min-w-[200px]">
                      <FileText className="w-8 h-8 opacity-90" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{msg.mediaName || 'Document'}</p>
                        <p className="text-[10px] opacity-75">
                          {msg.mediaSize ? `${Math.round(msg.mediaSize / 1024)} KB` : 'File'}
                        </p>
                      </div>
                      <a
                        href={msg.mediaUrl}
                        download={msg.mediaName || 'file'}
                        className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:opacity-100"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    // Regular Text
                    <p className="text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Footer: Timestamp, Edit marker & Read Status */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono select-none ${
                      isMe ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.isEdited && <span>(edited)</span>}
                    <span>{timeStr}</span>
                    {isMe && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 opacity-75" />
                        ) : (
                          <Check className="w-3.5 h-3.5 opacity-75" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Reactions Pill Display */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleReact(msg.id, r.emoji)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-transform active:scale-95 ${
                            r.userIds.includes(currentUser.id)
                              ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                              : 'bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[10px]">{r.userIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Action Toolbar (Hover on Desktop) */}
                  {!msg.isDeleted && (
                    <div
                      className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 z-10 ${
                        isMe ? 'right-2' : 'left-2'
                      }`}
                    >
                      {/* Quick Emoji Reaction buttons */}
                      {['❤️', '👍', '😂'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className="hover:scale-125 transition-transform text-xs p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}

                      <button
                        onClick={() => setReplyingTo(msg)}
                        title="Reply"
                        className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
                      >
                        <CornerDownRight className="w-3 h-3" />
                      </button>

                      {isMe && msg.type === 'text' && (
                        <button
                          onClick={() => {
                            setEditingMessage(msg);
                            setInputText(msg.content);
                          }}
                          title="Edit message"
                          className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ----------------- View Once Viewer Modal ----------------- */}
      {viewOnceActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 select-none">
          <div className="absolute top-4 right-4 flex items-center gap-4">
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-800">
              View Once Mode
            </span>
            <button
              onClick={() => setViewOnceActive(null)}
              className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-3xl max-h-[80vh] flex flex-col items-center">
            <img
              src={viewOnceActive.url}
              alt="View once content"
              className="max-h-[70vh] rounded-2xl object-contain shadow-2xl"
              onContextMenu={(e) => e.preventDefault()}
            />
            <p className="text-xs text-slate-400 mt-4 text-center max-w-md">
              This photo vanishes after you close it. Note: External recording cannot be completely prevented.
            </p>
          </div>
        </div>
      )}

      {/* ----------------- Replying / Editing Banner ----------------- */}
      {replyingTo && (
        <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-emerald-600" />
            <div className="text-xs truncate">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Replying to {replyingTo.senderName}:{' '}
              </span>
              <span className="text-slate-600 dark:text-slate-400">{replyingTo.content}</span>
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-100 dark:border-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold truncate">
              Editing Message
            </span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ----------------- Pickers: Emojis, Stickers, GIFs ----------------- */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 md:left-6 z-30 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 animate-in fade-in slide-in-from-bottom-2">
          {/* Picker Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 text-xs font-semibold">
            <button
              onClick={() => setPickerTab('emoji')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                pickerTab === 'emoji' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Emojis
            </button>
            <button
              onClick={() => setPickerTab('stickers')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                pickerTab === 'stickers' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Stickers
            </button>
            <button
              onClick={() => setPickerTab('gifs')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                pickerTab === 'gifs' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              GIFs
            </button>
          </div>

          {/* Emoji Grid */}
          {pickerTab === 'emoji' && (
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="text-xl p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 transition-transform text-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Sticker Grid */}
          {pickerTab === 'stickers' && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {STICKER_PACK.map((stk, i) => (
                <button
                  key={i}
                  onClick={() => {
                    api.sendMessage(conversation.id, {
                      content: stk.name,
                      type: 'sticker',
                      mediaName: stk.emoji,
                      channelId: selectedChannelId,
                    });
                    setShowEmojiPicker(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl hover:scale-105 transition-transform ${stk.color}`}
                >
                  <span className="text-2xl">{stk.emoji}</span>
                  <span className="text-[10px] font-semibold mt-1">{stk.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* GIF Grid */}
          {pickerTab === 'gifs' && (
            <div className="space-y-2">
              <input
                type="text"
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                placeholder="Search GIFs..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {GIF_PACK.filter((g) => g.title.toLowerCase().includes(gifSearch.toLowerCase())).map(
                  (gif) => (
                    <div
                      key={gif.id}
                      onClick={() => {
                        api.sendMessage(conversation.id, {
                          content: gif.title,
                          type: 'gif',
                          mediaUrl: gif.url,
                          channelId: selectedChannelId,
                        });
                        setShowEmojiPicker(false);
                      }}
                      className="cursor-pointer rounded-lg overflow-hidden hover:opacity-85 transition-opacity"
                    >
                      <img src={gif.url} alt={gif.title} className="w-full h-20 object-cover" />
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- Attachment Popup ----------------- */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-4 md:left-6 z-30 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2">
          {/* Normal Photo/Video */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Send Photo / Media</span>
          </button>

          {/* View Once Photo */}
          <button
            onClick={() => viewOnceInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 cursor-pointer"
          >
            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
              1
            </div>
            <span>Send as View Once</span>
          </button>

          {/* Document / File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Document / File</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileUpload(e, false)}
      />
      <input
        ref={viewOnceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, true)}
      />

      {/* ----------------- Message Composer ----------------- */}
      <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
        {isRecording ? (
          // Recording Audio UI
          <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/60">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Recording Voice Note ({recordingSeconds}s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => stopRecording(true)}
                className="py-1 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-red-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => stopRecording(false)}
                className="py-1 px-3 bg-red-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-red-700"
              >
                Send Audio
              </button>
            </div>
          </div>
        ) : (
          // Regular Composer
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(!showAttachMenu);
                setShowEmojiPicker(false);
              }}
              title="Attach media or View Once photo"
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Emoji / Sticker / GIF Button */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachMenu(false);
              }}
              title="Emojis, Stickers, GIFs"
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs md:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
              />
            </div>

            {/* Voice Record Button or Send Button */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                title="Record Voice Note"
                className="p-2.5 rounded-2xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>

    </div>
  );
};
