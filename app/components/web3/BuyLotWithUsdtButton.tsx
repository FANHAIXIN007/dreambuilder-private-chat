"use client";

import { useEffect, useMemo, useState } from "react";
import {
 useAccount,
 useSwitchChain,
 useWaitForTransactionReceipt,
 useWriteContract,
} from "wagmi";
import { bsc } from "wagmi/chains";
import { parseUnits } from "viem";
import { BSC_USDT_ADDRESS } from "@/app/lib/web3/tokens";
import { BSC_RECEIVER_ADDRESS } from "@/app/lib/web3/payment";

type BuyLotWithUsdtButtonProps = {
 language?: "zh" | "en";
 plotId: string;
 lotId: string;
 amountUsdt: string;
 onSuccess?: (payload: { txHash: string }) => void;
 alreadyOwned?: boolean;
};

type OwnedLot = {
 plotId: string;
 lotId: string;
 acquiredAt: number;
};

const OWNED_LOTS_STORAGE_KEY = "db_owned_lots";

const erc20Abi = [
 {
 type: "function",
 name: "transfer",
 stateMutability: "nonpayable",
 inputs: [
 { name: "to", type: "address" },
 { name: "value", type: "uint256" },
 ],
 outputs: [{ name: "", type: "bool" }],
 },
] as const;

