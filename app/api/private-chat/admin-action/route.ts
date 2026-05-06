import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminRole = "owner" | "admin";

type AdminAction =
 | "grant_admin"
 | "remove_admin"
 | "exit_admin_mode"
 | "ban_user"
 | "lift_ban"
 | "delete_public_message"
 | "clear_public_messages"
 | "publish_announcement"
 | "clear_announcement"
 | "set_public_chat_paused"
 | "set_public_chat_cooldown";

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

async function getTargetRole(userId: string): Promise<AdminRole | null> {
 return getAdminRole(userId);
}

function requireText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
 try {
 const body = await request.json();

 const action = body.action as AdminAction | undefined;
 const actorId = requireText(body.actorId);
 const actorName = requireText(body.actorName) || "管理员";

 if (!action) {
 return NextResponse.json(
 { ok: false, error: "缺少 action" },
 { status: 400 }
 );
 }

 if (!actorId) {
 return NextResponse.json(
 { ok: false, error: "缺少 actorId" },
 { status: 400 }
 );
 }

 const actorRole = await getAdminRole(actorId);

 if (!actorRole) {
 return NextResponse.json(
 { ok: false, error: "你不是管理员，无权操作" },
 { status: 403 }
 );
 }

 const isOwner = actorRole === "owner";
 const isAdmin = actorRole === "admin";

 if (action === "exit_admin_mode") {
 const { error } = await supabaseAdmin
 .from("private_chat_admins")
 .delete()
 .eq("user_id", actorId);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已退出管理员模式",
 });
 }

 if (action === "grant_admin") {
 if (!isOwner) {
 return NextResponse.json(
 { ok: false, error: "只有总管理员可以任命管理员" },
 { status: 403 }
 );
 }

 const targetUserId = requireText(body.targetUserId);
 const targetUserName = requireText(body.targetUserName) || "未命名用户";

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 const targetRole = await getTargetRole(targetUserId);

 if (targetRole === "owner") {
 return NextResponse.json(
 { ok: false, error: "该用户已经是总管理员" },
 { status: 400 }
 );
 }

 if (targetRole === "admin") {
 return NextResponse.json(
 { ok: true, message: "该用户已经是管理员" },
 { status: 200 }
 );
 }

 const { error } = await supabaseAdmin.from("private_chat_admins").insert({
 user_id: targetUserId,
 user_name: targetUserName,
 role: "admin",
 created_by: actorId,
 });

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已任命为管理员",
 });
 }

 if (action === "remove_admin") {
 if (!isOwner) {
 return NextResponse.json(
 { ok: false, error: "只有总管理员可以移除管理员" },
 { status: 403 }
 );
 }

 const targetUserId = requireText(body.targetUserId);

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 const targetRole = await getTargetRole(targetUserId);

 if (targetRole === "owner") {
 return NextResponse.json(
 { ok: false, error: "不能移除总管理员" },
 { status: 403 }
 );
 }

 const { error } = await supabaseAdmin
 .from("private_chat_admins")
 .delete()
 .eq("user_id", targetUserId)
 .eq("role", "admin");

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已移除管理员",
 });
 }

 if (action === "ban_user") {
 const targetUserId = requireText(body.targetUserId);
 const targetUserName = requireText(body.targetUserName) || "未命名用户";
 const reason = requireText(body.reason) || "管理员禁言";

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 if (targetUserId === actorId) {
 return NextResponse.json(
 { ok: false, error: "不能禁言自己" },
 { status: 403 }
 );
 }

 const targetRole = await getTargetRole(targetUserId);

 if (isAdmin && targetRole) {
 return NextResponse.json(
 { ok: false, error: "普通管理员不能禁言其他管理员" },
 { status: 403 }
 );
 }

 const { error: closeOldError } = await supabaseAdmin
 .from("private_chat_bans")
 .update({
 is_active: false,
 lifted_at: new Date().toISOString(),
 lifted_by: actorId,
 })
 .eq("user_id", targetUserId)
 .eq("is_active", true);

 if (closeOldError) {
 return NextResponse.json(
 { ok: false, error: closeOldError.message },
 { status: 500 }
 );
 }

 const { error } = await supabaseAdmin.from("private_chat_bans").insert({
 user_id: targetUserId,
 user_name: targetUserName,
 reason,
 is_active: true,
 created_by: actorId,
 });

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已禁言用户",
 });
 }

 if (action === "lift_ban") {
 const targetUserId = requireText(body.targetUserId);

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 const targetRole = await getTargetRole(targetUserId);

 if (isAdmin && targetRole) {
 return NextResponse.json(
 { ok: false, error: "普通管理员不能操作其他管理员" },
 { status: 403 }
 );
 }

 const { error } = await supabaseAdmin
 .from("private_chat_bans")
 .update({
 is_active: false,
 lifted_at: new Date().toISOString(),
 lifted_by: actorId,
 })
 .eq("user_id", targetUserId)
 .eq("is_active", true);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已解除禁言",
 });
 }

 if (action === "delete_public_message") {
 const messageId = requireText(body.messageId);

 if (!messageId) {
 return NextResponse.json(
 { ok: false, error: "缺少 messageId" },
 { status: 400 }
 );
 }

 const { error } = await supabaseAdmin
 .from("public_chat_messages")
 .delete()
 .eq("id", messageId);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已删除消息",
 });
 }

 if (action === "clear_public_messages") {
 if (actorRole !== "owner" && actorRole !== "admin") {
 return NextResponse.json(
 {
 ok: false,
 error: "只有管理员或总管理员可以一键清空公共聊天室内容。",
 },
 { status: 403 }
 );
 }

 const roomId = requireText(body.roomId) || "public-lobby";

 if (roomId !== "public-lobby") {
 return NextResponse.json(
 {
 ok: false,
 error: "只能清空公共大厅消息。",
 },
 { status: 403 }
 );
 }

 const { error } = await supabaseAdmin
 .from("public_chat_messages")
 .delete()
 .eq("room_id", "public-lobby");

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "已清空公共聊天室消息",
 });
}

 if (action === "publish_announcement") {
 const content = requireText(body.content);

 if (!content) {
 return NextResponse.json(
 { ok: false, error: "公告内容不能为空" },
 { status: 400 }
 );
 }

 const { error: oldError } = await supabaseAdmin
 .from("private_chat_announcements")
 .update({ is_active: false })
 .eq("is_active", true);

 if (oldError) {
 return NextResponse.json(
 { ok: false, error: oldError.message },
 { status: 500 }
 );
 }

 const { error } = await supabaseAdmin
 .from("private_chat_announcements")
 .insert({
 content: content.slice(0, 300),
 is_active: true,
 created_by: actorId,
 });

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "公告已发布",
 });
 }

 if (action === "clear_announcement") {
 const { error } = await supabaseAdmin
 .from("private_chat_announcements")
 .update({ is_active: false })
 .eq("is_active", true);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "公告已清除",
 });
 }

 if (action === "set_public_chat_paused") {
 const paused = Boolean(body.paused);

 const { error } = await supabaseAdmin
 .from("private_chat_settings")
 .upsert(
 {
 key: "public_chat_paused",
 value: paused ? "true" : "false",
 updated_by: actorId,
 },
 { onConflict: "key" }
 );

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: paused ? "公共聊天室已暂停" : "公共聊天室已恢复",
 });
 }

 if (action === "set_public_chat_cooldown") {
 const secondsNumber = Number(body.seconds);

 if (!Number.isFinite(secondsNumber) || secondsNumber < 0) {
 return NextResponse.json(
 { ok: false, error: "发言间隔必须是大于等于 0 的数字" },
 { status: 400 }
 );
 }

 const seconds = Math.max(0, Math.min(3600, Math.floor(secondsNumber)));

 const { error } = await supabaseAdmin
 .from("private_chat_settings")
 .upsert(
 {
 key: "public_chat_cooldown_seconds",
 value: String(seconds),
 updated_by: actorId,
 },
 { onConflict: "key" }
 );

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: `发言间隔已设置为 ${seconds} 秒`,
 });
 }

 return NextResponse.json(
 { ok: false, error: "未知 action" },
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