"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
 useAccount,
 useConnect,
 useDisconnect,
 useSignMessage,
 useSwitchChain,
} from "wagmi";
import { bsc } from "wagmi/chains";
import {
 mergeAppAccountSession,
 readAppAccountSession,
 writeAppAccountSession,
 type AppAccountSession,
} from "@/app/lib/appAuthStore";
import { syncPrivateChatIdentityFromWallet } from "../lib/privateChatIdentity";
import {
 getCurrentPrivateChatAuthSession,
 type PrivateChatAuthSession,
} from "../lib/privateChatAuthStore";

type Props = {
 onSessionChanged?: (session: PrivateChatAuthSession | null) => void;
};

type WalletNonceResponse = {
 ok?: boolean;
 nonce?: string;
 error?: string;
 message?: string;
};

type WalletVerifyResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: {
 address: string;
 chainId: number;
 issuedAt: string;
 };
};

type UnbindWalletResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: {
 account?: {
 id: string;
 email: string | null;
 display_name: string | null;
 avatar: string | null;
 wallet_address: string | null;
 wechat_openid: string | null;
 login_provider: string | null;
 created_at?: string;
 updated_at?: string;
 last_login_at?: string | null;
 };
 loginProvider?: string;
 forceUnbound?: boolean;
 };
};

