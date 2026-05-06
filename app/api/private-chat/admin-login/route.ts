import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminLoginBody = {
 userId?: string;
 userName?: string;
 secret?: string;
};

function createServerSupabaseClient() {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

 if (!supabaseUrl) {
 throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
 }

 if (!supabaseKey) {
 throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
 }

 return createClient(supabaseUrl, supabaseKey, {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
 });
}

export async function GET() {
 return NextResponse.json({
 ok: true,
 message: "admin-login api is working",
 });
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as AdminLoginBody;

 const userId = body.userId?.trim();
 const userName = body.userName?.trim() || "管理员";
 const secret = body.secret?.trim();

 const adminSecret = process.env.PRIVATE_CHAT_ADMIN_SECRET?.trim();

 if (!adminSecret) {
 return NextResponse.json(
 {
 ok: false,
 message: "服务器没有配置管理员暗语。",
 },
 { status: 500 }
 );
 }

 if (!userId) {
 return NextResponse.json(
 {
 ok: false,
 message: "缺少当前用户 ID。",
 },
 { status: 400 }
 );
 }

 if (!secret) {
 return NextResponse.json(
 {
 ok: false,
 message: "请输入管理员暗语。",
 },
 { status: 400 }
 );
 }

 if (secret !== adminSecret) {
 return NextResponse.json(
 {
 ok: false,
 message: "管理员暗语不正确。",
 },
 { status: 403 }
 );
 }

 const supabase = createServerSupabaseClient();

 const { error } = await supabase.from("private_chat_admins").upsert(
 {
 user_id: userId,
 user_name: userName,
 role: "owner",
 created_by: "admin_secret",
 },
 {
 onConflict: "user_id",
 }
 );

 if (error) {
 console.error("Admin login upsert error:", error);

 return NextResponse.json(
 {
 ok: false,
 message: "写入管理员权限失败，请检查 Supabase 表和权限。",
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "管理员授权成功。",
 });
 } catch (error) {
 console.error("Admin login route error:", error);

 return NextResponse.json(
 {
 ok: false,
 message: "管理员授权失败，请稍后再试。",
 },
 { status: 500 }
 );
 }
}