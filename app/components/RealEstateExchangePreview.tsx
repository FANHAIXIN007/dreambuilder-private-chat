"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
 APP_DATA_SYNC_EVENT,
 loadAssetStore,
 type MarketListing,
 type MarketTradeRecord,
 type PurchasedProperty,
} from "@/app/lib/dbAssetStore";
import type { HouseItem } from "./DetailModal";

type Language = "zh" | "en";
type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";

type MarketRates = {
 USD: number;
 CNY: number;
 USDT: number;
 BTC: number;
};

type RealEstateExchangePreviewProps = {
 onOpenListing?: (item: MarketListing) => void;
 onOpenTrade?: (item: MarketTradeRecord) => void;
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

function convertPurchasedPropertyToHouseItem(item: PurchasedProperty): HouseItem {
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
 facadeZh: "",
 facadeEn: "",
 roofZh: "",
 roofEn: "",
 roofColorZh: "",
 roofColorEn: "",
 sceneZh: "",
 sceneEn: "",
 toneZh: "",
 toneEn: "",
 garageZh: "",
 garageEn: "",
 seasonZh: "",
 seasonEn: "",
 plotZh: item.plotZh,
 plotEn: item.plotEn,
 };
}

function enrichTradeRecords(
 trades: MarketTradeRecord[],
 store: ReturnType<typeof loadAssetStore>
): MarketTradeRecord[] {
 return trades.map((trade) => {
 if (trade.assetType !== "property") return trade;

 const tradeWithSnapshot = trade as MarketTradeRecord & {
 houseSnapshot?: HouseItem;
 };

 if (tradeWithSnapshot.houseSnapshot) return trade;

 if (trade.sourceId?.startsWith("built-")) {
 const builtHouseId = Number(trade.sourceId.replace("built-", ""));
 const builtHouse = (store.gallery as HouseItem[]).find(
 (house) => house.id === builtHouseId
 );
 if (builtHouse) {
 return {
 ...trade,
 houseSnapshot: builtHouse,
 } as MarketTradeRecord;
 }
 }

 if (trade.sourceId?.startsWith("purchased-")) {
 const purchasedId = Number(trade.sourceId.replace("purchased-", ""));
 const purchasedHouse = store.purchasedProperties.find(
 (property) => property.id === purchasedId
 );
 if (purchasedHouse) {
 return {
 ...trade,
 houseSnapshot: convertPurchasedPropertyToHouseItem(purchasedHouse),
 } as MarketTradeRecord;
 }
 }

 return trade;
 });
}

function StatCard({
 label,
 value,
 accent = "neutral",
}: {
 label: string;
 value: string | number;
 accent?: "neutral" | "emerald" | "sky" | "fuchsia";
}) {
 const accentMap = {
 neutral: "bg-white border-neutral-200 text-neutral-900",
 emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
 sky: "bg-sky-50 border-sky-200 text-sky-700",
 fuchsia: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
 };

 return (
 <div
 className={`rounded-[22px] border p-4 shadow-sm ${accentMap[accent]}`}
 >
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {label}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
 </div>
 );
}

