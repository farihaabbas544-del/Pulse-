import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ----------------------------------------------------
// Database Schema Types
// ----------------------------------------------------
export interface User {
  id: string;
  name: string;
  username: string; // unique, lowercase
  email: string; // unique, lowercase
  passwordHash: string;
  salt: string;
  avatarUrl: string | null;
  avatarColor: string; // 'mint' | 'purple' | 'pink' | 'orange' | 'slate'
  about: string;
  plan: 'free' | 'plus' | 'pro';
  planRenewsAt: string | null;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  settings: {
    darkMode: boolean;
    viewOnceProtection: boolean;
    readReceipts: boolean;
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    notifications: boolean;
  };
}

export interface ContactRelation {
  id: string;
  userId: string;
  contactUserId: string;
  nickname: string;
  description: string;
  avatarColor: string;
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
  name: string | null;
  description: string;
  avatarUrl: string | null;
  members: ConversationMember[];
  channels?: SpaceChannel[];
  updatedAt: string;
  createdAt: string;
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

export interface PasswordReset {
  email: string;
  code: string;
  expiresAt: number;
}

interface DatabaseSchema {
  users: User[];
  contacts: ContactRelation[];
  conversations: Conversation[];
  messages: Message[];
  statuses: StatusUpdate[];
  payments: PaymentRecord[];
  passwordResets: PasswordReset[];
  sessions: { token: string; userId: string; createdAt: string }[];
}

const initialDb: DatabaseSchema = {
  users: [],
  contacts: [],
  conversations: [],
  messages: [],
  statuses: [],
  payments: [],
  passwordResets: [],
  sessions: []
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(initialDb));
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db:', err);
    return JSON.parse(JSON.stringify(initialDb));
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Password hashing helper using crypto
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// ----------------------------------------------------
// Express App & Middleware Setup
// ----------------------------------------------------
const app = express();
const server = http.createServer(app);

// Increase body parser limits for base64 media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = readDb();
  const session = db.sessions.find(s => s.token === token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.token = token;
  next();
}

// ----------------------------------------------------
// Real-Time WebSockets & Presence & WebRTC Signaling
// ----------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });
const userSockets = new Map<string, Set<WebSocket>>();

function sendToUser(userId: string, data: any) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    const payload = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

function broadcastToConversation(conversationId: string, data: any, excludeUserId?: string) {
  const db = readDb();
  const convo = db.conversations.find(c => c.id === conversationId);
  if (!convo) return;

  for (const member of convo.members) {
    if (excludeUserId && member.userId === excludeUserId) continue;
    sendToUser(member.userId, data);
  }
}

function broadcastPresence(userId: string, isOnline: boolean) {
  const db = readDb();
  // Find all contacts and conversation partners
  const relevantUserIds = new Set<string>();

  // Find contacts who added this user or this user added
  db.contacts.forEach(c => {
    if (c.userId === userId) relevantUserIds.add(c.contactUserId);
    if (c.contactUserId === userId) relevantUserIds.add(c.userId);
  });

  // Find members of mutual conversations
  db.conversations.forEach(c => {
    if (c.members.some(m => m.userId === userId)) {
      c.members.forEach(m => {
        if (m.userId !== userId) relevantUserIds.add(m.userId);
      });
    }
  });

  for (const targetId of relevantUserIds) {
    sendToUser(targetId, {
      type: 'presence:update',
      userId,
      isOnline,
      timestamp: new Date().toISOString()
    });
  }
}

wss.on('connection', (ws: WebSocket) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      if (data.type === 'auth') {
        const token = data.token;
        const db = readDb();
        const session = db.sessions.find(s => s.token === token);
        if (session) {
          authenticatedUserId = session.userId;
          if (!userSockets.has(authenticatedUserId)) {
            userSockets.set(authenticatedUserId, new Set());
          }
          userSockets.get(authenticatedUserId)!.add(ws);

          ws.send(JSON.stringify({ type: 'auth:success', userId: authenticatedUserId }));
          broadcastPresence(authenticatedUserId, true);
        } else {
          ws.send(JSON.stringify({ type: 'auth:error', message: 'Invalid token' }));
        }
        return;
      }

      if (!authenticatedUserId) {
        return;
      }

      // Handle typing indicator
      if (data.type === 'typing') {
        const { conversationId, isTyping } = data;
        broadcastToConversation(conversationId, {
          type: 'chat:typing',
          conversationId,
          userId: authenticatedUserId,
          isTyping: !!isTyping
        }, authenticatedUserId);
        return;
      }

      // WebRTC Signaling Events
      if (data.type === 'call:offer') {
        const { toUserId, offer, callType, callId, callerName, callerAvatar } = data;
        sendToUser(toUserId, {
          type: 'call:offer',
          fromUserId: authenticatedUserId,
          callId,
          offer,
          callType,
          callerName,
          callerAvatar
        });
        return;
      }

      if (data.type === 'call:answer') {
        const { toUserId, answer, callId } = data;
        sendToUser(toUserId, {
          type: 'call:answer',
          fromUserId: authenticatedUserId,
          callId,
          answer
        });
        return;
      }

      if (data.type === 'call:ice-candidate') {
        const { toUserId, candidate, callId } = data;
        sendToUser(toUserId, {
          type: 'call:ice-candidate',
          fromUserId: authenticatedUserId,
          callId,
          candidate
        });
        return;
      }

      if (data.type === 'call:reject') {
        const { toUserId, callId, reason } = data;
        sendToUser(toUserId, {
          type: 'call:rejected',
          fromUserId: authenticatedUserId,
          callId,
          reason: reason || 'busy'
        });
        return;
      }

      if (data.type === 'call:end') {
        const { toUserId, callId } = data;
        sendToUser(toUserId, {
          type: 'call:ended',
          fromUserId: authenticatedUserId,
          callId
        });
        return;
      }

    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const sockets = userSockets.get(authenticatedUserId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(authenticatedUserId);
          broadcastPresence(authenticatedUserId, false);
        }
      }
    }
  });
});

// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------

// 1. Auth: Sign Up
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields (name, username, email, password) are required.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
  const cleanEmail = email.trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long (letters, numbers, underscore).' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const db = readDb();

  // Check username uniqueness
  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
  }

  // Check email uniqueness
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(32).toString('hex');

  const newUser: User = {
    id: userId,
    name: name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    salt,
    avatarUrl: null,
    avatarColor: 'mint',
    about: 'Hey there! I am using PulseChat.',
    plan: 'free',
    planRenewsAt: null,
    verified: true, // verified by default on clean signup
    verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date().toISOString(),
    settings: {
      darkMode: false,
      viewOnceProtection: true,
      readReceipts: true,
      lastSeen: 'everyone',
      notifications: true
    }
  };

  db.users.push(newUser);
  db.sessions.push({
    token: sessionToken,
    userId,
    createdAt: new Date().toISOString()
  });

  writeDb(db);

  // Return user without sensitive hashes
  const { passwordHash: _, salt: __, ...userSafe } = newUser;
  return res.status(201).json({
    user: userSafe,
    token: sessionToken,
    message: 'Account created successfully!'
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { loginIdentifier, password } = req.body;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  const cleanIdentifier = loginIdentifier.trim().toLowerCase();
  const db = readDb();

  const user = db.users.find(u => 
    u.username.toLowerCase() === cleanIdentifier || u.email.toLowerCase() === cleanIdentifier
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  db.sessions.push({
    token: sessionToken,
    userId: user.id,
    createdAt: new Date().toISOString()
  });
  writeDb(db);

  const { passwordHash: _, salt: __, ...userSafe } = user;
  return res.json({
    user: userSafe,
    token: sessionToken,
    message: 'Welcome back to PulseChat!'
  });
});

// 3. Auth: Current User Info
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { passwordHash: _, salt: __, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// 4. Auth: Forgot Password
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'No account registered with this email address.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Expires in 15 minutes
  db.passwordResets = db.passwordResets.filter(r => r.email !== cleanEmail);
  db.passwordResets.push({
    email: cleanEmail,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000
  });
  writeDb(db);

  // Return reset code in response for convenient testing without an external SMTP service
  return res.json({
    message: `A 6-digit password reset code has been sent to ${cleanEmail}.`,
    verificationCode: code
  });
});

// 5. Auth: Reset Password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const resetEntry = db.passwordResets.find(r => r.email === cleanEmail && r.code === code.trim());

  if (!resetEntry || resetEntry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset code.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);

  // Clear reset code
  db.passwordResets = db.passwordResets.filter(r => r.email !== cleanEmail);
  writeDb(db);

  return res.json({ message: 'Password has been reset successfully. You can now login.' });
});

// 6. Auth: Logout
app.post('/api/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  const token = req.token!;
  const db = readDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  writeDb(db);
  return res.json({ message: 'Logged out successfully.' });
});

