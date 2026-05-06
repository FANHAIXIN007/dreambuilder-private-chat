import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MessageType = "image" | "video";
type MembershipLevel = "free" | "vip" | "svip";
type MembershipStatus = "active" | "expired" | "cancelled" | "manual";
type AdminRole = "owner" | "admin" | null;

const MEDIA_BUCKET = "private-chat-media";

const FREE_IMAGE_SIZE_BYTES = 0;
const FREE_VIDEO_SIZE_BYTES = 0;
const FREE_MONTHLY_UPLOAD_LIMIT_BYTES = 0;

const VIP_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const VIP_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const VIP_MONTHLY_UPLOAD_LIMIT_BYTES = 1024 * 1024 * 1024;

const SVIP_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const SVIP_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;
const SVIP_MONTHLY_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function normalizeNumber(value: unknown): number | null {
 const numberValue = Number(value);

 if (!Number.isFinite(numberValue)) return null;

 return numberValue;
}

function normalizeMembershipLevel(value: unknown): MembershipLevel {
 if (value === "vip" || value === "svip") return value;

 return "free";
}

function normalizeMembershipStatus(value: unknown): MembershipStatus {
 if (
 value === "active" ||
 value === "expired" ||
 value === "cancelled" ||
 value === "manual"
 ) {
 return value;
 }

 return "active";
}

function isAllowedImageMime(mimeType: string) {
 return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
 mimeType
 );
}

function isAllowedVideoMime(mimeType: string) {
 return ["video/mp4", "video/webm", "video/quicktime"].includes(mimeType);
}

function getFileExtension(fileName: string, mimeType: string) {
 const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/);

 if (match?.[1]) {
 return match[1];
 }

 if (mimeType === "image/jpeg") return "jpg";
 if (mimeType === "image/png") return "png";
 if (mimeType === "image/webp") return "webp";
 if (mimeType === "image/gif") return "gif";
 if (mimeType === "video/mp4") return "mp4";
 if (mimeType === "video/webm") return "webm";
 if (mimeType === "video/quicktime") return "mov";

 return "bin";
}

function createSafeBaseName(fileName: string) {
 const baseName = fileName
 .replace(/\.[^/.]+$/, "")
 .normalize("NFKD")
 .replace(/[^\w-]/g, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "")
 .slice(0, 40);

 return baseName || "media";
}

function createSafeRoomId(roomId: string) {
 return (
 roomId
 .normalize("NFKD")
 .replace(/[^\w-]/g, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "")
 .slice(0, 80) || "private_room"
 );
}

function createMediaPath(roomId: string, fileName: string, mimeType: string) {
 const safeRoomId = createSafeRoomId(roomId);
 const safeBaseName = createSafeBaseName(fileName);
 const extension = getFileExtension(fileName, mimeType);
 const randomPart = crypto.randomUUID();

 return `${safeRoomId}/${Date.now()}_${randomPart}_${safeBaseName}.${extension}`;
}

