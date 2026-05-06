import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type VisitAction = "visit" | "heartbeat" | "leave";

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

 return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

function normalizeAction(value: unknown): VisitAction {
 if (value === "heartbeat") return "heartbeat";
 if (value === "leave") return "leave";

 return "visit";
}

function hashText(value: string | null) {
 if (!value) return null;

 return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request) {
 const forwardedFor = request.headers.get("x-forwarded-for");
 const realIp = request.headers.get("x-real-ip");
 const cfIp = request.headers.get("cf-connecting-ip");

 if (forwardedFor) {
 return forwardedFor.split(",")[0]?.trim() || null;
 }

 return cfIp || realIp || null;
}

function getDeviceType(userAgent: string | null) {
 const value = (userAgent || "").toLowerCase();

 if (!value) return "unknown";
 if (/ipad|tablet/.test(value)) return "tablet";
 if (/mobile|iphone|android/.test(value)) return "mobile";
 if (/windows|macintosh|linux|x11/.test(value)) return "desktop";

 return "unknown";
}

async function upsertPresence(params: {
 visitorId: string;
 sessionId: string;
 accountId: string | null;
 chatUserId: string | null;
 userName: string | null;
 path: string;
 isOnline: boolean;
}) {
 const now = new Date().toISOString();

 const { error } = await supabaseAdmin
 .from("private_chat_site_presence")
 .upsert(
 {
 visitor_id: params.visitorId,
 session_id: params.sessionId,
 account_id: params.accountId,
 chat_user_id: params.chatUserId,
 user_name: params.userName,
 path: params.path,
 is_online: params.isOnline,
 last_seen_at: now,
 updated_at: now,
 },
 {
 onConflict: "session_id",
 }
 );

 if (error) {
 throw new Error(error.message);
 }
}

async function insertVisit(params: {
 visitorId: string;
 sessionId: string;
 accountId: string | null;
 chatUserId: string | null;
 userName: string | null;
 path: string;
 pageTitle: string | null;
 referrer: string | null;
 userAgentHash: string | null;
 ipHash: string | null;
 deviceType: string;
 source: string | null;
}) {
 const { error } = await supabaseAdmin
 .from("private_chat_site_visits")
 .insert({
 visitor_id: params.visitorId,
 session_id: params.sessionId,
 account_id: params.accountId,
 chat_user_id: params.chatUserId,
 user_name: params.userName,
 path: params.path,
 page_title: params.pageTitle,
 referrer: params.referrer,
 user_agent_hash: params.userAgentHash,
 ip_hash: params.ipHash,
 device_type: params.deviceType,
 source: params.source,
 });

 if (error) {
 throw new Error(error.message);
 }
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;

 const action = normalizeAction(body.action);

 const visitorId = requireText(body.visitorId);
 const sessionId = requireText(body.sessionId);
 const path = requireText(body.path);

 const accountId = optionalText(body.accountId);
 const chatUserId = optionalText(body.chatUserId);
 const userName = optionalText(body.userName);
 const pageTitle = optionalText(body.pageTitle);
 const referrer = optionalText(body.referrer);
 const source = optionalText(body.source);

 if (!visitorId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 visitorId。",
 },
 { status: 400 }
 );
 }

 if (!sessionId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 sessionId。",
 },
 { status: 400 }
 );
 }

 if (!path) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 path。",
 },
 { status: 400 }
 );
 }

 const userAgent = request.headers.get("user-agent");
 const clientIp = getClientIp(request);

 const userAgentHash = hashText(userAgent);
 const ipHash = hashText(clientIp);
 const deviceType = getDeviceType(userAgent);

 if (action === "leave") {
 await upsertPresence({
 visitorId,
 sessionId,
 accountId,
 chatUserId,
 userName,
 path,
 isOnline: false,
 });

 return NextResponse.json({
 ok: true,
 message: "已标记离线。",
 });
 }

 await upsertPresence({
 visitorId,
 sessionId,
 accountId,
 chatUserId,
 userName,
 path,
 isOnline: true,
 });

 if (action === "visit") {
 await insertVisit({
 visitorId,
 sessionId,
 accountId,
 chatUserId,
 userName,
 path,
 pageTitle,
 referrer,
 userAgentHash,
 ipHash,
 deviceType,
 source,
 });
 }

 return NextResponse.json({
 ok: true,
 message: action === "heartbeat" ? "心跳已更新。" : "访问已记录。",
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