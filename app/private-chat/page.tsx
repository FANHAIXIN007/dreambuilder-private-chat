"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PrivateChatShell from "./components/PrivateChatShell";
import PrivateChatLoginPanel from "./components/PrivateChatLoginPanel";
import { privateChatSupabase } from "./lib/supabaseClient";
import {
 formatPrivateChatTime,
 getCurrentPrivateChatUser,
 updateCurrentPrivateChatAvatar,
 updateCurrentPrivateChatName,
 type PrivateChatUser,
} from "./lib/privateChatStore";
import {
 getCurrentPrivateChatAuthSession,
 type PrivateChatAuthSession,
} from "./lib/privateChatAuthStore";

const QUICK_AVATARS = [
 "🐰",
 "🐻",
 "🐼",
 "🐶",
 "🐱",
 "🦊",
 "🐹",
 "🐸",
 "🐧",
 "🐳",
 "🦄",
 "🐨",
 "🐤",
 "🌙",
 "⭐",
 "💖",
 "✨",
 "🌈",
 "🎀",
 "🧸",
];

const PRIVATE_NOTICE_READ_KEY = "private_chat_notice_read_v1";
const PUBLIC_CHAT_LOAD_TIMEOUT_MS = 8000;

type PublicChatMessageRow = {
 id: string;
 room_id: string;
 sender_id: string;
 sender_name: string;
 sender_avatar: string;
 content: string;
 created_at: string;
};

type PrivateChatMessageRow = {
 id: string;
 room_id: string;
 sender_id: string;
 sender_name: string;
 sender_avatar: string;
 receiver_id: string | null;
 receiver_name: string | null;
 content: string;
 created_at: string;
};

type OnlineLobbyUser = {
 id: string;
 name: string;
 avatar: string;
 online_at?: string;
};

type PrivateChatNotice = {
 senderId: string;
 senderName: string;
 senderAvatar: string;
 lastContent: string;
 lastCreatedAt: string;
 unreadCount: number;
};

type AdminRole = "owner" | "admin" | string;

type AdminRow = {
 id: string;
 user_id: string;
 user_name: string;
 role: AdminRole;
 created_at: string;
 created_by: string | null;
};

type BanRow = {
 id: string;
 user_id: string;
 user_name: string;
 reason: string | null;
 is_active: boolean;
 created_at: string;
 created_by: string | null;
 lifted_at: string | null;
 lifted_by: string | null;
};

type AnnouncementRow = {
 id: string;
 content: string;
 is_active: boolean;
 created_at: string;
 created_by: string | null;
};

type AdminLoginResponse = {
 ok?: boolean;
 message?: string;
};

type AdminActionResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
};

type SendMessageResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: PublicChatMessageRow;
};

type AdminTrafficSeriesPoint = {
 label?: string;
 date?: string;
 hour?: string;
 pv?: number;
 uv?: number;
 sessions?: number;
 visits?: number;
};

type AdminTrafficTopItem = {
 label?: string;
 path?: string;
 source?: string;
 count?: number;
 pv?: number;
 visits?: number;
};

type AdminTrafficData = {
 onlineNow?: number;
 activeIn5Minutes?: number;
 todayPv?: number;
 todayUv?: number;
 todaySessions?: number;
 weekPv?: number;
 weekUv?: number;
 weekSessions?: number;
 monthPv?: number;
 monthUv?: number;
 monthSessions?: number;
 dailySeries?: AdminTrafficSeriesPoint[];
 hourlySeries?: AdminTrafficSeriesPoint[];
 sourceStats?: AdminTrafficTopItem[];
 pathStats?: AdminTrafficTopItem[];
 topSources?: AdminTrafficTopItem[];
 topPaths?: AdminTrafficTopItem[];
};
type AdminStatsData = {
 storage: {
 bucket: string;

 usedBytes: number;
 limitBytes: number;
 usagePercent: number;
 objectCount: number;
 todayUploadBytes: number;
 todayObjectCount: number;
 source: string;

 historicalUploadBytes: number;
 historicalUsagePercent: number;
 historicalMediaCount: number;
 historicalImageCount: number;
 historicalVideoCount: number;

 activeUploadBytes: number;
 deletedUploadBytes: number;
 activeMediaCount: number;
 deletedMediaCount: number;

 todayHistoricalUploadBytes: number;
 todayHistoricalMediaCount: number;
 usageLogSource: string;

 monthlyTrafficLimitBytes: number;
 monthlyUploadBytes: number;
 monthlyTrafficUsagePercent: number;
 monthlyMediaCount: number;
 monthlyImageCount: number;
 monthlyVideoCount: number;
 monthlyTrafficMonth: string;
 };
 messages: {
 publicMessageCount: number;
 privateMessageCount: number;
 totalMessageCount: number;
 todayPublicMessageCount: number;
 todayPrivateMessageCount: number;
 todayTotalMessageCount: number;
 };
 media: {
 mediaMessageCount: number;
 imageCount: number;
 videoCount: number;
 mediaSizeBytesFromMessages: number;
 todayMediaCount: number;
 todayMediaSizeBytes: number;
 };
 moderation: {
 adminCount: number;
 activeBanCount: number;
 activeAnnouncementCount: number;
 };
 traffic?: AdminTrafficData;
};

type AdminStatsResponse = {
 ok?: boolean;
 data?: AdminStatsData;
 error?: string;
 message?: string;
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

type FriendRow = {
 id: string;
 user_id: string;
 user_name: string;
 user_avatar: string | null;
 friend_id: string;
 friend_name: string;
 friend_avatar: string | null;
 status: "active" | "removed";
 created_at: string;
 removed_at: string | null;
 updated_at: string;
};

type RoomFavoriteRow = {
 id: string;
 user_id: string;
 user_name: string;
 user_avatar: string | null;
 room_id: string;
 room_name: string;
 secret_code: string;
 room_avatar: string;
 status: "active" | "removed";
 created_at: string;
 removed_at: string | null;
 updated_at: string;
};

type PrivateActionResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: unknown;
};

function getPrivateNoticeReadMap() {
 if (typeof window === "undefined") return {};

 try {
 const raw = window.localStorage.getItem(PRIVATE_NOTICE_READ_KEY);
 return raw ? (JSON.parse(raw) as Record<string, string>) : {};
 } catch {
 return {};
 }
}

function savePrivateNoticeReadMap(map: Record<string, string>) {
 if (typeof window === "undefined") return;

 window.localStorage.setItem(PRIVATE_NOTICE_READ_KEY, JSON.stringify(map));
}

function markPrivateNoticeAsRead(senderId: string) {
 const oldMap = getPrivateNoticeReadMap();

 savePrivateNoticeReadMap({
 ...oldMap,
 [senderId]: new Date().toISOString(),
 });
}

function buildPrivateHref(
 message: PublicChatMessageRow,
 currentUser: PrivateChatUser | null
) {
 if (!currentUser || message.sender_id === currentUser.id) {
 return "/private-chat/private?mode=secret";
 }

 const params = new URLSearchParams({
 userId: message.sender_id,
 userName: message.sender_name,
 userAvatar: message.sender_avatar,
 });

 return `/private-chat/private?${params.toString()}`;
}

function buildPrivateNoticeHref(notice: PrivateChatNotice) {
 const params = new URLSearchParams({
 userId: notice.senderId,
 userName: notice.senderName,
 userAvatar: notice.senderAvatar,
 });

 return `/private-chat/private?${params.toString()}`;
}

function buildFriendHref(friend: FriendRow) {
 const params = new URLSearchParams({
 userId: friend.friend_id,
 userName: friend.friend_name,
 userAvatar: friend.friend_avatar || "👤",
 });

 return `/private-chat/private?${params.toString()}`;
}

function buildRoomFavoriteHref(room: RoomFavoriteRow) {
 return buildSecretRoomHref(room.secret_code);
}

function buildSecretRoomHref(secretCode: string) {
 const cleanedCode = secretCode.trim().slice(0, 32);

 const params = new URLSearchParams({
 mode: "secret",
 code: cleanedCode,
 });

 return `/private-chat/private?${params.toString()}`;
}

function dedupeOnlineUsers(users: OnlineLobbyUser[]) {
 const map = new Map<string, OnlineLobbyUser>();

 users.forEach((user) => {
 if (!user.id) return;
 map.set(user.id, user);
 });

 return Array.from(map.values());
}

function buildNoticesFromPrivateMessages(
 rows: PrivateChatMessageRow[],
 currentUserId: string
) {
 const readMap = getPrivateNoticeReadMap();
 const map = new Map<string, PrivateChatNotice>();

 rows
 .filter((row) => row.receiver_id === currentUserId)
 .filter((row) => row.sender_id !== currentUserId)
 .filter((row) => {
 const readAt = readMap[row.sender_id];

 if (!readAt) return true;

 return new Date(row.created_at).getTime() > new Date(readAt).getTime();
 })
 .forEach((row) => {
 const oldNotice = map.get(row.sender_id);

 if (!oldNotice) {
 map.set(row.sender_id, {
 senderId: row.sender_id,
 senderName: row.sender_name,
 senderAvatar: row.sender_avatar,
 lastContent: row.content,
 lastCreatedAt: row.created_at,
 unreadCount: 1,
 });

 return;
 }

 const oldTime = new Date(oldNotice.lastCreatedAt).getTime();
 const newTime = new Date(row.created_at).getTime();

 map.set(row.sender_id, {
 senderId: row.sender_id,
 senderName: row.sender_name,
 senderAvatar: row.sender_avatar,
 lastContent: newTime >= oldTime ? row.content : oldNotice.lastContent,
 lastCreatedAt:
 newTime >= oldTime ? row.created_at : oldNotice.lastCreatedAt,
 unreadCount: oldNotice.unreadCount + 1,
 });
 });

 return Array.from(map.values()).sort(
 (a, b) =>
 new Date(b.lastCreatedAt).getTime() - new Date(a.lastCreatedAt).getTime()
 );
}

