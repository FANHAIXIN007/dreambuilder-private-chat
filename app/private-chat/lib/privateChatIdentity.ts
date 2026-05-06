"use client";

import {
 buildPrivateChatAuthSessionFromProfile,
 getCurrentPrivateChatAuthSession,
 type PrivateChatAuthSession,
 type PrivateChatLoginProvider,
} from "./privateChatAuthStore";
import {
 getCurrentPrivateChatUser,
 type PrivateChatUser,
} from "./privateChatStore";
import {
 mergeAppAccountSession,
 type AppLoginProvider,
} from "../../lib/appAuthStore";

type SyncProfileResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: {
 account: {
 accountId: string;
 email?: string | null;
 displayName: string;
 avatar: string;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 loginProvider: PrivateChatLoginProvider;
 lastLoginAt?: string | null;
 };
 profile: {
 profileId: string;
 accountId?: string | null;
 chatUserId: string;
 chatName: string;
 chatAvatar: string;
 source: PrivateChatLoginProvider;
 };
 chatUser: PrivateChatUser;
 };
};

export type SyncPrivateChatIdentityParams = {
 provider: Exclude<PrivateChatLoginProvider, "guest">;
 email?: string | null;
 walletAddress?: string | null;
 wechatOpenid?: string | null;
 displayName?: string | null;
 avatar?: string | null;
 chatName?: string | null;
 chatAvatar?: string | null;
 chatUserId?: string | null;
};

export type SyncPrivateChatIdentityResult = {
 ok: boolean;
 session?: PrivateChatAuthSession;
 error?: string;
};

function normalizeName(value?: string | null) {
 const name = typeof value === "string" ? value.trim() : "";

 return name || "游客";
}

function normalizeAvatar(value?: string | null) {
 const avatar = typeof value === "string" ? value.trim() : "";

 return avatar || "🌙";
}

function toAppLoginProvider(
 provider: PrivateChatLoginProvider
): AppLoginProvider {
 if (
 provider === "guest" ||
 provider === "email" ||
 provider === "wallet" ||
 provider === "wechat" ||
 provider === "dreambuilder"
 ) {
 return provider;
 }

 return "guest";
}

export function getCurrentResolvedPrivateChatUser(): PrivateChatUser {
 const authSession = getCurrentPrivateChatAuthSession();

 return authSession.chatUser || getCurrentPrivateChatUser();
}

export function getCurrentResolvedPrivateChatSession() {
 return getCurrentPrivateChatAuthSession();
}

export async function syncPrivateChatIdentity(
 params: SyncPrivateChatIdentityParams
): Promise<SyncPrivateChatIdentityResult> {
 try {
 const currentGuestUser = getCurrentPrivateChatUser();

 const displayName = normalizeName(
 params.displayName || params.chatName || currentGuestUser.name
 );

 const avatar = normalizeAvatar(
 params.avatar || params.chatAvatar || currentGuestUser.avatar
 );

 const response = await fetch("/api/private-chat/auth/sync-profile", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 provider: params.provider,
 email: params.email || null,
 walletAddress: params.walletAddress || null,
 wechatOpenid: params.wechatOpenid || null,
 displayName,
 avatar,
 chatName: normalizeName(params.chatName || displayName),
 chatAvatar: normalizeAvatar(params.chatAvatar || avatar),
 chatUserId: params.chatUserId || currentGuestUser.id,
 }),
 });

 const responseText = await response.text();

 let result: SyncProfileResponse | null = null;

 try {
 result = JSON.parse(responseText) as SyncProfileResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok || !result.data) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `同步聊天身份失败，状态码：${response.status}`,
 };
 }

 const session = buildPrivateChatAuthSessionFromProfile({
 accountId: result.data.account.accountId,
 profileId: result.data.profile.profileId,
 chatUserId: result.data.profile.chatUserId,
 chatName: result.data.profile.chatName,
 chatAvatar: result.data.profile.chatAvatar,
 source: result.data.profile.source,
 email: result.data.account.email || null,
 walletAddress: result.data.account.walletAddress || null,
 wechatOpenid: result.data.account.wechatOpenid || null,
 loginProvider: result.data.account.loginProvider,
 });

 mergeAppAccountSession({
 accountId: result.data.account.accountId,
 email: result.data.account.email || null,
 displayName: result.data.account.displayName || session.chatUser.name,
 avatar: result.data.account.avatar || session.chatUser.avatar,
 walletAddress: result.data.account.walletAddress || null,
 wechatOpenid: result.data.account.wechatOpenid || null,
 loginProvider: toAppLoginProvider(result.data.account.loginProvider),
 lastLoginAt: result.data.account.lastLoginAt || new Date().toISOString(),
 });

 return {
 ok: true,
 session,
 };
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 };
 }
}

/**
 * 预留给 DreamBuilder 自动登录使用：
 * 后面 DreamBuilder 有正式登录 session 后，只需要把它转成这里需要的参数即可。
 */
export async function syncPrivateChatIdentityFromDreamBuilder(params: {
 accountId?: string | null;
 email?: string | null;
 displayName?: string | null;
 avatar?: string | null;
 walletAddress?: string | null;
}) {
 return syncPrivateChatIdentity({
 provider: "dreambuilder",
 email: params.email || null,
 walletAddress: params.walletAddress || null,
 displayName: params.displayName || "DreamBuilder 用户",
 avatar: params.avatar || "🏡",
 });
}

/**
 * 预留给邮箱登录使用：
 * 邮箱 Magic Link 登录成功后，会调用这里。
 */
export async function syncPrivateChatIdentityFromEmail(params: {
 email: string;
 displayName?: string | null;
 avatar?: string | null;
}) {
 return syncPrivateChatIdentity({
 provider: "email",
 email: params.email,
 displayName: params.displayName || params.email.split("@")[0] || "邮箱用户",
 avatar: params.avatar || "📧",
 });
}

/**
 * 预留给钱包登录使用：
 * 后面做钱包签名登录时，会直接调用这个方法。
 */
export async function syncPrivateChatIdentityFromWallet(params: {
 walletAddress: string;
 displayName?: string | null;
 avatar?: string | null;
}) {
 const shortAddress =
 params.walletAddress.length > 10
 ? `${params.walletAddress.slice(0, 6)}...${params.walletAddress.slice(-4)}`
 : params.walletAddress;

 return syncPrivateChatIdentity({
 provider: "wallet",
 walletAddress: params.walletAddress,
 displayName: params.displayName || shortAddress,
 avatar: params.avatar || "👛",
 });
}

/**
 * 预留给微信登录使用：
 * 后面接微信 openid / unionid 时，会直接调用这个方法。
 */
export async function syncPrivateChatIdentityFromWechat(params: {
 wechatOpenid: string;
 displayName?: string | null;
 avatar?: string | null;
}) {
 return syncPrivateChatIdentity({
 provider: "wechat",
 wechatOpenid: params.wechatOpenid,
 displayName: params.displayName || "微信用户",
 avatar: params.avatar || "💬",
 });
}