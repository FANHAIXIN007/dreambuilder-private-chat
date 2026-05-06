"use client";

import React from "react";

export type ImmersiveHouseItem = {
 id: number;
 title: string;
 author: string;
 styleZh: string;
 styleEn: string;
 likes: number;
 saves: number;
 liked: boolean;
 saved: boolean;
 image: string;
 area?: string;
 roomsZh?: string;
 roomsEn?: string;
 floorsZh?: string;
 floorsEn?: string;
 houseTypeZh?: string;
 houseTypeEn?: string;
 facadeZh?: string;
 facadeEn?: string;
 roofZh?: string;
 roofEn?: string;
 roofColorZh?: string;
 roofColorEn?: string;
 sceneZh?: string;
 sceneEn?: string;
 toneZh?: string;
 toneEn?: string;
 garageZh?: string;
 garageEn?: string;
 seasonZh?: string;
 seasonEn?: string;
 plotZh?: string;
 plotEn?: string;
 descriptionZh?: string;
 descriptionEn?: string;
};

type ModalMeta = {
 statusText?: string;
 plotLabel?: string;
 timeText?: string;
 listedPriceDb?: number;
} | null;

type Props = {
 open: boolean;
 house: ImmersiveHouseItem | null;
 language: "zh" | "en";
 onClose: () => void;
 onLike?: (id: number) => void;
 onSave?: (id: number) => void;
 meta?: ModalMeta;
 subtitle?: string;
};

function InfoBox({
 label,
 value,
}: {
 label: string;
 value: string;
}) {
 return (
 <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
 <div className="text-[11px] text-white/50">{label}</div>
 <div className="mt-1 text-sm font-semibold text-white">{value || "-"}</div>
 </div>
 );
}