function formatBytes(bytes?: number | null) {
 const value = Number(bytes || 0);

 if (!Number.isFinite(value) || value <= 0) return "0 B";

 if (value < 1024) return `${value} B`;

 if (value < 1024 * 1024) {
 return `${(value / 1024).toFixed(1)} KB`;
 }

 if (value < 1024 * 1024 * 1024) {
 return `${(value / 1024 / 1024).toFixed(1)} MB`;
 }

 return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const PRIVATE_CHAT_SITE_VISITOR_ID_KEY =
 "private_chat_site_visitor_id_v1";
const PRIVATE_CHAT_SITE_SESSION_ID_KEY =
 "private_chat_site_session_id_v1";

function createPrivateChatTrackingId(prefix: string) {
 const randomValue =
 typeof crypto !== "undefined" && "randomUUID" in crypto
 ? crypto.randomUUID()
 : Math.random().toString(36).slice(2);

 return prefix + "_" + Date.now() + "_" + randomValue;
}

function getOrCreatePrivateChatVisitorId() {
 if (typeof window === "undefined") return "";

 const oldValue = window.localStorage.getItem(PRIVATE_CHAT_SITE_VISITOR_ID_KEY);

 if (oldValue) return oldValue;

 const nextValue = createPrivateChatTrackingId("visitor");
 window.localStorage.setItem(PRIVATE_CHAT_SITE_VISITOR_ID_KEY, nextValue);

 return nextValue;
}

function getOrCreatePrivateChatSessionId() {
 if (typeof window === "undefined") return "";

 const oldValue = window.sessionStorage.getItem(
 PRIVATE_CHAT_SITE_SESSION_ID_KEY
 );

 if (oldValue) return oldValue;

 const nextValue = createPrivateChatTrackingId("session");
 window.sessionStorage.setItem(PRIVATE_CHAT_SITE_SESSION_ID_KEY, nextValue);

 return nextValue;
}

async function reportPrivateChatSiteVisit(params: {
 action: "visit" | "heartbeat" | "leave";
 path: string;
 pageTitle: string;
 currentUser: PrivateChatUser | null;
 authSession: PrivateChatAuthSession | null;
}) {
 if (typeof window === "undefined") return;

 const visitorId = getOrCreatePrivateChatVisitorId();
 const sessionId = getOrCreatePrivateChatSessionId();

 if (!visitorId || !sessionId) return;

 const accountId =
 params.authSession?.account?.accountId ||
 params.authSession?.profile?.accountId ||
 null;

 try {
 const payload = {
 action: params.action,
 visitorId,
 sessionId,
 accountId,
 chatUserId: params.currentUser?.id || null,
 userName: params.currentUser?.name || null,
 path: params.path,
 pageTitle: params.pageTitle,
 referrer: document.referrer || null,
 source: "private_chat_lobby",
 };

 if (params.action === "leave" && navigator.sendBeacon) {
 const blob = new Blob([JSON.stringify(payload)], {
 type: "application/json",
 });

 navigator.sendBeacon("/api/private-chat/site-visit", blob);
 return;
 }

 await fetch("/api/private-chat/site-visit", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 keepalive: params.action === "leave",
 body: JSON.stringify(payload),
 });
 } catch (error) {
 console.error("Report private chat site visit error:", error);
 }
}

function getUsageStatus(percent: number) {
 if (percent >= 90) {
 return {
 label: "接近上限",
 textClass: "text-rose-100",
 barClass: "bg-rose-400",
 bgClass: "bg-rose-500/10 border-rose-400/20",
 };
 }

 if (percent >= 75) {
 return {
 label: "使用较高",
 textClass: "text-amber-100",
 barClass: "bg-amber-300",
 bgClass: "bg-amber-400/10 border-amber-300/20",
 };
 }

 return {
 label: "正常",
 textClass: "text-emerald-100",
 barClass: "bg-emerald-300",
 bgClass: "bg-emerald-400/10 border-emerald-300/20",
 };
}

function getTrafficPointPv(point: AdminTrafficSeriesPoint) {
 return Number(point.pv ?? point.visits ?? 0);
}

function getTrafficPointUv(point: AdminTrafficSeriesPoint) {
 return Number(point.uv ?? 0);
}

function getTrafficItemLabel(item: AdminTrafficTopItem) {
 return item.label || item.path || item.source || "未知";
}

function getTrafficItemCount(item: AdminTrafficTopItem) {
 return Number(item.count ?? item.pv ?? item.visits ?? 0);
}

