import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PrivateAction =
 | "delete_message"
 | "clear_room_messages"
 | "block_user"
 | "unblock_user"
 | "list_blocked_users"
 | "add_friend"
 | "remove_friend"
 | "list_friends"
 | "update_friend_remark"
 | "add_room_favorite"
 | "remove_room_favorite"
 | "list_room_favorites"
 | "update_room_favorite_remark";

type AdminRole = "owner" | "admin" | null;

type PrivateMessageRow = {
 id: string;
 room_id: string;
 sender_id: string;
 media_path: string | null;
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
 friend_remark: string | null;
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
 room_remark: string | null;
 secret_code: string;
 room_avatar: string;
 status: "active" | "removed";
 created_at: string;
 removed_at: string | null;
 updated_at: string;
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

function cleanStringList(values: Array<string | null | undefined>) {
 return Array.from(
 new Set(
 values
 .map((value) => (typeof value === "string" ? value.trim() : ""))
 .filter(Boolean)
 )
 );
}

async function getAdminRole(actorId: string | null): Promise<AdminRole> {
 if (!actorId) return null;

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_admins")
 .select("role")
 .eq("user_id", actorId)
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

async function removeMediaFiles(paths: string[]) {
 const cleanPaths = cleanStringList(paths);

 if (cleanPaths.length === 0) {
 return {
 ok: true,
 error: null as string | null,
 };
 }

 const chunkSize = 100;

 for (let index = 0; index < cleanPaths.length; index += chunkSize) {
 const chunk = cleanPaths.slice(index, index + chunkSize);

 const { error } = await supabaseAdmin.storage
 .from(MEDIA_BUCKET)
 .remove(chunk);

 if (error) {
 return {
 ok: false,
 error: error.message,
 };
 }
 }

 return {
 ok: true,
 error: null as string | null,
 };
}

async function markMediaLogsDeletedByPaths(paths: string[], actorId: string) {
 const cleanPaths = cleanStringList(paths);

 if (cleanPaths.length === 0) return;

 const chunkSize = 100;
 const now = new Date().toISOString();

 for (let index = 0; index < cleanPaths.length; index += chunkSize) {
 const chunk = cleanPaths.slice(index, index + chunkSize);

 const { error } = await supabaseAdmin
 .from("private_chat_media_usage_logs")
 .update({
 is_deleted: true,
 deleted_at: now,
 deleted_by: actorId,
 })
 .in("media_path", chunk);

 if (error) {
 console.error("Mark media usage logs deleted error:", error);
 }
 }
}

async function markMediaLogsDeletedByMessageIds(
 messageIds: string[],
 actorId: string
) {
 const cleanIds = cleanStringList(messageIds);

 if (cleanIds.length === 0) return;

 const chunkSize = 100;
 const now = new Date().toISOString();

 for (let index = 0; index < cleanIds.length; index += chunkSize) {
 const chunk = cleanIds.slice(index, index + chunkSize);

 const { error } = await supabaseAdmin
 .from("private_chat_media_usage_logs")
 .update({
 is_deleted: true,
 deleted_at: now,
 deleted_by: actorId,
 })
 .in("message_id", chunk);

 if (error) {
 console.error("Mark media usage logs deleted by message id error:", error);
 }
 }
}

async function markMediaUploadsDeletedByPaths(paths: string[], actorId: string) {
 const cleanPaths = cleanStringList(paths);

 if (cleanPaths.length === 0) return;

 const chunkSize = 100;
 const now = new Date().toISOString();

 for (let index = 0; index < cleanPaths.length; index += chunkSize) {
 const chunk = cleanPaths.slice(index, index + chunkSize);

 const { error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .update({
 status: "deleted",
 deleted_at: now,
 deleted_by: actorId,
 updated_at: now,
 })
 .in("media_path", chunk)
 .neq("status", "deleted");

 if (error) {
 console.error("Mark media uploads deleted by paths error:", error);
 }
 }
}

async function markMediaUploadsDeletedByMessageIds(
 messageIds: string[],
 actorId: string
) {
 const cleanIds = cleanStringList(messageIds);

 if (cleanIds.length === 0) return;

 const chunkSize = 100;
 const now = new Date().toISOString();

 for (let index = 0; index < cleanIds.length; index += chunkSize) {
 const chunk = cleanIds.slice(index, index + chunkSize);

 const { error } = await supabaseAdmin
 .from("private_chat_media_uploads")
 .update({
 status: "deleted",
 deleted_at: now,
 deleted_by: actorId,
 updated_at: now,
 })
 .in("message_id", chunk)
 .neq("status", "deleted");

 if (error) {
 console.error("Mark media uploads deleted by message ids error:", error);
 }
 }
}

async function handleBlockUser(body: Record<string, unknown>, actorId: string) {
 const actorName = optionalText(body.actorName) || "用户";
 const targetUserId = requireText(body.targetUserId);
 const targetUserName = optionalText(body.targetUserName) || "用户";
 const reason = optionalText(body.reason);

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 if (targetUserId === actorId) {
 return NextResponse.json(
 { ok: false, error: "不能拉黑自己" },
 { status: 400 }
 );
 }

 const { data: existingRows, error: existingError } = await supabaseAdmin
 .from("private_chat_user_blocks")
 .select("*")
 .eq("blocker_id", actorId)
 .eq("blocked_id", targetUserId)
 .eq("is_active", true)
 .limit(1);

 if (existingError) {
 return NextResponse.json(
 { ok: false, error: existingError.message },
 { status: 500 }
 );
 }

 if (existingRows && existingRows.length > 0) {
 return NextResponse.json({
 ok: true,
 message: "该用户已在黑名单中",
 data: existingRows[0] as UserBlockRow,
 });
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_user_blocks")
 .insert({
 blocker_id: actorId,
 blocker_name: actorName.slice(0, 40),
 blocked_id: targetUserId,
 blocked_name: targetUserName.slice(0, 40),
 reason: reason?.slice(0, 200) || "用户主动拉黑",
 is_active: true,
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
 message: `已将 ${targetUserName} 加入黑名单`,
 data,
 });
}

async function handleUnblockUser(
 body: Record<string, unknown>,
 actorId: string
) {
 const targetUserId = requireText(body.targetUserId);

 if (!targetUserId) {
 return NextResponse.json(
 { ok: false, error: "缺少 targetUserId" },
 { status: 400 }
 );
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_user_blocks")
 .update({
 is_active: false,
 lifted_at: new Date().toISOString(),
 lifted_by: actorId,
 })
 .eq("blocker_id", actorId)
 .eq("blocked_id", targetUserId)
 .eq("is_active", true)
 .select("*");

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message:
 data && data.length > 0 ? "已取消拉黑" : "该用户当前不在黑名单中",
 data: data || [],
 });
}

async function handleListBlockedUsers(actorId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_user_blocks")
 .select("*")
 .eq("blocker_id", actorId)
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(200);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "黑名单已读取",
 data: (data || []) as UserBlockRow[],
 });
}

async function handleAddFriend(body: Record<string, unknown>, actorId: string) {
 const actorName = optionalText(body.actorName) || "用户";
 const actorAvatar = optionalText(body.actorAvatar);

 const friendId = requireText(body.friendId);
 const friendName = optionalText(body.friendName) || "好友";
 const friendAvatar = optionalText(body.friendAvatar);

 if (!friendId) {
 return NextResponse.json(
 { ok: false, error: "缺少 friendId" },
 { status: 400 }
 );
 }

 if (friendId === actorId) {
 return NextResponse.json(
 { ok: false, error: "不能添加自己为好友" },
 { status: 400 }
 );
 }

 const { data: existingRow, error: existingError } = await supabaseAdmin
 .from("private_chat_friends")
 .select("*")
 .eq("user_id", actorId)
 .eq("friend_id", friendId)
 .maybeSingle();

 if (existingError) {
 return NextResponse.json(
 { ok: false, error: existingError.message },
 { status: 500 }
 );
 }

 if (existingRow) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_friends")
 .update({
 user_name: actorName.slice(0, 40),
 user_avatar: actorAvatar?.slice(0, 16) || null,
 friend_name: friendName.slice(0, 40),
 friend_avatar: friendAvatar?.slice(0, 16) || null,
 status: "active",
 removed_at: null,
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("friend_id", friendId)
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
 message: `已关注 ${friendName}`,
 data: data as FriendRow,
 });
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_friends")
 .insert({
 user_id: actorId,
 user_name: actorName.slice(0, 40),
 user_avatar: actorAvatar?.slice(0, 16) || null,
 friend_id: friendId,
 friend_name: friendName.slice(0, 40),
 friend_avatar: friendAvatar?.slice(0, 16) || null,
 friend_remark: null,
 status: "active",
 removed_at: null,
 updated_at: new Date().toISOString(),
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
 message: `已关注 ${friendName}`,
 data: data as FriendRow,
 });
}

async function handleRemoveFriend(
 body: Record<string, unknown>,
 actorId: string
) {
 const friendId = requireText(body.friendId);

 if (!friendId) {
 return NextResponse.json(
 { ok: false, error: "缺少 friendId" },
 { status: 400 }
 );
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_friends")
 .update({
 status: "removed",
 removed_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("friend_id", friendId)
 .eq("status", "active")
 .select("*");

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: data && data.length > 0 ? "已取消关注" : "该用户不在关注列表中",
 data: (data || []) as FriendRow[],
 });
}

async function handleListFriends(actorId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_friends")
 .select("*")
 .eq("user_id", actorId)
 .eq("status", "active")
 .order("updated_at", { ascending: false })
 .limit(200);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "好友列表已读取",
 data: (data || []) as FriendRow[],
 });
}

