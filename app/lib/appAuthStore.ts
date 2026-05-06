"use client";

const APP_ACCOUNT_SESSION_KEY = "app_account_session_v1";

export type AppLoginProvider =
 | "guest"
 | "email"
 | "wallet"
 | "wechat"
 | "dreambuilder";

export type AppAccountSession = {
 accountId: string;
 email?: string | null;
 displayName: string;
 avatar: string;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 primaryProvider: AppLoginProvider;
 loginProvider: AppLoginProvider;
 lastLoginAt?: string | null;
 updatedAt: string;
};

function safeParseJson<T>(raw: string | null): T | null {
 if (!raw) return null;

 try {
 return JSON.parse(raw) as T;
 } catch {
 return null;
 }
}

function normalizeName(value?: string | null) {
 const name = typeof value === "string" ? value.trim() : "";

 return name || "用户";
}

function normalizeAvatar(value?: string | null) {
 const avatar = typeof value === "string" ? value.trim() : "";

 return avatar || "🌙";
}

function normalizeProvider(value?: string | null): AppLoginProvider {
 if (
 value === "guest" ||
 value === "email" ||
 value === "wallet" ||
 value === "wechat" ||
 value === "dreambuilder"
 ) {
 return value;
 }

 return "guest";
}

export function readAppAccountSession(): AppAccountSession | null {
 if (typeof window === "undefined") return null;

 const session = safeParseJson<AppAccountSession>(
 window.localStorage.getItem(APP_ACCOUNT_SESSION_KEY)
 );

 if (!session?.accountId) return null;

 return {
 ...session,
 displayName: normalizeName(session.displayName),
 avatar: normalizeAvatar(session.avatar),
 primaryProvider: normalizeProvider(session.primaryProvider),
 loginProvider: normalizeProvider(session.loginProvider),
 updatedAt: session.updatedAt || new Date().toISOString(),
 };
}

export function writeAppAccountSession(session: AppAccountSession) {
 if (typeof window === "undefined") return;

 const normalizedSession: AppAccountSession = {
 ...session,
 displayName: normalizeName(session.displayName),
 avatar: normalizeAvatar(session.avatar),
 email: session.email || null,
 walletAddress: session.walletAddress || null,
 wechatOpenid: session.wechatOpenid || null,
 primaryProvider: normalizeProvider(session.primaryProvider),
 loginProvider: normalizeProvider(session.loginProvider),
 lastLoginAt: session.lastLoginAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 window.localStorage.setItem(
 APP_ACCOUNT_SESSION_KEY,
 JSON.stringify(normalizedSession)
 );
}

export function clearAppAccountSession() {
 if (typeof window === "undefined") return;

 window.localStorage.removeItem(APP_ACCOUNT_SESSION_KEY);
}

export function hasAppAccountSession() {
 return Boolean(readAppAccountSession());
}

export function updateAppAccountSessionProfile(params: {
 displayName?: string | null;
 avatar?: string | null;
}) {
 const oldSession = readAppAccountSession();

 if (!oldSession) return null;

 const nextSession: AppAccountSession = {
 ...oldSession,
 displayName: params.displayName
 ? normalizeName(params.displayName)
 : oldSession.displayName,
 avatar: params.avatar ? normalizeAvatar(params.avatar) : oldSession.avatar,
 updatedAt: new Date().toISOString(),
 };

 writeAppAccountSession(nextSession);

 return nextSession;
}

export function buildAppAccountSession(params: {
 accountId: string;
 email?: string | null;
 displayName: string;
 avatar: string;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 primaryProvider?: AppLoginProvider | null;
 loginProvider: AppLoginProvider;
 lastLoginAt?: string | null;
}) {
 const session: AppAccountSession = {
 accountId: params.accountId,
 email: params.email || null,
 displayName: normalizeName(params.displayName),
 avatar: normalizeAvatar(params.avatar),
 walletAddress: params.walletAddress || null,
 wechatOpenid: params.wechatOpenid || null,
 primaryProvider:
 normalizeProvider(params.primaryProvider || params.loginProvider) ||
 params.loginProvider,
 loginProvider: normalizeProvider(params.loginProvider),
 lastLoginAt: params.lastLoginAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 writeAppAccountSession(session);

 return session;
}

export function mergeAppAccountSession(params: {
 accountId: string;
 email?: string | null;
 displayName?: string | null;
 avatar?: string | null;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 loginProvider: AppLoginProvider;
 lastLoginAt?: string | null;
}) {
 const oldSession = readAppAccountSession();

 const primaryProvider =
 oldSession?.accountId === params.accountId
 ? oldSession.primaryProvider
 : params.loginProvider;

 const session: AppAccountSession = {
 accountId: params.accountId,
 email: params.email || oldSession?.email || null,
 displayName: normalizeName(
 params.displayName || oldSession?.displayName || "用户"
 ),
 avatar: normalizeAvatar(params.avatar || oldSession?.avatar || "🌙"),
 walletAddress: params.walletAddress || oldSession?.walletAddress || null,
 wechatOpenid: params.wechatOpenid || oldSession?.wechatOpenid || null,
 primaryProvider,
 loginProvider: params.loginProvider,
 lastLoginAt: params.lastLoginAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 writeAppAccountSession(session);

 return session;
}