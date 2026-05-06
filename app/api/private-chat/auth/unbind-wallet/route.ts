import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LoginProvider = "guest" | "email" | "wallet" | "wechat" | "dreambuilder";

type AppAccountRow = {
 id: string;
 email: string | null;
 display_name: string | null;
 avatar: string | null;
 wallet_address: string | null;
 wechat_openid: string | null;
 login_provider: LoginProvider | null;
 created_at?: string;
 updated_at?: string;
 last_login_at?: string | null;
};

function normalizeWalletAddress(address?: string | null) {
 return address ? address.trim().toLowerCase() : "";
}

function normalizeBoolean(value: unknown) {
 if (typeof value === "boolean") return value;

 if (typeof value === "string") {
 const normalized = value.trim().toLowerCase();

 return (
 normalized === "true" ||
 normalized === "1" ||
 normalized === "yes" ||
 normalized === "on"
 );
 }

 if (typeof value === "number") {
 return value === 1;
 }

 return false;
}

function getSupabaseAdmin() {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

 if (!supabaseUrl || !serviceRoleKey) {
 throw new Error(
 "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
 );
 }

 return createClient(supabaseUrl, serviceRoleKey, {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
 });
}

function getNextProvider(params: {
 hasEmail: boolean;
 hasWechat: boolean;
 force: boolean;
 oldProvider: LoginProvider | null;
}): LoginProvider {
 if (params.hasEmail) return "email";
 if (params.hasWechat) return "wechat";

 if (params.force) {
 return "guest";
 }

 return params.oldProvider || "wallet";
}

export async function POST(request: Request) {
 try {
 const body = await request.json().catch(() => null);

 const accountId =
 typeof body?.accountId === "string" ? body.accountId.trim() : "";

 const walletAddress = normalizeWalletAddress(
 typeof body?.walletAddress === "string" ? body.walletAddress : ""
 );

 const force = normalizeBoolean(body?.force);

 if (!accountId && !walletAddress) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少账号 ID 或钱包地址，无法解绑钱包。",
 },
 { status: 400 }
 );
 }

 const supabase = getSupabaseAdmin();

 let accountQuery = supabase
 .from("app_accounts")
 .select(
 "id,email,display_name,avatar,wallet_address,wechat_openid,login_provider,created_at,updated_at,last_login_at"
 )
 .limit(1);

 if (accountId) {
 accountQuery = accountQuery.eq("id", accountId);
 } else {
 accountQuery = accountQuery.eq("wallet_address", walletAddress);
 }

 const { data: accounts, error: accountError } = await accountQuery;

 if (accountError) {
 return NextResponse.json(
 {
 ok: false,
 error: accountError.message || "查询统一账号失败。",
 },
 { status: 500 }
 );
 }

 const account = accounts?.[0] as AppAccountRow | undefined;

 if (!account) {
 return NextResponse.json(
 {
 ok: false,
 error: "没有找到对应的统一账号。",
 },
 { status: 404 }
 );
 }

 const currentWallet = normalizeWalletAddress(account.wallet_address);

 if (walletAddress && currentWallet && currentWallet !== walletAddress) {
 return NextResponse.json(
 {
 ok: false,
 error: "当前钱包地址与账号绑定的钱包地址不一致，已取消解绑。",
 },
 { status: 409 }
 );
 }

 if (!currentWallet) {
 return NextResponse.json({
 ok: true,
 message: "当前账号没有绑定钱包，无需解绑。",
 data: {
 account,
 loginProvider: account.login_provider || "guest",
 forceUnbound: false,
 },
 });
 }

 const hasEmail = Boolean(account.email);
 const hasWechat = Boolean(account.wechat_openid);
 const onlyWalletLogin = !hasEmail && !hasWechat;

 if (onlyWalletLogin && !force) {
 return NextResponse.json(
 {
 ok: false,
 error:
 "当前账号只有钱包这一种登录方式。如果继续解绑钱包，你可能无法再次登录这个统一账号。请先绑定邮箱，或二次确认后强制解绑。",
 needForceConfirm: true,
 },
 { status: 400 }
 );
 }

 const nextProvider = getNextProvider({
 hasEmail,
 hasWechat,
 force,
 oldProvider: account.login_provider,
 });

 const now = new Date().toISOString();

 const { data: updatedAccount, error: updateAccountError } = await supabase
 .from("app_accounts")
 .update({
 wallet_address: null,
 login_provider: nextProvider,
 updated_at: now,
 })
 .eq("id", account.id)
 .select(
 "id,email,display_name,avatar,wallet_address,wechat_openid,login_provider,created_at,updated_at,last_login_at"
 )
 .single();

 if (updateAccountError) {
 return NextResponse.json(
 {
 ok: false,
 error: updateAccountError.message || "更新统一账号失败。",
 },
 { status: 500 }
 );
 }

 const { error: updateProfileError } = await supabase
 .from("private_chat_profiles")
 .update({
 source: nextProvider,
 updated_at: now,
 })
 .eq("account_id", account.id);

 if (updateProfileError) {
 return NextResponse.json(
 {
 ok: false,
 error:
 updateProfileError.message ||
 "钱包已从统一账号解绑，但更新聊天资料失败。",
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message:
 onlyWalletLogin && force
 ? "钱包已强制从云端统一账号解绑。请尽快绑定邮箱或重新绑定钱包，否则该账号可能无法再次登录。"
 : "钱包已从云端统一账号正式解绑。",
 data: {
 account: updatedAccount,
 loginProvider: nextProvider,
 forceUnbound: onlyWalletLogin && force,
 },
 });
 } catch (error) {
 const message =
 error instanceof Error ? error.message : "解绑钱包接口发生未知错误。";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}