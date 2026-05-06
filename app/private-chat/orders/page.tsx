"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentPrivateChatAuthSession,
  type PrivateChatAuthSession,
} from "../lib/privateChatAuthStore";
import { getCurrentPrivateChatUser } from "../lib/privateChatStore";
import {
  readAppAccountSession,
  type AppAccountSession,
} from "@/app/lib/appAuthStore";

type MembershipLevel = "free" | "vip" | "svip";

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

type MembershipApiResponse<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type MembershipRow = {
  accountId: string;
  email: string | null;
  displayName: string | null;
  walletAddress: string | null;
  membershipLevel: MembershipLevel;
  membershipStatus: string;
  membershipStartedAt: string | null;
  membershipExpiresAt: string | null;
  membershipSource: string | null;
  membershipNote: string | null;
};

type RecentUploadRow = {
  id: string;
  roomId: string | null;
  mediaPath: string | null;
  messageType: "image" | "video" | "unknown";
  fileName: string | null;
  fileType: string | null;
  fileSize: number;
  status: string;
  createdAt: string | null;
  sentAt: string | null;
  deletedAt: string | null;
};

type MemberUsageSummary = {
  membership: MembershipRow;
  monthLabel: string;
  monthStart: string;
  monthlyTrafficUsedBytes: number;
  monthlyTrafficLimitBytes: number;
  monthlyTrafficRemainingBytes: number;
  monthlyTrafficUsagePercent: number;
  monthlyUploadCount: number;
  monthlyImageCount: number;
  monthlyVideoCount: number;
  recentUploads: RecentUploadRow[];
  source: string;
  readable: boolean;
  readError: string | null;
};

type AccountIdentity = {
  accountId: string | null;
  chatUserId: string | null;
  displayName: string;
  avatar: string;
};