function shortenAddress(address?: string | null) {
 if (!address) return "";

 return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeWalletAddress(address?: string | null) {
 return address ? address.trim().toLowerCase() : "";
}

function buildPrivateChatWalletMessage(params: {
 address: string;
 chainId: number;
 nonce: string;
 issuedAt: string;
}) {
 return (
 `${window.location.host} wants you to sign in with your wallet:\n` +
 `${params.address}\n\n` +
 `Sign in to Private Chat.\n\n` +
 `URI: ${window.location.origin}\n` +
 `Version: 1\n` +
 `Chain ID: ${params.chainId}\n` +
 `Nonce: ${params.nonce}\n` +
 `Issued At: ${params.issuedAt}`
 );
}

function patchPrivateChatAuthSessionWallet(nextLoginProvider?: string) {
 if (typeof window === "undefined") return;

 const key = "private_chat_account_session_v1";
 const raw = window.localStorage.getItem(key);

 if (!raw) return;

 try {
 const parsed = JSON.parse(raw);

 const safeProvider =
 nextLoginProvider ||
 (parsed?.account?.email
 ? "email"
 : parsed?.account?.wechatOpenid || parsed?.account?.wechat_openid
 ? "wechat"
 : parsed?.account?.loginProvider || "wallet");

 const nextSession = {
 ...parsed,
 account: parsed?.account
 ? {
 ...parsed.account,
 walletAddress: null,
 wallet_address: null,
 loginProvider: safeProvider,
 login_provider: safeProvider,
 }
 : parsed?.account,
 updatedAt: new Date().toISOString(),
 };

 window.localStorage.setItem(key, JSON.stringify(nextSession));
 } catch {
 // 私密聊天 session 结构异常时，不阻断解绑主流程
 }
}

export default function PrivateChatWalletLoginPanel({
 onSessionChanged,
}: Props) {
 const { address, chain } = useAccount();
 const { connect, connectors, isPending: isConnecting, error: connectError } =
 useConnect();
 const { disconnect } = useDisconnect();
 const { signMessageAsync } = useSignMessage();
 const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

 const [appSession, setAppSession] = useState<AppAccountSession | null>(null);
 const [statusText, setStatusText] = useState("");
 const [errorText, setErrorText] = useState("");
 const [isSigning, setIsSigning] = useState(false);
 const [isUnbinding, setIsUnbinding] = useState(false);
 const [forceUnbindConfirming, setForceUnbindConfirming] = useState(false);
 const [open, setOpen] = useState(false);

 const menuRef = useRef<HTMLDivElement | null>(null);

 const injectedConnector = connectors.find(
 (connector) => connector.type === "injected"
 );

 const walletAddressFromSession = appSession?.walletAddress || null;
 const hasWalletBound = Boolean(walletAddressFromSession);
 const isBsc = chain?.id === bsc.id;

 const walletOptions = useMemo(
 () => [
 {
 key: "binance",
 label: "币安钱包",
 desc: "BNB Chain Wallet / Binance Wallet",
 },
 {
 key: "okx",
 label: "OKX 钱包",
 desc: "OKX Wallet",
 },
 {
 key: "metamask",
 label: "MetaMask",
 desc: "MetaMask Browser / Mobile Wallet",
 },
 ],
 []
 );

 function refreshAppSession() {
 const session = readAppAccountSession();
 setAppSession(session);
 return session;
 }

 function getWalletNotFoundText() {
 return "当前浏览器没有检测到钱包。手机上请使用 OKX Wallet、币安钱包、MetaMask 等钱包 App 自带浏览器打开本页面；普通手机浏览器暂时不能直接连接钱包。";
 }

 function getWalletConnectFailedText() {
 return "当前浏览器无法连接钱包。手机上请使用钱包 App 自带浏览器打开本页面；电脑上请确认已安装并启用钱包插件。";
 }

 useEffect(() => {
 refreshAppSession();

 const handleStorageChange = (event: StorageEvent) => {
 if (event.key === "app_account_session_v1") {
 refreshAppSession();
 }
 };

 window.addEventListener("storage", handleStorageChange);

 return () => {
 window.removeEventListener("storage", handleStorageChange);
 };
 }, []);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (!menuRef.current) return;

 if (!menuRef.current.contains(event.target as Node)) {
 setOpen(false);
 }
 };

 document.addEventListener("mousedown", handleClickOutside);

 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 };
 }, []);

 async function requestWalletNonce() {
 const response = await fetch("/api/private-chat/auth/wallet-nonce", {
 method: "GET",
 cache: "no-store",
 });

 const responseText = await response.text();

 let result: WalletNonceResponse | null = null;

 try {
 result = JSON.parse(responseText) as WalletNonceResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok || !result.nonce) {
 throw new Error(
 result?.error ||
 result?.message ||
 `获取钱包 nonce 失败，状态码：${response.status}`
 );
 }

 return result.nonce;
 }

 async function verifyWalletSignature(params: {
 address: string;
 chainId: number;
 message: string;
 signature: string;
 }) {
 const response = await fetch("/api/private-chat/auth/wallet-verify", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(params),
 });

 const responseText = await response.text();

 let result: WalletVerifyResponse | null = null;

 try {
 result = JSON.parse(responseText) as WalletVerifyResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok || !result.data?.address) {
 throw new Error(
 result?.error ||
 result?.message ||
 `钱包签名验证失败，状态码：${response.status}`
 );
 }

 return result.data;
 }

 async function unbindWalletFromCloud(params: {
 accountId: string;
 walletAddress: string;
 force?: boolean;
 }) {
 const response = await fetch("/api/private-chat/auth/unbind-wallet", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(params),
 });

 const responseText = await response.text();

 let result: UnbindWalletResponse | null = null;

 try {
 result = JSON.parse(responseText) as UnbindWalletResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 throw new Error(
 result?.error ||
 result?.message ||
 `云端解绑钱包失败，状态码：${response.status}`
 );
 }

 return result;
 }

 async function handleConnectWallet() {
 setErrorText("");
 setStatusText("");
 setForceUnbindConfirming(false);

 if (!injectedConnector) {
 setErrorText(getWalletNotFoundText());
 return;
 }

 try {
 connect({ connector: injectedConnector });
 setOpen(false);
 } catch (error) {
 console.error("Connect wallet error:", error);
 setErrorText(getWalletConnectFailedText());
 }
 }

 async function handleSwitchToBsc() {
 setErrorText("");
 setStatusText("");
 setForceUnbindConfirming(false);

 try {
 switchChain({ chainId: bsc.id });
 } catch (error) {
 const message = error instanceof Error ? error.message : "切换网络失败。";
 setErrorText(message);
 }
 }

 async function handleWalletSignIn() {
 if (!address) {
 setErrorText("请先连接钱包。");
 return;
 }

 if (!chain?.id) {
 setErrorText("无法识别当前钱包网络。");
 return;
 }

 setIsSigning(true);
 setErrorText("");
 setStatusText("");
 setForceUnbindConfirming(false);

 try {
 if (!isBsc) {
 setErrorText("请先切换到 BSC 网络。");
 setIsSigning(false);
 return;
 }

 const normalizedAddress = normalizeWalletAddress(address);
 const currentSession = readAppAccountSession();

 const nonce = await requestWalletNonce();
 const issuedAt = new Date().toISOString();

 const message = buildPrivateChatWalletMessage({
 address: normalizedAddress,
 chainId: chain.id,
 nonce,
 issuedAt,
 });

 const signature = await signMessageAsync({
 message,
 });

 const verifyData = await verifyWalletSignature({
 address: normalizedAddress,
 chainId: chain.id,
 message,
 signature,
 });

 const verifiedAddress = normalizeWalletAddress(verifyData.address);

 if (verifiedAddress !== normalizedAddress) {
 throw new Error("签名地址和当前钱包地址不一致。");
 }

 const displayName =
 currentSession?.displayName ||
 shortenAddress(normalizedAddress) ||
 "钱包用户";

 const avatar = currentSession?.avatar || "👛";

 const result = await syncPrivateChatIdentityFromWallet({
 walletAddress: normalizedAddress,
 displayName,
 avatar,
 });

 if (!result.ok || !result.session) {
 setErrorText(result.error || "钱包登录同步失败。");
 setIsSigning(false);
 return;
 }

 const accountId =
 result.session.account?.accountId ||
 currentSession?.accountId ||
 result.session.profile?.accountId;

 if (!accountId) {
 setErrorText("钱包登录成功，但统一账号 ID 缺失。");
 setIsSigning(false);
 return;
 }

 const mergedSession = mergeAppAccountSession({
 accountId,
 email: currentSession?.email || result.session.account?.email || null,
 displayName:
 result.session.account?.displayName ||
 result.session.chatUser.name ||
 displayName,
 avatar: result.session.account?.avatar || result.session.chatUser.avatar,
 walletAddress: normalizedAddress,
 wechatOpenid:
 currentSession?.wechatOpenid ||
 result.session.account?.wechatOpenid ||
 null,
 loginProvider: "wallet",
 lastLoginAt: new Date().toISOString(),
 });

 setAppSession(mergedSession);
 onSessionChanged?.(result.session);
 setStatusText(
 currentSession?.email
 ? "钱包签名验证成功，并已绑定到当前统一账号。"
 : "钱包签名验证成功，钱包账号已登录。"
 );
 } catch (error) {
 const message =
 error instanceof Error ? error.message : "钱包签名登录失败。";

 setErrorText(message);
 } finally {
 setIsSigning(false);
 }
 }

 async function handleDisconnectWallet() {
 setErrorText("");
 setStatusText("");
 setIsUnbinding(true);

 try {
 const currentSession = readAppAccountSession();

 if (!currentSession) {
 try {
 disconnect();
 } catch {
 // 忽略钱包断开失败
 }

 setAppSession(null);
 setForceUnbindConfirming(false);
 setStatusText("钱包连接已断开。");
 return;
 }

 const currentWallet = normalizeWalletAddress(
 currentSession.walletAddress || walletAddressFromSession
 );

 if (!currentWallet) {
 try {
 disconnect();
 } catch {
 // 忽略钱包断开失败
 }

 setAppSession(currentSession);
 setForceUnbindConfirming(false);
 setStatusText("浏览器钱包连接已断开。");
 return;
 }

 if (!currentSession.accountId) {
 throw new Error("当前统一账号缺少 accountId，无法执行云端解绑。");
 }

 const hasBackupLoginMethod = Boolean(
 currentSession.email || currentSession.wechatOpenid
 );

 const shouldForceUnbind = !hasBackupLoginMethod;

 if (shouldForceUnbind && !forceUnbindConfirming) {
 try {
 disconnect();
 } catch {
 // 忽略钱包断开失败
 }

 setForceUnbindConfirming(true);
 setStatusText("已断开浏览器钱包连接，但尚未解除账号的钱包绑定。");
 return;
 }

 const unbindResult = await unbindWalletFromCloud({
 accountId: currentSession.accountId,
 walletAddress: currentWallet,
 force: shouldForceUnbind && forceUnbindConfirming,
 });

 try {
 disconnect();
 } catch {
 // 云端已解绑成功，浏览器钱包断开失败不影响账号状态
 }

 const nextLoginProvider =
 currentSession.email
 ? "email"
 : currentSession.wechatOpenid
 ? "wechat"
 : (unbindResult.data?.loginProvider as AppAccountSession["loginProvider"]) ||
 currentSession.loginProvider;

 const nextSession: AppAccountSession = {
 ...currentSession,
 walletAddress: null,
 loginProvider: nextLoginProvider,
 updatedAt: new Date().toISOString(),
 };

 writeAppAccountSession(nextSession);
 patchPrivateChatAuthSessionWallet(nextLoginProvider);

 setAppSession(nextSession);
 setForceUnbindConfirming(false);

 const authSession = getCurrentPrivateChatAuthSession();

 if (!authSession.isGuest) {
 onSessionChanged?.(authSession);
 }

 setStatusText(
 shouldForceUnbind
 ? "已强制解绑钱包。请尽快绑定邮箱或重新绑定钱包，否则该账号可能无法再次登录。"
 : currentSession.email
 ? "钱包已从云端统一账号正式解绑，邮箱登录仍保留。"
 : "钱包已从云端统一账号正式解绑。"
 );
 } catch (error) {
 const message =
 error instanceof Error ? error.message : "解绑钱包失败。";

 setErrorText(message);
 } finally {
 setIsUnbinding(false);
 }
 }

 return (
 <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="mb-3">
 <h3 className="text-sm font-semibold text-white">钱包登录 / 绑定</h3>
 <p className="mt-1 text-xs leading-5 text-slate-400">
 如果 DreamBuilder 已经连接钱包，这里会显示已绑定钱包；如果聊天平台独立运行，也可以在这里单独连接钱包并签名登录。
 </p>
 </div>

 {hasWalletBound ? (
 <div className="rounded-2xl bg-emerald-400/10 p-3">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
 👛
 </div>

 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-white">
 钱包已绑定
 </p>
 <p className="truncate text-xs text-emerald-100/70">
 {shortenAddress(walletAddressFromSession)}
 </p>
 </div>
 </div>

 <div className="mt-3 rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
 当前统一账号：
 <span className="text-emerald-100">
 {appSession?.email ||
 appSession?.displayName ||
 shortenAddress(walletAddressFromSession)}
 </span>
 </div>

 {!appSession?.email && !appSession?.wechatOpenid ? (
 <div
 className={`mt-3 rounded-2xl px-3 py-2 text-xs leading-5 ${
 forceUnbindConfirming
 ? "bg-red-500/10 text-red-100"
 : "bg-amber-400/10 text-amber-100"
 }`}
 >
 {forceUnbindConfirming
 ? "危险提醒：当前账号只有钱包这一种登录方式。如果继续解绑钱包，你可能无法再次登录这个统一账号。建议先绑定邮箱后再解绑钱包。"
 : "当前账号只有钱包这一种登录方式。建议先绑定邮箱后，再正式解绑钱包，避免账号失去登录入口。"}
 </div>
 ) : null}

 <button
 type="button"
 onClick={handleDisconnectWallet}
 disabled={isUnbinding}
 className={`mt-3 w-full rounded-2xl border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
 forceUnbindConfirming
 ? "border-red-300/30 bg-red-600/20 text-red-100 hover:bg-red-600/30"
 : "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
 }`}
 >
 {isUnbinding
 ? "正在解绑..."
 : forceUnbindConfirming
 ? "确认强制解绑钱包"
 : "断开钱包连接"}
 </button>

 {forceUnbindConfirming ? (
 <button
 type="button"
 onClick={() => {
 setForceUnbindConfirming(false);
 setErrorText("");
 setStatusText("已取消强制解绑。钱包仍然绑定在当前账号上。");
 }}
 disabled={isUnbinding}
 className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
 >
 取消强制解绑
 </button>
 ) : null}

 <p className="mt-2 text-[11px] leading-5 text-slate-500">
 现在会优先执行云端正式解绑：清空统一账号中的钱包地址，并同步更新本地登录状态。
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
 当前钱包：
 <span className={address ? "text-emerald-100" : "text-slate-500"}>
 {address ? shortenAddress(address) : "未连接"}
 </span>
 </div>

 {address && !isBsc ? (
 <div className="rounded-2xl bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
 当前不是 BSC 网络，请先切换到 BSC。
 </div>
 ) : null}

 {!address ? (
 <div className="relative" ref={menuRef}>
 <button
 type="button"
 onClick={() => setOpen((value) => !value)}
 disabled={isConnecting}
 className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isConnecting ? "连接中..." : "连接钱包"}
 </button>

 {open ? (
 <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/40">
 <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
 选择钱包
 </div>

 {walletOptions.map((wallet) => (
 <button
 key={wallet.key}
 type="button"
 onClick={handleConnectWallet}
 disabled={isConnecting}
 className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
 >
 <span>
 <span className="block text-xs font-semibold text-white">
 {wallet.label}
 </span>
 <span className="mt-1 block text-[11px] text-slate-500">
 {wallet.desc}
 </span>
 </span>

 <span className="text-xs text-slate-500">→</span>
 </button>
 ))}

 {!injectedConnector ? (
 <div className="px-3 py-2 text-[11px] leading-5 text-rose-300">
 手机上请使用 OKX Wallet、币安钱包、MetaMask
 等钱包 App 自带浏览器打开本页面；普通手机浏览器暂时不能直接连接钱包。
 </div>
 ) : null}
 </div>
 ) : null}
 </div>
 ) : !isBsc ? (
 <button
 type="button"
 onClick={handleSwitchToBsc}
 disabled={isSwitchingChain}
 className="w-full rounded-2xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isSwitchingChain ? "切换中..." : "切换到 BSC"}
 </button>
 ) : (
 <button
 type="button"
 onClick={handleWalletSignIn}
 disabled={isSigning}
 className="w-full rounded-2xl bg-fuchsia-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isSigning
 ? "签名验证中..."
 : appSession?.email
 ? "签名并绑定钱包"
 : "签名登录钱包"}
 </button>
 )}

 {address ? (
 <button
 type="button"
 onClick={() => {
 setForceUnbindConfirming(false);
 disconnect();
 }}
 className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
 >
 仅断开浏览器钱包
 </button>
 ) : null}

 {connectError ? (
 <div className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-100">
 当前浏览器没有检测到可用钱包。手机上请使用 OKX Wallet、币安钱包、MetaMask
 等钱包 App 自带浏览器打开本页面；电脑上请安装并启用钱包插件。
 </div>
 ) : null}
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
 );
}