function loadOwnedLots(): OwnedLot[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = localStorage.getItem(OWNED_LOTS_STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
}

function saveOwnedLots(next: OwnedLot[]) {
 if (typeof window === "undefined") return;
 localStorage.setItem(OWNED_LOTS_STORAGE_KEY, JSON.stringify(next));

 window.dispatchEvent(
 new StorageEvent("storage", {
 key: OWNED_LOTS_STORAGE_KEY,
 newValue: JSON.stringify(next),
 storageArea: localStorage,
 })
 );
}

function shortHash(hash: string) {
 if (!hash) return "";
 return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function BuyLotWithUsdtButton({
 language = "zh",
 plotId,
 lotId,
 amountUsdt,
 onSuccess,
 alreadyOwned = false,
}: BuyLotWithUsdtButtonProps) {
 const { address, chain } = useAccount();
 const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
 const { writeContractAsync, isPending: isWriting } = useWriteContract();

 const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
 const [statusMessage, setStatusMessage] = useState("");
 const [hasFinalized, setHasFinalized] = useState(false);
 const [purchaseDone, setPurchaseDone] = useState(alreadyOwned);

 const isBsc = chain?.id === bsc.id;

 const {
 isLoading: isConfirming,
 isSuccess: isConfirmed,
 error: receiptError,
 } = useWaitForTransactionReceipt({
 hash: txHash,
 chainId: bsc.id,
 query: {
 enabled: Boolean(txHash),
 },
 });

 const text = useMemo(
 () =>
 language === "zh"
 ? {
 buyNow: "用 USDT 购买",
 bought: "已购买",
 switching: "切换中...",
 switchToBsc: "请先切换到 BSC",
 paying: "等待钱包确认...",
 confirming: "链上确认中...",
 success: "支付成功，地块已归属到你的账户。",
 failed: "支付失败",
 walletMissing: "请先连接钱包。",
 receiverMissing: "收款地址未配置。",
 alreadyOwned: "该地块已在你的账户中。",
 txLabel: "交易哈希",
 }
 : {
 buyNow: "Buy with USDT",
 bought: "Purchased",
 switching: "Switching...",
 switchToBsc: "Switch to BSC first",
 paying: "Waiting for wallet confirmation...",
 confirming: "Confirming on-chain...",
 success: "Payment successful. The lot now belongs to your account.",
 failed: "Payment Failed",
 walletMissing: "Please connect your wallet first.",
 receiverMissing: "Receiver address is not configured.",
 alreadyOwned: "This lot is already in your account.",
 txLabel: "Tx Hash",
 },
 [language]
 );

 useEffect(() => {
 setPurchaseDone(alreadyOwned);
 }, [alreadyOwned]);

 useEffect(() => {
 if (!receiptError) return;
 setStatusMessage(receiptError.message || text.failed);
 }, [receiptError, text.failed]);

 useEffect(() => {
 const finalizePurchase = async () => {
 if (!isConfirmed || !txHash || !address || hasFinalized) return;

 try {
 const res = await fetch("/api/payments/record", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 txHash,
 walletAddress: address,
 plotId,
 lotId,
 amountUsdt,
 chainId: bsc.id,
 }),
 });

 const data = await res.json();

 if (!res.ok || !data.success) {
 throw new Error(data.error || "Record payment failed.");
 }

 const currentOwnedLots = loadOwnedLots();
 const exists = currentOwnedLots.some(
 (item) => item.plotId === plotId && item.lotId === lotId
 );

 if (!exists) {
 const nextOwnedLots: OwnedLot[] = [
 {
 plotId,
 lotId,
 acquiredAt: Date.now(),
 },
 ...currentOwnedLots,
 ];
 saveOwnedLots(nextOwnedLots);
 }

 setStatusMessage(`${text.success} ${text.txLabel}: ${shortHash(txHash)}`);
 setHasFinalized(true);
 setPurchaseDone(true);
 onSuccess?.({ txHash });
 } catch (error) {
 console.error("finalizePurchase error:", error);
 setStatusMessage(
 error instanceof Error ? error.message : text.failed
 );
 }
 };

 finalizePurchase();
 }, [
 isConfirmed,
 txHash,
 address,
 plotId,
 lotId,
 amountUsdt,
 hasFinalized,
 onSuccess,
 text.success,
 text.failed,
 text.txLabel,
 ]);

 const handlePay = async () => {
 try {
 if (purchaseDone || alreadyOwned) {
 setStatusMessage(text.alreadyOwned);
 return;
 }

 setStatusMessage("");
 setHasFinalized(false);

 if (!address) {
 setStatusMessage(text.walletMissing);
 return;
 }

 if (
 !BSC_RECEIVER_ADDRESS ||
 BSC_RECEIVER_ADDRESS === "0x0000000000000000000000000000000000000000"
 ) {
 setStatusMessage(text.receiverMissing);
 return;
 }

 if (!isBsc) {
 await switchChain({ chainId: bsc.id });
 return;
 }

 const amount = parseUnits(amountUsdt, 18);

 console.log("BSC_RECEIVER_ADDRESS:", BSC_RECEIVER_ADDRESS);
 console.log("BSC_USDT_ADDRESS:", BSC_USDT_ADDRESS);
 console.log("amountUsdt:", amountUsdt);

 setStatusMessage(text.paying);

 const hash = await writeContractAsync({
 account: address,
 chain: bsc,
 address: BSC_USDT_ADDRESS as `0x${string}`,
 abi: erc20Abi,
 functionName: "transfer",
 args: [BSC_RECEIVER_ADDRESS as `0x${string}`, amount],
 chainId: bsc.id,
 });

 setTxHash(hash);
 setStatusMessage(text.confirming);
 } catch (error) {
 console.error("handlePay error:", error);
 setStatusMessage(
 error instanceof Error ? error.message : text.failed
 );
 }
 };

 const disabled =
 alreadyOwned || purchaseDone || isWriting || isConfirming || hasFinalized;

 const buttonLabel = alreadyOwned || purchaseDone
 ? text.bought
 : !isBsc
 ? isSwitchingChain
 ? text.switching
 : text.switchToBsc
 : isWriting
 ? text.paying
 : isConfirming
 ? text.confirming
 : text.buyNow;

 return (
 <div className="space-y-2">
 <button
 type="button"
 onClick={handlePay}
 disabled={disabled}
 className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
 alreadyOwned || purchaseDone
 ? "cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700"
 : "bg-neutral-900 text-white hover:bg-black disabled:opacity-50"
 }`}
 >
 {buttonLabel}
 </button>

 {statusMessage ? (
 <div
 className={`rounded-2xl px-3 py-2 text-xs ${
 statusMessage.includes(text.success) ||
 statusMessage.includes(text.alreadyOwned)
 ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
 : statusMessage.includes(text.failed)
 ? "border border-red-200 bg-red-50 text-red-700"
 : "border border-neutral-200 bg-neutral-50 text-neutral-600"
 }`}
 >
 {statusMessage}
 </div>
 ) : null}

 {txHash ? (
 <div className="text-xs text-neutral-400">
 {text.txLabel}: {shortHash(txHash)}
 </div>
 ) : null}
 </div>
 );
}
