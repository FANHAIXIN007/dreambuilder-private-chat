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

 if (!session.nonce) {
 return NextResponse.json(
 {
 success: false,
 error: "Nonce not found in session.",
 },
 { status: 400 }
 );
 }

 const siwe = new SiweMessage(message);

 const result = await siwe.verify({
 signature,
 nonce: session.nonce,
 });

 if (!result.success) {
 return NextResponse.json(
 {
 success: false,
 error: "SIWE verification failed.",
 },
 { status: 401 }
 );
 }

 session.siwe = {
 address: siwe.address,
 chainId: siwe.chainId,
 issuedAt: new Date().toISOString(),
 };

 session.nonce = undefined;
 await session.save();

 return NextResponse.json({
 success: true,
 user: session.siwe,
 });
 } catch (error) {
 console.error("POST /api/auth/verify error:", error);

 return NextResponse.json(
 {
 success: false,
 error: "Failed to verify wallet signature.",
 },
 { status: 500 }
 );
 }
}