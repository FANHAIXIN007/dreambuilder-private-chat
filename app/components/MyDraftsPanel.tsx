"use client";

import React, { useEffect, useMemo, useState } from "react";

type Language = "zh" | "en";

type GeneratedOption = {
 title: string;
 styleZh: string;
 styleEn: string;
 area: string;
 roomsZh: string;
 roomsEn: string;
 budgetZh: string;
 budgetEn: string;
 durationZh: string;
 durationEn: string;
 image: string;
 descriptionZh: string;
 descriptionEn: string;
 floorsZh: string;
 floorsEn: string;
 houseTypeZh: string;
 houseTypeEn: string;
 facadeZh: string;
 facadeEn: string;
 roofZh: string;
 roofEn: string;
 roofColorZh: string;
 roofColorEn: string;
 sceneZh: string;
 sceneEn: string;
 toneZh: string;
 toneEn: string;
 garageZh: string;
 garageEn: string;
 seasonZh: string;
 seasonEn: string;
 plotZh: string;
 plotEn: string;
};

type DraftProject = {
 id: number;
 signature: string;
 createdAt: number;
 updatedAt: number;
 status: "draft" | "saved" | "built";
 design: GeneratedOption;
};

type GenerationHistoryItem = {
 id: number;
 draftId: number;
 signature: string;
 createdAt: number;
 title: string;
 image: string;
 styleZh: string;
 styleEn: string;
 area: string;
 roomsZh: string;
 roomsEn: string;
 plotZh: string;
 plotEn: string;
};

type UiSet = {
 btnSmallIdle: string;
 btnSmallActive: string;
};

type Props = {
 language: Language;
 ui: UiSet;
 drafts: DraftProject[];
 history: GenerationHistoryItem[];
 onOpenDraft: (draftId: number) => void;
 onOpenDraftDetail: (draftId: number) => void;
 onOpenPropertyDetail: (propertyId: string) => void;
 onDeleteDraft: (draftId: number) => void;
 onToggleSaveDraft: (draftId: number) => void;
 onBuildDraft: (draftId: number) => void;
 onClearUnsavedDrafts: () => void;
 onClearAllDrafts: () => void;
};

type HouseLotBinding = {
 plotId: string;
 lotId: string;
 houseId: number;
 title: string;
 image: string;
 boundAt: number;
};

type PurchasedProperty = {
 id: number;
 title: string;
 image: string;
 area?: string;
 roomsZh?: string;
 roomsEn?: string;
 floorsZh?: string;
 floorsEn?: string;
 houseTypeZh?: string;
 houseTypeEn?: string;
 styleZh?: string;
 styleEn?: string;
 plotZh?: string;
 plotEn?: string;
 purchasePriceDb?: number;
 purchasedAt?: number;
};

type PropertyCardItem = {
 id: string;
 sourceType: "built" | "purchased";
 title: string;
 image: string;
 styleZh: string;
 styleEn: string;
 area?: string;
 roomsZh?: string;
 roomsEn?: string;
 plotZh?: string;
 plotEn?: string;
 createdAt: number;
 isListed: boolean;
};

const GALLERY_STORAGE_KEY = "db_gallery";
const PURCHASED_PROPERTIES_STORAGE_KEY = "db_purchased_properties";
const HOUSE_LOT_BINDINGS_STORAGE_KEY = "db_house_lot_bindings";
const MARKET_LISTINGS_STORAGE_KEY = "db_market_listings";

function formatDateTime(value: number, language: Language) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

function getStatusLabel(
 status: DraftProject["status"],
 language: Language
): string {
 if (status === "saved") return language === "zh" ? "已收藏" : "Saved";
 if (status === "built") return language === "zh" ? "已建造" : "Built";
 return language === "zh" ? "草稿" : "Draft";
}

function getStatusClass(status: DraftProject["status"]) {
 if (status === "saved") {
 return "bg-amber-50 text-amber-700 border border-amber-200";
 }
 if (status === "built") {
 return "bg-emerald-50 text-emerald-700 border border-emerald-200";
 }
 return "bg-sky-50 text-sky-700 border border-sky-200";
}

function loadJsonArray<T>(key: string): T[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
}

