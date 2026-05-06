"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { privateChatSupabase } from "../lib/supabaseClient";
import {
  clearPrivateChatAccountSession,
  getCurrentPrivateChatAuthSession,
  type PrivateChatAuthSession,
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
import PrivateChatOwnerMembershipManager from "./PrivateChatOwnerMembershipManager";

const PRIVATE_CHAT_LOGOUT_COOLDOWN_KEY =
  "private_chat_logout_cooldown_until_v1";

const ROOM_FAVORITE_COLLAPSED_LIMIT = 6;

// 开发期：显示测试激活、取消已激活订单并恢复 Free 等测试按钮
// 正式上线时改成 false
const IS_MEMBERSHIP_DEV_MODE = false;

const MEMBERSHIP_PLAN_UPDATED_EVENT = "private_chat_membership_plans_updated_v1";

const BSC_CHAIN_ID_HEX = "0x38";
const BSC_USDT_CONTRACT_ADDRESS =
  "0x55d398326f99059fF775485246999027B3197955";
const BSC_USDT_DECIMALS = 18;

function getBrowserEthereumProvider() {
  if (typeof window === "undefined") return null;

  return (window as unknown as { ethereum?: unknown }).ethereum as
    | {
        request?: (params: {
          method: string;
          params?: unknown[] | Record<string, unknown>;
        }) => Promise<unknown>;
      }
    | null
    | undefined;
}

function decimalToTokenUnitsDecimalString(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";

  const fixed = value.toFixed(decimals);
  const [integerPart = "0", decimalPart = ""] = fixed.split(".");
  const cleanedInteger = integerPart.replace(/\D/g, "") || "0";
  const cleanedDecimal = decimalPart
    .replace(/\D/g, "")
    .padEnd(decimals, "0")
    .slice(0, decimals);

  return `${cleanedInteger}${cleanedDecimal}`.replace(/^0+(?=\d)/, "") || "0";
}

function decimalStringToHex(value: string) {
  try {
    return BigInt(value || "0").toString(16);
  } catch {
    return "0";
  }
}

function padHexTo32Bytes(value: string) {
  return value.replace(/^0x/i, "").padStart(64, "0");
}

function encodeErc20TransferData(toAddress: string, amount: number) {
  const cleanedToAddress = toAddress.trim().replace(/^0x/i, "").toLowerCase();

  if (!/^[a-f0-9]{40}$/.test(cleanedToAddress)) {
    throw new Error("会员收款地址格式不正确，无法发起钱包支付。");
  }

  const amountUnits = decimalToTokenUnitsDecimalString(
    amount,
    BSC_USDT_DECIMALS
  );

  if (amountUnits === "0") {
    throw new Error("订单金额不正确，无法发起钱包支付。");
  }

  const amountHex = decimalStringToHex(amountUnits);

  return `0xa9059cbb${padHexTo32Bytes(cleanedToAddress)}${padHexTo32Bytes(
    amountHex
  )}`;
}

async function ensureWalletOnBscNetwork() {
  const ethereum = getBrowserEthereumProvider();

  if (!ethereum?.request) {
    throw new Error("没有检测到浏览器钱包，请先安装或打开钱包插件。");
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? Number((error as { code?: unknown }).code)
        : 0;

    if (code !== 4902) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BSC_CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18,
          },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com/"],
        },
      ],
    });
  }
}

async function sendBscUsdtMembershipPayment(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
}) {
  const ethereum = getBrowserEthereumProvider();

  if (!ethereum?.request) {
    throw new Error("没有检测到浏览器钱包，请先安装或打开钱包插件。");
  }

  const accountsResult = await ethereum.request({
    method: "eth_requestAccounts",
  });

  const accounts = Array.isArray(accountsResult)
    ? accountsResult.filter((item): item is string => typeof item === "string")
    : [];

  const connectedAccount = accounts[0]?.toLowerCase();
  const expectedAccount = params.fromAddress.toLowerCase();

  if (!connectedAccount) {
    throw new Error("钱包未连接，请先连接钱包后再支付。");
  }

  if (expectedAccount && connectedAccount !== expectedAccount) {
    throw new Error(
      `当前钱包地址与账户绑定钱包不一致。当前钱包：${connectedAccount}，绑定钱包：${expectedAccount}`
    );
  }

  await ensureWalletOnBscNetwork();

  const data = encodeErc20TransferData(params.toAddress, params.amount);

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: connectedAccount,
        to: BSC_USDT_CONTRACT_ADDRESS,
        value: "0x0",
        data,
      },
    ],
  });

  if (typeof txHash !== "string" || !txHash) {
    throw new Error("钱包没有返回交易哈希，支付可能未成功发起。");
  }

  return txHash;
}


type AccountStats = {
  friends: number;
  blockedUsers: number;
  savedRooms: number;
};

type ManageTab = "friends" | "blocked" | "rooms";

type FriendRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  friend_id: string;
  friend_name: string;
  friend_remark: string | null;
  friend_avatar: string | null;
  status: "active" | "removed";
  created_at: string;
  removed_at: string | null;
  updated_at: string;
};

type UserBlockRow = {
  id: string;
  blocker_id: string;
  blocker_name: string | null;
  blocked_id: string;
  blocked_name: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  lifted_at: string | null;
  lifted_by: string | null;
};

type RoomFavoriteRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  room_id: string;
  room_name: string;
  room_remark: string | null;
  secret_code: string;
  room_avatar: string;
  status: "active" | "removed";
  created_at: string;
  removed_at: string | null;
  updated_at: string;
};

type PrivateActionResponse<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type AdminRole = "owner" | "admin" | null;

type AdminOverview = {
  adminCount: number;
  activeBanCount: number;
  activeAnnouncementCount: number;
  publicChatPaused: boolean;
  cooldownSeconds: number;
};

type AdminOverviewResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: {
    role?: AdminRole;
    overview?: Partial<AdminOverview>;
  };
};

type OwnerTrafficTrendPoint = {
  label: string;
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
  onlineUsers: number;
};

type OwnerTrafficDailyVisit = {
  date: string;
  label?: string;
  visits: number;
  uniqueVisitors: number;
  pageViews?: number;
};

type OwnerTrafficStats = {
  onlineNow: number;
  todayVisits: number;
  todayUniqueVisitors: number;
  todayPageViews?: number;
  weekVisits: number;
  weekUniqueVisitors: number;
  weekPageViews?: number;
  monthVisits: number;
  monthUniqueVisitors: number;
  monthPageViews?: number;
  totalVisits: number;
  totalUniqueVisitors: number;
  totalPageViews: number;
  recentPresenceCount?: number;
  recentDailyVisits?: OwnerTrafficDailyVisit[];
  hourlyVisits?: OwnerTrafficDailyVisit[];
  monthlyDailyVisits?: OwnerTrafficDailyVisit[];
  dailyTrend?: OwnerTrafficTrendPoint[];
  source?: string;
};

type OwnerStats = {
  storageUsedBytes: number;
  storageLimitBytes: number;
  monthlyTrafficBytes: number;
  monthlyTrafficLimitBytes: number;
  totalUploadBytes: number;
  deletedMediaBytes: number;
  activeMediaCount: number;
  deletedMediaCount: number;
  imageCount: number;
  videoCount: number;
  publicMessageCount: number;
  privateMessageCount: number;
  todayMessageCount: number;
  traffic?: OwnerTrafficStats;
};

type OwnerStatsResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: {
    storage?: Record<string, unknown>;
    messages?: Record<string, unknown>;
    media?: Record<string, unknown>;
    moderation?: Record<string, unknown>;
    traffic?: Record<string, unknown>;
  };
};

type MembershipLevel = "free" | "vip" | "svip";
type MembershipStatus = "active" | "expired" | "cancelled" | "manual";

type MembershipRow = {
  accountId: string;
  email: string | null;
  displayName: string | null;
  walletAddress: string | null;
  membershipLevel: MembershipLevel;
  membershipStatus: MembershipStatus;
  membershipStartedAt: string | null;
  membershipExpiresAt: string | null;
  membershipSource: string | null;
  membershipNote: string | null;
};

type OrderStatus =
  | "pending"
  | "paid"
  | "active"
  | "cancelled"
  | "expired"
  | "failed";

type MembershipOrderRow = {
  id: string;
  accountId: string;
  chatUserId: string | null;
  userName: string | null;
  userAvatar: string | null;
  membershipLevel: MembershipLevel;
  durationDays: number;
  amount: number;
  currency: string;
  chain: string;
  walletAddress: string | null;
  paymentAddress: string | null;
  txHash: string | null;
  status: OrderStatus;
  source: string;
  startedAt: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type MembershipActionResponse<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type ActivateMembershipOrderData = {
  order: MembershipOrderRow;
  membership: MembershipRow;
};

type PaymentMethod = "usdt" | "alipay" | "wechat";

type MembershipPlan = {
  level: MembershipLevel;
  title: string;
  subtitle: string;
  price: string;
  period: string;
  tone: "free" | "vip" | "svip";
  features: string[];
  amount?: number;
  durationDays?: number;
  currency?: string;
  chain?: string;
  isActive?: boolean;
};

type MembershipPlanConfigRow = {
  level: Exclude<MembershipLevel, "free">;
  title: string;
  subtitle: string | null;
  amount: number;
  durationDays: number;
  currency: string;
  chain: string;
  isActive: boolean;
  updatedAt: string | null;
};

type MembershipMediaRule = {
  level: MembershipLevel;
  title: string;
  canUploadMedia: boolean;
  allowPublicRoomMedia: boolean;
  allowPrivateMedia: boolean;
  allowSecretRoomMedia: boolean;
  monthlyTrafficBytes: number;
  maxImageSizeBytes: number;
  maxVideoSizeBytes: number;
  storageDesc: string;
};

const MEMBERSHIP_MEDIA_RULES: Record<MembershipLevel, MembershipMediaRule> = {
  free: {
    level: "free",
    title: "普通会员",
    canUploadMedia: false,
    allowPublicRoomMedia: false,
    allowPrivateMedia: false,
    allowSecretRoomMedia: false,
    monthlyTrafficBytes: 0,
    maxImageSizeBytes: 0,
    maxVideoSizeBytes: 0,
    storageDesc: "仅支持文字聊天，不支持发送图片 / 视频。",
  },
  vip: {
    level: "vip",
    title: "VIP 会员",
    canUploadMedia: true,
    allowPublicRoomMedia: false,
    allowPrivateMedia: true,
    allowSecretRoomMedia: true,
    monthlyTrafficBytes: 1024 * 1024 * 1024,
    maxImageSizeBytes: 5 * 1024 * 1024,
    maxVideoSizeBytes: 50 * 1024 * 1024,
    storageDesc: "适合日常私聊和暗语房间发送图片 / 短视频。",
  },
  svip: {
    level: "svip",
    title: "SVIP 会员",
    canUploadMedia: true,
    allowPublicRoomMedia: false,
    allowPrivateMedia: true,
    allowSecretRoomMedia: true,
    monthlyTrafficBytes: 10 * 1024 * 1024 * 1024,
    maxImageSizeBytes: 10 * 1024 * 1024,
    maxVideoSizeBytes: 200 * 1024 * 1024,
    storageDesc: "适合高频私聊、暗语房间和更大视频文件。",
  },
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function shortenText(value?: string | null, start = 8, end = 6) {
  if (!value) return "";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
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

function setLogoutCooldown(milliseconds = 10000) {
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

function getProviderLabel(provider?: string | null) {
  if (provider === "email") return "邮箱登录";
  if (provider === "wallet") return "钱包登录";
  if (provider === "wechat") return "微信登录";
  if (provider === "dreambuilder") return "DreamBuilder";
  if (provider === "guest") return "游客";
  return "账户";
}

function getPrivateProviderFromAppSession(session: AppAccountSession) {
  if (session.loginProvider === "wallet" && session.walletAddress) {
    return "wallet" as const;
  }

  if (session.loginProvider === "wechat" && session.wechatOpenid) {
    return "wechat" as const;
  }

  if (session.loginProvider === "dreambuilder") {
    return "dreambuilder" as const;
  }

  if (session.email) {
    return "email" as const;
  }

  if (session.walletAddress) {
    return "wallet" as const;
  }

  return "email" as const;
}

function formatBytes(value?: number | null) {
  const bytes = typeof value === "number" && Number.isFinite(value) ? value : 0;

  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

function formatNumber(value?: number | null) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("zh-CN").format(number);
}

function formatDateTime(value?: string | null) {
  if (!value) return "未设置";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "未设置";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMembershipLabel(level?: MembershipLevel | null) {
  if (level === "vip") return "VIP";
  if (level === "svip") return "SVIP";
  return "Free";
}

function getMembershipStatusLabel(status?: MembershipStatus | null) {
  if (status === "expired") return "已过期";
  if (status === "cancelled") return "已取消";
  if (status === "manual") return "手动开通";
  return "正常";
}

function getMembershipDesc(level?: MembershipLevel | null) {
  if (level === "svip") {
    return "高级会员，适合重度使用私聊、暗语房、媒体房和更多收藏能力。";
  }

  if (level === "vip") {
    return "会员用户，适合更高频聊天、更多收藏房间和后续媒体额度扩展。";
  }

  return "普通用户，可使用基础聊天、私聊、暗语房、好友、黑名单和收藏房间。";
}

function getMembershipBadgeClass(level?: MembershipLevel | null) {
  if (level === "svip") return "bg-purple-400/10 text-purple-100";
  if (level === "vip") return "bg-fuchsia-400/10 text-fuchsia-100";
  return "bg-emerald-400/10 text-emerald-100";
}

function getOrderStatusLabel(status?: OrderStatus | null) {
  if (status === "paid") return "已支付";
  if (status === "active") return "已激活";
  if (status === "cancelled") return "已取消";
  if (status === "expired") return "已过期";
  if (status === "failed") return "失败";
  return "待支付";
}

function getOrderStatusClass(status?: OrderStatus | null) {
  if (status === "active") return "bg-emerald-400/10 text-emerald-100";
  if (status === "paid") return "bg-sky-400/10 text-sky-100";
  if (status === "cancelled") return "bg-slate-500/10 text-slate-300";
  if (status === "expired" || status === "failed") {
    return "bg-rose-500/10 text-rose-100";
  }
  return "bg-amber-400/10 text-amber-100";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function readOwnerTrafficDailyVisits(value: unknown): OwnerTrafficDailyVisit[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return {
          date: "",
          label: "第 " + (index + 1) + " 天",
          visits: 0,
          uniqueVisitors: 0,
          pageViews: 0,
        };
      }

      const row = item as Record<string, unknown>;

      return {
        date: typeof row.date === "string" ? row.date : "",
        label: typeof row.label === "string" ? row.label : undefined,
        visits: readNumber(row.visits),
        uniqueVisitors: readNumber(row.uniqueVisitors),
        pageViews: readNumber(row.pageViews),
      };
    })
    .filter((item) => item.date || item.label);
}

function readOwnerTrafficStats(value: unknown): OwnerTrafficStats {
  const traffic =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    onlineNow: readNumber(traffic.onlineNow),
    todayVisits: readNumber(traffic.todayVisits),
    weekVisits: readNumber(traffic.weekVisits),
    monthVisits: readNumber(traffic.monthVisits),
    totalVisits: readNumber(traffic.totalVisits),
    totalPageViews: readNumber(traffic.totalPageViews),
    todayUniqueVisitors: readNumber(traffic.todayUniqueVisitors),
    weekUniqueVisitors: readNumber(traffic.weekUniqueVisitors),
    monthUniqueVisitors: readNumber(traffic.monthUniqueVisitors),
    totalUniqueVisitors: readNumber(traffic.totalUniqueVisitors),
    recentPresenceCount: readNumber(traffic.recentPresenceCount),
    recentDailyVisits: readOwnerTrafficDailyVisits(traffic.recentDailyVisits),
  };
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    );
  }

  if (typeof value === "number") return value === 1;

  return false;
}

