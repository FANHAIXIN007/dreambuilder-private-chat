"use client";

import { useEffect, useMemo, useState } from "react";

type MembershipLevel = "free" | "vip" | "svip";
type MembershipStatus = "active" | "expired" | "cancelled" | "manual";

type MembershipActionResponse<T> = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: T;
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

type OwnerMembershipUserRow = {
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
 createdAt: string | null;
 updatedAt: string | null;
 monthlyTrafficUsedBytes?: number;
 monthlyTrafficLimitBytes?: number;
 monthlyTrafficUsagePercent?: number;
 daysRemaining?: number | null;
 isExpiringSoon?: boolean;
 isExpiredByTime?: boolean;
};

type PlanEditorState = Record<
 string,
 {
 amount: string;
 durationDays: string;
 isActive: boolean;
 }
>;

type Props = {
 actorId: string | null;
 isOwner: boolean;
};

const MEMBERSHIP_PLAN_UPDATED_EVENT = "private_chat_membership_plans_updated_v1";

function shortenText(value?: string | null, start = 8, end = 6) {
 if (!value) return "";
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

 return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getRemainingDaysText(member: OwnerMembershipUserRow) {
 if (typeof member.daysRemaining !== "number") return "未设置到期";

 if (member.daysRemaining < 0) return "已过期";
 if (member.daysRemaining === 0) return "今天到期";

 return `剩余 ${member.daysRemaining} 天`;
}

function getExpiryBadgeClass(member: OwnerMembershipUserRow) {
 if (member.isExpiredByTime || member.membershipStatus === "expired") {
 return "bg-rose-500/10 text-rose-100";
 }

 if (member.isExpiringSoon) {
 return "bg-amber-400/10 text-amber-100";
 }

 return "bg-emerald-400/10 text-emerald-100";
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

function getBadgeClass(level?: MembershipLevel | null) {
 if (level === "svip") return "bg-purple-400/10 text-purple-100";
 if (level === "vip") return "bg-fuchsia-400/10 text-fuchsia-100";
 return "bg-slate-500/10 text-slate-300";
}

function readVisibleMembers(members: OwnerMembershipUserRow[]) {
 return members.filter(
 (member) => member.membershipLevel === "vip" || member.membershipLevel === "svip"
 );
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
 `会员管理操作失败，状态码：${response.status}`
 );
 }

 return result;
}

