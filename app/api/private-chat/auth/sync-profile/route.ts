import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LoginProvider = "guest" | "email" | "wallet" | "wechat" | "dreambuilder";

type AccountRow = {
 id: string;
 email: string | null;
 display_name: string;
 avatar: string;
 wallet_address: string | null;
 wechat_openid: string | null;
 login_provider: LoginProvider;
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
 source: LoginProvider;
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

function optionalText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: unknown) {
 const name = optionalText(value);

 return (name || "游客").slice(0, 40);
}

function normalizeAvatar(value: unknown) {
 const avatar = optionalText(value);

 return (avatar || "🌙").slice(0, 16);
}

function normalizeProvider(value: unknown): LoginProvider {
 if (
 value === "guest" ||
 value === "email" ||
 value === "wallet" ||
 value === "wechat" ||
 value === "dreambuilder"
 ) {
 return value;
 }

 return "guest";
}

function normalizeEmail(value: unknown) {
 const email = optionalText(value);

 if (!email) return null;

 return email.toLowerCase().slice(0, 160);
}

function normalizeWalletAddress(value: unknown) {
 const walletAddress = optionalText(value);

 if (!walletAddress) return null;

 return walletAddress.toLowerCase().slice(0, 120);
}

function normalizeWechatOpenid(value: unknown) {
 const openid = optionalText(value);

 if (!openid) return null;

 return openid.slice(0, 160);
}

function createChatUserId(provider: LoginProvider, seed?: string | null) {
 const safeSeed =
 seed
 ?.toLowerCase()
 .replace(/[^a-z0-9_-]/g, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "")
 .slice(0, 48) || Math.random().toString(36).slice(2, 14);

 return `pc_${provider}_${safeSeed}`;
}

async function findAccountByEmail(email: string | null) {
 if (!email) return null;

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select("*")
 .eq("email", email)
 .maybeSingle();

 if (error) throw new Error(error.message);

 return data ? (data as AccountRow) : null;
}

async function findAccountByWalletAddress(walletAddress: string | null) {
 if (!walletAddress) return null;

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select("*")
 .eq("wallet_address", walletAddress)
 .maybeSingle();

 if (error) throw new Error(error.message);

 return data ? (data as AccountRow) : null;
}

async function findAccountByWechatOpenid(wechatOpenid: string | null) {
 if (!wechatOpenid) return null;

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select("*")
 .eq("wechat_openid", wechatOpenid)
 .maybeSingle();

 if (error) throw new Error(error.message);

 return data ? (data as AccountRow) : null;
}

function choosePrimaryAccount(params: {
 emailAccount: AccountRow | null;
 walletAccount: AccountRow | null;
 wechatAccount: AccountRow | null;
}) {
 if (params.emailAccount) return params.emailAccount;
 if (params.wechatAccount) return params.wechatAccount;
 if (params.walletAccount) return params.walletAccount;

 return null;
}

function uniqueAccounts(accounts: Array<AccountRow | null>) {
 const map = new Map<string, AccountRow>();

 for (const account of accounts) {
 if (!account) continue;
 map.set(account.id, account);
 }

 return Array.from(map.values());
}

async function releaseDuplicateAccountIdentity(params: {
 duplicateAccount: AccountRow;
 primaryAccount: AccountRow;
}) {
 const now = new Date().toISOString();

 const updatePayload: Partial<{
 email: string | null;
 wallet_address: string | null;
 wechat_openid: string | null;
 updated_at: string;
 }> = {
 updated_at: now,
 };

 if (
 params.duplicateAccount.email &&
 params.primaryAccount.email &&
 params.duplicateAccount.email === params.primaryAccount.email
 ) {
 updatePayload.email = null;
 }

 if (
 params.duplicateAccount.wallet_address &&
 params.primaryAccount.wallet_address &&
 params.duplicateAccount.wallet_address ===
 params.primaryAccount.wallet_address
 ) {
 updatePayload.wallet_address = null;
 }

 if (
 params.duplicateAccount.wechat_openid &&
 params.primaryAccount.wechat_openid &&
 params.duplicateAccount.wechat_openid ===
 params.primaryAccount.wechat_openid
 ) {
 updatePayload.wechat_openid = null;
 }

 if (Object.keys(updatePayload).length <= 1) {
 updatePayload.wallet_address = null;
 }

 const { error } = await supabaseAdmin
 .from("app_accounts")
 .update(updatePayload)
 .eq("id", params.duplicateAccount.id);

 if (error) throw new Error(error.message);
}

