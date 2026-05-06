"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
 useAccount,
 useConnect,
 useDisconnect,
 useReadContract,
 useSignMessage,
 useSwitchChain,
} from "wagmi";
import { bsc } from "wagmi/chains";
import { BSC_USDT_ADDRESS } from "@/app/lib/web3/tokens";
import {
 clearAppAccountSession,
 mergeAppAccountSession,
 readAppAccountSession,
 type AppAccountSession,
} from "@/app/lib/appAuthStore";

type ConnectWalletButtonProps = {
 language?: "zh" | "en";
};

type MeResponse = {
 success: boolean;
 authenticated: boolean;
 user: {
 address: string;
 chainId: number;
 issuedAt: string;
 } | null;
};

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
 loginProvider: "guest" | "email" | "wallet" | "wechat" | "dreambuilder";
 lastLoginAt?: string | null;
 };
 };
};

function formatUsdtBalance(value?: bigint, decimals?: number) {
 if (value === undefined || decimals === undefined) return "--";

 const numeric = Number(value) / 10 ** decimals;

 if (numeric >= 1000) {
 return numeric.toLocaleString("en-US", {
 maximumFractionDigits: 2,
 });
 }

 if (numeric >= 1) {
 return numeric.toLocaleString("en-US", {
 maximumFractionDigits: 4,
 });
 }

 return numeric.toLocaleString("en-US", {
 maximumFractionDigits: 6,
 });
}