function shortenText(value?: string | null, start = 10, end = 8) {
  if (!value) return "未设置";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
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

function getLevelLabel(level: MembershipLevel) {
  if (level === "svip") return "SVIP";
  if (level === "vip") return "VIP";
  return "Free";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function getUploadTypeLabel(type: RecentUploadRow["messageType"]) {
  if (type === "image") return "图片";
  if (type === "video") return "视频";
  return "未知";
}

function getUploadStatusLabel(status: string) {
  if (status === "signed") return "已签名";
  if (status === "uploaded") return "已上传";
  if (status === "message_sent") return "已发送";
  if (status === "deleted") return "已删除";
  if (status === "failed") return "失败";
  return status || "未知";
}

function getStatusLabel(status: OrderStatus) {
  if (status === "pending") return "待支付";
  if (status === "paid") return "已支付";
  if (status === "active") return "已激活";
  if (status === "cancelled") return "已取消";
  if (status === "expired") return "已过期";
  if (status === "failed") return "失败";

  return "未知";
}

function getStatusClass(status: OrderStatus) {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "pending" || status === "paid") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (status === "cancelled" || status === "failed" || status === "expired") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  return "border-white/10 bg-white/10 text-slate-300";
}

function getLevelClass(level: MembershipLevel) {
  if (level === "svip") {
    return "border-purple-400/20 bg-purple-500/10 text-purple-100";
  }

  if (level === "vip") {
    return "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100";
  }

  return "border-white/10 bg-white/10 text-slate-300";
}

function getRemainingText(order: MembershipOrderRow) {
  if (!order.expiresAt) return "未设置";

  const expiresTime = new Date(order.expiresAt).getTime();

  if (!Number.isFinite(expiresTime)) return "未设置";

  const diffMs = expiresTime - Date.now();

  if (diffMs <= 0) return "已到期";

  const days = Math.ceil(diffMs / 1000 / 60 / 60 / 24);

  return `剩余约 ${days} 天`;
}

function resolveAccountIdentity(): AccountIdentity {
  let authSession: PrivateChatAuthSession | null = null;
  let appSession: AppAccountSession | null = null;
  let currentUser: ReturnType<typeof getCurrentPrivateChatUser> | null = null;

  try {
    authSession = getCurrentPrivateChatAuthSession();
  } catch {
    authSession = null;
  }

  try {
    appSession = readAppAccountSession();
  } catch {
    appSession = null;
  }

  try {
    currentUser = getCurrentPrivateChatUser();
  } catch {
    currentUser = null;
  }

  const rawAppSession = appSession as unknown as Record<string, unknown> | null;
  const rawAuthSession = authSession as unknown as Record<string, unknown> | null;
  const rawCurrentUser = currentUser as unknown as Record<string, unknown> | null;

  const nestedAccount =
    rawAppSession && typeof rawAppSession.account === "object"
      ? (rawAppSession.account as Record<string, unknown>)
      : null;

  const accountId =
    (typeof rawAppSession?.accountId === "string" && rawAppSession.accountId) ||
    (typeof rawAppSession?.id === "string" && rawAppSession.id) ||
    (typeof nestedAccount?.id === "string" && nestedAccount.id) ||
    (typeof rawAuthSession?.accountId === "string" && rawAuthSession.accountId) ||
    null;

  const chatUserId =
    (typeof rawAuthSession?.chatUserId === "string" && rawAuthSession.chatUserId) ||
    (typeof rawAuthSession?.userId === "string" && rawAuthSession.userId) ||
    (typeof rawCurrentUser?.id === "string" && rawCurrentUser.id) ||
    null;

  const displayName =
    (typeof rawAuthSession?.displayName === "string" && rawAuthSession.displayName) ||
    (typeof rawAuthSession?.userName === "string" && rawAuthSession.userName) ||
    (typeof rawCurrentUser?.name === "string" && rawCurrentUser.name) ||
    (typeof nestedAccount?.display_name === "string" && nestedAccount.display_name) ||
    "当前用户";

  const avatar =
    (typeof rawAuthSession?.avatar === "string" && rawAuthSession.avatar) ||
    (typeof rawCurrentUser?.avatar === "string" && rawCurrentUser.avatar) ||
    "👤";

  return {
    accountId,
    chatUserId,
    displayName,
    avatar,
  };
}

async function callMembershipApi<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/private-chat/membership", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  let result: MembershipApiResponse<T> | null = null;

  try {
    result = JSON.parse(responseText) as MembershipApiResponse<T>;
  } catch {
    result = null;
  }

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        `会员订单接口请求失败：${response.status}`
    );
  }

  return result;
}

