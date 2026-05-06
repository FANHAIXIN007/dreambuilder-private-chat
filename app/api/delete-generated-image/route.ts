import fs from "fs";
import path from "path";

function isSafeGeneratedImageUrl(imageUrl: string) {
 if (!imageUrl.startsWith("/houses/generated/")) return false;
 return /\.(png|jpg|jpeg|webp)$/i.test(imageUrl);
}

export async function POST(request: Request) {
 try {
 const { imageUrl } = await request.json();

 if (!imageUrl || typeof imageUrl !== "string") {
 return Response.json(
 { success: false, error: "Missing imageUrl" },
 { status: 400 }
 );
 }

 if (!isSafeGeneratedImageUrl(imageUrl)) {
 return Response.json(
 { success: false, error: "Invalid image path" },
 { status: 400 }
 );
 }

 const filePath = path.join(process.cwd(), "public", imageUrl);

 if (fs.existsSync(filePath)) {
 fs.unlinkSync(filePath);
 }

 return Response.json({ success: true });
 } catch (error: any) {
 return Response.json(
 {
 success: false,
 error: error?.message || "Failed to delete generated image.",
 },
 { status: 500 }
 );
 }
}