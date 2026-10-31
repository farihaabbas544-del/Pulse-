export type UserPlan = 'free' | 'plus' | 'pro';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string;
  about: string;
  plan: UserPlan;
  planRenewsAt: string | null;
  verified: boolean;
  createdAt: string;
  settings: {
    darkMode: boolean;
    viewOnceProtection: boolean;
    readReceipts: boolean;
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    notifications: boolean;
  };
}

export interface Contact {
  id: string;
  contactUserId: string;
  nickname: string;
  description: string;
  avatarColor: string;
  avatarUrl: string | null;
  username: string;
  plan: UserPlan;
  isOnline: boolean;
  createdAt: string;
}

export interface ConversationMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface SpaceChannel {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'canvas' | 'polls';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'space';
  name: string;
  description: string;
  avatarUrl: string | null;
  avatarColor?: string;
  partnerUsername?: string | null;
  partnerPlan?: UserPlan | null;
  isOnline?: boolean;
  membersCount: number;
  members: ConversationMember[];
  channels?: SpaceChannel[];
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    type: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  channelId?: string | null;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string | null;
  senderColor: string;
  senderPlan?: UserPlan;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker' | 'gif' | 'poll' | 'canvas';
  mediaUrl: string | null;
  mediaName: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  isViewOnce?: boolean;
  viewedBy?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  reactions: MessageReaction[];
  status: 'sent' | 'delivered' | 'read';
  readBy: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export interface StatusViewer {
  userId: string;
  viewedAt: string;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  type: 'photo' | 'video' | 'poster';
  mediaUrl: string | null;
  posterBg: string | null;
  posterFont: string | null;
  caption: string;
  viewers: StatusViewer[];
  createdAt: string;
}

export interface ContactStatusGroup {
  userId: string;
  userName: string;
  username: string;
  avatarUrl: string | null;
  avatarColor: string;
  plan: UserPlan;
  hasUnviewed: boolean;
  updates: StatusUpdate[];
}

export interface PaymentRecord {
  id: string;
  userId: string;
  orderId: string;
  paymentId: string;
  plan: 'plus' | 'pro';
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  method: 'card' | 'upi';
  createdAt: string;
}
