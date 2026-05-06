"use client";

import { useEffect, useRef, useState } from "react";
import { privateChatSupabase } from "../lib/supabaseClient";
import {
 clearPrivateChatAccountSession,
 getCurrentPrivateChatAuthSession,
 type PrivateChatAuthSession,
 type PrivateChatLoginProvider,
} from "../lib/privateChatAuthStore";
import {
 syncPrivateChatIdentity,
 syncPrivateChatIdentityFromEmail,
} from "../lib/privateChatIdentity";
import { getCurrentPrivateChatUser } from "../lib/privateChatStore";
import {
 clearAppAccountSession,
 readAppAccountSession,
 type AppAccountSession,
} from "@/app/lib/appAuthStore";
import PrivateChatWalletLoginPanel from "./PrivateChatWalletLoginPanel";

type Props = {
 onSessionChanged?: (session: PrivateChatAuthSession | null) => void;
};

const APP_ACCOUNT_SESSION_KEY = "app_account_session_v1";
const PRIVATE_CHAT_LOGOUT_COOLDOWN_KEY =
 "private_chat_logout_cooldown_until_v1";

function normalizeEmail(value: string) {
 return value.trim().toLowerCase();
}

function getPrivateProviderFromAppSession(
 session: AppAccountSession
): Exclude<PrivateChatLoginProvider, "guest"> {
 if (session.loginProvider === "wallet" && session.walletAddress) {
 return "wallet";
 }

 if (session.loginProvider === "wechat" && session.wechatOpenid) {
 return "wechat";
 }

 if (session.loginProvider === "dreambuilder") {
 return "dreambuilder";
 }

 if (session.email) {
 return "email";
 }

 if (session.walletAddress) {
 return "wallet";
 }

 return "email";
}

function getLogoutCooldownUntil() {
 if (typeof window === "undefined") return 0;

 const raw = window.localStorage.getItem(PRIVATE_CHAT_LOGOUT_COOLDOWN_KEY);
 const timestamp = raw ? Number(raw) : 0;

 return Number.isFinite(timestamp) ? timestamp : 0;
}

function isInLogoutCooldown() {
 return Date.now() < getLogoutCooldownUntil();
}

function setLogoutCooldown(milliseconds = 8000) {
 if (typeof window === "undefined") return;

 window.localStorage.setItem(
 PRIVATE_CHAT_LOGOUT_COOLDOWN_KEY,
 String(Date.now() + milliseconds)
 );
}

function clearLogoutCooldown() {
 if (typeof window === "undefined") return;

 window.localStorage.removeItem(PRIVATE_CHAT_LOGOUT_COOLDOWN_KEY);
}

function buildUnifiedSyncKey(session: AppAccountSession | null) {
 if (!session?.accountId) return "";

 return [
 "unified",
 session.accountId || "",
 session.email || "",
 session.walletAddress || "",
 session.wechatOpenid || "",
 session.loginProvider || "",
 session.displayName || "",
 session.avatar || "",
 ].join("|");
}

function buildEmailSyncKey(email: string | null) {
 if (!email) return "";

 return ["supabase-email", email].join("|");
}

