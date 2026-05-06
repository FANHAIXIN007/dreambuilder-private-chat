import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminRole = "owner" | "admin";

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

async function countRows(table: string) {
 const { count, error } = await supabaseAdmin
 .from(table)
 .select("*", {
 count: "exact",
 head: true,
 });

 if (error) {
 throw new Error(error.message);
 }

 return count || 0;
}

async function countRowsWithFilter(
 table: string,
 filter: (query: ReturnType<typeof supabaseAdmin.from>) => unknown
) {
 const baseQuery = supabaseAdmin
 .from(table)
 .select("*", {
 count: "exact",
 head: true,
 });

 const finalQuery = filter(baseQuery as never) as Promise<{
 count: number | null;
 error: { message: string } | null;
 }>;

 const { count, error } = await finalQuery;

 if (error) {
 throw new Error(error.message);
 }

 return count || 0;
}

function parseBooleanSetting(value: unknown) {
 if (typeof value === "boolean") return value;

 if (typeof value === "number") {
 return value === 1;
 }

 if (typeof value === "string") {
 const normalized = value.trim().toLowerCase();

 return (
 normalized === "true" ||
 normalized === "1" ||
 normalized === "yes" ||
 normalized === "on"
 );
 }

 return false;
}

function parseNumberSetting(value: unknown) {
 const parsed = Number(value);

 if (!Number.isFinite(parsed)) return 0;

 return Math.max(0, parsed);
}

async function getSettingValue(key: string) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_settings")
 .select("value")
 .eq("key", key)
 .maybeSingle();

 if (error || !data) {
 return null;
 }

 return data.value;
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;
 const actorId = requireText(body.actorId);

 if (!actorId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少管理员身份。",
 },
 { status: 400 }
 );
 }

 const role = await getAdminRole(actorId);

 if (role !== "owner" && role !== "admin") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前账号不是管理员。",
 },
 { status: 403 }
 );
 }

 const [
 adminCount,
 activeBanCount,
 activeAnnouncementCount,
 publicChatPausedValue,
 cooldownSecondsValue,
 ] = await Promise.all([
 countRows("private_chat_admins"),
 countRowsWithFilter("private_chat_bans", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).eq("is_active", true)
 ),
 countRowsWithFilter("private_chat_announcements", (query) =>
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (query as any).eq("is_active", true)
 ),
 getSettingValue("public_chat_paused"),
 getSettingValue("public_chat_cooldown_seconds"),
 ]);

 return NextResponse.json({
 ok: true,
 data: {
 role,
 overview: {
 adminCount,
 activeBanCount,
 activeAnnouncementCount,
 publicChatPaused: parseBooleanSetting(publicChatPausedValue),
 cooldownSeconds: parseNumberSetting(cooldownSecondsValue),
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