"use client";

export type PrivateChatUser = {
 id: string;
 name: string;
 avatar: string;
};

const PRIVATE_CHAT_USER_KEY = "private_chat_current_user_v1";
const PRIVATE_CHAT_ACCOUNT_SESSION_KEY = "private_chat_account_session_v1";

const DEFAULT_AVATARS = [
 "🌙",
 "⭐",
 "🐱",
 "🐶",
 "🦊",
 "🐼",
 "🐰",
 "🦋",
 "🌸",
 "🍃",
 "☕",
 "🎧",
];

type StoredPrivateChatAuthSession = {
 account?: {
 accountId: string;
 email?: string | null;
 displayName: string;
 avatar: string;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 loginProvider: string;
 lastLoginAt?: string | null;
 } | null;
 profile?: {
 profileId: string;
 accountId?: string | null;
 chatUserId: string;
 chatName: string;
 chatAvatar: string;
 source: string;
 } | null;
 chatUser?: Partial<PrivateChatUser> | null;
 isGuest?: boolean;
};

function getRandomAvatar() {
 return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)] || "🌙";
}

function createSafeId() {
 const randomPart = Math.random().toString(36).slice(2, 12);
 const timePart = Date.now().toString(36);

 try {
 if (
 typeof crypto !== "undefined" &&
 typeof crypto.randomUUID === "function"
 ) {
 return crypto.randomUUID();
 }
 } catch {
 // 在 http://局域网IP 这种非安全环境下，crypto.randomUUID 可能不可用
 }

 return `guest_${timePart}_${randomPart}`;
}

function normalizeName(value?: string | null) {
 const name = typeof value === "string" ? value.trim() : "";

 return name || "游客";
}

function normalizeAvatar(value?: string | null) {
 const avatar = typeof value === "string" ? value.trim() : "";

 return avatar || "🌙";
}

function createDefaultUser(): PrivateChatUser {
 const randomNumber = Math.floor(1000 + Math.random() * 9000);

 return {
 id: createSafeId(),
 name: `游客${randomNumber}`,
 avatar: getRandomAvatar(),
 };
}

function safeParseJson<T>(raw: string | null): T | null {
 if (!raw) return null;

 try {
 return JSON.parse(raw) as T;
 } catch {
 return null;
 }
}

function readStoredAuthSession(): StoredPrivateChatAuthSession | null {
 if (typeof window === "undefined") return null;

 try {
 return safeParseJson<StoredPrivateChatAuthSession>(
 window.localStorage.getItem(PRIVATE_CHAT_ACCOUNT_SESSION_KEY)
 );
 } catch {
 return null;
 }
}

function writeStoredAuthSession(session: StoredPrivateChatAuthSession) {
 if (typeof window === "undefined") return;

 try {
 window.localStorage.setItem(
 PRIVATE_CHAT_ACCOUNT_SESSION_KEY,
 JSON.stringify(session)
 );
 } catch {
 // localStorage 不可用时，不阻断页面运行
 }
}

function readAuthUser(): PrivateChatUser | null {
 const session = readStoredAuthSession();

 if (!session?.chatUser?.id) return null;

 const id = String(session.chatUser.id);
 const name = normalizeName(session.chatUser.name);
 const avatar = normalizeAvatar(session.chatUser.avatar);

 return {
 id,
 name,
 avatar,
 };
}

function updateAuthUserName(name: string) {
 const session = readStoredAuthSession();

 if (!session?.chatUser?.id) return;

 const cleanedName = normalizeName(name).slice(0, 18);

 writeStoredAuthSession({
 ...session,
 account: session.account
 ? {
 ...session.account,
 displayName: cleanedName,
 }
 : null,
 profile: session.profile
 ? {
 ...session.profile,
 chatName: cleanedName,
 }
 : null,
 chatUser: {
 ...session.chatUser,
 id: String(session.chatUser.id),
 name: cleanedName,
 avatar: normalizeAvatar(session.chatUser.avatar),
 },
 isGuest: Boolean(session.isGuest),
 });
}

