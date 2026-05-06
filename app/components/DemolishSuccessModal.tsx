"use client";

import React from "react";

type Language = "zh" | "en";

type DemolishSuccessModalProps = {
 open: boolean;
 language: Language;
 houseTitle: string;
 houseImage: string;
 lotLabel: string;
 onClose: () => void;
 onGoMyLands: () => void;
};

export default function DemolishSuccessModal({
 open,
 language,
 houseTitle,
 houseImage,
 lotLabel,
 onClose,
 onGoMyLands,
}: DemolishSuccessModalProps) {
 if (!open) return null;

 return (
 <div
 className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={onClose}
 >
 <div
 className="w-full max-w-[560px] overflow-hidden rounded-[30px] border border-neutral-200 bg-white shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="relative bg-gradient-to-br from-orange-50 via-white to-amber-50 px-6 pb-5 pt-6">
 <button
 onClick={onClose}
 className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-all duration-200 hover:scale-105"
 >
 ✕
 </button>

 <div className="flex items-start gap-4">
 <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500 text-2xl text-white shadow-[0_14px_28px_rgba(249,115,22,0.28)]">
 🧱
 </div>

 <div className="pr-12">
 <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-orange-700">
 {language === "zh" ? "拆除成功" : "Demolition Successful"}
 </div>

 <h3 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
 {language === "zh"
 ? "房屋已成功拆除"
 : "House Removed Successfully"}
 </h3>

 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "对应土地已释放，可重新回到“我的土地”继续开发。"
 : "The land has been released and is now available again in My Lands."}
 </p>
 </div>
 </div>
 </div>

 <div className="px-6 py-5">
 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="flex gap-4">
 <div className="h-24 w-32 overflow-hidden rounded-[18px] border border-neutral-200 bg-white shadow-sm">
 <img
 src={houseImage}
 alt={houseTitle}
 className="h-full w-full object-cover"
 />
 </div>

 <div className="min-w-0 flex-1">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "已拆除房屋" : "Removed House"}
 </div>
 <div className="mt-2 line-clamp-2 text-base font-semibold text-neutral-900">
 {houseTitle}
 </div>

 <div className="mt-4 rounded-2xl bg-white px-3 py-3 shadow-sm">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "释放地块" : "Released Lot"}
 </div>
 <div className="mt-1 text-sm font-bold text-orange-700">
 {lotLabel}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 flex flex-wrap justify-end gap-3">
 <button
 onClick={onClose}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "留在当前页面" : "Stay Here"}
 </button>

 <button
 onClick={onGoMyLands}
 className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "去我的土地" : "Go to My Lands"}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}