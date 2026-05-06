import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SendScope = "public" | "private";
type MessageType = "text" | "image" | "video";

type AdminRole = "owner" | "admin";

type MediaUploadStatus =
 | "signed"
 | "uploaded"
 | "message_sent"
 | "deleted"
 | "failed";

type MediaUploadRow = {
 id: string;
 account_id: string | null;
 chat_user_id: string | null;
 room_id: string;
 media_path: string;
 message_type: "image" | "video";
 file_name: string | null;
 file_type: string | null;
 file_size: number | null;
 status: MediaUploadStatus;
 message_id: string | null;
 created_at: string;
 updated_at: string | null;
 sent_at: string | null;
 deleted_at: string | null;
 deleted_by: string | null;
};

const MEDIA_BUCKET = "private-chat-media";

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

function optionalText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown): number | null {
 const numberValue = Number(value);

 if (!Number.isFinite(numberValue)) return null;

 return numberValue;
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

async function isUserBanned(userId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_bans")
 .select("id")
 .eq("user_id", userId)
 .eq("is_active", true)
 .limit(1);

 if (error) {
 throw new Error(error.message);
 }

 return Boolean(data?.length);
}

async function isPrivateMessageBlocked(params: {
 senderId: string;
 receiverId: string | null;
}) {
 const { senderId, receiverId } = params;

 if (!receiverId) return false;
 if (senderId === receiverId) return false;

 const { data, error } = await supabaseAdmin
 .from("private_chat_user_blocks")
 .select("id")
 .eq("blocker_id", receiverId)
 .eq("blocked_id", senderId)
 .eq("is_active", true)
 .limit(1);

 if (error) {
 throw new Error(error.message);
 }

 return Boolean(data?.length);
}

async function getSettingValue(key: string, fallback: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_settings")
 .select("value")
 .eq("key", key)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return String(data?.value ?? fallback);
}

async function getPublicCooldownSeconds() {
 const rawValue = await getSettingValue("public_chat_cooldown_seconds", "0");
 const parsedValue = Number.parseInt(rawValue, 10);

 if (!Number.isFinite(parsedValue)) return 0;

 return Math.max(0, Math.min(3600, parsedValue));
}

async function getLastPublicMessageTime(senderId: string) {
 const { data, error } = await supabaseAdmin
 .from("public_chat_messages")
 .select("created_at")
 .eq("room_id", "public-lobby")
 .eq("sender_id", senderId)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data?.created_at ? new Date(data.created_at).getTime() : null;
}

function isPrivateRoom(roomId: string) {
 return (
 roomId.startsWith("private_") ||
 roomId.startsWith("private_secret_") ||
 roomId.includes("private")
 );
}

async function findMediaUploadIntent(params: {
 roomId: string;
 senderId: string;
 mediaPath: string;
 messageType: "image" | "video";
}) {
 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .select("*")
 .eq("room_id", params.roomId)
 .eq("chat_user_id", params.senderId)
 .eq("media_path", params.mediaPath)
 .eq("message_type", params.messageType)
 .in("status", ["signed", "uploaded"])
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (error) {
 console.error("Find media upload intent error:", error);
 return null;
 }

 return data ? (data as MediaUploadRow) : null;
 } catch (error) {
 console.error("Find media upload intent exception:", error);
 return null;
 }
}