function formatBytes(bytes: number) {
 if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

 if (bytes < 1024 * 1024) {
 return `${Math.max(1, Math.round(bytes / 1024))} KB`;
 }

 if (bytes < 1024 * 1024 * 1024) {
 return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
 }

 return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getMonthStartIso() {
 const now = new Date();

 return new Date(
 Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
 ).toISOString();
}

function getImageLimitBytes(level: MembershipLevel) {
 if (level === "svip") return SVIP_IMAGE_SIZE_BYTES;
 if (level === "vip") return VIP_IMAGE_SIZE_BYTES;

 return FREE_IMAGE_SIZE_BYTES;
}

function getVideoLimitBytes(level: MembershipLevel) {
 if (level === "svip") return SVIP_VIDEO_SIZE_BYTES;
 if (level === "vip") return VIP_VIDEO_SIZE_BYTES;

 return FREE_VIDEO_SIZE_BYTES;
}

function getMonthlyLimitBytes(level: MembershipLevel) {
 if (level === "svip") return SVIP_MONTHLY_UPLOAD_LIMIT_BYTES;
 if (level === "vip") return VIP_MONTHLY_UPLOAD_LIMIT_BYTES;

 return FREE_MONTHLY_UPLOAD_LIMIT_BYTES;
}

function isMembershipUsable(params: {
 level: MembershipLevel;
 status: MembershipStatus;
 expiresAt: string | null;
}) {
 if (params.level !== "vip" && params.level !== "svip") return false;

 if (params.status === "cancelled" || params.status === "expired") {
 return false;
 }

 if (params.expiresAt) {
 const expiresTime = new Date(params.expiresAt).getTime();

 if (Number.isFinite(expiresTime) && expiresTime < Date.now()) {
 return false;
 }
 }

 return true;
}

async function getAdminRole(chatUserId: string | null): Promise<AdminRole> {
 if (!chatUserId) return null;

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_admins")
 .select("role")
 .eq("user_id", chatUserId)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();

 if (error || !data) return null;

 const row = data as unknown as Record<string, unknown>;
 const role = row.role;

 if (role === "owner" || role === "admin") {
 return role;
 }

 return null;
 } catch {
 return null;
 }
}

async function findAccountIdByChatUserId(chatUserId: string | null) {
 if (!chatUserId) return null;

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .select("account_id")
 .eq("chat_user_id", chatUserId)
 .maybeSingle();

 if (error || !data) return null;

 const row = data as unknown as Record<string, unknown>;
 const accountId = row.account_id;

 return typeof accountId === "string" && accountId.trim()
 ? accountId.trim()
 : null;
 } catch {
 return null;
 }
}

async function getMembershipInfo(params: {
 accountId: string | null;
 chatUserId: string | null;
}) {
 const resolvedAccountId =
 params.accountId || (await findAccountIdByChatUserId(params.chatUserId));

 if (!resolvedAccountId) {
 return {
 accountId: null,
 level: "free" as MembershipLevel,
 status: "active" as MembershipStatus,
 expiresAt: null as string | null,
 };
 }

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_accounts")
 .select("id,membership_level,membership_status,membership_expires_at")
 .eq("id", resolvedAccountId)
 .maybeSingle();

 if (error || !data) {
 return {
 accountId: resolvedAccountId,
 level: "free" as MembershipLevel,
 status: "active" as MembershipStatus,
 expiresAt: null as string | null,
 };
 }

 const row = data as unknown as Record<string, unknown>;

 const level = normalizeMembershipLevel(row.membership_level);
 const status = normalizeMembershipStatus(row.membership_status);
 const expiresAt =
 typeof row.membership_expires_at === "string"
 ? row.membership_expires_at
 : null;

 return {
 accountId: resolvedAccountId,
 level,
 status,
 expiresAt,
 };
 } catch {
 return {
 accountId: resolvedAccountId,
 level: "free" as MembershipLevel,
 status: "active" as MembershipStatus,
 expiresAt: null as string | null,
 };
 }
}

async function getMonthlyUsedBytes(params: {
 accountId: string | null;
 chatUserId: string | null;
}) {
 const monthStart = getMonthStartIso();

 const filters: Array<{
 column: string;
 value: string | null;
 sizeColumn: string;
 }> = [
 {
 column: "account_id",
 value: params.accountId,
 sizeColumn: "file_size",
 },
 {
 column: "chat_user_id",
 value: params.chatUserId,
 sizeColumn: "file_size",
 },
 ];

 for (const filter of filters) {
 if (!filter.value) continue;

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .select(filter.sizeColumn)
 .eq(filter.column, filter.value)
 .gte("created_at", monthStart)
 .neq("status", "deleted")
 .neq("status", "failed");

 if (error || !Array.isArray(data)) continue;

 return data.reduce((total, item) => {
 const row = item as unknown as Record<string, unknown>;
 const size = Number(row[filter.sizeColumn]);

 return total + (Number.isFinite(size) ? size : 0);
 }, 0);
 } catch {
 continue;
 }
 }

 return 0;
}

