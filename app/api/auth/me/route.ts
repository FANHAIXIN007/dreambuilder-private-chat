import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/lib/auth/session";

export async function GET() {
 try {
 const session = await getAuthSession();

 return NextResponse.json({
 success: true,
 authenticated: Boolean(session.siwe?.address),
 user: session.siwe || null,
 });
 } catch (error) {
 console.error("GET /api/auth/me error:", error);

 return NextResponse.json(
 {
 success: false,
 authenticated: false,
 user: null,
 },
 { status: 500 }
 );
 }
}