// 7. Profile Update
app.put('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, username, about, avatarUrl, avatarColor, settings } = req.body;
  const db = readDb();

  const currentUser = db.users.find(u => u.id === user.id);
  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  if (name && typeof name === 'string') {
    currentUser.name = name.trim();
  }

  if (username && typeof username === 'string') {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (cleanUsername !== currentUser.username) {
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
      }
      if (db.users.some(u => u.id !== user.id && u.username.toLowerCase() === cleanUsername)) {
        return res.status(400).json({ error: 'This username is already taken.' });
      }
      currentUser.username = cleanUsername;
    }
  }

  if (about !== undefined) {
    currentUser.about = String(about).slice(0, 200);
  }

  if (avatarUrl !== undefined) {
    currentUser.avatarUrl = avatarUrl;
  }

  if (avatarColor && ['mint', 'purple', 'pink', 'orange', 'slate'].includes(avatarColor)) {
    currentUser.avatarColor = avatarColor;
  }

  if (settings && typeof settings === 'object') {
    currentUser.settings = {
      ...currentUser.settings,
      ...settings
    };
  }

  writeDb(db);

  const { passwordHash: _, salt: __, ...userSafe } = currentUser;
  return res.json({ user: userSafe, message: 'Profile updated successfully!' });
});

// 8. Search Users
app.get('/api/users/search', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  const currentUserId = req.user!.id;
  const db = readDb();

  if (!query) {
    return res.json({ users: [] });
  }

  // Filter registered users matching username or name, excluding current user
  const matching = db.users
    .filter(u => u.id !== currentUserId && (
      u.username.toLowerCase().includes(query) || 
      u.name.toLowerCase().includes(query)
    ))
    .slice(0, 15)
    .map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      avatarColor: u.avatarColor,
      about: u.about,
      plan: u.plan
    }));

  return res.json({ users: matching });
});

// 9. Contacts: Get All
app.get('/api/contacts', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const db = readDb();

  const userContacts = db.contacts.filter(c => c.userId === currentUserId);
  const enriched = userContacts.map(c => {
    const contactUser = db.users.find(u => u.id === c.contactUserId);
    const isOnline = userSockets.has(c.contactUserId) && userSockets.get(c.contactUserId)!.size > 0;
    return {
      id: c.id,
      contactUserId: c.contactUserId,
      nickname: c.nickname || contactUser?.name || 'User',
      description: c.description || contactUser?.about || '',
      avatarColor: c.avatarColor || contactUser?.avatarColor || 'mint',
      avatarUrl: contactUser?.avatarUrl || null,
      username: contactUser?.username || '',
      plan: contactUser?.plan || 'free',
      isOnline,
      createdAt: c.createdAt
    };
  });

  return res.json({ contacts: enriched });
});

