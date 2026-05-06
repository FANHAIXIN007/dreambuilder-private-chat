"use client";

import React from "react";

type Language = "zh" | "en";

type DemolishPropertyModalProps = {
 open: boolean;
 language: Language;
 stage: "confirm" | "success";
 houseTitle: string;
 houseImage: string;
 lotLabel: string;
 onClose: () => void;
 onConfirmDemolish: () => void;
 onGoMyLands: () => void;
};

export default function DemolishPropertyModal({
 open,
 language,
 stage,
 houseTitle,
 houseImage,
 lotLabel,
 onClose,
 onConfirmDemolish,
 onGoMyLands,
}: DemolishPropertyModalProps) {
 if (!open) return null;

 const isConfirm = stage === "confirm";

 return (
 <div
 className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={onClose}
 >
 <div
 className="w-full max-w-[560px] overflow-hidden rounded-[30px] border border-neutral-200 bg-white shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div
 className={`relative px-6 pb-5 pt-6 ${
 isConfirm
 ? "bg-gradient-to-br from-red-50 via-white to-orange-50"
 : "bg-gradient-to-br from-orange-50 via-white to-amber-50"
 }`}
 >
 <button
 onClick={onClose}
 className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-all duration-200 hover:scale-105"
 >
 ✕
 </button>

 <div className="flex items-start gap-4">
 <div
 className={`flex h-14 w-14 items-center justify-center rounded-[20px] text-2xl text-white ${
 isConfirm
 ? "bg-red-500 shadow-[0_14px_28px_rgba(239,68,68,0.28)]"
 : "bg-orange-500 shadow-[0_14px_28px_rgba(249,115,22,0.28)]"
 }`}
 >
 {isConfirm ? "⚠️" : "🧱"}
 </div>

 <div className="pr-12">
 <div
 className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] ${
 isConfirm
 ? "border border-red-200 bg-red-50 text-red-700"
 : "border border-orange-200 bg-orange-50 text-orange-700"
 }`}
 >
 {isConfirm
 ? language === "zh"
 ? "确认拆除"
 : "Confirm Demolition"
 : language === "zh"
 ? "拆除成功"
 : "Demolition Successful"}
 </div>

 <h3 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
 {isConfirm
 ? language === "zh"
 ? "你确定要拆除这套房屋吗？"
 : "Are you sure you want to demolish this house?"
 : language === "zh"
 ? "房屋已成功拆除"
 : "House Removed Successfully"}
 </h3>

 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {isConfirm
 ? language === "zh"
 ? "拆除后该房屋会被销毁，但土地会保留，并重新回到“我的土地”中。"
 : "The house will be destroyed, but the land will remain and return to My Lands."
 : language === "zh"
 ? "对应土地已释放，可重新回到“我的土地”继续开发。"
 : "The land has been released and is available again in My Lands."}
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
 {isConfirm
 ? language === "zh"
 ? "待拆除房屋"
 : "House to Remove"
 : language === "zh"
 ? "已拆除房屋"
 : "Removed House"}
 </div>
 <div className="mt-2 line-clamp-2 text-base font-semibold text-neutral-900">
 {houseTitle}
 </div>

 <div className="mt-4 rounded-2xl bg-white px-3 py-3 shadow-sm">
 <div className="text-[11px] text-neutral-400">
 {isConfirm
 ? language === "zh"
 ? "将释放地块"
 : "Lot to Release"
 : language === "zh"
 ? "释放地块"
 : "Released Lot"}
 </div>
 <div
 className={`mt-1 text-sm font-bold ${
 isConfirm ? "text-red-700" : "text-orange-700"
 }`}
 >
 {lotLabel}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 flex flex-wrap justify-end gap-3">
 {isConfirm ? (
 <>
 <button
 onClick={onClose}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "取消" : "Cancel"}
 </button>

 <button
 onClick={onConfirmDemolish}
 className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(239,68,68,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700"
 >
 {language === "zh" ? "确认拆除" : "Confirm Demolish"}
 </button>
 </>
 ) : (
 <>
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
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}