import { NextResponse } from "next/server";

type PaymentRecordBody = {
 txHash?: string;
 walletAddress?: string;
 plotId?: string;
 lotId?: string;
 amountUsdt?: string;
 chainId?: number;
};

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as PaymentRecordBody;

 if (
 !body.txHash ||
 !body.walletAddress ||
 !body.plotId ||
 !body.lotId ||
 !body.amountUsdt ||
 !body.chainId
 ) {
 return NextResponse.json(
 {
 success: false,
 error: "Missing payment fields.",
 },
 { status: 400 }
 );
 }

 return NextResponse.json({
 success: true,
 payment: {
 txHash: body.txHash,
 walletAddress: body.walletAddress,
 plotId: body.plotId,
 lotId: body.lotId,
 amountUsdt: body.amountUsdt,
 chainId: body.chainId,
 recordedAt: new Date().toISOString(),
 },
 });
 } catch (error) {
 console.error("POST /api/payments/record error:", error);

 return NextResponse.json(
 {
 success: false,
 error: "Failed to record payment.",
 },
 { status: 500 }
 );
 }
}