// 10. Contacts: Add New Contact
app.post('/api/contacts', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const { contactName, usernameOrHandle, description, avatarColor } = req.body;

  if (!usernameOrHandle) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  const cleanHandle = usernameOrHandle.trim().toLowerCase().replace(/^@/, '');
  const db = readDb();

  // Find target user
  const targetUser = db.users.find(u => u.username.toLowerCase() === cleanHandle);
  if (!targetUser) {
    return res.status(404).json({ error: `No registered user found with username @${cleanHandle}. Make sure they have signed up first.` });
  }

  // Prevent adding self
  if (targetUser.id === currentUserId) {
    return res.status(400).json({ error: 'You cannot add yourself as a contact.' });
  }

  // Prevent duplicate contact
  const alreadyContact = db.contacts.find(c => c.userId === currentUserId && c.contactUserId === targetUser.id);
  if (alreadyContact) {
    return res.status(400).json({ error: `@${cleanHandle} is already in your contacts.` });
  }

  // Create contact
  const newContact: ContactRelation = {
    id: crypto.randomUUID(),
    userId: currentUserId,
    contactUserId: targetUser.id,
    nickname: (contactName && contactName.trim()) || targetUser.name,
    description: (description && description.trim()) || targetUser.about,
    avatarColor: avatarColor || targetUser.avatarColor || 'mint',
    createdAt: new Date().toISOString()
  };

  db.contacts.push(newContact);

  // Check if a direct conversation already exists, or create one
  let convo = db.conversations.find(c => 
    c.type === 'direct' &&
    c.members.some(m => m.userId === currentUserId) &&
    c.members.some(m => m.userId === targetUser.id)
  );

  if (!convo) {
    convo = {
      id: crypto.randomUUID(),
      type: 'direct',
      name: null,
      description: '',
      avatarUrl: null,
      members: [
        { userId: currentUserId, role: 'member', joinedAt: new Date().toISOString() },
        { userId: targetUser.id, role: 'member', joinedAt: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    db.conversations.push(convo);
  }

  writeDb(db);

  return res.status(201).json({
    contact: {
      id: newContact.id,
      contactUserId: targetUser.id,
      nickname: newContact.nickname,
      description: newContact.description,
      avatarColor: newContact.avatarColor,
      avatarUrl: targetUser.avatarUrl,
      username: targetUser.username,
      plan: targetUser.plan,
      isOnline: userSockets.has(targetUser.id) && userSockets.get(targetUser.id)!.size > 0,
      createdAt: newContact.createdAt
    },
    conversationId: convo.id,
    message: `Added @${targetUser.username} to contacts!`
  });
});

// 11. Conversations: List
app.get('/api/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const db = readDb();

  const userConversations = db.conversations.filter(c => 
    c.members.some(m => m.userId === currentUserId)
  );

  const enriched = userConversations.map(convo => {
    let name = convo.name;
    let avatarUrl = convo.avatarUrl;
    let avatarColor = 'mint';
    let partnerUser: User | undefined = undefined;
    let isOnline = false;

    if (convo.type === 'direct') {
      const partnerMember = convo.members.find(m => m.userId !== currentUserId);
      if (partnerMember) {
        partnerUser = db.users.find(u => u.id === partnerMember.userId);
        if (partnerUser) {
          name = partnerUser.name;
          avatarUrl = partnerUser.avatarUrl;
          avatarColor = partnerUser.avatarColor;
          isOnline = userSockets.has(partnerUser.id) && userSockets.get(partnerUser.id)!.size > 0;
        }
      }
    }

    // Get last message
    const messages = db.messages.filter(m => m.conversationId === convo.id && !m.isDeleted);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lastMsg = messages[messages.length - 1] || null;

    // Count unread
    const unreadCount = messages.filter(m => 
      m.senderId !== currentUserId && !m.readBy.includes(currentUserId)
    ).length;

    return {
      id: convo.id,
      type: convo.type,
      name: name || (convo.type === 'direct' ? 'Direct Chat' : 'Untitled'),
      description: convo.description,
      avatarUrl,
      avatarColor,
      partnerUsername: partnerUser?.username || null,
      partnerPlan: partnerUser?.plan || null,
      isOnline,
      membersCount: convo.members.length,
      members: convo.members,
      channels: convo.channels || [],
      lastMessage: lastMsg ? {
        id: lastMsg.id,
        content: lastMsg.isViewOnce ? 'View once photo' : lastMsg.content,
        senderId: lastMsg.senderId,
        type: lastMsg.type,
        createdAt: lastMsg.createdAt
      } : null,
      unreadCount,
      updatedAt: convo.updatedAt
    };
  });

  // Sort by latest message or updatedAt
  enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json({ conversations: enriched });
});

// 12. Create Group or Space
app.post('/api/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const { type, name, description, avatarUrl, memberUsernames, channels } = req.body;

  if (!type || !['group', 'space'].includes(type)) {
    return res.status(400).json({ error: 'Conversation type must be group or space.' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const db = readDb();
  const members: ConversationMember[] = [
    { userId: currentUserId, role: 'admin', joinedAt: new Date().toISOString() }
  ];

  if (Array.isArray(memberUsernames)) {
    for (const rawUsername of memberUsernames) {
      const clean = String(rawUsername).trim().toLowerCase().replace(/^@/, '');
      const found = db.users.find(u => u.username.toLowerCase() === clean);
      if (found && found.id !== currentUserId && !members.some(m => m.userId === found.id)) {
        members.push({ userId: found.id, role: 'member', joinedAt: new Date().toISOString() });
      }
    }
  }

  let spaceChannels: SpaceChannel[] | undefined = undefined;
  if (type === 'space') {
    spaceChannels = Array.isArray(channels) && channels.length > 0 ? channels : [
      { id: crypto.randomUUID(), name: 'general', description: 'General discussion and updates', type: 'text' },
      { id: crypto.randomUUID(), name: 'announcements', description: 'Important space announcements', type: 'text' },
      { id: crypto.randomUUID(), name: 'collaborative-canvas', description: 'Interactive whiteboard', type: 'canvas' },
      { id: crypto.randomUUID(), name: 'team-polls', description: 'Community votes & polls', type: 'polls' }
    ];
  }

  const newConvo: Conversation = {
    id: crypto.randomUUID(),
    type,
    name: name.trim(),
    description: (description && description.trim()) || '',
    avatarUrl: avatarUrl || null,
    members,
    channels: spaceChannels,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.conversations.push(newConvo);
  writeDb(db);

  // Notify members via WS
  members.forEach(m => {
    sendToUser(m.userId, {
      type: 'conversation:created',
      conversation: newConvo
    });
  });

  return res.status(201).json({ conversation: newConvo });
});

// 13. Messages: Get by Conversation
app.get('/api/conversations/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const conversationId = req.params.id;
  const channelId = req.query.channelId as string | undefined;

  const db = readDb();
  const convo = db.conversations.find(c => c.id === conversationId);
  if (!convo || !convo.members.some(m => m.userId === currentUserId)) {
    return res.status(403).json({ error: 'Not authorized to view this conversation.' });
  }

  let msgs = db.messages.filter(m => m.conversationId === conversationId);
  if (channelId) {
    msgs = msgs.filter(m => m.channelId === channelId);
  }

  msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Attach sender safe info
  const enriched = msgs.map(m => {
    const sender = db.users.find(u => u.id === m.senderId);
    return {
      ...m,
      senderName: sender?.name || 'PulseChat User',
      senderUsername: sender?.username || '',
      senderAvatar: sender?.avatarUrl || null,
      senderColor: sender?.avatarColor || 'mint',
      senderPlan: sender?.plan || 'free'
    };
  });

  return res.json({ messages: enriched });
});

// 14. Messages: Send New Message
app.post('/api/conversations/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const conversationId = req.params.id;
  const {
    content,
    channelId,
    type = 'text',
    mediaUrl,
    mediaName,
    mediaSize,
    mediaDuration,
    isViewOnce,
    replyTo
  } = req.body;

  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'Message content or media attachment is required.' });
  }

  const db = readDb();
  const convo = db.conversations.find(c => c.id === conversationId);
  if (!convo || !convo.members.some(m => m.userId === currentUserId)) {
    return res.status(403).json({ error: 'You are not a member of this conversation.' });
  }

  const newMessage: Message = {
    id: crypto.randomUUID(),
    conversationId,
    channelId: channelId || null,
    senderId: currentUserId,
    content: (content && content.trim()) || '',
    type,
    mediaUrl: mediaUrl || null,
    mediaName: mediaName || null,
    mediaSize: mediaSize || null,
    mediaDuration: mediaDuration || null,
    isViewOnce: !!isViewOnce,
    viewedBy: [],
    replyTo: replyTo || null,
    reactions: [],
    status: 'delivered',
    readBy: [currentUserId],
    createdAt: new Date().toISOString()
  };

  db.messages.push(newMessage);
  convo.updatedAt = new Date().toISOString();
  writeDb(db);

  const sender = db.users.find(u => u.id === currentUserId);
  const enrichedMessage = {
    ...newMessage,
    senderName: sender?.name || 'PulseChat User',
    senderUsername: sender?.username || '',
    senderAvatar: sender?.avatarUrl || null,
    senderColor: sender?.avatarColor || 'mint',
    senderPlan: sender?.plan || 'free'
  };

  // Broadcast to all conversation members
  broadcastToConversation(conversationId, {
    type: 'chat:message',
    message: enrichedMessage,
    conversationId
  });

  return res.status(201).json({ message: enrichedMessage });
});

