import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AccountRow = {
 id: string;
 email: string | null;
 display_name: string;
 avatar: string;
 wallet_address: string | null;
 wechat_openid: string | null;
 login_provider: string;
 created_at: string;
 updated_at: string;
 last_login_at: string | null;
};

type ProfileRow = {
 id: string;
 account_id: string | null;
 chat_user_id: string;
 chat_name: string;
 chat_avatar: string;
 source: string;
 created_at: string;
 updated_at: string;
 last_seen_at: string | null;
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

const AVATAR_OPTIONS = [
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

function optionalText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: unknown) {
 const name = optionalText(value);

 return (name || "用户").slice(0, 40);
}

function normalizeAvatar(value: unknown) {
 const avatar = optionalText(value);

 if (!avatar) return "🌙";

 if (AVATAR_OPTIONS.includes(avatar)) {
 return avatar;
 }

 return avatar.slice(0, 16);
}

async function findAccountById(accountId: string) {
 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select("*")
 .eq("id", accountId)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data ? (data as AccountRow) : null;
}

async function findProfileByAccountId(accountId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .select("*")
 .eq("account_id", accountId)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data ? (data as ProfileRow) : null;
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;

 const accountId = optionalText(body.accountId);
 const displayName = normalizeName(body.displayName);
 const avatar = normalizeAvatar(body.avatar);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId。",
 },
 { status: 400 }
 );
 }

 const account = await findAccountById(accountId);

 if (!account) {
 return NextResponse.json(
 {
 ok: false,
 error: "统一账号不存在。",
 },
 { status: 404 }
 );
 }

 const now = new Date().toISOString();

 const { data: updatedAccount, error: accountError } = await supabaseAdmin
 .from("app_accounts")
 .update({
 display_name: displayName,
 avatar,
 updated_at: now,
 })
 .eq("id", accountId)
 .select("*")
 .single();

 if (accountError) {
 throw new Error(accountError.message);
 }

 const existingProfile = await findProfileByAccountId(accountId);

 let updatedProfile: ProfileRow | null = null;

 if (existingProfile) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .update({
 chat_name: displayName,
 chat_avatar: avatar,
 updated_at: now,
 last_seen_at: now,
 })
 .eq("id", existingProfile.id)
 .select("*")
 .single();

 if (error) {
 throw new Error(error.message);
 }

 updatedProfile = data as ProfileRow;
 }

 const finalAccount = updatedAccount as AccountRow;

 return NextResponse.json({
 ok: true,
 message: "资料已更新。",
 data: {
 account: {
 accountId: finalAccount.id,
 email: finalAccount.email,
 displayName: finalAccount.display_name,
 avatar: finalAccount.avatar,
 walletAddress: finalAccount.wallet_address,
 wechatOpenid: finalAccount.wechat_openid,
 loginProvider: finalAccount.login_provider,
 lastLoginAt: finalAccount.last_login_at,
 },
 profile: updatedProfile
 ? {
 profileId: updatedProfile.id,
 accountId: updatedProfile.account_id,
 chatUserId: updatedProfile.chat_user_id,
 chatName: updatedProfile.chat_name,
 chatAvatar: updatedProfile.chat_avatar,
 source: updatedProfile.source,
 }
 : null,
 chatUser: updatedProfile
 ? {
 id: updatedProfile.chat_user_id,
 name: updatedProfile.chat_name,
 avatar: updatedProfile.chat_avatar,
 }
 : null,
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