import { NextResponse } from "next/server";

export async function GET() {
 try {
 const [btcRes, fxRes] = await Promise.all([
 fetch(
 "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
 {
 cache: "no-store",
 }
 ),
 fetch("https://open.er-api.com/v6/latest/USD", {
 cache: "no-store",
 }),
 ]);

 if (!btcRes.ok) {
 throw new Error(`BTC API failed: ${btcRes.status}`);
 }

 if (!fxRes.ok) {
 throw new Error(`FX API failed: ${fxRes.status}`);
 }

 const btcData = await btcRes.json();
 const fxData = await fxRes.json();

 const btcUsd = btcData?.bitcoin?.usd;
 const usdToCny = fxData?.rates?.CNY;

 if (!btcUsd || !usdToCny) {
 throw new Error("Invalid market data response");
 }

 return NextResponse.json({
 success: true,
 rates: {
 USD: 1,
 CNY: usdToCny,
 USDT: 1,
 BTC: 1 / btcUsd,
 },
 meta: {
 updatedAt: new Date().toISOString(),
 btcUsd,
 usdToCny,
 },
 });
 } catch (error) {
 console.error("market-data route error:", error);

 return NextResponse.json(
 {
 success: true,
 rates: {
 USD: 1,
 CNY: 7.2,
 USDT: 1,
 BTC: 1 / 65000,
 },
 meta: {
 updatedAt: new Date().toISOString(),
 fallback: true,
 },
 },
 { status: 200 }
 );
 }
}