function updateAuthUserAvatar(avatar: string) {
 const session = readStoredAuthSession();

 if (!session?.chatUser?.id) return;

 const cleanedAvatar = normalizeAvatar(avatar).slice(0, 16);

 writeStoredAuthSession({
 ...session,
 account: session.account
 ? {
 ...session.account,
 avatar: cleanedAvatar,
 }
 : null,
 profile: session.profile
 ? {
 ...session.profile,
 chatAvatar: cleanedAvatar,
 }
 : null,
 chatUser: {
 ...session.chatUser,
 id: String(session.chatUser.id),
 name: normalizeName(session.chatUser.name),
 avatar: cleanedAvatar,
 },
 isGuest: Boolean(session.isGuest),
 });
}

function readStoredUser(): PrivateChatUser | null {
 if (typeof window === "undefined") return null;

 try {
 const raw = window.localStorage.getItem(PRIVATE_CHAT_USER_KEY);

 if (!raw) return null;

 const parsed = JSON.parse(raw) as Partial<PrivateChatUser>;

 if (!parsed.id || !parsed.name || !parsed.avatar) {
 return null;
 }

 return {
 id: String(parsed.id),
 name: String(parsed.name),
 avatar: String(parsed.avatar),
 };
 } catch {
 return null;
 }
}

function writeStoredUser(user: PrivateChatUser) {
 if (typeof window === "undefined") return;

 try {
 window.localStorage.setItem(PRIVATE_CHAT_USER_KEY, JSON.stringify(user));
 } catch {
 // localStorage 不可用时，不阻断页面运行
 }
}

export function getCurrentPrivateChatUser(): PrivateChatUser {
 const authUser = readAuthUser();

 if (authUser) {
 return authUser;
 }

 const storedUser = readStoredUser();

 if (storedUser) {
 return storedUser;
 }

 const newUser = createDefaultUser();
 writeStoredUser(newUser);

 return newUser;
}

export function getCurrentPrivateChatGuestUser(): PrivateChatUser {
 const storedUser = readStoredUser();

 if (storedUser) {
 return storedUser;
 }

 const newUser = createDefaultUser();
 writeStoredUser(newUser);

 return newUser;
}

export function updateCurrentPrivateChatName(name: string): PrivateChatUser {
 const currentUser = getCurrentPrivateChatUser();
 const cleanedName = name.trim().slice(0, 18) || currentUser.name;

 const updatedUser: PrivateChatUser = {
 ...currentUser,
 name: cleanedName,
 };

 const authUser = readAuthUser();

 if (authUser) {
 updateAuthUserName(cleanedName);
 } else {
 writeStoredUser(updatedUser);
 }

 return updatedUser;
}

export function updateCurrentPrivateChatAvatar(avatar: string): PrivateChatUser {
 const currentUser = getCurrentPrivateChatUser();
 const cleanedAvatar = avatar || currentUser.avatar;

 const updatedUser: PrivateChatUser = {
 ...currentUser,
 avatar: cleanedAvatar,
 };

 const authUser = readAuthUser();

 if (authUser) {
 updateAuthUserAvatar(cleanedAvatar);
 } else {
 writeStoredUser(updatedUser);
 }

 return updatedUser;
}

export function getPrivateRoomId(targetUserId?: string | null) {
 const currentUser = getCurrentPrivateChatUser();

 if (!targetUserId) {
 return `private_self_${currentUser.id}`;
 }

 const ids = [currentUser.id, targetUserId].sort();

 return `private_pair_${ids[0]}_${ids[1]}`;
}

export function formatPrivateChatTime(value?: string | null) {
 if (!value) return "";

 const date = new Date(value);

 if (Number.isNaN(date.getTime())) {
 return "";
 }

 const now = new Date();
 const isToday = date.toDateString() === now.toDateString();

 if (isToday) {
 return date.toLocaleTimeString("zh-CN", {
 hour: "2-digit",
 minute: "2-digit",
 });
 }

 return date.toLocaleString("zh-CN", {
 month: "2-digit",
 day: "2-digit",
 hour: "2-digit",
 minute: "2-digit",
 });
}