async function handleUpdateFriendRemark(
 body: Record<string, unknown>,
 actorId: string
) {
 const friendId = requireText(body.friendId);

 if (!friendId) {
 return NextResponse.json(
 { ok: false, error: "缺少 friendId" },
 { status: 400 }
 );
 }

 const rawRemark =
 typeof body.friendRemark === "string" ? body.friendRemark.trim() : "";

 const nextRemark = rawRemark.length > 0 ? rawRemark.slice(0, 40) : null;

 const { data, error } = await supabaseAdmin
 .from("private_chat_friends")
 .update({
 friend_remark: nextRemark,
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("friend_id", friendId)
 .eq("status", "active")
 .select("*")
 .maybeSingle();

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 if (!data) {
 return NextResponse.json(
 { ok: false, error: "该用户不在关注列表中" },
 { status: 404 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: nextRemark ? "好友备注已更新" : "好友备注已清除",
 data: data as FriendRow,
 });
}

async function handleAddRoomFavorite(
 body: Record<string, unknown>,
 actorId: string
) {
 const actorName = optionalText(body.actorName) || "用户";
 const actorAvatar = optionalText(body.actorAvatar);

 const roomId = requireText(body.roomId);
 const roomName = optionalText(body.roomName) || "暗语私密房间";
 const secretCode = requireText(body.secretCode);
 const roomAvatar = optionalText(body.roomAvatar) || "🔐";

 if (!roomId) {
 return NextResponse.json(
 { ok: false, error: "缺少 roomId" },
 { status: 400 }
 );
 }

 if (!secretCode) {
 return NextResponse.json(
 { ok: false, error: "缺少 secretCode" },
 { status: 400 }
 );
 }

 const { data: existingRow, error: existingError } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .select("*")
 .eq("user_id", actorId)
 .eq("room_id", roomId)
 .maybeSingle();

 if (existingError) {
 return NextResponse.json(
 { ok: false, error: existingError.message },
 { status: 500 }
 );
 }

 if (existingRow) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .update({
 user_name: actorName.slice(0, 40),
 user_avatar: actorAvatar?.slice(0, 16) || null,
 room_name: roomName.slice(0, 80),
 secret_code: secretCode.slice(0, 32),
 room_avatar: roomAvatar.slice(0, 16),
 status: "active",
 removed_at: null,
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("room_id", roomId)
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
 message: "已收藏该私密房间",
 data: data as RoomFavoriteRow,
 });
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .insert({
 user_id: actorId,
 user_name: actorName.slice(0, 40),
 user_avatar: actorAvatar?.slice(0, 16) || null,
 room_id: roomId,
 room_name: roomName.slice(0, 80),
 secret_code: secretCode.slice(0, 32),
 room_avatar: roomAvatar.slice(0, 16),
 status: "active",
 removed_at: null,
 updated_at: new Date().toISOString(),
 room_remark: null,
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
 message: "已收藏该私密房间",
 data: data as RoomFavoriteRow,
 });
}

async function handleRemoveRoomFavorite(
 body: Record<string, unknown>,
 actorId: string
) {
 const roomId = requireText(body.roomId);

 if (!roomId) {
 return NextResponse.json(
 { ok: false, error: "缺少 roomId" },
 { status: 400 }
 );
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .update({
 status: "removed",
 removed_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("room_id", roomId)
 .eq("status", "active")
 .select("*");

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message:
 data && data.length > 0 ? "已取消收藏房间" : "该房间不在收藏列表中",
 data: (data || []) as RoomFavoriteRow[],
 });
}

async function handleListRoomFavorites(actorId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .select("*")
 .eq("user_id", actorId)
 .eq("status", "active")
 .order("updated_at", { ascending: false })
 .limit(200);

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "私密房间收藏列表已读取",
 data: (data || []) as RoomFavoriteRow[],
 });
}

async function handleUpdateRoomFavoriteRemark(
 body: Record<string, unknown>,
 actorId: string
) {
 const roomId = requireText(body.roomId);

 if (!roomId) {
 return NextResponse.json(
 { ok: false, error: "缺少 roomId" },
 { status: 400 }
 );
 }

 const rawRemark =
 typeof body.roomRemark === "string" ? body.roomRemark.trim() : "";

 const nextRemark = rawRemark.length > 0 ? rawRemark.slice(0, 40) : null;

 const { data, error } = await supabaseAdmin
 .from("private_chat_room_favorites")
 .update({
 room_remark: nextRemark,
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", actorId)
 .eq("room_id", roomId)
 .eq("status", "active")
 .select("*")
 .maybeSingle();

 if (error) {
 return NextResponse.json(
 { ok: false, error: error.message },
 { status: 500 }
 );
 }

 if (!data) {
 return NextResponse.json(
 { ok: false, error: "该房间不在收藏列表中" },
 { status: 404 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: nextRemark ? "房间备注已更新" : "房间备注已清除",
 data: data as RoomFavoriteRow,
 });
}

export async function POST(request: Request) {
 try {
 const body = await request.json();

 const action = body.action as PrivateAction | undefined;
 const actorId = requireText(body.actorId);

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

 if (action === "block_user") {
 return await handleBlockUser(body, actorId);
 }

 if (action === "unblock_user") {
 return await handleUnblockUser(body, actorId);
 }

 if (action === "list_blocked_users") {
 return await handleListBlockedUsers(actorId);
 }

 if (action === "add_friend") {
 return await handleAddFriend(body, actorId);
 }

 if (action === "remove_friend") {
 return await handleRemoveFriend(body, actorId);
 }

 if (action === "list_friends") {
 return await handleListFriends(actorId);
 }

 if (action === "update_friend_remark") {
 return await handleUpdateFriendRemark(body, actorId);
 }

 if (action === "add_room_favorite") {
 return await handleAddRoomFavorite(body, actorId);
 }

 if (action === "remove_room_favorite") {
 return await handleRemoveRoomFavorite(body, actorId);
 }

 if (action === "list_room_favorites") {
 return await handleListRoomFavorites(actorId);
 }

 if (action === "update_room_favorite_remark") {
 return await handleUpdateRoomFavoriteRemark(body, actorId);
 }

 if (action === "delete_message") {
 const messageId = requireText(body.messageId);

 if (!messageId) {
 return NextResponse.json(
 { ok: false, error: "缺少 messageId" },
 { status: 400 }
 );
 }

 const { data: message, error: queryError } = await supabaseAdmin
 .from("private_chat_messages")
 .select("id, room_id, sender_id, media_path")
 .eq("id", messageId)
 .maybeSingle();

 if (queryError) {
 return NextResponse.json(
 { ok: false, error: queryError.message },
 { status: 500 }
 );
 }

 if (!message) {
 return NextResponse.json(
 { ok: false, error: "消息不存在或已被删除" },
 { status: 404 }
 );
 }

 const row = message as PrivateMessageRow;

 if (row.sender_id !== actorId) {
 return NextResponse.json(
 { ok: false, error: "只能删除自己发送的消息" },
 { status: 403 }
 );
 }

 if (row.media_path) {
 const removeResult = await removeMediaFiles([row.media_path]);

 if (!removeResult.ok) {
 return NextResponse.json(
 { ok: false, error: removeResult.error || "删除媒体文件失败" },
 { status: 500 }
 );
 }

 await markMediaLogsDeletedByPaths([row.media_path], actorId);
 await markMediaLogsDeletedByMessageIds([row.id], actorId);
 await markMediaUploadsDeletedByPaths([row.media_path], actorId);
 await markMediaUploadsDeletedByMessageIds([row.id], actorId);
 }

 const { error: deleteError } = await supabaseAdmin
 .from("private_chat_messages")
 .delete()
 .eq("id", row.id);

 if (deleteError) {
 return NextResponse.json(
 { ok: false, error: deleteError.message },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "消息已删除",
 });
 }

 if (action === "clear_room_messages") {
 const roomId = requireText(body.roomId);

 if (!roomId) {
 return NextResponse.json(
 { ok: false, error: "缺少 roomId" },
 { status: 400 }
 );
 }

 const actorRole = await getAdminRole(actorId);
 const canClearWholeRoom = actorRole === "owner" || actorRole === "admin";

 let query = supabaseAdmin
 .from("private_chat_messages")
 .select("id, room_id, sender_id, media_path")
 .eq("room_id", roomId)
 .limit(5000);

 if (!canClearWholeRoom) {
 query = query.eq("sender_id", actorId);
 }

 const { data: rows, error: queryError } = await query;

 if (queryError) {
 return NextResponse.json(
 { ok: false, error: queryError.message },
 { status: 500 }
 );
 }

 const messages = (rows || []) as PrivateMessageRow[];

 const messageIds = messages.map((item) => item.id);
 const mediaPaths = messages
 .map((item) => item.media_path)
 .filter((path): path is string => Boolean(path));

 const removeResult = await removeMediaFiles(mediaPaths);

 if (!removeResult.ok) {
 return NextResponse.json(
 { ok: false, error: removeResult.error || "清空媒体文件失败" },
 { status: 500 }
 );
 }

 await markMediaLogsDeletedByPaths(mediaPaths, actorId);
 await markMediaLogsDeletedByMessageIds(messageIds, actorId);
 await markMediaUploadsDeletedByPaths(mediaPaths, actorId);
 await markMediaUploadsDeletedByMessageIds(messageIds, actorId);

 if (messageIds.length > 0) {
 let deleteQuery = supabaseAdmin
 .from("private_chat_messages")
 .delete()
 .eq("room_id", roomId);

 if (!canClearWholeRoom) {
 deleteQuery = deleteQuery.eq("sender_id", actorId);
 }

 const { error: deleteError } = await deleteQuery;

 if (deleteError) {
 return NextResponse.json(
 { ok: false, error: deleteError.message },
 { status: 500 }
 );
 }
 }

 return NextResponse.json({
 ok: true,
 message: canClearWholeRoom
 ? "当前房间消息已由管理员清空"
 : "已清空你在当前房间发送的消息",
 deletedCount: messageIds.length,
 adminRole: actorRole,
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