function buildPropertyCards(): PropertyCardItem[] {
 const gallery = loadJsonArray<any>(GALLERY_STORAGE_KEY);
 const bindings = loadJsonArray<HouseLotBinding>(HOUSE_LOT_BINDINGS_STORAGE_KEY);
 const purchased = loadJsonArray<PurchasedProperty>(
 PURCHASED_PROPERTIES_STORAGE_KEY
 );
 const marketListings = loadJsonArray<any>(MARKET_LISTINGS_STORAGE_KEY);

 const listedSourceIds = new Set(
 marketListings
 .filter((item) => item?.assetType === "property")
 .map((item) => String(item?.sourceId ?? ""))
 );

 const builtItems: PropertyCardItem[] = bindings
 .map((binding): PropertyCardItem => {
 const matchedHouse = gallery.find(
 (house: any) => house?.id === binding.houseId
 );

 return {
 id: `built-${binding.houseId}`,
 sourceType: "built" as const,
 title: matchedHouse?.title || binding.title || "Built House",
 image: matchedHouse?.image || binding.image || "",
 styleZh: matchedHouse?.styleZh || "我的建造",
 styleEn: matchedHouse?.styleEn || "Built by Me",
 area: matchedHouse?.area,
 roomsZh: matchedHouse?.roomsZh,
 roomsEn: matchedHouse?.roomsEn,
 plotZh: matchedHouse?.plotZh,
 plotEn: matchedHouse?.plotEn,
 createdAt: binding.boundAt || Date.now(),
 isListed: listedSourceIds.has(`built-${binding.houseId}`),
 };
 })
 .filter((item) => item.image);

 const purchasedItems: PropertyCardItem[] = purchased.map(
 (item): PropertyCardItem => ({
 id: `purchased-${item.id}`,
 sourceType: "purchased" as const,
 title: item.title,
 image: item.image,
 styleZh: item.styleZh || "已购房产",
 styleEn: item.styleEn || "Purchased",
 area: item.area,
 roomsZh: item.roomsZh,
 roomsEn: item.roomsEn,
 plotZh: item.plotZh,
 plotEn: item.plotEn,
 createdAt: item.purchasedAt || Date.now(),
 isListed: listedSourceIds.has(`purchased-${item.id}`),
 })
 );

 return [...builtItems, ...purchasedItems].sort(
 (a, b) => b.createdAt - a.createdAt
 );
}