export default function PrivateChatOrdersPage() {
  const [identity, setIdentity] = useState<AccountIdentity>({
    accountId: null,
    chatUserId: null,
    displayName: "当前用户",
    avatar: "👤",
  });

  const [orders, setOrders] = useState<MembershipOrderRow[]>([]);
  const [usageSummary, setUsageSummary] = useState<MemberUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === "active"),
    [orders]
  );

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "pending" || order.status === "paid"),
    [orders]
  );

  const historyOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "cancelled" ||
          order.status === "expired" ||
          order.status === "failed"
      ),
    [orders]
  );

  useEffect(() => {
    const nextIdentity = resolveAccountIdentity();

    setIdentity(nextIdentity);

    if (nextIdentity.accountId) {
      refreshOrders(nextIdentity.accountId);
      refreshUsageSummary(nextIdentity.accountId, nextIdentity.chatUserId);
    } else {
      setIsLoading(false);
      setErrorText("当前没有读取到账户 ID，请先在账户中心完成邮箱或钱包登录。");
    }
  }, []);

  async function refreshOrders(nextAccountId = identity.accountId) {
    if (!nextAccountId) {
      setErrorText("缺少 accountId，无法读取订单。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatusText("");
    setErrorText("");

    try {
      const result = await callMembershipApi<MembershipOrderRow[]>({
        action: "list_membership_orders",
        accountId: nextAccountId,
      });

      setOrders(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取订单失败。";
      setErrorText(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUsageSummary(
    nextAccountId = identity.accountId,
    nextChatUserId = identity.chatUserId
  ) {
    if (!nextAccountId) return;

    setIsUsageLoading(true);

    try {
      const result = await callMembershipApi<MemberUsageSummary>({
        action: "get_member_usage_summary",
        accountId: nextAccountId,
        chatUserId: nextChatUserId,
      });

      setUsageSummary(result.data || null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "读取会员流量统计失败。";

      setErrorText(message);
    } finally {
      setIsUsageLoading(false);
    }
  }

  async function handleCheckPayment(order: MembershipOrderRow) {
    if (!identity.accountId) return;

    setWorkingOrderId(order.id);
    setStatusText("");
    setErrorText("");

    try {
      const result = await callMembershipApi<{
        order?: MembershipOrderRow;
      }>({
        action: "check_membership_order_payment",
        accountId: identity.accountId,
        orderId: order.id,
      });

      setStatusText(result.message || "已检测订单支付状态。");
      await refreshOrders(identity.accountId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "检测订单支付状态失败。";

      setErrorText(message);
    } finally {
      setWorkingOrderId(null);
    }
  }

  async function handleCancelOrder(order: MembershipOrderRow) {
    if (!identity.accountId) return;

    const confirmed = window.confirm(
      `确定取消这笔 ${getLevelLabel(order.membershipLevel)} 订单吗？`
    );

    if (!confirmed) return;

    setWorkingOrderId(order.id);
    setStatusText("");
    setErrorText("");

    try {
      const result = await callMembershipApi<MembershipOrderRow>({
        action: "cancel_membership_order",
        accountId: identity.accountId,
        orderId: order.id,
      });

      setStatusText(result.message || "订单已取消。");
      await refreshOrders(identity.accountId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "取消订单失败。";
      setErrorText(message);
    } finally {
      setWorkingOrderId(null);
    }
  }

  function renderOrderCard(order: MembershipOrderRow) {
    const isWorking = workingOrderId === order.id;
    const isPayable = order.status === "pending" || order.status === "paid";

    return (
      <div
        key={order.id}
        className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-sm ${getLevelClass(
                  order.membershipLevel
                )}`}
              >
                {getLevelLabel(order.membershipLevel)}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-sm ${getStatusClass(
                  order.status
                )}`}
              >
                {getStatusLabel(order.status)}
              </span>

              <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-1 text-sm text-slate-300">
                {order.chain} / {order.currency}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-white">
              {getLevelLabel(order.membershipLevel)} 会员订单
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              订单 ID：{order.id}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm leading-6 text-slate-300 md:grid-cols-2">
              <p>金额：{order.amount} {order.currency}</p>
              <p>有效期：{order.durationDays} 天</p>
              <p>创建时间：{formatDateTime(order.createdAt)}</p>
              <p>支付时间：{formatDateTime(order.paidAt)}</p>
              <p>开始时间：{formatDateTime(order.startedAt)}</p>
              <p>
                到期时间：{formatDateTime(order.expiresAt)}
                {order.status === "active" ? `（${getRemainingText(order)}）` : ""}
              </p>
              <p>付款钱包：{shortenText(order.walletAddress, 12, 8)}</p>
              <p>收款地址：{shortenText(order.paymentAddress, 12, 8)}</p>
              <p className="md:col-span-2">
                txHash：{shortenText(order.txHash, 18, 12)}
              </p>
            </div>

            {order.note ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm leading-6 text-slate-400">
                {order.note}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:w-[190px]">
            {isPayable ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCheckPayment(order)}
                  disabled={isWorking}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWorking ? "检测中..." : "检测到账"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCancelOrder(order)}
                  disabled={isWorking}
                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  取消订单
                </button>
              </>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-center text-sm text-slate-400">
                无需操作
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px] space-y-4">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Member Center</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                我的会员中心
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                查看你的会员状态、VIP / SVIP 订单、链上支付状态、到期时间和后续流量额度。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/private-chat/account"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                返回账户中心
              </Link>

              <Link
                href="/private-chat"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                返回大厅
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-2xl">
                {identity.avatar}
              </div>

              <div>
                <p className="text-base font-semibold text-white">
                  {identity.displayName}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  账户 ID：{shortenText(identity.accountId, 14, 10)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                refreshOrders();
                refreshUsageSummary();
              }}
              disabled={isLoading || !identity.accountId}
              className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading || isUsageLoading ? "刷新中..." : "刷新会员中心"}
            </button>
          </div>

          {(statusText || errorText) && (
            <div className="mt-3 space-y-2">
              {statusText ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  {statusText}
                </div>
              ) : null}

              {errorText ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errorText}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Membership Usage</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                本月流量额度
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                统计本月私密聊天图片 / 视频上传流量，额度按照当前会员等级计算。
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-sm text-slate-300">
              {usageSummary?.monthLabel || "当前月份"}
            </span>
          </div>

          {isUsageLoading ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-6 text-center text-sm text-slate-400">
              正在读取流量统计...
            </div>
          ) : usageSummary ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4">
                  <p className="text-sm text-slate-400">本月已用</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-100">
                    {formatBytes(usageSummary.monthlyTrafficUsedBytes)}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
                  <p className="text-sm text-slate-400">剩余额度</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-100">
                    {formatBytes(usageSummary.monthlyTrafficRemainingBytes)}
                  </p>
                </div>

                <div className="rounded-3xl border border-purple-400/20 bg-purple-500/[0.06] p-4">
                  <p className="text-sm text-slate-400">月度总额度</p>
                  <p className="mt-2 text-2xl font-semibold text-purple-100">
                    {formatBytes(usageSummary.monthlyTrafficLimitBytes)}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-sm text-slate-400">上传次数</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {usageSummary.monthlyUploadCount}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    图片 {usageSummary.monthlyImageCount} / 视频{" "}
                    {usageSummary.monthlyVideoCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">流量使用率</span>
                  <span className="text-slate-400">
                    {usageSummary.monthlyTrafficUsagePercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{
                      width:
                        String(
                          Math.min(
                            100,
                            Math.max(0, usageSummary.monthlyTrafficUsagePercent)
                          )
                        ) + "%",
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      最近上传记录
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      显示本月最近 20 条图片 / 视频上传记录。
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                    {usageSummary.recentUploads.length} 条
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {usageSummary.recentUploads.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-4 text-center text-sm text-slate-500">
                      本月暂无上传记录。
                    </div>
                  ) : (
                    usageSummary.recentUploads.map((upload, index) => (
                      <div
                        key={upload.id || upload.mediaPath || upload.createdAt || String(index)}
                        className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 md:grid-cols-[90px_1fr_120px_140px]"
                      >
                        <span>{getUploadTypeLabel(upload.messageType)}</span>
                        <span className="truncate">
                          {upload.fileName || upload.mediaPath || "未命名文件"}
                        </span>
                        <span>{formatBytes(upload.fileSize)}</span>
                        <span className="text-slate-500">
                          {getUploadStatusLabel(upload.status)} ·{" "}
                          {formatDateTime(upload.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-6 text-center text-sm text-slate-400">
              暂未读取到流量统计。登录后刷新会员中心即可查看。
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
            <p className="text-sm text-slate-400">已激活订单</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100">
              {activeOrders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
            <p className="text-sm text-slate-400">待处理订单</p>
            <p className="mt-2 text-2xl font-semibold text-amber-100">
              {pendingOrders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">历史订单</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {historyOrders.length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Order List</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                全部会员订单
              </h2>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
              共 {orders.length} 笔
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
                正在读取订单...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
                暂无会员订单。你可以回到账户中心选择 VIP / SVIP 套餐创建订单。
              </div>
            ) : (
              orders.map(renderOrderCard)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}