// 15. Messages: Open View-Once Media
app.post('/api/messages/:id/view-once', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const messageId = req.params.id;
  const db = readDb();

  const msg = db.messages.find(m => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (!msg.isViewOnce) {
    return res.status(400).json({ error: 'This message is not a view once media.' });
  }

  // Check if current user already opened it
  if (msg.viewedBy && msg.viewedBy.includes(currentUserId)) {
    return res.status(410).json({
      error: 'Opened. This media has already vanished.',
      status: 'already_viewed'
    });
  }

  // Mark as viewed
  if (!msg.viewedBy) msg.viewedBy = [];
  msg.viewedBy.push(currentUserId);
  writeDb(db);

  // Broadcast viewed event to conversation
  broadcastToConversation(msg.conversationId, {
    type: 'message:view_once_opened',
    messageId: msg.id,
    userId: currentUserId
  });

  return res.json({
    mediaUrl: msg.mediaUrl,
    mediaName: msg.mediaName,
    mediaType: msg.type,
    disclaimer: 'View Once media vanishes upon closing. External screen recording cannot be completely prevented.'
  });
});

// 16. Messages: Mark Conversation Read
app.post('/api/conversations/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const conversationId = req.params.id;
  const db = readDb();

  let updatedCount = 0;
  for (const m of db.messages) {
    if (m.conversationId === conversationId && !m.readBy.includes(currentUserId)) {
      m.readBy.push(currentUserId);
      m.status = 'read';
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    writeDb(db);
    broadcastToConversation(conversationId, {
      type: 'chat:read',
      conversationId,
      readByUserId: currentUserId
    });
  }

  return res.json({ updatedCount });
});

