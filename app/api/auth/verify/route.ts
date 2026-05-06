import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { getAuthSession } from "@/app/lib/auth/session";

type VerifyBody = {
 message?: string;
 signature?: string;
};

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as VerifyBody;
 const { message, signature } = body;

 console.log("----- incoming message start -----");
 console.log(message);
 console.log("----- incoming message end -----");
 console.log("incoming message json:", JSON.stringify(message));
 console.log("verify body signature:", signature);

 if (!message || !signature) {
 return NextResponse.json(
 {
 success: false,
 error: "Missing message or signature.",
 },
 { status: 400 }
 );
 }

 const session = await getAuthSession();

 console.log("session.nonce before verify:", session.nonce);

 if (!session.nonce) {
 return NextResponse.json(
 {
 success: false,
 error: "Nonce not found in session.",
 },
 { status: 400 }
 );
 }

 const siweMessage = new SiweMessage(message);

 console.log("parsed siwe fields:", {
 domain: siweMessage.domain,
 address: siweMessage.address,
 uri: siweMessage.uri,
 version: siweMessage.version,
 chainId: siweMessage.chainId,
 nonce: siweMessage.nonce,
 issuedAt: siweMessage.issuedAt,
 });

 const result = await siweMessage.verify({
 signature,
 nonce: session.nonce,
 });

 console.log("siwe verify result:", result);

 if (!result.success) {
 return NextResponse.json(
 {
 success: false,
 error: "SIWE verification failed.",
 detail: result,
 },
 { status: 401 }
 );
 }

 session.siwe = {
 address: result.data.address,
 chainId: result.data.chainId,
 issuedAt: new Date().toISOString(),
 };

 session.nonce = undefined;
 await session.save();

 console.log("session saved:", session.siwe);

 return NextResponse.json({
 success: true,
 user: session.siwe,
 });
 } catch (error) {
 console.error("POST /api/auth/verify error:", error);

 return NextResponse.json(
 {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : "Failed to verify wallet signature.",
 },
 { status: 500 }
 );
 }
}