export default function MyDraftsPanel({
 language,
 ui,
 drafts,
 history,
 onOpenDraft,
 onOpenDraftDetail,
 onOpenPropertyDetail,
 onDeleteDraft,
 onToggleSaveDraft,
 onBuildDraft,
 onClearUnsavedDrafts,
 onClearAllDrafts,
}: Props) {
 const [propertyCards, setPropertyCards] = useState<PropertyCardItem[]>([]);

 useEffect(() => {
 const loadAll = () => {
 setPropertyCards(buildPropertyCards());
 };

 loadAll();
 window.addEventListener("storage", loadAll);
 return () => window.removeEventListener("storage", loadAll);
 }, []);

 const visibleDrafts = useMemo(() => drafts.slice(0, 4), [drafts]);
 const visibleProperties = useMemo(() => propertyCards.slice(0, 4), [propertyCards]);

 const handleGoMyPage = () => {
 window.location.href = "/my";
 };

 return (
 <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
 <div>
 <div className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-violet-700">
 {language === "zh" ? "方案与资产速览" : "Drafts & Properties Overview"}
 </div>

 <h3 className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
 {language === "zh" ? "我的草稿与我的房产" : "My Drafts & My Properties"}
 </h3>

 <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "这里只展示最近的 4 个草稿和 4 个房产。查看更多请前往我的页面统一管理。"
 : "Only the latest 4 drafts and 4 properties are shown here. Go to My page to view and manage everything."}
 </p>
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 onClick={onClearUnsavedDrafts}
 className={`${ui.btnSmallIdle} px-4 py-2 text-sm font-semibold`}
 >
 {language === "zh" ? "清空未收藏草稿" : "Clear Unsaved Drafts"}
 </button>
 <button
 onClick={onClearAllDrafts}
 className={`${ui.btnSmallIdle} px-4 py-2 text-sm font-semibold`}
 >
 {language === "zh" ? "清空全部草稿" : "Clear All Drafts"}
 </button>
 <button
 onClick={handleGoMyPage}
 className={`${ui.btnSmallActive} px-4 py-2 text-sm font-semibold`}
 >
 {language === "zh" ? "查看更多" : "View More"}
 </button>
 </div>
 </div>

 <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
 <div className="rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "草稿总数" : "Total Drafts"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {drafts.length}
 </div>
 </div>

 <div className="rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "已收藏方案" : "Saved Drafts"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {drafts.filter((item) => item.status === "saved").length}
 </div>
 </div>

 <div className="rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "我的房产" : "My Properties"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {propertyCards.length}
 </div>
 </div>

 <div className="rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "已建造方案" : "Built Drafts"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {drafts.filter((item) => item.status === "built").length}
 </div>
 </div>
 </div>

 <div className="mt-8 space-y-8">
 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/70 p-4 md:p-5">
 <div className="mb-5 flex items-center justify-between">
 <h4 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的草稿" : "My Drafts"}
 </h4>
 <div className="flex items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">
 {drafts.length}
 </span>
 <button
 onClick={handleGoMyPage}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-semibold`}
 >
 {language === "zh" ? "查看更多" : "View More"}
 </button>
 </div>
 </div>

 {visibleDrafts.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你还没有草稿方案，先去生成一个建筑设计吧。"
 : "You do not have any draft projects yet. Generate a design first."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleDrafts.map((draft) => (
 <article
 key={draft.id}
 className="group flex min-h-[430px] flex-col overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]"
 >
 <button
 type="button"
 onClick={() => onOpenDraftDetail(draft.id)}
 className="relative block h-48 overflow-hidden text-left"
 >
 <img
 src={draft.design.image}
 alt={draft.design.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />

 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {language === "zh"
 ? draft.design.styleZh
 : draft.design.styleEn}
 </div>

 <div
 className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${getStatusClass(
 draft.status
 )}`}
 >
 {getStatusLabel(draft.status, language)}
 </div>
 </button>

 <div className="flex flex-1 flex-col p-4">
 <div className="min-w-0">
 <button
 type="button"
 onClick={() => onOpenDraftDetail(draft.id)}
 className="line-clamp-2 text-left text-base font-semibold leading-6 text-neutral-900"
 >
 {draft.design.title}
 </button>
 <p className="mt-1 truncate text-xs text-neutral-500">
 {language === "zh"
 ? draft.design.plotZh || "未设置地块"
 : draft.design.plotEn || "No plot"}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "面积" : "Area"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {draft.design.area || "-"}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "房间" : "Rooms"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh"
 ? draft.design.roomsZh || "-"
 : draft.design.roomsEn || "-"}
 </div>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "生成时间" : "Generated At"}
 </div>
 <div className="mt-1 text-sm font-medium text-neutral-900">
 {formatDateTime(draft.createdAt, language)}
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => onOpenDraftDetail(draft.id)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "查看详情" : "View Detail"}
 </button>

 <button
 onClick={() => onOpenDraft(draft.id)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "载入预览" : "Load Preview"}
 </button>

 <button
 onClick={() => onToggleSaveDraft(draft.id)}
 className={`${
 draft.status === "saved"
 ? ui.btnSmallActive
 : ui.btnSmallIdle
 } px-3 py-2 text-xs font-medium`}
 >
 {draft.status === "saved"
 ? language === "zh"
 ? "已收藏"
 : "Saved"
 : language === "zh"
 ? "收藏"
 : "Save"}
 </button>

 <button
 onClick={() => onBuildDraft(draft.id)}
 className={`${ui.btnSmallActive} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "开始建造" : "Start Build"}
 </button>

 <button
 onClick={() => onDeleteDraft(draft.id)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "删除" : "Delete"}
 </button>
 </div>
 </div>
 </div>
 </article>
 ))}
 </div>
 )}
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/70 p-4 md:p-5">
 <div className="mb-5 flex items-center justify-between">
 <h4 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的房产" : "My Properties"}
 </h4>
 <div className="flex items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">
 {propertyCards.length}
 </span>
 <button
 onClick={handleGoMyPage}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-semibold`}
 >
 {language === "zh" ? "查看更多" : "View More"}
 </button>
 </div>
 </div>

 {visibleProperties.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你还没有房产，先去建造或购买房产吧。"
 : "You do not have any properties yet. Build or purchase one first."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleProperties.map((item) => (
 <article
 key={item.id}
 className="group flex min-h-[410px] flex-col overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]"
 >
 <button
 type="button"
 onClick={() => onOpenPropertyDetail(item.id)}
 className="relative block h-48 overflow-hidden text-left"
 >
 <img
 src={item.image}
 alt={item.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />

 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {language === "zh" ? item.styleZh : item.styleEn}
 </div>

 <div
 className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
 item.sourceType === "built"
 ? "border border-sky-200 bg-sky-50 text-sky-700"
 : "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
 }`}
 >
 {item.sourceType === "built"
 ? language === "zh"
 ? "我建造的"
 : "Built by Me"
 : language === "zh"
 ? "我购买的"
 : "Purchased"}
 </div>
 </button>

 <div className="flex flex-1 flex-col p-4">
 <div className="min-w-0">
 <button
 type="button"
 onClick={() => onOpenPropertyDetail(item.id)}
 className="line-clamp-2 text-left text-base font-semibold leading-6 text-neutral-900"
 >
 {item.title}
 </button>
 <p className="mt-1 truncate text-xs text-neutral-500">
 {language === "zh"
 ? item.plotZh || "未设置地块"
 : item.plotEn || "No plot"}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "面积" : "Area"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {item.area || "-"}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "房间" : "Rooms"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh"
 ? item.roomsZh || "-"
 : item.roomsEn || "-"}
 </div>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "获得时间" : "Acquired At"}
 </div>
 <div className="mt-1 text-sm font-medium text-neutral-900">
 {formatDateTime(item.createdAt, language)}
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => onOpenPropertyDetail(item.id)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "查看详情" : "View Detail"}
 </button>

 <button
 onClick={handleGoMyPage}
 className={`${
 item.isListed ? ui.btnSmallIdle : ui.btnSmallActive
 } px-3 py-2 text-xs font-medium`}
 >
 {item.isListed
 ? language === "zh"
 ? "取消挂牌"
 : "Cancel Listing"
 : language === "zh"
 ? "挂牌出售"
 : "List For Sale"}
 </button>

 <button
 onClick={handleGoMyPage}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "去我的页面" : "Go to My Page"}
 </button>
 </div>
 </div>
 </div>
 </article>
 ))}
 </div>
 )}
 </div>
 </div>
 </section>
 );
}