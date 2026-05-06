"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BuyLotWithUsdtButton from "@/app/components/web3/BuyLotWithUsdtButton";
import {
 APP_DATA_SYNC_EVENT,
 DEFAULT_ASSET_OVERVIEW,
 emitAssetStoreSync,
 loadAssetStore,
 normalizeLotId,
 saveAssetStore,
 type AssetOverview,
 type AssetRecord,
 type HouseLotBinding,
 type LotPurchaseRecord,
 type LotTradeStatus,
 type OwnedLot,
} from "@/app/lib/dbAssetStore";

type Language = "zh" | "en";
type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";
type TerrainType = "forest" | "city" | "cliff" | "plain" | "suburb";
type OwnerType = "none" | "self" | "other";

type PlotMeta = {
 id: string;
 code: string;
 nameZh: string;
 nameEn: string;
 terrainType: TerrainType;
 terrainZh: string;
 terrainEn: string;
 descZh: string;
 descEn: string;
 badgeZh: string;
 badgeEn: string;
 image: string;
};

type LotPoint = {
 lotId: string;
 x: number;
 y: number;
};

type BuiltLot = {
 lotId: string;
 houseId: number;
 title: string;
 image: string;
 isSelf: boolean;
};

const UI = {
 btnPrimary:
 "rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black",
 btnSecondary:
 "rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50",
 btnDisabled:
 "rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-400 cursor-not-allowed",
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
 if (saved === "zh" || saved === "en") return saved;
 return "zh";
}

function formatDbToCurrency(dbAmount: number, currency: CurrencyType) {
 const usdAmount = dbAmount / 100;

 if (currency === "CNY") {
 return `¥${(usdAmount * 7.2).toLocaleString("zh-CN", {
 maximumFractionDigits: 2,
 })}`;
 }

 if (currency === "USD") {
 return `$${usdAmount.toLocaleString("en-US", {
 maximumFractionDigits: 2,
 })}`;
 }

 if (currency === "USDT") {
 return `${usdAmount.toLocaleString("en-US", {
 maximumFractionDigits: 2,
 })} USDT`;
 }

 return `${(usdAmount / 65000).toLocaleString("en-US", {
 maximumFractionDigits: 6,
 })} BTC`;
}

function formatDateTime(value: number | string, language: Language) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

function getTerrainMetaByCode(codeNum: number) {
 const row = Math.floor((codeNum - 1) / 6);
 const col = (codeNum - 1) % 6;

 let terrainType: TerrainType = "plain";

 if (row <= 1 && col <= 1) terrainType = "forest";
 else if (row <= 1 && col >= 4) terrainType = "city";
 else if (row >= 4 && col >= 4) terrainType = "cliff";
 else if (row >= 4 && col <= 1) terrainType = "suburb";
 else if (row === 2 && col === 5) terrainType = "city";
 else if (row === 3 && col === 5) terrainType = "cliff";
 else if (row === 2 && col === 0) terrainType = "forest";
 else if (row === 3 && col === 0) terrainType = "suburb";

 if (terrainType === "forest") {
 return {
 terrainType,
 terrainZh: "山林地块",
 terrainEn: "Forest Plot",
 descZh: "这里是山林地块的详细地图，适合打造别墅、庄园和庭院住宅，环境安静且私密性强。",
 descEn:
 "This is the detailed map of a forest plot, ideal for villas, estates, and courtyard homes with privacy and calm surroundings.",
 badgeZh: "适合别墅 / 庄园",
 badgeEn: "Best for Villas / Estates",
 image: "/maps/plots/plot-2.png",
 };
 }

 if (terrainType === "city") {
 return {
 terrainType,
 terrainZh: "城市地块",
 terrainEn: "City Plot",
 descZh: "这里是城市地块的详细地图，适合联排、双拼和高效率城市住宅开发。",
 descEn:
 "This is the detailed map of a city plot, suitable for townhouses, semi-detached homes, and efficient urban development.",
 badgeZh: "适合联排 / 城市住宅",
 badgeEn: "Best for Urban Homes",
 image: "/maps/plots/plot-3.png",
 };
 }

 if (terrainType === "cliff") {
 return {
 terrainType,
 terrainZh: "海边悬崖",
 terrainEn: "Seaside Cliff",
 descZh: "这里是海边悬崖地块的详细地图，拥有最强景观价值，适合建造景观别墅和高端度假住宅。",
 descEn:
 "This is the detailed map of a seaside cliff plot, ideal for scenic villas and luxury resort homes with premium views.",
 badgeZh: "适合景观别墅",
 badgeEn: "Best for View Villas",
 image: "/maps/plots/plot-1.png",
 };
 }

 if (terrainType === "suburb") {
 return {
 terrainType,
 terrainZh: "城镇郊区",
 terrainEn: "Town Suburb",
 descZh: "这里是城镇郊区地块的详细地图，兼顾生活便利和居住舒适，适合低密度社区住宅。",
 descEn:
 "This is the detailed map of a town suburb plot, balancing convenience and comfort for low-density residential living.",
 badgeZh: "适合家庭住宅",
 badgeEn: "Best for Family Homes",
 image: "/maps/plots/plot-5.png",
 };
 }

 return {
 terrainType: "plain" as const,
 terrainZh: "内陆平原",
 terrainEn: "Inland Plain",
 descZh: "这里是内陆平原地块的详细地图，地势平缓，施工稳定，适合大多数家庭住宅和成长型社区。",
 descEn:
 "This is the detailed map of an inland plain plot, with stable terrain suitable for family residences and growth communities.",
 badgeZh: "适合独栋 / 社区住宅",
 badgeEn: "Best for Detached / Community Homes",
 image: "/maps/plots/plot-4.png",
 };
}