function buildDmHref(params: {
  friendId: string;
  friendName?: string | null;
  friendAvatar?: string | null;
}) {
  const searchParams = new URLSearchParams();

  searchParams.set("userId", params.friendId);
  searchParams.set("userName", params.friendName || "私聊对象");
  searchParams.set("userAvatar", params.friendAvatar || "👤");

  return `/private-chat/private?${searchParams.toString()}`;
}

function buildSecretRoomHref(secretCode: string) {
  const searchParams = new URLSearchParams();

  searchParams.set("mode", "secret");
  searchParams.set("code", secretCode);

  return `/private-chat/private?${searchParams.toString()}`;
}

async function countRowsByColumns(params: {
  table: string;
  columns: string[];
  value: string | null;
}) {
  if (!params.value) return 0;

  for (const column of params.columns) {
    const { count, error } = await privateChatSupabase
      .from(params.table)
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(column, params.value);

    if (!error) {
      return count || 0;
    }
  }

  return 0;
}

async function callPrivateAction<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/private-chat/private-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  let result: PrivateActionResponse<T> | null = null;

  try {
    result = JSON.parse(responseText) as PrivateActionResponse<T>;
  } catch {
    result = null;
  }

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        `操作失败，状态码：${response.status}`
    );
  }

  return result;
}

async function callMembershipAction<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/private-chat/membership", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  let result: MembershipActionResponse<T> | null = null;

  try {
    result = JSON.parse(responseText) as MembershipActionResponse<T>;
  } catch {
    result = null;
  }

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        `会员操作失败，状态码：${response.status}`
    );
  }

  return result;
}


function createEmptyOwnerTrafficStats(): OwnerTrafficStats {
  const trend = Array.from({ length: 7 }, (_, index) => ({
    label: '第 ' + (index + 1) + ' 天',
    visits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    onlineUsers: 0,
  }));

  return {
    onlineNow: 0,
    todayVisits: 0,
    todayUniqueVisitors: 0,
    todayPageViews: 0,
    weekVisits: 0,
    weekUniqueVisitors: 0,
    weekPageViews: 0,
    monthVisits: 0,
    monthUniqueVisitors: 0,
    monthPageViews: 0,
    totalVisits: 0,
    totalUniqueVisitors: 0,
    totalPageViews: 0,
    dailyTrend: trend,
    source: 'empty',
  };
}

function readNumberByKeys(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(source[key]);

    if (value > 0) return value;
  }

  const firstKey = keys[0];
  return firstKey ? readNumber(source[firstKey]) : 0;
}

function parseOwnerTrafficTrend(value: unknown): OwnerTrafficTrendPoint[] {
  if (!Array.isArray(value)) {
    return createEmptyOwnerTrafficStats().dailyTrend || [];
  }

  const list = value.slice(-7).map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const rawLabel =
      row.label ||
      row.date ||
      row.day ||
      row.dayLabel ||
      row.createdDate ||
      row.visitDate ||
      '';

    return {
      label: String(rawLabel || '第 ' + (index + 1) + ' 天'),
      visits: readNumberByKeys(row, ['visits', 'visitCount', 'totalVisits', 'pageVisits']),
      uniqueVisitors: readNumberByKeys(row, [
        'uniqueVisitors',
        'visitorCount',
        'uniqueVisitorCount',
        'visitors',
      ]),
      pageViews: readNumberByKeys(row, ['pageViews', 'pageViewCount', 'views']),
      onlineUsers: readNumberByKeys(row, ['onlineUsers', 'onlineCount', 'peakOnlineUsers']),
    };
  });

  while (list.length < 7) {
    list.unshift({
      label: '第 ' + (list.length + 1) + ' 天',
      visits: 0,
      uniqueVisitors: 0,
      pageViews: 0,
      onlineUsers: 0,
    });
  }

  return list;
}

function parseOwnerTrafficStats(value: unknown): OwnerTrafficStats {
  const empty = createEmptyOwnerTrafficStats();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const traffic = value as Record<string, unknown>;

  const recentDailyVisits = readOwnerTrafficDailyVisits(
    traffic.recentDailyVisits ||
      traffic.dailyVisits ||
      traffic.dailyTrend ||
      traffic.trend ||
      traffic.last7Days ||
      traffic.dailyStats
  );

  const hourlyVisits = readOwnerTrafficDailyVisits(
    traffic.hourlyVisits || traffic.recentHourlyVisits || traffic.hourlyTrend
  );

  const monthlyDailyVisits = readOwnerTrafficDailyVisits(
    traffic.monthlyDailyVisits ||
      traffic.last30Days ||
      traffic.monthTrend ||
      traffic.monthlyTrend
  );

  const dailyTrend = parseOwnerTrafficTrend(
    traffic.dailyTrend ||
      traffic.trend ||
      traffic.last7Days ||
      traffic.dailyStats ||
      traffic.recentDailyVisits ||
      traffic.dailyVisits
  );

  return {
    onlineNow: readNumberByKeys(traffic, [
      "onlineNow",
      "onlineUserCount",
      "onlineUsers",
      "activePresenceCount",
      "currentOnline",
    ]),

    todayVisits: readNumberByKeys(traffic, [
      "todayVisits",
      "todayVisitCount",
      "visitsToday",
      "todayTotalVisits",
      "todayPageViews",
      "todayPageViewCount",
    ]),

    todayUniqueVisitors: readNumberByKeys(traffic, [
      "todayUniqueVisitors",
      "todayVisitorCount",
      "uniqueVisitorsToday",
      "todayUniqueVisitorCount",
    ]),

    todayPageViews: readNumberByKeys(traffic, [
      "todayPageViews",
      "todayPageViewCount",
      "pageViewsToday",
      "todayVisits",
    ]),

    weekVisits: readNumberByKeys(traffic, [
      "weekVisits",
      "weeklyVisits",
      "last7DaysVisits",
      "weekPageViews",
      "weeklyPageViews",
    ]),

    weekUniqueVisitors: readNumberByKeys(traffic, [
      "weekUniqueVisitors",
      "weeklyUniqueVisitors",
      "last7DaysUniqueVisitors",
      "weekUniqueVisitorCount",
    ]),

    weekPageViews: readNumberByKeys(traffic, [
      "weekPageViews",
      "weeklyPageViews",
      "last7DaysPageViews",
      "weekVisits",
    ]),

    monthVisits: readNumberByKeys(traffic, [
      "monthVisits",
      "monthlyVisits",
      "currentMonthVisits",
      "monthPageViews",
      "monthlyPageViews",
    ]),

    monthUniqueVisitors: readNumberByKeys(traffic, [
      "monthUniqueVisitors",
      "monthlyUniqueVisitors",
      "currentMonthUniqueVisitors",
      "monthUniqueVisitorCount",
    ]),

    monthPageViews: readNumberByKeys(traffic, [
      "monthPageViews",
      "monthlyPageViews",
      "currentMonthPageViews",
      "monthVisits",
    ]),

    totalVisits: readNumberByKeys(traffic, [
      "totalVisits",
      "totalVisitCount",
      "allVisits",
      "totalPageViews",
      "totalPageViewCount",
    ]),

    totalUniqueVisitors: readNumberByKeys(traffic, [
      "totalUniqueVisitors",
      "totalVisitorCount",
      "allUniqueVisitors",
      "uniqueVisitorCount",
    ]),

    totalPageViews: readNumberByKeys(traffic, [
      "totalPageViews",
      "totalPageViewCount",
      "allPageViews",
      "totalVisits",
    ]),

    recentPresenceCount: readNumberByKeys(traffic, [
      "recentPresenceCount",
      "activePresenceCount",
      "onlineNow",
      "onlineUsers",
    ]),

    recentDailyVisits,
    hourlyVisits,
    monthlyDailyVisits,
    dailyTrend,

    source: String(
      traffic.source || "private_chat_site_visits / private_chat_site_presence"
    ),
  };
}

function readTrafficChartRows(value: unknown): Array<{
  label: string;
  visits: number;
  uniqueVisitors: number;
}> {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};

    const rawLabel =
      typeof row.hour === "string"
        ? row.hour
        : typeof row.date === "string"
          ? row.date
          : typeof row.label === "string"
            ? row.label
            : "";

    const visits = readNumberByKeys(row, ["visits", "pv", "pageViews", "views"]);
    const uniqueVisitors = readNumberByKeys(row, [
      "uniqueVisitors",
      "uv",
      "visitorCount",
      "visitors",
    ]);

    const label = rawLabel || "第 " + (index + 1) + " 项";

    return {
      label,
      visits,
      uniqueVisitors,
    };
  });
}

function formatTrafficChartLabel(label: string, range: "day" | "week" | "month") {
  if (!label) return "";

  if (range === "day") {
    return label.slice(-5);
  }

  if (label.length >= 10) {
    return label.slice(5);
  }

  return label;
}

function buildSmoothPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number
) {
  if (points.length === 0) {
    return {
      linePath: "",
      areaPath: "",
    };
  }

  if (points.length === 1) {
    const point = points[0];

    return {
      linePath: `M ${point.x} ${point.y}`,
      areaPath: `M ${point.x} ${height} L ${point.x} ${point.y} L ${point.x} ${height} Z`,
    };
  }

  let linePath = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    linePath += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;

  return {
    linePath,
    areaPath,
  };
}

