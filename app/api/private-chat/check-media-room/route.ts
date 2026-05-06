import { NextResponse } from "next/server";

/**
 * 推荐使用：
 * PRIVATE_CHAT_MEDIA_SECRETS=11627109875,测试_Media_7xQ91_2026,...
 *
 * 兼容旧写法：
 * PRIVATE_CHAT_MEDIA_SECRET_CODES=11627109875,测试_Media_7xQ91_2026,...
 *
 * 注意：
 * 1. 不要加 NEXT_PUBLIC_
 * 2. 等号两边不要有空格
 * 3. 多个暗语之间用英文逗号 ,
 * 4. 修改 .env.local 后必须重启 npm run dev
 */
const mediaSecretsRaw = [
 process.env.PRIVATE_CHAT_MEDIA_SECRETS || "",
 process.env.PRIVATE_CHAT_MEDIA_SECRET_CODES || "",
]
 .filter(Boolean)
 .join(",");

type CheckMediaRoomResponse = {
 ok: boolean;
 isAdminMediaRoom: boolean;
 message?: string;
};

function normalizeMediaSecret(value: string) {
 return value.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 32);
}

function getMediaSecretSet() {
 const rawSecrets = mediaSecretsRaw
 .split(",")
 .map((item) => item.trim())
 .filter(Boolean);

 const allSecrets = rawSecrets.flatMap((item) => [
 item,
 item.trim(),
 item.toLowerCase(),
 normalizeMediaSecret(item),
 ]);

 return new Set(allSecrets.filter(Boolean));
}

function isAllowedMediaSecret(secretCode: string | null) {
 if (!secretCode) return false;

 const mediaSecretSet = getMediaSecretSet();

 return (
 mediaSecretSet.has(secretCode) ||
 mediaSecretSet.has(secretCode.trim()) ||
 mediaSecretSet.has(secretCode.toLowerCase()) ||
 mediaSecretSet.has(normalizeMediaSecret(secretCode))
 );
}

export async function POST(request: Request) {
 try {
 const body = await request.json();
 const secretCode =
 typeof body.secretCode === "string" ? body.secretCode.trim() : "";

 if (!secretCode) {
 return NextResponse.json<CheckMediaRoomResponse>(
 {
 ok: false,
 isAdminMediaRoom: false,
 message: "缺少媒体房间暗语。",
 },
 { status: 400 }
 );
 }

 const isAdminMediaRoom = isAllowedMediaSecret(secretCode);

 return NextResponse.json<CheckMediaRoomResponse>({
 ok: true,
 isAdminMediaRoom,
 message: isAdminMediaRoom
 ? "当前是管理员媒体私密房间。"
 : "当前不是管理员媒体私密房间。",
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "服务器错误";

 return NextResponse.json<CheckMediaRoomResponse>(
 {
 ok: false,
 isAdminMediaRoom: false,
 message,
 },
 { status: 500 }
 );
 }
}