function buildPlotMeta(plotId: string): PlotMeta {
 const code = plotId.replace("plot-", "");
 const codeNum = Number.parseInt(code, 10) || 1;
 const terrainMeta = getTerrainMetaByCode(codeNum);

 return {
 id: plotId,
 code,
 nameZh: `地块 ${code}`,
 nameEn: `Plot ${code}`,
 ...terrainMeta,
 };
}

function getLotTemplate(terrainType: TerrainType): LotPoint[] {
 if (terrainType === "forest") {
 return [
 { lotId: "lot-1", x: 18, y: 26 },
 { lotId: "lot-2", x: 39, y: 21 },
 { lotId: "lot-3", x: 61, y: 28 },
 { lotId: "lot-4", x: 76, y: 36 },
 { lotId: "lot-5", x: 24, y: 55 },
 { lotId: "lot-6", x: 45, y: 50 },
 { lotId: "lot-7", x: 65, y: 55 },
 { lotId: "lot-8", x: 46, y: 76 },
 ];
 }

 if (terrainType === "city") {
 return [
 { lotId: "lot-1", x: 22, y: 22 },
 { lotId: "lot-2", x: 41, y: 22 },
 { lotId: "lot-3", x: 60, y: 22 },
 { lotId: "lot-4", x: 78, y: 22 },
 { lotId: "lot-5", x: 22, y: 57 },
 { lotId: "lot-6", x: 41, y: 57 },
 { lotId: "lot-7", x: 60, y: 57 },
 { lotId: "lot-8", x: 78, y: 57 },
 ];
 }

 if (terrainType === "cliff") {
 return [
 { lotId: "lot-1", x: 24, y: 27 },
 { lotId: "lot-2", x: 44, y: 23 },
 { lotId: "lot-3", x: 64, y: 19 },
 { lotId: "lot-4", x: 78, y: 32 },
 { lotId: "lot-5", x: 30, y: 55 },
 { lotId: "lot-6", x: 50, y: 50 },
 { lotId: "lot-7", x: 68, y: 55 },
 { lotId: "lot-8", x: 52, y: 76 },
 ];
 }

 if (terrainType === "suburb") {
 return [
 { lotId: "lot-1", x: 21, y: 24 },
 { lotId: "lot-2", x: 40, y: 19 },
 { lotId: "lot-3", x: 59, y: 24 },
 { lotId: "lot-4", x: 76, y: 21 },
 { lotId: "lot-5", x: 25, y: 52 },
 { lotId: "lot-6", x: 44, y: 57 },
 { lotId: "lot-7", x: 63, y: 52 },
 { lotId: "lot-8", x: 49, y: 77 },
 ];
 }

 return [
 { lotId: "lot-1", x: 20, y: 24 },
 { lotId: "lot-2", x: 39, y: 20 },
 { lotId: "lot-3", x: 58, y: 24 },
 { lotId: "lot-4", x: 76, y: 21 },
 { lotId: "lot-5", x: 24, y: 54 },
 { lotId: "lot-6", x: 44, y: 49 },
 { lotId: "lot-7", x: 63, y: 54 },
 { lotId: "lot-8", x: 49, y: 76 },
 ];
}

function getBuiltLotsFromBindings(plotId: string, bindings: HouseLotBinding[]): BuiltLot[] {
 return bindings
 .filter((item) => item.plotId === plotId)
 .map((item) => ({
 lotId: normalizeLotId(item.lotId),
 houseId: item.houseId,
 title: item.title,
 image: item.image,
 isSelf: true,
 }));
}

function getBaseTradeStatus(
 plot: PlotMeta,
 lots: LotPoint[],
 builtLots: BuiltLot[],
 ownedLots: OwnedLot[]
): LotTradeStatus[] {
 const terrainBasePrice =
 plot.terrainType === "cliff"
 ? 268000
 : plot.terrainType === "city"
 ? 198000
 : plot.terrainType === "forest"
 ? 182000
 : plot.terrainType === "suburb"
 ? 156000
 : 138000;

 return lots.map((lot, index) => {
 const lotKey = normalizeLotId(lot.lotId);
 const built = builtLots.find((item) => item.lotId === lotKey);
 const owned = ownedLots.find(
 (item) => item.plotId === plot.id && normalizeLotId(item.lotId) === lotKey
 );

 if (built || owned) {
 return {
 plotId: plot.id,
 lotId: lotKey,
 ownerType: "self",
 ownerName: "You",
 priceDb: terrainBasePrice + (index + 1) * 1200,
 lastPriceDb: terrainBasePrice + index * 1000,
 dailyChangePercent: 1.2 + index * 0.18,
 tradeCount: 2 + index,
 isListed: true,
 };
 }

 const isOtherOwned = index === 1 || index === 3;
 if (isOtherOwned) {
 return {
 plotId: plot.id,
 lotId: lotKey,
 ownerType: "other",
 ownerName: index === 1 ? "Alex" : "Lina",
 priceDb: terrainBasePrice + (index + 1) * 1500,
 lastPriceDb: terrainBasePrice + index * 1200,
 dailyChangePercent: -0.4 + index * 0.22,
 tradeCount: 4 + index,
 isListed: false,
 };
 }

 return {
 plotId: plot.id,
 lotId: lotKey,
 ownerType: "none",
 ownerName: "None",
 priceDb: terrainBasePrice + (index + 1) * 900,
 lastPriceDb: terrainBasePrice + index * 700,
 dailyChangePercent: 0.6 + index * 0.12,
 tradeCount: index,
 isListed: true,
 };
 });
}

