"use client";

import {
 getCurrentPrivateChatUser,
 updateCurrentPrivateChatAvatar,
 updateCurrentPrivateChatName,
 type PrivateChatUser,
} from "./privateChatStore";

const PRIVATE_CHAT_ACCOUNT_SESSION_KEY = "private_chat_account_session_v1";

export type PrivateChatLoginProvider =
 | "guest"
 | "email"
 | "wallet"
 | "wechat"
 | "dreambuilder";

export type PrivateChatAccountSession = {
 accountId: string;
 email?: string | null;
 displayName: string;
 avatar: string;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 loginProvider: PrivateChatLoginProvider;
 lastLoginAt?: string | null;
};

export type PrivateChatProfileSession = {
 profileId: string;
 accountId?: string | null;
 chatUserId: string;
 chatName: string;
 chatAvatar: string;
 source: PrivateChatLoginProvider;
};

export type PrivateChatAuthSession = {
 account: PrivateChatAccountSession | null;
 profile: PrivateChatProfileSession | null;
 chatUser: PrivateChatUser;
 isGuest: boolean;
};

function safeParseJson<T>(raw: string | null): T | null {
 if (!raw) return null;

 try {
 return JSON.parse(raw) as T;
 } catch {
 return null;
 }
}

function normalizeAvatar(value?: string | null) {
 const avatar = typeof value === "string" ? value.trim() : "";

 return avatar || "🌙";
}

function normalizeName(value?: string | null) {
 const name = typeof value === "string" ? value.trim() : "";

 return name || "游客";
}

export function readPrivateChatAccountSession(): PrivateChatAuthSession | null {
 if (typeof window === "undefined") return null;

 const session = safeParseJson<PrivateChatAuthSession>(
 window.localStorage.getItem(PRIVATE_CHAT_ACCOUNT_SESSION_KEY)
 );

 if (!session?.chatUser?.id) return null;

 return session;
}

export function writePrivateChatAccountSession(
 session: PrivateChatAuthSession
) {
 if (typeof window === "undefined") return;

 window.localStorage.setItem(
 PRIVATE_CHAT_ACCOUNT_SESSION_KEY,
 JSON.stringify({
 ...session,
 chatUser: {
 ...session.chatUser,
 name: normalizeName(session.chatUser.name),
 avatar: normalizeAvatar(session.chatUser.avatar),
 },
 })
 );
}

export function clearPrivateChatAccountSession() {
 if (typeof window === "undefined") return;

 window.localStorage.removeItem(PRIVATE_CHAT_ACCOUNT_SESSION_KEY);
}

export function getCurrentPrivateChatAuthSession(): PrivateChatAuthSession {
 const storedSession = readPrivateChatAccountSession();

 if (storedSession) {
 return storedSession;
 }

 const guestUser = getCurrentPrivateChatUser();

 return {
 account: null,
 profile: null,
 chatUser: guestUser,
 isGuest: true,
 };
}

export function getCurrentPrivateChatAuthUser(): PrivateChatUser {
 return getCurrentPrivateChatAuthSession().chatUser;
}

export function updateCurrentPrivateChatAuthName(name: string) {
 const updatedGuestUser = updateCurrentPrivateChatName(name);
 const oldSession = readPrivateChatAccountSession();

 if (!oldSession) {
 return updatedGuestUser;
 }

 const updatedName = normalizeName(name);

 const nextSession: PrivateChatAuthSession = {
 ...oldSession,
 account: oldSession.account
 ? {
 ...oldSession.account,
 displayName: updatedName,
 }
 : null,
 profile: oldSession.profile
 ? {
 ...oldSession.profile,
 chatName: updatedName,
 }
 : null,
 chatUser: {
 ...oldSession.chatUser,
 name: updatedName,
 },
 };

 writePrivateChatAccountSession(nextSession);

 return nextSession.chatUser;
}

export function updateCurrentPrivateChatAuthAvatar(avatar: string) {
 const updatedGuestUser = updateCurrentPrivateChatAvatar(avatar);
 const oldSession = readPrivateChatAccountSession();

 if (!oldSession) {
 return updatedGuestUser;
 }

 const updatedAvatar = normalizeAvatar(avatar);

 const nextSession: PrivateChatAuthSession = {
 ...oldSession,
 account: oldSession.account
 ? {
 ...oldSession.account,
 avatar: updatedAvatar,
 }
 : null,
 profile: oldSession.profile
 ? {
 ...oldSession.profile,
 chatAvatar: updatedAvatar,
 }
 : null,
 chatUser: {
 ...oldSession.chatUser,
 avatar: updatedAvatar,
 },
 };

 writePrivateChatAccountSession(nextSession);

 return nextSession.chatUser;
}

export function buildPrivateChatAuthSessionFromProfile(params: {
 accountId?: string | null;
 profileId: string;
 chatUserId: string;
 chatName: string;
 chatAvatar: string;
 source: PrivateChatLoginProvider;
 email?: string | null;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 loginProvider?: PrivateChatLoginProvider;
}) {
 const chatName = normalizeName(params.chatName);
 const chatAvatar = normalizeAvatar(params.chatAvatar);

 const session: PrivateChatAuthSession = {
 account: params.accountId
 ? {
 accountId: params.accountId,
 email: params.email || null,
 displayName: chatName,
 avatar: chatAvatar,
 walletAddress: params.walletAddress || null,
 wechatOpenid: params.wechatOpenid || null,
 loginProvider: params.loginProvider || params.source,
 lastLoginAt: new Date().toISOString(),
 }
 : null,
 profile: {
 profileId: params.profileId,
 accountId: params.accountId || null,
 chatUserId: params.chatUserId,
 chatName,
 chatAvatar,
 source: params.source,
 },
 chatUser: {
 id: params.chatUserId,
 name: chatName,
 avatar: chatAvatar,
 },
 isGuest: !params.accountId,
 };

 writePrivateChatAccountSession(session);

 return session;
}