function shortenAddress(address?: string | null) {
 if (!address) return "";

 return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeWalletAddress(address?: string | null) {
 return address ? address.toLowerCase() : null;
}

const erc20Abi = [
 {
 type: "function",
 name: "balanceOf",
 stateMutability: "view",
 inputs: [{ name: "account", type: "address" }],
 outputs: [{ name: "", type: "uint256" }],
 },
 {
 type: "function",
 name: "decimals",
 stateMutability: "view",
 inputs: [],
 outputs: [{ name: "", type: "uint8" }],
 },
 {
 type: "function",
 name: "symbol",
 stateMutability: "view",
 inputs: [],
 outputs: [{ name: "", type: "string" }],
 },
] as const;

export default function ConnectWalletButton({
 language = "zh",
}: ConnectWalletButtonProps) {
 const { address, isConnected, chain } = useAccount();
 const { connect, connectors, isPending, error } = useConnect();
 const { disconnect } = useDisconnect();
 const { signMessageAsync } = useSignMessage();
 const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

 const [open, setOpen] = useState(false);
 const [authLoading, setAuthLoading] = useState(false);
 const [authUser, setAuthUser] = useState<MeResponse["user"]>(null);
 const [authError, setAuthError] = useState("");
 const [appSession, setAppSession] = useState<AppAccountSession | null>(null);
 const menuRef = useRef<HTMLDivElement | null>(null);

 const isBsc = chain?.id === bsc.id;

 const injectedConnector = connectors.find(
 (connector) => connector.type === "injected"
 );

 const {
 data: usdtRawBalance,
 isLoading: isUsdtBalanceLoading,
 refetch: refetchUsdtRawBalance,
 } = useReadContract({
 address: BSC_USDT_ADDRESS as `0x${string}`,
 abi: erc20Abi,
 functionName: "balanceOf",
 args: address ? [address as `0x${string}`] : undefined,
 chainId: bsc.id,
 query: {
 enabled: Boolean(address && isConnected && isBsc),
 refetchInterval: 15000,
 },
 });

 const { data: usdtDecimals } = useReadContract({
 address: BSC_USDT_ADDRESS as `0x${string}`,
 abi: erc20Abi,
 functionName: "decimals",
 chainId: bsc.id,
 query: {
 enabled: Boolean(address && isConnected && isBsc),
 },
 });

 const { data: usdtSymbol } = useReadContract({
 address: BSC_USDT_ADDRESS as `0x${string}`,
 abi: erc20Abi,
 functionName: "symbol",
 chainId: bsc.id,
 query: {
 enabled: Boolean(address && isConnected && isBsc),
 },
 });

 const text =
 language === "zh"
 ? {
 connectWallet: "连接钱包",
 connecting: "连接中...",
 signIn: "签名登录",
 signing: "签名中...",
 selectWallet: "选择钱包",
 binanceWallet: "币安钱包",
 okxWallet: "OKX 钱包",
 binanceDesc: "BNB Chain Wallet / Binance Wallet",
 okxDesc: "OKX Wallet",
 noWallet:
 "未检测到浏览器钱包扩展，请先安装币安钱包或 OKX Wallet。",
 unknownNetwork: "未知网络",
 switchToBsc: "切到 BSC",
 switching: "切换中...",
 disconnect: "断开",
 signedIn: "已登录",
 signInFailed: "签名登录失败，请重试。",
 usdtBalance: "USDT余额",
 loadingBalance: "读取中...",
 unifiedAccount: "统一账号",
 unifiedSignedIn: "已识别统一账号",
 emailAccount: "邮箱账号",
 walletAccount: "钱包账号",
 clearUnifiedAccount: "退出统一账号",
 }
 : {
 connectWallet: "Connect Wallet",
 connecting: "Connecting...",
 signIn: "Sign In",
 signing: "Signing...",
 selectWallet: "Choose Wallet",
 binanceWallet: "Binance Wallet",
 okxWallet: "OKX Wallet",
 binanceDesc: "BNB Chain Wallet / Binance Wallet",
 okxDesc: "OKX Wallet",
 noWallet:
 "No browser wallet detected. Please install Binance Wallet or OKX Wallet first.",
 unknownNetwork: "Unknown Network",
 switchToBsc: "Switch to BSC",
 switching: "Switching...",
 disconnect: "Disconnect",
 signedIn: "Signed In",
 signInFailed: "Wallet sign-in failed. Please try again.",
 usdtBalance: "USDT Balance",
 loadingBalance: "Loading...",
 unifiedAccount: "Unified Account",
 unifiedSignedIn: "Unified account detected",
 emailAccount: "Email Account",
 walletAccount: "Wallet Account",
 clearUnifiedAccount: "Sign out unified account",
 };

 const walletOptions = useMemo(
 () => [
 {
 key: "binance",
 label: text.binanceWallet,
 desc: text.binanceDesc,
 },
 {
 key: "okx",
 label: text.okxWallet,
 desc: text.okxDesc,
 },
 ],
 [text.binanceWallet, text.binanceDesc, text.okxWallet, text.okxDesc]
 );

 function refreshAppSession() {
 const session = readAppAccountSession();
 setAppSession(session);
 return session;
 }

 async function syncWalletToUnifiedAccount(params: {
 walletAddress: string;
 chainId: number;
 }) {
 const normalizedAddress = normalizeWalletAddress(params.walletAddress);

 if (!normalizedAddress) return null;

 const existingSession = readAppAccountSession();

 try {
 const response = await fetch("/api/private-chat/auth/sync-profile", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 provider: "wallet",
 email: existingSession?.email || null,
 walletAddress: normalizedAddress,
 displayName:
 existingSession?.displayName ||
 shortenAddress(normalizedAddress) ||
 "钱包用户",
 avatar: existingSession?.avatar || "👛",
 chatName:
 existingSession?.displayName ||
 shortenAddress(normalizedAddress) ||
 "钱包用户",
 chatAvatar: existingSession?.avatar || "👛",
 }),
 });

 const responseText = await response.text();

 let result: SyncProfileResponse | null = null;

 try {
 result = JSON.parse(responseText) as SyncProfileResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok || !result.data?.account) {
 console.warn(
 "Sync wallet to app account failed:",
 result?.error || result?.message || responseText
 );

 if (existingSession) {
 const mergedSession = mergeAppAccountSession({
 accountId: existingSession.accountId,
 email: existingSession.email || null,
 displayName: existingSession.displayName,
 avatar: existingSession.avatar,
 walletAddress: normalizedAddress,
 wechatOpenid: existingSession.wechatOpenid || null,
 loginProvider: "wallet",
 lastLoginAt: new Date().toISOString(),
 });

 setAppSession(mergedSession);
 return mergedSession;
 }

 return null;
 }

 const account = result.data.account;

 const mergedSession = mergeAppAccountSession({
 accountId: account.accountId,
 email: account.email || existingSession?.email || null,
 displayName:
 account.displayName ||
 existingSession?.displayName ||
 shortenAddress(normalizedAddress) ||
 "钱包用户",
 avatar: account.avatar || existingSession?.avatar || "👛",
 walletAddress:
 account.walletAddress || normalizedAddress || existingSession?.walletAddress,
 wechatOpenid: account.wechatOpenid || existingSession?.wechatOpenid || null,
 loginProvider: "wallet",
 lastLoginAt: account.lastLoginAt || new Date().toISOString(),
 });

 setAppSession(mergedSession);
 return mergedSession;
 } catch (error) {
 console.error("syncWalletToUnifiedAccount error:", error);

 if (existingSession) {
 const mergedSession = mergeAppAccountSession({
 accountId: existingSession.accountId,
 email: existingSession.email || null,
 displayName: existingSession.displayName,
 avatar: existingSession.avatar,
 walletAddress: normalizedAddress,
 wechatOpenid: existingSession.wechatOpenid || null,
 loginProvider: "wallet",
 lastLoginAt: new Date().toISOString(),
 });

 setAppSession(mergedSession);
 return mergedSession;
 }

 return null;
 }
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

 useEffect(() => {
 const loadMe = async () => {
 try {
 const response = await fetch("/api/auth/me", {
 method: "GET",
 cache: "no-store",
 });

 const data = (await response.json()) as MeResponse;

 if (data.success && data.authenticated) {
 setAuthUser(data.user);

 if (data.user?.address) {
 await syncWalletToUnifiedAccount({
 walletAddress: data.user.address,
 chainId: data.user.chainId,
 });
 }
 } else {
 setAuthUser(null);
 refreshAppSession();
 }
 } catch (error) {
 console.error("loadMe error:", error);
 setAuthUser(null);
 refreshAppSession();
 }
 };

 loadMe();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useEffect(() => {
 if (isBsc && address) {
 refetchUsdtRawBalance();
 }
 }, [isBsc, address, refetchUsdtRawBalance]);

 const handleSiweLogin = async () => {
 if (!address || !chain?.id) return;

 setAuthLoading(true);
 setAuthError("");

 try {
 const nonceRes = await fetch("/api/auth/nonce", {
 method: "GET",
 cache: "no-store",
 });

 const nonceText = await nonceRes.text();
 let nonceData: any;

 try {
 nonceData = JSON.parse(nonceText);
 } catch {
 throw new Error(
 `Nonce API did not return JSON: ${nonceText.slice(0, 120)}`
 );
 }

 if (!nonceRes.ok || !nonceData.success || !nonceData.nonce) {
 throw new Error(nonceData.error || "Failed to fetch nonce.");
 }

 const issuedAt = new Date().toISOString();

 const preparedMessage =
 `${window.location.host} wants you to sign in with your Ethereum account:\n` +
 `${address}\n` +
 `\n` +
 `Sign in to DreamBuilder.\n` +
 `\n` +
 `URI: ${window.location.origin}\n` +
 `Version: 1\n` +
 `Chain ID: ${chain.id}\n` +
 `Nonce: ${nonceData.nonce}\n` +
 `Issued At: ${issuedAt}`;

 const signature = await signMessageAsync({
 account: address,
 message: preparedMessage,
 });

 const verifyRes = await fetch("/api/auth/verify", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 message: preparedMessage,
 signature,
 }),
 });

 const verifyText = await verifyRes.text();
 let verifyData: any;

 try {
 verifyData = JSON.parse(verifyText);
 } catch {
 throw new Error(
 `Verify API did not return JSON: ${verifyText.slice(0, 120)}`
 );
 }

 if (!verifyRes.ok || !verifyData.success) {
 throw new Error(
 verifyData.detail
 ? JSON.stringify(verifyData.detail)
 : verifyData.error || "Verify failed."
 );
 }

 setAuthUser(verifyData.user || null);

 await syncWalletToUnifiedAccount({
 walletAddress: address,
 chainId: chain.id,
 });
 } catch (error) {
 console.error("handleSiweLogin error:", error);
 setAuthError(error instanceof Error ? error.message : text.signInFailed);
 setAuthUser(null);
 } finally {
 setAuthLoading(false);
 }
 };

 const handleDisconnect = async () => {
 try {
 await fetch("/api/auth/logout", {
 method: "POST",
 });
 } catch (error) {
 console.error("logout error:", error);
 } finally {
 disconnect();
 setAuthUser(null);
 setAuthError("");
 setOpen(false);
 }
 };

 const handleClearUnifiedAccount = async () => {
 clearAppAccountSession();

 if (typeof window !== "undefined") {
 window.localStorage.removeItem("private_chat_account_session_v1");
 }

 setAppSession(null);
 setAuthError("");

 try {
 await fetch("/api/auth/logout", {
 method: "POST",
 });
 } catch (error) {
 console.error("logout error:", error);
 }

 setAuthUser(null);
 };

 const usdtDisplay =
 isUsdtBalanceLoading ||
 usdtRawBalance === undefined ||
 usdtDecimals === undefined
 ? text.loadingBalance
 : `${formatUsdtBalance(
 usdtRawBalance as bigint,
 Number(usdtDecimals)
 )} ${usdtSymbol || "USDT"}`;

 const appAccountBadge = appSession ? (
 <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700">
 <span>{appSession.avatar || "🌙"}</span>
 <span className="max-w-[130px] truncate">
 {appSession.displayName || text.unifiedAccount}
 </span>
 </div>
 ) : null;

 if (!isConnected) {
 return (
 <div className="relative flex items-center gap-2" ref={menuRef}>
 {appSession ? (
 <>
 {appAccountBadge}

 <div className="hidden rounded-2xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 sm:block">
 {appSession.email
 ? text.emailAccount
 : appSession.walletAddress
 ? text.walletAccount
 : text.unifiedSignedIn}
 </div>
 </>
 ) : null}

 <button
 type="button"
 onClick={() => setOpen((prev) => !prev)}
 className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_5px_14px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 hover:shadow-[0_12px_24px_rgba(0,0,0,0.10)]"
 >
 {isPending ? text.connecting : text.connectWallet}
 </button>

 {appSession ? (
 <button
 type="button"
 onClick={handleClearUnifiedAccount}
 className="hidden rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 sm:block"
 >
 {text.clearUnifiedAccount}
 </button>
 ) : null}

 {open ? (
 <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-[280px] overflow-hidden rounded-3xl border border-neutral-200 bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.14)]">
 <div className="px-3 py-2 text-xs font-semibold tracking-[0.08em] text-neutral-400">
 {text.selectWallet}
 </div>

 {appSession ? (
 <div className="mb-2 rounded-2xl bg-sky-50 px-3 py-2">
 <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
 <span>{appSession.avatar}</span>
 <span className="truncate">{appSession.displayName}</span>
 </div>
 <div className="mt-1 truncate text-xs text-sky-600/70">
 {appSession.email ||
 appSession.walletAddress ||
 text.unifiedSignedIn}
 </div>
 </div>
 ) : null}

 <div className="space-y-1">
 {walletOptions.map((wallet) => (
 <button
 key={wallet.key}
 type="button"
 onClick={() => {
 if (!injectedConnector) return;
 connect({ connector: injectedConnector });
 setOpen(false);
 }}
 disabled={!injectedConnector || isPending}
 className="flex w-full items-start justify-between rounded-2xl px-4 py-3 text-left transition-all duration-200 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <div>
 <div className="text-sm font-semibold text-neutral-900">
 {wallet.label}
 </div>
 <div className="mt-1 text-xs text-neutral-500">
 {wallet.desc}
 </div>
 </div>
 <span className="text-sm font-semibold text-neutral-400">
 →
 </span>
 </button>
 ))}
 </div>

 {!injectedConnector ? (
 <div className="px-3 pb-2 pt-2 text-xs text-red-500">
 {text.noWallet}
 </div>
 ) : null}

 {error ? (
 <div className="px-3 pb-2 pt-2 text-xs text-red-500">
 {error.message}
 </div>
 ) : null}

 {appSession ? (
 <button
 type="button"
 onClick={handleClearUnifiedAccount}
 className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
 >
 {text.clearUnifiedAccount}
 </button>
 ) : null}
 </div>
 ) : null}
 </div>
 );
 }

 return (
 <div className="flex flex-wrap items-center gap-2">
 {appAccountBadge}

 <div className="rounded-2xl bg-neutral-100 px-3 py-2.5 text-sm font-medium text-neutral-800">
 {address?.slice(0, 6)}...{address?.slice(-4)}
 </div>

 <div
 className={`rounded-2xl px-3 py-2.5 text-sm font-semibold ${
 isBsc
 ? "bg-emerald-100 text-emerald-700"
 : "bg-amber-100 text-amber-700"
 }`}
 >
 {isBsc ? "BSC" : chain?.name || text.unknownNetwork}
 </div>

 {isBsc ? (
 <div className="rounded-2xl bg-neutral-100 px-3 py-2.5 text-sm font-medium text-neutral-800">
 {text.usdtBalance}: {usdtDisplay}
 </div>
 ) : null}

 {!authUser ? (
 <button
 type="button"
 onClick={handleSiweLogin}
 disabled={authLoading}
 className="rounded-2xl bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-black disabled:opacity-50"
 >
 {authLoading ? text.signing : text.signIn}
 </button>
 ) : (
 <div className="rounded-2xl bg-sky-100 px-3 py-2.5 text-sm font-semibold text-sky-700">
 {text.signedIn}
 </div>
 )}

 {!isBsc ? (
 <button
 type="button"
 onClick={() => switchChain({ chainId: bsc.id })}
 disabled={isSwitchingChain}
 className="rounded-2xl bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-black disabled:opacity-50"
 >
 {isSwitchingChain ? text.switching : text.switchToBsc}
 </button>
 ) : null}

 <button
 type="button"
 onClick={handleDisconnect}
 className="rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900"
 >
 {text.disconnect}
 </button>

 {appSession ? (
 <button
 type="button"
 onClick={handleClearUnifiedAccount}
 className="rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900"
 >
 {text.clearUnifiedAccount}
 </button>
 ) : null}

 {authError ? (
 <div className="text-xs text-red-500">{authError}</div>
 ) : null}
 </div>
 );
}