function getOwnerTypeLabel(language: Language, ownerType: OwnerType) {
 if (ownerType === "self") return language === "zh" ? "我的地块" : "My Lot";
 if (ownerType === "other") return language === "zh" ? "他人持有" : "Owned by Others";
 return language === "zh" ? "可购买" : "Available";
}

function getOwnerBadgeClass(ownerType: OwnerType) {
 if (ownerType === "self") {
 return "border-emerald-200 bg-emerald-50 text-emerald-700";
 }
 if (ownerType === "other") {
 return "border-amber-200 bg-amber-50 text-amber-700";
 }
 return "border-sky-200 bg-sky-50 text-sky-700";
}

function getShortLotCode(lotId: string) {
 return String(Number.parseInt(normalizeLotId(lotId).replace("lot-", ""), 10));
}

function getFullLotCode(plotCode: string, lotId: string) {
 return `${plotCode}-${getShortLotCode(lotId)}`;
}

function getFullLotLabel(plotCode: string, lotId: string, language: Language) {
 const code = getFullLotCode(plotCode, lotId);
 return language === "zh" ? `地块 ${code}` : `Plot ${code}`;
}

function makeAssetRecord(record: AssetRecord): AssetRecord {
 return record;
}

export default function PlotDetailPage() {
 const router = useRouter();
 const params = useParams();
 const rawPlotId = Array.isArray(params?.plotId)
 ? params.plotId[0]
 : params?.plotId || "plot-01";

 const [language, setLanguage] = useState<Language>("zh");
 const [currency, setCurrency] = useState<CurrencyType>("CNY");
 const [preferenceReady, setPreferenceReady] = useState(false);
 const [hydrated, setHydrated] = useState(false);
 const [hasLoaded, setHasLoaded] = useState(false);

 const [activeLotId, setActiveLotId] = useState<string | null>(null);
 const [tradeStatuses, setTradeStatuses] = useState<LotTradeStatus[]>([]);
 const [assetOverview, setAssetOverview] = useState<AssetOverview>(
 DEFAULT_ASSET_OVERVIEW
 );
 const [builtLots, setBuiltLots] = useState<BuiltLot[]>([]);
 const [ownedLots, setOwnedLots] = useState<OwnedLot[]>([]);
 const [bindings, setBindings] = useState<HouseLotBinding[]>([]);
 const [lotPurchaseRecords, setLotPurchaseRecords] = useState<LotPurchaseRecord[]>([]);
 const [assetRecords, setAssetRecords] = useState<AssetRecord[]>([]);
 const [toast, setToast] = useState("");

 const plot = useMemo(() => buildPlotMeta(String(rawPlotId)), [rawPlotId]);
 const lots = useMemo(() => getLotTemplate(plot.terrainType), [plot.terrainType]);

 const hydrateFromStore = () => {
 const store = loadAssetStore();
 const nextOwnedLots = store.lands.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
 const nextBindings = store.bindings.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
 const nextBuiltLots = getBuiltLotsFromBindings(plot.id, nextBindings);
 const baseTrades = getBaseTradeStatus(plot, lots, nextBuiltLots, nextOwnedLots);

 const mergedTrades = baseTrades.map((item) => {
 const saved = store.lotTrades.find(
 (trade) =>
 trade.plotId === item.plotId &&
 normalizeLotId(trade.lotId) === normalizeLotId(item.lotId)
 );
 return saved
 ? { ...item, ...saved, lotId: normalizeLotId(saved.lotId) }
 : item;
 });

 setOwnedLots(nextOwnedLots);
 setBindings(nextBindings);
 setBuiltLots(nextBuiltLots);
 setTradeStatuses(mergedTrades);
 setLotPurchaseRecords(
 store.lotPurchaseRecords.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }))
 );
 setAssetOverview(store.assetOverview || DEFAULT_ASSET_OVERVIEW);
 setAssetRecords(store.assetRecords || []);
 };

 const saveWorldState = (payload: {
 lands?: OwnedLot[];
 bindings?: HouseLotBinding[];
 lotTrades?: LotTradeStatus[];
 lotPurchaseRecords?: LotPurchaseRecord[];
 assetOverview?: AssetOverview;
 assetRecords?: AssetRecord[];
 }) => {
 const current = loadAssetStore();
 saveAssetStore({
 ...current,
 lands: payload.lands ?? current.lands,
 bindings: payload.bindings ?? current.bindings,
 lotTrades: payload.lotTrades ?? current.lotTrades,
 lotPurchaseRecords: payload.lotPurchaseRecords ?? current.lotPurchaseRecords,
 assetOverview: payload.assetOverview ?? current.assetOverview,
 assetRecords: payload.assetRecords ?? current.assetRecords,
 });
 };

 useEffect(() => {
 setHydrated(true);
 setCurrency(getStoredCurrency());
 setLanguage(getStoredLanguage());
 setPreferenceReady(true);
 hydrateFromStore();
 setHasLoaded(true);

 const handleSync = () => {
 setCurrency(getStoredCurrency());
 setLanguage(getStoredLanguage());
 hydrateFromStore();
 };

 window.addEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.addEventListener("focus", handleSync);
 window.addEventListener("storage", handleSync);

 return () => {
 window.removeEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.removeEventListener("focus", handleSync);
 window.removeEventListener("storage", handleSync);
 };
 }, [plot.id]);

 useEffect(() => {
 if (!preferenceReady) return;
 localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
 }, [currency, preferenceReady]);

 useEffect(() => {
 if (!preferenceReady) return;
 localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
 }, [language, preferenceReady]);

 useEffect(() => {
 setActiveLotId(null);
 }, [plot.id]);

 useEffect(() => {
 if (!toast) return;
 const timer = window.setTimeout(() => setToast(""), 2200);
 return () => window.clearTimeout(timer);
 }, [toast]);

 useEffect(() => {
 if (!hasLoaded) return;
 if (!activeLotId && lots[0]) {
 setActiveLotId(normalizeLotId(lots[0].lotId));
 }
 }, [hasLoaded, activeLotId, lots]);

 const activeLot = lots.find(
 (lot) => normalizeLotId(lot.lotId) === normalizeLotId(activeLotId || "")
 ) || null;

 const activeLotKey = activeLot ? normalizeLotId(activeLot.lotId) : null;

 const activeBuiltHouse =
 builtLots.find((item) => item.lotId === activeLotKey) || null;

 const activeTrade =
 tradeStatuses.find((item) => normalizeLotId(item.lotId) === activeLotKey) || null;

 const activePurchaseRecord =
 lotPurchaseRecords.find(
 (item) => item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey
 ) || null;

 const canBuy = activeTrade?.ownerType === "none";
 const canSell = activeTrade?.ownerType === "self" && !activeBuiltHouse;
 const canBuild = activeTrade?.ownerType === "self" && !activeBuiltHouse;

 const lotStats = useMemo(() => {
 const total = tradeStatuses.length;
 const self = tradeStatuses.filter((item) => item.ownerType === "self").length;
 const other = tradeStatuses.filter((item) => item.ownerType === "other").length;
 const available = tradeStatuses.filter((item) => item.ownerType === "none").length;
 const built = builtLots.length;
 return { total, self, other, available, built };
 }, [tradeStatuses, builtLots]);

 const handleBuy = () => {
 if (!activeTrade || !activeLotKey) return;
 if (activeTrade.ownerType !== "none") return;

 if (assetOverview.availableBalanceDb < activeTrade.priceDb) {
 setToast(language === "zh" ? "余额不足" : "Insufficient balance");
 return;
 }

 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: assetOverview.availableBalanceDb - activeTrade.priceDb,
 landValueDb: assetOverview.landValueDb + activeTrade.priceDb,
 dailyChangePercent: assetOverview.dailyChangePercent + 0.05,
 };

 const nextTrade: LotTradeStatus = {
 ...activeTrade,
 lotId: activeLotKey,
 ownerType: "self",
 ownerName: "You",
 lastPriceDb: activeTrade.priceDb,
 priceDb: Math.round(activeTrade.priceDb * 1.03),
 dailyChangePercent: activeTrade.dailyChangePercent + 0.2,
 tradeCount: activeTrade.tradeCount + 1,
 isListed: true,
 };

 const nextTrades = tradeStatuses.map((item) =>
 normalizeLotId(item.lotId) === activeLotKey ? nextTrade : item
 );

 const nextOwnedLots = ownedLots.some(
 (item) => item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey
 )
 ? ownedLots
 : [
 ...ownedLots,
 {
 plotId: plot.id,
 lotId: activeLotKey,
 acquiredAt: Date.now(),
 purchasePriceDb: activeTrade.priceDb,
 },
 ];

 const fullCode = getFullLotCode(plot.code, activeLotKey);
 const nextRecords: AssetRecord[] = [
 makeAssetRecord({
 id: Date.now(),
 type: "buy_land",
 titleZh: `购买地块 ${fullCode}`,
 titleEn: `Buy Lot ${fullCode}`,
 amountDb: -activeTrade.priceDb,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 }),
 ...assetRecords,
 ].slice(0, 100);

 setTradeStatuses(nextTrades);
 setOwnedLots(nextOwnedLots);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 saveWorldState({
 lands: nextOwnedLots,
 lotTrades: nextTrades,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 emitAssetStoreSync();
 setToast(language === "zh" ? "购买成功" : "Purchase successful");
 };

 const handleBuyUsdtSuccess = ({
 txHash,
 amountUsdt,
 }: {
 txHash: string;
 amountUsdt: string;
 }) => {
 if (!activeTrade || !activeLotKey) return;

 const nextTrade: LotTradeStatus = {
 ...activeTrade,
 lotId: activeLotKey,
 ownerType: "self",
 ownerName: "You",
 lastPriceDb: activeTrade.priceDb,
 priceDb: Math.round(activeTrade.priceDb * 1.03),
 dailyChangePercent: activeTrade.dailyChangePercent + 0.2,
 tradeCount: activeTrade.tradeCount + 1,
 isListed: true,
 };

 const nextTrades = tradeStatuses.map((item) =>
 normalizeLotId(item.lotId) === activeLotKey ? nextTrade : item
 );

 const nextOverview: AssetOverview = {
 ...assetOverview,
 landValueDb: assetOverview.landValueDb + activeTrade.priceDb,
 dailyChangePercent: assetOverview.dailyChangePercent + 0.05,
 };

 const nextPurchaseRecords: LotPurchaseRecord[] = [
 {
 plotId: plot.id,
 lotId: activeLotKey,
 amountUsdt,
 txHash,
 purchasedAt: Date.now(),
 },
 ...lotPurchaseRecords.filter(
 (item) =>
 !(item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey)
 ),
 ];

 const nextOwnedLots = ownedLots.some(
 (item) => item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey
 )
 ? ownedLots
 : [
 ...ownedLots,
 {
 plotId: plot.id,
 lotId: activeLotKey,
 acquiredAt: Date.now(),
 purchasePriceDb: activeTrade.priceDb,
 },
 ];

 const fullCode = getFullLotCode(plot.code, activeLotKey);
 const nextRecords: AssetRecord[] = [
 makeAssetRecord({
 id: Date.now(),
 type: "buy_land",
 titleZh: `USDT购买地块 ${fullCode}`,
 titleEn: `Buy Lot with USDT ${fullCode}`,
 amountDb: 0,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 }),
 ...assetRecords,
 ].slice(0, 100);

 setTradeStatuses(nextTrades);
 setOwnedLots(nextOwnedLots);
 setLotPurchaseRecords(nextPurchaseRecords);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 saveWorldState({
 lands: nextOwnedLots,
 lotTrades: nextTrades,
 lotPurchaseRecords: nextPurchaseRecords,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 emitAssetStoreSync();

 setToast(
 language === "zh"
 ? `USDT支付成功，地块 ${fullCode} 已归属到你的账户。`
 : `USDT payment successful. Plot ${fullCode} now belongs to your account.`
 );

 console.log("lot purchase success:", txHash);
 };

 const handleSell = () => {
 if (!activeTrade || !activeLotKey) return;
 if (activeTrade.ownerType !== "self") return;

 if (activeBuiltHouse) {
 setToast(
 language === "zh"
 ? "该 lot 已有房屋，暂不支持直接卖出。"
 : "This lot already has a house and cannot be sold directly for now."
 );
 return;
 }

 const sellPriceDb = activeTrade.lastPriceDb || activeTrade.priceDb;

 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: assetOverview.availableBalanceDb + sellPriceDb,
 landValueDb: Math.max(0, assetOverview.landValueDb - sellPriceDb),
 dailyChangePercent: assetOverview.dailyChangePercent + 0.03,
 };

 const nextTrade: LotTradeStatus = {
 ...activeTrade,
 lotId: activeLotKey,
 ownerType: "none",
 ownerName: "None",
 lastPriceDb: sellPriceDb,
 priceDb: Math.round(sellPriceDb * 1.04),
 dailyChangePercent: activeTrade.dailyChangePercent - 0.1,
 tradeCount: activeTrade.tradeCount + 1,
 isListed: true,
 };

 const nextTrades = tradeStatuses.map((item) =>
 normalizeLotId(item.lotId) === activeLotKey ? nextTrade : item
 );

 const nextOwnedLots = ownedLots.filter(
 (item) => !(item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey)
 );

 const nextPurchaseRecords = lotPurchaseRecords.filter(
 (item) =>
 !(item.plotId === plot.id && normalizeLotId(item.lotId) === activeLotKey)
 );

 const fullCode = getFullLotCode(plot.code, activeLotKey);
 const nextRecords: AssetRecord[] = [
 makeAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `出售地块 ${fullCode}`,
 titleEn: `Sell Lot ${fullCode}`,
 amountDb: sellPriceDb,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 }),
 ...assetRecords,
 ].slice(0, 100);

 setTradeStatuses(nextTrades);
 setOwnedLots(nextOwnedLots);
 setLotPurchaseRecords(nextPurchaseRecords);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 saveWorldState({
 lands: nextOwnedLots,
 lotTrades: nextTrades,
 lotPurchaseRecords: nextPurchaseRecords,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 emitAssetStoreSync();
 setToast(language === "zh" ? "卖出成功" : "Sale successful");
 };

 const handleGoBuild = () => {
 if (!activeLotKey || !activeTrade) {
 setToast(language === "zh" ? "请先选择一个 lot" : "Please select a lot first");
 return;
 }

 if (activeTrade.ownerType !== "self") {
 setToast(
 language === "zh"
 ? "请先购买该 lot，再去建造房屋。"
 : "Please buy this lot before building."
 );
 return;
 }

 if (activeBuiltHouse) {
 setToast(
 language === "zh"
 ? "该 lot 已经建造过房屋。"
 : "This lot already has a built house."
 );
 return;
 }

 router.push(`/?focus=quick-create&plotId=${plot.id}&lotId=${activeLotKey}`);
 };

 if (!hydrated || !hasLoaded) {
 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8" />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
 <header className="mb-6 rounded-[32px] border border-neutral-200 bg-white px-5 py-4 shadow-sm md:px-6">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-amber-700">
 PLOT DETAIL MAP
 </div>

 <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-900 md:text-4xl">
 {language === "zh" ? plot.nameZh : plot.nameEn}
 </h1>

 <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
 {language === "zh" ? plot.descZh : plot.descEn}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
 {language === "zh" ? "可用余额：" : "Available: "}
 {formatDbToCurrency(assetOverview.availableBalanceDb, currency)}
 </div>

 <div className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
 <button
 onClick={() => setLanguage("zh")}
 className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
 language === "zh"
 ? "bg-neutral-900 text-white"
 : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
 }`}
 >
 中文
 </button>
 <button
 onClick={() => setLanguage("en")}
 className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
 language === "en"
 ? "bg-neutral-900 text-white"
 : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
 }`}
 >
 EN
 </button>
 </div>

 <button
 onClick={() => router.push("/")}
 className={UI.btnSecondary}
 >
 {language === "zh" ? "返回总地图" : "Back to Island"}
 </button>
 </div>
 </div>
 </header>

 <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
 <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "总 LOT 数" : "Total Lots"}
 </div>
 <div className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
 {lotStats.total}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "可购买" : "Available"}
 </div>
 <div className="mt-2 text-3xl font-black tracking-tight text-sky-700">
 {lotStats.available}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "我的 LOT" : "My Lots"}
 </div>
 <div className="mt-2 text-3xl font-black tracking-tight text-emerald-700">
 {lotStats.self}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "他人持有" : "Others Owned"}
 </div>
 <div className="mt-2 text-3xl font-black tracking-tight text-amber-700">
 {lotStats.other}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
 {language === "zh" ? "已建房" : "Built"}
 </div>
 <div className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
 {lotStats.built}
 </div>
 </div>
 </section>

 <section className="grid gap-4 lg:grid-cols-[1.22fr_0.78fr]">
 <div className="space-y-4">
 <div className="rounded-[32px] border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <div>
 <div className="text-sm font-semibold text-neutral-900">
 {language === "zh" ? "地块详细地图" : "Detailed Plot Map"}
 </div>
 <div className="mt-1 text-xs text-neutral-500">
 {language === "zh"
 ? "单击地块中的点位，可查看可建位置、已建房屋与交易信息。"
 : "Click a lot point to inspect buildable positions, built houses, and trading information."}
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
 {language === "zh" ? plot.terrainZh : plot.terrainEn}
 </span>
 <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
 {language === "zh" ? plot.badgeZh : plot.badgeEn}
 </span>
 </div>
 </div>

 <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-100">
 <div className="relative aspect-[1024/1536] w-full">
 <img
 src={plot.image}
 alt={language === "zh" ? plot.nameZh : plot.nameEn}
 className="h-full w-full object-contain bg-neutral-100"
 />

 <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.08),transparent_34%)]" />

 {lots.map((lot, index) => {
 const lotKey = normalizeLotId(lot.lotId);
 const builtHouse = builtLots.find((item) => item.lotId === lotKey);
 const trade = tradeStatuses.find(
 (item) => normalizeLotId(item.lotId) === lotKey
 );
 const isActive = activeLotId === lotKey;
 const isBuilt = !!builtHouse;
 const isSelf = trade?.ownerType === "self";
 const isOther = trade?.ownerType === "other";

 return (
 <button
 key={lotKey}
 onClick={() => setActiveLotId(lotKey)}
 className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-all duration-200 hover:scale-105 ${
 isBuilt
 ? isActive
 ? "border-amber-300 bg-amber-100 text-amber-900 ring-4 ring-amber-200/70"
 : isSelf
 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
 : isOther
 ? "border-amber-200 bg-amber-50 text-amber-700"
 : "border-white bg-white/95 text-neutral-900"
 : isActive
 ? "border-sky-300 bg-sky-100 text-sky-900 ring-4 ring-sky-200/70"
 : isSelf
 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
 : isOther
 ? "border-amber-200 bg-amber-50 text-amber-700"
 : "border-white/90 bg-white/78 text-neutral-700 backdrop-blur"
 }`}
 style={{
 left: `${lot.x}%`,
 top: `${lot.y}%`,
 }}
 title={
 isBuilt
 ? language === "zh"
 ? `已建造：${builtHouse.title}`
 : `Built: ${builtHouse.title}`
 : language === "zh"
 ? `可建点位 ${index + 1}`
 : `Buildable Lot ${index + 1}`
 }
 >
 {isBuilt ? "🏠" : index + 1}
 </button>
 );
 })}

 <div className="absolute bottom-4 left-4 rounded-2xl border border-white/50 bg-white/86 px-4 py-3 text-xs text-neutral-700 shadow-[0_10px_24px_rgba(0,0,0,0.10)] backdrop-blur">
 <div className="font-semibold text-neutral-900">
 {language === "zh" ? "图例" : "Legend"}
 </div>
 <div className="mt-2 flex flex-col gap-1.5">
 <div className="flex items-center gap-2">
 <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white text-[10px]">
 1
 </span>
 <span>{language === "zh" ? "可建点位" : "Available Lot"}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white text-[10px]">
 🏠
 </span>
 <span>{language === "zh" ? "已建房屋" : "Built House"}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm">
 <div className="mb-4 flex items-center justify-between">
 <div className="text-sm font-semibold text-neutral-900">
 {language === "zh" ? "LOT 列表" : "Lot List"}
 </div>
 <div className="text-xs text-neutral-400">{lots.length}</div>
 </div>

 <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
 {lots.map((lot) => {
 const lotKey = normalizeLotId(lot.lotId);
 const trade = tradeStatuses.find(
 (item) => normalizeLotId(item.lotId) === lotKey
 );
 const builtHouse = builtLots.find((item) => item.lotId === lotKey);
 const fullCode = getFullLotCode(plot.code, lotKey);
 const isActive = activeLotId === lotKey;

 if (!trade) return null;

 return (
 <button
 key={lotKey}
 onClick={() => setActiveLotId(lotKey)}
 className={`rounded-[22px] border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
 isActive
 ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_12px_24px_rgba(0,0,0,0.14)]"
 : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 <div className="flex items-center justify-between gap-2">
 <div className="text-sm font-bold">{fullCode}</div>
 <span
 className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
 isActive
 ? "border-white/20 bg-white/10 text-white"
 : getOwnerBadgeClass(trade.ownerType)
 }`}
 >
 {builtHouse
 ? language === "zh"
 ? "已建房"
 : "Built"
 : getOwnerTypeLabel(language, trade.ownerType)}
 </span>
 </div>

 <div
 className={`mt-3 text-xs ${
 isActive ? "text-neutral-300" : "text-neutral-500"
 }`}
 >
 {language === "zh" ? "市场估值" : "Market Value"}
 </div>
 <div className="mt-1 text-base font-semibold">
 {formatDbToCurrency(trade.priceDb, currency)}
 </div>

 <div
 className={`mt-2 text-[11px] ${
 isActive ? "text-neutral-400" : "text-neutral-400"
 }`}
 >
 {builtHouse
 ? builtHouse.title
 : trade.ownerType === "self"
 ? language === "zh"
 ? "你已持有，可去建造"
 : "Owned by you, ready to build"
 : trade.ownerType === "other"
 ? language === "zh"
 ? `持有人：${trade.ownerName}`
 : `Owner: ${trade.ownerName}`
 : language === "zh"
 ? "当前可购买"
 : "Available for purchase"}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm">
 <div className="text-sm font-semibold text-neutral-900">
 {language === "zh" ? "地块信息" : "Plot Info"}
 </div>

 <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
 <div className="rounded-[22px] bg-neutral-50 p-4">
 <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
 {language === "zh" ? "地块编号" : "Plot Code"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {plot.code}
 </div>
 </div>

 <div className="rounded-[22px] bg-neutral-50 p-4">
 <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
 {language === "zh" ? "地形类型" : "Terrain"}
 </div>
 <div className="mt-2 text-lg font-bold text-neutral-900">
 {language === "zh" ? plot.terrainZh : plot.terrainEn}
 </div>
 </div>

 <div className="rounded-[22px] bg-neutral-50 p-4">
 <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
 {language === "zh" ? "总 LOT 数" : "Total Lots"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {lots.length}
 </div>
 </div>

 <div className="rounded-[22px] bg-neutral-50 p-4">
 <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
 {language === "zh" ? "已建房屋" : "Built Houses"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {builtLots.length}
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm">
 <div className="text-sm font-semibold text-neutral-900">
 {language === "zh" ? "当前点位详情" : "Active Lot Detail"}
 </div>

 {!activeLot || !activeTrade ? (
 <div className="mt-4 rounded-[22px] border border-dashed border-neutral-200 bg-neutral-50 px-5 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "请先点击地图中的一个 lot 点位。"
 : "Please click a lot point on the map first."}
 </div>
 ) : (
 <div className="mt-4 space-y-4">
 {activeBuiltHouse ? (
 <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
 {activeBuiltHouse.image ? (
 <img
 src={activeBuiltHouse.image}
 alt={activeBuiltHouse.title}
 className="h-56 w-full object-cover"
 />
 ) : (
 <div className="flex h-56 items-center justify-center bg-neutral-100 text-neutral-400">
 No Preview
 </div>
 )}
 </div>
 ) : null}

 <div className="rounded-[24px] bg-neutral-50 p-4">
 <div className="flex flex-wrap items-center gap-2">
 <div className="text-lg font-semibold text-neutral-900">
 {getFullLotLabel(plot.code, activeLotKey || "", language)}
 </div>
 <span
 className={`rounded-full border px-3 py-1 text-xs font-medium ${getOwnerBadgeClass(
 activeTrade.ownerType
 )}`}
 >
 {activeBuiltHouse
 ? language === "zh"
 ? "已建房"
 : "Built House"
 : getOwnerTypeLabel(language, activeTrade.ownerType)}
 </span>
 </div>

 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "市场估值" : "Market Value"}
 </div>
 <div className="mt-1 text-xl font-black tracking-tight text-neutral-900">
 {formatDbToCurrency(activeTrade.priceDb, currency)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {activeTrade.priceDb.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "本次购入价" : "Purchase Price"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {activePurchaseRecord
 ? `${activePurchaseRecord.amountUsdt} USDT`
 : language === "zh"
 ? "暂无链上记录"
 : "No on-chain record"}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {activePurchaseRecord
 ? `${activePurchaseRecord.txHash.slice(
 0,
 10
 )}...${activePurchaseRecord.txHash.slice(-8)}`
 : "--"}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "所属人" : "Owner"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {activeTrade.ownerType === "none"
 ? language === "zh"
 ? "无"
 : "None"
 : activeTrade.ownerName}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "最近成交价" : "Last Trade"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {formatDbToCurrency(activeTrade.lastPriceDb, currency)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {activeTrade.lastPriceDb.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "今日涨跌" : "Today Change"}
 </div>
 <div
 className={`mt-1 text-base font-semibold ${
 activeTrade.dailyChangePercent >= 0
 ? "text-emerald-600"
 : "text-red-600"
 }`}
 >
 {activeTrade.dailyChangePercent >= 0 ? "+" : ""}
 {activeTrade.dailyChangePercent.toFixed(2)}%
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "交易次数" : "Trade Count"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {activeTrade.tradeCount}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "挂牌状态" : "Listing"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {activeTrade.isListed
 ? language === "zh"
 ? "挂牌中"
 : "Listed"
 : language === "zh"
 ? "未挂牌"
 : "Not Listed"}
 </div>
 </div>
 </div>

 {activeBuiltHouse ? (
 <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 {language === "zh"
 ? `该点位已有房屋：${activeBuiltHouse.title}`
 : `There is already a house on this lot: ${activeBuiltHouse.title}`}
 </div>
 ) : canBuild ? (
 <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
 {language === "zh"
 ? "这是你持有的空地，可以立即进入建造流程。"
 : "This is your owned empty lot. You can start building immediately."}
 </div>
 ) : activeTrade.ownerType === "other" ? (
 <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 {language === "zh"
 ? "该点位目前由其他玩家持有，暂不可购买或建造。"
 : "This lot is currently owned by another player and is not available for purchase or building."}
 </div>
 ) : (
 <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
 {language === "zh"
 ? "该点位当前为空地，可直接购买后进入建造。"
 : "This lot is currently empty. Purchase it first and then proceed to build."}
 </div>
 )}

 <div className="mt-4 flex flex-wrap items-start gap-3">
 {canBuy ? (
 <>
 <button onClick={handleBuy} className={UI.btnPrimary}>
 {language === "zh" ? "用 DB 购买" : "Buy with DB"}
 </button>

 <BuyLotWithUsdtButton
 language={language}
 plotId={plot.id}
 lotId={activeLotKey || ""}
 amountUsdt="0.001"
 alreadyOwned={activeTrade.ownerType === "self"}
 onSuccess={({ txHash }) =>
 handleBuyUsdtSuccess({
 txHash,
 amountUsdt: "0.001",
 })
 }
 />
 </>
 ) : (
 <>
 <button disabled className={UI.btnDisabled}>
 {language === "zh" ? "用 DB 购买" : "Buy with DB"}
 </button>
 <button disabled className={UI.btnDisabled}>
 {language === "zh" ? "用 USDT 购买" : "Buy with USDT"}
 </button>
 </>
 )}

 <button
 disabled={!canSell}
 onClick={handleSell}
 className={canSell ? UI.btnPrimary : UI.btnDisabled}
 >
 {language === "zh" ? "卖出" : "Sell"}
 </button>

 <button
 onClick={handleGoBuild}
 className={canBuild ? UI.btnSecondary : UI.btnDisabled}
 disabled={!canBuild}
 >
 {language === "zh" ? "去建造房屋" : "Go Build House"}
 </button>
 </div>

 {activeBuiltHouse ? (
 <div className="mt-3 flex flex-wrap gap-3">
 <button
 onClick={() => router.push("/my")}
 className={UI.btnSecondary}
 >
 {language === "zh" ? "去我的房产查看" : "View in My Properties"}
 </button>
 </div>
 ) : null}

 {activePurchaseRecord ? (
 <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500">
 {language === "zh"
 ? `购买时间：${formatDateTime(
 activePurchaseRecord.purchasedAt,
 language
 )}`
 : `Purchased at: ${formatDateTime(
 activePurchaseRecord.purchasedAt,
 language
 )}`}
 </div>
 ) : null}
 </div>
 </div>
 )}
 </div>

 <div className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm">
 <div className="text-sm font-semibold text-neutral-900">
 {language === "zh" ? "当前流程提示" : "Flow Tips"}
 </div>
 <div className="mt-3 space-y-2 text-sm leading-6 text-neutral-500">
 <p>
 {language === "zh"
 ? "• 先在这里购买具体 lot，然后再跳转首页快速建造。"
 : "• Buy a specific lot here first, then jump back to Quick Create."}
 </p>
 <p>
 {language === "zh"
 ? "• 建成后的房屋会永久绑定当前 lot，房屋出售时 lot 会一起转移。"
 : "• Once built, the house is permanently bound to the current lot, and the lot follows when the property is sold."}
 </p>
 <p>
 {language === "zh"
 ? "• 已建房的 lot 当前不能直接在这里卖地。"
 : "• Lots with built houses cannot be sold directly here at the moment."}
 </p>
 </div>
 </div>
 </div>
 </section>

 {toast ? (
 <div className="fixed bottom-6 left-1/2 z-[100000] -translate-x-1/2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
 {toast}
 </div>
 ) : null}
 </div>
 </div>
 );
}