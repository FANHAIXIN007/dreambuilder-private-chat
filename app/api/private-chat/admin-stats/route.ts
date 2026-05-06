import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminRole = "owner" | "admin";

type MediaUploadStatus =
 | "signed"
 | "uploaded"
 | "message_sent"
 | "deleted"
 | "failed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MONTHLY_TRAFFIC_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

const configuredStorageLimit = Number(
 process.env.PRIVATE_CHAT_STORAGE_LIMIT_BYTES || DEFAULT_STORAGE_LIMIT_BYTES
);

const configuredMonthlyTrafficLimit = Number(
 process.env.PRIVATE_CHAT_MONTHLY_TRAFFIC_LIMIT_BYTES ||
 DEFAULT_MONTHLY_TRAFFIC_LIMIT_BYTES
);

const storageLimitBytes = Number.isFinite(configuredStorageLimit)
 ? Math.max(1, configuredStorageLimit)
 : DEFAULT_STORAGE_LIMIT_BYTES;

const monthlyTrafficLimitBytes = Number.isFinite(
 configuredMonthlyTrafficLimit
)
 ? Math.max(1, configuredMonthlyTrafficLimit)
 : DEFAULT_MONTHLY_TRAFFIC_LIMIT_BYTES;

const MEDIA_BUCKET = "private-chat-media";

if (!supabaseUrl) {
 throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
 throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
});

function requireText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

async function getAdminRole(userId: string): Promise<AdminRole | null> {
 const { data, error } = await supabaseAdmin
 .from("private_chat_admins")
 .select("role")
 .eq("user_id", userId)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();

 if (error || !data?.role) {
 return null;
 }

 if (data.role === "owner" || data.role === "admin") {
 return data.role;
 }

 return null;
}

function getStartOfTodayIso() {
 const now = new Date();
 now.setHours(0, 0, 0, 0);
 return now.toISOString();
}

function getStartOfCurrentMonthIso() {
 const now = new Date();
 const start = new Date(now.getFullYear(), now.getMonth(), 1);
 start.setHours(0, 0, 0, 0);
 return start.toISOString();
}