async function recordUploadIntent(params: {
 accountId: string | null;
 chatUserId: string | null;
 roomId: string;
 mediaPath: string;
 messageType: MessageType;
 fileName: string;
 fileType: string;
 fileSize: number;
 effectiveLevel: MembershipLevel;
 adminRole: AdminRole;
}) {
 try {
 await supabaseAdmin.from("private_chat_media_uploads").insert({
 account_id: params.accountId,
 chat_user_id: params.chatUserId,
 room_id: params.roomId,
 media_path: params.mediaPath,
 message_type: params.messageType,
 file_name: params.fileName,
 file_type: params.fileType,
 file_size: params.fileSize,
 status: "signed",
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 membership_level: params.effectiveLevel,
 admin_role: params.adminRole,
 });
 } catch {
 // 统计表不存在或字段未建好时，不影响签名上传地址创建。
 }
}

function isPrivateRoom(roomId: string) {
 return (
 roomId.startsWith("private_") ||
 roomId.startsWith("private_secret_") ||
 roomId.includes("private")
 );
}

function getEffectiveLevel(params: {
 adminRole: AdminRole;
 membershipLevel: MembershipLevel;
}): MembershipLevel {
 if (params.adminRole === "owner" || params.adminRole === "admin") {
 return "svip";
 }

 return params.membershipLevel;
}