async function markMediaUploadMessageSent(params: {
 uploadId: string;
 messageId: string;
}) {
 const now = new Date().toISOString();

 try {
 const { error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .update({
 status: "message_sent",
 message_id: params.messageId,
 sent_at: now,
 updated_at: now,
 })
 .eq("id", params.uploadId);

 if (error) {
 console.error("Mark media upload message_sent error:", error);
 }
 } catch (error) {
 console.error("Mark media upload message_sent exception:", error);
 }
}

async function writeMediaUsageLog(params: {
 messageId: string;
 roomId: string;
 senderId: string;
 senderName: string;
 messageType: "image" | "video";
 mediaPath: string;
 mediaName: string | null;
 mediaSize: number;
 mediaMime: string | null;
}) {
 try {
 const { error } = await supabaseAdmin
 .from("private_chat_media_usage_logs")
 .insert({
 message_id: params.messageId,
 room_id: params.roomId,
 sender_id: params.senderId,
 sender_name: params.senderName,
 message_type: params.messageType,
 media_path: params.mediaPath,
 media_name: params.mediaName,
 media_size: Math.max(0, Math.round(params.mediaSize)),
 media_mime: params.mediaMime,
 is_deleted: false,
 });

 if (error) {
 console.error("Write media usage log error:", error);
 }
 } catch (error) {
 console.error("Write media usage log exception:", error);
 }
}

async function handleSendPublicMessage(body: Record<string, unknown>) {
 const senderId = requireText(body.senderId);
 const senderName = requireText(body.senderName);
 const senderAvatar = requireText(body.senderAvatar);
 const content = requireText(body.content);
 const messageType = (body.messageType || "text") as MessageType;

 if (messageType !== "text") {
 return NextResponse.json(
 { ok: false, error: "公共聊天室不能发送图片或视频。" },
 { status: 403 }
 );
 }

 if (!senderId || !senderName || !senderAvatar || !content) {
 return NextResponse.json(
 { ok: false, error: "公共消息参数不完整" },
 { status: 400 }
 );
 }

 if (content.length > 500) {
 return NextResponse.json(
 { ok: false, error: "消息不能超过 500 个字符" },
 { status: 400 }
 );
 }

 const adminRole = await getAdminRole(senderId);
 const isAdmin = Boolean(adminRole);

 const banned = await isUserBanned(senderId);

 if (banned && !isAdmin) {
 return NextResponse.json(
 { ok: false, error: "你已被管理员限制发言" },
 { status: 403 }
 );
 }

 const pausedValue = await getSettingValue("public_chat_paused", "false");
 const publicChatPaused = pausedValue === "true";

 if (publicChatPaused && !isAdmin) {
 return NextResponse.json(
 { ok: false, error: "公共聊天室当前已暂停发言" },
 { status: 403 }
 );
 }

 const cooldownSeconds = await getPublicCooldownSeconds();

 if (!isAdmin && cooldownSeconds > 0) {
 const lastTime = await getLastPublicMessageTime(senderId);

 if (lastTime) {
 const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);
 const remainingSeconds = cooldownSeconds - elapsedSeconds;

 if (remainingSeconds > 0) {
 return NextResponse.json(
 {
 ok: false,
 error: `发言太快了，请等待 ${remainingSeconds} 秒后再发送`,
 },
 { status: 429 }
 );
 }
 }
 }

 const { data, error } = await supabaseAdmin
 .from("public_chat_messages")
 .insert({
 room_id: "public-lobby",
 sender_id: senderId,
 sender_name: senderName.slice(0, 40),
 sender_avatar: senderAvatar.slice(0, 16),
 content: content.slice(0, 500),
 })
 .select("*")
 .single();

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "公共消息已发送",
 data,
 });
}