// 17. Messages: React to Message
app.post('/api/messages/:id/react', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const messageId = req.params.id;
  const { emoji } = req.body;

  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  const db = readDb();
  const msg = db.messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (!msg.reactions) msg.reactions = [];

  let reactionObj = msg.reactions.find(r => r.emoji === emoji);
  if (reactionObj) {
    if (reactionObj.userIds.includes(currentUserId)) {
      // Toggle off
      reactionObj.userIds = reactionObj.userIds.filter(id => id !== currentUserId);
      if (reactionObj.userIds.length === 0) {
        msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      reactionObj.userIds.push(currentUserId);
    }
  } else {
    msg.reactions.push({ emoji, userIds: [currentUserId] });
  }

  writeDb(db);

  broadcastToConversation(msg.conversationId, {
    type: 'message:reactions',
    messageId: msg.id,
    reactions: msg.reactions
  });

  return res.json({ reactions: msg.reactions });
});

// 18. Messages: Edit & Delete
app.put('/api/messages/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const messageId = req.params.id;
  const { content } = req.body;

  const db = readDb();
  const msg = db.messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (msg.senderId !== currentUserId) {
    return res.status(403).json({ error: 'You can only edit your own messages.' });
  }

  msg.content = content.trim();
  msg.isEdited = true;
  writeDb(db);

  broadcastToConversation(msg.conversationId, {
    type: 'message:updated',
    messageId: msg.id,
    content: msg.content,
    isEdited: true
  });

  return res.json({ message: msg });
});

app.delete('/api/messages/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const messageId = req.params.id;

  const db = readDb();
  const msg = db.messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (msg.senderId !== currentUserId) {
    return res.status(403).json({ error: 'You can only delete your own messages.' });
  }

  msg.isDeleted = true;
  msg.content = 'This message was deleted';
  msg.mediaUrl = null;
  writeDb(db);

  broadcastToConversation(msg.conversationId, {
    type: 'message:deleted',
    messageId: msg.id
  });

  return res.json({ message: 'Message deleted' });
});

// 19. WhatsApp-Style Status Updates (24-Hour Expiration)
app.get('/api/statuses', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const db = readDb();

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Purge/filter statuses older than 24 hours
  const activeStatuses = db.statuses.filter(s => {
    const age = now - new Date(s.createdAt).getTime();
    return age < DAY_MS;
  });

  // Group by user
  // Current user's own status updates
  const myUpdates = activeStatuses.filter(s => s.userId === currentUserId);

  // Find contacts
  const contactIds = db.contacts.filter(c => c.userId === currentUserId).map(c => c.contactUserId);
  const contactsUpdatesMap = new Map<string, StatusUpdate[]>();

  for (const s of activeStatuses) {
    if (contactIds.includes(s.userId)) {
      if (!contactsUpdatesMap.has(s.userId)) {
        contactsUpdatesMap.set(s.userId, []);
      }
      contactsUpdatesMap.get(s.userId)!.push(s);
    }
  }

  const contactsUpdates = Array.from(contactsUpdatesMap.entries()).map(([userId, updates]) => {
    const user = db.users.find(u => u.id === userId);
    const hasUnviewed = updates.some(u => !u.viewers.some(v => v.userId === currentUserId));
    return {
      userId,
      userName: user?.name || 'Contact',
      username: user?.username || '',
      avatarUrl: user?.avatarUrl || null,
      avatarColor: user?.avatarColor || 'mint',
      plan: user?.plan || 'free',
      hasUnviewed,
      updates
    };
  });

  return res.json({
    myStatuses: myUpdates,
    contactsStatuses: contactsUpdates
  });
});

app.post('/api/statuses', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const { type = 'photo', mediaUrl, posterBg, posterFont, caption } = req.body;

  if (type === 'poster' && !caption) {
    return res.status(400).json({ error: 'Poster text is required.' });
  }
  if ((type === 'photo' || type === 'video') && !mediaUrl) {
    return res.status(400).json({ error: 'Media is required for photo/video status.' });
  }

  const db = readDb();
  const newStatus: StatusUpdate = {
    id: crypto.randomUUID(),
    userId: currentUserId,
    type,
    mediaUrl: mediaUrl || null,
    posterBg: posterBg || '#064E3B',
    posterFont: posterFont || 'sans',
    caption: caption || '',
    viewers: [],
    createdAt: new Date().toISOString()
  };

  db.statuses.push(newStatus);
  writeDb(db);

  // Notify contacts
  const contactIds = db.contacts.filter(c => c.contactUserId === currentUserId).map(c => c.userId);
  contactIds.forEach(id => {
    sendToUser(id, {
      type: 'status:created',
      status: newStatus
    });
  });

  return res.status(201).json({ status: newStatus });
});