function getLimitLabel(params: {
 adminRole: AdminRole;
 effectiveLevel: MembershipLevel;
}) {
 if (params.adminRole === "owner") return "OWNER / SVIP";
 if (params.adminRole === "admin") return "ADMIN / SVIP";

 return params.effectiveLevel.toUpperCase();
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;

 const roomId = requireText(body.roomId);
 const accountId = requireText(body.accountId);
 const chatUserId = requireText(body.chatUserId);
 const fileName = requireText(body.fileName);
 const fileType = requireText(body.fileType);
 const messageType = requireText(body.messageType) as MessageType | null;
 const fileSize = normalizeNumber(body.fileSize);

 if (!roomId || !fileName || !fileType || !fileSize) {
 return NextResponse.json(
 {
 ok: false,
 error: "上传参数不完整。",
 },
 { status: 400 }
 );
 }

 if (!isPrivateRoom(roomId)) {
 return NextResponse.json(
 {
 ok: false,
 error: "公共聊天室不能上传媒体文件。",
 },
 { status: 403 }
 );
 }

 if (messageType !== "image" && messageType !== "video") {
 return NextResponse.json(
 {
 ok: false,
 error: "不支持的媒体类型。",
 },
 { status: 400 }
 );
 }

 if (fileSize <= 0) {
 return NextResponse.json(
 {
 ok: false,
 error: "文件大小不正确。",
 },
 { status: 400 }
 );
 }

 const adminRole = await getAdminRole(chatUserId);
 const isOwner = adminRole === "owner";
 const isAdmin = adminRole === "admin";

 const membership = await getMembershipInfo({
 accountId,
 chatUserId,
 });

 const effectiveLevel = getEffectiveLevel({
 adminRole,
 membershipLevel: membership.level,
 });

 const usable =
 isOwner ||
 isAdmin ||
 isMembershipUsable({
 level: membership.level,
 status: membership.status,
 expiresAt: membership.expiresAt,
 });

 if (!usable) {
 return NextResponse.json(
 {
 ok: false,
 error:
 "普通会员不能发送媒体文件，请升级 VIP 或 SVIP 后再发送图片或视频。",
 },
 { status: 403 }
 );
 }

 const limitLabel = getLimitLabel({
 adminRole,
 effectiveLevel,
 });

 if (messageType === "image") {
 const imageLimitBytes = getImageLimitBytes(effectiveLevel);

 if (!isAllowedImageMime(fileType)) {
 return NextResponse.json(
 {
 ok: false,
 error: "只允许上传 JPG、PNG、WEBP 或 GIF 图片。",
 },
 { status: 400 }
 );
 }

 if (fileSize > imageLimitBytes) {
 return NextResponse.json(
 {
 ok: false,
 error: `当前 ${limitLabel} 图片不能超过 ${formatBytes(
 imageLimitBytes
 )}。`,
 limitBytes: imageLimitBytes,
 adminRole,
 membershipLevel: membership.level,
 effectiveMembershipLevel: effectiveLevel,
 },
 { status: 400 }
 );
 }
 }

 if (messageType === "video") {
 const videoLimitBytes = getVideoLimitBytes(effectiveLevel);

 if (!isAllowedVideoMime(fileType)) {
 return NextResponse.json(
 {
 ok: false,
 error: "只允许上传 MP4、WEBM 或 MOV 视频。",
 },
 { status: 400 }
 );
 }

 if (fileSize > videoLimitBytes) {
 return NextResponse.json(
 {
 ok: false,
 error: `当前 ${limitLabel} 视频不能超过 ${formatBytes(
 videoLimitBytes
 )}。`,
 limitBytes: videoLimitBytes,
 adminRole,
 membershipLevel: membership.level,
 effectiveMembershipLevel: effectiveLevel,
 },
 { status: 400 }
 );
 }
 }

 const monthlyLimitBytes = isOwner ? 0 : getMonthlyLimitBytes(effectiveLevel);
 const monthlyUsedBytes = isOwner
 ? 0
 : await getMonthlyUsedBytes({
 accountId: membership.accountId || accountId,
 chatUserId,
 });

 if (
 !isOwner &&
 monthlyLimitBytes > 0 &&
 monthlyUsedBytes + fileSize > monthlyLimitBytes
 ) {
 return NextResponse.json(
 {
 ok: false,
 error:
 effectiveLevel === "svip"
 ? adminRole === "admin"
 ? "本月管理员媒体流量已达到 SVIP 额度上限。"
 : "本月 SVIP 媒体流量已用完。"
 : "本月 VIP 媒体流量已用完，可升级 SVIP 获得更高额度。",
 usedBytes: monthlyUsedBytes,
 limitBytes: monthlyLimitBytes,
 adminRole,
 membershipLevel: membership.level,
 effectiveMembershipLevel: effectiveLevel,
 },
 { status: 403 }
 );
 }

 const mediaPath = createMediaPath(roomId, fileName, fileType);

 const { data, error } = await supabaseAdmin.storage
 .from(MEDIA_BUCKET)
 .createSignedUploadUrl(mediaPath);

 if (error || !data?.token || !data?.path) {
 return NextResponse.json(
 {
 ok: false,
 error: error?.message || "创建签名上传地址失败。",
 },
 { status: 500 }
 );
 }

 await recordUploadIntent({
 accountId: membership.accountId || accountId,
 chatUserId,
 roomId,
 mediaPath: data.path,
 messageType,
 fileName,
 fileType,
 fileSize,
 effectiveLevel,
 adminRole,
 });

 const { data: publicUrlData } = supabaseAdmin.storage
 .from(MEDIA_BUCKET)
 .getPublicUrl(data.path);

 return NextResponse.json({
 ok: true,
 bucket: MEDIA_BUCKET,
 path: data.path,
 token: data.token,
 publicUrl: publicUrlData.publicUrl,
 adminRole,
 membershipLevel: membership.level,
 effectiveMembershipLevel: effectiveLevel,

 // Owner 不受月流量限制，所以这里返回 0 / 0。
 // Admin 按 SVIP 10GB/月计算。
 monthlyUsedBytes,
 monthlyLimitBytes,

 message: "签名上传地址已创建。",
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
