import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/lib/auth/session";
import { generateNonce } from "@/app/lib/auth/siwe";

export async function GET() {
 try {
 const session = await getAuthSession();
 const nonce = generateNonce();

 session.nonce = nonce;
 await session.save();

 return NextResponse.json({
 success: true,
 nonce,
 });
 } catch (error) {
 console.error("GET /api/auth/nonce error:", error);

 return NextResponse.json(
 {
 success: false,
 error: "Failed to generate nonce.",
 },
 { status: 500 }
 );
 }
}