export default function ImmersiveHouseDetailModal({
 open,
 house,
 language,
 onClose,
 onLike,
 onSave,
 meta,
 subtitle,
}: Props) {
 if (!open || !house) return null;

 const descriptionText =
 language === "zh"
 ? house.descriptionZh ||
 "这是一套 DreamBuilder 世界中的住宅作品，你可以在这里查看它的风格、参数与空间设定。"
 : house.descriptionEn ||
 "This is a residential work from DreamBuilder. You can review its style, parameters, and spatial setup here.";

 return (
 <div
 className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
 onClick={onClose}
 >
 <div
 className="relative h-full w-full max-w-[1750px]"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={onClose}
 className="absolute right-2 top-2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
 >
 ✕
 </button>

 <div className="flex h-full flex-col justify-center">
 <div className="mb-4 flex items-center justify-between gap-3 px-1">
 <div className="min-w-0">
 <div className="truncate text-xl font-bold text-white">
 {house.title}
 </div>
 <div className="mt-1 text-sm text-white/70">
 {subtitle ||
 (language === "zh"
 ? "沉浸式房产大图预览"
 : "Immersive property preview")}
 </div>
 </div>

 <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
 {meta?.statusText || (language === "zh" ? "详情" : "Detail")}
 </div>
 </div>

 <div className="grid h-[80vh] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
 <div className="flex h-full min-w-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
 <img
 src={house.image}
 alt={house.title}
 className="max-h-[80vh] w-auto max-w-full object-contain"
 />
 </div>

 <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
 <div className="overflow-y-auto pr-1">
 <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
 <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
 {language === "zh" ? "房屋信息" : "House Info"}
 </div>
 <div className="mt-2 text-lg font-bold text-white">
 {house.title}
 </div>
 <div className="mt-2 text-sm text-white/75">
 {language === "zh" ? house.styleZh : house.styleEn}
 </div>
 <div className="mt-3 text-sm leading-6 text-white/70">
 {descriptionText}
 </div>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <InfoBox
 label={language === "zh" ? "状态" : "Status"}
 value={meta?.statusText || "-"}
 />
 <InfoBox
 label={language === "zh" ? "地块" : "Plot"}
 value={
 meta?.plotLabel ||
 (language === "zh" ? house.plotZh || "-" : house.plotEn || "-")
 }
 />
 <InfoBox
 label={language === "zh" ? "面积" : "Area"}
 value={house.area || "-"}
 />
 <InfoBox
 label={language === "zh" ? "房间" : "Rooms"}
 value={language === "zh" ? house.roomsZh || "-" : house.roomsEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "层数" : "Floors"}
 value={language === "zh" ? house.floorsZh || "-" : house.floorsEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "住宅类型" : "House Type"}
 value={
 language === "zh"
 ? house.houseTypeZh || "-"
 : house.houseTypeEn || "-"
 }
 />
 <InfoBox
 label={language === "zh" ? "外立面" : "Facade"}
 value={language === "zh" ? house.facadeZh || "-" : house.facadeEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "屋顶" : "Roof"}
 value={language === "zh" ? house.roofZh || "-" : house.roofEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "屋顶颜色" : "Roof Color"}
 value={
 language === "zh"
 ? house.roofColorZh || "-"
 : house.roofColorEn || "-"
 }
 />
 <InfoBox
 label={language === "zh" ? "场景" : "Scene"}
 value={language === "zh" ? house.sceneZh || "-" : house.sceneEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "色调" : "Tone"}
 value={language === "zh" ? house.toneZh || "-" : house.toneEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "车库" : "Garage"}
 value={language === "zh" ? house.garageZh || "-" : house.garageEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "季节" : "Season"}
 value={language === "zh" ? house.seasonZh || "-" : house.seasonEn || "-"}
 />
 <InfoBox
 label={language === "zh" ? "记录时间" : "Recorded Time"}
 value={meta?.timeText || "-"}
 />
 </div>

 <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
 <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
 {language === "zh" ? "资产状态" : "Asset Status"}
 </div>

 <div className="mt-3 space-y-3">
 <div className="flex items-center justify-between gap-3 text-sm">
 <span className="text-white/60">
 {language === "zh" ? "上架状态" : "Listing"}
 </span>
 <span className="font-semibold text-white">
 {meta?.listedPriceDb
 ? language === "zh"
 ? `已挂牌 · ${meta.listedPriceDb.toLocaleString("en-US")} DB`
 : `Listed · ${meta.listedPriceDb.toLocaleString("en-US")} DB`
 : language === "zh"
 ? "未挂牌"
 : "Not Listed"}
 </span>
 </div>

 <div className="flex items-center justify-between gap-3 text-sm">
 <span className="text-white/60">
 {language === "zh" ? "点赞" : "Likes"}
 </span>
 <span className="font-semibold text-white">{house.likes}</span>
 </div>

 <div className="flex items-center justify-between gap-3 text-sm">
 <span className="text-white/60">
 {language === "zh" ? "收藏" : "Saves"}
 </span>
 <span className="font-semibold text-white">{house.saves}</span>
 </div>

 <div className="flex items-center justify-between gap-3 text-sm">
 <span className="text-white/60">
 {language === "zh" ? "作者" : "Author"}
 </span>
 <span className="font-semibold text-white">{house.author}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <button
 onClick={() => onLike?.(house.id)}
 className={`px-4 py-3 text-sm font-semibold transition-all duration-200 ${
 house.liked
 ? "rounded-2xl bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-black"
 : "rounded-2xl border border-white/15 bg-white/10 text-white shadow-[0_8px_18px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:bg-white/15"
 }`}
 >
 {house.liked
 ? language === "zh"
 ? "已点赞"
 : "Liked"
 : language === "zh"
 ? "点赞"
 : "Like"}
 </button>

 <button
 onClick={() => onSave?.(house.id)}
 className={`px-4 py-3 text-sm font-semibold transition-all duration-200 ${
 house.saved
 ? "rounded-2xl bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-black"
 : "rounded-2xl border border-white/15 bg-white/10 text-white shadow-[0_8px_18px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:bg-white/15"
 }`}
 >
 {house.saved
 ? language === "zh"
 ? "已收藏"
 : "Saved"
 : language === "zh"
 ? "收藏"
 : "Save"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}