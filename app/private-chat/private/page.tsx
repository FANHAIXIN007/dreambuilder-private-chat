"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PrivateChatShell from "../components/PrivateChatShell";
import { privateChatSupabase } from "../lib/supabaseClient";
import {
 formatPrivateChatTime,
 getCurrentPrivateChatUser,
 getPrivateRoomId,
 type PrivateChatUser,
} from "../lib/privateChatStore";
import {
 getCurrentPrivateChatAuthSession,
 type PrivateChatAuthSession,
} from "../lib/privateChatAuthStore";
import {
 readAppAccountSession,
 type AppAccountSession,
} from "@/app/lib/appAuthStore";

const PRIVATE_NOTICE_READ_KEY = "private_chat_notice_read_v1";
const MEDIA_BUCKET = "private-chat-media";

const FREE_IMAGE_SIZE_BYTES = 0;
const FREE_VIDEO_SIZE_BYTES = 0;
const FREE_MONTHLY_TRAFFIC_BYTES = 0;

const VIP_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const VIP_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const VIP_MONTHLY_TRAFFIC_BYTES = 1024 * 1024 * 1024;

const SVIP_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const SVIP_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;
const SVIP_MONTHLY_TRAFFIC_BYTES = 10 * 1024 * 1024 * 1024;

const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;

type TargetUser = {
 id?: string;
 name: string;
 avatar: string;
 secretCode?: string;
};

type PrivateChatMessageType = "text" | "image" | "video";

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
 message_type?: PrivateChatMessageType;
 media_url?: string | null;
 media_path?: string | null;
 media_name?: string | null;
 media_size?: number | null;
 media_mime?: string | null;
};

type OnlineRoomUser = {
 id: string;
 name: string;
 avatar: string;
 online_at?: string;
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

type CheckMediaRoomResponse = {
 ok?: boolean;
 isAdminMediaRoom?: boolean;
 message?: string;
};

type PrivateActionResponse<T = unknown> = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: T;
};

type SendMessageResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: PrivateChatMessageRow;
};

type CreateUploadUrlResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 bucket?: string;
 path?: string;
 token?: string;
 publicUrl?: string;
};

type MarkUploadSuccessResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: unknown;
};

type MembershipLevel = "free" | "vip" | "svip";
type MembershipStatus = "active" | "expired" | "cancelled" | "manual";
type AdminRole = "owner" | "admin" | null;

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

type MembershipActionResponse<T> = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: T;
};

type AdminOverviewResponse = {
 ok?: boolean;
 message?: string;
 error?: string;
 data?: {
 role?: AdminRole;
 };
};

