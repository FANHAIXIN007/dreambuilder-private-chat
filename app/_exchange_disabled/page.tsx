"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImmersiveHouseDetailModal, {
 type ImmersiveHouseItem,
} from "@/app/components/ImmersiveHouseDetailModal";
import {
 APP_DATA_SYNC_EVENT,
 emitAssetStoreSync,
 loadAssetStore,
 normalizeLotId,
 saveAssetStore,
 type AssetOverview,
 type AssetRecord,
 type HouseLotBinding,
 type MarketListing,
 type MarketTradeRecord,
 type OwnedLot,
 type PurchasedProperty,
 type SavedDesign,
} from "@/app/lib/dbAssetStore";

type Language = "zh" | "en";
type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";

type MarketRates = {
 USD: number;
 CNY: number;
 USDT: number;
 BTC: number;
};

type HouseItemLite = {
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

const CURRENCY_STORAGE_KEY = "db_selected_currency";
const LANGUAGE_STORAGE_KEY = "db_selected_language";

function getStoredCurrency(): CurrencyType {
 if (typeof window === "undefined") return "CNY";
 const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
 if (saved === "CNY" || saved === "USD" || saved === "USDT" || saved === "BTC") {
 return saved;
 }
 return "CNY";
}

function getStoredLanguage(): Language {
 if (typeof window === "undefined") return "zh";
 const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
 return saved === "en" ? "en" : "zh";
}

function formatDateTime(value: string | number, language: Language) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

function formatDbAmount(amount: number) {
 const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
 return `${sign}${Math.abs(amount).toLocaleString("en-US")} DB`;
}

function sortListingsByLatest(items: MarketListing[]) {
 return [...items].sort((a, b) => {
 const aTime = new Date(a.listedAt).getTime();
 const bTime = new Date(b.listedAt).getTime();
 return bTime - aTime;
 });
}

function sortTradesByLatest(items: MarketTradeRecord[]) {
 return [...items].sort((a, b) => {
 const aTime = new Date(a.tradedAt).getTime();
 const bTime = new Date(b.tradedAt).getTime();
 return bTime - aTime;
 });
}

function convertSavedDesignToImmersiveHouse(design: SavedDesign): ImmersiveHouseItem {
 return {
 id: design.id,
 title: design.design.title,
 author: "You",
 styleZh: design.design.styleZh.replace("风格", ""),
 styleEn: design.design.styleEn.replace(" Style", ""),
 likes: 0,
 saves: 1,
 liked: false,
 saved: true,
 image: design.design.image,
 area: design.design.area,
 roomsZh: design.design.roomsZh,
 roomsEn: design.design.roomsEn,
 floorsZh: design.design.floorsZh,
 floorsEn: design.design.floorsEn,
 houseTypeZh: design.design.houseTypeZh,
 houseTypeEn: design.design.houseTypeEn,
 facadeZh: design.design.facadeZh,
 facadeEn: design.design.facadeEn,
 roofZh: design.design.roofZh,
 roofEn: design.design.roofEn,
 roofColorZh: design.design.roofColorZh,
 roofColorEn: design.design.roofColorEn,
 sceneZh: design.design.sceneZh,
 sceneEn: design.design.sceneEn,
 toneZh: design.design.toneZh,
 toneEn: design.design.toneEn,
 garageZh: design.design.garageZh,
 garageEn: design.design.garageEn,
 seasonZh: design.design.seasonZh,
 seasonEn: design.design.seasonEn,
 plotZh: design.design.plotZh,
 plotEn: design.design.plotEn,
 descriptionZh: design.design.descriptionZh,
 descriptionEn: design.design.descriptionEn,
 };
}

function convertPurchasedPropertyToImmersiveHouse(
 item: PurchasedProperty
): ImmersiveHouseItem {
 const safeItem = item as PurchasedProperty &
 Partial<{
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
 }>;

 return {
 id: item.id,
 title: item.title,
 author: "Market",
 styleZh: item.styleZh || "已购房产",
 styleEn: item.styleEn || "Purchased",
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: item.image,
 area: item.area,
 roomsZh: item.roomsZh,
 roomsEn: item.roomsEn,
 floorsZh: item.floorsZh,
 floorsEn: item.floorsEn,
 houseTypeZh: item.houseTypeZh,
 houseTypeEn: item.houseTypeEn,
 facadeZh: safeItem.facadeZh || "",
 facadeEn: safeItem.facadeEn || "",
 roofZh: safeItem.roofZh || "",
 roofEn: safeItem.roofEn || "",
 roofColorZh: safeItem.roofColorZh || "",
 roofColorEn: safeItem.roofColorEn || "",
 sceneZh: safeItem.sceneZh || "",
 sceneEn: safeItem.sceneEn || "",
 toneZh: safeItem.toneZh || "",
 toneEn: safeItem.toneEn || "",
 garageZh: safeItem.garageZh || "",
 garageEn: safeItem.garageEn || "",
 seasonZh: safeItem.seasonZh || "",
 seasonEn: safeItem.seasonEn || "",
 plotZh: item.plotZh,
 plotEn: item.plotEn,
 };
}

function buildPurchasedPropertyFromHouse(
 house: HouseItemLite,
 listing: MarketListing,
 matchedBinding?: HouseLotBinding
): PurchasedProperty {
 const nextProperty = {
 id: Date.now(),
 title: house.title || listing.title,
 image: house.image || listing.image,
 area: house.area,
 roomsZh: house.roomsZh,
 roomsEn: house.roomsEn,
 floorsZh: house.floorsZh,
 floorsEn: house.floorsEn,
 houseTypeZh: house.houseTypeZh,
 houseTypeEn: house.houseTypeEn,
 styleZh: house.styleZh,
 styleEn: house.styleEn,
 facadeZh: house.facadeZh,
 facadeEn: house.facadeEn,
 roofZh: house.roofZh,
 roofEn: house.roofEn,
 roofColorZh: house.roofColorZh,
 roofColorEn: house.roofColorEn,
 sceneZh: house.sceneZh,
 sceneEn: house.sceneEn,
 toneZh: house.toneZh,
 toneEn: house.toneEn,
 garageZh: house.garageZh,
 garageEn: house.garageEn,
 seasonZh: house.seasonZh,
 seasonEn: house.seasonEn,
 plotZh: house.plotZh,
 plotEn: house.plotEn,
 plotId: matchedBinding?.plotId,
 lotId: matchedBinding?.lotId,
 purchasePriceDb: listing.priceDb,
 purchasedAt: Date.now(),
 };

 return nextProperty as PurchasedProperty;
}

function SummaryCard({
 label,
 value,
}: {
 label: string;
 value: string | number;
}) {
 return (
 <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {label}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {value}
 </div>
 </div>
 );
}

function ListingCard({
 item,
 language,
 onBuy,
 onView,
 formatSelectedCurrency,
}: {
 item: MarketListing;
 language: Language;
 onBuy: (item: MarketListing) => void;
 onView: (item: MarketListing) => void;
 formatSelectedCurrency: (dbAmount: number) => string;
}) {
 const isLand = item.assetType === "land";

 return (
 <article className="group overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]">
 <button
 type="button"
 onClick={() => onView(item)}
 className="block w-full text-left"
 >
 <div className="relative h-48 overflow-hidden">
 <img
 src={item.image}
 alt={item.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {isLand
 ? language === "zh"
 ? "地产"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-fuchsia-50/95 px-3 py-1 text-[11px] font-semibold text-fuchsia-700 backdrop-blur">
 {language === "zh" ? "出售中" : "On Sale"}
 </div>
 </div>
 </button>

 <div className="p-4">
 <button
 type="button"
 onClick={() => onView(item)}
 className="line-clamp-2 text-left text-base font-semibold leading-6 text-neutral-900"
 >
 {item.title}
 </button>

 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? `挂牌时间：${formatDateTime(item.listedAt, language)}`
 : `Listed: ${formatDateTime(item.listedAt, language)}`}
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <div className="rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "挂牌价格" : "Listing Price"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {formatSelectedCurrency(item.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(item.priceDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "资产类型" : "Asset Type"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {isLand
 ? language === "zh"
 ? "地产"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 </div>
 </div>

 <div className="mt-4 flex flex-wrap gap-2">
 <button
 onClick={() => onView(item)}
 className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
 >
 {isLand
 ? language === "zh"
 ? "查看地块"
 : "View Plot"
 : language === "zh"
 ? "查看房产"
 : "View Property"}
 </button>

 <button
 onClick={() => onBuy(item)}
 className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-black"
 >
 {language === "zh" ? "立即购买" : "Buy Now"}
 </button>
 </div>
 </div>
 </article>
 );
}

function TradeCard({
 item,
 language,
 formatSelectedCurrency,
 onView,
}: {
 item: MarketTradeRecord;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
 onView: (item: MarketTradeRecord) => void;
}) {
 return (
 <article className="group overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]">
 <button
 type="button"
 onClick={() => onView(item)}
 className="block w-full text-left"
 >
 <div className="relative h-48 overflow-hidden">
 <img
 src={item.image}
 alt={item.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {item.assetType === "land"
 ? language === "zh"
 ? "地产"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-emerald-50/95 px-3 py-1 text-[11px] font-semibold text-emerald-700 backdrop-blur">
 {language === "zh" ? "已成交" : "Sold"}
 </div>
 </div>
 </button>

 <div className="p-4">
 <button
 type="button"
 onClick={() => onView(item)}
 className="line-clamp-2 text-left text-base font-semibold leading-6 text-neutral-900"
 >
 {item.title}
 </button>

 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? `成交时间：${formatDateTime(item.tradedAt, language)}`
 : `Sold: ${formatDateTime(item.tradedAt, language)}`}
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "成交价格" : "Sold Price"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {formatSelectedCurrency(item.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(item.priceDb)}
 </div>
 </div>
 </div>
 </article>
 );
}

export default function ExchangePage() {
 const router = useRouter();

 const [language, setLanguage] = useState<Language>("zh");
 const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("CNY");
 const [marketRates] = useState<MarketRates>({
 USD: 1,
 CNY: 7.2,
 USDT: 1,
 BTC: 1 / 65000,
 });

 const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
 const [tradeRecords, setTradeRecords] = useState<MarketTradeRecord[]>([]);
 const [assetOverview, setAssetOverview] = useState<AssetOverview>(
 loadAssetStore().assetOverview
 );
 const [pendingBuy, setPendingBuy] = useState<MarketListing | null>(null);
 const [actionMessage, setActionMessage] = useState("");
 const [toast, setToast] = useState("");

 const [selectedHouse, setSelectedHouse] = useState<ImmersiveHouseItem | null>(null);
 const [selectedHouseMeta, setSelectedHouseMeta] = useState<{
 statusText?: string;
 plotLabel?: string;
 timeText?: string;
 listedPriceDb?: number;
 } | null>(null);
 const [isDetailOpen, setIsDetailOpen] = useState(false);

 useEffect(() => {
 const sync = () => {
 const store = loadAssetStore();
 setLanguage(getStoredLanguage());
 setSelectedCurrency(getStoredCurrency());
 setMarketListings(store.marketListings as MarketListing[]);
 setTradeRecords(store.marketTrades as MarketTradeRecord[]);
 setAssetOverview(store.assetOverview);
 };

 sync();
 window.addEventListener("storage", sync);
 window.addEventListener(APP_DATA_SYNC_EVENT, sync);
 window.addEventListener("focus", sync);

 return () => {
 window.removeEventListener("storage", sync);
 window.removeEventListener(APP_DATA_SYNC_EVENT, sync);
 window.removeEventListener("focus", sync);
 };
 }, []);

 useEffect(() => {
 if (!toast) return;
 const timer = window.setTimeout(() => setToast(""), 2200);
 return () => window.clearTimeout(timer);
 }, [toast]);

 const convertDbToSelectedCurrency = (dbAmount: number) => {
 const usdAmount = dbAmount / 100;
 const rate = marketRates[selectedCurrency];
 if (!rate || rate <= 0) return 0;
 return usdAmount * rate;
 };

 const formatSelectedCurrency = (dbAmount: number) => {
 const value = convertDbToSelectedCurrency(dbAmount);

 if (selectedCurrency === "CNY") {
 return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
 }

 if (selectedCurrency === "USD") {
 return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
 }

 if (selectedCurrency === "USDT") {
 return `${value.toLocaleString("en-US", {
 maximumFractionDigits: 2,
 })} USDT`;
 }

 return `${value.toLocaleString("en-US", {
 maximumFractionDigits: 6,
 })} BTC`;
 };

 const landListings = useMemo(
 () => sortListingsByLatest(marketListings.filter((item) => item.assetType === "land")),
 [marketListings]
 );

 const propertyListings = useMemo(
 () =>
 sortListingsByLatest(marketListings.filter((item) => item.assetType === "property")),
 [marketListings]
 );

 const latestTrades = useMemo(() => sortTradesByLatest(tradeRecords), [tradeRecords]);

 const totalListingValue = useMemo(
 () => marketListings.reduce((sum, item) => sum + item.priceDb, 0),
 [marketListings]
 );

 const openHouseDetailFromListing = (item: MarketListing | MarketTradeRecord) => {
 if (item.assetType === "land") {
 const matched = item.sourceId.match(/^(plot-\d+)-lot-\d+$/);
 if (matched) {
 router.push(`/world/${matched[1]}`);
 }
 return;
 }

 const store = loadAssetStore();
 let house: ImmersiveHouseItem | null = null;
 let meta: {
 statusText?: string;
 plotLabel?: string;
 timeText?: string;
 listedPriceDb?: number;
 } | null = null;

 if (item.sourceId.startsWith("built-")) {
 const houseId = Number(item.sourceId.replace("built-", ""));
 const matchedHouse = (store.gallery as HouseItemLite[]).find((h) => h.id === houseId);
 const matchedBinding = store.bindings.find((b) => b.houseId === houseId) || null;

 if (matchedHouse) {
 house = {
 ...matchedHouse,
 descriptionZh:
 matchedHouse.descriptionZh ||
 "这是一套在 DreamBuilder 世界中建造完成并挂牌展示的房产。",
 descriptionEn:
 matchedHouse.descriptionEn ||
 "This is a built property in DreamBuilder currently displayed in the market.",
 };

 meta = {
 statusText: language === "zh" ? "市场房产" : "Market Property",
 plotLabel: matchedBinding
 ? language === "zh"
 ? `地块 ${matchedBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(normalizeLotId(matchedBinding.lotId).replace("lot-", ""), 10)
 )}`
 : `Plot ${matchedBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(normalizeLotId(matchedBinding.lotId).replace("lot-", ""), 10)
 )}`
 : language === "zh"
 ? matchedHouse.plotZh || "-"
 : matchedHouse.plotEn || "-",
 timeText: "listedAt" in item ? formatDateTime(item.listedAt, language) : formatDateTime(item.tradedAt, language),
 listedPriceDb: item.priceDb,
 };
 }
 } else if (item.sourceId.startsWith("purchased-")) {
 const propertyId = Number(item.sourceId.replace("purchased-", ""));
 const matchedProperty = store.purchasedProperties.find((p) => p.id === propertyId) || null;

 if (matchedProperty) {
 house = convertPurchasedPropertyToImmersiveHouse(matchedProperty);
 meta = {
 statusText: language === "zh" ? "市场房产" : "Market Property",
 plotLabel:
 language === "zh"
 ? matchedProperty.plotZh || "-"
 : matchedProperty.plotEn || "-",
 timeText: "listedAt" in item ? formatDateTime(item.listedAt, language) : formatDateTime(item.tradedAt, language),
 listedPriceDb: item.priceDb,
 };
 }
 } else {
 const matchedSaved = store.savedDesigns.find(
 (design) =>
 design.design.title === item.title && design.design.image === item.image
 );

 if (matchedSaved) {
 house = convertSavedDesignToImmersiveHouse(matchedSaved);
 meta = {
 statusText: language === "zh" ? "设计方案" : "Design",
 plotLabel:
 language === "zh"
 ? matchedSaved.design.plotZh || "-"
 : matchedSaved.design.plotEn || "-",
 timeText: "listedAt" in item ? formatDateTime(item.listedAt, language) : formatDateTime(item.tradedAt, language),
 listedPriceDb: item.priceDb,
 };
 }
 }

 if (house) {
 setSelectedHouse(house);
 setSelectedHouseMeta(meta);
 setIsDetailOpen(true);
 return;
 }

 router.push("/my");
 };

 const handleViewListing = (item: MarketListing) => {
 if (item.assetType === "land") {
 const matched = item.sourceId.match(/^(plot-\d+)-lot-\d+$/);
 if (matched) {
 router.push(`/world/${matched[1]}`);
 return;
 }
 }

 openHouseDetailFromListing(item);
 };

 const handleViewTrade = (item: MarketTradeRecord) => {
 if (item.assetType === "land") {
 const matched = item.sourceId.match(/^(plot-\d+)-lot-\d+$/);
 if (matched) {
 router.push(`/world/${matched[1]}`);
 return;
 }
 }

 openHouseDetailFromListing(item);
 };

 const handleConfirmBuy = () => {
 if (!pendingBuy) return;

 const store = loadAssetStore();
 const latestOverview = store.assetOverview;

 if (latestOverview.availableBalanceDb < pendingBuy.priceDb) {
 setToast(
 language === "zh"
 ? "余额不足，无法完成购买。"
 : "Insufficient balance. Purchase failed."
 );
 return;
 }

 const listing = store.marketListings.find((item) => item.id === pendingBuy.id);
 if (!listing) {
 setActionMessage(
 language === "zh"
 ? "该资产已被购买或下架。"
 : "This asset has already been bought or delisted."
 );
 setPendingBuy(null);
 emitAssetStoreSync();
 return;
 }

 const nowIso = new Date().toISOString();
 const nowMs = Date.now();

 const nextListings: MarketListing[] = store.marketListings.filter(
 (item) => item.id !== listing.id
 ) as MarketListing[];

 const nextTrades: MarketTradeRecord[] = [
 {
 id: `trade-${listing.id}-${nowMs}`,
 assetType: listing.assetType,
 sourceId: listing.sourceId,
 title: listing.title,
 image: listing.image,
 priceDb: listing.priceDb,
 tradedAt: nowIso,
 tradeType: "sold",
 status: "completed",
 },
 ...(store.marketTrades as MarketTradeRecord[]),
 ];

 let nextOwnedLots: OwnedLot[] = [...store.lands];
 let nextPurchasedProperties: PurchasedProperty[] = [...store.purchasedProperties];
 let nextGalleryHouses: HouseItemLite[] = [...(store.gallery as HouseItemLite[])];
 let nextBindings: HouseLotBinding[] = [...store.bindings];

 const nextOverview: AssetOverview = {
 ...latestOverview,
 availableBalanceDb: Math.max(0, latestOverview.availableBalanceDb - listing.priceDb),
 landValueDb:
 listing.assetType === "land"
 ? latestOverview.landValueDb + listing.priceDb
 : latestOverview.landValueDb,
 houseValueDb:
 listing.assetType === "property"
 ? latestOverview.houseValueDb + listing.priceDb
 : latestOverview.houseValueDb,
 };

 if (listing.assetType === "land") {
 const matched = listing.sourceId.match(/^(plot-\d+)-(lot-\d+)$/);

 if (matched) {
 const plotId = matched[1];
 const lotId = normalizeLotId(matched[2]);

 const exists = nextOwnedLots.some(
 (item) =>
 item.plotId === plotId && normalizeLotId(item.lotId) === normalizeLotId(lotId)
 );

 if (!exists) {
 nextOwnedLots = [
 {
 plotId,
 lotId,
 acquiredAt: nowMs,
 purchasePriceDb: listing.priceDb,
 },
 ...nextOwnedLots,
 ];
 }
 }
 }

 if (listing.assetType === "property") {
 if (listing.sourceId.startsWith("built-")) {
 const houseId = Number(listing.sourceId.replace("built-", ""));
 const matchedHouse = nextGalleryHouses.find((item) => item.id === houseId);
 const matchedBinding = nextBindings.find((item) => item.houseId === houseId);

 if (matchedHouse) {
 const newPurchased = buildPurchasedPropertyFromHouse(
 matchedHouse,
 listing,
 matchedBinding
 );
 nextPurchasedProperties = [newPurchased, ...nextPurchasedProperties];
 nextGalleryHouses = nextGalleryHouses.filter((item) => item.id !== houseId);

 if (matchedBinding) {
 nextBindings = nextBindings.filter((item) => item.houseId !== houseId);

 nextOwnedLots = nextOwnedLots.filter(
 (lot) =>
 !(
 lot.plotId === matchedBinding.plotId &&
 normalizeLotId(lot.lotId) === normalizeLotId(matchedBinding.lotId)
 )
 );
 }
 } else {
 nextPurchasedProperties = [
 {
 id: nowMs,
 title: listing.title,
 image: listing.image,
 purchasePriceDb: listing.priceDb,
 purchasedAt: nowMs,
 },
 ...nextPurchasedProperties,
 ];
 }
 } else {
 nextPurchasedProperties = [
 {
 id: nowMs,
 title: listing.title,
 image: listing.image,
 purchasePriceDb: listing.priceDb,
 purchasedAt: nowMs,
 },
 ...nextPurchasedProperties,
 ];
 }
 }

 const purchaseRecord: AssetRecord = {
 id: nowMs,
 type: listing.assetType === "land" ? "buy_land" : "reward",
 titleZh:
 listing.assetType === "land"
 ? `购买地产 ${listing.title}`
 : `购买房产 ${listing.title}`,
 titleEn:
 listing.assetType === "land"
 ? `Purchase Land ${listing.title}`
 : `Purchase Property ${listing.title}`,
 amountDb: -listing.priceDb,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: nowIso,
 };

 const nextAssetRecords: AssetRecord[] = [
 purchaseRecord,
 ...store.assetRecords,
 ].slice(0, 100);

 saveAssetStore({
 ...store,
 gallery: nextGalleryHouses,
 lands: nextOwnedLots,
 bindings: nextBindings,
 purchasedProperties: nextPurchasedProperties,
 marketListings: nextListings,
 marketTrades: nextTrades,
 assetOverview: nextOverview,
 assetRecords: nextAssetRecords,
 });

 setMarketListings(nextListings);
 setTradeRecords(nextTrades);
 setAssetOverview(nextOverview);
 setPendingBuy(null);
 setActionMessage(
 language === "zh"
 ? `购买成功，${listing.title} 已进入你的名下。`
 : `Purchase successful. ${listing.title} is now in your account.`
 );

 emitAssetStoreSync();
 };

 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
 <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
 <div>
 <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-emerald-700">
 {language === "zh"
 ? "梦幻岛房地产交易大厅"
 : "Dream Island Real Estate Exchange"}
 </div>

 <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-900">
 {language === "zh" ? "完整交易大厅" : "Full Exchange"}
 </h1>

 <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "这里集中展示梦幻岛当前所有在售地产、在售房产，以及最新成交记录。现在已经支持直接购买并写入你的个人资产。"
 : "This page centralizes all active land listings, property listings and recent completed trades across Dream Island. Direct purchase is now enabled and writes back to your personal assets."}
 </p>
 </div>

 <Link
 href="/"
 className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "返回首页" : "Back Home"}
 </Link>
 </div>

 <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
 <SummaryCard
 label={language === "zh" ? "在售地产" : "Land Listings"}
 value={landListings.length}
 />
 <SummaryCard
 label={language === "zh" ? "在售房产" : "Property Listings"}
 value={propertyListings.length}
 />
 <SummaryCard
 label={language === "zh" ? "成交记录" : "Trade History"}
 value={latestTrades.length}
 />
 <SummaryCard
 label={language === "zh" ? "总挂牌额" : "Total Listing Value"}
 value={formatSelectedCurrency(totalListingValue)}
 />
 <SummaryCard
 label={language === "zh" ? "我的可用余额" : "My Available Balance"}
 value={formatSelectedCurrency(assetOverview.availableBalanceDb)}
 />
 </div>

 {actionMessage ? (
 <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
 {actionMessage}
 </div>
 ) : null}
 </section>

 <div className="mt-6 space-y-6">
 <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="text-xl font-bold text-neutral-900">
 {language === "zh" ? "地产交易区" : "Land Exchange"}
 </h2>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {landListings.length}
 </span>
 </div>

 {landListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前暂无在售地产。"
 : "No active land listings right now."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {landListings.map((item) => (
 <ListingCard
 key={item.id}
 item={item}
 language={language}
 onBuy={setPendingBuy}
 onView={handleViewListing}
 formatSelectedCurrency={formatSelectedCurrency}
 />
 ))}
 </div>
 )}
 </section>

 <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="text-xl font-bold text-neutral-900">
 {language === "zh" ? "房产交易区" : "Property Exchange"}
 </h2>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {propertyListings.length}
 </span>
 </div>

 {propertyListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前暂无在售房产。"
 : "No active property listings right now."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {propertyListings.map((item) => (
 <ListingCard
 key={item.id}
 item={item}
 language={language}
 onBuy={setPendingBuy}
 onView={handleViewListing}
 formatSelectedCurrency={formatSelectedCurrency}
 />
 ))}
 </div>
 )}
 </section>

 <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="text-xl font-bold text-neutral-900">
 {language === "zh" ? "最新成交区" : "Latest Trades"}
 </h2>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {latestTrades.length}
 </span>
 </div>

 {latestTrades.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前暂无成交记录。"
 : "No completed trades yet."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {latestTrades.map((item) => (
 <TradeCard
 key={item.id}
 item={item}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onView={handleViewTrade}
 />
 ))}
 </div>
 )}
 </section>
 </div>

 <ImmersiveHouseDetailModal
 open={isDetailOpen}
 house={selectedHouse}
 language={language}
 meta={selectedHouseMeta}
 subtitle={language === "zh" ? "交易大厅房产预览" : "Exchange property preview"}
 onClose={() => {
 setIsDetailOpen(false);
 setSelectedHouse(null);
 setSelectedHouseMeta(null);
 }}
 />

 {pendingBuy ? (
 <div
 className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={() => setPendingBuy(null)}
 >
 <div
 className="w-full max-w-[560px] rounded-[28px] border border-neutral-200 bg-white p-6 shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="text-sm font-medium text-neutral-500">
 {language === "zh" ? "确认购买" : "Confirm Purchase"}
 </div>
 <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
 {pendingBuy.assetType === "land"
 ? language === "zh"
 ? "购买地产"
 : "Buy Land"
 : language === "zh"
 ? "购买房产"
 : "Buy Property"}
 </h3>
 </div>

 <button
 onClick={() => setPendingBuy(null)}
 className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white"
 >
 ✕
 </button>
 </div>

 <div className="mt-6 rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-xs font-medium text-neutral-400">
 {language === "zh" ? "资产名称" : "Asset"}
 </div>
 <div className="mt-2 text-base font-semibold text-neutral-900">
 {pendingBuy.title}
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <div className="rounded-2xl bg-white px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "挂牌价格" : "Listing Price"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {formatSelectedCurrency(pendingBuy.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(pendingBuy.priceDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "当前可用余额" : "Available Balance"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {formatSelectedCurrency(assetOverview.availableBalanceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(assetOverview.availableBalanceDb)}
 </div>
 </div>
 </div>
 </div>

 <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600">
 {language === "zh"
 ? pendingBuy.assetType === "land"
 ? "确认后，这块地产会从市场下架，并进入你的“我的土地”。"
 : "确认后，这套房产会从市场下架，并进入你的“我购买的房产”。"
 : pendingBuy.assetType === "land"
 ? "After confirmation, this land will be removed from the market and added to your 'My Lands'."
 : "After confirmation, this property will be removed from the market and added to your 'Purchased Properties'."}
 </div>

 <div className="mt-6 flex flex-wrap justify-end gap-3">
 <button
 onClick={() => setPendingBuy(null)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "取消" : "Cancel"}
 </button>

 <button
 onClick={handleConfirmBuy}
 className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "确认购买" : "Confirm Purchase"}
 </button>
 </div>
 </div>
 </div>
 ) : null}

 {toast ? (
 <div className="fixed bottom-6 left-1/2 z-[1000001] -translate-x-1/2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
 {toast}
 </div>
 ) : null}
 </div>
 </div>
 );
}