async function migrateDuplicateProfiles(params: {
 duplicateAccount: AccountRow;
 primaryAccount: AccountRow;
 provider: LoginProvider;
 chatName: string;
 chatAvatar: string;
}) {
 const now = new Date().toISOString();

 const { data: primaryProfile, error: primaryProfileError } =
 await supabaseAdmin
 .from("private_chat_profiles")
 .select("*")
 .eq("account_id", params.primaryAccount.id)
 .maybeSingle();

 if (primaryProfileError) {
 throw new Error(primaryProfileError.message);
 }

 const { data: duplicateProfiles, error: duplicateProfilesError } =
 await supabaseAdmin
 .from("private_chat_profiles")
 .select("*")
 .eq("account_id", params.duplicateAccount.id);

 if (duplicateProfilesError) {
 throw new Error(duplicateProfilesError.message);
 }

 const duplicateProfileRows = (duplicateProfiles || []) as ProfileRow[];

 if (!duplicateProfileRows.length) return;

 if (!primaryProfile) {
 const firstDuplicateProfile = duplicateProfileRows[0];

 const { error } = await supabaseAdmin
 .from("private_chat_profiles")
 .update({
 account_id: params.primaryAccount.id,
 chat_name: params.chatName || firstDuplicateProfile.chat_name,
 chat_avatar: params.chatAvatar || firstDuplicateProfile.chat_avatar,
 source: params.provider,
 last_seen_at: now,
 updated_at: now,
 })
 .eq("id", firstDuplicateProfile.id);

 if (error) throw new Error(error.message);

 const restProfileIds = duplicateProfileRows
 .slice(1)
 .map((profile) => profile.id);

 if (restProfileIds.length) {
 const { error: clearRestError } = await supabaseAdmin
 .from("private_chat_profiles")
 .update({
 account_id: null,
 updated_at: now,
 })
 .in("id", restProfileIds);

 if (clearRestError) throw new Error(clearRestError.message);
 }

 return;
 }

 const duplicateProfileIds = duplicateProfileRows.map((profile) => profile.id);

 const { error } = await supabaseAdmin
 .from("private_chat_profiles")
 .update({
 account_id: null,
 updated_at: now,
 })
 .in("id", duplicateProfileIds);

 if (error) throw new Error(error.message);
}

async function createOrUpdateAccount(params: {
 provider: LoginProvider;
 email: string | null;
 walletAddress: string | null;
 wechatOpenid: string | null;
 displayName: string;
 avatar: string;
 chatName: string;
 chatAvatar: string;
}) {
 const emailAccount = await findAccountByEmail(params.email);
 const walletAccount = await findAccountByWalletAddress(params.walletAddress);
 const wechatAccount = await findAccountByWechatOpenid(params.wechatOpenid);

 const primaryAccount = choosePrimaryAccount({
 emailAccount,
 walletAccount,
 wechatAccount,
 });

 const matchedAccounts = uniqueAccounts([
 emailAccount,
 walletAccount,
 wechatAccount,
 ]);

 const now = new Date().toISOString();

 if (primaryAccount) {
 const duplicateAccounts = matchedAccounts.filter(
 (account) => account.id !== primaryAccount.id
 );

 for (const duplicateAccount of duplicateAccounts) {
 await migrateDuplicateProfiles({
 duplicateAccount,
 primaryAccount,
 provider: params.provider,
 chatName: params.chatName,
 chatAvatar: params.chatAvatar,
 });

 await releaseDuplicateAccountIdentity({
 duplicateAccount,
 primaryAccount,
 });
 }

 const nextEmail = primaryAccount.email || params.email;
 const nextWalletAddress =
 primaryAccount.wallet_address || params.walletAddress;
 const nextWechatOpenid = primaryAccount.wechat_openid || params.wechatOpenid;

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .update({
 email: nextEmail,
 display_name: params.displayName || primaryAccount.display_name,
 avatar: params.avatar || primaryAccount.avatar,
 wallet_address: nextWalletAddress,
 wechat_openid: nextWechatOpenid,
 login_provider: params.provider,
 last_login_at: now,
 updated_at: now,
 })
 .eq("id", primaryAccount.id)
 .select("*")
 .single();

 if (error) throw new Error(error.message);

 return data as AccountRow;
 }

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .insert({
 email: params.email,
 display_name: params.displayName,
 avatar: params.avatar,
 wallet_address: params.walletAddress,
 wechat_openid: params.wechatOpenid,
 login_provider: params.provider,
 last_login_at: now,
 updated_at: now,
 })
 .select("*")
 .single();

 if (error) throw new Error(error.message);

 return data as AccountRow;
}