export default function PrivateChatOwnerMembershipManager({
 actorId,
 isOwner,
}: Props) {
 const [activeTab, setActiveTab] = useState<"plans" | "members">("plans");
 const [plans, setPlans] = useState<MembershipPlanConfigRow[]>([]);
 const [members, setMembers] = useState<OwnerMembershipUserRow[]>([]);
 const [planEditors, setPlanEditors] = useState<PlanEditorState>({});
 const [searchText, setSearchText] = useState("");
 const [statusText, setStatusText] = useState("");
 const [errorText, setErrorText] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [isSavingPlan, setIsSavingPlan] = useState<string | null>(null);
 const [isUpdatingMemberId, setIsUpdatingMemberId] = useState<string | null>(
 null
 );

 const visibleMembers = useMemo(() => readVisibleMembers(members), [members]);

 const vipMembers = useMemo(
 () => visibleMembers.filter((item) => item.membershipLevel === "vip"),
 [visibleMembers]
 );

 const svipMembers = useMemo(
 () => visibleMembers.filter((item) => item.membershipLevel === "svip"),
 [visibleMembers]
 );

 const expiringSoonMembers = useMemo(
 () => visibleMembers.filter((item) => item.isExpiringSoon),
 [visibleMembers]
 );

 const expiredMembers = useMemo(
 () =>
 visibleMembers.filter(
 (item) => item.isExpiredByTime || item.membershipStatus === "expired"
 ),
 [visibleMembers]
 );

 const monthlyTrafficUsedBytes = useMemo(
 () =>
 visibleMembers.reduce(
 (total, item) => total + (item.monthlyTrafficUsedBytes || 0),
 0
 ),
 [visibleMembers]
 );

 useEffect(() => {
 if (!isOwner || !actorId) return;
 refreshOwnerMembershipData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [isOwner, actorId]);

 if (!isOwner) return null;

 async function refreshOwnerMembershipData() {
 if (!actorId) return;

 setIsLoading(true);
 setStatusText("");
 setErrorText("");

 try {
 const [planResult, memberResult] = await Promise.all([
 callMembershipAction<MembershipPlanConfigRow[]>({
 action: "get_membership_plans",
 actorId,
 }),
 callMembershipAction<OwnerMembershipUserRow[]>({
 action: "owner_list_memberships",
 actorId,
 searchText: searchText.trim() || null,
 }),
 ]);

 const nextPlans = Array.isArray(planResult.data) ? planResult.data : [];
 const nextMembers = Array.isArray(memberResult.data)
 ? readVisibleMembers(memberResult.data)
 : [];

 setPlans(nextPlans);
 setMembers(nextMembers);
 setPlanEditors(
 nextPlans.reduce<PlanEditorState>((result, plan) => {
 result[plan.level] = {
 amount: String(plan.amount),
 durationDays: String(plan.durationDays),
 isActive: plan.isActive,
 };
 return result;
 }, {})
 );
 } catch (error) {
 const message = error instanceof Error ? error.message : "读取会员管理数据失败。";
 setErrorText(message);
 } finally {
 setIsLoading(false);
 }
 }

 async function refreshOwnerMembersOnly() {
 if (!actorId) return;

 setIsLoading(true);
 setStatusText("");
 setErrorText("");

 try {
 const result = await callMembershipAction<OwnerMembershipUserRow[]>({
 action: "owner_list_memberships",
 actorId,
 searchText: searchText.trim() || null,
 });

 setMembers(Array.isArray(result.data) ? readVisibleMembers(result.data) : []);
 } catch (error) {
 const message = error instanceof Error ? error.message : "读取会员列表失败。";
 setErrorText(message);
 } finally {
 setIsLoading(false);
 }
 }

 function updatePlanEditor(
 level: Exclude<MembershipLevel, "free">,
 patch: Partial<PlanEditorState[string]>
 ) {
 setPlanEditors((prev) => ({
 ...prev,
 [level]: {
 amount: prev[level]?.amount || "0",
 durationDays: prev[level]?.durationDays || "30",
 isActive: prev[level]?.isActive ?? true,
 ...patch,
 },
 }));
 }

 async function handleSavePlan(level: Exclude<MembershipLevel, "free">) {
 if (!actorId) return;

 const editor = planEditors[level];
 const amount = Number(editor?.amount);
 const durationDays = Number(editor?.durationDays);

 if (!Number.isFinite(amount) || amount <= 0) {
 setErrorText("会员价格必须大于 0。");
 return;
 }

 if (!Number.isFinite(durationDays) || durationDays <= 0) {
 setErrorText("会员有效期必须大于 0 天。");
 return;
 }

 setIsSavingPlan(level);
 setStatusText("");
 setErrorText("");

 try {
 const result = await callMembershipAction<MembershipPlanConfigRow>({
 action: "owner_update_membership_plan",
 actorId,
 level,
 amount,
 durationDays,
 isActive: editor?.isActive ?? true,
 });

 if (result.data) {
 setPlans((prev) =>
 prev.map((item) => (item.level === level ? result.data! : item))
 );
 }

 if (typeof window !== "undefined") {
 window.dispatchEvent(new Event(MEMBERSHIP_PLAN_UPDATED_EVENT));
 }

 setStatusText(
 `${getMembershipLabel(level)} 设置已保存，购买面板会自动刷新价格和购买状态。`
 );
 } catch (error) {
 const message = error instanceof Error ? error.message : "保存会员价格失败。";
 setErrorText(message);
 } finally {
 setIsSavingPlan(null);
 }
 }

 async function handleUpdateMemberLevel(params: {
 accountId: string;
 level: MembershipLevel;
 durationDays?: number;
 }) {
 if (!actorId) return;

 setIsUpdatingMemberId(params.accountId);
 setStatusText("");
 setErrorText("");

 try {
 const result = await callMembershipAction<OwnerMembershipUserRow>({
 action: "owner_update_account_membership",
 actorId,
 accountId: params.accountId,
 membershipLevel: params.level,
 durationDays:
 params.durationDays ||
 (params.level === "svip" ? 365 : params.level === "vip" ? 30 : 0),
 });

 if (result.data) {
 setMembers((prev) => {
 if (result.data!.membershipLevel === "free") {
 return prev.filter((item) => item.accountId !== params.accountId);
 }

 const exists = prev.some((item) => item.accountId === params.accountId);

 if (!exists) return [result.data!, ...prev];

 return prev.map((item) =>
 item.accountId === params.accountId ? result.data! : item
 );
 });
 }

 setStatusText(`已更新为 ${getMembershipLabel(params.level)}。`);
 } catch (error) {
 const message = error instanceof Error ? error.message : "更新会员失败。";
 setErrorText(message);
 } finally {
 setIsUpdatingMemberId(null);
 }
 }

 function renderMemberGroup(
 title: string,
 subtitle: string,
 groupMembers: OwnerMembershipUserRow[],
 tone: "vip" | "svip"
 ) {
 const toneClass =
 tone === "svip"
 ? "border-purple-400/20 bg-purple-500/[0.05]"
 : "border-fuchsia-400/20 bg-fuchsia-500/[0.05]";

 return (
 <div className={`rounded-3xl border p-3 ${toneClass}`}>
 <div className="flex items-center justify-between gap-3">
 <div>
 <p className="text-base font-semibold text-white">{title}</p>
 <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
 </div>
 <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
 {groupMembers.length} 人
 </span>
 </div>

 <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
 {groupMembers.length === 0 ? (
 <div className="rounded-3xl border border-white/10 bg-black/10 px-3 py-4 text-center text-sm text-slate-500">
 暂无{title}账户
 </div>
 ) : (
 groupMembers.map((member) => (
 <div
 key={member.accountId}
 className="rounded-3xl border border-white/10 bg-white/[0.03] p-3"
 >
 <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <p className="text-base font-semibold text-white">
 {member.displayName || member.email || "未命名账户"}
 </p>

 <span className={`rounded-full px-2 py-1 text-[10px] ${getBadgeClass(member.membershipLevel)}`}>
 {getMembershipLabel(member.membershipLevel)}
 </span>

 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-400">
 {getMembershipStatusLabel(member.membershipStatus)}
 </span>

 <span className={`rounded-full px-2 py-1 text-[10px] ${getExpiryBadgeClass(member)}`}>
 {getRemainingDaysText(member)}
 </span>
 </div>

 <p className="mt-1 text-[11px] text-slate-500">
 账号 ID：{shortenText(member.accountId, 12, 8)}
 </p>

 <p className="mt-1 truncate text-[11px] text-slate-500">
 邮箱：{member.email || "未绑定"}
 </p>

 <p className="mt-1 truncate text-[11px] text-slate-500">
 钱包：{member.walletAddress || "未绑定"}
 </p>

 <p className="mt-1 text-[11px] text-slate-500">
 到期：{formatDateTime(member.membershipExpiresAt)}
 </p>

 <div className="mt-2 flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-400">
 本月流量：{formatBytes(member.monthlyTrafficUsedBytes || 0)}
 </span>

 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-400">
 额度：{formatBytes(member.monthlyTrafficLimitBytes || 0)}
 </span>
 </div>

 <div className="mt-2">
 <div className="h-2 overflow-hidden rounded-full bg-white/10">
 <div
 className="h-full rounded-full bg-emerald-400"
 style={{
 width: `${Math.min(
 100,
 Math.max(0, member.monthlyTrafficUsagePercent || 0)
 )}%`,
 }}
 />
 </div>

 <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
 <span>流量使用率</span>
 <span>{(member.monthlyTrafficUsagePercent || 0).toFixed(1)}%</span>
 </div>
 </div>

 {member.membershipNote ? (
 <p className="mt-2 rounded-2xl bg-black/10 px-3 py-2 text-[11px] leading-5 text-slate-500">
 {member.membershipNote}
 </p>
 ) : null}
 </div>

 <div className="grid grid-cols-3 gap-2 lg:w-[300px]">
 <button
 type="button"
 onClick={() =>
 handleUpdateMemberLevel({
 accountId: member.accountId,
 level: "vip",
 durationDays: 30,
 })
 }
 disabled={isUpdatingMemberId === member.accountId}
 className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-[11px] text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 设为 VIP
 </button>

 <button
 type="button"
 onClick={() =>
 handleUpdateMemberLevel({
 accountId: member.accountId,
 level: "svip",
 durationDays: 365,
 })
 }
 disabled={isUpdatingMemberId === member.accountId}
 className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-100 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 设为 SVIP
 </button>

 <button
 type="button"
 onClick={() =>
 handleUpdateMemberLevel({
 accountId: member.accountId,
 level: "free",
 })
 }
 disabled={isUpdatingMemberId === member.accountId}
 className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 恢复 Free
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
 }

 return (
 <section className="rounded-3xl border border-purple-400/20 bg-purple-500/[0.05] p-4">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <p className="text-sm text-slate-500">Owner Membership Manager</p>
 <div className="mt-1 flex flex-wrap items-center gap-2">
 <h2 className="text-base font-semibold text-white">会员管理中心</h2>
 <span className="rounded-full bg-purple-400/10 px-2 py-1 text-[11px] text-purple-100">
 owner 可见
 </span>
 </div>
 <p className="mt-1 text-sm leading-5 text-slate-400">
 管理 VIP / SVIP 价格、有效期、是否开放购买，并按 VIP 与 SVIP 分开管理付费会员。
 </p>
 </div>

 <button
 type="button"
 onClick={refreshOwnerMembershipData}
 disabled={isLoading || !actorId}
 className="rounded-2xl border border-purple-300/20 bg-white/[0.04] px-3 py-2 text-[11px] text-purple-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isLoading ? "刷新中..." : "刷新会员管理"}
 </button>
 </div>

 {(statusText || errorText) && (
 <div className="mt-3 space-y-2">
 {statusText ? (
 <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
 {statusText}
 </div>
 ) : null}
 {errorText ? (
 <div className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
 {errorText}
 </div>
 ) : null}
 </div>
 )}

 <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl bg-black/10 p-1.5">
 <button
 type="button"
 onClick={() => setActiveTab("plans")}
 className={`rounded-2xl px-3 py-2 text-sm transition ${
 activeTab === "plans"
 ? "bg-purple-500 text-white shadow-lg shadow-purple-950/30"
 : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
 }`}
 >
 价格配置
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("members")}
 className={`rounded-2xl px-3 py-2 text-sm transition ${
 activeTab === "members"
 ? "bg-purple-500 text-white shadow-lg shadow-purple-950/30"
 : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
 }`}
 >
 付费会员
 </button>
 <div className="rounded-2xl px-3 py-2 text-center text-sm text-slate-400">
 VIP {vipMembers.length} / SVIP {svipMembers.length}
 </div>
 </div>

 <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
 <div className="rounded-3xl border border-white/10 bg-black/10 p-3">
 <p className="text-[11px] text-slate-500">付费会员</p>
 <p className="mt-1 text-base font-semibold text-white">{visibleMembers.length} 人</p>
 </div>

 <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-3">
 <p className="text-[11px] text-amber-100">即将到期</p>
 <p className="mt-1 text-base font-semibold text-amber-100">{expiringSoonMembers.length} 人</p>
 </div>

 <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-3">
 <p className="text-[11px] text-rose-100">已过期</p>
 <p className="mt-1 text-base font-semibold text-rose-100">{expiredMembers.length} 人</p>
 </div>

 <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-3">
 <p className="text-[11px] text-emerald-100">本月总流量</p>
 <p className="mt-1 text-base font-semibold text-emerald-100">
 {formatBytes(monthlyTrafficUsedBytes)}
 </p>
 </div>
 </div>

 {activeTab === "plans" ? (
 <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
 {plans.map((plan) => {
 const editor = planEditors[plan.level] || {
 amount: String(plan.amount),
 durationDays: String(plan.durationDays),
 isActive: plan.isActive,
 };

 return (
 <div
 key={plan.level}
 className="rounded-3xl border border-white/10 bg-black/10 p-4"
 >
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-base font-semibold text-white">
 {plan.title}
 </p>
 <p className="mt-1 text-[11px] text-slate-500">
 {plan.subtitle || "会员套餐"}
 </p>
 </div>
 <span className={`rounded-full px-2 py-1 text-[11px] ${plan.isActive ? getBadgeClass(plan.level) : "bg-rose-500/10 text-rose-100"}`}>
 {plan.isActive ? "开放购买" : "已暂停购买"}
 </span>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-2">
 <label className="block">
 <span className="text-[11px] text-slate-500">价格 / USDT</span>
 <input
 value={editor.amount}
 onChange={(event) =>
 updatePlanEditor(plan.level, { amount: event.target.value })
 }
 inputMode="decimal"
 className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400/50"
 />
 </label>

 <label className="block">
 <span className="text-[11px] text-slate-500">有效期 / 天</span>
 <input
 value={editor.durationDays}
 onChange={(event) =>
 updatePlanEditor(plan.level, {
 durationDays: event.target.value,
 })
 }
 inputMode="numeric"
 className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400/50"
 />
 </label>
 </div>

 <label className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
 <span>允许用户购买</span>
 <input
 type="checkbox"
 checked={editor.isActive}
 onChange={(event) =>
 updatePlanEditor(plan.level, {
 isActive: event.target.checked,
 })
 }
 />
 </label>

 <p className="mt-2 text-[11px] text-slate-600">
 最后更新：{formatDateTime(plan.updatedAt)}
 </p>

 <button
 type="button"
 onClick={() => handleSavePlan(plan.level)}
 disabled={isSavingPlan === plan.level}
 className="mt-3 w-full rounded-2xl bg-purple-500 px-3 py-2 text-base font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isSavingPlan === plan.level ? "保存中..." : "保存价格 / 状态"}
 </button>
 </div>
 );
 })}
 </div>
 ) : null}

 {activeTab === "members" ? (
 <div className="mt-4">
 <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_110px]">
 <input
 value={searchText}
 onChange={(event) => setSearchText(event.target.value)}
 placeholder="搜索 VIP / SVIP 会员的邮箱、昵称或钱包地址"
 className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400/50"
 />

 <button
 type="button"
 onClick={refreshOwnerMembersOnly}
 disabled={isLoading}
 className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 查询
 </button>
 </div>

 <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
 {renderMemberGroup("VIP 会员", "只显示当前 VIP 账户，不显示 Free。", vipMembers, "vip")}
 {renderMemberGroup("SVIP 会员", "只显示当前 SVIP 账户，不显示 Free。", svipMembers, "svip")}
 </div>
 </div>
 ) : null}
 </section>
 );
}
