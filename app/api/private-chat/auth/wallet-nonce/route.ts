import { NextResponse } from "next/server";

const PRIVATE_CHAT_WALLET_NONCE_COOKIE = "private_chat_wallet_nonce";

function createNonce() {
 const randomPart = Math.random().toString(36).slice(2, 12);
 const timePart = Date.now().toString(36);

 try {
 if (
 typeof crypto !== "undefined" &&
 typeof crypto.randomUUID === "function"
 ) {
 return crypto.randomUUID().replace(/-/g, "");
 }
 } catch {
 // fallback
 }

 return `${timePart}${randomPart}`;
}

export async function GET() {
 const nonce = createNonce();

 const response = NextResponse.json({
 ok: true,
 nonce,
 });

 response.cookies.set(PRIVATE_CHAT_WALLET_NONCE_COOKIE, nonce, {
 httpOnly: true,
 sameSite: "lax",
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: 60 * 10,
 });

 return response;
}