function TrafficTrendChart({
  traffic,
}: {
  traffic?: OwnerTrafficStats | null;
}) {
  const [range, setRange] = useState<"day" | "week" | "month">("week");

  const points =
    range === "day"
      ? readTrafficChartRows(traffic?.hourlyVisits)
      : range === "month"
        ? readTrafficChartRows(traffic?.monthlyDailyVisits)
        : readTrafficChartRows(traffic?.recentDailyVisits);

  const totalVisits =
    range === "day"
      ? traffic?.todayVisits || 0
      : range === "month"
        ? traffic?.monthVisits || 0
        : traffic?.weekVisits || 0;

  const totalUniqueVisitors =
    range === "day"
      ? traffic?.todayUniqueVisitors || 0
      : range === "month"
        ? traffic?.monthUniqueVisitors || 0
        : traffic?.weekUniqueVisitors || 0;

  const maxVisits = Math.max(1, ...points.map((item) => item.visits));
  const peakVisits = Math.max(0, ...points.map((item) => item.visits));
  const averageVisits = points.length > 0 ? totalVisits / points.length : 0;

  const chartWidth = 760;
  const chartHeight = 240;
  const chartPaddingX = 18;
  const chartPaddingTop = 18;
  const chartPaddingBottom = 34;
  const usableWidth = chartWidth - chartPaddingX * 2;
  const usableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  const chartPoints = points.map((item, index) => {
    const x =
      points.length <= 1
        ? chartPaddingX + usableWidth / 2
        : chartPaddingX + (usableWidth / (points.length - 1)) * index;

    const y =
      chartPaddingTop +
      usableHeight -
      (item.visits / maxVisits) * usableHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const { linePath, areaPath } = buildSmoothPath(
    chartPoints.map((item) => ({ x: item.x, y: item.y })),
    chartWidth,
    chartHeight - chartPaddingBottom
  );

  if (points.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-3 text-center text-[11px] leading-5 text-slate-400">
        暂无访问趋势数据。打开 /private-chat 或 /private-chat/private 后，
        系统会逐步写入访问记录。
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-white">最近访问趋势</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            可切换查看 1 天 / 1 周 / 1 月的访问量曲线趋势图。
          </p>
        </div>

        <div className="inline-flex rounded-2xl border border-white/10 bg-slate-950/45 p-1">
          {[
            { key: "day" as const, label: "1天" },
            { key: "week" as const, label: "1周" },
            { key: "month" as const, label: "1月" },
          ].map((item) => {
            const isActive = range === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setRange(item.key)}
                className={
                  "rounded-xl px-3 py-1.5 text-[11px] transition " +
                  (isActive
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-950/35"
                    : "text-slate-400 hover:bg-white/10 hover:text-white")
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniInfoCard
          label="区间访问量"
          value={formatNumber(totalVisits)}
          valueClassName="text-purple-100"
          desc={range === "day" ? "最近 24 小时" : range === "week" ? "最近 7 天" : "最近 30 天"}
        />

        <MiniInfoCard
          label="独立访客"
          value={formatNumber(totalUniqueVisitors)}
          valueClassName="text-cyan-100"
          desc="按 visitor_id 去重"
        />

        <MiniInfoCard
          label="峰值访问"
          value={formatNumber(peakVisits)}
          valueClassName="text-emerald-100"
          desc="单个时间点最高访问量"
        />

        <MiniInfoCard
          label="平均访问"
          value={averageVisits.toFixed(1)}
          valueClassName="text-amber-100"
          desc="当前区间平均值"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(124,58,237,0.10),rgba(15,23,42,0.45))] p-3">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[260px] w-full"
          aria-label="访问趋势曲线图"
          role="img"
        >
          <defs>
            <linearGradient id="trafficAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(192,132,252,0.45)" />
              <stop offset="100%" stopColor="rgba(192,132,252,0.04)" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((step) => {
            const y =
              chartPaddingTop + (usableHeight / 4) * step;

            return (
              <line
                key={step}
                x1={chartPaddingX}
                x2={chartWidth - chartPaddingX}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
            );
          })}

          {areaPath ? (
            <path
              d={areaPath}
              fill="url(#trafficAreaGradient)"
              stroke="none"
            />
          ) : null}

          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="rgb(196, 132, 252)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {chartPoints.map((item, index) => (
            <g key={item.label + "-" + index}>
              <circle
                cx={item.x}
                cy={item.y}
                r="4"
                fill="rgb(232, 213, 255)"
                stroke="rgb(196, 132, 252)"
                strokeWidth="2"
              />
              <text
                x={item.x}
                y={item.y - 10}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.72)"
              >
                {item.visits}
              </text>
            </g>
          ))}

          {chartPoints.map((item, index) => (
            <text
              key={"label-" + item.label + "-" + index}
              x={item.x}
              y={chartHeight - 8}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.6)"
            >
              {formatTrafficChartLabel(item.label, range)}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {chartPoints
          .filter((_, index) => {
            if (range === "day") {
              return index % 6 === 0 || index === chartPoints.length - 1;
            }

            if (range === "month") {
              return index % 5 === 0 || index === chartPoints.length - 1;
            }

            return true;
          })
          .map((item, index) => (
            <div
              key={"summary-" + item.label + "-" + index}
              className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-[11px] text-slate-300"
            >
              <span className="text-slate-400">{item.label}</span>
              <span className="ml-2">访问 {formatNumber(item.visits)}</span>
              <span className="ml-2">独立访客 {formatNumber(item.uniqueVisitors)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}


function ProgressBar({ value, limit }: { value: number; limit: number }) {
  const percent =
    limit > 0 ? Math.min(100, Math.max(0, (value / limit) * 100)) : 0;

  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 shadow-[0_0_18px_rgba(56,189,248,0.35)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{percent.toFixed(1)}%</span>
        <span>
          {formatBytes(value)} / {formatBytes(limit)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/30 px-3 py-4 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  desc,
  badge,
  children,
  right,
  tone = "default",
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  badge?: string;
  children: ReactNode;
  right?: ReactNode;
  tone?: "default" | "fuchsia" | "purple" | "emerald" | "blue" | "cyan" | "amber" | "rose" | "slate" | "ownerLight";
}) {
  const toneClass =
    tone === "purple"
      ? "border-purple-400/20 bg-purple-500/[0.05]"
      : tone === "fuchsia"
        ? "border-fuchsia-400/20 bg-fuchsia-500/[0.05]"
        : tone === "emerald"
          ? "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.45))]"
          : "border-white/10 bg-slate-950/28";

  return (
    <section className={`relative overflow-hidden rounded-[1.35rem] border p-4 ring-1 ring-white/[0.06] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[\'\'] ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-sm text-slate-400">{eyebrow}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">{title}</h2>

            {badge ? (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                {badge}
              </span>
            ) : null}
          </div>

          {desc ? (
            <p className="mt-1 text-sm leading-5 text-slate-400">{desc}</p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniInfoCard({
  label,
  value,
  desc,
  valueClassName = "text-white",
  badge,
}: {
  label: string;
  value: ReactNode;
  desc?: string;
  valueClassName?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/25 p-3 shadow-inner shadow-white/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>

        {badge ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-400">
            {badge}
          </span>
        ) : null}
      </div>

      <p className={`mt-2 truncate text-base font-semibold ${valueClassName}`}>
        {value}
      </p>

      {desc ? (
        <p className="mt-1 text-[11px] leading-5 text-slate-400">{desc}</p>
      ) : null}
    </div>
  );
}

function StatusNotice({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 text-sm leading-5 ${
        type === "success"
          ? "bg-emerald-400/10 text-emerald-100"
          : "bg-rose-500/10 text-rose-100"
      }`}
    >
      {text}
    </div>
  );
}

const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    level: "free",
    title: "普通会员",
    subtitle: "Free",
    price: "免费",
    period: "长期有效",
    tone: "free",
    features: [
      "公共大厅文字聊天",
      "一对一文字私聊",
      "暗语私密房间文字聊天",
      "基础好友管理",
      "基础黑名单",
      "不能发送图片 / 视频",
    ],
  },
  {
    level: "vip",
    title: "VIP 会员",
    subtitle: "适合高频聊天用户",
    price: "9.9 USDT",
    period: "30 天",
    tone: "vip",
    features: [
      "包含普通会员全部能力",
      "私聊可发送图片 / 视频",
      "暗语房可发送图片 / 视频",
      "公共聊天室仅文字聊天",
      "月媒体流量 1GB",
      "可继续升级 SVIP",
    ],
  },
  {
    level: "svip",
    title: "SVIP 会员",
    subtitle: "适合重度私密聊天用户",
    price: "99 USDT",
    period: "365 天",
    tone: "svip",
    features: [
      "包含 VIP 全部能力",
      "私聊 / 暗语房更高媒体额度",
      "公共聊天室仍仅文字聊天",
      "月媒体流量 10GB",
      "更大视频文件上限",
      "未来专属功能优先开放",
    ],
  },
];

export default function PrivateChatAccountCenterPanel() {
  const [appSession, setAppSession] = useState<AppAccountSession | null>(null);
  const [authSession, setAuthSession] = useState<PrivateChatAuthSession | null>(
    null
  );

  const [email, setEmail] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");

  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [isListActionLoading, setIsListActionLoading] = useState(false);
  const [activeManageTab, setActiveManageTab] =
    useState<ManageTab>("friends");

  const [stats, setStats] = useState<AccountStats>({
    friends: 0,
    blockedUsers: 0,
    savedRooms: 0,
  });

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserBlockRow[]>([]);
  const [savedRooms, setSavedRooms] = useState<RoomFavoriteRow[]>([]);

  const [editingFriendRemarkId, setEditingFriendRemarkId] = useState<
    string | null
  >(null);
  const [friendRemarkInput, setFriendRemarkInput] = useState("");

  const [editingRoomRemarkId, setEditingRoomRemarkId] = useState<string | null>(
    null
  );
  const [roomRemarkInput, setRoomRemarkInput] = useState("");
  const [isSavedRoomsExpanded, setIsSavedRoomsExpanded] = useState(false);

  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [membershipOrders, setMembershipOrders] = useState<
    MembershipOrderRow[]
  >([]);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const [isMembershipOrderLoading, setIsMembershipOrderLoading] =
    useState(false);

  const [selectedMembershipPlan, setSelectedMembershipPlan] =
    useState<MembershipPlan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("usdt");
  const [membershipPlanConfigs, setMembershipPlanConfigs] = useState<
    MembershipPlanConfigRow[]
  >([]);
  const [isMembershipPlansLoading, setIsMembershipPlansLoading] =
    useState(false);
  const [isWalletPaymentSubmitting, setIsWalletPaymentSubmitting] =
    useState(false);
  const [isCheckingMembershipPayment, setIsCheckingMembershipPayment] =
    useState(false);

  const syncingRef = useRef(false);
  const mountedRef = useRef(false);
  const logoutRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    loadLocalSessions();
    refreshPublicMembershipPlans();

    const handleMembershipPlanUpdated = () => {
      refreshPublicMembershipPlans();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        MEMBERSHIP_PLAN_UPDATED_EVENT,
        handleMembershipPlanUpdated
      );
    }

    if (!isInLogoutCooldown()) {
      refreshUnifiedAccount();
    }

    return () => {
      mountedRef.current = false;

      if (typeof window !== "undefined") {
        window.removeEventListener(
          MEMBERSHIP_PLAN_UPDATED_EVENT,
          handleMembershipPlanUpdated
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chatUserId = authSession?.chatUser?.id || null;
    const accountId =
      appSession?.accountId ||
      authSession?.account?.accountId ||
      authSession?.profile?.accountId ||
      null;

    if (!chatUserId && !accountId) {
      setStats({
        friends: 0,
        blockedUsers: 0,
        savedRooms: 0,
      });
      setFriends([]);
      setBlockedUsers([]);
      setSavedRooms([]);
      return;
    }

    refreshAccountStats({
      chatUserId,
      accountId,
    });

    if (chatUserId) {
      refreshManagementLists(chatUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.chatUser?.id, appSession?.accountId]);

  useEffect(() => {
    const chatUserId = authSession?.chatUser?.id || null;

    if (!chatUserId) {
      setAdminRole(null);
      setAdminOverview(null);
      setOwnerStats(null);
      return;
    }

    refreshAdminPanels(chatUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.chatUser?.id]);

  useEffect(() => {
    const currentAccountId =
      appSession?.accountId ||
      authSession?.account?.accountId ||
      authSession?.profile?.accountId ||
      null;

    if (!currentAccountId) {
      setMembership(null);
      setMembershipOrders([]);
      return;
    }

    refreshMembership(currentAccountId);
    refreshMembershipOrders(currentAccountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appSession?.accountId,
    authSession?.account?.accountId,
    authSession?.profile?.accountId,
  ]);

  useEffect(() => {
    if (activeManageTab !== "rooms") {
      setIsSavedRoomsExpanded(false);
    }
  }, [activeManageTab]);

  function loadLocalSessions() {
    const latestAppSession = readAppAccountSession();
    const latestAuthSession = getCurrentPrivateChatAuthSession();

    setAppSession(latestAppSession);
    setAuthSession(latestAuthSession.isGuest ? null : latestAuthSession);
  }

  async function refreshAccountStats(params: {
    chatUserId: string | null;
    accountId: string | null;
  }) {
    if (logoutRef.current || isInLogoutCooldown()) return;

    setIsStatsLoading(true);

    try {
      const friendCount = await countRowsByColumns({
        table: "private_chat_friends",
        columns: [
          "owner_user_id",
          "user_id",
          "chat_user_id",
          "account_id",
          "owner_account_id",
        ],
        value: params.chatUserId || params.accountId,
      });

      const blockedCount = await countRowsByColumns({
        table: "private_chat_user_blocks",
        columns: [
          "owner_user_id",
          "user_id",
          "chat_user_id",
          "account_id",
          "owner_account_id",
        ],
        value: params.chatUserId || params.accountId,
      });

      let roomCount = 0;

      if (params.chatUserId) {
        const { count, error } = await privateChatSupabase
          .from("private_chat_room_favorites")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("user_id", params.chatUserId)
          .eq("status", "active");

        if (!error) {
          roomCount = count || 0;
        }
      }

      if (!mountedRef.current) return;

      setStats({
        friends: friendCount,
        blockedUsers: blockedCount,
        savedRooms: roomCount,
      });
    } catch {
      if (!mountedRef.current) return;

      setStats({
        friends: 0,
        blockedUsers: 0,
        savedRooms: 0,
      });
    } finally {
      if (mountedRef.current) {
        setIsStatsLoading(false);
      }
    }
  }

  async function refreshManagementLists(actorId?: string | null) {
    const currentActorId = actorId || authSession?.chatUser?.id || null;

    if (!currentActorId) return;
    if (logoutRef.current || isInLogoutCooldown()) return;

    setIsListsLoading(true);

    try {
      const [friendResult, blockResult, roomResult] = await Promise.all([
        callPrivateAction<FriendRow[]>({
          action: "list_friends",
          actorId: currentActorId,
        }),
        callPrivateAction<UserBlockRow[]>({
          action: "list_blocked_users",
          actorId: currentActorId,
        }),
        callPrivateAction<RoomFavoriteRow[]>({
          action: "list_room_favorites",
          actorId: currentActorId,
        }),
      ]);

      if (!mountedRef.current) return;

      const nextFriends = Array.isArray(friendResult.data)
        ? friendResult.data
        : [];
      const nextBlockedUsers = Array.isArray(blockResult.data)
        ? blockResult.data
        : [];
      const nextSavedRooms = Array.isArray(roomResult.data)
        ? roomResult.data
        : [];

      setFriends(nextFriends);
      setBlockedUsers(nextBlockedUsers);
      setSavedRooms(nextSavedRooms);

      setStats({
        friends: nextFriends.length,
        blockedUsers: nextBlockedUsers.length,
        savedRooms: nextSavedRooms.length,
      });
    } catch (error) {
      if (!mountedRef.current) return;

      const message =
        error instanceof Error ? error.message : "读取账户管理列表失败。";

      setErrorText(message);
    } finally {
      if (mountedRef.current) {
        setIsListsLoading(false);
      }
    }
  }

  async function handleRemoveFriend(friendId: string) {
    if (!chatUserId) {
      setErrorText("缺少当前聊天身份，无法取消关注。");
      return;
    }

    setIsListActionLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callPrivateAction<FriendRow[]>({
        action: "remove_friend",
        actorId: chatUserId,
        friendId,
      });

      await refreshManagementLists(chatUserId);

      setStatusText("已取消关注。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "取消关注失败。";

      setErrorText(message);
    } finally {
      setIsListActionLoading(false);
    }
  }

  function handleStartEditFriendRemark(item: FriendRow) {
    setEditingFriendRemarkId(item.friend_id);
    setFriendRemarkInput(item.friend_remark || "");
    setStatusText("");
    setErrorText("");
  }

  function handleCancelEditFriendRemark() {
    setEditingFriendRemarkId(null);
    setFriendRemarkInput("");
    setStatusText("");
    setErrorText("");
  }

  async function handleSaveFriendRemark(friendId: string, shouldClear = false) {
    if (!chatUserId) {
      setErrorText("缺少当前聊天身份，无法修改好友备注。");
      return;
    }

    setIsListActionLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callPrivateAction<FriendRow>({
        action: "update_friend_remark",
        actorId: chatUserId,
        friendId,
        friendRemark: shouldClear ? "" : friendRemarkInput,
      });

      await refreshManagementLists(chatUserId);

      setEditingFriendRemarkId(null);
      setFriendRemarkInput("");
      setStatusText(shouldClear ? "已清除好友备注。" : "好友备注已保存。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存好友备注失败。";

      setErrorText(message);
    } finally {
      setIsListActionLoading(false);
    }
  }

  async function handleUnblockUser(targetUserId: string) {
    if (!chatUserId) {
      setErrorText("缺少当前聊天身份，无法解除拉黑。");
      return;
    }

    setIsListActionLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callPrivateAction<UserBlockRow[]>({
        action: "unblock_user",
        actorId: chatUserId,
        targetUserId,
      });

      await refreshManagementLists(chatUserId);

      setStatusText("已解除拉黑。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "解除拉黑失败。";

      setErrorText(message);
    } finally {
      setIsListActionLoading(false);
    }
  }

  async function handleRemoveRoomFavorite(roomId: string) {
    if (!chatUserId) {
      setErrorText("缺少当前聊天身份，无法取消收藏房间。");
      return;
    }

    setIsListActionLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callPrivateAction<RoomFavoriteRow[]>({
        action: "remove_room_favorite",
        actorId: chatUserId,
        roomId,
      });

      await refreshManagementLists(chatUserId);

      setStatusText("已取消收藏房间。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "取消收藏房间失败。";

      setErrorText(message);
    } finally {
      setIsListActionLoading(false);
    }
  }

  function handleStartEditRoomRemark(item: RoomFavoriteRow) {
    setEditingRoomRemarkId(item.room_id);
    setRoomRemarkInput(item.room_remark || "");
    setStatusText("");
    setErrorText("");
  }

  function handleCancelEditRoomRemark() {
    setEditingRoomRemarkId(null);
    setRoomRemarkInput("");
    setStatusText("");
    setErrorText("");
  }

  async function handleSaveRoomRemark(roomId: string, shouldClear = false) {
    if (!chatUserId) {
      setErrorText("缺少当前聊天身份，无法修改房间备注。");
      return;
    }

    setIsListActionLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callPrivateAction<RoomFavoriteRow>({
        action: "update_room_favorite_remark",
        actorId: chatUserId,
        roomId,
        roomRemark: shouldClear ? "" : roomRemarkInput,
      });

      await refreshManagementLists(chatUserId);

      setEditingRoomRemarkId(null);
      setRoomRemarkInput("");
      setStatusText(shouldClear ? "已清除房间备注。" : "房间备注已保存。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存房间备注失败。";

      setErrorText(message);
    } finally {
      setIsListActionLoading(false);
    }
  }

  async function refreshAdminPanels(actorId?: string | null) {
    const currentActorId = actorId || authSession?.chatUser?.id || null;

    if (!currentActorId) return;
    if (logoutRef.current || isInLogoutCooldown()) return;

    setIsAdminLoading(true);

    try {
      const overviewResponse = await fetch("/api/private-chat/admin-overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          actorId: currentActorId,
        }),
      });

      const overviewText = await overviewResponse.text();

      let overviewResult: AdminOverviewResponse | null = null;

      try {
        overviewResult = JSON.parse(overviewText) as AdminOverviewResponse;
      } catch {
        overviewResult = null;
      }

      if (
        overviewResponse.status === 401 ||
        overviewResponse.status === 403 ||
        !overviewResult?.ok
      ) {
        if (!mountedRef.current) return;

        setAdminRole(null);
        setAdminOverview(null);
        setOwnerStats(null);
        return;
      }

      const role = overviewResult.data?.role || null;
      const overview = overviewResult.data?.overview || {};

      if (!mountedRef.current) return;

      setAdminRole(role);
      setAdminOverview({
        adminCount: readNumber(overview.adminCount),
        activeBanCount: readNumber(overview.activeBanCount),
        activeAnnouncementCount: readNumber(overview.activeAnnouncementCount),
        publicChatPaused: readBoolean(overview.publicChatPaused),
        cooldownSeconds: readNumber(overview.cooldownSeconds),
      });

      if (role !== "owner") {
        setOwnerStats(null);
        return;
      }

      const ownerStatsResponse = await fetch("/api/private-chat/admin-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          actorId: currentActorId,
        }),
      });

      const ownerStatsText = await ownerStatsResponse.text();

      let ownerStatsResult: OwnerStatsResponse | null = null;

      try {
        ownerStatsResult = JSON.parse(ownerStatsText) as OwnerStatsResponse;
      } catch {
        ownerStatsResult = null;
      }

      if (!ownerStatsResponse.ok || !ownerStatsResult?.ok) {
        setOwnerStats(null);
        return;
      }

      const storage = ownerStatsResult.data?.storage || {};
      const messages = ownerStatsResult.data?.messages || {};
      const media = ownerStatsResult.data?.media || {};
      const traffic = ownerStatsResult.data?.traffic || {};

      if (!mountedRef.current) return;

      setOwnerStats({
        storageUsedBytes: readNumber(storage.usedBytes),
        storageLimitBytes: readNumber(storage.limitBytes),
        monthlyTrafficBytes: readNumber(storage.monthlyUploadBytes),
        monthlyTrafficLimitBytes: readNumber(storage.monthlyTrafficLimitBytes),
        totalUploadBytes: readNumber(storage.historicalUploadBytes),
        deletedMediaBytes: readNumber(storage.deletedUploadBytes),
        activeMediaCount: readNumber(storage.activeMediaCount),
        deletedMediaCount: readNumber(storage.deletedMediaCount),
        imageCount: readNumber(media.imageCount || storage.historicalImageCount),
        videoCount: readNumber(media.videoCount || storage.historicalVideoCount),
        publicMessageCount: readNumber(messages.publicMessageCount),
        privateMessageCount: readNumber(messages.privateMessageCount),
        todayMessageCount: readNumber(messages.todayTotalMessageCount),
        traffic: parseOwnerTrafficStats(ownerStatsResult.data?.traffic),
      });
    } catch {
      if (!mountedRef.current) return;

      setAdminRole(null);
      setAdminOverview(null);
      setOwnerStats(null);
    } finally {
      if (mountedRef.current) {
        setIsAdminLoading(false);
      }
    }
  }

  async function refreshPublicMembershipPlans() {
    setIsMembershipPlansLoading(true);

    try {
      const result = await callMembershipAction<MembershipPlanConfigRow[]>({
        action: "get_public_membership_plans",
      });

      if (!mountedRef.current) return;

      setMembershipPlanConfigs(Array.isArray(result.data) ? result.data : []);
    } catch {
      if (!mountedRef.current) return;

      // 读取失败时继续使用代码里的默认套餐，避免会员区块无法展示。
      setMembershipPlanConfigs([]);
    } finally {
      if (mountedRef.current) {
        setIsMembershipPlansLoading(false);
      }
    }
  }

  async function refreshMembership(currentAccountId?: string | null) {
    const targetAccountId = currentAccountId || accountId;

    if (!targetAccountId) return;
    if (logoutRef.current || isInLogoutCooldown()) return;

    setIsMembershipLoading(true);

    try {
      const result = await callMembershipAction<MembershipRow>({
        action: "get_membership",
        accountId: targetAccountId,
      });

      if (!mountedRef.current) return;

      setMembership(result.data || null);
    } catch (error) {
      if (!mountedRef.current) return;

      const message =
        error instanceof Error ? error.message : "读取会员信息失败。";

      setErrorText(message);
      setMembership(null);
    } finally {
      if (mountedRef.current) {
        setIsMembershipLoading(false);
      }
    }
  }

  async function refreshMembershipOrders(currentAccountId?: string | null) {
    const targetAccountId = currentAccountId || accountId;

    if (!targetAccountId) return;
    if (logoutRef.current || isInLogoutCooldown()) return;

    setIsMembershipOrderLoading(true);

    try {
      const result = await callMembershipAction<MembershipOrderRow[]>({
        action: "list_membership_orders",
        accountId: targetAccountId,
      });

      if (!mountedRef.current) return;

      setMembershipOrders(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      if (!mountedRef.current) return;

      const message =
        error instanceof Error ? error.message : "读取会员订单失败。";

      setErrorText(message);
      setMembershipOrders([]);
    } finally {
      if (mountedRef.current) {
        setIsMembershipOrderLoading(false);
      }
    }
  }

  async function cancelPendingMembershipOrdersSilently(targetAccountId: string) {
    const pendingOrders = membershipOrders.filter(
      (order) => order.status === "pending" || order.status === "paid"
    );

    if (pendingOrders.length === 0) return;

    await Promise.all(
      pendingOrders.map((order) =>
        callMembershipAction<MembershipOrderRow>({
          action: "cancel_membership_order",
          accountId: targetAccountId,
          orderId: order.id,
        }).catch(() => null)
      )
    );
  }

  function openMembershipPayment(plan: MembershipPlan) {
    if (!isLoggedIn || !accountId) {
      setErrorText("请先登录正式账号，再购买会员。");
      setStatusText("");
      return;
    }

    if (plan.level === "free") return;

    if (plan.isActive === false) {
      setErrorText(`${plan.title} 当前暂停购买。`);
      setStatusText("");
      return;
    }

    if (membershipLevel === "svip") {
      setErrorText("你当前已经是 SVIP，无需重复购买。");
      setStatusText("");
      return;
    }

    if (membershipLevel === "vip" && plan.level === "vip") {
      setErrorText("你当前已经是 VIP，可以选择升级为 SVIP。");
      setStatusText("");
      return;
    }

    setSelectedMembershipPlan(plan);
    setSelectedPaymentMethod("usdt");
    setStatusText("");
    setErrorText("");
  }

  function closeMembershipPayment() {
    setSelectedMembershipPlan(null);
    setSelectedPaymentMethod("usdt");
  }

  async function handleConfirmMembershipPayment() {
    if (!selectedMembershipPlan || selectedMembershipPlan.level === "free") {
      return;
    }

    if (!accountId) {
      setErrorText("缺少正式账号，无法创建会员订单。");
      return;
    }

    if (selectedPaymentMethod !== "usdt") {
      setStatusText("");
      setErrorText(
        selectedPaymentMethod === "alipay"
          ? "支付宝支付即将开放，当前请先使用 USDT 测试订单。"
          : "微信支付即将开放，当前请先使用 USDT 测试订单。"
      );
      return;
    }

    if (!boundWallet) {
      setStatusText("");
      setErrorText("请先连接并绑定钱包，然后再使用 USDT 支付会员。");
      return;
    }

    setIsMembershipOrderLoading(true);
    setIsWalletPaymentSubmitting(true);
    setStatusText("");
    setErrorText("");

    try {
      await cancelPendingMembershipOrdersSilently(accountId);

      const result = await callMembershipAction<MembershipOrderRow>({
        action: "create_membership_order",
        accountId,
        chatUserId,
        userName: displayName,
        userAvatar: avatar,
        walletAddress: boundWallet,
        membershipLevel: selectedMembershipPlan.level,
        amount: selectedMembershipPlan.amount,
        durationDays: selectedMembershipPlan.durationDays,
        currency: selectedMembershipPlan.currency || "USDT",
        chain: selectedMembershipPlan.chain || "BSC",
      });

      const createdOrder = result.data;

      if (!createdOrder) {
        throw new Error("会员订单创建失败，没有返回订单数据。");
      }

      setMembershipOrders((prev) => [
        createdOrder,
        ...prev.filter(
          (order) => order.status !== "pending" && order.status !== "paid"
        ),
      ]);

      if (!createdOrder.paymentAddress) {
        closeMembershipPayment();
        await refreshMembershipOrders(accountId);

        setStatusText(
          `已创建 ${selectedMembershipPlan.title} 订单，但缺少收款地址，请检查后台收款地址配置。`
        );
        return;
      }

      const txHash = await sendBscUsdtMembershipPayment({
        fromAddress: boundWallet,
        toAddress: createdOrder.paymentAddress,
        amount: createdOrder.amount,
      });

      const verifyResult =
        await callMembershipAction<ActivateMembershipOrderData>({
          action: "submit_membership_payment_txhash",
          accountId,
          orderId: createdOrder.id,
          txHash,
        }).catch(async () => {
          await refreshMembershipOrders(accountId);

          return null;
        });

      if (verifyResult?.data?.membership) {
        setMembership(verifyResult.data.membership);
      }

      closeMembershipPayment();
      await refreshMembershipOrders(accountId);
      await refreshMembership(accountId);

      setStatusText(
        verifyResult?.data?.membership
          ? `钱包支付成功，${selectedMembershipPlan.title} 已自动激活。`
          : "钱包交易已发起，系统会继续自动检测到账。你也可以稍后点击“检测到账”。"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建或支付会员订单失败。";

      setErrorText(message);
    } finally {
      setIsMembershipOrderLoading(false);
      setIsWalletPaymentSubmitting(false);
    }
  }

  async function handleCheckMembershipOrderPayment(order: MembershipOrderRow) {
    if (!accountId) {
      setErrorText("缺少正式账号，无法检测会员订单。");
      return;
    }

    setIsCheckingMembershipPayment(true);
    setIsMembershipOrderLoading(true);
    setIsMembershipLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      const result = await callMembershipAction<ActivateMembershipOrderData>({
        action: "check_membership_order_payment",
        accountId,
        orderId: order.id,
      });

      if (result.data?.membership) {
        setMembership(result.data.membership);
      }

      await refreshMembershipOrders(accountId);
      await refreshMembership(accountId);

      setStatusText(
        result.data?.membership
          ? "已检测到链上到账，会员已自动激活。"
          : "已提交检测请求，如果区块还未确认，请稍后再次检测。"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "暂未检测到账，请稍后再试。";

      setErrorText(message);
    } finally {
      setIsCheckingMembershipPayment(false);
      setIsMembershipOrderLoading(false);
      setIsMembershipLoading(false);
    }
  }

  async function handleCancelMembershipOrderDevelopment(
    order: MembershipOrderRow
  ) {
    if (!accountId) {
      setErrorText("缺少正式账号，无法取消会员订单。");
      return;
    }

    if (order.status === "active") {
      setErrorText("已激活会员不能自行取消。如需取消会员资格，请联系 owner 管理员处理。");
      setStatusText("");
      return;
    }

    if (order.status !== "pending" && order.status !== "paid") {
      setErrorText("该订单当前状态不能取消。");
      setStatusText("");
      return;
    }

    setIsMembershipOrderLoading(true);
    setIsMembershipLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      await callMembershipAction<MembershipOrderRow>({
        action: "cancel_membership_order",
        accountId,
        orderId: order.id,
      });

      setMembershipOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
                note: "用户取消待支付会员订单",
              }
            : item
        )
      );

      await refreshMembershipOrders(accountId);

      setStatusText("待支付会员订单已取消。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "取消会员订单失败。";

      setErrorText(message);
    } finally {
      setIsMembershipOrderLoading(false);
      setIsMembershipLoading(false);
    }
  }

  async function refreshUnifiedAccount() {
    if (logoutRef.current || isInLogoutCooldown()) return;
    if (syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setErrorText("");
    setStatusText("");

    try {
      const latestAppSession = readAppAccountSession();
      const latestPrivateSession = getCurrentPrivateChatAuthSession();
      const latestChatUser = getCurrentPrivateChatUser();

      const preferredChatName =
        latestPrivateSession?.chatUser?.name ||
        latestChatUser?.name ||
        latestAppSession?.displayName ||
        "私密聊天用户";

      const preferredChatAvatar =
        latestPrivateSession?.chatUser?.avatar ||
        latestChatUser?.avatar ||
        latestAppSession?.avatar ||
        "🌙";

      if (
        latestAppSession?.accountId &&
        (latestAppSession.email || latestAppSession.walletAddress)
      ) {
        const provider = getPrivateProviderFromAppSession(latestAppSession);

        const result = await syncPrivateChatIdentity({
          provider,
          email: latestAppSession.email || null,
          walletAddress: latestAppSession.walletAddress || null,
          wechatOpenid: latestAppSession.wechatOpenid || null,
          displayName: preferredChatName,
          avatar: preferredChatAvatar,
          chatName: preferredChatName,
          chatAvatar: preferredChatAvatar,
        });

        if (!mountedRef.current) return;

        if (!result.ok || !result.session) {
          setErrorText(result.error || "刷新账户失败。");
          return;
        }

        setAuthSession(result.session);
        setAppSession(readAppAccountSession());
        setStatusText("账户已刷新。");
        return;
      }

      const {
        data: { user },
        error,
      } = await privateChatSupabase.auth.getUser();

      if (error || !user?.email) {
        loadLocalSessions();
        return;
      }

      const userEmail = user.email.toLowerCase();

      const result = await syncPrivateChatIdentityFromEmail({
        email: userEmail,
        displayName:
          latestPrivateSession?.chatUser?.name ||
          latestChatUser?.name ||
          getBestLocalName(userEmail) ||
          user.user_metadata?.display_name ||
          userEmail.split("@")[0] ||
          "邮箱用户",
        avatar:
          latestPrivateSession?.chatUser?.avatar ||
          latestChatUser?.avatar ||
          getBestLocalAvatar(userEmail),
      });

      if (!mountedRef.current) return;

      if (!result.ok || !result.session) {
        setErrorText(result.error || "邮箱账号同步失败。");
        return;
      }

      setAuthSession(result.session);
      setAppSession(readAppAccountSession());
      setStatusText("邮箱账号已同步到账户。");
    } catch (error) {
      if (!mountedRef.current) return;

      const message = error instanceof Error ? error.message : "刷新账户失败。";

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
    const cleanedName = displayNameInput.trim();

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

    setIsSendingEmail(true);
    setStatusText("");
    setErrorText("");

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/private-chat/account`
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
        return;
      }

      setStatusText(
        isLoggedIn
          ? "邮箱绑定邮件已发送，请打开邮箱点击链接完成绑定。"
          : "登录邮件已发送，请打开邮箱点击登录链接。"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送失败。";
      setErrorText(message);
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleLogout() {
    setErrorText("");
    setStatusText("");
    setIsLoggingOut(true);

    logoutRef.current = true;
    syncingRef.current = false;
    setLogoutCooldown(10000);

    try {
      await privateChatSupabase.auth.signOut({
        scope: "local",
      });
    } catch {
      try {
        await privateChatSupabase.auth.signOut();
      } catch {
        // 即使 Supabase signOut 失败，也继续清理本地账号
      }
    }

    clearPrivateChatAccountSession();
    clearAppAccountSession();

    setAppSession(null);
    setAuthSession(null);
    setAdminRole(null);
    setAdminOverview(null);
    setOwnerStats(null);
    setMembership(null);
    setMembershipOrders([]);
    setStats({
      friends: 0,
      blockedUsers: 0,
      savedRooms: 0,
    });
    setFriends([]);
    setBlockedUsers([]);
    setSavedRooms([]);
    setEditingFriendRemarkId(null);
    setFriendRemarkInput("");
    setEditingRoomRemarkId(null);
    setRoomRemarkInput("");
    setIsSavedRoomsExpanded(false);
    closeMembershipPayment();

    setStatusText("已退出账户，当前会继续使用游客身份。");

    window.setTimeout(() => {
      logoutRef.current = false;
      setIsLoggingOut(false);
    }, 10000);
  }

  function handleManualRefresh() {
    clearLogoutCooldown();
    logoutRef.current = false;
    refreshUnifiedAccount();

    if (authSession?.chatUser?.id) {
      refreshAdminPanels(authSession.chatUser.id);
      refreshManagementLists(authSession.chatUser.id);
    }

    if (accountId) {
      refreshMembership(accountId);
      refreshMembershipOrders(accountId);
    }
  }

  const isLoggedIn = Boolean(authSession && !authSession.isGuest);

  const displayName =
    authSession?.chatUser.name || appSession?.displayName || "游客身份";

  const avatar = authSession?.chatUser.avatar || appSession?.avatar || "🌙";

  const accountId =
    appSession?.accountId ||
    authSession?.account?.accountId ||
    authSession?.profile?.accountId ||
    null;

  const chatUserId = authSession?.chatUser?.id || null;

  const boundEmail = appSession?.email || authSession?.account?.email || null;

  const boundWallet =
    appSession?.walletAddress || authSession?.account?.walletAddress || null;

  const boundWechat =
    appSession?.wechatOpenid || authSession?.account?.wechatOpenid || null;

  const loginProvider =
    appSession?.loginProvider || authSession?.account?.loginProvider || null;

  const hasAtLeastOneLoginMethod = Boolean(
    boundEmail || boundWallet || boundWechat
  );

  const hasBackupLoginMethod =
    [boundEmail, boundWallet, boundWechat].filter(Boolean).length >= 2;

  const securityLabel = !isLoggedIn
    ? "游客模式"
    : hasBackupLoginMethod
      ? "较安全"
      : hasAtLeastOneLoginMethod
        ? "基础安全"
        : "待完善";

  const securityDesc = !isLoggedIn
    ? "当前使用游客身份，正式账号能力不可用。"
    : hasBackupLoginMethod
      ? "账号已拥有至少两种身份标识，后续找回和绑定能力更稳定。"
      : boundWallet && !boundEmail
        ? "当前主要依赖钱包登录，建议绑定邮箱后再解绑钱包。"
        : boundEmail && !boundWallet
          ? "当前主要依赖邮箱登录，可以继续绑定钱包增强账号能力。"
          : "建议完善邮箱或钱包绑定。";

  const shouldShowEmailPanel = !boundEmail;

  const manageTabs: Array<{
    key: ManageTab;
    label: string;
    count: number;
  }> = [
    {
      key: "friends",
      label: "好友",
      count: friends.length,
    },
    {
      key: "blocked",
      label: "黑名单",
      count: blockedUsers.length,
    },
    {
      key: "rooms",
      label: "房间",
      count: savedRooms.length,
    },
  ];

  const accountRightLevel = !isLoggedIn
    ? "游客"
    : adminRole === "owner"
      ? "超级管理员"
      : adminRole === "admin"
        ? "普通管理员"
        : "普通用户";

  const accountRightBadgeClass = !isLoggedIn
    ? "bg-slate-500/10 text-slate-300"
    : adminRole === "owner"
      ? "bg-purple-400/10 text-purple-100"
      : adminRole === "admin"
        ? "bg-fuchsia-400/10 text-fuchsia-100"
        : "bg-emerald-400/10 text-emerald-100";

  const loginMethodCount = [boundEmail, boundWallet, boundWechat].filter(
    Boolean
  ).length;

  const membershipLevel = membership?.membershipLevel || "free";

  const membershipLabel = !isLoggedIn
    ? "Guest"
    : adminRole === "owner"
      ? "Owner"
      : adminRole === "admin"
        ? "Admin"
        : getMembershipLabel(membershipLevel);

  const membershipStatusLabel = getMembershipStatusLabel(
    membership?.membershipStatus || "active"
  );

  const membershipBadgeClass = !isLoggedIn
    ? "bg-slate-500/10 text-slate-300"
    : adminRole === "owner"
      ? "bg-purple-400/10 text-purple-100"
      : adminRole === "admin"
        ? "bg-fuchsia-400/10 text-fuchsia-100"
        : getMembershipBadgeClass(membershipLevel);

  const membershipDesc = !isLoggedIn
    ? "游客可以使用基础浏览和临时聊天能力。登录后可保存关系数据和会员状态。"
    : adminRole === "owner"
      ? "超级管理员拥有平台统计查看权限和最高管理身份。"
      : adminRole === "admin"
        ? "普通管理员拥有基础管理状态查看权限。"
        : getMembershipDesc(membershipLevel);

  const activeMediaRule = MEMBERSHIP_MEDIA_RULES[membershipLevel];

  const shouldShowSavedRoomsToggle =
    savedRooms.length > ROOM_FAVORITE_COLLAPSED_LIMIT;

  const displayedSavedRooms = isSavedRoomsExpanded
    ? savedRooms
    : savedRooms.slice(0, ROOM_FAVORITE_COLLAPSED_LIMIT);

  const visibleMembershipOrders = membershipOrders.filter((order) => {
    if (order.status === "cancelled") return false;

    // 仅开发期：当你取消已激活订单并恢复 Free 后，隐藏旧 active 测试订单，避免重复显示
    if (
      IS_MEMBERSHIP_DEV_MODE &&
      membershipLevel === "free" &&
      order.status === "active"
    ) {
      return false;
    }

    return true;
  });

  const payableMembershipOrders = visibleMembershipOrders.filter(
    (order) => order.status === "pending" || order.status === "paid"
  );

  const dynamicMembershipPlans: MembershipPlan[] = MEMBERSHIP_PLANS.map((plan) => {
    if (plan.level === "free") {
      return {
        ...plan,
        isActive: true,
      };
    }

    const config = membershipPlanConfigs.find((item) => item.level === plan.level);

    if (!config) {
      return {
        ...plan,
        isActive: true,
      };
    }

    return {
      ...plan,
      title: config.title || plan.title,
      subtitle: config.subtitle || plan.subtitle,
      price: `${config.amount} ${config.currency || "USDT"}`,
      period: `${config.durationDays} 天`,
      amount: config.amount,
      durationDays: config.durationDays,
      currency: config.currency || "USDT",
      chain: config.chain || "BSC",
      isActive: config.isActive,
    };
  });

  function getPlanButtonText(plan: MembershipPlan) {
    if (!isLoggedIn) return "登录后购买";

    if (plan.level !== "free" && plan.isActive === false) {
      return "暂停购买";
    }

    if (plan.level === "free") {
      if (membershipLevel === "free") return "当前等级";
      return "已包含";
    }

    if (membershipLevel === "svip") {
      return plan.level === "svip" ? "当前等级" : "已包含";
    }

    if (membershipLevel === "vip") {
      return plan.level === "vip" ? "当前等级" : "升级 SVIP";
    }

    return plan.level === "vip" ? "购买 VIP" : "购买 SVIP";
  }

  function isPlanButtonDisabled(plan: MembershipPlan) {
    if (!isLoggedIn || !accountId) return true;
    if (plan.level !== "free" && plan.isActive === false) return true;
    if (plan.level === "free") return true;
    if (membershipLevel === "svip") return true;
    if (membershipLevel === "vip" && plan.level === "vip") return true;
    return isMembershipOrderLoading;
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/55 shadow-[0_24px_80px_rgba(2,6,23,0.35)] ring-1 ring-white/[0.05]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.62))] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Account Center</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                账户中心
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                管理你的私密聊天身份、登录方式、好友关系、收藏房间、会员状态和管理员权限。
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/private-chat"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
              >
                返回大厅
              </Link>
              <span
                className={`rounded-full px-3 py-1 text-[11px] ${
                  isLoggedIn
                    ? "bg-emerald-400/10 text-emerald-100"
                    : "bg-slate-500/10 text-slate-300"
                }`}
              >
                {isLoggedIn ? "已登录" : "游客模式"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[11px] ${accountRightBadgeClass}`}
              >
                {accountRightLevel}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[11px] ${membershipBadgeClass}`}
              >
                {membershipLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex items-center gap-4 rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/[0.07] p-4 shadow-inner shadow-cyan-300/[0.03]">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-3xl">
                {avatar}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-white">
                  {displayName}
                </h3>

                <p className="mt-1 truncate text-sm text-slate-400">
                  {accountId
                    ? `账号 ID：${shortenText(accountId, 10, 8)}`
                    : "当前还没有正式账号"}
                </p>

                <p className="mt-1 truncate text-sm text-slate-400">
                  聊天 ID：
                  {chatUserId
                    ? shortenText(chatUserId, 12, 8)
                    : "游客本地身份"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  当前来源：{getProviderLabel(loginProvider)}
                </p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-emerald-300/20 bg-emerald-400/[0.07] p-4 shadow-inner shadow-emerald-300/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">当前安全状态</p>
                  <p
                    className={`mt-2 text-base font-semibold ${
                      hasBackupLoginMethod
                        ? "text-emerald-100"
                        : isLoggedIn
                          ? "text-amber-100"
                          : "text-slate-300"
                    }`}
                  >
                    {securityLabel}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    hasBackupLoginMethod
                      ? "bg-emerald-400/10 text-emerald-100"
                      : isLoggedIn
                        ? "bg-amber-400/10 text-amber-100"
                        : "bg-slate-500/10 text-slate-300"
                  }`}
                >
                  {isLoggedIn
                    ? `${loginMethodCount} 种登录方式`
                    : "未登录正式账号"}
                </span>
              </div>

              <p className="mt-2 text-sm leading-5 text-slate-400">
                {securityDesc}
              </p>

              {isLoggedIn ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isSyncing || isLoggingOut}
                    className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSyncing ? "刷新中..." : "刷新账户"}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoggingOut ? "退出中..." : "退出账户"}
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-2 text-[11px] leading-5 text-slate-400">
                  游客可以使用基础聊天能力。登录邮箱或钱包后，可以同步账户、保存好友、黑名单和收藏房间。
                </div>
              )}
            </div>
          </div>

          {(statusText || errorText) && (
            <div className="mt-3 space-y-2">
              {statusText ? (
                <StatusNotice type="success" text={statusText} />
              ) : null}

              {errorText ? <StatusNotice type="error" text={errorText} /> : null}
            </div>
          )}
        </div>
      </section>

      {isLoggedIn ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            eyebrow="Private Chat Data"
            title="我的聊天数据"
            desc="当前账户在私密聊天模块里的关系数据。"
            right={
              <button
                type="button"
                onClick={() =>
                  refreshAccountStats({
                    chatUserId,
                    accountId,
                  })
                }
                disabled={isStatsLoading || (!chatUserId && !accountId)}
                className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStatsLoading ? "统计中..." : "刷新统计"}
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniInfoCard
                label="好友 / 关注"
                value={stats.friends}
                desc="可快速进入私聊"
              />

              <MiniInfoCard
                label="黑名单"
                value={stats.blockedUsers}
                desc="阻止指定用户私信"
              />

              <MiniInfoCard
                label="收藏房间"
                value={stats.savedRooms}
                desc="快速进入暗语房"
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Account Rights"
            title="个人状态"
            desc="当前登录、权限、安全和会员状态。"
            badge={accountRightLevel}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniInfoCard
                label="账户权限"
                value={accountRightLevel}
                valueClassName={
                  adminRole === "owner"
                    ? "text-purple-100"
                    : adminRole === "admin"
                      ? "text-fuchsia-100"
                      : "text-emerald-100"
                }
                desc="管理员身份与会员等级分开计算。"
              />

              <MiniInfoCard
                label="会员等级"
                value={membershipLabel}
                valueClassName={
                  membershipLevel === "svip"
                    ? "text-purple-100"
                    : membershipLevel === "vip"
                      ? "text-fuchsia-100"
                      : "text-emerald-100"
                }
                desc={membershipDesc}
              />

              <MiniInfoCard
                label="安全状态"
                value={securityLabel}
                valueClassName={
                  hasBackupLoginMethod ? "text-emerald-100" : "text-amber-100"
                }
                desc={`${loginMethodCount} 种登录方式`}
              />

              <MiniInfoCard
                label="媒体发送权限"
                value={activeMediaRule.canUploadMedia ? "已开启" : "未开启"}
                valueClassName={
                  activeMediaRule.canUploadMedia
                    ? "text-emerald-100"
                    : "text-slate-400"
                }
                desc={
                  activeMediaRule.canUploadMedia
                    ? `私聊 / 暗语房可用，每月 ${formatBytes(
                        activeMediaRule.monthlyTrafficBytes
                      )}`
                    : "普通会员仅支持文字聊天"
                }
              />
            </div>
          </SectionCard>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="Login & Security"
          title="登录方式与安全"
          desc="邮箱、钱包和微信身份会共同决定账号找回能力。"
          badge={securityLabel}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <MiniInfoCard
              label="邮箱"
              value={boundEmail || "未绑定"}
              valueClassName={boundEmail ? "text-emerald-100" : "text-slate-400"}
              desc={
                boundEmail
                  ? "可使用 Magic Link 登录。"
                  : "建议绑定邮箱，方便后续找回账户。"
              }
            />

            <MiniInfoCard
              label="钱包"
              value={boundWallet ? shortenText(boundWallet, 6, 4) : "未绑定"}
              valueClassName={
                boundWallet ? "text-emerald-100" : "text-slate-400"
              }
              desc={
                boundWallet
                  ? "当前账号已绑定链上钱包身份。"
                  : "可连接钱包登录或绑定到当前账号。"
              }
            />

            <MiniInfoCard
              label="微信"
              value={boundWechat ? "已绑定" : "暂未开放"}
              valueClassName={
                boundWechat ? "text-emerald-100" : "text-slate-400"
              }
              desc={
                boundWechat
                  ? "当前账号已存在微信身份。"
                  : "微信登录能力已预留，后续可接入。"
              }
            />
          </div>

          {shouldShowEmailPanel ? (
            <div className="mt-3 rounded-3xl border border-white/10 bg-slate-950/24 p-4">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-white">
                  {isLoggedIn ? "绑定邮箱" : "邮箱登录"}
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  {isLoggedIn
                    ? "当前账号还没有绑定邮箱。绑定邮箱后，即使以后断开钱包，也可以继续用邮箱登录这个账号。"
                    : "使用 Supabase Auth 邮箱 Magic Link 登录，不需要设置密码。点击后请打开邮箱里的登录链接。"}
                </p>
              </div>

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
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/50"
                />

                <input
                  value={displayNameInput}
                  onChange={(event) => setDisplayNameInput(event.target.value)}
                  maxLength={18}
                  placeholder="昵称，可选"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/50"
                />

                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  disabled={isSendingEmail || isSyncing}
                  className="w-full rounded-2xl bg-fuchsia-500 px-3 py-2 text-base font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingEmail
                    ? "发送中..."
                    : isLoggedIn
                      ? "发送邮箱绑定链接"
                      : "发送邮箱登录链接"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-3">
            <PrivateChatWalletLoginPanel
              onSessionChanged={(session) => {
                setAuthSession(session);
                setAppSession(readAppAccountSession());
              }}
            />
          </div>
        </SectionCard>

        {isLoggedIn ? (
          <SectionCard
            eyebrow="Relationship & Rooms"
            title="我的关系与房间"
            desc="好友、黑名单和收藏房间统一管理。"
            right={
              <button
                type="button"
                onClick={() => refreshManagementLists(chatUserId)}
                disabled={isListsLoading || !chatUserId}
                className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isListsLoading ? "刷新中..." : "刷新列表"}
              </button>
            }
          >
            <div className="grid grid-cols-3 gap-2 rounded-3xl border border-fuchsia-200/25 bg-fuchsia-100/[0.08] p-1.5">
              {manageTabs.map((tab) => {
                const isActive = activeManageTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveManageTab(tab.key)}
                    className={`rounded-2xl px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-950/30"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {activeManageTab === "friends" ? (
                <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                  {friends.length === 0 ? (
                    <EmptyState text="暂无关注好友" />
                  ) : (
                    friends.map((item) => {
                      const isEditingRemark =
                        editingFriendRemarkId === item.friend_id;
                      const displayFriendName =
                        item.friend_remark || item.friend_name || "好友";

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-white/10 bg-slate-950/24 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                              {item.friend_avatar || "👤"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-base font-semibold text-white">
                                    {displayFriendName}
                                  </p>

                                  {item.friend_remark ? (
                                    <p className="mt-1 truncate text-[11px] text-slate-400">
                                      原昵称：{item.friend_name || "好友"}
                                    </p>
                                  ) : (
                                    <p className="mt-1 truncate text-[11px] text-slate-400">
                                      暂无备注名
                                    </p>
                                  )}

                                  <p className="mt-1 truncate text-[11px] text-slate-400">
                                    好友 ID：
                                    {shortenText(item.friend_id, 10, 6)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartEditFriendRemark(item)
                                  }
                                  disabled={isListActionLoading}
                                  className="shrink-0 rounded-full border border-white/10 bg-slate-950/28 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  备注
                                </button>
                              </div>
                            </div>
                          </div>

                          {isEditingRemark ? (
                            <div className="mt-3 rounded-3xl border border-white/10 bg-slate-950/24 p-3">
                              <p className="text-[11px] text-slate-400">
                                给这个好友设置备注名
                              </p>

                              <input
                                value={friendRemarkInput}
                                onChange={(event) => {
                                  setFriendRemarkInput(event.target.value);
                                  setStatusText("");
                                  setErrorText("");
                                }}
                                maxLength={40}
                                placeholder="例如：老王、摄影朋友、测试账号"
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/50"
                              />

                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveFriendRemark(item.friend_id)
                                  }
                                  disabled={isListActionLoading}
                                  className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  保存
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveFriendRemark(
                                      item.friend_id,
                                      true
                                    )
                                  }
                                  disabled={isListActionLoading}
                                  className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  清除
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelEditFriendRemark}
                                  disabled={isListActionLoading}
                                  className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href={buildDmHref({
                                friendId: item.friend_id,
                                friendName: displayFriendName,
                                friendAvatar: item.friend_avatar,
                              })}
                              className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-center text-[11px] font-semibold text-white transition hover:bg-fuchsia-400"
                            >
                              进入私聊
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveFriend(item.friend_id)
                              }
                              disabled={isListActionLoading}
                              className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              取消关注
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}

              {activeManageTab === "blocked" ? (
                <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                  {blockedUsers.length === 0 ? (
                    <EmptyState text="暂无黑名单用户" />
                  ) : (
                    blockedUsers.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/10 bg-slate-950/24 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                            🚫
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-white">
                              {item.blocked_name || "用户"}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-400">
                              {shortenText(item.blocked_id, 10, 6)}
                            </p>
                          </div>
                        </div>

                        {item.reason ? (
                          <p className="mt-2 rounded-2xl bg-slate-950/24 px-3 py-2 text-[11px] leading-5 text-slate-400">
                            {item.reason}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleUnblockUser(item.blocked_id)}
                          disabled={isListActionLoading}
                          className="mt-3 w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          解除拉黑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {activeManageTab === "rooms" ? (
                <div className="space-y-3">
                  {savedRooms.length === 0 ? (
                    <EmptyState text="暂无收藏房间" />
                  ) : (
                    <>
                      <div
                        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
                          isSavedRoomsExpanded
                            ? "max-h-[620px] overflow-y-auto pr-1"
                            : ""
                        }`}
                      >
                        {displayedSavedRooms.map((item) => {
                          const isEditingRemark =
                            editingRoomRemarkId === item.room_id;
                          const displayRoomName =
                            item.room_remark ||
                            item.room_name ||
                            "暗语私密房间";

                          return (
                            <div
                              key={item.id}
                              className="rounded-3xl border border-white/10 bg-slate-950/24 p-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                                  {item.room_avatar || "🔐"}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-base font-semibold text-white">
                                        {displayRoomName}
                                      </p>

                                      {item.room_remark ? (
                                        <p className="mt-1 truncate text-[11px] text-slate-400">
                                          原房间名：
                                          {item.room_name || "暗语私密房间"}
                                        </p>
                                      ) : (
                                        <p className="mt-1 truncate text-[11px] text-slate-400">
                                          暂无备注名
                                        </p>
                                      )}

                                      <p className="mt-1 truncate text-[11px] text-slate-400">
                                        房间 ID：
                                        {shortenText(item.room_id, 10, 6)}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartEditRoomRemark(item)
                                      }
                                      disabled={isListActionLoading}
                                      className="shrink-0 rounded-full border border-white/10 bg-slate-950/28 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      备注
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {isEditingRemark ? (
                                <div className="mt-3 rounded-3xl border border-white/10 bg-slate-950/24 p-3">
                                  <p className="text-[11px] text-slate-400">
                                    给这个暗语房间设置备注名
                                  </p>

                                  <input
                                    value={roomRemarkInput}
                                    onChange={(event) => {
                                      setRoomRemarkInput(event.target.value);
                                      setStatusText("");
                                      setErrorText("");
                                    }}
                                    maxLength={40}
                                    placeholder="例如：老朋友房间、项目交流群、测试媒体房"
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300/50"
                                  />

                                  <div className="mt-2 grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveRoomRemark(item.room_id)
                                      }
                                      disabled={isListActionLoading}
                                      className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      保存
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveRoomRemark(item.room_id, true)
                                      }
                                      disabled={isListActionLoading}
                                      className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      清除
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCancelEditRoomRemark}
                                      disabled={isListActionLoading}
                                      className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      取消
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <Link
                                  href={buildSecretRoomHref(item.secret_code)}
                                  className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-center text-[11px] font-semibold text-white transition hover:bg-fuchsia-400"
                                >
                                  进入房间
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveRoomFavorite(item.room_id)
                                  }
                                  disabled={isListActionLoading}
                                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  取消收藏
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {shouldShowSavedRoomsToggle ? (
                        <button
                          type="button"
                          onClick={() =>
                            setIsSavedRoomsExpanded((current) => !current)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10"
                        >
                          {isSavedRoomsExpanded
                            ? "收起列表"
                            : `展开全部 ${savedRooms.length} 个收藏房间`}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            eyebrow="Relationship & Rooms"
            title="我的关系与房间"
            desc="登录后可以管理好友、黑名单和收藏房间。"
          >
            <EmptyState text="当前是游客模式，登录后可同步和管理关系数据。" />
          </SectionCard>
        )}
      </div>

      {adminOverview && adminRole ? (
        <SectionCard
          eyebrow="Admin Overview"
          title="管理员基础概览"
          desc={
            adminRole === "owner"
              ? "当前身份：超级管理员 owner。具体管理操作仍保留在聊天大厅侧边栏。"
              : "当前身份：普通管理员 admin。具体管理操作仍保留在聊天大厅侧边栏。"
          }
          badge={adminRole}
          tone="fuchsia"
          right={
            <button
              type="button"
              onClick={() => refreshAdminPanels(chatUserId)}
              disabled={isAdminLoading || !chatUserId}
              className="rounded-2xl border border-fuchsia-300/20 bg-slate-950/28 px-3 py-1.5 text-[11px] text-fuchsia-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdminLoading ? "刷新中..." : "刷新管理概览"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <MiniInfoCard
              label="管理员"
              value={formatNumber(adminOverview.adminCount)}
            />

            <MiniInfoCard
              label="禁言用户"
              value={formatNumber(adminOverview.activeBanCount)}
            />

            <MiniInfoCard
              label="公告"
              value={formatNumber(adminOverview.activeAnnouncementCount)}
            />

            <MiniInfoCard
              label="大厅状态"
              value={adminOverview.publicChatPaused ? "已暂停" : "正常开放"}
              valueClassName={
                adminOverview.publicChatPaused
                  ? "text-rose-100"
                  : "text-emerald-100"
              }
            />

            <MiniInfoCard
              label="发言冷却"
              value={`${formatNumber(adminOverview.cooldownSeconds)} 秒`}
            />
          </div>
        </SectionCard>
      ) : null}

      {adminRole === "owner" && ownerStats ? (
        <SectionCard
          eyebrow="Owner Monitor"
          title="超级管理员监控"
          desc="平台存储、媒体、消息、访问监控统一展示，仅 owner 总管理员可见。"
          badge="owner 可见"
          tone="purple"
          right={
            <button
              type="button"
              onClick={() => refreshAdminPanels(chatUserId)}
              disabled={isAdminLoading || !chatUserId}
              className="rounded-2xl border border-purple-300/20 bg-slate-950/28 px-3 py-1.5 text-[11px] text-purple-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdminLoading ? "刷新中..." : "刷新监控"}
            </button>
          }
        >
          <div className="rounded-3xl border border-white/10 bg-slate-950/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">平台资源与消息</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  Storage、媒体数量、消息总量等平台运行数据。
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                owner 可见
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">当前 Storage 容量</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                    owner 可见
                  </span>
                </div>

                <ProgressBar
                  value={ownerStats.storageUsedBytes}
                  limit={ownerStats.storageLimitBytes}
                />
              </div>

              <div className="rounded-3xl bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">本月上传流量</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                    owner 可见
                  </span>
                </div>

                <ProgressBar
                  value={ownerStats.monthlyTrafficBytes}
                  limit={ownerStats.monthlyTrafficLimitBytes}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <MiniInfoCard
                label="历史累计上传"
                value={formatBytes(ownerStats.totalUploadBytes)}
              />

              <MiniInfoCard
                label="当前未删除媒体"
                value={formatNumber(ownerStats.activeMediaCount)}
              />

              <MiniInfoCard
                label="已删除媒体累计"
                value={formatNumber(ownerStats.deletedMediaCount)}
                desc={formatBytes(ownerStats.deletedMediaBytes)}
              />

              <MiniInfoCard
                label="图片 / 视频"
                value={
                  formatNumber(ownerStats.imageCount) +
                  " / " +
                  formatNumber(ownerStats.videoCount)
                }
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MiniInfoCard
                label="公共消息"
                value={formatNumber(ownerStats.publicMessageCount)}
              />

              <MiniInfoCard
                label="私密消息"
                value={formatNumber(ownerStats.privateMessageCount)}
              />

              <MiniInfoCard
                label="今日消息"
                value={formatNumber(ownerStats.todayMessageCount)}
              />
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/24 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">访问监控</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  网站访问人数、在线人数、日 / 周 / 月访问量与访问趋势。
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                owner 可见
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <MiniInfoCard
                label="当前在线"
                value={formatNumber(ownerStats.traffic?.onlineNow || 0)}
                desc="最近仍在心跳中的在线访客"
                valueClassName="text-emerald-100"
              />

              <MiniInfoCard
                label="今日访问"
                value={formatNumber(ownerStats.traffic?.todayVisits || 0)}
                desc={
                  "独立访客 " +
                  formatNumber(ownerStats.traffic?.todayUniqueVisitors || 0)
                }
              />

              <MiniInfoCard
                label="本周访问"
                value={formatNumber(ownerStats.traffic?.weekVisits || 0)}
                desc={
                  "独立访客 " +
                  formatNumber(ownerStats.traffic?.weekUniqueVisitors || 0)
                }
              />

              <MiniInfoCard
                label="本月访问"
                value={formatNumber(ownerStats.traffic?.monthVisits || 0)}
                desc={
                  "独立访客 " +
                  formatNumber(ownerStats.traffic?.monthUniqueVisitors || 0)
                }
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MiniInfoCard
                label="历史总访问"
                value={formatNumber(ownerStats.traffic?.totalVisits || 0)}
                desc="private_chat_site_visits 累计记录"
              />

              <MiniInfoCard
                label="历史独立访客"
                value={formatNumber(ownerStats.traffic?.totalUniqueVisitors || 0)}
                desc="按 visitor_id 去重"
              />

              <MiniInfoCard
                label="总页面浏览量"
                value={formatNumber(ownerStats.traffic?.totalPageViews || 0)}
                desc="累计 page view"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <MiniInfoCard
                label="最近在线记录"
                value={formatNumber(ownerStats.traffic?.recentPresenceCount || 0)}
                desc="private_chat_site_presence 当前有效记录"
              />

              <MiniInfoCard
                label="趋势天数"
                value={formatNumber(
                  Array.isArray(ownerStats.traffic?.recentDailyVisits)
                    ? ownerStats.traffic?.recentDailyVisits.length
                    : 0
                )}
                desc="最近每日访问趋势样本数"
              />
            </div>

                        <div className="mt-4">
              <TrafficTrendChart traffic={ownerStats.traffic} />
            </div>
          </div>
        </SectionCard>
      ) : null}


      {adminRole === "owner" ? (
        <PrivateChatOwnerMembershipManager actorId={chatUserId} isOwner={adminRole === "owner"} />
      ) : null}

      <SectionCard
        eyebrow="Membership & Wallet"
        title="账户钱包与会员"
        desc="会员系统独占一整行。当前支持套餐展示、USDT 钱包支付、链上自动检测到账和自动激活。"
        badge={membershipLabel}
        tone="emerald"
      >
                <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-emerald-100">
              我的会员中心
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              查看 VIP / SVIP 订单、支付状态、链上到账检测结果、会员到期时间和历史记录。
            </p>
          </div>

          <Link
            href="/private-chat/orders"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            我的会员中心
          </Link>
        </div>

<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MiniInfoCard
            label="当前会员"
            value={membershipLabel}
            valueClassName={
              !isLoggedIn
                ? "text-slate-400"
                : adminRole === "owner"
                  ? "text-purple-100"
                  : adminRole === "admin"
                    ? "text-fuchsia-100"
                    : membershipLevel === "svip"
                      ? "text-purple-100"
                      : membershipLevel === "vip"
                        ? "text-fuchsia-100"
                        : "text-emerald-100"
            }
            badge="当前"
            desc={membershipDesc}
          />

          <MiniInfoCard
            label="会员状态"
            value={!isLoggedIn ? "未登录" : membershipStatusLabel}
            valueClassName={isLoggedIn ? "text-emerald-100" : "text-slate-400"}
            desc={
              !isLoggedIn
                ? "游客没有正式会员状态。"
                : membership?.membershipExpiresAt
                  ? `到期时间：${formatDateTime(
                      membership.membershipExpiresAt
                    )}`
                  : membershipLevel === "free"
                    ? "Free 当前没有到期时间。"
                    : "暂未设置到期时间。"
            }
          />

          <MiniInfoCard
            label="钱包状态"
            value={boundWallet ? shortenText(boundWallet, 6, 4) : "未绑定"}
            valueClassName={boundWallet ? "text-emerald-100" : "text-slate-400"}
            badge={boundWallet ? "已绑定" : "未绑定"}
            desc={
              boundWallet
                ? "当前钱包可用于登录与身份绑定，后续可扩展为会员支付钱包。"
                : "绑定钱包后，后续可以用于 USDT 会员支付和链上身份能力。"
            }
          />
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/24 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold text-white">会员权益限制</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                公共聊天室全部等级都只能发送文字；只有 VIP / SVIP 可以在一对一私聊和暗语私密房间发送图片 / 视频，并受每月媒体流量限制。
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${membershipBadgeClass}`}
            >
              当前：{membershipLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MiniInfoCard
              label="公共聊天室"
              value="仅文字"
              valueClassName="text-amber-100"
              desc="任何会员等级都不能在公共大厅发送图片 / 视频。"
            />

            <MiniInfoCard
              label="私聊媒体"
              value={activeMediaRule.allowPrivateMedia ? "允许" : "禁止"}
              valueClassName={
                activeMediaRule.allowPrivateMedia
                  ? "text-emerald-100"
                  : "text-slate-400"
              }
              desc={
                activeMediaRule.allowPrivateMedia
                  ? "可在一对一私聊发送图片 / 视频。"
                  : "普通会员不能发送媒体文件。"
              }
            />

            <MiniInfoCard
              label="暗语房媒体"
              value={activeMediaRule.allowSecretRoomMedia ? "允许" : "禁止"}
              valueClassName={
                activeMediaRule.allowSecretRoomMedia
                  ? "text-emerald-100"
                  : "text-slate-400"
              }
              desc={
                activeMediaRule.allowSecretRoomMedia
                  ? "可在暗语私密房间发送图片 / 视频。"
                  : "普通会员不能发送媒体文件。"
              }
            />

            <MiniInfoCard
              label="月媒体流量"
              value={
                activeMediaRule.monthlyTrafficBytes > 0
                  ? formatBytes(activeMediaRule.monthlyTrafficBytes)
                  : "无媒体额度"
              }
              valueClassName={
                activeMediaRule.monthlyTrafficBytes > 0
                  ? "text-emerald-100"
                  : "text-slate-400"
              }
              desc={activeMediaRule.storageDesc}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Object.values(MEMBERSHIP_MEDIA_RULES).map((rule) => (
              <div
                key={rule.level}
                className={`rounded-3xl border p-3 ${
                  rule.level === membershipLevel
                    ? "border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.13),rgba(15,23,42,0.45))]"
                    : "border-white/10 bg-slate-950/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {rule.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      {rule.storageDesc}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">
                    {rule.level === membershipLevel ? "当前" : getMembershipLabel(rule.level)}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-400">
                  <p>公共大厅：仅文字</p>
                  <p>
                    私聊 / 暗语房媒体：
                    {rule.canUploadMedia ? "允许" : "禁止"}
                  </p>
                  <p>
                    单图上限：
                    {rule.maxImageSizeBytes > 0
                      ? formatBytes(rule.maxImageSizeBytes)
                      : "不可发送"}
                  </p>
                  <p>
                    单视频上限：
                    {rule.maxVideoSizeBytes > 0
                      ? formatBytes(rule.maxVideoSizeBytes)
                      : "不可发送"}
                  </p>
                  <p>
                    月流量：
                    {rule.monthlyTrafficBytes > 0
                      ? formatBytes(rule.monthlyTrafficBytes)
                      : "无媒体额度"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {dynamicMembershipPlans.map((plan) => {
            const isCurrent =
              isLoggedIn &&
              ((plan.level === "free" && membershipLevel === "free") ||
                (plan.level === "vip" && membershipLevel === "vip") ||
                (plan.level === "svip" && membershipLevel === "svip"));

            const planClass =
              plan.tone === "svip"
                ? "border-violet-400/25 bg-[linear-gradient(180deg,rgba(124,58,237,0.14),rgba(15,23,42,0.45))]"
                : plan.tone === "vip"
                  ? "border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.13),rgba(15,23,42,0.45))]"
                  : "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.45))]";

            const buttonClass =
              plan.tone === "svip"
                ? "bg-purple-500 hover:bg-purple-400"
                : plan.tone === "vip"
                  ? "bg-fuchsia-500 hover:bg-fuchsia-400"
                  : "bg-emerald-500 hover:bg-emerald-400";

            return (
              <div
                key={plan.level}
                className={`rounded-3xl border p-4 ${planClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {plan.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {plan.subtitle}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
                    {plan.isActive === false ? "暂停购买" : isCurrent ? "当前等级" : plan.period}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-semibold text-white">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {plan.period}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-[11px] text-slate-300"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] text-emerald-100">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openMembershipPayment(plan)}
                  disabled={isPlanButtonDisabled(plan)}
                  className={`mt-4 w-full rounded-2xl px-3 py-2 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-950/28 disabled:text-slate-400 ${buttonClass}`}
                >
                  {getPlanButtonText(plan)}
                </button>
              </div>
            );
          })}
        </div>

        {isLoggedIn ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/24 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-white">会员订单</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  这里只显示待支付、已支付、已激活、失败或过期订单；已取消订单默认隐藏。支付成功后系统会自动检测链上到账并激活会员，已激活会员不能自行取消。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => refreshMembership(accountId)}
                  disabled={isMembershipLoading || !accountId}
                  className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMembershipLoading ? "刷新中..." : "刷新会员"}
                </button>

                <button
                  type="button"
                  onClick={() => refreshMembershipOrders(accountId)}
                  disabled={isMembershipOrderLoading || !accountId}
                  className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMembershipOrderLoading ? "刷新中..." : "刷新订单"}
                </button>
              </div>
            </div>

            {payableMembershipOrders.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                当前有一个待支付会员订单。重新选择套餐并使用 USDT
                创建订单时，系统会自动替换旧的待支付订单，避免多个会员订单同时生效。
              </div>
            ) : null}

            <div className="mt-3 space-y-3">
              {visibleMembershipOrders.length === 0 ? (
                <EmptyState text="暂无会员订单" />
              ) : (
                visibleMembershipOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-3xl border border-white/10 bg-slate-950/24 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-white">
                            {getMembershipLabel(order.membershipLevel)} 会员订单
                          </p>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${getOrderStatusClass(
                              order.status
                            )}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          订单 ID：{shortenText(order.id, 10, 8)}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          金额：{order.amount} {order.currency} · 网络：
                          {order.chain} · 有效期：{order.durationDays} 天
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          创建时间：{formatDateTime(order.createdAt)}
                        </p>

                        {order.expiresAt ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            到期时间：{formatDateTime(order.expiresAt)}
                          </p>
                        ) : null}

                        {order.txHash ? (
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            TxHash：{order.txHash}
                          </p>
                        ) : null}

                        {order.note ? (
                          <p className="mt-2 rounded-2xl bg-slate-950/24 px-3 py-2 text-[11px] leading-5 text-slate-400">
                            {order.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:w-40">
                        {order.status === "pending" ||
                        order.status === "paid" ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleCheckMembershipOrderPayment(order)
                              }
                              disabled={
                                isMembershipOrderLoading ||
                                isCheckingMembershipPayment ||
                                !accountId
                              }
                              className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCheckingMembershipPayment
                                ? "检测中..."
                                : "检测到账"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCancelMembershipOrderDevelopment(order)
                              }
                              disabled={isMembershipOrderLoading || !accountId}
                              className="w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              取消订单
                            </button>
                          </>
                        ) : order.status === "active" ? (
                          <span className="block rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center text-[11px] text-emerald-100">
                            已激活
                          </span>
                        ) : (
                          <span className="block rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-2 text-center text-[11px] text-slate-400">
                            已处理
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/24 p-3">
            <p className="text-base font-semibold text-white">
              登录后可解锁会员系统
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              登录邮箱或钱包后，可以读取正式账户会员状态，并创建 VIP / SVIP
              会员订单。
            </p>
          </div>
        )}

        {adminRole ? (
          <div className="mt-3 rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/[0.06] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-fuchsia-100">
                  管理权限说明
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  {adminRole === "owner"
                    ? "你是 owner 超级管理员。管理员身份独立于会员等级，不等同于付费会员。"
                    : "你是普通管理员。管理员身份用于管理，不等同于 VIP / SVIP 付费会员。"}
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-fuchsia-100">
                {adminRole}
              </span>
            </div>
          </div>
        ) : null}
      </SectionCard>

            <SectionCard
        eyebrow="Progress"
        title="当前进度与下一步"
        desc="账户中心只保留一组最新说明，避免底部内容重复。"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
            <p className="text-base font-semibold text-emerald-100">
              已完成
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              邮箱登录、钱包登录、账户同步、好友备注、房间备注、黑名单、收藏房间、管理员系统、owner
              平台统计、VIP / SVIP 套餐、真实 USDT 支付订单、链上到账检测、会员自动激活、会员到期降级、月度流量重置、后端上传权限校验、上传流量扣减、发送消息安全加固和清空消息权限控制。
            </p>
          </div>

          <div className="rounded-3xl border border-purple-400/20 bg-purple-500/[0.06] p-3">
            <p className="text-base font-semibold text-purple-100">
              下一步
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              继续完善支付宝 / 微信支付、微信登录、订单管理页面、个人流量面板、专属私密房、房主权限、高级隐私设置、账户安全与找回机制，并在正式上线前继续强化服务端身份校验和 Supabase RLS 策略。
            </p>
          </div>
        </div>
      </SectionCard>

      {selectedMembershipPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Membership Payment</p>
                <h3 className="mt-1 text-base font-semibold text-white">
                  购买 {selectedMembershipPlan.title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  价格：{selectedMembershipPlan.price} · 周期：
                  {selectedMembershipPlan.period}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMembershipPayment}
                disabled={isMembershipOrderLoading}
                className="rounded-full border border-white/10 bg-slate-950/28 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                关闭
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {[
                {
                  key: "usdt" as const,
                  title: "USDT 支付",
                  desc: "当前可创建 BSC / USDT 唯一金额订单，系统自动检测到账。",
                  badge: "可用",
                },
                {
                  key: "alipay" as const,
                  title: "支付宝支付",
                  desc: "支付宝支付通道即将开放，当前暂不创建真实订单。",
                  badge: "即将开放",
                },
                {
                  key: "wechat" as const,
                  title: "微信支付",
                  desc: "微信支付通道即将开放，当前暂不创建真实订单。",
                  badge: "即将开放",
                },
              ].map((method) => {
                const isActive = selectedPaymentMethod === method.key;

                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.key)}
                    className={`rounded-3xl border p-3 text-left transition ${
                      isActive
                        ? "border-fuchsia-400/40 bg-fuchsia-500/10"
                        : "border-white/10 bg-slate-950/25 hover:bg-slate-950/24"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {method.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">
                          {method.desc}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
                          method.key === "usdt"
                            ? "bg-emerald-400/10 text-emerald-100"
                            : "bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        {method.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {payableMembershipOrders.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                你当前已有待支付订单。确认创建新订单后，系统会自动把旧的待支付订单设为已取消，并只保留新的会员选择。
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeMembershipPayment}
                disabled={isMembershipOrderLoading}
                className="rounded-2xl border border-white/10 bg-slate-950/28 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleConfirmMembershipPayment}
                disabled={isMembershipOrderLoading}
                className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-base font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isWalletPaymentSubmitting
  ? "等待钱包确认..."
  : isMembershipOrderLoading
    ? "处理中..."
    : "确认并唤起钱包支付"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