function ListingPreviewCard({
 item,
 language,
 formatSelectedCurrency,
 onOpen,
}: {
 item: MarketListing;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
 onOpen?: (item: MarketListing) => void;
}) {
 return (
 <article className="group overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]">
 <button
 type="button"
 onClick={() => onOpen?.(item)}
 className="block w-full cursor-pointer text-left"
 >
 <div className="relative h-40 overflow-hidden">
 <img
 src={item.image}
 alt={item.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {item.assetType === "land"
 ? language === "zh"
 ? "地产"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-fuchsia-50/95 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 backdrop-blur">
 {language === "zh" ? "出售中" : "On Sale"}
 </div>
 </div>

 <div className="p-4">
 <h4 className="line-clamp-2 text-sm font-semibold leading-6 text-neutral-900 md:text-base">
 {item.title}
 </h4>
 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? `挂牌时间：${formatDateTime(item.listedAt, language)}`
 : `Listed: ${formatDateTime(item.listedAt, language)}`}
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "挂牌价格" : "Listing Price"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {formatSelectedCurrency(item.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(item.priceDb)}
 </div>
 </div>
 </div>
 </button>
 </article>
 );
}

function TradePreviewCard({
 item,
 language,
 formatSelectedCurrency,
 onOpen,
}: {
 item: MarketTradeRecord;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
 onOpen?: (item: MarketTradeRecord) => void;
}) {
 return (
 <article className="group overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]">
 <button
 type="button"
 onClick={() => onOpen?.(item)}
 className="block w-full cursor-pointer text-left"
 >
 <div className="relative h-40 overflow-hidden">
 <img
 src={item.image}
 alt={item.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {item.assetType === "land"
 ? language === "zh"
 ? "地产"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 backdrop-blur">
 {language === "zh" ? "已成交" : "Sold"}
 </div>
 </div>

 <div className="p-4">
 <h4 className="line-clamp-2 text-sm font-semibold leading-6 text-neutral-900 md:text-base">
 {item.title}
 </h4>
 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? `成交时间：${formatDateTime(item.tradedAt, language)}`
 : `Sold: ${formatDateTime(item.tradedAt, language)}`}
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "成交价格" : "Sold Price"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {formatSelectedCurrency(item.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(item.priceDb)}
 </div>
 </div>
 </div>
 </button>
 </article>
 );
}

export default function RealEstateExchangePreview({
 onOpenListing,
 onOpenTrade,
}: RealEstateExchangePreviewProps) {
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

 useEffect(() => {
 const sync = () => {
 const store = loadAssetStore();
 setLanguage(getStoredLanguage());
 setSelectedCurrency(getStoredCurrency());
 setMarketListings(store.marketListings as MarketListing[]);

 const rawTrades =
 ((store as typeof store & { marketTrades?: MarketTradeRecord[] }).marketTrades ||
 []) as MarketTradeRecord[];

 setTradeRecords(enrichTradeRecords(rawTrades, store));
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

 const convertDbToSelectedCurrency = (dbAmount: number) => {
 const usdAmount = dbAmount / 100;
 const rate = marketRates[selectedCurrency];
 if (!rate || rate <= 0) return 0;
 return usdAmount * rate;
 };

 const formatSelectedCurrency = (dbAmount: number) => {
 const value = convertDbToSelectedCurrency(dbAmount);

 if (selectedCurrency === "CNY") {
 return `¥${value.toLocaleString("zh-CN", {
 maximumFractionDigits: 2,
 })}`;
 }

 if (selectedCurrency === "USD") {
 return `$${value.toLocaleString("en-US", {
 maximumFractionDigits: 2,
 })}`;
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
 () => marketListings.filter((item) => item.assetType === "land"),
 [marketListings]
 );

 const propertyListings = useMemo(
 () => marketListings.filter((item) => item.assetType === "property"),
 [marketListings]
 );

 const totalListingValue = useMemo(
 () => marketListings.reduce((sum, item) => sum + item.priceDb, 0),
 [marketListings]
 );

 const latestTrades = useMemo(
 () => sortTradesByLatest(tradeRecords).slice(0, 4),
 [tradeRecords]
 );

 const latestLandListings = useMemo(
 () => sortListingsByLatest(landListings).slice(0, 4),
 [landListings]
 );

 const latestPropertyListings = useMemo(
 () => sortListingsByLatest(propertyListings).slice(0, 4),
 [propertyListings]
 );

 return (
 <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
 <div>
 <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-emerald-700">
 {language === "zh"
 ? "梦幻岛房地产交易大厅"
 : "Dream Island Real Estate Exchange"}
 </div>

 <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
 {language === "zh" ? "市场预览" : "Market Preview"}
 </h2>

 <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "这里展示当前在售地产、在售房产与最新成交记录。更多交易内容，请进入完整交易大厅。"
 : "This preview shows active land listings, property listings and latest completed trades. Enter the full exchange for more."}
 </p>
 </div>

 <Link
 href="/exchange"
 className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "进入交易大厅" : "Enter Exchange"}
 </Link>
 </div>

 <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
 <StatCard
 label={language === "zh" ? "在售地产" : "Land Listings"}
 value={landListings.length}
 accent="emerald"
 />
 <StatCard
 label={language === "zh" ? "在售房产" : "Property Listings"}
 value={propertyListings.length}
 accent="sky"
 />
 <StatCard
 label={language === "zh" ? "最新成交" : "Latest Trades"}
 value={tradeRecords.length}
 accent="fuchsia"
 />
 <StatCard
 label={language === "zh" ? "总挂牌额" : "Total Listing Value"}
 value={formatSelectedCurrency(totalListingValue)}
 accent="neutral"
 />
 </div>

 <div className="mt-8 space-y-8">
 <div>
 <div className="mb-4 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "热门地产" : "Featured Land"}
 </h3>
 <Link
 href="/exchange"
 className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
 >
 {language === "zh" ? "查看更多 →" : "View More →"}
 </Link>
 </div>

 {latestLandListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前暂无在售地产。"
 : "No active land listings right now."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {latestLandListings.map((item) => (
 <ListingPreviewCard
 key={item.id}
 item={item}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onOpen={onOpenListing}
 />
 ))}
 </div>
 )}
 </div>

 <div>
 <div className="mb-4 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "热门房产" : "Featured Properties"}
 </h3>
 <Link
 href="/exchange"
 className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
 >
 {language === "zh" ? "查看更多 →" : "View More →"}
 </Link>
 </div>

 {latestPropertyListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前暂无在售房产。"
 : "No active property listings right now."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {latestPropertyListings.map((item) => (
 <ListingPreviewCard
 key={item.id}
 item={item}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onOpen={onOpenListing}
 />
 ))}
 </div>
 )}
 </div>

 <div>
 <div className="mb-4 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "最新成交" : "Latest Trades"}
 </h3>
 <Link
 href="/exchange"
 className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
 >
 {language === "zh" ? "查看更多 →" : "View More →"}
 </Link>
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
 <TradePreviewCard
 key={item.id}
 item={item}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onOpen={onOpenTrade}
 />
 ))}
 </div>
 )}
 </div>
 </div>
 </section>
 );
}