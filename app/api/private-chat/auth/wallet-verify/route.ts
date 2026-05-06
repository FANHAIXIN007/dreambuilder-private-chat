import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

const PRIVATE_CHAT_WALLET_NONCE_COOKIE = "private_chat_wallet_nonce";

type VerifyWalletRequestBody = {
 address?: string;
 message?: string;
 signature?: `0x${string}` | string;
 chainId?: number;
};

function requireText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function normalizeAddress(value?: string | null) {
 return value ? value.trim().toLowerCase() : "";
}

function extractMessageField(message: string, label: string) {
 const lines = message.split("\n");
 const prefix = `${label}:`;

 const line = lines.find((item) => item.trim().startsWith(prefix));

 if (!line) return null;

 return line.replace(prefix, "").trim();
}

function getExpectedOrigin(request: NextRequest) {
 const origin = request.headers.get("origin");

 if (origin) return origin;

 const host = request.headers.get("host");

 if (!host) return "";

 const protocol =
 process.env.NODE_ENV === "production" ? "https://" : "http://";

 return `${protocol}${host}`;
}

export async function POST(request: NextRequest) {
 try {
 const body = (await request.json()) as VerifyWalletRequestBody;

 const address = requireText(body.address);
 const message = requireText(body.message);
 const signature = requireText(body.signature);

 if (!address || !message || !signature) {
 return NextResponse.json(
 {
 ok: false,
 error: "钱包验证参数不完整。",
 },
 { status: 400 }
 );
 }

 const cookieNonce = request.cookies.get(PRIVATE_CHAT_WALLET_NONCE_COOKIE)
 ?.value;

 if (!cookieNonce) {
 return NextResponse.json(
 {
 ok: false,
 error: "登录 nonce 已过期，请重新连接钱包。",
 },
 { status: 401 }
 );
 }

 const messageNonce = extractMessageField(message, "Nonce");
 const messageChainId = extractMessageField(message, "Chain ID");
 const messageUri = extractMessageField(message, "URI");
 const messageIssuedAt = extractMessageField(message, "Issued At");

 if (!messageNonce || messageNonce !== cookieNonce) {
 return NextResponse.json(
 {
 ok: false,
 error: "Nonce 不匹配，请重新签名。",
 },
 { status: 401 }
 );
 }

 if (!messageChainId || Number(messageChainId) !== Number(body.chainId)) {
 return NextResponse.json(
 {
 ok: false,
 error: "链 ID 不匹配。",
 },
 { status: 400 }
 );
 }

 if (!messageIssuedAt || Number.isNaN(new Date(messageIssuedAt).getTime())) {
 return NextResponse.json(
 {
 ok: false,
 error: "签名时间无效。",
 },
 { status: 400 }
 );
 }

 const issuedAtTime = new Date(messageIssuedAt).getTime();
 const now = Date.now();
 const maxAgeMs = 10 * 60 * 1000;

 if (now - issuedAtTime > maxAgeMs) {
 return NextResponse.json(
 {
 ok: false,
 error: "签名已过期，请重新签名。",
 },
 { status: 401 }
 );
 }

 const expectedOrigin = getExpectedOrigin(request);

 if (messageUri && expectedOrigin && messageUri !== expectedOrigin) {
 return NextResponse.json(
 {
 ok: false,
 error: "签名来源不匹配。",
 },
 { status: 400 }
 );
 }

 const verified = await verifyMessage({
 address: address as `0x${string}`,
 message,
 signature: signature as `0x${string}`,
 });

 if (!verified) {
 return NextResponse.json(
 {
 ok: false,
 error: "钱包签名验证失败。",
 },
 { status: 401 }
 );
 }

 const normalizedAddress = normalizeAddress(address);

 const response = NextResponse.json({
 ok: true,
 message: "钱包签名验证成功。",
 data: {
 address: normalizedAddress,
 chainId: Number(body.chainId),
 issuedAt: messageIssuedAt,
 },
 });

 response.cookies.set(PRIVATE_CHAT_WALLET_NONCE_COOKIE, "", {
 httpOnly: true,
 sameSite: "lax",
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: 0,
 });

 return response;
 } catch (error) {
 const message = error instanceof Error ? error.message : "服务器错误。";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}