export default function PrivateChatLoginPanel({ onSessionChanged }: Props) {
 const [email, setEmail] = useState("");
 const [displayName, setDisplayName] = useState("");
 const [statusText, setStatusText] = useState("");
 const [errorText, setErrorText] = useState("");
 const [isSending, setIsSending] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [authSession, setAuthSession] = useState<PrivateChatAuthSession | null>(
 null
 );
 const [appSession, setAppSession] = useState<AppAccountSession | null>(null);

 const syncingRef = useRef(false);
 const lastUnifiedSyncKeyRef = useRef("");
 const lastEmailSyncKeyRef = useRef("");
 const mountedRef = useRef(false);
 const logoutRef = useRef(false);

 useEffect(() => {
 mountedRef.current = true;

 const currentSession = getCurrentPrivateChatAuthSession();

 if (!currentSession.isGuest) {
 setAuthSession(currentSession);
 onSessionChanged?.(currentSession);
 }

 const currentAppSession = readAppAccountSession();
 setAppSession(currentAppSession);

 if (!isInLogoutCooldown()) {
 if (currentAppSession?.accountId) {
 syncUnifiedAccountToPrivateChat("initial");
 } else {
 syncSupabaseAuthToPrivateChat("initial");
 }
 }

 const {
 data: { subscription },
 } = privateChatSupabase.auth.onAuthStateChange((event) => {
 if (logoutRef.current || isInLogoutCooldown()) return;

 if (event === "SIGNED_OUT") {
 return;
 }

 if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
 syncSupabaseAuthToPrivateChat("supabase-auth-change");
 }
 });

 const handleStorageChange = (event: StorageEvent) => {
 if (event.key !== APP_ACCOUNT_SESSION_KEY) return;
 if (logoutRef.current || isInLogoutCooldown()) return;

 const latestSession = readAppAccountSession();
 setAppSession(latestSession);

 if (!latestSession?.accountId) {
 return;
 }

 const nextKey = buildUnifiedSyncKey(latestSession);

 if (nextKey && nextKey !== lastUnifiedSyncKeyRef.current) {
 syncUnifiedAccountToPrivateChat("storage-change");
 }
 };

 window.addEventListener("storage", handleStorageChange);

 return () => {
 mountedRef.current = false;
 subscription.unsubscribe();
 window.removeEventListener("storage", handleStorageChange);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 function getBestLocalName(emailValue?: string | null) {
 const currentAuthSession = getCurrentPrivateChatAuthSession();
 const currentChatUser = getCurrentPrivateChatUser();

 if (
 emailValue &&
 !currentAuthSession.isGuest &&
 currentAuthSession.account?.email === emailValue &&
 currentAuthSession.chatUser?.name
 ) {
 return currentAuthSession.chatUser.name;
 }

 if (currentChatUser?.name) {
 return currentChatUser.name;
 }

 return emailValue?.split("@")[0] || "邮箱用户";
 }

 function getBestLocalAvatar(emailValue?: string | null) {
 const currentAuthSession = getCurrentPrivateChatAuthSession();
 const currentChatUser = getCurrentPrivateChatUser();

 if (
 emailValue &&
 !currentAuthSession.isGuest &&
 currentAuthSession.account?.email === emailValue &&
 currentAuthSession.chatUser?.avatar
 ) {
 return currentAuthSession.chatUser.avatar;
 }

 if (currentChatUser?.avatar) {
 return currentChatUser.avatar;
 }

 return "📧";
 }

 async function syncUnifiedAccountToPrivateChat(
 reason: "initial" | "storage-change" | "manual" | "wallet-panel" = "manual"
 ) {
 if (logoutRef.current || isInLogoutCooldown()) return;

 const unifiedSession = readAppAccountSession();
 setAppSession(unifiedSession);

 if (!unifiedSession?.accountId) return;

 if (!unifiedSession.email && !unifiedSession.walletAddress) return;

 const syncKey = buildUnifiedSyncKey(unifiedSession);

 if (reason !== "manual" && syncKey === lastUnifiedSyncKeyRef.current) {
 return;
 }

 if (syncingRef.current) return;

 syncingRef.current = true;
 lastUnifiedSyncKeyRef.current = syncKey;

 setIsSyncing(true);
 setErrorText("");

 try {
 const provider = getPrivateProviderFromAppSession(unifiedSession);

 const currentAuthSession = getCurrentPrivateChatAuthSession();

 const currentEmail = currentAuthSession.isGuest
 ? null
 : currentAuthSession.account?.email || null;

 const currentWallet = currentAuthSession.isGuest
 ? null
 : currentAuthSession.account?.walletAddress || null;

 const sameEmail =
 (currentEmail || null) === (unifiedSession.email || null);
 const sameWallet =
 (currentWallet || null) === (unifiedSession.walletAddress || null);

 if (
 reason !== "manual" &&
 !currentAuthSession.isGuest &&
 sameEmail &&
 sameWallet
 ) {
 setAuthSession(currentAuthSession);
 onSessionChanged?.(currentAuthSession);
 return;
 }

 const result = await syncPrivateChatIdentity({
 provider,
 email: unifiedSession.email || null,
 walletAddress: unifiedSession.walletAddress || null,
 wechatOpenid: unifiedSession.wechatOpenid || null,
 displayName: unifiedSession.displayName,
 avatar: unifiedSession.avatar,
 chatName: unifiedSession.displayName,
 chatAvatar: unifiedSession.avatar,
 });

 if (!mountedRef.current) return;

 if (!result.ok || !result.session) {
 setErrorText(result.error || "统一账号同步到私密聊天失败。");
 return;
 }

 setAuthSession(result.session);
 setAppSession(readAppAccountSession());
 onSessionChanged?.(result.session);
 } catch (error) {
 if (!mountedRef.current) return;

 const message =
 error instanceof Error ? error.message : "统一账号同步失败。";
 setErrorText(message);
 } finally {
 syncingRef.current = false;

 if (mountedRef.current) {
 setIsSyncing(false);
 }
 }
 }

 async function syncSupabaseAuthToPrivateChat(
 reason: "initial" | "supabase-auth-change" | "manual" = "manual"
 ) {
 if (logoutRef.current || isInLogoutCooldown()) return;
 if (syncingRef.current) return;

 const currentUnifiedSession = readAppAccountSession();

 if (
 reason !== "manual" &&
 currentUnifiedSession?.accountId &&
 (currentUnifiedSession.email || currentUnifiedSession.walletAddress)
 ) {
 setAppSession(currentUnifiedSession);
 return;
 }

 syncingRef.current = true;
 setIsSyncing(true);
 setErrorText("");

 try {
 const {
 data: { user },
 error,
 } = await privateChatSupabase.auth.getUser();

 if (logoutRef.current || isInLogoutCooldown()) return;

 if (error || !user?.email) {
 return;
 }

 const userEmail = user.email.toLowerCase();
 const emailSyncKey = buildEmailSyncKey(userEmail);

 if (reason !== "manual" && emailSyncKey === lastEmailSyncKeyRef.current) {
 return;
 }

 lastEmailSyncKeyRef.current = emailSyncKey;

 const currentAuthSession = getCurrentPrivateChatAuthSession();

 if (
 reason !== "manual" &&
 !currentAuthSession.isGuest &&
 currentAuthSession.account?.email === userEmail
 ) {
 setAuthSession(currentAuthSession);
 setAppSession(readAppAccountSession());
 onSessionChanged?.(currentAuthSession);
 return;
 }

 const result = await syncPrivateChatIdentityFromEmail({
 email: userEmail,
 displayName:
 getBestLocalName(userEmail) ||
 user.user_metadata?.display_name ||
 userEmail.split("@")[0] ||
 "邮箱用户",
 avatar: getBestLocalAvatar(userEmail),
 });

 if (!mountedRef.current) return;

 if (!result.ok || !result.session) {
 setErrorText(result.error || "邮箱账号同步聊天身份失败。");
 return;
 }

 setAuthSession(result.session);
 setAppSession(readAppAccountSession());
 onSessionChanged?.(result.session);
 } catch (error) {
 if (!mountedRef.current) return;

 const message = error instanceof Error ? error.message : "同步失败。";
 setErrorText(message);
 } finally {
 syncingRef.current = false;

 if (mountedRef.current) {
 setIsSyncing(false);
 }
 }
 }

 async function handleSendMagicLink() {
 const cleanedEmail = normalizeEmail(email);
 const cleanedName = displayName.trim();

 if (!cleanedEmail) {
 setErrorText("请输入邮箱地址。");
 return;
 }

 if (!cleanedEmail.includes("@")) {
 setErrorText("邮箱格式不正确。");
 return;
 }

 clearLogoutCooldown();
 logoutRef.current = false;

 setIsSending(true);
 setStatusText("");
 setErrorText("");

 try {
 const redirectTo =
 typeof window !== "undefined"
 ? `${window.location.origin}/private-chat`
 : undefined;

 const { error } = await privateChatSupabase.auth.signInWithOtp({
 email: cleanedEmail,
 options: {
 emailRedirectTo: redirectTo,
 data: {
 display_name: cleanedName || cleanedEmail.split("@")[0],
 },
 },
 });

 if (error) {
 setErrorText(error.message);
 setIsSending(false);
 return;
 }

 setStatusText("登录邮件已发送，请打开邮箱点击登录链接。");
 } catch (error) {
 const message = error instanceof Error ? error.message : "发送失败。";
 setErrorText(message);
 } finally {
 setIsSending(false);
 }
 }

 async function handleLogout() {
 setErrorText("");
 setStatusText("");
 setIsSyncing(false);

 logoutRef.current = true;
 syncingRef.current = false;
 lastUnifiedSyncKeyRef.current = "";
 lastEmailSyncKeyRef.current = "";

 setLogoutCooldown(10000);

 try {
 await privateChatSupabase.auth.signOut({
 scope: "local",
 });
 } catch {
 try {
 await privateChatSupabase.auth.signOut();
 } catch {
 // 即使 Supabase signOut 失败，也继续清理本地统一账号
 }
 }

 clearPrivateChatAccountSession();
 clearAppAccountSession();

 setAuthSession(null);
 setAppSession(null);
 onSessionChanged?.(null);

 setStatusText("已退出统一账号，当前会继续使用游客身份。");

 window.setTimeout(() => {
 logoutRef.current = false;
 }, 10000);
 }

 function handleManualRefresh() {
 clearLogoutCooldown();
 logoutRef.current = false;
 lastUnifiedSyncKeyRef.current = "";
 lastEmailSyncKeyRef.current = "";

 const latestAppSession = readAppAccountSession();

 if (latestAppSession?.accountId) {
 syncUnifiedAccountToPrivateChat("manual");
 return;
 }

 syncSupabaseAuthToPrivateChat("manual");
 }

 const isLoggedIn = Boolean(authSession && !authSession.isGuest);
 const boundEmail = appSession?.email || authSession?.account?.email || null;
 const boundWallet =
 appSession?.walletAddress || authSession?.account?.walletAddress || null;

 return (
 <div className="space-y-4">
 <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="mb-3">
 <h3 className="text-sm font-semibold text-white">账号登录</h3>
 <p className="mt-1 text-xs leading-5 text-slate-400">
 邮箱、钱包、DreamBuilder 会共用同一个统一账号。任意一端登录或绑定，另一端都会识别。
 </p>
 </div>

 {isLoggedIn ? (
 <div className="rounded-2xl bg-emerald-400/10 p-3">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
 {authSession?.chatUser.avatar || appSession?.avatar || "🌙"}
 </div>

 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-white">
 {authSession?.chatUser.name ||
 appSession?.displayName ||
 "统一账号"}
 </p>
 <p className="truncate text-xs text-emerald-100/70">
 {boundEmail || boundWallet || "已登录统一账号"}
 </p>
 </div>
 </div>

 <div className="mt-3 grid grid-cols-1 gap-2">
 <div className="rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
 邮箱：
 <span
 className={boundEmail ? "text-emerald-100" : "text-slate-500"}
 >
 {boundEmail || "未绑定"}
 </span>
 </div>

 <div className="rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
 钱包：
 <span
 className={
 boundWallet ? "text-emerald-100" : "text-slate-500"
 }
 >
 {boundWallet
 ? `${boundWallet.slice(0, 6)}...${boundWallet.slice(-4)}`
 : "未绑定"}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={handleManualRefresh}
 disabled={isSyncing}
 className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isSyncing ? "同步中..." : "刷新统一账号"}
 </button>

 <button
 type="button"
 onClick={handleLogout}
 className="mt-2 w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20"
 >
 退出统一账号
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 <input
 value={email}
 onChange={(event) => {
 setEmail(event.target.value);
 setErrorText("");
 setStatusText("");
 }}
 type="email"
 placeholder="输入邮箱地址"
 className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-400/50"
 />

 <input
 value={displayName}
 onChange={(event) => setDisplayName(event.target.value)}
 maxLength={18}
 placeholder="昵称，可选"
 className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-400/50"
 />

 <button
 type="button"
 onClick={handleSendMagicLink}
 disabled={isSending || isSyncing}
 className="w-full rounded-2xl bg-fuchsia-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isSending
 ? "发送中..."
 : isSyncing
 ? "同步账号中..."
 : "发送邮箱登录链接"}
 </button>

 <p className="text-[11px] leading-5 text-slate-500">
 这是 Supabase Auth 邮箱 Magic Link 登录，不需要在我们自己的表里保存密码。
 </p>
 </div>
 )}

 {statusText ? (
 <div className="mt-3 rounded-2xl bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
 {statusText}
 </div>
 ) : null}

 {errorText ? (
 <div className="mt-3 rounded-2xl bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-100">
 {errorText}
 </div>
 ) : null}
 </div>

 <PrivateChatWalletLoginPanel
 onSessionChanged={(session) => {
 setAuthSession(session);
 setAppSession(readAppAccountSession());
 onSessionChanged?.(session);
 }}
 />
 </div>
 );
}