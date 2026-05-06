import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/lib/auth/session";

export async function POST() {
 try {
 const session = await getAuthSession();
 await session.destroy();

 return NextResponse.json({
 success: true,
 });
 } catch (error) {
 console.error("POST /api/auth/logout error:", error);

 return NextResponse.json(
 {
 success: false,
 error: "Failed to logout.",
 },
 { status: 500 }
 );
 }
}