type MediaEntitlement = {
 level: MembershipLevel;
 label: string;
 canSendMedia: boolean;
 imageLimitBytes: number;
 videoLimitBytes: number;
 monthlyTrafficLimitBytes: number;
 desc: string;
};

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
 accountId: string | null;
 source: string;
}) {
 if (typeof window === "undefined") return;

 const visitorId = getOrCreatePrivateChatVisitorId();
 const sessionId = getOrCreatePrivateChatSessionId();

 if (!visitorId || !sessionId) return;

 try {
 const payload = {
 action: params.action,
 visitorId,
 sessionId,
 accountId: params.accountId,
 chatUserId: params.currentUser?.id || null,
 userName: params.currentUser?.name || null,
 path: params.path,
 pageTitle: params.pageTitle,
 referrer: document.referrer || null,
 source: params.source,
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

function markPrivateNoticeAsRead(senderId?: string | null) {
 if (!senderId) return;

 const oldMap = getPrivateNoticeReadMap();

 savePrivateNoticeReadMap({
 ...oldMap,
 [senderId]: new Date().toISOString(),
 });
}

function normalizeSecretCode(code: string) {
 return code.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 32);
}

function getTargetUserFromParams(searchParams: URLSearchParams): TargetUser {
 const mode = searchParams.get("mode");
 const code = searchParams.get("code");
 const userId = searchParams.get("userId");
 const userName = searchParams.get("userName");
 const userAvatar = searchParams.get("userAvatar");

 if (mode === "secret") {
 const cleanedCode = code?.trim().slice(0, 32) || "默认私密房间";

 return {
 name: "暗语私密房间",
 avatar: "🔐",
 secretCode: cleanedCode,
 };
 }

 return {
 id: userId || undefined,
 name: userName || "私聊对象",
 avatar: userAvatar || "👤",
 };
}

function buildSecretRoomId(secretCode?: string) {
 const normalizedCode = normalizeSecretCode(secretCode || "default");

 return `private_secret_${normalizedCode}`;
}

function dedupeOnlineUsers(users: OnlineRoomUser[]) {
 const map = new Map<string, OnlineRoomUser>();

 users.forEach((user) => {
 if (!user.id) return;
 map.set(user.id, user);
 });

 return Array.from(map.values());
}

function getFileExtension(fileName: string, fallback = "jpg") {
 const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/);

 if (!match?.[1]) return fallback;

 return match[1];
}

function createSafeFileName(fileName: string) {
 const extension = getFileExtension(fileName, "jpg");

 const baseName = fileName
 .replace(/\.[^/.]+$/, "")
 .normalize("NFKD")
 .replace(/[^\w-]/g, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "")
 .slice(0, 40);

 const safeBaseName = baseName || "media";

 return `${safeBaseName}.${extension}`;
}

function formatMediaSize(size?: number | null) {
 if (!size) return "0 B";

 if (size < 1024 * 1024) {
 return `${Math.max(1, Math.round(size / 1024))} KB`;
 }

 if (size < 1024 * 1024 * 1024) {
 return `${(size / 1024 / 1024).toFixed(1)} MB`;
 }

 return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getCompressedFileName(fileName: string) {
 const safeName = createSafeFileName(fileName);
 const baseName = safeName.replace(/\.[^/.]+$/, "") || "image";

 return `${baseName}_compressed.jpg`;
}

function isImageFile(file: File) {
 return file.type.startsWith("image/");
}

function isVideoFile(file: File) {
 return (
 file.type === "video/mp4" ||
 file.type === "video/webm" ||
 file.type === "video/quicktime" ||
 file.type.startsWith("video/")
 );
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
 return new Promise((resolve, reject) => {
 const image = new Image();
 const objectUrl = URL.createObjectURL(file);

 image.onload = () => {
 URL.revokeObjectURL(objectUrl);
 resolve(image);
 };

 image.onerror = () => {
 URL.revokeObjectURL(objectUrl);
 reject(new Error("图片读取失败"));
 };

 image.src = objectUrl;
 });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
 return new Promise((resolve, reject) => {
 canvas.toBlob(
 (blob) => {
 if (!blob) {
 reject(new Error("图片压缩失败"));
 return;
 }

 resolve(blob);
 },
 "image/jpeg",
 quality
 );
 });
}

async function compressImageFile(
 file: File,
 maxImageSizeBytes: number
): Promise<File> {
 if (maxImageSizeBytes <= 0) {
 throw new Error("当前会员等级不支持发送图片");
 }

 if (file.size <= maxImageSizeBytes) {
 return file;
 }

 const image = await loadImageFromFile(file);

 const scale = Math.min(
 MAX_IMAGE_WIDTH / image.width,
 MAX_IMAGE_HEIGHT / image.height,
 1
 );

 const targetWidth = Math.max(1, Math.round(image.width * scale));
 const targetHeight = Math.max(1, Math.round(image.height * scale));

 const canvas = document.createElement("canvas");
 canvas.width = targetWidth;
 canvas.height = targetHeight;

 const ctx = canvas.getContext("2d");

 if (!ctx) {
 throw new Error("当前浏览器不支持图片压缩");
 }

 ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

 const qualityList = [0.85, 0.75, 0.65, 0.55, 0.45];

 let bestBlob: Blob | null = null;

 for (const quality of qualityList) {
 const blob = await canvasToBlob(canvas, quality);
 bestBlob = blob;

 if (blob.size <= maxImageSizeBytes) {
 return new File([blob], getCompressedFileName(file.name), {
 type: "image/jpeg",
 lastModified: Date.now(),
 });
 }
 }

 if (!bestBlob) {
 throw new Error("图片压缩失败");
 }

 return new File([bestBlob], getCompressedFileName(file.name), {
 type: "image/jpeg",
 lastModified: Date.now(),
 });
}

function getAccountIdFromSessions(params: {
 appSession: AppAccountSession | null;
 authSession: PrivateChatAuthSession | null;
}) {
 return (
 params.appSession?.accountId ||
 params.authSession?.account?.accountId ||
 params.authSession?.profile?.accountId ||
 null
 );
}

function normalizeMembershipLevel(value?: string | null): MembershipLevel {
 if (value === "vip") return "vip";
 if (value === "svip") return "svip";
 return "free";
}

function getMediaEntitlement(
 level: MembershipLevel,
 adminRole: AdminRole
): MediaEntitlement {
 if (adminRole === "owner" || adminRole === "admin") {
 return {
 level: "svip",
 label: adminRole === "owner" ? "Owner" : "Admin",
 canSendMedia: true,
 imageLimitBytes: SVIP_IMAGE_SIZE_BYTES,
 videoLimitBytes: SVIP_VIDEO_SIZE_BYTES,
 monthlyTrafficLimitBytes: SVIP_MONTHLY_TRAFFIC_BYTES,
 desc:
 adminRole === "owner"
 ? "Owner 可发送图片 / 视频，按 SVIP 单文件大小限制，不受月流量限制。"
 : "Admin 可发送图片 / 视频，按 SVIP 单文件大小和 10GB 月流量限制。",
 };
 }

 if (level === "svip") {
 return {
 level: "svip",
 label: "SVIP",
 canSendMedia: true,
 imageLimitBytes: SVIP_IMAGE_SIZE_BYTES,
 videoLimitBytes: SVIP_VIDEO_SIZE_BYTES,
 monthlyTrafficLimitBytes: SVIP_MONTHLY_TRAFFIC_BYTES,
 desc: "SVIP 可在私聊和暗语房发送图片 / 视频。",
 };
 }

 if (level === "vip") {
 return {
 level: "vip",
 label: "VIP",
 canSendMedia: true,
 imageLimitBytes: VIP_IMAGE_SIZE_BYTES,
 videoLimitBytes: VIP_VIDEO_SIZE_BYTES,
 monthlyTrafficLimitBytes: VIP_MONTHLY_TRAFFIC_BYTES,
 desc: "VIP 可在私聊和暗语房发送图片 / 视频。",
 };
 }

 return {
 level: "free",
 label: "Free",
 canSendMedia: false,
 imageLimitBytes: FREE_IMAGE_SIZE_BYTES,
 videoLimitBytes: FREE_VIDEO_SIZE_BYTES,
 monthlyTrafficLimitBytes: FREE_MONTHLY_TRAFFIC_BYTES,
 desc: "普通会员不能发送图片或视频，升级 VIP 后可使用媒体发送。",
 };
}

function getEntitlementBadgeClass(entitlement: MediaEntitlement) {
 if (entitlement.label === "Owner") {
 return "border-purple-300/30 bg-purple-500/15 text-purple-100";
 }

 if (entitlement.label === "Admin") {
 return "border-fuchsia-300/30 bg-fuchsia-500/15 text-fuchsia-100";
 }

 if (entitlement.level === "svip") {
 return "border-purple-300/30 bg-purple-500/15 text-purple-100";
 }

 if (entitlement.level === "vip") {
 return "border-fuchsia-300/30 bg-fuchsia-500/15 text-fuchsia-100";
 }

 return "border-slate-400/20 bg-slate-500/10 text-slate-300";
}

function getEntitlementShortText(entitlement: MediaEntitlement) {
 if (!entitlement.canSendMedia) return "仅文字";

 if (entitlement.label === "Owner") {
 return "可发媒体 · 不限月流量";
 }

 return `可发媒体 · ${formatMediaSize(entitlement.monthlyTrafficLimitBytes)}/月`;
}

export default function PrivateChatPage() {
 const searchParams = useSearchParams();
 const listRef = useRef<HTMLDivElement | null>(null);
 const mediaInputRef = useRef<HTMLInputElement | null>(null);

 const [currentUser, setCurrentUser] = useState<PrivateChatUser | null>(null);
 const [messages, setMessages] = useState<PrivateChatMessageRow[]>([]);
 const [onlineUsers, setOnlineUsers] = useState<OnlineRoomUser[]>([]);
 const [draft, setDraft] = useState("");
 const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
 const [isAdminMediaRoom, setIsAdminMediaRoom] = useState(false);
 const [isCheckingMediaRoom, setIsCheckingMediaRoom] = useState(false);
 const [isRoomFavorited, setIsRoomFavorited] = useState(false);
 const [favoriteStatusText, setFavoriteStatusText] = useState("");
 const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [isSending, setIsSending] = useState(false);
 const [isUploadingMedia, setIsUploadingMedia] = useState(false);
 const [isDeletingMessageId, setIsDeletingMessageId] = useState<string | null>(
 null
 );
 const [isClearing, setIsClearing] = useState(false);
 const [clearConfirming, setClearConfirming] = useState(false);
 const [errorText, setErrorText] = useState("");

 const [appSession, setAppSession] = useState<AppAccountSession | null>(null);
 const [authSession, setAuthSession] = useState<PrivateChatAuthSession | null>(
 null
 );
 const [membership, setMembership] = useState<MembershipRow | null>(null);
 const [adminRole, setAdminRole] = useState<AdminRole>(null);
 const [isCheckingMembership, setIsCheckingMembership] = useState(false);

 const targetUser = useMemo(() => {
 return getTargetUserFromParams(searchParams);
 }, [searchParams]);

 const roomId = useMemo(() => {
 if (targetUser.secretCode) {
 return buildSecretRoomId(targetUser.secretCode);
 }

 return getPrivateRoomId(targetUser.id);
 }, [targetUser.id, targetUser.secretCode]);

 const isSecretRoom = Boolean(targetUser.secretCode);

 const accountId = useMemo(() => {
 return getAccountIdFromSessions({
 appSession,
 authSession,
 });
 }, [appSession, authSession]);

 const membershipLevel = normalizeMembershipLevel(
 membership?.membershipLevel || "free"
 );

 const mediaEntitlement = useMemo(() => {
 return getMediaEntitlement(membershipLevel, adminRole);
 }, [membershipLevel, adminRole]);

 const canSendMediaInThisRoom = mediaEntitlement.canSendMedia;
 const entitlementBadgeClass = getEntitlementBadgeClass(mediaEntitlement);
 const entitlementShortText = getEntitlementShortText(mediaEntitlement);

 useEffect(() => {
 const user = getCurrentPrivateChatUser();
 const latestAppSession = readAppAccountSession();
 const latestAuthSession = getCurrentPrivateChatAuthSession();

 setCurrentUser(user);
 setAppSession(latestAppSession);
 setAuthSession(latestAuthSession.isGuest ? null : latestAuthSession);
 }, []);

 useEffect(() => {
 if (!currentUser) return;

 const path =
 typeof window !== "undefined"
 ? window.location.pathname + window.location.search
 : "/private-chat/private";

 const source = isSecretRoom
 ? "private_chat_secret_room"
 : "private_chat_direct_room";

 reportPrivateChatSiteVisit({
 action: "visit",
 path,
 pageTitle: "私密聊天",
 currentUser,
 accountId,
 source,
 });

 const heartbeatTimer = window.setInterval(() => {
 reportPrivateChatSiteVisit({
 action: "heartbeat",
 path,
 pageTitle: "私密聊天",
 currentUser,
 accountId,
 source,
 });
 }, 30000);

 const handleVisibilityChange = () => {
 if (document.visibilityState === "visible") {
 reportPrivateChatSiteVisit({
 action: "heartbeat",
 path,
 pageTitle: "私密聊天",
 currentUser,
 accountId,
 source,
 });
 }
 };

 const handleBeforeUnload = () => {
 reportPrivateChatSiteVisit({
 action: "leave",
 path,
 pageTitle: "私密聊天",
 currentUser,
 accountId,
 source,
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
 pageTitle: "私密聊天",
 currentUser,
 accountId,
 source,
 });
 };
 }, [currentUser?.id, accountId, isSecretRoom, roomId]);


 useEffect(() => {
 let mounted = true;

 async function refreshRights() {
 if (!currentUser) return;

 setIsCheckingMembership(true);

 const latestAppSession = readAppAccountSession();
 const latestAuthSession = getCurrentPrivateChatAuthSession();

 if (!mounted) return;

 setAppSession(latestAppSession);
 setAuthSession(latestAuthSession.isGuest ? null : latestAuthSession);

 const currentAccountId = getAccountIdFromSessions({
 appSession: latestAppSession,
 authSession: latestAuthSession.isGuest ? null : latestAuthSession,
 });

 try {
 const adminResponse = await fetch("/api/private-chat/admin-overview", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 cache: "no-store",
 body: JSON.stringify({
 actorId: currentUser.id,
 }),
 });

 const adminText = await adminResponse.text();

 let adminResult: AdminOverviewResponse | null = null;

 try {
 adminResult = JSON.parse(adminText) as AdminOverviewResponse;
 } catch {
 adminResult = null;
 }

 if (mounted && adminResponse.ok && adminResult?.ok) {
 setAdminRole(adminResult.data?.role || null);
 } else if (mounted) {
 setAdminRole(null);
 }
 } catch {
 if (mounted) {
 setAdminRole(null);
 }
 }

 if (!currentAccountId) {
 if (mounted) {
 setMembership(null);
 setIsCheckingMembership(false);
 }

 return;
 }

 try {
 const response = await fetch("/api/private-chat/membership", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 cache: "no-store",
 body: JSON.stringify({
 action: "get_membership",
 accountId: currentAccountId,
 }),
 });

 const responseText = await response.text();

 let result: MembershipActionResponse<MembershipRow> | null = null;

 try {
 result = JSON.parse(
 responseText
 ) as MembershipActionResponse<MembershipRow>;
 } catch {
 result = null;
 }

 if (!mounted) return;

 if (!response.ok || !result?.ok) {
 setMembership(null);
 return;
 }

 setMembership(result.data || null);
 } catch {
 if (mounted) {
 setMembership(null);
 }
 } finally {
 if (mounted) {
 setIsCheckingMembership(false);
 }
 }
 }

 refreshRights();

 return () => {
 mounted = false;
 };
 }, [currentUser?.id]);

 useEffect(() => {
 let mounted = true;

 async function checkMediaRoomPermission() {
 if (!isSecretRoom || !targetUser.secretCode) {
 setIsAdminMediaRoom(false);
 setIsCheckingMediaRoom(false);
 return;
 }

 setIsCheckingMediaRoom(true);

 try {
 const response = await fetch("/api/private-chat/check-media-room", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 secretCode: targetUser.secretCode,
 }),
 });

 const result = (await response.json()) as CheckMediaRoomResponse;

 if (!mounted) return;

 if (!response.ok || !result.ok) {
 console.error("Check media room failed:", result);
 setIsAdminMediaRoom(false);
 return;
 }

 setIsAdminMediaRoom(Boolean(result.isAdminMediaRoom));
 } catch (error) {
 if (!mounted) return;

 console.error("Check media room exception:", error);
 setIsAdminMediaRoom(false);
 } finally {
 if (mounted) {
 setIsCheckingMediaRoom(false);
 }
 }
 }

 checkMediaRoomPermission();

 return () => {
 mounted = false;
 };
 }, [isSecretRoom, targetUser.secretCode]);

 useEffect(() => {
 if (!targetUser.id) return;

 markPrivateNoticeAsRead(targetUser.id);

 return () => {
 markPrivateNoticeAsRead(targetUser.id);
 };
 }, [targetUser.id]);

 useEffect(() => {
 if (!currentUser || !isSecretRoom) {
 setIsRoomFavorited(false);
 setFavoriteStatusText("");
 return;
 }

 loadRoomFavoriteStatus();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentUser?.id, isSecretRoom, roomId]);

 useEffect(() => {
 if (!currentUser) return;

 const activeUser = currentUser;
 let mounted = true;

 async function loadPrivateMessages() {
 setIsLoading(true);
 setErrorText("");

 const { data, error } = await privateChatSupabase
 .from("private_chat_messages")
 .select("*")
 .eq("room_id", roomId)
 .order("created_at", { ascending: false })
 .limit(200);

 if (!mounted) return;

 if (error) {
 console.error("Load private messages error:", error);
 setErrorText("私密聊天消息加载失败，请检查 Supabase 表和 RLS 权限。");
 setIsLoading(false);
 return;
 }

 const orderedMessages = (data || []).reverse() as PrivateChatMessageRow[];

 setMessages(orderedMessages);
 setIsLoading(false);

 if (targetUser.id) {
 markPrivateNoticeAsRead(targetUser.id);
 }
 }

 loadPrivateMessages();

 const channel = privateChatSupabase
 .channel(`private-chat-room-${roomId}`, {
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
 table: "private_chat_messages",
 filter: `room_id=eq.${roomId}`,
 },
 (payload) => {
 const newMessage = payload.new as PrivateChatMessageRow;

 setMessages((oldMessages) => {
 const exists = oldMessages.some(
 (message) => message.id === newMessage.id
 );

 if (exists) return oldMessages;

 return [...oldMessages, newMessage].slice(-200);
 });

 if (
 targetUser.id &&
 newMessage.sender_id === targetUser.id &&
 newMessage.receiver_id === activeUser.id
 ) {
 markPrivateNoticeAsRead(targetUser.id);
 }
 }
 )
 .on(
 "postgres_changes",
 {
 event: "DELETE",
 schema: "public",
 table: "private_chat_messages",
 filter: `room_id=eq.${roomId}`,
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
 const presenceState = channel.presenceState();

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
 console.log("Private chat channel status:", status);

 if (status === "SUBSCRIBED") {
 await channel.track({
 id: activeUser.id,
 name: activeUser.name,
 avatar: activeUser.avatar,
 online_at: new Date().toISOString(),
 });
 }
 });

 return () => {
 mounted = false;

 if (targetUser.id) {
 markPrivateNoticeAsRead(targetUser.id);
 }

 privateChatSupabase.removeChannel(channel);
 };
 }, [currentUser, roomId, targetUser.id]);

 useEffect(() => {
 listRef.current?.scrollTo({
 top: listRef.current.scrollHeight,
 behavior: "smooth",
 });

 if (targetUser.id) {
 markPrivateNoticeAsRead(targetUser.id);
 }
 }, [messages.length, targetUser.id]);

 async function callSendMessage(
 payload: Record<string, unknown>
 ): Promise<SendMessageResponse> {
 try {
 const response = await fetch("/api/private-chat/send-message", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(payload),
 });

 const responseText = await response.text();

 let result: SendMessageResponse | null = null;

 try {
 result = JSON.parse(responseText) as SendMessageResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `发送失败，状态码：${response.status}`,
 };
 }

 return {
 ok: true,
 message: result.message || "发送成功。",
 data: result.data,
 };
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 };
 }
 }

 async function createSignedUploadUrl(
 file: File,
 messageType: Exclude<PrivateChatMessageType, "text">
 ): Promise<CreateUploadUrlResponse> {
 try {
 const response = await fetch("/api/private-chat/create-upload-url", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 roomId,
 secretCode: targetUser.secretCode || null,
 fileName: file.name,
 fileType: file.type,
 fileSize: file.size,
 messageType,
 accountId,
 chatUserId: currentUser?.id || null,
 membershipLevel: mediaEntitlement.level,
 adminRole,
 scene: isSecretRoom ? "secret" : "private",
 }),
 });

 const responseText = await response.text();

 let result: CreateUploadUrlResponse | null = null;

 try {
 result = JSON.parse(responseText) as CreateUploadUrlResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `创建上传地址失败，状态码：${response.status}`,
 };
 }

 return result;
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 };
 }
 }

 async function markUploadSuccess(params: {
 mediaPath: string;
 fileSize: number;
 }): Promise<MarkUploadSuccessResponse> {
 try {
 const response = await fetch("/api/private-chat/mark-upload-success", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 cache: "no-store",
 body: JSON.stringify({
 roomId,
 mediaPath: params.mediaPath,
 fileSize: params.fileSize,
 accountId,
 chatUserId: currentUser?.id || null,
 }),
 });

 const responseText = await response.text();

 let result: MarkUploadSuccessResponse | null = null;

 try {
 result = JSON.parse(responseText) as MarkUploadSuccessResponse;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `标记上传成功失败，状态码：${response.status}`,
 };
 }

 return {
 ok: true,
 message: result.message || "上传状态已更新。",
 data: result.data,
 };
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 };
 }
 }

 async function callPrivateAction<T = unknown>(
 action: string,
 payload: Record<string, unknown> = {}
 ) {
 if (!currentUser) {
 return {
 ok: false,
 error: "当前用户不存在。",
 } as PrivateActionResponse<T>;
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
 actorAvatar: currentUser.avatar,
 ...payload,
 }),
 });

 const responseText = await response.text();

 let result: PrivateActionResponse<T> | null = null;

 try {
 result = JSON.parse(responseText) as PrivateActionResponse<T>;
 } catch {
 result = null;
 }

 if (!response.ok || !result?.ok) {
 return {
 ok: false,
 error:
 result?.error ||
 result?.message ||
 `私密房间操作失败，状态码：${response.status}`,
 } as PrivateActionResponse<T>;
 }

 return {
 ok: true,
 message: result.message || "操作成功。",
 data: result.data,
 } as PrivateActionResponse<T>;
 } catch (error) {
 const message = error instanceof Error ? error.message : "网络请求失败。";

 return {
 ok: false,
 error: message,
 } as PrivateActionResponse<T>;
 }
 }

 async function loadRoomFavoriteStatus() {
 if (!currentUser || !isSecretRoom) return;

 setIsFavoriteLoading(true);
 setFavoriteStatusText("");

 const result = await callPrivateAction<RoomFavoriteRow[]>(
 "list_room_favorites"
 );

 if (!result.ok) {
 setFavoriteStatusText(result.error || "读取收藏状态失败。");
 setIsFavoriteLoading(false);
 return;
 }

 const list = result.data || [];
 const exists = list.some((item) => item.room_id === roomId);

 setIsRoomFavorited(exists);
 setIsFavoriteLoading(false);
 }

 async function handleToggleRoomFavorite() {
 if (!currentUser) return;

 if (!isSecretRoom || !targetUser.secretCode) {
 setFavoriteStatusText("只有暗语私密房间可以收藏。");
 return;
 }

 setIsFavoriteLoading(true);
 setFavoriteStatusText("");
 setErrorText("");

 if (isRoomFavorited) {
 const result = await callPrivateAction<RoomFavoriteRow[]>(
 "remove_room_favorite",
 {
 roomId,
 }
 );

 if (!result.ok) {
 setFavoriteStatusText(result.error || "取消收藏失败。");
 setIsFavoriteLoading(false);
 return;
 }

 setIsRoomFavorited(false);
 setFavoriteStatusText("已取消收藏。");
 setIsFavoriteLoading(false);
 return;
 }

 const result = await callPrivateAction<RoomFavoriteRow>(
 "add_room_favorite",
 {
 roomId,
 roomName: targetUser.name || "暗语私密房间",
 secretCode: targetUser.secretCode,
 roomAvatar: targetUser.avatar || "🔐",
 }
 );

 if (!result.ok) {
 setFavoriteStatusText(result.error || "收藏房间失败。");
 setIsFavoriteLoading(false);
 return;
 }

 setIsRoomFavorited(true);
 setFavoriteStatusText("已收藏该房间。");
 setIsFavoriteLoading(false);
 }

 async function handleSendMessage() {
 const content = draft.trim();

 if (!content || !currentUser || isSending) return;

 setIsSending(true);
 setErrorText("");

 if (targetUser.id) {
 markPrivateNoticeAsRead(targetUser.id);
 }

 const result = await callSendMessage({
 scope: "private",
 roomId,
 senderId: currentUser.id,
 senderName: currentUser.name,
 senderAvatar: currentUser.avatar,
 receiverId: targetUser.id || null,
 receiverName: targetUser.id ? targetUser.name : null,
 content: content.slice(0, 500),
 messageType: "text",
 secretCode: targetUser.secretCode || null,
 });

 if (!result.ok) {
 setErrorText(result.error || "私密消息发送失败。");
 setIsSending(false);
 return;
 }

 if (result.data) {
 setMessages((oldMessages) => {
 const exists = oldMessages.some(
 (message) => message.id === result.data?.id
 );

 if (exists) return oldMessages;

 return [...oldMessages, result.data as PrivateChatMessageRow].slice(
 -200
 );
 });
 }

 setDraft("");
 setIsSending(false);
 }

 async function handleUploadMedia(file: File) {
 if (!currentUser || isUploadingMedia) return;

 setErrorText("");

 if (!canSendMediaInThisRoom) {
 setErrorText("普通会员不能发送图片或视频，请升级 VIP 后再使用媒体发送。");
 return;
 }

 const fileIsImage = isImageFile(file);
 const fileIsVideo = isVideoFile(file);

 if (!fileIsImage && !fileIsVideo) {
 setErrorText("请选择图片或视频文件。");
 return;
 }

 setIsUploadingMedia(true);

 let finalFile = file;
 let messageType: Exclude<PrivateChatMessageType, "text"> = "image";

 if (fileIsImage) {
 messageType = "image";

 try {
 finalFile = await compressImageFile(
 file,
 mediaEntitlement.imageLimitBytes
 );
 } catch (error) {
 console.error("Compress image error:", error);
 setErrorText("图片压缩失败，请换一张图片试试。");
 setIsUploadingMedia(false);
 return;
 }

 if (finalFile.size > mediaEntitlement.imageLimitBytes) {
 setErrorText(
 `图片压缩后仍超过 ${formatMediaSize(
 mediaEntitlement.imageLimitBytes
 )}，请选择更小的图片。`
 );
 setIsUploadingMedia(false);
 return;
 }
 }

 if (fileIsVideo) {
 messageType = "video";

 if (file.size > mediaEntitlement.videoLimitBytes) {
 setErrorText(
 `当前 ${mediaEntitlement.label} 视频不能超过 ${formatMediaSize(
 mediaEntitlement.videoLimitBytes
 )}，请选择更短的视频。`
 );
 setIsUploadingMedia(false);
 return;
 }
 }

 const signedUpload = await createSignedUploadUrl(finalFile, messageType);

 if (!signedUpload.ok || !signedUpload.path || !signedUpload.token) {
 setErrorText(signedUpload.error || "创建签名上传地址失败。");
 setIsUploadingMedia(false);
 return;
 }

 const { error: uploadError } = await privateChatSupabase.storage
 .from(MEDIA_BUCKET)
 .uploadToSignedUrl(signedUpload.path, signedUpload.token, finalFile, {
 contentType: finalFile.type,
 });

 if (uploadError) {
 console.error("Signed upload media error:", uploadError);
 setErrorText("媒体上传失败，请检查签名上传权限。");
 setIsUploadingMedia(false);
 return;
 }

 const markResult = await markUploadSuccess({
 mediaPath: signedUpload.path,
 fileSize: finalFile.size,
 });

 if (!markResult.ok) {
 console.error("Mark upload success error:", markResult.error);
 setErrorText(markResult.error || "媒体已上传，但上传状态标记失败，请重试。");
 setIsUploadingMedia(false);
 return;
 }

 const mediaUrl =
 signedUpload.publicUrl ||
 privateChatSupabase.storage
 .from(MEDIA_BUCKET)
 .getPublicUrl(signedUpload.path).data.publicUrl;

 const result = await callSendMessage({
 scope: "private",
 roomId,
 senderId: currentUser.id,
 senderName: currentUser.name,
 senderAvatar: currentUser.avatar,
 receiverId: targetUser.id || null,
 receiverName: targetUser.id ? targetUser.name : null,
 content: messageType === "image" ? "[图片]" : "[视频]",
 messageType,
 secretCode: targetUser.secretCode || null,
 mediaUrl,
 mediaPath: signedUpload.path,
 mediaName: file.name,
 mediaSize: finalFile.size,
 mediaMime: finalFile.type,
 });

 if (!result.ok) {
 console.error("Send media message API error:", result.error);
 setErrorText(result.error || "媒体消息发送失败。");
 setIsUploadingMedia(false);
 return;
 }

 if (result.data) {
 setMessages((oldMessages) => {
 const exists = oldMessages.some(
 (message) => message.id === result.data?.id
 );

 if (exists) return oldMessages;

 return [...oldMessages, result.data as PrivateChatMessageRow].slice(
 -200
 );
 });
 }

 setIsUploadingMedia(false);

 if (mediaInputRef.current) {
 mediaInputRef.current.value = "";
 }
 }

 function handleMediaInputChange(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.target.files?.[0];

 if (!file) return;

 handleUploadMedia(file);
 }

 async function handleDeleteMessage(message: PrivateChatMessageRow) {
 if (!currentUser) return;

 const isMine = message.sender_id === currentUser.id;

 if (!isMine) {
 setErrorText("当前只能删除自己发送的消息。");
 return;
 }

 setIsDeletingMessageId(message.id);
 setErrorText("");

 const result = await callPrivateAction("delete_message", {
 messageId: message.id,
 });

 if (!result.ok) {
 setErrorText(result.error || "删除消息失败。");
 setIsDeletingMessageId(null);
 return;
 }

 setMessages((oldMessages) =>
 oldMessages.filter((item) => item.id !== message.id)
 );

 setIsDeletingMessageId(null);
 }

 async function handleClearRoomMessages() {
 if (!currentUser) return;

 if (!clearConfirming) {
 setClearConfirming(true);

 window.setTimeout(() => {
 setClearConfirming(false);
 }, 4000);

 return;
 }

 setIsClearing(true);
 setErrorText("");

 const result = await callPrivateAction("clear_room_messages", {
 roomId,
 });

 if (!result.ok) {
 setErrorText(result.error || "清空聊天失败。");
 setIsClearing(false);
 setClearConfirming(false);
 return;
 }

 setMessages([]);
 setIsClearing(false);
 setClearConfirming(false);
 setMobileInfoOpen(false);
 }

 function handleClearLocalView() {
 setMessages([]);
 }

 function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
 if (event.key === "Enter" && !event.shiftKey) {
 event.preventDefault();
 handleSendMessage();
 }
 }

 const subtitle = isSecretRoom
 ? "你正在暗语私密房间中。知道暗语的人都可以进入同一个房间。"
 : `你正在和 ${targetUser.name} 私聊，消息已保存到 Supabase。`;

 const mediaStatusText = isCheckingMembership
 ? "正在检查会员媒体权限..."
 : canSendMediaInThisRoom
 ? `${mediaEntitlement.label} 媒体权限：图片 ${formatMediaSize(
 mediaEntitlement.imageLimitBytes
 )}，视频 ${formatMediaSize(mediaEntitlement.videoLimitBytes)}${
 mediaEntitlement.label === "Owner"
 ? "，月流量不限"
 : `，月流量 ${formatMediaSize(
 mediaEntitlement.monthlyTrafficLimitBytes
 )}`
 }`
 : "普通会员不能发送图片或视频，升级 VIP 后可使用媒体发送。";

 const roomPanel = (
 <>
 <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="flex items-center gap-3">
 <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-fuchsia-500/20 text-3xl">
 {targetUser.avatar}
 </div>

 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="truncate text-base font-semibold text-white">
 {targetUser.name}
 </h2>

 <span
 className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${entitlementBadgeClass}`}
 >
 {isCheckingMembership ? "检查中" : mediaEntitlement.label}
 </span>
 </div>

 <p className="mt-1 text-xs leading-5 text-slate-400">
 {isSecretRoom ? "暗语多人房间" : "一对一私聊房间"} ·{" "}
 {isCheckingMembership ? "正在检查会员权限" : entitlementShortText}
 </p>
 </div>
 </div>

 <div className={`mt-4 rounded-3xl border p-3 ${entitlementBadgeClass}`}>
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-xs font-semibold">
 当前账号：{isCheckingMembership ? "检查中" : mediaEntitlement.label}
 </p>
 <p className="mt-1 text-[11px] leading-5 opacity-80">
 {mediaEntitlement.desc}
 </p>
 </div>

 <span className="shrink-0 rounded-full bg-black/10 px-2 py-1 text-[10px]">
 {entitlementShortText}
 </span>
 </div>

 <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] opacity-80">
 <span>图片：{formatMediaSize(mediaEntitlement.imageLimitBytes)}</span>
 <span>视频：{formatMediaSize(mediaEntitlement.videoLimitBytes)}</span>
 </div>
 </div>

 {isSecretRoom ? (
 <div className="mt-4 rounded-2xl bg-fuchsia-500/10 p-3">
 <p className="text-xs text-fuchsia-100/80">当前暗语</p>
 <p className="mt-1 break-all text-sm font-medium text-fuchsia-100">
 {targetUser.secretCode}
 </p>

 <button
 type="button"
 onClick={handleToggleRoomFavorite}
 disabled={isFavoriteLoading}
 className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
 isRoomFavorited
 ? "border border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
 : "bg-fuchsia-500 text-white hover:bg-fuchsia-400"
 }`}
 >
 {isFavoriteLoading
 ? "处理中..."
 : isRoomFavorited
 ? "已收藏 · 点击取消"
 : "收藏这个私密房间"}
 </button>

 {favoriteStatusText ? (
 <p className="mt-2 text-xs leading-5 text-slate-400">
 {favoriteStatusText}
 </p>
 ) : (
 <p className="mt-2 text-xs leading-5 text-slate-500">
 收藏后会出现在公共大厅的“我的私密房间”里，下次可直接进入。
 </p>
 )}
 </div>
 ) : null}

 <div
 className={`mt-4 rounded-2xl p-3 text-xs leading-5 ${
 canSendMediaInThisRoom
 ? "bg-emerald-400/10 text-emerald-100"
 : "bg-amber-400/10 text-amber-100"
 }`}
 >
 {mediaStatusText}
 </div>

 {isAdminMediaRoom ? (
 <div className="mt-3 rounded-2xl bg-purple-400/10 p-3 text-xs leading-5 text-purple-100">
 当前暗语属于管理员媒体房标记房间；实际发送权限仍按会员等级 / 管理员身份控制。
 </div>
 ) : null}

 <div className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
 当前房间在线人数：{onlineUsers.length} 人
 </div>
 </div>

 <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-white">房间成员</h3>
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

 return (
 <div
 key={user.id}
 className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
 {user.avatar}
 </span>

 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm text-white">
 {user.name}
 {isMe ? "（我）" : ""}
 </span>
 <span className="block text-xs text-emerald-300/80">
 在线
 </span>
 </span>
 </div>
 );
 })
 )}
 </div>
 </div>

 <button
 type="button"
 onClick={handleClearLocalView}
 className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
 >
 只清空本机显示
 </button>

 <p className="mt-2 px-1 text-xs leading-5 text-slate-500">
 这个按钮只清空当前浏览器显示，不删除云端消息。
 </p>

 <button
 type="button"
 onClick={handleClearRoomMessages}
 disabled={isClearing}
 className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
 clearConfirming
 ? "bg-rose-500 text-white hover:bg-rose-400"
 : "border border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
 }`}
 >
 {isClearing
 ? "清空中..."
 : clearConfirming
 ? "再次点击确认清空"
 : "一键清空聊天内容"}
 </button>

 <p className="mt-2 px-1 text-xs leading-5 text-rose-200/70">
 会删除当前房间所有人的云端聊天记录和媒体文件，请谨慎操作。
 </p>
 </>
 );

 return (
 <PrivateChatShell
 title="私密聊天"
 subtitle={subtitle}
 rightSlot={
 <div className="flex items-center gap-2">
 {isSecretRoom ? (
 <button
 type="button"
 onClick={handleToggleRoomFavorite}
 disabled={isFavoriteLoading}
 className={`rounded-2xl px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
 isRoomFavorited
 ? "bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
 : "bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-500/30"
 }`}
 >
 {isFavoriteLoading
 ? "处理中"
 : isRoomFavorited
 ? "已收藏"
 : "收藏房间"}
 </button>
 ) : null}

 <Link
 href="/private-chat"
 className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/15 hover:text-white"
 >
 返回大厅
 </Link>
 </div>
 }
 >
 <div className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr]">
 <aside className="hidden min-h-0 overflow-y-auto border-r border-white/10 bg-slate-950/40 p-4 lg:block">
 {roomPanel}
 </aside>

 <section className="flex h-full min-h-0 flex-col overflow-hidden">
 <div className="shrink-0 border-b border-white/10 bg-slate-950/50 px-3 py-3 sm:px-6 sm:py-4">
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="truncate text-base font-semibold text-white sm:text-lg">
 {isSecretRoom ? "暗语私密房间" : targetUser.name}
 </h2>

 <span
 className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${entitlementBadgeClass}`}
 >
 {isCheckingMembership ? "检查中" : mediaEntitlement.label}
 </span>

 {!isCheckingMembership ? (
 <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-300 sm:inline-flex">
 {entitlementShortText}
 </span>
 ) : null}
 </div>

 <p className="mt-1 truncate text-xs leading-5 text-slate-400">
 {isCheckingMediaRoom || isCheckingMembership
 ? "正在检查权限..."
 : canSendMediaInThisRoom
 ? `${isSecretRoom ? "暗语房" : "私聊"} · ${
 mediaEntitlement.label
 } 可发送图片 / 视频`
 : isSecretRoom
 ? isRoomFavorited
 ? "已收藏 · 普通会员仅支持文字消息"
 : "普通会员仅支持文字消息"
 : "一对一私聊房间 · 普通会员仅支持文字消息"}
 </p>
 </div>

 <div className="flex shrink-0 items-center gap-2">
 <span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
 在线 {onlineUsers.length}
 </span>

 <button
 type="button"
 onClick={() => setMobileInfoOpen(true)}
 className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 lg:hidden"
 >
 房间信息
 </button>
 </div>
 </div>
 </div>

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
 正在连接私密聊天...
 </div>
 </div>
 ) : messages.length === 0 ? (
 <div className="flex h-full items-center justify-center">
 <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-fuchsia-500/20 text-3xl">
 🔐
 </div>

 <div className="flex flex-wrap items-center justify-center gap-2">
 <h2 className="text-lg font-semibold text-white">
 私密聊天还没有消息
 </h2>

 <span
 className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${entitlementBadgeClass}`}
 >
 {isCheckingMembership ? "检查中" : mediaEntitlement.label}
 </span>
 </div>

 <p className="mt-2 text-sm leading-6 text-slate-400">
 {isCheckingMediaRoom || isCheckingMembership
 ? "正在检查当前账号的会员权益和媒体权限。"
 : canSendMediaInThisRoom
 ? `当前账号为 ${mediaEntitlement.label}，可以发送文字、图片和视频。`
 : isSecretRoom
 ? "这是一个多人暗语房间。普通会员只能发送文字，升级 VIP 后可发送图片和视频。"
 : "当前是一对一私聊房间。普通会员只能发送文字，升级 VIP 后可发送图片和视频。"}
 </p>
 </div>
 </div>
 ) : (
 messages.map((message) => {
 const isMe = currentUser?.id === message.sender_id;
 const messageType = message.message_type || "text";
 const isImageMessage =
 messageType === "image" && message.media_url;
 const isVideoMessage =
 messageType === "video" && message.media_url;

 return (
 <div
 key={message.id}
 className={`flex gap-2 sm:gap-3 ${
 isMe ? "justify-end" : "justify-start"
 }`}
 >
 {!isMe ? (
 <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg sm:h-10 sm:w-10 sm:text-xl">
 {message.sender_avatar || targetUser.avatar}
 </div>
 ) : null}

 <div className={isMe ? "max-w-[82%]" : "max-w-[82%]"}>
 <div
 className={`mb-1 flex items-center gap-2 text-xs ${
 isMe
 ? "justify-end text-fuchsia-200/80"
 : "text-slate-400"
 }`}
 >
 <span>{isMe ? "我" : message.sender_name}</span>
 {isMe ? (
 <span
 className={`rounded-full border px-1.5 py-0.5 text-[9px] ${entitlementBadgeClass}`}
 >
 {mediaEntitlement.label}
 </span>
 ) : null}
 <span>{formatPrivateChatTime(message.created_at)}</span>
 </div>

 {isImageMessage ? (
 <div
 className={`overflow-hidden rounded-3xl shadow-lg ${
 isMe
 ? "rounded-tr-lg bg-fuchsia-500/20 shadow-fuchsia-950/30"
 : "rounded-tl-lg bg-white/10 shadow-black/20"
 }`}
 >
 <a
 href={message.media_url || "#"}
 target="_blank"
 rel="noreferrer"
 className="block"
 title="点击查看原图"
 >
 <img
 src={message.media_url || ""}
 alt={message.media_name || "图片消息"}
 className="max-h-80 w-full max-w-[76vw] object-cover sm:max-w-sm"
 />
 </a>

 <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-300">
 <span className="block truncate">
 {message.media_name || "图片"}
 </span>
 <span className="text-slate-500">
 {formatMediaSize(message.media_size)}
 </span>

 {isMe ? (
 <button
 type="button"
 onClick={() => handleDeleteMessage(message)}
 disabled={isDeletingMessageId === message.id}
 className="mt-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isDeletingMessageId === message.id
 ? "删除中..."
 : "删除图片"}
 </button>
 ) : null}
 </div>
 </div>
 ) : isVideoMessage ? (
 <div
 className={`overflow-hidden rounded-3xl shadow-lg ${
 isMe
 ? "rounded-tr-lg bg-fuchsia-500/20 shadow-fuchsia-950/30"
 : "rounded-tl-lg bg-white/10 shadow-black/20"
 }`}
 >
 <video
 src={message.media_url || ""}
 controls
 playsInline
 preload="metadata"
 className="max-h-96 w-full max-w-[76vw] bg-black sm:max-w-sm"
 />

 <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-300">
 <span className="block truncate">
 {message.media_name || "视频"}
 </span>
 <span className="text-slate-500">
 {formatMediaSize(message.media_size)}
 </span>

 {isMe ? (
 <button
 type="button"
 onClick={() => handleDeleteMessage(message)}
 disabled={isDeletingMessageId === message.id}
 className="mt-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isDeletingMessageId === message.id
 ? "删除中..."
 : "删除视频"}
 </button>
 ) : null}
 </div>
 </div>
 ) : (
 <div
 className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ${
 isMe
 ? "rounded-tr-lg bg-fuchsia-500 text-white shadow-fuchsia-950/30"
 : "rounded-tl-lg bg-white/10 text-slate-100 shadow-black/20"
 }`}
 >
 {message.content}
 </div>
 )}
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
 <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
 <span
 className={`rounded-full border px-2.5 py-1 font-semibold ${entitlementBadgeClass}`}
 >
 {isCheckingMembership ? "会员检查中" : mediaEntitlement.label}
 </span>

 <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">
 {isCheckingMembership ? "正在读取权限" : entitlementShortText}
 </span>
 </div>

 <div className="flex items-end gap-2 sm:gap-3">
 {canSendMediaInThisRoom ? (
 <>
 <input
 ref={mediaInputRef}
 type="file"
 accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
 onChange={handleMediaInputChange}
 className="hidden"
 />

 <button
 type="button"
 onClick={() => mediaInputRef.current?.click()}
 disabled={isUploadingMedia}
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl border border-amber-300/20 bg-amber-400/10 text-2xl font-light text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
 title="发送图片或视频"
 >
 {isUploadingMedia ? "…" : "+"}
 </button>
 </>
 ) : null}

 <textarea
 value={draft}
 onChange={(event) => setDraft(event.target.value)}
 onKeyDown={handleKeyDown}
 rows={1}
 maxLength={500}
 placeholder={
 isCheckingMediaRoom || isCheckingMembership
 ? "正在检查权限..."
 : canSendMediaInThisRoom
 ? "输入消息，或点 + 发媒体..."
 : "输入私密消息..."
 }
 className="min-h-11 flex-1 resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-400/50 sm:min-h-12 sm:leading-6"
 />

 <button
 type="button"
 onClick={handleSendMessage}
 disabled={isSending}
 className="h-11 shrink-0 rounded-3xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5"
 >
 {isSending ? "发送中" : "发送"}
 </button>
 </div>

 <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
 <span>
 {isCheckingMediaRoom || isCheckingMembership
 ? "正在检查会员媒体权限..."
 : canSendMediaInThisRoom
 ? `${mediaEntitlement.label} 可发图片 / 视频 · 图片 ${formatMediaSize(
 mediaEntitlement.imageLimitBytes
 )} · 视频 ${formatMediaSize(
 mediaEntitlement.videoLimitBytes
 )}`
 : isSecretRoom
 ? isRoomFavorited
 ? "暗语多人私密房间 · 已收藏 · 普通会员仅文字"
 : "暗语多人私密房间 · 普通会员仅文字"
 : "一对一私聊 · 普通会员仅文字"}
 </span>

 <Link
 href="/private-chat"
 className="text-slate-400 underline decoration-white/20 underline-offset-4 transition hover:text-white"
 >
 返回公共聊天室
 </Link>
 </div>
 </div>
 </section>

 {mobileInfoOpen ? (
 <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden">
 <button
 type="button"
 onClick={() => setMobileInfoOpen(false)}
 className="fixed right-4 top-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/95 text-3xl leading-none text-white shadow-2xl shadow-black/60 transition hover:bg-white/15"
 aria-label="关闭房间信息"
 >
 ×
 </button>

 <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-slate-950 p-4 pt-16 shadow-2xl shadow-black/60">
 {roomPanel}
 </div>
 </div>
 ) : null}
 </div>
 </PrivateChatShell>
 );
}