function formatStatNumber(value?: number | null) {
 const numberValue = Number(value || 0);

 if (!Number.isFinite(numberValue) || numberValue <= 0) return "0";

 if (numberValue >= 10000) {
 return (numberValue / 10000).toFixed(1) + "万";
 }

 return String(Math.round(numberValue));
}
export default function PrivateChatLobbyPage() {
 const router = useRouter();
 const listRef = useRef<HTMLDivElement | null>(null);

 const [currentUser, setCurrentUser] = useState<PrivateChatUser | null>(null);
 const [privateChatAuthSession, setPrivateChatAuthSession] =
 useState<PrivateChatAuthSession | null>(null);
 const [onlineUsers, setOnlineUsers] = useState<OnlineLobbyUser[]>([]);
 const [privateNotices, setPrivateNotices] = useState<PrivateChatNotice[]>([]);
 const [messages, setMessages] = useState<PublicChatMessageRow[]>([]);
 const [admins, setAdmins] = useState<AdminRow[]>([]);
 const [bans, setBans] = useState<BanRow[]>([]);
 const [activeAnnouncement, setActiveAnnouncement] =
 useState<AnnouncementRow | null>(null);
 const [publicChatPaused, setPublicChatPaused] = useState(false);
 const [publicChatCooldownSeconds, setPublicChatCooldownSeconds] = useState(0);
 const [adminStats, setAdminStats] = useState<AdminStatsData | null>(null);
 const [blockedUsers, setBlockedUsers] = useState<UserBlockRow[]>([]);
 const [friendUsers, setFriendUsers] = useState<FriendRow[]>([]);
 const [roomFavorites, setRoomFavorites] = useState<RoomFavoriteRow[]>([]);

 const [draft, setDraft] = useState("");
 const [nameDraft, setNameDraft] = useState("");
 const [announcementDraft, setAnnouncementDraft] = useState("");
 const [cooldownDraft, setCooldownDraft] = useState("0");
 const [appointAdminIdDraft, setAppointAdminIdDraft] = useState("");
 const [appointAdminNameDraft, setAppointAdminNameDraft] = useState("");

 const [isEditingName, setIsEditingName] = useState(false);
 const [avatarPanelOpen, setAvatarPanelOpen] = useState(false);
 const [secretDialogOpen, setSecretDialogOpen] = useState(false);
 const [secretCodeDraft, setSecretCodeDraft] = useState("");
 const [secretError, setSecretError] = useState("");
 const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
 const [adminPanelOpen, setAdminPanelOpen] = useState(true);

 const [isLoading, setIsLoading] = useState(true);
 const [isSending, setIsSending] = useState(false);
 const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
 const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);
 const [isDeletingMessageId, setIsDeletingMessageId] = useState<string | null>(
 null
 );
 const [errorText, setErrorText] = useState("");
 const [adminStatusText, setAdminStatusText] = useState("");
 const [adminStatsError, setAdminStatsError] = useState("");
 const [blockStatusText, setBlockStatusText] = useState("");
 const [friendStatusText, setFriendStatusText] = useState("");
 const [roomFavoriteStatusText, setRoomFavoriteStatusText] = useState("");
 const [isBlockActionLoading, setIsBlockActionLoading] = useState(false);
 const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
 const [isRoomFavoriteActionLoading, setIsRoomFavoriteActionLoading] =
 useState(false);

 const currentAdmin = currentUser
 ? admins.find((admin) => admin.user_id === currentUser.id)
 : undefined;

 const isAdmin = Boolean(currentAdmin);
 const isOwner = currentAdmin?.role === "owner";

 const currentUserBan = currentUser
 ? bans.find((ban) => ban.user_id === currentUser.id && ban.is_active)
 : undefined;

 const isBanned = Boolean(currentUserBan);

 function isUserAdmin(userId: string) {
 return admins.some((admin) => admin.user_id === userId);
 }

 function getUserAdminRole(userId: string) {
 return admins.find((admin) => admin.user_id === userId)?.role;
 }

 function canBanTargetUser(targetUserId: string) {
 if (!currentUser || !isAdmin) return false;

 if (targetUserId === currentUser.id) return false;

 if (isOwner) return true;

 return !isUserAdmin(targetUserId);
 }

 function canManageAdmins() {
 return isOwner;
 }

 function isUserBlockedByMe(userId: string) {
 return blockedUsers.some(
 (row) => row.blocked_id === userId && row.is_active
 );
 }


 function isUserFriendByMe(userId: string) {
 return friendUsers.some(
 (row) => row.friend_id === userId && row.status === "active"
 );
 }

 async function callPrivateAction(
 action: string,
 payload: Record<string, unknown> = {}
 ) {
 if (!currentUser) {
 return {
 ok: false,
 error: "当前用户不存在。",
 } as PrivateActionResponse;
 }

 try {
 const response = await fetch("/api/private-chat/private-action", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 action,
 actorId: currentUser.id,
 actorName: currentUser.name,
 ...payload,
 }),
 });

 const responseText = await response.text();

 let result: PrivateActionResponse | null = null;

 try {
 result = JSON.parse(responseText) as PrivateActionResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `私密操作失败，状态码：${response.status}`,
 } as PrivateActionResponse;
 }

 return {
 ok: true,
 message: result.message || "操作成功。",
 data: result.data,
 } as PrivateActionResponse;
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 } as PrivateActionResponse;
 }
 }

 async function loadBlockedUsers() {
 if (!currentUser) return;

 const result = await callPrivateAction("list_blocked_users");

 if (!result.ok) {
 console.error("Load blocked users error:", result.error);
 return;
 }

 setBlockedUsers((result.data || []) as UserBlockRow[]);
 }

 async function handleBlockUser(userId: string, userName: string) {
 if (!currentUser || isBlockActionLoading) return;

 if (userId === currentUser.id) {
 setBlockStatusText("不能拉黑自己。");
 return;
 }

 setIsBlockActionLoading(true);
 setBlockStatusText("");

 const result = await callPrivateAction("block_user", {
 targetUserId: userId,
 targetUserName: userName,
 reason: "用户主动拉黑",
 });

 if (!result.ok) {
 setBlockStatusText(result.error || "拉黑失败。");
 setIsBlockActionLoading(false);
 return;
 }

 setBlockStatusText(`已拉黑：${userName}`);
 await loadBlockedUsers();
 setIsBlockActionLoading(false);
 }

 async function handleUnblockUser(userId: string, userName: string) {
 if (!currentUser || isBlockActionLoading) return;

 setIsBlockActionLoading(true);
 setBlockStatusText("");

 const result = await callPrivateAction("unblock_user", {
 targetUserId: userId,
 });

 if (!result.ok) {
 setBlockStatusText(result.error || "取消拉黑失败。");
 setIsBlockActionLoading(false);
 return;
 }

 setBlockStatusText(`已取消拉黑：${userName}`);
 await loadBlockedUsers();
 setIsBlockActionLoading(false);
 }


 async function loadFriends() {
 if (!currentUser) return;

 const result = await callPrivateAction("list_friends");

 if (!result.ok) {
 console.error("Load friends error:", result.error);
 return;
 }

 setFriendUsers((result.data || []) as FriendRow[]);
 }

 async function handleAddFriend(userId: string, userName: string, userAvatar: string) {
 if (!currentUser || isFriendActionLoading) return;

 if (userId === currentUser.id) {
 setFriendStatusText("不能关注自己。");
 return;
 }

 setIsFriendActionLoading(true);
 setFriendStatusText("");

 const result = await callPrivateAction("add_friend", {
 actorAvatar: currentUser.avatar,
 friendId: userId,
 friendName: userName,
 friendAvatar: userAvatar,
 });

 if (!result.ok) {
 setFriendStatusText(result.error || "添加好友失败。");
 setIsFriendActionLoading(false);
 return;
 }

 setFriendStatusText(`已关注：${userName}`);
 await loadFriends();
 setIsFriendActionLoading(false);
 }

 async function handleRemoveFriend(userId: string, userName: string) {
 if (!currentUser || isFriendActionLoading) return;

 setIsFriendActionLoading(true);
 setFriendStatusText("");

 const result = await callPrivateAction("remove_friend", {
 friendId: userId,
 });

 if (!result.ok) {
 setFriendStatusText(result.error || "取消关注失败。");
 setIsFriendActionLoading(false);
 return;
 }

 setFriendStatusText(`已取消关注：${userName}`);
 await loadFriends();
 setIsFriendActionLoading(false);
 }

 async function loadRoomFavorites() {
 if (!currentUser) return;

 const result = await callPrivateAction("list_room_favorites");

 if (!result.ok) {
 console.error("Load room favorites error:", result.error);
 return;
 }

 setRoomFavorites((result.data || []) as RoomFavoriteRow[]);
 }

 async function handleRemoveRoomFavorite(roomId: string, roomName: string) {
 if (!currentUser || isRoomFavoriteActionLoading) return;

 setIsRoomFavoriteActionLoading(true);
 setRoomFavoriteStatusText("");

 const result = await callPrivateAction("remove_room_favorite", {
 roomId,
 });

 if (!result.ok) {
 setRoomFavoriteStatusText(result.error || "取消收藏房间失败。");
 setIsRoomFavoriteActionLoading(false);
 return;
 }

 setRoomFavoriteStatusText(`已取消收藏：${roomName}`);
 await loadRoomFavorites();
 setIsRoomFavoriteActionLoading(false);
 }

 async function loadAdminStats() {
 if (!currentUser || !isOwner) return;

 setIsLoadingAdminStats(true);
 setAdminStatsError("");

 try {
 const response = await fetch("/api/private-chat/admin-stats", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 actorId: currentUser.id,
 }),
 });

 const responseText = await response.text();

 let result: AdminStatsResponse | null = null;

 try {
 result = JSON.parse(responseText) as AdminStatsResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok || !result.data) {
 setAdminStatsError(
 result?.error ||
 result?.message ||
 `平台统计加载失败，状态码：${response.status}`
 );
 setIsLoadingAdminStats(false);
 return;
 }

 setAdminStats(result.data);
 setIsLoadingAdminStats(false);
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 setAdminStatsError(message);
 setIsLoadingAdminStats(false);
 }
 }

 async function callAdminAction(
 action: string,
 payload: Record<string, unknown> = {}
 ) {
 if (!currentUser) {
 return {
 ok: false,
 error: "当前用户不存在。",
 } as AdminActionResponse;
 }

 try {
 const response = await fetch("/api/private-chat/admin-action", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 action,
 actorId: currentUser.id,
 actorName: currentUser.name,
 ...payload,
 }),
 });

 const responseText = await response.text();

 let result: AdminActionResponse | null = null;

 try {
 result = JSON.parse(responseText) as AdminActionResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `管理员操作失败，状态码：${response.status}`,
 } as AdminActionResponse;
 }

 return {
 ok: true,
 message: result.message || "操作成功。",
 } as AdminActionResponse;
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 } as AdminActionResponse;
 }
 }

 useEffect(() => {
 const user = getCurrentPrivateChatUser();
 const authSession = getCurrentPrivateChatAuthSession();

 setCurrentUser(user);
 setNameDraft(user.name);
 setPrivateChatAuthSession(authSession.isGuest ? null : authSession);
 }, []);

 useEffect(() => {
 if (!currentUser) return;

 const path =
 typeof window !== "undefined"
 ? window.location.pathname + window.location.search
 : "/private-chat";

 reportPrivateChatSiteVisit({
 action: "visit",
 path,
 pageTitle: "公共聊天室",
 currentUser,
 authSession: privateChatAuthSession,
 });

 const heartbeatTimer = window.setInterval(() => {
 reportPrivateChatSiteVisit({
 action: "heartbeat",
 path,
 pageTitle: "公共聊天室",
 currentUser,
 authSession: privateChatAuthSession,
 });
 }, 30000);

 const handleVisibilityChange = () => {
 if (document.visibilityState === "visible") {
 reportPrivateChatSiteVisit({
 action: "heartbeat",
 path,
 pageTitle: "公共聊天室",
 currentUser,
 authSession: privateChatAuthSession,
 });
 }
 };

 const handleBeforeUnload = () => {
 reportPrivateChatSiteVisit({
 action: "leave",
 path,
 pageTitle: "公共聊天室",
 currentUser,
 authSession: privateChatAuthSession,
 });
 };

 document.addEventListener("visibilitychange", handleVisibilityChange);
 window.addEventListener("beforeunload", handleBeforeUnload);

 return () => {
 window.clearInterval(heartbeatTimer);
 document.removeEventListener("visibilitychange", handleVisibilityChange);
 window.removeEventListener("beforeunload", handleBeforeUnload);

 reportPrivateChatSiteVisit({
 action: "leave",
 path,
 pageTitle: "公共聊天室",
 currentUser,
 authSession: privateChatAuthSession,
 });
 };
 }, [currentUser?.id, privateChatAuthSession?.account?.accountId]);


 useEffect(() => {
 if (!currentUser) return;

 const activeUser = currentUser;
 let mounted = true;

 async function loadMessages() {
 setIsLoading(true);
 setErrorText("");

 const timeoutPromise = new Promise<{
 data: null;
 error: { message: string };
 timedOut: true;
 }>((resolve) => {
 window.setTimeout(() => {
 resolve({
 data: null,
 error: { message: "Public chat loading timeout" },
 timedOut: true,
 });
 }, PUBLIC_CHAT_LOAD_TIMEOUT_MS);
 });

 const queryPromise = privateChatSupabase
 .from("public_chat_messages")
 .select("*")
 .eq("room_id", "public-lobby")
 .order("created_at", { ascending: false })
 .limit(200)
 .then((result) => ({
 ...result,
 timedOut: false as const,
 }));

 try {
 const result = await Promise.race([queryPromise, timeoutPromise]);

 if (!mounted) return;

 if (result.timedOut) {
 console.warn("Load public messages timeout");
 setErrorText(
 "公共聊天室连接较慢，可以刷新页面重试，或直接点击私密入口进入房间。"
 );
 setIsLoading(false);
 return;
 }

 if (result.error) {
 console.error("Load public messages error:", result.error);
 setErrorText("公共聊天室消息加载失败，请检查 Supabase 表和 RLS 权限。");
 setIsLoading(false);
 return;
 }

 const orderedMessages = (result.data ||
 []) .reverse() as PublicChatMessageRow[];

 setMessages(orderedMessages);
 setIsLoading(false);
 } catch (error) {
 if (!mounted) return;

 console.error("Load public messages exception:", error);
 setErrorText("公共聊天室连接异常，可以刷新页面重试，或直接进入私密房间。");
 setIsLoading(false);
 }
 }

 async function loadPrivateNotices() {
 try {
 const { data, error } = await privateChatSupabase
 .from("private_chat_messages")
 .select("*")
 .eq("receiver_id", activeUser.id)
 .order("created_at", { ascending: false })
 .limit(50);

 if (!mounted) return;

 if (error) {
 console.error("Load private notices error:", error);
 return;
 }

 const notices = buildNoticesFromPrivateMessages(
 (data || []) as PrivateChatMessageRow[],
 activeUser.id
 );

 setPrivateNotices(notices);
 } catch (error) {
 console.error("Load private notices exception:", error);
 }
 }

 async function loadAdminData() {
 await refreshAdminData();
 }

 async function loadUserRelationData() {
 await Promise.all([loadBlockedUsers(), loadFriends(), loadRoomFavorites()]);
 }

 loadMessages();
 loadPrivateNotices();
 loadAdminData();
 loadUserRelationData();

 const publicChannel = privateChatSupabase
 .channel("public-chat-lobby-room", {
 config: {
 presence: {
 key: activeUser.id,
 },
 },
 })
 .on(
 "postgres_changes",
 {
 event: "INSERT",
 schema: "public",
 table: "public_chat_messages",
 filter: "room_id=eq.public-lobby",
 },
 (payload) => {
 const newMessage = payload.new as PublicChatMessageRow;

 setMessages((oldMessages) => {
 const exists = oldMessages.some(
 (message) => message.id === newMessage.id
 );

 if (exists) return oldMessages;

 return [...oldMessages, newMessage].slice(-200);
 });

 setIsLoading(false);
 }
 )
 .on(
 "postgres_changes",
 {
 event: "DELETE",
 schema: "public",
 table: "public_chat_messages",
 filter: "room_id=eq.public-lobby",
 },
 (payload) => {
 const deletedMessage = payload.old as { id?: string };

 if (!deletedMessage.id) return;

 setMessages((oldMessages) =>
 oldMessages.filter((message) => message.id !== deletedMessage.id)
 );
 }
 )
 .on("presence", { event: "sync" }, () => {
 const presenceState = publicChannel.presenceState();

 const users = Object.values(presenceState)
 .flat()
 .map((presence) => {
 const item = presence as {
 id?: string;
 name?: string;
 avatar?: string;
 online_at?: string;
 };

 return {
 id: item.id || "",
 name: item.name || "游客",
 avatar: item.avatar || "🌙",
 online_at: item.online_at,
 };
 })
 .filter((user) => Boolean(user.id));

 setOnlineUsers(dedupeOnlineUsers(users));
 })
 .subscribe(async (status) => {
 console.log("Public chat channel status:", status);

 if (status === "SUBSCRIBED") {
 await publicChannel.track({
 id: activeUser.id,
 name: activeUser.name,
 avatar: activeUser.avatar,
 online_at: new Date().toISOString(),
 });
 }
 });

 const privateNoticeChannel = privateChatSupabase
 .channel(`private-notice-${activeUser.id}`)
 .on(
 "postgres_changes",
 {
 event: "INSERT",
 schema: "public",
 table: "private_chat_messages",
 filter: `receiver_id=eq.${activeUser.id}`,
 },
 (payload) => {
 const newMessage = payload.new as PrivateChatMessageRow;

 if (newMessage.sender_id === activeUser.id) return;

 const readMap = getPrivateNoticeReadMap();
 const readAt = readMap[newMessage.sender_id];

 if (
 readAt &&
 new Date(newMessage.created_at).getTime() <=
 new Date(readAt).getTime()
 ) {
 return;
 }

 setPrivateNotices((oldNotices) => {
 const oldNotice = oldNotices.find(
 (notice) => notice.senderId === newMessage.sender_id
 );

 const nextNotice: PrivateChatNotice = {
 senderId: newMessage.sender_id,
 senderName: newMessage.sender_name,
 senderAvatar: newMessage.sender_avatar,
 lastContent: newMessage.content,
 lastCreatedAt: newMessage.created_at,
 unreadCount: oldNotice ? oldNotice.unreadCount + 1 : 1,
 };

 const others = oldNotices.filter(
 (notice) => notice.senderId !== newMessage.sender_id
 );

 return [nextNotice, ...others].sort(
 (a, b) =>
 new Date(b.lastCreatedAt).getTime() -
 new Date(a.lastCreatedAt).getTime()
 );
 });
 }
 )
 .subscribe((status) => {
 console.log("Private notice channel status:", status);
 });

 const adminDataChannel = privateChatSupabase
 .channel("private-chat-admin-data")
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "private_chat_admins",
 },
 () => {
 refreshAdminData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "private_chat_bans",
 },
 () => {
 refreshAdminData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "private_chat_announcements",
 },
 () => {
 refreshAdminData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "private_chat_settings",
 },
 () => {
 refreshAdminData();
 }
 )
 .subscribe((status) => {
 console.log("Admin data channel status:", status);
 });

 return () => {
 mounted = false;
 privateChatSupabase.removeChannel(publicChannel);
 privateChatSupabase.removeChannel(privateNoticeChannel);
 privateChatSupabase.removeChannel(adminDataChannel);
 };
 }, [currentUser]);

 useEffect(() => {
 listRef.current?.scrollTo({
 top: listRef.current.scrollHeight,
 behavior: "smooth",
 });
 }, [messages.length]);

 useEffect(() => {
 if (!currentUser) return;

 let mounted = true;

 async function syncModerationState() {
 if (!mounted) return;
 await refreshCurrentModerationState();
 }

 syncModerationState();

 const timer = window.setInterval(() => {
 syncModerationState();
 }, 3000);

 const handleVisibilityChange = () => {
 if (document.visibilityState === "visible") {
 syncModerationState();
 }
 };

 const handleFocus = () => {
 syncModerationState();
 };

 document.addEventListener("visibilitychange", handleVisibilityChange);
 window.addEventListener("focus", handleFocus);

 return () => {
 mounted = false;
 window.clearInterval(timer);
 document.removeEventListener("visibilitychange", handleVisibilityChange);
 window.removeEventListener("focus", handleFocus);
 };
 }, [currentUser]);

 useEffect(() => {
 if (!currentUser || !isOwner) {
 setAdminStats(null);
 setAdminStatsError("");
 return;
 }

 loadAdminStats();

 const timer = window.setInterval(() => {
 loadAdminStats();
 }, 30000);

 return () => {
 window.clearInterval(timer);
 };
 }, [currentUser?.id, isOwner]);

 async function refreshAdminData() {
 try {
 const [
 adminResult,
 banResult,
 announcementResult,
 pauseSettingResult,
 cooldownSettingResult,
 ] = await Promise.all([
 privateChatSupabase
 .from("private_chat_admins")
 .select("*")
 .order("created_at", { ascending: true }),
 privateChatSupabase
 .from("private_chat_bans")
 .select("*")
 .eq("is_active", true)
 .order("created_at", { ascending: false }),
 privateChatSupabase
 .from("private_chat_announcements")
 .select("*")
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(1),
 privateChatSupabase
 .from("private_chat_settings")
 .select("*")
 .eq("key", "public_chat_paused")
 .maybeSingle(),
 privateChatSupabase
 .from("private_chat_settings")
 .select("*")
 .eq("key", "public_chat_cooldown_seconds")
 .maybeSingle(),
 ]);

 if (!adminResult.error) {
 setAdmins((adminResult.data || []) as AdminRow[]);
 } else {
 console.error("Load admins error:", adminResult.error);
 }

 if (!banResult.error) {
 setBans((banResult.data || []) as BanRow[]);
 } else {
 console.error("Load bans error:", banResult.error);
 }

 if (!announcementResult.error) {
 const list = (announcementResult.data || []) as AnnouncementRow[];
 setActiveAnnouncement(list[0] || null);
 setAnnouncementDraft(list[0]?.content || "");
 } else {
 console.error("Load announcement error:", announcementResult.error);
 }

 if (!pauseSettingResult.error && pauseSettingResult.data) {
 const value = String(pauseSettingResult.data.value || "false");
 setPublicChatPaused(value === "true");
 } else if (pauseSettingResult.error) {
 console.error(
 "Load public chat paused setting error:",
 pauseSettingResult.error
 );
 }

 if (!cooldownSettingResult.error && cooldownSettingResult.data) {
 const rawValue = String(cooldownSettingResult.data.value || "0");
 const parsedValue = Number.parseInt(rawValue, 10);

 const safeValue = Number.isFinite(parsedValue)
 ? Math.max(0, Math.min(3600, parsedValue))
 : 0;

 setPublicChatCooldownSeconds(safeValue);
 setCooldownDraft(String(safeValue));
 } else if (cooldownSettingResult.error) {
 console.error(
 "Load public chat cooldown setting error:",
 cooldownSettingResult.error
 );
 }
 } catch (error) {
 console.error("Refresh admin data exception:", error);
 }
 }

 async function refreshCurrentModerationState() {
 if (!currentUser) {
 return {
 isCurrentUserBanned: false,
 isPublicChatPausedNow: publicChatPaused,
 cooldownSecondsNow: publicChatCooldownSeconds,
 };
 }

 try {
 const [banResult, pauseSettingResult, cooldownSettingResult] =
 await Promise.all([
 privateChatSupabase
 .from("private_chat_bans")
 .select("*")
 .eq("user_id", currentUser.id)
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(1),
 privateChatSupabase
 .from("private_chat_settings")
 .select("*")
 .eq("key", "public_chat_paused")
 .maybeSingle(),
 privateChatSupabase
 .from("private_chat_settings")
 .select("*")
 .eq("key", "public_chat_cooldown_seconds")
 .maybeSingle(),
 ]);

 const activeBan = !banResult.error
 ? ((banResult.data || []) as BanRow[])[0] || null
 : null;

 const isCurrentUserBanned = Boolean(activeBan);

 setBans((oldBans) => {
 const otherBans = oldBans.filter(
 (ban) => ban.user_id !== currentUser.id
 );

 if (!activeBan) {
 return otherBans;
 }

 return [activeBan, ...otherBans];
 });

 let isPublicChatPausedNow = publicChatPaused;

 if (!pauseSettingResult.error && pauseSettingResult.data) {
 const value = String(pauseSettingResult.data.value || "false");
 isPublicChatPausedNow = value === "true";
 setPublicChatPaused(isPublicChatPausedNow);
 }

 let cooldownSecondsNow = publicChatCooldownSeconds;

 if (!cooldownSettingResult.error && cooldownSettingResult.data) {
 const rawValue = String(cooldownSettingResult.data.value || "0");
 const parsedValue = Number.parseInt(rawValue, 10);

 cooldownSecondsNow = Number.isFinite(parsedValue)
 ? Math.max(0, Math.min(3600, parsedValue))
 : 0;

 setPublicChatCooldownSeconds(cooldownSecondsNow);
 setCooldownDraft(String(cooldownSecondsNow));
 }

 return {
 isCurrentUserBanned,
 isPublicChatPausedNow,
 cooldownSecondsNow,
 };
 } catch (error) {
 console.error("Refresh current moderation state exception:", error);

 return {
 isCurrentUserBanned: isBanned,
 isPublicChatPausedNow: publicChatPaused,
 cooldownSecondsNow: publicChatCooldownSeconds,
 };
 }
 }

 async function handleSendMessage() {
 const content = draft.trim();

 if (!content || !currentUser || isSending) return;

 setIsSending(true);
 setErrorText("");

 const moderationState = await refreshCurrentModerationState();

 if (moderationState.isCurrentUserBanned) {
 setErrorText("你已被管理员限制发言。");
 setIsSending(false);
 return;
 }

 if (moderationState.isPublicChatPausedNow && !isAdmin) {
 setErrorText("公共聊天室当前已暂停发言，请稍后再试。");
 setIsSending(false);
 return;
 }

 try {
 const response = await fetch("/api/private-chat/send-message", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 scope: "public",
 senderId: currentUser.id,
 senderName: currentUser.name,
 senderAvatar: currentUser.avatar,
 content: content.slice(0, 500),
 }),
 });

 const responseText = await response.text();

 let result: SendMessageResponse | null = null;

 try {
 result = JSON.parse(responseText) as SendMessageResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 setErrorText(
 result?.error ||
 result?.message ||
 `消息发送失败，状态码：${response.status}`
 );
 setIsSending(false);
 return;
 }

 if (result.data) {
 setMessages((oldMessages) => {
 const exists = oldMessages.some(
 (message) => message.id === result.data?.id
 );

 if (exists) return oldMessages;

 return [...oldMessages, result.data as PublicChatMessageRow].slice(
 -200
 );
 });
 }

 setDraft("");
 setIsLoading(false);
 } catch (error) {
 console.error("Send public message API exception:", error);
 setErrorText("消息发送失败，请检查网络或发送 API。");
 } finally {
 setIsSending(false);
 }
 }

 function handleSaveName() {
 const updatedUser = updateCurrentPrivateChatName(nameDraft);
 setCurrentUser(updatedUser);
 setNameDraft(updatedUser.name);
 setIsEditingName(false);

 setOnlineUsers((oldUsers) =>
 oldUsers.map((user) =>
 user.id === updatedUser.id
 ? {
 ...user,
 name: updatedUser.name,
 avatar: updatedUser.avatar,
 }
 : user
 )
 );
 }

 function handleChangeAvatar(avatar: string) {
 const updatedUser = updateCurrentPrivateChatAvatar(avatar);
 setCurrentUser(updatedUser);
 setAvatarPanelOpen(false);

 setOnlineUsers((oldUsers) =>
 oldUsers.map((user) =>
 user.id === updatedUser.id
 ? {
 ...user,
 name: updatedUser.name,
 avatar: updatedUser.avatar,
 }
 : user
 )
 );
 }

 function handleLoginSessionChanged(session: PrivateChatAuthSession | null) {
 const updatedUser = getCurrentPrivateChatUser();

 setPrivateChatAuthSession(session && !session.isGuest ? session : null);
 setCurrentUser(updatedUser);
 setNameDraft(updatedUser.name);
 setAvatarPanelOpen(false);
 setIsEditingName(false);
 setErrorText("");

 if (session && !session.isGuest) {
 setAdminStatusText("账号登录已同步，当前聊天身份已切换为正式账号。");
 } else {
 setAdminStats(null);
 setAdminStatsError("");
 setAdminStatusText("已退出正式账号，当前继续使用游客身份。");
 }
 }

 function handleClearLocalView() {
 setMessages([]);
 setIsLoading(false);
 }

 function handleClearPrivateNotice(senderId: string) {
 markPrivateNoticeAsRead(senderId);

 setPrivateNotices((oldNotices) =>
 oldNotices.filter((notice) => notice.senderId !== senderId)
 );
 }

 function handleOpenPrivateNotice(notice: PrivateChatNotice) {
 handleClearPrivateNotice(notice.senderId);
 setMobileInfoOpen(false);
 router.push(buildPrivateNoticeHref(notice));
 }

 function handleOpenSecretDialog() {
 setSecretDialogOpen(true);
 setSecretCodeDraft("");
 setSecretError("");
 setMobileInfoOpen(false);
 }

 function handleCloseSecretDialog() {
 setSecretDialogOpen(false);
 setSecretCodeDraft("");
 setSecretError("");
 }

 async function handleEnterSecretRoom() {
 const cleanedCode = secretCodeDraft.trim();

 if (!cleanedCode) {
 setSecretError("请输入你们约定好的暗语或密码。");
 return;
 }

 if (cleanedCode.length < 2) {
 setSecretError("暗语至少需要 2 个字符。");
 return;
 }

 if (currentUser) {
 try {
 const response = await fetch("/api/private-chat/admin-login", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 userId: currentUser.id,
 userName: currentUser.name,
 secret: cleanedCode,
 }),
 });

 const responseText = await response.text();

 let result: AdminLoginResponse | null = null;

 try {
 result = JSON.parse(responseText) as AdminLoginResponse;
 } catch {
 result = null;
 }

 if (response.ok && result?.ok) {
 setSecretDialogOpen(false);
 setSecretCodeDraft("");
 setSecretError("");
 setMobileInfoOpen(false);
 setAdminPanelOpen(true);
 setAdminStatusText("管理员授权成功。");

 await refreshAdminData();
 await loadAdminStats();

 return;
 }
 } catch (error) {
 console.error("Admin secret check exception:", error);
 }
 }

 router.push(buildSecretRoomHref(cleanedCode));
 }

 function handleSecretCodeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
 if (event.key === "Enter") {
 event.preventDefault();
 handleEnterSecretRoom();
 }

 if (event.key === "Escape") {
 event.preventDefault();
 handleCloseSecretDialog();
 }
 }

 function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
 if (event.key === "Enter" && !event.shiftKey) {
 event.preventDefault();
 handleSendMessage();
 }
 }

 async function handleDeletePublicMessage(messageId: string) {
 if (!isAdmin || isDeletingMessageId) return;

 setIsDeletingMessageId(messageId);
 setErrorText("");

 const result = await callAdminAction("delete_public_message", {
 messageId,
 });

 if (!result.ok) {
 setErrorText(result.error || "删除公共消息失败。");
 setIsDeletingMessageId(null);
 return;
 }

 setMessages((oldMessages) =>
 oldMessages.filter((message) => message.id !== messageId)
 );

 setIsDeletingMessageId(null);

 if (isOwner) {
 loadAdminStats();
 }
 }

 async function handleBanUser(userId: string, userName: string) {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 if (userId === currentUser.id) {
 setAdminStatusText("不能禁言自己。");
 return;
 }

 if (!canBanTargetUser(userId)) {
 setAdminStatusText(
 isUserAdmin(userId)
 ? "普通管理员不能禁言 owner 或其他管理员。"
 : "当前无权禁言该用户。"
 );
 return;
 }

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("ban_user", {
 targetUserId: userId,
 targetUserName: userName,
 reason: "管理员限制发言",
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "禁言失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAdminStatusText(`已禁言：${userName}`);
 await refreshAdminData();

 if (isOwner) {
 await loadAdminStats();
 }

 setIsAdminActionLoading(false);
 }

 async function handleUnbanUser(userId: string, userName: string) {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 const targetRole = getUserAdminRole(userId);

 if (!isOwner && targetRole) {
 setAdminStatusText("普通管理员不能操作 owner 或其他管理员的禁言状态。");
 return;
 }

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("lift_ban", {
 targetUserId: userId,
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "解除禁言失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAdminStatusText(`已解除禁言：${userName}`);
 await refreshAdminData();

 if (isOwner) {
 await loadAdminStats();
 }

 setIsAdminActionLoading(false);
 }

 async function handlePublishAnnouncement() {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 const content = announcementDraft.trim();

 if (!content) {
 setAdminStatusText("公告内容不能为空。");
 return;
 }

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("publish_announcement", {
 content: content.slice(0, 300),
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "发布公告失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAdminStatusText("公告已发布。");
 await refreshAdminData();

 if (isOwner) {
 await loadAdminStats();
 }

 setIsAdminActionLoading(false);
 }

 async function handleClearAnnouncement() {
 if (!isAdmin || isAdminActionLoading) return;

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("clear_announcement");

 if (!result.ok) {
 setAdminStatusText(result.error || "清除公告失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAnnouncementDraft("");
 setActiveAnnouncement(null);
 setAdminStatusText("公告已清除。");
 await refreshAdminData();

 if (isOwner) {
 await loadAdminStats();
 }

 setIsAdminActionLoading(false);
 }

 async function handleTogglePublicChatPaused(nextPaused: boolean) {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("set_public_chat_paused", {
 paused: nextPaused,
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "更新聊天室状态失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setPublicChatPaused(nextPaused);
 setAdminStatusText(nextPaused ? "公共聊天室已暂停。" : "公共聊天室已恢复。");
 await refreshAdminData();
 setIsAdminActionLoading(false);
 }

 async function handleSaveCooldownSeconds() {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 const parsedValue = Number.parseInt(cooldownDraft, 10);

 const safeValue = Number.isFinite(parsedValue)
 ? Math.max(0, Math.min(3600, parsedValue))
 : 0;

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("set_public_chat_cooldown", {
 seconds: safeValue,
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "保存发言间隔失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setPublicChatCooldownSeconds(safeValue);
 setCooldownDraft(String(safeValue));
 setAdminStatusText(
 safeValue === 0
 ? "已关闭发言间隔限制。"
 : `已设置发言间隔：${safeValue} 秒。`
 );

 await refreshAdminData();
 setIsAdminActionLoading(false);
 }

 async function handleClearPublicMessages() {
 if (!isAdmin || isAdminActionLoading) return;

 const confirmed = window.confirm("确定要清空公共大厅全部消息吗？");

 if (!confirmed) return;

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("clear_public_messages", {
 roomId: "public-lobby",
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "清空公共消息失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setMessages([]);
 setAdminStatusText("公共大厅消息已清空。");

 if (isOwner) {
 await loadAdminStats();
 }

 setIsAdminActionLoading(false);
 }

 async function handleAppointAdmin() {
 if (!isOwner || !currentUser || isAdminActionLoading) return;

 const userId = appointAdminIdDraft.trim();
 const userName = appointAdminNameDraft.trim() || "管理员";

 if (!userId) {
 setAdminStatusText("请输入要任命的用户 ID。");
 return;
 }

 if (getUserAdminRole(userId) === "owner") {
 setAdminStatusText("该用户已经是 owner。");
 return;
 }

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("grant_admin", {
 targetUserId: userId,
 targetUserName: userName,
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "任命管理员失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAppointAdminIdDraft("");
 setAppointAdminNameDraft("");
 setAdminStatusText(`已任命普通管理员：${userName}`);
 await refreshAdminData();
 await loadAdminStats();
 setIsAdminActionLoading(false);
 }

 async function handleRemoveAdmin(admin: AdminRow) {
 if (!isOwner || !currentUser || isAdminActionLoading) return;

 if (admin.user_id === currentUser.id) {
 setAdminStatusText("不能在这里移除自己，请使用“退出管理员模式”。");
 return;
 }

 if (admin.role === "owner") {
 setAdminStatusText("不能移除 owner。");
 return;
 }

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("remove_admin", {
 targetUserId: admin.user_id,
 });

 if (!result.ok) {
 setAdminStatusText(result.error || "移除管理员失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAdminStatusText(`已移除管理员：${admin.user_name}`);
 await refreshAdminData();
 await loadAdminStats();
 setIsAdminActionLoading(false);
 }

 async function handleExitAdminMode() {
 if (!isAdmin || !currentUser || isAdminActionLoading) return;

 const confirmed = window.confirm(
 "确定要退出管理员模式吗？退出后你会变回普通用户，需要重新输入管理员暗语才能再次进入。"
 );

 if (!confirmed) return;

 setIsAdminActionLoading(true);
 setAdminStatusText("");

 const result = await callAdminAction("exit_admin_mode");

 if (!result.ok) {
 setAdminStatusText(result.error || "退出管理员模式失败。");
 setIsAdminActionLoading(false);
 return;
 }

 setAdmins((oldAdmins) =>
 oldAdmins.filter((admin) => admin.user_id !== currentUser.id)
 );

 setAdminStats(null);
 setAdminPanelOpen(false);
 setAdminStatusText("");
 setIsAdminActionLoading(false);

 await refreshAdminData();
 }

 const totalPrivateUnread = privateNotices.reduce(
 (total, notice) => total + notice.unreadCount,
 0
 );

 const trafficStats = adminStats?.traffic;
 const dailyTrafficSeries = trafficStats?.dailySeries || [];
 const hourlyTrafficSeries = trafficStats?.hourlySeries || [];
 const sourceTrafficStats = trafficStats?.sourceStats || trafficStats?.topSources || [];
 const pathTrafficStats = trafficStats?.pathStats || trafficStats?.topPaths || [];
 const maxDailyPv = Math.max(
 1,
 ...dailyTrafficSeries.map((item) => getTrafficPointPv(item))
 );
 const maxHourlyPv = Math.max(
 1,
 ...hourlyTrafficSeries.map((item) => getTrafficPointPv(item))
 );
 const storageUsageStatus = getUsageStatus(
 adminStats?.storage.usagePercent || 0
 );

 const adminStatsPanel = isOwner ? (
 <div className="rounded-2xl bg-black/10 p-3">
 <div className="mb-3 flex items-center justify-between gap-2">
 <div>
 <h4 className="text-xs font-semibold text-amber-50">
 Owner 平台监控
 </h4>
 <p className="mt-1 text-[11px] leading-5 text-amber-100/60">
 访问人数、在线状态、消息量、媒体空间和月流量统计
 </p>
 </div>

 <button
 type="button"
 onClick={loadAdminStats}
 disabled={isLoadingAdminStats}
 className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isLoadingAdminStats ? "刷新中" : "刷新"}
 </button>
 </div>

 {adminStatsError ? (
 <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-100">
 {adminStatsError}
 </div>
 ) : !adminStats ? (
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-slate-400">
 {isLoadingAdminStats ? "正在加载平台统计..." : "暂无平台统计数据。"}
 </div>
 ) : (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-2">
 <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
 <p className="text-[11px] text-emerald-100/70">当前在线</p>
 <p className="mt-1 text-xl font-semibold text-emerald-50">
 {formatStatNumber(trafficStats?.onlineNow)}
 </p>
 <p className="mt-1 text-[10px] text-emerald-100/60">
 5 分钟活跃 {formatStatNumber(trafficStats?.activeIn5Minutes)}
 </p>
 </div>

 <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
 <p className="text-[11px] text-cyan-100/70">今日访问</p>
 <p className="mt-1 text-xl font-semibold text-cyan-50">
 {formatStatNumber(trafficStats?.todayPv)}
 </p>
 <p className="mt-1 text-[10px] text-cyan-100/60">
 UV {formatStatNumber(trafficStats?.todayUv)} · 会话 {formatStatNumber(trafficStats?.todaySessions)}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="text-[11px] text-slate-400">本周 PV</p>
 <p className="mt-1 text-lg font-semibold text-white">
 {formatStatNumber(trafficStats?.weekPv)}
 </p>
 <p className="mt-1 text-[10px] text-slate-500">
 UV {formatStatNumber(trafficStats?.weekUv)} · 会话 {formatStatNumber(trafficStats?.weekSessions)}
 </p>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="text-[11px] text-slate-400">本月 PV</p>
 <p className="mt-1 text-lg font-semibold text-white">
 {formatStatNumber(trafficStats?.monthPv)}
 </p>
 <p className="mt-1 text-[10px] text-slate-500">
 UV {formatStatNumber(trafficStats?.monthUv)} · 会话 {formatStatNumber(trafficStats?.monthSessions)}
 </p>
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-semibold text-white">最近 7 天访问曲线</p>
 <span className="text-[10px] text-slate-500">PV / UV</span>
 </div>

 {dailyTrafficSeries.length === 0 ? (
 <p className="text-[11px] text-slate-500">暂无最近 7 天访问数据。</p>
 ) : (
 <div className="space-y-2">
 {dailyTrafficSeries.map((item, index) => {
 const pv = getTrafficPointPv(item);
 const uv = getTrafficPointUv(item);
 const percent = Math.max(4, Math.min(100, (pv / maxDailyPv) * 100));

 return (
 <div key={(item.label || item.date || String(index)) + "-daily"}>
 <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-400">
 <span>{item.label || item.date || "日期"}</span>
 <span>PV {formatStatNumber(pv)} · UV {formatStatNumber(uv)}</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-white/10">
 <div
 className="h-full rounded-full bg-cyan-300"
 style={{ width: percent + "%" }}
 />
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-semibold text-white">最近 24 小时访问</p>
 <span className="text-[10px] text-slate-500">按小时</span>
 </div>

 {hourlyTrafficSeries.length === 0 ? (
 <p className="text-[11px] text-slate-500">暂无最近 24 小时访问数据。</p>
 ) : (
 <div className="flex h-24 items-end gap-1">
 {hourlyTrafficSeries.slice(-24).map((item, index) => {
 const pv = getTrafficPointPv(item);
 const percent = Math.max(4, Math.min(100, (pv / maxHourlyPv) * 100));

 return (
 <div
 key={(item.label || item.hour || String(index)) + "-hourly"}
 className="flex min-w-0 flex-1 flex-col items-center gap-1"
 title={(item.label || item.hour || "小时") + " · PV " + pv}
 >
 <div className="flex w-full items-end rounded-full bg-white/10" style={{ height: "72px" }}>
 <div
 className="w-full rounded-full bg-fuchsia-300"
 style={{ height: percent + "%" }}
 />
 </div>
 <span className="max-w-full truncate text-[9px] text-slate-500">
 {item.label || item.hour || index}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </div>

 <div className={"rounded-2xl border p-3 " + storageUsageStatus.bgClass}>
 <div className="mb-2 flex items-center justify-between gap-2">
 <p className="text-xs font-semibold text-white">媒体存储 / 流量</p>
 <span className={"rounded-full bg-black/10 px-2 py-1 text-[10px] " + storageUsageStatus.textClass}>
 {storageUsageStatus.label}
 </span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-white/10">
 <div
 className={"h-full rounded-full " + storageUsageStatus.barClass}
 style={{ width: Math.max(2, adminStats.storage.usagePercent) + "%" }}
 />
 </div>
 <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
 <span>当前占用：{formatBytes(adminStats.storage.usedBytes)}</span>
 <span>空间上限：{formatBytes(adminStats.storage.limitBytes)}</span>
 <span>本月流量：{formatBytes(adminStats.storage.monthlyUploadBytes)}</span>
 <span>月流量上限：{formatBytes(adminStats.storage.monthlyTrafficLimitBytes)}</span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="text-[11px] text-slate-400">今日消息</p>
 <p className="mt-1 text-lg font-semibold text-white">
 {formatStatNumber(adminStats.messages.todayTotalMessageCount)}
 </p>
 <p className="mt-1 text-[10px] text-slate-500">
 公共 {formatStatNumber(adminStats.messages.todayPublicMessageCount)} · 私密 {formatStatNumber(adminStats.messages.todayPrivateMessageCount)}
 </p>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="text-[11px] text-slate-400">累计消息</p>
 <p className="mt-1 text-lg font-semibold text-white">
 {formatStatNumber(adminStats.messages.totalMessageCount)}
 </p>
 <p className="mt-1 text-[10px] text-slate-500">
 媒体 {formatStatNumber(adminStats.media.mediaMessageCount)} 条
 </p>
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="mb-2 text-xs font-semibold text-white">访问来源</p>
 {sourceTrafficStats.length === 0 ? (
 <p className="text-[11px] text-slate-500">暂无来源数据。</p>
 ) : (
 <div className="space-y-1">
 {sourceTrafficStats.slice(0, 5).map((item, index) => (
 <div
 key={getTrafficItemLabel(item) + index}
 className="flex items-center justify-between gap-2 text-[11px] text-slate-300"
 >
 <span className="truncate">{getTrafficItemLabel(item)}</span>
 <span className="shrink-0 text-slate-500">{formatStatNumber(getTrafficItemCount(item))}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <p className="mb-2 text-xs font-semibold text-white">热门路径</p>
 {pathTrafficStats.length === 0 ? (
 <p className="text-[11px] text-slate-500">暂无路径数据。</p>
 ) : (
 <div className="space-y-1">
 {pathTrafficStats.slice(0, 5).map((item, index) => (
 <div
 key={getTrafficItemLabel(item) + index}
 className="flex items-center justify-between gap-2 text-[11px] text-slate-300"
 >
 <span className="truncate">{getTrafficItemLabel(item)}</span>
 <span className="shrink-0 text-slate-500">{formatStatNumber(getTrafficItemCount(item))}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 ) : null;

 const adminPanel = (
 <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4">
 <button
 type="button"
 onClick={() => setAdminPanelOpen((value) => !value)}
 className="flex w-full items-center justify-between text-left"
 >
 <span>
 <span className="block text-sm font-semibold text-amber-50">
 {isOwner ? "总管理员面板" : "管理员面板"}
 </span>
 <span className="mt-1 block text-xs text-amber-100/70">
 删除消息、禁言、公告、暂停聊天室
 </span>
 </span>

 <span className="rounded-full bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
 {adminPanelOpen ? "收起" : "展开"}
 </span>
 </button>

 {adminPanelOpen ? (
 <div className="mt-4 space-y-4">
 {adminStatusText ? (
 <div className="rounded-2xl bg-black/15 px-3 py-2 text-xs leading-5 text-amber-50">
 {adminStatusText}
 </div>
 ) : null}

 <div className="rounded-2xl bg-black/10 p-3">
 <h4 className="mb-2 text-xs font-semibold text-amber-50">
 当前管理员身份
 </h4>

 <p className="mb-2 text-xs leading-5 text-amber-100/80">
 当前角色：{isOwner ? "owner 总管理员" : "admin 普通管理员"}
 </p>

 <p className="mb-3 break-all text-[11px] leading-5 text-amber-100/70">
 当前 ID：{currentUser?.id}
 </p>

 <button
 type="button"
 onClick={handleExitAdminMode}
 disabled={isAdminActionLoading}
 className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 退出管理员模式
 </button>

 <p className="mt-2 text-[11px] leading-5 text-slate-500">
 退出后会变回普通用户。需要再次输入管理员暗语，才能重新进入 owner 模式。
 </p>
 </div>

 {adminStatsPanel}

 <div className="rounded-2xl bg-black/10 p-3">
 <div className="mb-2 flex items-center justify-between">
 <h4 className="text-xs font-semibold text-amber-50">聊天室状态</h4>
 <span
 className={`rounded-full px-2 py-1 text-[11px] ${
 publicChatPaused
 ? "bg-rose-500/20 text-rose-100"
 : "bg-emerald-400/10 text-emerald-100"
 }`}
 >
 {publicChatPaused ? "已暂停" : "正常"}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => handleTogglePublicChatPaused(true)}
 disabled={isAdminActionLoading || publicChatPaused}
 className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 暂停发言
 </button>

 <button
 type="button"
 onClick={() => handleTogglePublicChatPaused(false)}
 disabled={isAdminActionLoading || !publicChatPaused}
 className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 恢复发言
 </button>
 </div>

 <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
 <div className="mb-2 flex items-center justify-between gap-2">
 <h4 className="text-xs font-semibold text-amber-50">
 全局发言间隔
 </h4>

 <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[11px] text-slate-300">
 当前 {publicChatCooldownSeconds} 秒
 </span>
 </div>

 <div className="flex items-center gap-2">
 <input
 value={cooldownDraft}
 onChange={(event) => setCooldownDraft(event.target.value)}
 type="number"
 min={0}
 max={3600}
 placeholder="0"
 className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-300/50"
 />

 <button
 type="button"
 onClick={handleSaveCooldownSeconds}
 disabled={isAdminActionLoading}
 className="rounded-2xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
 >
 保存
 </button>
 </div>

 <p className="mt-2 text-[11px] leading-5 text-slate-500">
 0 表示不限制。普通用户发言后，需要等待设定秒数才能再次发言；管理员不受限制。
 </p>
 </div>

 <button
 type="button"
 onClick={handleClearPublicMessages}
 disabled={isAdminActionLoading}
 className="mt-2 w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 清空公共大厅消息
 </button>
 </div>

 <div className="rounded-2xl bg-black/10 p-3">
 <h4 className="mb-2 text-xs font-semibold text-amber-50">公告</h4>

 <textarea
 value={announcementDraft}
 onChange={(event) => setAnnouncementDraft(event.target.value)}
 maxLength={300}
 rows={3}
 placeholder="输入公告内容..."
 className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs leading-5 text-white outline-none placeholder:text-slate-600 focus:border-amber-300/50"
 />

 <div className="mt-2 grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={handlePublishAnnouncement}
 disabled={isAdminActionLoading}
 className="rounded-2xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
 >
 发布公告
 </button>

 <button
 type="button"
 onClick={handleClearAnnouncement}
 disabled={isAdminActionLoading}
 className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 清除公告
 </button>
 </div>
 </div>

 {canManageAdmins() ? (
 <div className="rounded-2xl bg-black/10 p-3">
 <h4 className="mb-2 text-xs font-semibold text-amber-50">
 任命普通管理员
 </h4>

 <input
 value={appointAdminIdDraft}
 onChange={(event) => setAppointAdminIdDraft(event.target.value)}
 placeholder="输入用户 ID"
 className="mb-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-300/50"
 />

 <input
 value={appointAdminNameDraft}
 onChange={(event) =>
 setAppointAdminNameDraft(event.target.value)
 }
 placeholder="管理员名称，可选"
 className="mb-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-300/50"
 />

 <button
 type="button"
 onClick={handleAppointAdmin}
 disabled={isAdminActionLoading}
 className="w-full rounded-2xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
 >
 任命为普通管理员
 </button>
 </div>
 ) : null}

 <div className="rounded-2xl bg-black/10 p-3">
 <h4 className="mb-2 text-xs font-semibold text-amber-50">
 管理员列表
 </h4>

 <div className="space-y-2">
 {admins.length === 0 ? (
 <div className="rounded-2xl bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
 暂无管理员
 </div>
 ) : (
 admins.map((admin) => (
 <div
 key={admin.user_id}
 className="rounded-2xl bg-white/[0.03] px-3 py-2"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0">
 <p className="truncate text-xs font-medium text-white">
 {admin.user_name}
 {currentUser?.id === admin.user_id ? "（我）" : ""}
 </p>
 <p className="truncate text-[11px] text-slate-500">
 {admin.user_id}
 </p>
 </div>

 {isOwner ? (
 <button
 type="button"
 onClick={() => handleRemoveAdmin(admin)}
 disabled={
 isAdminActionLoading ||
 currentUser?.id === admin.user_id ||
 admin.role === "owner"
 }
 className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
 >
 移除
 </button>
 ) : (
 <span className="rounded-xl bg-white/[0.04] px-2 py-1 text-[11px] text-slate-500">
 {admin.role === "owner" ? "owner" : "admin"}
 </span>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="rounded-2xl bg-black/10 p-3">
 <h4 className="mb-2 text-xs font-semibold text-amber-50">
 当前禁言用户
 </h4>

 <div className="space-y-2">
 {bans.length === 0 ? (
 <div className="rounded-2xl bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
 暂无禁言用户
 </div>
 ) : (
 bans.map((ban) => (
 <div
 key={ban.id}
 className="rounded-2xl bg-white/[0.03] px-3 py-2"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0">
 <p className="truncate text-xs font-medium text-white">
 {ban.user_name}
 </p>
 <p className="truncate text-[11px] text-slate-500">
 {ban.user_id}
 </p>
 </div>

 <button
 type="button"
 onClick={() =>
 handleUnbanUser(ban.user_id, ban.user_name)
 }
 disabled={
 isAdminActionLoading ||
 (!isOwner && Boolean(getUserAdminRole(ban.user_id)))
 }
 className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
 >
 解除
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 ) : null}
 </div>
 );

 const lobbyPanel = (
 <>
 <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => setAvatarPanelOpen((value) => !value)}
 className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-3xl transition hover:bg-white/15"
 title="更换头像"
 >
 {currentUser?.avatar || "🌙"}
 </button>

 <div className="min-w-0 flex-1">
 <p className="text-xs text-slate-400">当前身份</p>

 {isEditingName ? (
 <div className="mt-1 flex gap-2">
 <input
 value={nameDraft}
 onChange={(event) => setNameDraft(event.target.value)}
 maxLength={18}
 className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-400/50"
 placeholder="输入昵称"
 />
 <button
 type="button"
 onClick={handleSaveName}
 className="rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-950"
 >
 保存
 </button>
 </div>
 ) : (
 <div className="mt-1 flex items-center gap-2">
 <h2 className="truncate text-base font-semibold text-white">
 {currentUser?.name || "游客"}
 </h2>
 <button
 type="button"
 onClick={() => setIsEditingName(true)}
 className="rounded-xl border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
 >
 修改
 </button>
 </div>
 )}

 {isAdmin ? (
 <div className="mt-2 inline-flex rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
 {isOwner ? "owner 总管理员" : "admin 管理员"}
 </div>
 ) : null}

 {isBanned ? (
 <div className="mt-2 inline-flex rounded-full bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
 已被限制发言
 </div>
 ) : null}
 </div>
 </div>

 {avatarPanelOpen ? (
 <div className="mt-4 grid grid-cols-6 gap-2">
 {QUICK_AVATARS.map((avatar) => (
 <button
 key={avatar}
 type="button"
 onClick={() => handleChangeAvatar(avatar)}
 className="flex h-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg transition hover:bg-white/10"
 >
 {avatar}
 </button>
 ))}
 </div>
 ) : null}

 <div className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
 当前公共大厅在线人数：{onlineUsers.length} 人
 </div>

 <Link
 href="/private-chat/account"
 className="mt-3 block w-full rounded-2xl bg-fuchsia-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-fuchsia-400"
 >
 进入统一账号中心
 </Link>

 <p className="mt-2 text-[11px] leading-5 text-slate-500">
 账号管理、钱包绑定、退出账号、好友/黑名单/收藏统计已统一移动到账号中心。这里仅保留快捷修改昵称和头像。
 </p>

 {publicChatPaused ? (
 <div className="mt-3 rounded-2xl bg-rose-500/10 p-3 text-xs leading-5 text-rose-100">
 公共聊天室已暂停发言，管理员仍可发言。
 </div>
 ) : null}

 {!isAdmin && publicChatCooldownSeconds > 0 ? (
 <div className="mt-3 rounded-2xl bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
 当前公共发言间隔：{publicChatCooldownSeconds} 秒。
 </div>
 ) : null}

 {blockStatusText ? (
 <div className="mt-3 rounded-2xl bg-slate-500/10 p-3 text-xs leading-5 text-slate-200">
 {blockStatusText}
 </div>
 ) : null}

 {friendStatusText ? (
 <div className="mt-3 rounded-2xl bg-fuchsia-500/10 p-3 text-xs leading-5 text-fuchsia-100">
 {friendStatusText}
 </div>
 ) : null}
 </div>

 {privateChatAuthSession && !privateChatAuthSession.isGuest ? null : (
 <div className="mt-4 space-y-3">
 <PrivateChatLoginPanel
 onSessionChanged={handleLoginSessionChanged}
 />
</div>
 )}

 {isAdmin ? adminPanel : null}

 {privateNotices.length > 0 ? (
 <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-rose-50">私聊提醒</h3>
 <span className="rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-100">
 {totalPrivateUnread} 条
 </span>
 </div>

 <div className="space-y-2">
 {privateNotices.map((notice) => (
 <button
 key={notice.senderId}
 type="button"
 onClick={() => handleOpenPrivateNotice(notice)}
 className="flex w-full items-center gap-3 rounded-2xl bg-black/10 px-3 py-2 text-left transition hover:bg-white/10"
 >
 <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
 {notice.senderAvatar}
 <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
 {notice.unreadCount}
 </span>
 </span>

 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-medium text-white">
 {notice.senderName}
 </span>
 <span className="block truncate text-xs text-rose-100/80">
 {notice.lastContent}
 </span>
 <span className="mt-0.5 block text-[11px] text-rose-100/50">
 {formatPrivateChatTime(notice.lastCreatedAt)}
 </span>
 </span>
 </button>
 ))}
 </div>
 </div>
 ) : null}

 <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-cyan-50">我的私密房间</h3>
 <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">
 {roomFavorites.length} 个
 </span>
 </div>

 {roomFavoriteStatusText ? (
 <div className="mb-3 rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-cyan-50">
 {roomFavoriteStatusText}
 </div>
 ) : null}

 <div className="space-y-2">
 {roomFavorites.length === 0 ? (
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-cyan-100/70">
 暂无收藏房间。进入暗语私密房间后，点击“收藏房间”即可保存到这里。
 </div>
 ) : (
 roomFavorites.map((room) => (
 <div
 key={room.room_id}
 className="rounded-2xl bg-black/10 px-3 py-2"
 >
 <button
 type="button"
 onClick={() => {
 setMobileInfoOpen(false);
 router.push(buildRoomFavoriteHref(room));
 }}
 className="flex w-full items-center gap-3 text-left transition hover:opacity-90"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
 {room.room_avatar || "🔐"}
 </span>

 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-medium text-white">
 {room.room_name || "暗语私密房间"}
 </span>
 <span className="block truncate text-xs text-cyan-100/70">
 点击直接进入 · {room.secret_code}
 </span>
 </span>
 </button>

 <button
 type="button"
 onClick={() =>
 handleRemoveRoomFavorite(
 room.room_id,
 room.room_name || "暗语私密房间"
 )
 }
 disabled={isRoomFavoriteActionLoading}
 className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-cyan-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isRoomFavoriteActionLoading ? "处理中" : "取消收藏"}
 </button>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-white">大厅成员</h3>
 <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
 在线 {onlineUsers.length}
 </span>
 </div>

 <div className="space-y-2">
 {onlineUsers.length === 0 ? (
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-500">
 正在同步在线成员...
 </div>
 ) : (
 onlineUsers.map((user) => {
 const isMe = currentUser?.id === user.id;
 const isUserBanned = bans.some(
 (ban) => ban.user_id === user.id && ban.is_active
 );
 const targetAdminRole = getUserAdminRole(user.id);
 const isTargetAdmin = Boolean(targetAdminRole);
 const canBanThisUser = canBanTargetUser(user.id);
 const isBlockedByMe = isUserBlockedByMe(user.id);
 const isFriendByMe = isUserFriendByMe(user.id);

 const params = new URLSearchParams({
 userId: user.id,
 userName: user.name,
 userAvatar: user.avatar,
 });

 return (
 <div
 key={user.id}
 className="rounded-2xl px-3 py-2 transition hover:bg-white/10"
 >
 <button
 type="button"
 onClick={() => {
 if (isMe) {
 handleOpenSecretDialog();
 } else {
 setMobileInfoOpen(false);
 router.push(`/private-chat/private?${params.toString()}`);
 }
 }}
 className="flex w-full items-center gap-3 text-left"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
 {user.avatar}
 </span>

 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm text-white">
 {user.name}
 {isMe ? "（我）" : ""}
 {isUserBanned ? " · 已禁言" : ""}
 {targetAdminRole === "owner"
 ? " · owner"
 : targetAdminRole
 ? " · 管理员"
 : ""}
 {isBlockedByMe ? " · 已拉黑" : ""}
 {isFriendByMe ? " · 已关注" : ""}
 </span>
 <span className="block truncate text-xs text-emerald-300/80">
 {isMe
 ? "点击进入私密入口"
 : isBlockedByMe
 ? "已拉黑 · 可取消拉黑"
 : isFriendByMe
 ? "已关注 · 点击头像私聊"
 : "在线 · 点击头像私聊"}
 </span>
 {isAdmin ? (
 <span className="mt-0.5 block truncate text-[11px] text-slate-500">
 ID: {user.id}
 </span>
 ) : null}
 </span>
 </button>

 {!isMe ? (
 <div className="mt-2 flex flex-wrap gap-2 pl-12">
 {isBlockedByMe ? (
 <button
 type="button"
 onClick={() => handleUnblockUser(user.id, user.name)}
 disabled={isBlockActionLoading}
 className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isBlockActionLoading ? "处理中" : "取消拉黑"}
 </button>
 ) : (
 <button
 type="button"
 onClick={() => handleBlockUser(user.id, user.name)}
 disabled={isBlockActionLoading}
 className="rounded-xl border border-slate-400/20 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isBlockActionLoading ? "处理中" : "拉黑"}
 </button>
 )}

 {isFriendByMe ? (
 <button
 type="button"
 onClick={() => handleRemoveFriend(user.id, user.name)}
 disabled={isFriendActionLoading}
 className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isFriendActionLoading ? "处理中" : "取消关注"}
 </button>
 ) : (
 <button
 type="button"
 onClick={() => handleAddFriend(user.id, user.name, user.avatar)}
 disabled={isFriendActionLoading}
 className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isFriendActionLoading ? "处理中" : "加好友"}
 </button>
 )}

 {isAdmin ? (
 <>
 {isTargetAdmin && !isOwner ? (
 <span className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
 {targetAdminRole === "owner" ? "owner" : "管理员"}
 </span>
 ) : isUserBanned ? (
 <button
 type="button"
 onClick={() => handleUnbanUser(user.id, user.name)}
 disabled={
 isAdminActionLoading ||
 (!isOwner && Boolean(targetAdminRole))
 }
 className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 解除禁言
 </button>
 ) : canBanThisUser ? (
 <button
 type="button"
 onClick={() => handleBanUser(user.id, user.name)}
 disabled={isAdminActionLoading}
 className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 禁言
 </button>
 ) : null}

 {isOwner && !isTargetAdmin ? (
 <button
 type="button"
 onClick={() => {
 setAppointAdminIdDraft(user.id);
 setAppointAdminNameDraft(user.name);
 setAdminPanelOpen(true);
 }}
 className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100 transition hover:bg-amber-400/20"
 >
 填入管理员任命
 </button>
 ) : null}
 </>
 ) : null}
 </div>
 ) : null}
 </div>
 );
 })
 )}
 </div>
 </div>

 <div className="mt-4 rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-fuchsia-50">我的好友 / 关注列表</h3>
 <span className="rounded-full bg-fuchsia-500/20 px-2 py-1 text-xs text-fuchsia-100">
 {friendUsers.length} 人
 </span>
 </div>

 <div className="space-y-2">
 {friendUsers.length === 0 ? (
 <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-fuchsia-100/70">
 暂无关注好友。可以在大厅成员里点击“加好友”。
 </div>
 ) : (
 friendUsers.map((friend) => {
 const isOnline = onlineUsers.some((user) => user.id === friend.friend_id);

 return (
 <div
 key={friend.friend_id}
 className="rounded-2xl bg-black/10 px-3 py-2"
 >
 <button
 type="button"
 onClick={() => {
 setMobileInfoOpen(false);
 router.push(buildFriendHref(friend));
 }}
 className="flex w-full items-center gap-3 text-left transition hover:opacity-90"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
 {friend.friend_avatar || "👤"}
 </span>

 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-medium text-white">
 {friend.friend_name}
 </span>
 <span className="block truncate text-xs text-fuchsia-100/70">
 {isOnline ? "在线 · 点击私聊" : "已关注 · 点击私聊"}
 </span>
 </span>
 </button>

 <button
 type="button"
 onClick={() =>
 handleRemoveFriend(friend.friend_id, friend.friend_name)
 }
 disabled={isFriendActionLoading}
 className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-fuchsia-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isFriendActionLoading ? "处理中" : "取消关注"}
 </button>
 </div>
 );
 })
 )}
 </div>
 </div>

 <button
 type="button"
 onClick={handleClearLocalView}
 className="mt-4 w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-500/20"
 >
 清空本机显示
 </button>

 <p className="mt-2 px-1 text-xs leading-5 text-slate-500">
 注意：这个按钮只清空当前浏览器显示，不删除 Supabase 数据库里的公共消息。
 </p>
 </>
 );

 return (
 <PrivateChatShell
 title="公共聊天室"
 subtitle={`无需注册，打开就能聊。当前在线 ${onlineUsers.length} 人。`}
 rightSlot={
 <div className="flex items-center gap-2">
 {totalPrivateUnread > 0 ? (
 <div className="rounded-2xl bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100">
 私聊 {totalPrivateUnread}
 </div>
 ) : null}

 {isAdmin ? (
 <div className="hidden rounded-2xl bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 sm:block">
 {isOwner ? "owner" : "管理员"}
 </div>
 ) : null}

 <button
 type="button"
 onClick={handleOpenSecretDialog}
 className="rounded-2xl bg-fuchsia-500/20 px-3 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/30"
 >
 私密入口
 </button>
 </div>
 }
 >
 <div className="relative grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr]">
 <aside className="hidden min-h-0 overflow-y-auto border-r border-white/10 bg-slate-950/40 p-4 lg:block">
 {lobbyPanel}
 </aside>

 <section className="flex h-full min-h-0 flex-col overflow-hidden">
 {activeAnnouncement ? (
 <div className="shrink-0 border-b border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-50 sm:px-6">
 <span className="font-semibold">公告：</span>
 {activeAnnouncement.content}
 </div>
 ) : null}

 {errorText ? (
 <div className="shrink-0 border-b border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 sm:px-6">
 {errorText}
 </div>
 ) : null}

 <div
 ref={listRef}
 className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5"
 >
 {isLoading ? (
 <div className="flex h-full items-center justify-center">
 <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
 正在连接公共聊天室...
 </div>
 </div>
 ) : messages.length === 0 ? (
 <div className="flex h-full items-center justify-center">
 <div className="max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
 💬
 </div>
 <h2 className="text-lg font-semibold text-white">
 公共大厅暂无消息
 </h2>
 <p className="mt-2 text-sm leading-6 text-slate-400">
 你可以直接发第一条消息。也可以点击“私密入口”，输入暗语进入约定房间。
 </p>
 </div>
 </div>
 ) : (
 messages.map((message) => {
 const isMe = currentUser?.id === message.sender_id;
 const senderBanned = bans.some(
 (ban) => ban.user_id === message.sender_id && ban.is_active
 );
 const senderAdminRole = getUserAdminRole(message.sender_id);
 const senderIsAdmin = Boolean(senderAdminRole);
 const canBanThisSender = canBanTargetUser(message.sender_id);

 return (
 <div
 key={message.id}
 className={`flex gap-2 sm:gap-3 ${
 isMe ? "justify-end" : "justify-start"
 }`}
 >
 {!isMe ? (
 <button
 type="button"
 onClick={() =>
 router.push(buildPrivateHref(message, currentUser))
 }
 className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg transition hover:bg-white/15 sm:h-10 sm:w-10 sm:text-xl"
 title="点击私聊"
 >
 {message.sender_avatar}
 </button>
 ) : null}

 <div className={isMe ? "max-w-[82%]" : "max-w-[82%]"}>
 <div
 className={`mb-1 flex items-center gap-2 text-xs ${
 isMe
 ? "justify-end text-fuchsia-200/80"
 : "text-slate-400"
 }`}
 >
 <span>
 {isMe ? "我" : message.sender_name}
 {senderBanned ? " · 已禁言" : ""}
 {senderAdminRole === "owner"
 ? " · owner"
 : senderAdminRole
 ? " · 管理员"
 : ""}
 </span>
 <span>{formatPrivateChatTime(message.created_at)}</span>
 </div>

 <div
 className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ${
 isMe
 ? "rounded-tr-lg bg-fuchsia-500 text-white shadow-fuchsia-950/30"
 : "rounded-tl-lg bg-white/10 text-slate-100 shadow-black/20"
 }`}
 >
 {message.content}

 {isAdmin ? (
 <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-2">
 <button
 type="button"
 onClick={() =>
 handleDeletePublicMessage(message.id)
 }
 disabled={isDeletingMessageId === message.id}
 className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isDeletingMessageId === message.id
 ? "删除中..."
 : "删除消息"}
 </button>

 {!isMe ? (
 senderIsAdmin && !isOwner ? (
 <span className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
 {senderAdminRole === "owner"
 ? "owner"
 : "管理员"}
 </span>
 ) : senderBanned ? (
 <button
 type="button"
 onClick={() =>
 handleUnbanUser(
 message.sender_id,
 message.sender_name
 )
 }
 disabled={
 isAdminActionLoading ||
 (!isOwner && Boolean(senderAdminRole))
 }
 className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 解除禁言
 </button>
 ) : canBanThisSender ? (
 <button
 type="button"
 onClick={() =>
 handleBanUser(
 message.sender_id,
 message.sender_name
 )
 }
 disabled={isAdminActionLoading}
 className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 禁言用户
 </button>
 ) : null
 ) : null}
 </div>
 ) : null}
 </div>
 </div>

 {isMe ? (
 <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-lg sm:h-10 sm:w-10 sm:text-xl">
 {message.sender_avatar}
 </div>
 ) : null}
 </div>
 );
 })
 )}
 </div>

 <div className="shrink-0 border-t border-white/10 bg-slate-950/70 p-3 sm:p-4">
 <div className="flex items-end gap-2 sm:gap-3">
 <textarea
 value={draft}
 onChange={(event) => setDraft(event.target.value)}
 onKeyDown={handleKeyDown}
 rows={1}
 maxLength={500}
 placeholder={
 isBanned
 ? "你已被限制发言"
 : publicChatPaused && !isAdmin
 ? "公共聊天室已暂停发言"
 : "输入公共消息..."
 }
 disabled={isBanned || (publicChatPaused && !isAdmin)}
 className="min-h-11 flex-1 resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-400/50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:leading-6"
 />

 <button
 type="button"
 onClick={handleSendMessage}
 disabled={
 isSending || isBanned || (publicChatPaused && !isAdmin)
 }
 className="h-11 shrink-0 rounded-3xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5"
 >
 {isSending ? "发送中" : "发送"}
 </button>
 </div>

 <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
 <span>
 {isBanned
 ? "你已被管理员限制发言"
 : publicChatPaused && !isAdmin
 ? "公共聊天室已暂停发言"
 : !isAdmin && publicChatCooldownSeconds > 0
 ? `当前发言间隔：${publicChatCooldownSeconds} 秒`
 : "点击头像私聊，或点击私密入口进入暗语房间"}
 </span>

 <button
 type="button"
 onClick={handleOpenSecretDialog}
 className="text-fuchsia-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
 >
 私密入口
 </button>
 </div>
 </div>
 </section>

 
      <button
        type="button"
        onClick={() => setMobileInfoOpen(true)}
        className="mobile-lobby-info-floating-button-v1 fixed bottom-24 right-4 z-40 rounded-full border border-white/10 bg-fuchsia-500 px-4 py-3 text-xs font-semibold text-white shadow-[0_18px_50px_rgba(217,70,239,0.35)] transition hover:bg-fuchsia-400 lg:hidden"
      >
        大厅信息
      </button>

{mobileInfoOpen ? (
 <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden">
 <button
 type="button"
 onClick={() => setMobileInfoOpen(false)}
 className="fixed right-4 top-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/95 text-3xl leading-none text-white shadow-2xl shadow-black/60 transition hover:bg-white/15"
 aria-label="关闭大厅信息"
 >
 ×
 </button>

 <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-slate-950 p-4 pt-16 shadow-2xl shadow-black/60">
 {lobbyPanel}
 </div>
 </div>
 ) : null}

 {secretDialogOpen ? (
 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
 <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/50">
 <div className="mb-4 flex items-start justify-between gap-3">
 <div>
 <h2 className="text-lg font-semibold text-white">
 进入私密房间
 </h2>
 <p className="mt-1 text-sm leading-6 text-slate-400">
 输入你和对方约定好的暗语或密码。多人输入完全相同内容，会进入同一个私密房间。
 </p>
 </div>

 <button
 type="button"
 onClick={handleCloseSecretDialog}
 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-300 transition hover:bg-white/15 hover:text-white"
 aria-label="关闭"
 >
 ×
 </button>
 </div>

 <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <label className="mb-2 block text-xs font-medium text-slate-400">
 暗语 / 密码
 </label>

 <input
 value={secretCodeDraft}
 onChange={(event) => {
 setSecretCodeDraft(event.target.value);
 setSecretError("");
 }}
 onKeyDown={handleSecretCodeKeyDown}
 maxLength={32}
 autoFocus
 placeholder="例如：葡萄牙晚霞、lisbon520、我们的暗号"
 className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-400/50"
 />

 {secretError ? (
 <p className="mt-2 text-xs text-rose-300">{secretError}</p>
 ) : (
 <p className="mt-2 text-xs leading-5 text-slate-500">
 暗语不会显示在公共聊天室里，只用于生成对应的多人私密房间。
 </p>
 )}
 </div>

 <div className="mt-4 flex gap-3">
 <button
 type="button"
 onClick={handleCloseSecretDialog}
 className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
 >
 取消
 </button>

 <button
 type="button"
 onClick={handleEnterSecretRoom}
 className="flex-1 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
 >
 进入房间
 </button>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 </PrivateChatShell>
 );
}