async function handleSendPrivateMessage(body: Record<string, unknown>) {
 const roomId = requireText(body.roomId);
 const senderId = requireText(body.senderId);
 const senderName = requireText(body.senderName);
 const senderAvatar = requireText(body.senderAvatar);
 const content = requireText(body.content);

 const receiverId = optionalText(body.receiverId);
 const receiverName = optionalText(body.receiverName);

 const messageType = (body.messageType || "text") as MessageType;

 const mediaUrl = optionalText(body.mediaUrl);
 const mediaPath = optionalText(body.mediaPath);
 const mediaName = optionalText(body.mediaName);
 const mediaMime = optionalText(body.mediaMime);
 const mediaSize = normalizeNumber(body.mediaSize);

 if (!roomId || !senderId || !senderName || !senderAvatar || !content) {
 return NextResponse.json(
 { ok: false, error: "私密消息参数不完整" },
 { status: 400 }
 );
 }

 if (!isPrivateRoom(roomId)) {
 return NextResponse.json(
 { ok: false, error: "当前房间不是私密房间，不能发送私密消息。" },
 { status: 403 }
 );
 }

 if (!["text", "image", "video"].includes(messageType)) {
 return NextResponse.json(
 { ok: false, error: "不支持的消息类型" },
 { status: 400 }
 );
 }

 if (content.length > 500) {
 return NextResponse.json(
 { ok: false, error: "消息不能超过 500 个字符" },
 { status: 400 }
 );
 }

 const privateAdminRole = await getAdminRole(senderId);
 const privateIsAdmin = Boolean(privateAdminRole);
 const privateBanned = await isUserBanned(senderId);

 if (privateBanned && !privateIsAdmin) {
 return NextResponse.json(
 { ok: false, error: "你已被管理员限制发言" },
 { status: 403 }
 );
 }

 const blocked = await isPrivateMessageBlocked({
 senderId,
 receiverId,
 });

 if (blocked) {
 return NextResponse.json(
 {
 ok: false,
 error: "对方已限制接收你的私聊消息。",
 },
 { status: 403 }
 );
 }

 let mediaUploadIntent: MediaUploadRow | null = null;

 if (messageType === "image" || messageType === "video") {
 if (!mediaUrl || !mediaPath) {
 return NextResponse.json(
 { ok: false, error: "媒体消息缺少文件信息" },
 { status: 400 }
 );
 }

 if (!mediaSize || mediaSize <= 0) {
 return NextResponse.json(
 { ok: false, error: "媒体消息缺少文件大小" },
 { status: 400 }
 );
 }

 mediaUploadIntent = await findMediaUploadIntent({
 roomId,
 senderId,
 mediaPath,
 messageType,
 });

 if (!mediaUploadIntent) {
 return NextResponse.json(
 {
 ok: false,
 error:
 "没有找到对应的媒体上传记录，请重新选择文件上传后再发送。",
 },
 { status: 403 }
 );
 }

 if (
 typeof mediaUploadIntent.file_size === "number" &&
 mediaUploadIntent.file_size > 0 &&
 Math.round(mediaUploadIntent.file_size) !== Math.round(mediaSize)
 ) {
 return NextResponse.json(
 {
 ok: false,
 error: "媒体文件大小与上传记录不一致，请重新上传。",
 },
 { status: 400 }
 );
 }

 if (
 mediaUploadIntent.file_type &&
 mediaMime &&
 mediaUploadIntent.file_type !== mediaMime
 ) {
 return NextResponse.json(
 {
 ok: false,
 error: "媒体文件类型与上传记录不一致，请重新上传。",
 },
 { status: 400 }
 );
 }
 }

 const safeMediaUrl =
 messageType === "text" || !mediaPath
 ? null
 : supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(mediaPath).data.publicUrl;

 const { data, error } = await supabaseAdmin
 .from("private_chat_messages")
 .insert({
 room_id: roomId,
 sender_id: senderId,
 sender_name: senderName.slice(0, 40),
 sender_avatar: senderAvatar.slice(0, 16),
 receiver_id: receiverId,
 receiver_name: receiverId ? receiverName : null,
 content: content.slice(0, 500),
 message_type: messageType,
 media_url: safeMediaUrl,
 media_path: messageType === "text" ? null : mediaPath,
 media_name: messageType === "text" ? null : mediaName,
 media_size: messageType === "text" ? null : mediaSize,
 media_mime: messageType === "text" ? null : mediaMime,
 })
 .select("*")
 .single();

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 if (
 (messageType === "image" || messageType === "video") &&
 mediaPath &&
 mediaSize
 ) {
 if (mediaUploadIntent?.id) {
 await markMediaUploadMessageSent({
 uploadId: mediaUploadIntent.id,
 messageId: data.id,
 });
 }

 await writeMediaUsageLog({
 messageId: data.id,
 roomId,
 senderId,
 senderName: senderName.slice(0, 40),
 messageType,
 mediaPath,
 mediaName,
 mediaSize,
 mediaMime,
 });
 }

 return NextResponse.json({
 ok: true,
 message: "私密消息已发送",
 data,
 });
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;
 const scope = body.scope as SendScope | undefined;

 if (scope === "public") {
 return await handleSendPublicMessage(body);
 }

 if (scope === "private") {
 return await handleSendPrivateMessage(body);
 }

 return NextResponse.json(
 { ok: false, error: "未知发送类型" },
 { status: 400 }
 );
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