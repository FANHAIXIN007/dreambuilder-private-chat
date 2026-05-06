"use client";

import React from "react";

type Language = "zh" | "en";
type LotStatusType = "owned_unbuilt" | "building" | "built";

type BuildSuccessModalProps = {
 open: boolean;
 language: Language;
 lotLabel: string;
 houseTitle?: string;
 houseImage?: string;
 lotStatus?: LotStatusType;
 onClose: () => void;
 onGoMyProperties: () => void;
 onGoPlotDetail: () => void;
 onContinueCreate: () => void;
};

export default function BuildSuccessModal({
 open,
 language,
 lotLabel,
 houseTitle,
 houseImage,
 lotStatus = "built",
 onClose,
 onGoMyProperties,
 onGoPlotDetail,
 onContinueCreate,
}: BuildSuccessModalProps) {
 if (!open) return null;

 const isZh = language === "zh";

 const statusText =
 language === "zh"
 ? lotStatus === "owned_unbuilt"
 ? "已购买 · 待建造"
 : lotStatus === "building"
 ? "建造中"
 : "已建成 · 已绑定房屋"
 : lotStatus === "owned_unbuilt"
 ? "Owned · Awaiting Build"
 : lotStatus === "building"
 ? "Building"
 : "Built · House Bound";

 const statusBadgeClass =
 lotStatus === "owned_unbuilt"
 ? "bg-amber-50 text-amber-700"
 : lotStatus === "building"
 ? "bg-blue-50 text-blue-700"
 : "bg-emerald-50 text-emerald-700";

 const statusOverlayClass =
 lotStatus === "owned_unbuilt"
 ? "bg-amber-500/90"
 : lotStatus === "building"
 ? "bg-blue-500/90"
 : "bg-emerald-500/90";

 return (
 <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
 <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
 <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600" />

 <button
 onClick={onClose}
 className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
 aria-label={isZh ? "关闭" : "Close"}
 >
 ✕
 </button>

 <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
 <div className="relative min-h-[260px] bg-neutral-100 md:min-h-[420px]">
 {houseImage ? (
 <img
 src={houseImage}
 alt={houseTitle || (isZh ? "建造成功房屋预览" : "Built house preview")}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full min-h-[260px] items-center justify-center bg-neutral-100 text-sm text-neutral-400 md:min-h-[420px]">
 {isZh ? "暂无房屋缩略图" : "No house preview available"}
 </div>
 )}

 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent p-5">
 <div
 className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg ${statusOverlayClass}`}
 >
 {statusText}
 </div>
 </div>
 </div>

 <div className="px-6 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10">
 <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl shadow-inner">
 ✅
 </div>

 <h2 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
 {isZh ? "建造成功" : "Build Successful"}
 </h2>

 <p className="mt-3 text-sm leading-7 text-neutral-600 md:text-base">
 {isZh
 ? `你的房屋已经成功绑定到 ${lotLabel}。`
 : `Your house has been successfully bound to ${lotLabel}.`}
 </p>

 {houseTitle ? (
 <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
 {isZh ? "房屋名称" : "House Title"}
 </div>
 <div className="mt-2 text-lg font-semibold text-neutral-900">
 {houseTitle}
 </div>
 </div>
 ) : null}

 <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-4">
 <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
 {isZh ? "地块状态" : "Lot Status"}
 </div>
 <div
 className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass}`}
 >
 {statusText}
 </div>
 </div>

 <div className="mt-6 grid gap-3 sm:grid-cols-2">
 <button
 onClick={onGoMyProperties}
 className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {isZh ? "查看我的房产" : "View My Properties"}
 </button>

 <button
 onClick={onGoPlotDetail}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-50"
 >
 {isZh ? "查看该地块" : "View This Plot"}
 </button>
 </div>

 <button
 onClick={onContinueCreate}
 className="mt-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-200"
 >
 {isZh ? "继续生成下一套房屋" : "Generate Another House"}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}