function getCurrentMonthLabel() {
 const now = new Date();
 return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function safeNumber(value: unknown) {
 const numberValue = Number(value);

 if (!Number.isFinite(numberValue)) return 0;

 return Math.max(0, numberValue);
}

function safeStatus(value: unknown): MediaUploadStatus {
 if (
 value === "signed" ||
 value === "uploaded" ||
 value === "message_sent" ||
 value === "deleted" ||
 value === "failed"
 ) {
 return value;
 }

 return "signed";
}

async function countRows(table: string) {
 const { count, error } = await supabaseAdmin
 .from(table)
 .select("*", {
 count: "exact",
 head: true,
 });

 if (error) {
 throw new Error(error.message);
 }

 return count || 0;
}

async function countRowsWithFilter(
 table: string,
 filter: (query: unknown) => unknown
) {
 const baseQuery = supabaseAdmin
 .from(table)
 .select("*", {
 count: "exact",
 head: true,
 });

 const finalQuery = filter(baseQuery) as Promise<{
 count: number | null;
 error: { message: string } | null;
 }>;

 const { count, error } = await finalQuery;

 if (error) {
 throw new Error(error.message);
 }

 return count || 0;
}

async function getPrivateMediaStats() {
 const { data, error } = await supabaseAdmin
 .from("private_chat_messages")
 .select("message_type, media_size, created_at")
 .in("message_type", ["image", "video"])
 .not("media_path", "is", null)
 .limit(10000);

 if (error) {
 throw new Error(error.message);
 }

 const todayStart = getStartOfTodayIso();
 const monthStart = getStartOfCurrentMonthIso();

 let mediaMessageCount = 0;
 let imageCount = 0;
 let videoCount = 0;
 let mediaSizeBytesFromMessages = 0;

 let todayMediaSizeBytes = 0;
 let todayMediaCount = 0;

 let monthlyMediaSizeBytes = 0;
 let monthlyMediaCount = 0;
 let monthlyImageCount = 0;
 let monthlyVideoCount = 0;

 (data || []).forEach((row) => {
 const mediaSize = safeNumber(row.media_size);
 const createdAt = row.created_at || "";

 mediaMessageCount += 1;
 mediaSizeBytesFromMessages += mediaSize;

 if (row.message_type === "image") {
 imageCount += 1;
 }

 if (row.message_type === "video") {
 videoCount += 1;
 }

 if (createdAt && createdAt >= todayStart) {
 todayMediaCount += 1;
 todayMediaSizeBytes += mediaSize;
 }

 if (createdAt && createdAt >= monthStart) {
 monthlyMediaCount += 1;
 monthlyMediaSizeBytes += mediaSize;

 if (row.message_type === "image") {
 monthlyImageCount += 1;
 }

 if (row.message_type === "video") {
 monthlyVideoCount += 1;
 }
 }
 });

 return {
 mediaMessageCount,
 imageCount,
 videoCount,
 mediaSizeBytesFromMessages,
 todayMediaCount,
 todayMediaSizeBytes,
 monthlyMediaCount,
 monthlyMediaSizeBytes,
 monthlyImageCount,
 monthlyVideoCount,
 };
}

async function getHistoricalMediaUsageStats() {
 const { data, error } = await supabaseAdmin
 .from("private_chat_media_usage_logs")
 .select("message_type, media_size, is_deleted, created_at, deleted_at")
 .limit(50000);

 if (error) {
 console.error("Read private_chat_media_usage_logs error:", error);

 return {
 usageLogsReadable: false,
 historicalUploadBytes: 0,
 activeUploadBytes: 0,
 deletedUploadBytes: 0,
 historicalMediaCount: 0,
 activeMediaCount: 0,
 deletedMediaCount: 0,
 historicalImageCount: 0,
 historicalVideoCount: 0,
 activeImageCount: 0,
 activeVideoCount: 0,
 deletedImageCount: 0,
 deletedVideoCount: 0,
 todayHistoricalUploadBytes: 0,
 todayHistoricalMediaCount: 0,
 todayDeletedUploadBytes: 0,
 todayDeletedMediaCount: 0,
 monthlyUploadBytes: 0,
 monthlyMediaCount: 0,
 monthlyImageCount: 0,
 monthlyVideoCount: 0,
 monthlyDeletedUploadBytes: 0,
 monthlyDeletedMediaCount: 0,
 };
 }

 const todayStart = getStartOfTodayIso();
 const monthStart = getStartOfCurrentMonthIso();

 let historicalUploadBytes = 0;
 let activeUploadBytes = 0;
 let deletedUploadBytes = 0;

 let historicalMediaCount = 0;
 let activeMediaCount = 0;
 let deletedMediaCount = 0;

 let historicalImageCount = 0;
 let historicalVideoCount = 0;

 let activeImageCount = 0;
 let activeVideoCount = 0;

 let deletedImageCount = 0;
 let deletedVideoCount = 0;

 let todayHistoricalUploadBytes = 0;
 let todayHistoricalMediaCount = 0;

 let todayDeletedUploadBytes = 0;
 let todayDeletedMediaCount = 0;

 let monthlyUploadBytes = 0;
 let monthlyMediaCount = 0;
 let monthlyImageCount = 0;
 let monthlyVideoCount = 0;

 let monthlyDeletedUploadBytes = 0;
 let monthlyDeletedMediaCount = 0;

 (data || []).forEach((row) => {
 const size = safeNumber(row.media_size);
 const isDeleted = Boolean(row.is_deleted);
 const messageType = row.message_type;
 const createdAt = row.created_at || "";
 const deletedAt = row.deleted_at || "";

 historicalUploadBytes += size;
 historicalMediaCount += 1;

 if (messageType === "image") {
 historicalImageCount += 1;
 }

 if (messageType === "video") {
 historicalVideoCount += 1;
 }

 if (isDeleted) {
 deletedUploadBytes += size;
 deletedMediaCount += 1;

 if (messageType === "image") {
 deletedImageCount += 1;
 }

 if (messageType === "video") {
 deletedVideoCount += 1;
 }
 } else {
 activeUploadBytes += size;
 activeMediaCount += 1;

 if (messageType === "image") {
 activeImageCount += 1;
 }

 if (messageType === "video") {
 activeVideoCount += 1;
 }
 }

 if (createdAt && createdAt >= todayStart) {
 todayHistoricalUploadBytes += size;
 todayHistoricalMediaCount += 1;
 }

 if (deletedAt && deletedAt >= todayStart) {
 todayDeletedUploadBytes += size;
 todayDeletedMediaCount += 1;
 }

 if (createdAt && createdAt >= monthStart) {
 monthlyUploadBytes += size;
 monthlyMediaCount += 1;

 if (messageType === "image") {
 monthlyImageCount += 1;
 }

 if (messageType === "video") {
 monthlyVideoCount += 1;
 }
 }

 if (deletedAt && deletedAt >= monthStart) {
 monthlyDeletedUploadBytes += size;
 monthlyDeletedMediaCount += 1;
 }
 });

 return {
 usageLogsReadable: true,
 historicalUploadBytes,
 activeUploadBytes,
 deletedUploadBytes,
 historicalMediaCount,
 activeMediaCount,
 deletedMediaCount,
 historicalImageCount,
 historicalVideoCount,
 activeImageCount,
 activeVideoCount,
 deletedImageCount,
 deletedVideoCount,
 todayHistoricalUploadBytes,
 todayHistoricalMediaCount,
 todayDeletedUploadBytes,
 todayDeletedMediaCount,
 monthlyUploadBytes,
 monthlyMediaCount,
 monthlyImageCount,
 monthlyVideoCount,
 monthlyDeletedUploadBytes,
 monthlyDeletedMediaCount,
 };
}

async function getMediaUploadIntentStats() {
 const { data, error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .select(
 "message_type, file_size, status, created_at, updated_at, sent_at, deleted_at"
 )
 .limit(50000);

 if (error) {
 console.error("Read private_chat_media_uploads error:", error);

 return {
 uploadIntentsReadable: false,

 totalIntentCount: 0,
 signedCount: 0,
 uploadedCount: 0,
 messageSentCount: 0,
 deletedCount: 0,
 failedCount: 0,

 totalIntentBytes: 0,
 signedBytes: 0,
 uploadedBytes: 0,
 messageSentBytes: 0,
 deletedBytes: 0,
 failedBytes: 0,

 imageIntentCount: 0,
 videoIntentCount: 0,

 todayIntentCount: 0,
 todayIntentBytes: 0,
 todayMessageSentCount: 0,
 todayMessageSentBytes: 0,
 todayDeletedCount: 0,
 todayDeletedBytes: 0,

 monthlyIntentCount: 0,
 monthlyIntentBytes: 0,
 monthlyMessageSentCount: 0,
 monthlyMessageSentBytes: 0,
 monthlyDeletedCount: 0,
 monthlyDeletedBytes: 0,
 monthlyImageIntentCount: 0,
 monthlyVideoIntentCount: 0,
 };
 }

 const todayStart = getStartOfTodayIso();
 const monthStart = getStartOfCurrentMonthIso();

 let totalIntentCount = 0;
 let signedCount = 0;
 let uploadedCount = 0;
 let messageSentCount = 0;
 let deletedCount = 0;
 let failedCount = 0;

 let totalIntentBytes = 0;
 let signedBytes = 0;
 let uploadedBytes = 0;
 let messageSentBytes = 0;
 let deletedBytes = 0;
 let failedBytes = 0;

 let imageIntentCount = 0;
 let videoIntentCount = 0;

 let todayIntentCount = 0;
 let todayIntentBytes = 0;
 let todayMessageSentCount = 0;
 let todayMessageSentBytes = 0;
 let todayDeletedCount = 0;
 let todayDeletedBytes = 0;

 let monthlyIntentCount = 0;
 let monthlyIntentBytes = 0;
 let monthlyMessageSentCount = 0;
 let monthlyMessageSentBytes = 0;
 let monthlyDeletedCount = 0;
 let monthlyDeletedBytes = 0;
 let monthlyImageIntentCount = 0;
 let monthlyVideoIntentCount = 0;

 (data || []).forEach((row) => {
 const size = safeNumber(row.file_size);
 const status = safeStatus(row.status);
 const messageType = row.message_type;
 const createdAt = row.created_at || "";
 const sentAt = row.sent_at || "";
 const deletedAt = row.deleted_at || "";

 totalIntentCount += 1;
 totalIntentBytes += size;

 if (messageType === "image") {
 imageIntentCount += 1;
 }

 if (messageType === "video") {
 videoIntentCount += 1;
 }

 if (status === "signed") {
 signedCount += 1;
 signedBytes += size;
 }

 if (status === "uploaded") {
 uploadedCount += 1;
 uploadedBytes += size;
 }

 if (status === "message_sent") {
 messageSentCount += 1;
 messageSentBytes += size;
 }

 if (status === "deleted") {
 deletedCount += 1;
 deletedBytes += size;
 }

 if (status === "failed") {
 failedCount += 1;
 failedBytes += size;
 }

 if (createdAt && createdAt >= todayStart) {
 todayIntentCount += 1;
 todayIntentBytes += size;
 }

 if (sentAt && sentAt >= todayStart) {
 todayMessageSentCount += 1;
 todayMessageSentBytes += size;
 }

 if (deletedAt && deletedAt >= todayStart) {
 todayDeletedCount += 1;
 todayDeletedBytes += size;
 }

 if (createdAt && createdAt >= monthStart) {
 monthlyIntentCount += 1;
 monthlyIntentBytes += size;

 if (messageType === "image") {
 monthlyImageIntentCount += 1;
 }

 if (messageType === "video") {
 monthlyVideoIntentCount += 1;
 }
 }

 if (sentAt && sentAt >= monthStart) {
 monthlyMessageSentCount += 1;
 monthlyMessageSentBytes += size;
 }

 if (deletedAt && deletedAt >= monthStart) {
 monthlyDeletedCount += 1;
 monthlyDeletedBytes += size;
 }
 });

 return {
 uploadIntentsReadable: true,

 totalIntentCount,
 signedCount,
 uploadedCount,
 messageSentCount,
 deletedCount,
 failedCount,

 totalIntentBytes,
 signedBytes,
 uploadedBytes,
 messageSentBytes,
 deletedBytes,
 failedBytes,

 imageIntentCount,
 videoIntentCount,

 todayIntentCount,
 todayIntentBytes,
 todayMessageSentCount,
 todayMessageSentBytes,
 todayDeletedCount,
 todayDeletedBytes,

 monthlyIntentCount,
 monthlyIntentBytes,
 monthlyMessageSentCount,
 monthlyMessageSentBytes,
 monthlyDeletedCount,
 monthlyDeletedBytes,
 monthlyImageIntentCount,
 monthlyVideoIntentCount,
 };
}

async function getStorageStatsFromObjects() {
 // Supabase REST 默认不暴露 storage schema。
 // 这里不再直接读取 storage.objects，避免 owner 监控刷新时持续打印：
 // Invalid schema: storage
 //
 // 平台统计会自动回退到：
 // 1. private_chat_media_usage_logs.active
 // 2. private_chat_media_uploads
 // 3. private_chat_messages.media_size
 return {
 storageObjectCount: 0,
 storageSizeBytes: 0,
 todayStorageObjectCount: 0,
 todayStorageSizeBytes: 0,
 storageObjectsReadable: false,
 };
}

type SiteVisitRow = {
 visitor_id: string | null;
 session_id: string | null;
 account_id?: string | null;
 chat_user_id?: string | null;
 user_name?: string | null;
 path: string | null;
 page_title?: string | null;
 source: string | null;
 created_at: string | null;
};

type SitePresenceRow = {
 visitor_id: string | null;
 session_id: string | null;
 account_id?: string | null;
 chat_user_id?: string | null;
 user_name?: string | null;
 path: string | null;
 source: string | null;
 is_online: boolean | null;
 last_seen_at: string | null;
 updated_at: string | null;
};

function getStartOfCurrentWeekIso() {
 const now = new Date();
 const day = now.getDay();
 const diffToMonday = day === 0 ? 6 : day - 1;

 const start = new Date(now);
 start.setDate(now.getDate() - diffToMonday);
 start.setHours(0, 0, 0, 0);

 return start.toISOString();
}

function getIsoDaysAgo(days: number) {
 const now = new Date();
 const start = new Date(now);
 start.setDate(now.getDate() - days);
 start.setHours(0, 0, 0, 0);

 return start.toISOString();
}

function getDateLabel(date: Date) {
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
 2,
 "0"
 )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getHourLabel(date: Date) {
 return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
 date.getDate()
 ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
}

function addToSet(map: Map<string, Set<string>>, key: string, value: string) {
 const oldSet = map.get(key) || new Set<string>();
 oldSet.add(value);
 map.set(key, oldSet);
}

function getSafeVisitorId(row: SiteVisitRow | SitePresenceRow) {
 return row.visitor_id || row.session_id || row.chat_user_id || "";
}

function getSafeSessionId(row: SiteVisitRow | SitePresenceRow) {
 return row.session_id || row.visitor_id || row.chat_user_id || "";
}

async function getSiteTrafficStats() {
 const now = Date.now();
 const todayStart = getStartOfTodayIso();
 const weekStart = getStartOfCurrentWeekIso();
 const monthStart = getStartOfCurrentMonthIso();
 const sevenDaysStart = getIsoDaysAgo(6);
 const thirtyDaysStart = getIsoDaysAgo(29);
 const twentyFourHoursAgoIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();

 const [
 visitsResult,
 allVisitsResult,
 presenceResult,
 todayPv,
 weekPv,
 monthPv,
 totalPv,
 ] = await Promise.all([
 supabaseAdmin
 .from("private_chat_site_visits")
 .select(
 "visitor_id,session_id,account_id,chat_user_id,user_name,path,page_title,source,created_at"
 )
 .gte("created_at", thirtyDaysStart)
 .order("created_at", { ascending: false })
 .limit(50000),
 supabaseAdmin
 .from("private_chat_site_visits")
 .select("visitor_id,session_id,chat_user_id,created_at")
 .order("created_at", { ascending: false })
 .limit(50000),
 supabaseAdmin
 .from("private_chat_site_presence")
 .select(
 "visitor_id,session_id,account_id,chat_user_id,user_name,path,source,is_online,last_seen_at,updated_at"
 )
 .order("updated_at", { ascending: false })
 .limit(10000),
 countRowsWithFilter("private_chat_site_visits", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).gte("created_at", todayStart)
 ),
 countRowsWithFilter("private_chat_site_visits", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).gte("created_at", weekStart)
 ),
 countRowsWithFilter("private_chat_site_visits", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).gte("created_at", monthStart)
 ),
 countRows("private_chat_site_visits"),
 ]);

 if (visitsResult.error) {
 console.error("Read private_chat_site_visits error:", visitsResult.error);
 }

 if (allVisitsResult.error) {
 console.error("Read all private_chat_site_visits error:", allVisitsResult.error);
 }

 if (presenceResult.error) {
 console.error("Read private_chat_site_presence error:", presenceResult.error);
 }

 const visits = ((visitsResult.data || []) as SiteVisitRow[]).filter(
 (row) => Boolean(row.created_at)
 );

 const allVisits = ((allVisitsResult.data || []) as SiteVisitRow[]).filter(
 (row) => Boolean(row.created_at)
 );

 const presence = ((presenceResult.data || []) as SitePresenceRow[]).filter(
 (row) => Boolean(row.updated_at || row.last_seen_at)
 );

 const todayVisitors = new Set<string>();
 const weekVisitors = new Set<string>();
 const monthVisitors = new Set<string>();
 const totalVisitors = new Set<string>();

 const todaySessions = new Set<string>();
 const weekSessions = new Set<string>();
 const monthSessions = new Set<string>();
 const totalSessions = new Set<string>();

 const sourceCountMap = new Map<string, number>();
 const pathCountMap = new Map<string, number>();

 const weeklyPvMap = new Map<string, number>();
 const weeklyUvMap = new Map<string, Set<string>>();

 const monthlyPvMap = new Map<string, number>();
 const monthlyUvMap = new Map<string, Set<string>>();

 const hourlyPvMap = new Map<string, number>();
 const hourlyUvMap = new Map<string, Set<string>>();

 for (let index = 6; index >= 0; index -= 1) {
 const date = new Date();
 date.setDate(date.getDate() - index);
 date.setHours(0, 0, 0, 0);

 const label = getDateLabel(date);
 weeklyPvMap.set(label, 0);
 weeklyUvMap.set(label, new Set<string>());
 }

 for (let index = 29; index >= 0; index -= 1) {
 const date = new Date();
 date.setDate(date.getDate() - index);
 date.setHours(0, 0, 0, 0);

 const label = getDateLabel(date);
 monthlyPvMap.set(label, 0);
 monthlyUvMap.set(label, new Set<string>());
 }

 for (let index = 23; index >= 0; index -= 1) {
 const date = new Date(now - index * 60 * 60 * 1000);
 date.setMinutes(0, 0, 0);

 const label = getHourLabel(date);
 hourlyPvMap.set(label, 0);
 hourlyUvMap.set(label, new Set<string>());
 }

 allVisits.forEach((row) => {
 const visitorId = getSafeVisitorId(row);
 const sessionId = getSafeSessionId(row);

 if (visitorId) totalVisitors.add(visitorId);
 if (sessionId) totalSessions.add(sessionId);
 });

 visits.forEach((row) => {
 const createdAt = row.created_at || "";
 const visitorId = getSafeVisitorId(row);
 const sessionId = getSafeSessionId(row);

 if (row.source) {
 sourceCountMap.set(row.source, (sourceCountMap.get(row.source) || 0) + 1);
 }

 if (row.path) {
 pathCountMap.set(row.path, (pathCountMap.get(row.path) || 0) + 1);
 }

 if (createdAt >= todayStart) {
 if (visitorId) todayVisitors.add(visitorId);
 if (sessionId) todaySessions.add(sessionId);
 }

 if (createdAt >= weekStart) {
 if (visitorId) weekVisitors.add(visitorId);
 if (sessionId) weekSessions.add(sessionId);
 }

 if (createdAt >= monthStart) {
 if (visitorId) monthVisitors.add(visitorId);
 if (sessionId) monthSessions.add(sessionId);
 }

 if (createdAt >= sevenDaysStart) {
 const date = new Date(createdAt);
 const label = getDateLabel(date);

 if (weeklyPvMap.has(label)) {
 weeklyPvMap.set(label, (weeklyPvMap.get(label) || 0) + 1);

 if (visitorId) {
 addToSet(weeklyUvMap, label, visitorId);
 }
 }
 }

 if (createdAt >= thirtyDaysStart) {
 const date = new Date(createdAt);
 const label = getDateLabel(date);

 if (monthlyPvMap.has(label)) {
 monthlyPvMap.set(label, (monthlyPvMap.get(label) || 0) + 1);

 if (visitorId) {
 addToSet(monthlyUvMap, label, visitorId);
 }
 }
 }

 if (createdAt >= twentyFourHoursAgoIso) {
 const date = new Date(createdAt);
 date.setMinutes(0, 0, 0);

 const label = getHourLabel(date);

 if (hourlyPvMap.has(label)) {
 hourlyPvMap.set(label, (hourlyPvMap.get(label) || 0) + 1);

 if (visitorId) {
 addToSet(hourlyUvMap, label, visitorId);
 }
 }
 }
 });

 const onlineSessionIds = new Set<string>();
 const activeFiveMinuteSessionIds = new Set<string>();
 const activeFiveMinuteVisitorIds = new Set<string>();

 presence.forEach((row) => {
 const lastSeenRaw = row.last_seen_at || row.updated_at || "";
 const lastSeenTime = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
 const sessionId = getSafeSessionId(row);
 const visitorId = getSafeVisitorId(row);

 if (!Number.isFinite(lastSeenTime) || !sessionId) return;

 const diffMs = now - lastSeenTime;

 if (row.is_online && diffMs <= 90 * 1000) {
 onlineSessionIds.add(sessionId);
 }

 if (diffMs <= 5 * 60 * 1000) {
 activeFiveMinuteSessionIds.add(sessionId);

 if (visitorId) {
 activeFiveMinuteVisitorIds.add(visitorId);
 }
 }
 });

 const topSources = Array.from(sourceCountMap.entries())
 .map(([source, count]) => ({
 source,
 count,
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 8);

 const topPaths = Array.from(pathCountMap.entries())
 .map(([path, count]) => ({
 path,
 count,
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 8);

 const dailyVisits = Array.from(weeklyPvMap.entries()).map(([date, pv]) => {
 const uv = weeklyUvMap.get(date)?.size || 0;

 return {
 date,
 label: date,
 pv,
 uv,
 visits: pv,
 uniqueVisitors: uv,
 pageViews: pv,
 };
 });

 const monthlyDailyVisits = Array.from(monthlyPvMap.entries()).map(
 ([date, pv]) => {
 const uv = monthlyUvMap.get(date)?.size || 0;

 return {
 date,
 label: date,
 pv,
 uv,
 visits: pv,
 uniqueVisitors: uv,
 pageViews: pv,
 };
 }
 );

 const hourlyVisits = Array.from(hourlyPvMap.entries()).map(([hour, pv]) => {
 const uv = hourlyUvMap.get(hour)?.size || 0;

 return {
 hour,
 label: hour,
 pv,
 uv,
 visits: pv,
 uniqueVisitors: uv,
 pageViews: pv,
 };
 });

 return {
 source: "private_chat_site_visits + private_chat_site_presence",

 onlineNow: onlineSessionIds.size,
 activeFiveMinuteSessions: activeFiveMinuteSessionIds.size,
 activeFiveMinuteVisitors: activeFiveMinuteVisitorIds.size,
 recentPresenceCount: activeFiveMinuteSessionIds.size,
 activePresenceCount: activeFiveMinuteSessionIds.size,

 todayPv,
 todayUv: todayVisitors.size,
 todaySessions: todaySessions.size,

 weekPv,
 weekUv: weekVisitors.size,
 weekSessions: weekSessions.size,

 monthPv,
 monthUv: monthVisitors.size,
 monthSessions: monthSessions.size,

 totalPv,
 totalUv: totalVisitors.size,
 totalSessions: totalSessions.size,

 todayVisits: todayPv,
 todayUniqueVisitors: todayVisitors.size,
 todayPageViews: todayPv,

 weekVisits: weekPv,
 weekUniqueVisitors: weekVisitors.size,
 weekPageViews: weekPv,

 monthVisits: monthPv,
 monthUniqueVisitors: monthVisitors.size,
 monthPageViews: monthPv,

 totalVisits: totalPv,
 totalUniqueVisitors: totalVisitors.size,
 totalPageViews: totalPv,

 dailyVisits,
 recentDailyVisits: dailyVisits,
 dailyTrend: dailyVisits,
 hourlyVisits,
 monthlyDailyVisits,
 topSources,
 topPaths,

 visitsReadable: !visitsResult.error,
 allVisitsReadable: !allVisitsResult.error,
 presenceReadable: !presenceResult.error,
 };
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;
 const actorId = requireText(body.actorId);

 if (!actorId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少管理员身份。",
 },
 { status: 400 }
 );
 }

 const role = await getAdminRole(actorId);

 if (role !== "owner") {
 return NextResponse.json(
 {
 ok: false,
 error: "只有 owner 总管理员可以查看平台统计。",
 },
 { status: 403 }
 );
 }

 const todayStart = getStartOfTodayIso();

 const [
 publicMessageCount,
 privateMessageCount,
 todayPublicMessageCount,
 todayPrivateMessageCount,
 adminCount,
 activeBanCount,
 activeAnnouncementCount,
 mediaStats,
 storageStats,
 historicalUsageStats,
 mediaUploadIntentStats,
 siteTrafficStats,
 ] = await Promise.all([
 countRows("public_chat_messages"),
 countRows("private_chat_messages"),
 countRowsWithFilter("public_chat_messages", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).gte("created_at", todayStart)
 ),
 countRowsWithFilter("private_chat_messages", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).gte("created_at", todayStart)
 ),
 countRows("private_chat_admins"),
 countRowsWithFilter("private_chat_bans", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).eq("is_active", true)
 ),
 countRowsWithFilter("private_chat_announcements", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).eq("is_active", true)
 ),
 getPrivateMediaStats(),
 getStorageStatsFromObjects(),
 getHistoricalMediaUsageStats(),
 getMediaUploadIntentStats(),
 getSiteTrafficStats(),
 ]);

 const currentStorageUsedBytes = storageStats.storageObjectsReadable
 ? storageStats.storageSizeBytes
 : historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeUploadBytes
 : mediaStats.mediaSizeBytesFromMessages;

 const todayCurrentUploadBytes = storageStats.storageObjectsReadable
 ? storageStats.todayStorageSizeBytes
 : historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayHistoricalUploadBytes
 : mediaStats.todayMediaSizeBytes;

 const storageUsagePercent = Math.min(
 100,
 Number(((currentStorageUsedBytes / storageLimitBytes) * 100).toFixed(2))
 );

 const historicalUploadBytes = historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.historicalUploadBytes
 : mediaUploadIntentStats.uploadIntentsReadable
 ? mediaUploadIntentStats.messageSentBytes
 : mediaStats.mediaSizeBytesFromMessages;

 const historicalUsagePercent = Math.min(
 100,
 Number(((historicalUploadBytes / storageLimitBytes) * 100).toFixed(2))
 );

 const monthlyUploadBytes = historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyUploadBytes
 : mediaUploadIntentStats.uploadIntentsReadable
 ? mediaUploadIntentStats.monthlyMessageSentBytes
 : mediaStats.monthlyMediaSizeBytes;

 const monthlyTrafficUsagePercent = Math.min(
 100,
 Number(
 ((monthlyUploadBytes / monthlyTrafficLimitBytes) * 100).toFixed(2)
 )
 );

 return NextResponse.json({
 ok: true,
 data: {
 traffic: siteTrafficStats,

 storage: {
 bucket: MEDIA_BUCKET,

 usedBytes: currentStorageUsedBytes,
 limitBytes: storageLimitBytes,
 usagePercent: storageUsagePercent,
 objectCount: storageStats.storageObjectsReadable
 ? storageStats.storageObjectCount
 : historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeMediaCount
 : mediaStats.mediaMessageCount,
 todayUploadBytes: todayCurrentUploadBytes,
 todayObjectCount: storageStats.storageObjectsReadable
 ? storageStats.todayStorageObjectCount
 : historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayHistoricalMediaCount
 : mediaStats.todayMediaCount,
 source: storageStats.storageObjectsReadable
 ? "storage.objects"
 : historicalUsageStats.usageLogsReadable
 ? "private_chat_media_usage_logs.active"
 : "private_chat_messages.media_size",

 historicalUploadBytes,
 historicalUsagePercent,
 historicalMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.historicalMediaCount
 : mediaStats.mediaMessageCount,
 historicalImageCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.historicalImageCount
 : mediaStats.imageCount,
 historicalVideoCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.historicalVideoCount
 : mediaStats.videoCount,

 activeUploadBytes: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeUploadBytes
 : currentStorageUsedBytes,
 deletedUploadBytes: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.deletedUploadBytes
 : mediaUploadIntentStats.uploadIntentsReadable
 ? mediaUploadIntentStats.deletedBytes
 : 0,

 activeMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeMediaCount
 : mediaStats.mediaMessageCount,
 deletedMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.deletedMediaCount
 : mediaUploadIntentStats.uploadIntentsReadable
 ? mediaUploadIntentStats.deletedCount
 : 0,

 activeImageCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeImageCount
 : mediaStats.imageCount,
 activeVideoCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.activeVideoCount
 : mediaStats.videoCount,
 deletedImageCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.deletedImageCount
 : 0,
 deletedVideoCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.deletedVideoCount
 : 0,

 todayHistoricalUploadBytes: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayHistoricalUploadBytes
 : mediaStats.todayMediaSizeBytes,
 todayHistoricalMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayHistoricalMediaCount
 : mediaStats.todayMediaCount,
 todayDeletedUploadBytes: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayDeletedUploadBytes
 : mediaUploadIntentStats.todayDeletedBytes,
 todayDeletedMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.todayDeletedMediaCount
 : mediaUploadIntentStats.todayDeletedCount,

 usageLogSource: historicalUsageStats.usageLogsReadable
 ? "private_chat_media_usage_logs"
 : mediaUploadIntentStats.uploadIntentsReadable
 ? "private_chat_media_uploads"
 : "private_chat_messages.media_size",

 monthlyTrafficLimitBytes,
 monthlyUploadBytes,
 monthlyTrafficUsagePercent,
 monthlyMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyMediaCount
 : mediaStats.monthlyMediaCount,
 monthlyImageCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyImageCount
 : mediaStats.monthlyImageCount,
 monthlyVideoCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyVideoCount
 : mediaStats.monthlyVideoCount,
 monthlyDeletedUploadBytes: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyDeletedUploadBytes
 : mediaUploadIntentStats.monthlyDeletedBytes,
 monthlyDeletedMediaCount: historicalUsageStats.usageLogsReadable
 ? historicalUsageStats.monthlyDeletedMediaCount
 : mediaUploadIntentStats.monthlyDeletedCount,
 monthlyTrafficMonth: getCurrentMonthLabel(),
 },

 uploads: {
 source: mediaUploadIntentStats.uploadIntentsReadable
 ? "private_chat_media_uploads"
 : "unavailable",

 totalIntentCount: mediaUploadIntentStats.totalIntentCount,
 signedCount: mediaUploadIntentStats.signedCount,
 uploadedCount: mediaUploadIntentStats.uploadedCount,
 messageSentCount: mediaUploadIntentStats.messageSentCount,
 deletedCount: mediaUploadIntentStats.deletedCount,
 failedCount: mediaUploadIntentStats.failedCount,

 totalIntentBytes: mediaUploadIntentStats.totalIntentBytes,
 signedBytes: mediaUploadIntentStats.signedBytes,
 uploadedBytes: mediaUploadIntentStats.uploadedBytes,
 messageSentBytes: mediaUploadIntentStats.messageSentBytes,
 deletedBytes: mediaUploadIntentStats.deletedBytes,
 failedBytes: mediaUploadIntentStats.failedBytes,

 imageIntentCount: mediaUploadIntentStats.imageIntentCount,
 videoIntentCount: mediaUploadIntentStats.videoIntentCount,

 todayIntentCount: mediaUploadIntentStats.todayIntentCount,
 todayIntentBytes: mediaUploadIntentStats.todayIntentBytes,
 todayMessageSentCount: mediaUploadIntentStats.todayMessageSentCount,
 todayMessageSentBytes: mediaUploadIntentStats.todayMessageSentBytes,
 todayDeletedCount: mediaUploadIntentStats.todayDeletedCount,
 todayDeletedBytes: mediaUploadIntentStats.todayDeletedBytes,

 monthlyIntentCount: mediaUploadIntentStats.monthlyIntentCount,
 monthlyIntentBytes: mediaUploadIntentStats.monthlyIntentBytes,
 monthlyMessageSentCount:
 mediaUploadIntentStats.monthlyMessageSentCount,
 monthlyMessageSentBytes:
 mediaUploadIntentStats.monthlyMessageSentBytes,
 monthlyDeletedCount: mediaUploadIntentStats.monthlyDeletedCount,
 monthlyDeletedBytes: mediaUploadIntentStats.monthlyDeletedBytes,
 monthlyImageIntentCount:
 mediaUploadIntentStats.monthlyImageIntentCount,
 monthlyVideoIntentCount:
 mediaUploadIntentStats.monthlyVideoIntentCount,
 },

 messages: {
 publicMessageCount,
 privateMessageCount,
 totalMessageCount: publicMessageCount + privateMessageCount,
 todayPublicMessageCount,
 todayPrivateMessageCount,
 todayTotalMessageCount:
 todayPublicMessageCount + todayPrivateMessageCount,
 },

 media: {
 mediaMessageCount: mediaStats.mediaMessageCount,
 imageCount: mediaStats.imageCount,
 videoCount: mediaStats.videoCount,
 mediaSizeBytesFromMessages: mediaStats.mediaSizeBytesFromMessages,
 todayMediaCount: mediaStats.todayMediaCount,
 todayMediaSizeBytes: mediaStats.todayMediaSizeBytes,
 monthlyMediaCount: mediaStats.monthlyMediaCount,
 monthlyMediaSizeBytes: mediaStats.monthlyMediaSizeBytes,
 monthlyImageCount: mediaStats.monthlyImageCount,
 monthlyVideoCount: mediaStats.monthlyVideoCount,
 },

 moderation: {
 adminCount,
 activeBanCount,
 activeAnnouncementCount,
 },
 },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "服务器错误";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}