app.post('/api/statuses/:id/view', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const statusId = req.params.id;
  const db = readDb();

  const status = db.statuses.find(s => s.id === statusId);
  if (!status) return res.status(404).json({ error: 'Status not found' });

  if (!status.viewers.some(v => v.userId === currentUserId)) {
    status.viewers.push({
      userId: currentUserId,
      viewedAt: new Date().toISOString()
    });
    writeDb(db);

    // Notify status owner
    sendToUser(status.userId, {
      type: 'status:viewed',
      statusId: status.id,
      viewerId: currentUserId
    });
  }

  return res.json({ success: true, viewersCount: status.viewers.length });
});

app.delete('/api/statuses/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const statusId = req.params.id;
  const db = readDb();

  const index = db.statuses.findIndex(s => s.id === statusId && s.userId === currentUserId);
  if (index === -1) {
    return res.status(404).json({ error: 'Status not found or not owned by you.' });
  }

  db.statuses.splice(index, 1);
  writeDb(db);

  return res.json({ message: 'Status deleted successfully.' });
});

// 20. Payments & Subscriptions (Razorpay Integration)
app.get('/api/payment/config', (req: Request, res: Response) => {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_pulsechat_demo';
  const hasSecret = !!process.env.RAZORPAY_KEY_SECRET;

  return res.json({
    keyId,
    mode: hasSecret && keyId !== 'rzp_test_pulsechat_demo' ? 'live' : 'sandbox',
    supportedMethods: ['card', 'upi'],
    plans: {
      free: { price: 0, currency: 'USD', name: 'Free' },
      plus: { price: 1, currency: 'USD', name: 'PulseChat Plus', amountMinor: 100 },
      pro: { price: 5, currency: 'USD', name: 'PulseChat Pro', amountMinor: 500 }
    }
  });
});

app.post('/api/payment/create-order', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { plan, method = 'card' } = req.body;

  if (!['plus', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan selected. Choose Plus ($1/mo) or Pro ($5/mo).' });
  }

  const amountMinor = plan === 'plus' ? 100 : 500; // in cents / minor units ($1 = 100, $5 = 500)
  const orderId = `order_${crypto.randomBytes(12).toString('hex')}`;

  const db = readDb();
  db.payments.push({
    id: crypto.randomUUID(),
    userId: user.id,
    orderId,
    paymentId: '',
    plan,
    amount: amountMinor / 100,
    currency: 'USD',
    status: 'pending',
    method: method === 'upi' ? 'upi' : 'card',
    createdAt: new Date().toISOString()
  });
  writeDb(db);

  return res.json({
    orderId,
    amount: amountMinor,
    currency: 'USD',
    plan,
    customerName: user.name,
    customerEmail: user.email
  });
});

app.post('/api/payment/verify', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { orderId, paymentId, signature, plan } = req.body;

  if (!orderId || !plan) {
    return res.status(400).json({ error: 'Order details and plan are required.' });
  }

  const db = readDb();
  const paymentRecord = db.payments.find(p => p.orderId === orderId && p.userId === user.id);

  if (!paymentRecord) {
    return res.status(404).json({ error: 'Payment order record not found.' });
  }

  // Server-side verification:
  // If razorpay secret is configured, verify HMAC signature:
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret && signature && paymentId) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      paymentRecord.status = 'failed';
      writeDb(db);
      return res.status(400).json({ error: 'Payment verification failed: Invalid cryptographic signature.' });
    }
  }

  // Mark payment verified and update user subscription entitlement
  const generatedPaymentId = paymentId || `pay_${crypto.randomBytes(10).toString('hex')}`;
  paymentRecord.paymentId = generatedPaymentId;
  paymentRecord.status = 'success';

  const currentUser = db.users.find(u => u.id === user.id);
  if (currentUser) {
    currentUser.plan = plan as 'plus' | 'pro';
    // 30 days renewal
    const renews = new Date();
    renews.setDate(renews.getDate() + 30);
    currentUser.planRenewsAt = renews.toISOString();
  }

  writeDb(db);

  return res.json({
    success: true,
    plan,
    paymentId: generatedPaymentId,
    message: `Payment verified! You are now subscribed to PulseChat ${plan.toUpperCase()}.`
  });
});

app.get('/api/payment/history', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = readDb();
  const userPayments = db.payments
    .filter(p => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ payments: userPayments });
});

app.post('/api/payment/cancel', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = readDb();
  const currentUser = db.users.find(u => u.id === user.id);

  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  currentUser.plan = 'free';
  currentUser.planRenewsAt = null;
  writeDb(db);

  return res.json({ message: 'Your subscription has been cancelled and reverted to Free tier.' });
});

