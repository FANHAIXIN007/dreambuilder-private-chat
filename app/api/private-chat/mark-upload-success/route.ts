import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
 uploaded_at?: string | null;
 sent_at: string | null;
 deleted_at: string | null;
 deleted_by: string | null;
};

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

function isAllowedStatusToMarkUploaded(status?: string | null) {
 return status === "signed" || status === "uploaded" || status === "message_sent";
}

async function findUploadRecord(params: {
 mediaPath: string;
 roomId: string | null;
 chatUserId: string | null;
 accountId: string | null;
}) {
 let query = supabaseAdmin
 .from("private_chat_media_uploads")
 .select("*")
 .eq("media_path", params.mediaPath)
 .order("created_at", { ascending: false })
 .limit(1);

 if (params.roomId) {
 query = query.eq("room_id", params.roomId);
 }

 if (params.chatUserId) {
 query = query.eq("chat_user_id", params.chatUserId);
 } else if (params.accountId) {
 query = query.eq("account_id", params.accountId);
 }

 const { data, error } = await query.maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data ? (data as MediaUploadRow) : null;
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;

 const mediaPath = requireText(body.mediaPath);
 const roomId = requireText(body.roomId);
 const chatUserId = requireText(body.chatUserId);
 const accountId = requireText(body.accountId);
 const fileSize = normalizeNumber(body.fileSize);

 if (!mediaPath) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 mediaPath。",
 },
 { status: 400 }
 );
 }

 if (!roomId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 roomId。",
 },
 { status: 400 }
 );
 }

 if (!chatUserId && !accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少上传用户身份。",
 },
 { status: 400 }
 );
 }

 const uploadRecord = await findUploadRecord({
 mediaPath,
 roomId,
 chatUserId,
 accountId,
 });

 if (!uploadRecord) {
 return NextResponse.json(
 {
 ok: false,
 error: "没有找到对应的媒体上传记录。",
 },
 { status: 404 }
 );
 }

 if (!isAllowedStatusToMarkUploaded(uploadRecord.status)) {
 return NextResponse.json(
 {
 ok: false,
 error: `当前上传记录状态为 ${uploadRecord.status}，不能标记为 uploaded。`,
 data: uploadRecord,
 },
 { status: 409 }
 );
 }

 if (
 typeof uploadRecord.file_size === "number" &&
 uploadRecord.file_size > 0 &&
 typeof fileSize === "number" &&
 fileSize > 0 &&
 Math.round(uploadRecord.file_size) !== Math.round(fileSize)
 ) {
 return NextResponse.json(
 {
 ok: false,
 error: "上传成功文件大小与签名记录不一致。",
 },
 { status: 400 }
 );
 }

 if (uploadRecord.status === "message_sent") {
 return NextResponse.json({
 ok: true,
 message: "该媒体上传记录已经完成消息发送，无需重复标记。",
 data: uploadRecord,
 });
 }

 const now = new Date().toISOString();

 const { data, error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .update({
 status: "uploaded",
 uploaded_at: now,
 updated_at: now,
 })
 .eq("id", uploadRecord.id)
 .select("*")
 .single();

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "媒体上传状态已标记为 uploaded。",
 data: data as MediaUploadRow,
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