async function findProfileByAccount(accountId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .select("*")
 .eq("account_id", accountId)
 .maybeSingle();

 if (error) throw new Error(error.message);

 return data ? (data as ProfileRow) : null;
}

async function findProfileByChatUserId(chatUserId: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .select("*")
 .eq("chat_user_id", chatUserId)
 .maybeSingle();

 if (error) throw new Error(error.message);

 return data ? (data as ProfileRow) : null;
}

async function createOrUpdateProfile(params: {
 account: AccountRow;
 provider: LoginProvider;
 chatUserId?: string | null;
 chatName: string;
 chatAvatar: string;
}) {
 const generatedChatUserId =
 params.chatUserId ||
 createChatUserId(
 params.provider,
 params.account.email ||
 params.account.wallet_address ||
 params.account.wechat_openid ||
 params.account.id
 );

 const existingProfileByAccount = await findProfileByAccount(params.account.id);

 const existingProfileByChatUserId = params.chatUserId
 ? await findProfileByChatUserId(params.chatUserId)
 : null;

 const existingProfile =
 existingProfileByAccount || existingProfileByChatUserId || null;

 if (existingProfile) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .update({
 account_id: params.account.id,
 chat_user_id: existingProfile.chat_user_id || generatedChatUserId,
 chat_name: params.chatName,
 chat_avatar: params.chatAvatar,
 source: params.provider,
 last_seen_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", existingProfile.id)
 .select("*")
 .single();

 if (error) throw new Error(error.message);

 return data as ProfileRow;
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_profiles")
 .insert({
 account_id: params.account.id,
 chat_user_id: generatedChatUserId,
 chat_name: params.chatName,
 chat_avatar: params.chatAvatar,
 source: params.provider,
 last_seen_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .select("*")
 .single();

 if (error) throw new Error(error.message);

 return data as ProfileRow;
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;

 const provider = normalizeProvider(body.provider);
 const email = normalizeEmail(body.email);
 const walletAddress = normalizeWalletAddress(body.walletAddress);
 const wechatOpenid = normalizeWechatOpenid(body.wechatOpenid);

 const displayName = normalizeName(body.displayName || body.chatName);
 const avatar = normalizeAvatar(body.avatar || body.chatAvatar);

 const chatUserId = optionalText(body.chatUserId);
 const chatName = normalizeName(body.chatName || displayName);
 const chatAvatar = normalizeAvatar(body.chatAvatar || avatar);

 if (provider === "guest") {
 return NextResponse.json(
 {
 ok: false,
 error: "guest 不需要同步正式账号。",
 },
 { status: 400 }
 );
 }

 if (!email && !walletAddress && !wechatOpenid) {
 return NextResponse.json(
 {
 ok: false,
 error:
 "缺少账号标识：email、walletAddress、wechatOpenid 至少需要一个。",
 },
 { status: 400 }
 );
 }

 const account = await createOrUpdateAccount({
 provider,
 email,
 walletAddress,
 wechatOpenid,
 displayName,
 avatar,
 chatName,
 chatAvatar,
 });

 const profile = await createOrUpdateProfile({
 account,
 provider,
 chatUserId,
 chatName,
 chatAvatar,
 });

 return NextResponse.json({
 ok: true,
 message: "聊天身份已同步。",
 data: {
 account: {
 accountId: account.id,
 email: account.email,
 displayName: account.display_name,
 avatar: account.avatar,
 walletAddress: account.wallet_address,
 wechatOpenid: account.wechat_openid,
 loginProvider: account.login_provider,
 lastLoginAt: account.last_login_at,
 },
 profile: {
 profileId: profile.id,
 accountId: profile.account_id,
 chatUserId: profile.chat_user_id,
 chatName: profile.chat_name,
 chatAvatar: profile.chat_avatar,
 source: profile.source,
 },
 chatUser: {
 id: profile.chat_user_id,
 name: profile.chat_name,
 avatar: profile.chat_avatar,
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