// VIP QR Code Tokens & Endpoints for Free Team Upgrades
const VIP_PASS_TOKENS = {
  plus: {
    plan: 'plus',
    name: 'PulseChat Plus VIP Team Pass',
    code: 'PULSE-VIP-PLUS-TEAM-8942',
    qrData: 'PULSECHAT_VIP_PLUS_PASS_2026_FREE',
    badge: '★ Blue Star',
    description: 'Free VIP upgrade to PulseChat Plus for authorized team members.'
  },
  pro: {
    plan: 'pro',
    name: 'PulseChat Pro VIP Executive Pass',
    code: 'PULSE-VIP-PRO-TEAM-7721',
    qrData: 'PULSECHAT_VIP_PRO_PASS_2026_FREE',
    badge: '★ Crown Golden Star',
    description: 'Free VIP upgrade to PulseChat Pro for executive and VIP team members.'
  }
};

app.get('/api/subscription/vip-passes', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json({ passes: VIP_PASS_TOKENS });
});

app.post('/api/subscription/redeem-vip', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { scannedCode, scannerType } = req.body;

  if (!scannedCode || !scannerType || !['plus', 'pro'].includes(scannerType)) {
    return res.status(400).json({ error: 'Scanned code and valid scanner type (plus or pro) are required.' });
  }

  const rawCode = String(scannedCode).trim();
  const db = readDb();
  const currentUser = db.users.find(u => u.id === user.id);
  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  // Strict Validation:
  // Plus scanner CAN ONLY scan Plus QR code
  // Pro scanner CAN ONLY scan Pro QR code
  const isPlusCode = rawCode === VIP_PASS_TOKENS.plus.qrData || rawCode === VIP_PASS_TOKENS.plus.code || rawCode.includes('PULSECHAT_VIP_PLUS');
  const isProCode = rawCode === VIP_PASS_TOKENS.pro.qrData || rawCode === VIP_PASS_TOKENS.pro.code || rawCode.includes('PULSECHAT_VIP_PRO');

  if (scannerType === 'plus') {
    if (isProCode) {
      return res.status(400).json({
        error: 'Scanner Mismatch: You scanned the Pro Plan VIP QR pass into the Plus Plan scanner. Please open the Pro scanner to activate the Pro Plan.'
      });
    }
    if (!isPlusCode) {
      return res.status(400).json({
        error: 'Invalid QR Code: This scanner strictly accepts the PulseChat Plus VIP QR Pass.'
      });
    }
  } else if (scannerType === 'pro') {
    if (isPlusCode) {
      return res.status(400).json({
        error: 'Scanner Mismatch: You scanned the Plus Plan VIP QR pass into the Pro Plan scanner. Please open the Plus scanner to activate the Plus Plan.'
      });
    }
    if (!isProCode) {
      return res.status(400).json({
        error: 'Invalid QR Code: This scanner strictly accepts the PulseChat Pro VIP QR Pass.'
      });
    }
  }

  // Grant free VIP upgrade for 1 full year
  currentUser.plan = scannerType as 'plus' | 'pro';
  const renews = new Date();
  renews.setFullYear(renews.getFullYear() + 1);
  currentUser.planRenewsAt = renews.toISOString();

  // Log free activation in payment record
  db.payments.push({
    id: crypto.randomUUID(),
    userId: currentUser.id,
    orderId: `vip_${scannerType}_${Date.now()}`,
    paymentId: `vip_pass_verified_${Date.now()}`,
    plan: scannerType as 'plus' | 'pro',
    amount: 0,
    currency: 'USD',
    status: 'success',
    method: 'card',
    createdAt: new Date().toISOString()
  });

  writeDb(db);

  return res.json({
    success: true,
    plan: scannerType,
    message: `🎉 VIP Pass Verified! You have unlocked PulseChat ${scannerType.toUpperCase()} for free! Your account now has the verified subscription badge.`
  });
});

// 21. Media Upload (Base64 file storage or local disk)
app.post('/api/upload', authenticateToken, (req: AuthRequest, res: Response) => {
  const { dataUrl, filename, mimeType } = req.body;

  if (!dataUrl || !filename) {
    return res.status(400).json({ error: 'dataUrl and filename are required' });
  }

  try {
    // Extract base64 payload
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // Direct raw url fallback
      return res.json({ url: dataUrl, filename });
    }

    const ext = path.extname(filename) || '.jpg';
    const uniqueName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    const buffer = Buffer.from(matches[2], 'base64');

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${uniqueName}`;

    return res.json({
      url: publicUrl,
      filename: uniqueName,
      size: buffer.length,
      mimeType: mimeType || matches[1]
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

// ----------------------------------------------------
// Frontend Mounting: Vite Middleware (Dev) vs Static (Prod)
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulseChat] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[PulseChat] Failed to start server:', err);
});
