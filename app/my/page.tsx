"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DemolishPropertyModal from "../components/DemolishPropertyModal";
import ImmersiveHouseDetailModal from "../components/ImmersiveHouseDetailModal";
import MyProfilePanel, {
 type MarketListing,
 type MarketTradeRecord,
 type MyLandItem,
 type MyPropertyItem,
} from "../components/MyProfilePanel";
import {
 APP_DATA_SYNC_EVENT,
 DEFAULT_ASSET_OVERVIEW,
 DEFAULT_ASSET_RECORDS,
 emitAssetStoreSync,
 loadAssetStore,
 normalizeLotId,
 saveAssetStore,
 type AssetOverview,
 type AssetRecord,
 type HouseLotBinding,
 type PurchasedProperty,
 type SavedDesign,
} from "@/app/lib/dbAssetStore";

type HouseItem = {
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
};

type Language = "zh" | "en";
type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";

type PendingListing =
 | {
 assetType: "land";
 item: MyLandItem;
 }
 | {
 assetType: "property";
 item: MyPropertyItem;
 };

type LotRef = {
 plotId: string;
 lotId: string;
};

type DemolishModalState = {
 open: boolean;
 stage: "confirm" | "success";
 property: MyPropertyItem | null;
 lotLabel: string;
};

type MarketRates = {
 USD: number;
 CNY: number;
 USDT: number;
 BTC: number;
};

type MarketTradeRecordWithSnapshot = MarketTradeRecord & {
 houseSnapshot?: HouseItem;
};

type PurchasedPropertyWithOptionalDetails = PurchasedProperty &
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

const CURRENCY_STORAGE_KEY = "db_selected_currency";
const LANGUAGE_STORAGE_KEY = "db_selected_language";
const LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY =
 "db_last_preferred_generated_house";

const UI = {
 btnSmallActive:
 "rounded-xl bg-neutral-900 text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-black hover:shadow-[0_12px_24px_rgba(0,0,0,0.22)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
 btnSmallIdle:
 "rounded-xl bg-neutral-100 text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-200 hover:text-neutral-900 hover:shadow-[0_10px_20px_rgba(0,0,0,0.12)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
};

const TEXT = {
 zh: {
 view: "查看",
 backHome: "返回首页",
 },
 en: {
 view: "View",
 backHome: "Back Home",
 },
};

function getStoredCurrency(): CurrencyType {
 if (typeof window === "undefined") return "CNY";
 const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
 if (
 saved === "CNY" ||
 saved === "USD" ||
 saved === "USDT" ||
 saved === "BTC"
 ) {
 return saved;
 }
 return "CNY";
}

function getStoredLanguage(): Language {
 if (typeof window === "undefined") return "zh";
 const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
 return saved === "en" ? "en" : "zh";
}

function convertSavedDesignToHouseItem(design: SavedDesign): HouseItem {
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
 };
}

function convertPurchasedPropertyToHouseItem(item: PurchasedProperty): HouseItem {
 const safeItem = item as PurchasedPropertyWithOptionalDetails;

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

function buildFallbackHouseItemFromMarketListing(
 listing: MarketListing,
 language: Language
): HouseItem {
 return {
 id: Date.now(),
 title: listing.title,
 author: listing.assetType === "property" ? "Market" : "Land Market",
 styleZh: listing.assetType === "property" ? "市场房产" : "市场地产",
 styleEn: listing.assetType === "property" ? "Market Property" : "Market Land",
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: listing.image,
 plotZh: listing.assetType === "land" ? listing.title : "未设置地块",
 plotEn: listing.assetType === "land" ? listing.title : "No plot",
 area:
 listing.assetType === "land"
 ? language === "zh"
 ? "地块资产"
 : "Land Asset"
 : "-",
 };
}

function buildFallbackHouseItemFromTradeRecord(
 record: MarketTradeRecord,
 language: Language
): HouseItem {
 return {
 id: Date.now(),
 title: record.title,
 author: record.assetType === "property" ? "Market" : "Land Market",
 styleZh: record.assetType === "property" ? "成交房产" : "成交地产",
 styleEn: record.assetType === "property" ? "Sold Property" : "Sold Land",
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: record.image,
 plotZh: record.assetType === "land" ? record.title : "未设置地块",
 plotEn: record.assetType === "land" ? record.title : "No plot",
 area:
 record.assetType === "land"
 ? language === "zh"
 ? "地块资产"
 : "Land Asset"
 : "-",
 };
}

function parseLotRefFromSourceId(sourceId: string): LotRef | null {
 const matched = sourceId.match(/^(plot-\d+)-(lot-\d+)$/);
 if (!matched) return null;
 return {
 plotId: matched[1],
 lotId: normalizeLotId(matched[2]),
 };
}

function parseLotRefFromFullCode(
 plotId?: string | null,
 lotId?: string | null
): LotRef | null {
 if (plotId && lotId) {
 return {
 plotId,
 lotId: normalizeLotId(lotId),
 };
 }
 return null;
}

function getBindingByHouseId(
 bindings: HouseLotBinding[],
 houseId: number
): HouseLotBinding | null {
 return bindings.find((binding) => binding.houseId === houseId) || null;
}

function getBindingByLotRef(
 bindings: HouseLotBinding[],
 lotRef: LotRef | null
): HouseLotBinding | null {
 if (!lotRef) return null;
 return (
 bindings.find(
 (binding) =>
 binding.plotId === lotRef.plotId &&
 normalizeLotId(binding.lotId) === normalizeLotId(lotRef.lotId)
 ) || null
 );
}

function getPurchasedPropertyLotRef(
 property: PurchasedProperty | undefined | null
): LotRef | null {
 if (!property) return null;
 return parseLotRefFromFullCode(property.plotId, property.lotId);
}

function removeLotOwnershipByRef(
 lots: ReturnType<typeof loadAssetStore>["lands"],
 lotRef: LotRef | null
) {
 if (!lotRef) return lots;
 return lots.filter(
 (lot) =>
 !(
 lot.plotId === lotRef.plotId &&
 normalizeLotId(lot.lotId) === normalizeLotId(lotRef.lotId)
 )
 );
}

function removeBindingByRef(
 bindings: HouseLotBinding[],
 lotRef: LotRef | null
): HouseLotBinding[] {
 if (!lotRef) return bindings;
 return bindings.filter(
 (binding) =>
 !(
 binding.plotId === lotRef.plotId &&
 normalizeLotId(binding.lotId) === normalizeLotId(lotRef.lotId)
 )
 );
}

function formatDateTime(value: string | number, language: Language) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

function createAssetRecord(record: AssetRecord): AssetRecord {
 return record;
}

function createMarketTradeRecord(record: MarketTradeRecord): MarketTradeRecord {
 return record;
}

function getLatestActionMeta(language: Language, record?: AssetRecord | null) {
 if (!record) {
 return {
 icon: "📌",
 title: language === "zh" ? "最近操作" : "Recent Activity",
 content:
 language === "zh"
 ? "你还没有最近操作记录。"
 : "You do not have any recent activity yet.",
 timeText: "",
 };
 }

 const title =
 language === "zh"
 ? record.titleZh || "最近操作"
 : record.titleEn || "Recent Activity";

 let icon = "📌";
 if (record.type === "deposit") icon = "💰";
 else if (record.type === "withdraw") icon = "🏦";
 else if (record.type === "buy_land") icon = "🗺️";
 else if (record.type === "build_house") icon = "🏠";
 else if (record.type === "wealth_in" || record.type === "wealth_out")
 icon = "📈";
 else if (record.type === "wealth_income" || record.type === "house_income")
 icon = "✨";
 else if (record.type === "save_design") icon = "❤️";
 else if (record.type === "reward") icon = "🔔";

 const amountText =
 record.amountDb === 0
 ? language === "zh"
 ? "本次操作未产生资金变动。"
 : "This action did not change your balance."
 : language === "zh"
 ? `金额变动：${record.amountDb > 0 ? "+" : ""}${record.amountDb.toLocaleString(
 "en-US"
 )} DB`
 : `Balance change: ${record.amountDb > 0 ? "+" : ""}${record.amountDb.toLocaleString(
 "en-US"
 )} DB`;

 const statusText =
 record.status === "success"
 ? language === "zh"
 ? "已完成"
 : "Completed"
 : record.status === "pending"
 ? language === "zh"
 ? "处理中"
 : "Pending"
 : language === "zh"
 ? "失败"
 : "Failed";

 return {
 icon,
 title,
 content:
 language === "zh"
 ? `${amountText} · 状态：${statusText}`
 : `${amountText} · Status: ${statusText}`,
 timeText: formatDateTime(record.createdAt, language),
 };
}

export default function MyPage() {
 const router = useRouter();

 const [language, setLanguage] = useState<Language>("zh");
 const [selectedCurrency, setSelectedCurrency] =
 useState<CurrencyType>("CNY");
 const [currencyReady, setCurrencyReady] = useState(false);
 const [languageReady, setLanguageReady] = useState(false);
 const [hydrated, setHydrated] = useState(false);
 const [hasLoaded, setHasLoaded] = useState(false);

 const [marketRates, setMarketRates] = useState<MarketRates>({
 USD: 1,
 CNY: 7.2,
 USDT: 1,
 BTC: 1 / 65000,
 });
 const [marketUpdatedAt, setMarketUpdatedAt] = useState("");

 const [builtHouses, setBuiltHouses] = useState<HouseItem[]>([]);
 const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
 const [houseLotBindings, setHouseLotBindings] = useState<HouseLotBinding[]>(
 []
 );
 const [purchasedProperties, setPurchasedProperties] = useState<
 PurchasedProperty[]
 >([]);
 const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
 const [marketTradeRecords, setMarketTradeRecords] = useState<
 MarketTradeRecord[]
 >([]);
 const [pendingListing, setPendingListing] = useState<PendingListing | null>(
 null
 );
 const [listingPriceInput, setListingPriceInput] = useState("");
 const [assetRefreshKey, setAssetRefreshKey] = useState(0);
 const [assetOverview, setAssetOverview] = useState<AssetOverview>(
 DEFAULT_ASSET_OVERVIEW
 );
 const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(
 DEFAULT_ASSET_RECORDS
 );

 const [selectedHouse, setSelectedHouse] = useState<HouseItem | null>(null);
 const [isDetailOpen, setIsDetailOpen] = useState(false);
 const [demolishModalState, setDemolishModalState] =
 useState<DemolishModalState>({
 open: false,
 stage: "confirm",
 property: null,
 lotLabel: "",
 });

 const hydrateFromStore = () => {
 const store = loadAssetStore();
 setBuiltHouses(store.gallery as HouseItem[]);
 setSavedDesigns(store.savedDesigns);
 setHouseLotBindings(store.bindings);
 setPurchasedProperties(store.purchasedProperties);
 setMarketListings(store.marketListings as MarketListing[]);
 setMarketTradeRecords(store.marketTrades as MarketTradeRecord[]);
 setAssetOverview(store.assetOverview);
 setAssetRecords(store.assetRecords);
 };

 const saveStorePatch = (
 patch: Partial<ReturnType<typeof loadAssetStore>>,
 shouldEmit = true
 ) => {
 const current = loadAssetStore();
 saveAssetStore({
 ...current,
 ...patch,
 });
 if (shouldEmit) emitAssetStoreSync();
 };

 const resetDemolishModalState = () => {
 setDemolishModalState({
 open: false,
 stage: "confirm",
 property: null,
 lotLabel: "",
 });
 };

 useEffect(() => {
 setHydrated(true);
 }, []);

 useEffect(() => {
 setSelectedCurrency(getStoredCurrency());
 setCurrencyReady(true);

 setLanguage(getStoredLanguage());
 setLanguageReady(true);

 hydrateFromStore();
 setHasLoaded(true);

 const handleSync = () => {
 setSelectedCurrency(getStoredCurrency());
 setLanguage(getStoredLanguage());
 hydrateFromStore();
 setAssetRefreshKey((prev) => prev + 1);
 };

 window.addEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.addEventListener("focus", handleSync);

 return () => {
 window.removeEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.removeEventListener("focus", handleSync);
 };
 }, []);

 useEffect(() => {
 if (!currencyReady) return;
 localStorage.setItem(CURRENCY_STORAGE_KEY, selectedCurrency);
 }, [selectedCurrency, currencyReady]);

 useEffect(() => {
 if (!languageReady) return;
 localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
 }, [language, languageReady]);

 const fetchMarketData = async () => {
 try {
 const response = await fetch("/api/market-data", {
 cache: "no-store",
 });
 const data = await response.json();

 if (!response.ok || !data.success) {
 throw new Error(data.error || "Failed to fetch market data");
 }

 setMarketRates(data.rates);
 setMarketUpdatedAt(data.meta?.updatedAt || "");
 } catch (error) {
 console.error("fetchMarketData error:", error);
 }
 };

 useEffect(() => {
 fetchMarketData();

 const timer = window.setInterval(() => {
 fetchMarketData();
 }, 60000);

 return () => window.clearInterval(timer);
 }, []);

 const islandOwnerRank = useMemo(() => builtHouses.length + 37, [builtHouses]);

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

 const pushAssetRecord = (record: AssetRecord) => {
 const nextRecords: AssetRecord[] = [record, ...assetRecords].slice(0, 100);
 setAssetRecords(nextRecords);
 saveStorePatch({ assetRecords: nextRecords });
 };

 const selectedHouseMeta = useMemo(() => {
 if (!selectedHouse) return null;

 const builtBinding = getBindingByHouseId(houseLotBindings, selectedHouse.id);
 const purchasedMatch =
 purchasedProperties.find((item) => item.id === selectedHouse.id) || null;

 const builtListing = marketListings.find(
 (item) =>
 item.assetType === "property" &&
 item.sourceId === `built-${selectedHouse.id}`
 );
 const purchasedListing =
 purchasedMatch &&
 marketListings.find(
 (item) =>
 item.assetType === "property" &&
 item.sourceId === `purchased-${purchasedMatch.id}`
 );

 const isSavedDesign = savedDesigns.some((item) => item.id === selectedHouse.id);

 let sourceType: "built" | "purchased" | "saved" | "unknown" = "unknown";
 if (builtBinding) sourceType = "built";
 else if (purchasedMatch) sourceType = "purchased";
 else if (isSavedDesign) sourceType = "saved";

 const plotLabel = builtBinding
 ? language === "zh"
 ? `地块 ${builtBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(builtBinding.lotId.replace("lot-", ""), 10)
 )}`
 : `Plot ${builtBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(builtBinding.lotId.replace("lot-", ""), 10)
 )}`
 : purchasedMatch?.plotId && purchasedMatch?.lotId
 ? language === "zh"
 ? `地块 ${purchasedMatch.plotId.replace("plot-", "")}-${String(
 Number.parseInt(
 normalizeLotId(purchasedMatch.lotId).replace("lot-", ""),
 10
 )
 )}`
 : `Plot ${purchasedMatch.plotId.replace("plot-", "")}-${String(
 Number.parseInt(
 normalizeLotId(purchasedMatch.lotId).replace("lot-", ""),
 10
 )
 )}`
 : selectedHouse.plotZh || selectedHouse.plotEn || "-";

 const listing = builtListing || purchasedListing || null;

 const statusText = listing
 ? language === "zh"
 ? "已挂牌"
 : "Listed"
 : sourceType === "built"
 ? language === "zh"
 ? "已建成"
 : "Built"
 : sourceType === "purchased"
 ? language === "zh"
 ? "已购入"
 : "Purchased"
 : sourceType === "saved"
 ? language === "zh"
 ? "收藏设计"
 : "Saved Design"
 : language === "zh"
 ? "未分类"
 : "Unclassified";

 const timeText = builtBinding?.boundAt
 ? formatDateTime(builtBinding.boundAt, language)
 : purchasedMatch?.purchasedAt
 ? formatDateTime(purchasedMatch.purchasedAt, language)
 : "-";

 return {
 sourceType,
 plotLabel,
 statusText,
 timeText,
 listedPriceDb: listing?.priceDb || 0,
 };
 }, [
 selectedHouse,
 houseLotBindings,
 purchasedProperties,
 marketListings,
 savedDesigns,
 language,
 ]);

 const handleOpenDetail = (house: HouseItem) => {
 setSelectedHouse(house);
 setIsDetailOpen(true);
 };

 const handleCloseDetail = () => {
 setSelectedHouse(null);
 setIsDetailOpen(false);
 };

 const handleOpenMarketListingDetail = (listing: MarketListing) => {
 if (listing.assetType === "land") {
 const lotRef = parseLotRefFromSourceId(listing.sourceId);
 if (lotRef?.plotId) {
 router.push(`/world/${lotRef.plotId}`);
 return;
 }

 const fallback = buildFallbackHouseItemFromMarketListing(listing, language);
 setSelectedHouse(fallback);
 setIsDetailOpen(true);
 return;
 }

 if (listing.sourceId.startsWith("built-")) {
 const houseId = Number(listing.sourceId.replace("built-", ""));
 const matchedBuilt = builtHouses.find((item) => item.id === houseId);
 if (matchedBuilt) {
 setSelectedHouse(matchedBuilt);
 setIsDetailOpen(true);
 return;
 }
 }

 if (listing.sourceId.startsWith("purchased-")) {
 const propertyId = Number(listing.sourceId.replace("purchased-", ""));
 const matchedPurchased = purchasedProperties.find(
 (item) => item.id === propertyId
 );
 if (matchedPurchased) {
 setSelectedHouse(convertPurchasedPropertyToHouseItem(matchedPurchased));
 setIsDetailOpen(true);
 return;
 }
 }

 const listingWithSnapshot = listing as MarketListing & {
 houseSnapshot?: HouseItem;
 };
 if (listingWithSnapshot.houseSnapshot) {
 setSelectedHouse(listingWithSnapshot.houseSnapshot);
 setIsDetailOpen(true);
 return;
 }

 const fallback = buildFallbackHouseItemFromMarketListing(listing, language);
 setSelectedHouse(fallback);
 setIsDetailOpen(true);
 };

 const handleOpenTradeRecordDetail = (record: MarketTradeRecord) => {
 const tradeRecord = record as MarketTradeRecordWithSnapshot;

 if (record.assetType === "land") {
 const lotRef = parseLotRefFromSourceId(record.sourceId);
 if (lotRef?.plotId) {
 router.push(`/world/${lotRef.plotId}`);
 return;
 }

 const fallback = buildFallbackHouseItemFromTradeRecord(record, language);
 setSelectedHouse(fallback);
 setIsDetailOpen(true);
 return;
 }

 if (record.sourceId.startsWith("built-")) {
 const houseId = Number(record.sourceId.replace("built-", ""));
 const matchedBuilt = builtHouses.find((item) => item.id === houseId);
 if (matchedBuilt) {
 setSelectedHouse(matchedBuilt);
 setIsDetailOpen(true);
 return;
 }
 }

 if (record.sourceId.startsWith("purchased-")) {
 const propertyId = Number(record.sourceId.replace("purchased-", ""));
 const matchedPurchased = purchasedProperties.find(
 (item) => item.id === propertyId
 );
 if (matchedPurchased) {
 setSelectedHouse(convertPurchasedPropertyToHouseItem(matchedPurchased));
 setIsDetailOpen(true);
 return;
 }
 }

 if (tradeRecord.houseSnapshot) {
 setSelectedHouse(tradeRecord.houseSnapshot);
 setIsDetailOpen(true);
 return;
 }

 const fallback = buildFallbackHouseItemFromTradeRecord(record, language);
 setSelectedHouse(fallback);
 setIsDetailOpen(true);
 };

 const handleToggleBuiltSave = (id: number) => {
 let nextBuilt: HouseItem[] = [];

 setBuiltHouses((prev) => {
 nextBuilt = prev.map((house) => {
 if (house.id !== id) return house;

 const nextSaved = !house.saved;
 return {
 ...house,
 saved: nextSaved,
 saves: nextSaved ? house.saves + 1 : Math.max(0, house.saves - 1),
 };
 });

 return nextBuilt;
 });

 if (selectedHouse && selectedHouse.id === id) {
 const updated = nextBuilt.find((item) => item.id === id) || null;
 setSelectedHouse(updated);
 }

 saveStorePatch({
 gallery: nextBuilt as ReturnType<typeof loadAssetStore>["gallery"],
 });
 };

 const handleRemoveSavedDesign = (id: number) => {
 const nextSavedDesigns = savedDesigns.filter((item) => item.id !== id);
 setSavedDesigns(nextSavedDesigns);
 saveStorePatch({ savedDesigns: nextSavedDesigns });

 if (selectedHouse && selectedHouse.id === id) {
 setSelectedHouse(null);
 setIsDetailOpen(false);
 }

 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "取消收藏设计",
 titleEn: "Remove Saved Design",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 };

 const handleBuildFromSaved = (id: number) => {
 const target = savedDesigns.find((item) => item.id === id);
 if (!target) return;

 try {
 localStorage.setItem(
 LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY,
 JSON.stringify(target.design)
 );

 emitAssetStoreSync();
 router.push("/?focus=quick-create");
 } catch (error) {
 console.error("handleBuildFromSaved error:", error);
 }
 };

 const handleAssetAction = (
 action: "deposit" | "withdraw" | "wealth",
 amountDb: number
 ) => {
 const now = new Date().toISOString();

 if (action === "deposit") {
 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: assetOverview.availableBalanceDb + amountDb,
 dailyChangePercent: assetOverview.dailyChangePercent + 0.08,
 };
 setAssetOverview(nextOverview);

 const nextRecords: AssetRecord[] = [
 createAssetRecord({
 id: Date.now(),
 type: "deposit",
 titleZh: "充值到账",
 titleEn: "Deposit Received",
 amountDb,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: now,
 }),
 ...assetRecords,
 ].slice(0, 100);
 setAssetRecords(nextRecords);

 saveStorePatch({
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 return;
 }

 if (action === "withdraw") {
 const actualAmount = Math.min(amountDb, assetOverview.availableBalanceDb);
 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: Math.max(
 0,
 assetOverview.availableBalanceDb - actualAmount
 ),
 lockedBalanceDb: assetOverview.lockedBalanceDb + actualAmount,
 };
 setAssetOverview(nextOverview);

 const nextRecords: AssetRecord[] = [
 createAssetRecord({
 id: Date.now(),
 type: "withdraw",
 titleZh: "发起提现",
 titleEn: "Withdrawal Requested",
 amountDb: -actualAmount,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "pending",
 createdAt: now,
 }),
 ...assetRecords,
 ].slice(0, 100);
 setAssetRecords(nextRecords);

 saveStorePatch({
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 return;
 }

 const actualAmount = Math.min(amountDb, assetOverview.availableBalanceDb);
 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: Math.max(
 0,
 assetOverview.availableBalanceDb - actualAmount
 ),
 wealthBalanceDb: assetOverview.wealthBalanceDb + actualAmount,
 };
 setAssetOverview(nextOverview);

 const nextRecords: AssetRecord[] = [
 createAssetRecord({
 id: Date.now(),
 type: "wealth_in",
 titleZh: "转入理财",
 titleEn: "Transfer to Wealth",
 amountDb: -actualAmount,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: now,
 }),
 ...assetRecords,
 ].slice(0, 100);
 setAssetRecords(nextRecords);

 saveStorePatch({
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 };

 const openLandListingDialog = (item: MyLandItem) => {
 const lotRef = parseLotRefFromSourceId(item.id);
 const store = loadAssetStore();
 const hasBoundHouse = !!getBindingByLotRef(store.bindings, lotRef);

 if (hasBoundHouse) {
 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `禁止裸土地挂牌 ${item.fullCode}`,
 titleEn: `Blocked Bare Land Listing ${item.fullCode}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "failed",
 createdAt: new Date().toISOString(),
 })
 );
 return;
 }

 setPendingListing({ assetType: "land", item });
 setListingPriceInput(String(item.estimatedValueDb));
 };

 const openPropertyListingDialog = (item: MyPropertyItem) => {
 setPendingListing({ assetType: "property", item });
 setListingPriceInput(String(item.estimatedValueDb));
 };

 const closeListingDialog = () => {
 setPendingListing(null);
 setListingPriceInput("");
 };

 const confirmListing = () => {
 if (!pendingListing) return;

 const priceDb = Math.max(1, Math.round(Number(listingPriceInput || 0)));
 if (!Number.isFinite(priceDb) || priceDb <= 0) return;

 const listedAt = new Date().toISOString();
 let nextMarketListings: MarketListing[] = [...marketListings];

 if (pendingListing.assetType === "land") {
 const item = pendingListing.item;
 const lotRef = parseLotRefFromSourceId(item.id);
 const store = loadAssetStore();
 const hasBoundHouse = !!getBindingByLotRef(store.bindings, lotRef);

 if (hasBoundHouse) {
 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `禁止已建地块按土地挂牌 ${item.fullCode}`,
 titleEn: `Built Lot Cannot Be Listed As Land ${item.fullCode}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "failed",
 createdAt: listedAt,
 })
 );
 closeListingDialog();
 return;
 }

 nextMarketListings = [
 {
 id: `land-${item.id}-${Date.now()}`,
 assetType: "land",
 sourceId: item.id,
 title: `Plot ${item.fullCode}`,
 image: item.houseImage || item.mapImage,
 priceDb,
 listedAt,
 status: "active",
 },
 ...marketListings.filter(
 (entry) => !(entry.assetType === "land" && entry.sourceId === item.id)
 ),
 ];

 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `土地挂牌出售 ${item.fullCode}`,
 titleEn: `Land Listed ${item.fullCode}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: listedAt,
 })
 );
 } else {
 const item = pendingListing.item;

 nextMarketListings = marketListings.filter(
 (entry) => !(entry.assetType === "property" && entry.sourceId === item.id)
 );

 if (item.fullCode) {
 const lotTitle = `Plot ${item.fullCode}`;
 nextMarketListings = nextMarketListings.filter(
 (entry) => !(entry.assetType === "land" && entry.title === lotTitle)
 );
 }

 nextMarketListings = [
 {
 id: `property-${item.id}-${Date.now()}`,
 assetType: "property",
 sourceId: item.id,
 title: item.house.title,
 image: item.house.image,
 priceDb,
 listedAt,
 status: "active",
 },
 ...nextMarketListings,
 ];

 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `房产挂牌出售 ${item.house.title}`,
 titleEn: `Property Listed ${item.house.title}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: listedAt,
 })
 );
 }

 setMarketListings(nextMarketListings);
 saveStorePatch({ marketListings: nextMarketListings });
 closeListingDialog();
 };

 const handleCancelLandListing = (item: MyLandItem) => {
 const now = new Date().toISOString();
 const nextMarketListings: MarketListing[] = marketListings.filter(
 (entry) => !(entry.assetType === "land" && entry.sourceId === item.id)
 );
 setMarketListings(nextMarketListings);
 saveStorePatch({ marketListings: nextMarketListings });

 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `取消土地挂牌 ${item.fullCode}`,
 titleEn: `Land Listing Cancelled ${item.fullCode}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: now,
 })
 );
 };

 const handleCancelPropertyListing = (item: MyPropertyItem) => {
 const now = new Date().toISOString();
 const nextMarketListings: MarketListing[] = marketListings.filter(
 (entry) => !(entry.assetType === "property" && entry.sourceId === item.id)
 );
 setMarketListings(nextMarketListings);
 saveStorePatch({ marketListings: nextMarketListings });

 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `取消房产挂牌 ${item.house.title}`,
 titleEn: `Property Listing Cancelled ${item.house.title}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: now,
 })
 );
 };

 const handleSimulatePurchase = (listing: MarketListing) => {
 const tradedAt = new Date().toISOString();
 const store = loadAssetStore();

 let nextOwnedLots = store.lands;
 let nextBindings = store.bindings;
 let nextPurchased = store.purchasedProperties;
 let nextBuiltHouses = builtHouses;
 const soldTitle = listing.title;
 let blocked = false;

 let houseSnapshot: HouseItem | undefined;

 let nextOverview: AssetOverview = store.assetOverview;

 if (listing.assetType === "land") {
 const lotRef = parseLotRefFromSourceId(listing.sourceId);
 const binding = getBindingByLotRef(store.bindings, lotRef);

 if (binding) {
 pushAssetRecord(
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `禁止已建地块按土地成交 ${listing.title}`,
 titleEn: `Built Lot Cannot Be Sold As Land ${listing.title}`,
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "failed",
 createdAt: tradedAt,
 })
 );

 const filteredListings: MarketListing[] = marketListings.filter(
 (item) => item.id !== listing.id
 );
 setMarketListings(filteredListings);
 saveStorePatch({ marketListings: filteredListings });
 setAssetRefreshKey((prev) => prev + 1);
 return;
 }

 nextOwnedLots = removeLotOwnershipByRef(store.lands, lotRef);

 nextOverview = {
 ...store.assetOverview,
 availableBalanceDb: store.assetOverview.availableBalanceDb + listing.priceDb,
 landValueDb: Math.max(0, store.assetOverview.landValueDb - listing.priceDb),
 };
 }

 if (listing.assetType === "property") {
 if (listing.sourceId.startsWith("built-")) {
 const houseId = Number(listing.sourceId.replace("built-", ""));
 const targetBuiltHouse =
 builtHouses.find((house) => house.id === houseId) || null;

 if (targetBuiltHouse) {
 houseSnapshot = targetBuiltHouse;
 }

 const binding = getBindingByHouseId(store.bindings, houseId);
 const lotRef = binding
 ? { plotId: binding.plotId, lotId: normalizeLotId(binding.lotId) }
 : null;

 nextBuiltHouses = builtHouses.filter((house) => house.id !== houseId);
 nextBindings = store.bindings.filter((item) => item.houseId !== houseId);
 nextOwnedLots = removeLotOwnershipByRef(store.lands, lotRef);

 if (selectedHouse?.id === houseId) {
 setSelectedHouse(null);
 setIsDetailOpen(false);
 }

 nextOverview = {
 ...store.assetOverview,
 availableBalanceDb: store.assetOverview.availableBalanceDb + listing.priceDb,
 houseValueDb: Math.max(0, store.assetOverview.houseValueDb - listing.priceDb),
 landValueDb: lotRef
 ? Math.max(
 0,
 store.assetOverview.landValueDb -
 Math.min(store.assetOverview.landValueDb, listing.priceDb)
 )
 : store.assetOverview.landValueDb,
 };
 } else if (listing.sourceId.startsWith("purchased-")) {
 const propertyId = Number(listing.sourceId.replace("purchased-", ""));
 const targetPurchased =
 store.purchasedProperties.find((item) => item.id === propertyId) || null;

 if (targetPurchased) {
 houseSnapshot = convertPurchasedPropertyToHouseItem(targetPurchased);
 }

 const lotRef = getPurchasedPropertyLotRef(targetPurchased);

 nextPurchased = store.purchasedProperties.filter(
 (item) => item.id !== propertyId
 );
 nextOwnedLots = removeLotOwnershipByRef(store.lands, lotRef);
 nextBindings = removeBindingByRef(store.bindings, lotRef);

 nextOverview = {
 ...store.assetOverview,
 availableBalanceDb: store.assetOverview.availableBalanceDb + listing.priceDb,
 houseValueDb: Math.max(0, store.assetOverview.houseValueDb - listing.priceDb),
 landValueDb: lotRef
 ? Math.max(
 0,
 store.assetOverview.landValueDb -
 Math.min(store.assetOverview.landValueDb, listing.priceDb)
 )
 : store.assetOverview.landValueDb,
 };
 } else {
 blocked = true;
 }
 }

 if (blocked) return;

 const nextMarketListings: MarketListing[] = marketListings.filter((item) => {
 if (item.id === listing.id) return false;

 if (listing.assetType === "property") {
 if (item.assetType === "property" && item.sourceId === listing.sourceId) {
 return false;
 }

 if (
 item.assetType === "land" &&
 item.title &&
 listing.title &&
 item.title === listing.title
 ) {
 return false;
 }
 }

 return true;
 });

 const newTradeRecord = {
 id: `trade-${listing.id}-${Date.now()}`,
 assetType: listing.assetType,
 sourceId: listing.sourceId,
 title: soldTitle,
 image: listing.image,
 priceDb: listing.priceDb,
 tradedAt,
 tradeType: "sold",
 status: "completed",
 houseSnapshot,
 } as MarketTradeRecordWithSnapshot;

 const nextMarketTradeRecords: MarketTradeRecord[] = [
 newTradeRecord as MarketTradeRecord,
 ...marketTradeRecords,
 ];

 const nextRecords: AssetRecord[] = [
 createAssetRecord({
 id: Date.now(),
 type: "reward",
 titleZh: `资产成交 ${soldTitle}`,
 titleEn: `Asset Sold ${soldTitle}`,
 amountDb: listing.priceDb,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: tradedAt,
 }),
 ...assetRecords,
 ].slice(0, 100);

 setBuiltHouses(nextBuiltHouses);
 setHouseLotBindings(nextBindings);
 setPurchasedProperties(nextPurchased);
 setMarketListings(nextMarketListings);
 setMarketTradeRecords(nextMarketTradeRecords);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 saveStorePatch({
 gallery: nextBuiltHouses as ReturnType<typeof loadAssetStore>["gallery"],
 marketListings: nextMarketListings,
 marketTrades: nextMarketTradeRecords,
 lands: nextOwnedLots,
 bindings: nextBindings,
 purchasedProperties: nextPurchased,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });

 setAssetRefreshKey((prev) => prev + 1);
 };

 const handleDemolishProperty = (item: MyPropertyItem) => {
 const lotLabel = item.fullCode
 ? language === "zh"
 ? `地块 ${item.fullCode}`
 : `Plot ${item.fullCode}`
 : language === "zh"
 ? "待释放地块"
 : "Lot to Release";

 setDemolishModalState({
 open: true,
 stage: "confirm",
 property: item,
 lotLabel,
 });
 };

 const handleConfirmDemolish = () => {
 const item = demolishModalState.property;
 if (!item) return;

 try {
 const store = loadAssetStore();
 const nowIso = new Date().toISOString();

 const nextMarketListings: MarketListing[] = store.marketListings.filter(
 (listing) =>
 !(listing.assetType === "property" && listing.sourceId === item.id)
 ) as MarketListing[];

 let nextBuiltHouses = builtHouses;
 let nextBindings = store.bindings;
 let nextPurchased = store.purchasedProperties;

 let releasedLotLabel = item.fullCode
 ? language === "zh"
 ? `地块 ${item.fullCode}`
 : `Plot ${item.fullCode}`
 : language === "zh"
 ? "已释放地块"
 : "Released Lot";

 if (item.sourceType === "built") {
 const houseId = Number(item.id.replace("built-", ""));
 nextBuiltHouses = builtHouses.filter((house) => house.id !== houseId);

 const targetBinding = store.bindings.find((binding) => binding.houseId === houseId);
 nextBindings = store.bindings.filter((binding) => binding.houseId !== houseId);

 if (!item.fullCode && targetBinding) {
 releasedLotLabel =
 language === "zh"
 ? `地块 ${targetBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(targetBinding.lotId.replace("lot-", ""), 10)
 )}`
 : `Plot ${targetBinding.plotId.replace("plot-", "")}-${String(
 Number.parseInt(targetBinding.lotId.replace("lot-", ""), 10)
 )}`;
 }

 if (selectedHouse?.id === houseId) {
 setSelectedHouse(null);
 setIsDetailOpen(false);
 }
 } else if (item.sourceType === "purchased") {
 const propertyId = Number(item.id.replace("purchased-", ""));
 nextPurchased = store.purchasedProperties.filter(
 (entry) => entry.id !== propertyId
 );
 nextBindings = store.bindings.filter(
 (binding) =>
 !(
 binding.plotId === item.plotId &&
 normalizeLotId(binding.lotId) === normalizeLotId(item.lotId)
 )
 );
 }

 const nextOverview: AssetOverview = {
 ...store.assetOverview,
 houseValueDb: Math.max(
 0,
 store.assetOverview.houseValueDb - item.estimatedValueDb
 ),
 };

 const nextRecords: AssetRecord[] = [
 createAssetRecord({
 id: Date.now(),
 type: "build_house",
 titleZh: `拆除房屋 ${item.house.title}`,
 titleEn: `Demolish House ${item.house.title}`,
 amountDb: 0,
 balanceAfterDb: nextOverview.availableBalanceDb,
 status: "success",
 createdAt: nowIso,
 }),
 ...store.assetRecords,
 ].slice(0, 100);

 setBuiltHouses(nextBuiltHouses);
 setHouseLotBindings(nextBindings);
 setPurchasedProperties(nextPurchased);
 setMarketListings(nextMarketListings);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 saveStorePatch({
 gallery: nextBuiltHouses as ReturnType<typeof loadAssetStore>["gallery"],
 marketListings: nextMarketListings,
 bindings: nextBindings,
 purchasedProperties: nextPurchased,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });

 setDemolishModalState({
 open: true,
 stage: "success",
 property: item,
 lotLabel: releasedLotLabel,
 });

 setAssetRefreshKey((prev) => prev + 1);
 } catch (error) {
 console.error("handleConfirmDemolish error:", error);
 alert(
 language === "zh"
 ? "拆除失败，请稍后重试。"
 : "Demolition failed. Please try again."
 );
 resetDemolishModalState();
 }
 };

 const handleToggleLike = (id: number) => {
 let nextBuilt: HouseItem[] = [];

 setBuiltHouses((prev) => {
 nextBuilt = prev.map((house) => {
 if (house.id !== id) return house;
 const nextLiked = !house.liked;
 return {
 ...house,
 liked: nextLiked,
 likes: nextLiked ? house.likes + 1 : Math.max(0, house.likes - 1),
 };
 });
 return nextBuilt;
 });

 if (selectedHouse?.id === id) {
 const updatedSelected = nextBuilt.find((house) => house.id === id) || null;
 setSelectedHouse(updatedSelected);
 }

 saveStorePatch({
 gallery: nextBuilt as ReturnType<typeof loadAssetStore>["gallery"],
 });
 };

 const handleToggleSaveFromModal = (id: number) => {
 const builtExists = builtHouses.some((house) => house.id === id);

 if (builtExists) {
 handleToggleBuiltSave(id);
 return;
 }

 const exists = savedDesigns.some((item) => item.id === id);
 if (!exists) return;

 const target = savedDesigns.find((item) => item.id === id) || null;
 const nextSavedDesigns = savedDesigns.filter((item) => item.id !== id);
 setSavedDesigns(nextSavedDesigns);
 saveStorePatch({ savedDesigns: nextSavedDesigns });

 if (selectedHouse?.id === id) {
 if (target) {
 setSelectedHouse({
 ...convertSavedDesignToHouseItem(target),
 saved: false,
 saves: 0,
 });
 } else {
 setSelectedHouse(null);
 }
 }
 };

 const latestAction = useMemo(
 () => getLatestActionMeta(language, assetRecords[0]),
 [language, assetRecords]
 );

 const text = language === "zh" ? TEXT.zh : TEXT.en;

 const headerExtras = (
 <div className="flex flex-wrap items-center gap-3">
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
 className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {text.backHome}
 </button>
 </div>
 );

 if (!hydrated || !hasLoaded) {
 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8" />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
 <div className="mb-6 rounded-[26px] border border-neutral-200 bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-4 text-white shadow-[0_14px_32px_rgba(0,0,0,0.14)] md:px-6">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div className="flex items-start gap-3">
 <div
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-xl backdrop-blur"
 suppressHydrationWarning
 >
 {hydrated ? latestAction.icon : "📌"}
 </div>

 <div>
 <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
 {language === "zh" ? "最近操作" : "Recent Activity"}
 </div>
 <div
 className="mt-1 text-base font-semibold text-white"
 suppressHydrationWarning
 >
 {hydrated ? latestAction.title : ""}
 </div>
 <div
 className="mt-1 text-sm text-white/75"
 suppressHydrationWarning
 >
 {hydrated ? latestAction.content : ""}
 </div>
 </div>
 </div>

 <div
 className="shrink-0 text-sm text-white/70"
 suppressHydrationWarning
 >
 {hydrated ? latestAction.timeText : ""}
 </div>
 </div>
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
 <MyProfilePanel
 language={language}
 t={{ view: text.view }}
 ui={UI}
 islandOwnerRank={islandOwnerRank}
 builtHouses={builtHouses}
 savedDesigns={savedDesigns}
 assetOverview={assetOverview}
 assetRecords={assetRecords}
 selectedCurrency={selectedCurrency}
 setSelectedCurrency={setSelectedCurrency}
 marketRates={marketRates}
 marketUpdatedAt={marketUpdatedAt}
 formatSelectedCurrency={formatSelectedCurrency}
 marketListings={marketListings}
 marketTradeRecords={marketTradeRecords}
 refreshKey={assetRefreshKey}
 onOpenDetail={handleOpenDetail}
 onToggleBuiltSave={handleToggleBuiltSave}
 onRemoveSavedDesign={handleRemoveSavedDesign}
 onBuildFromSaved={handleBuildFromSaved}
 onAssetAction={handleAssetAction}
 onRequestListLandForSale={openLandListingDialog}
 onCancelLandListing={handleCancelLandListing}
 onRequestListPropertyForSale={openPropertyListingDialog}
 onCancelPropertyListing={handleCancelPropertyListing}
 onDemolishProperty={handleDemolishProperty}
 onSimulatePurchase={handleSimulatePurchase}
 onOpenMarketListingDetail={handleOpenMarketListingDetail}
 onOpenTradeRecordDetail={handleOpenTradeRecordDetail}
 headerExtras={headerExtras}
 />
 </div>

 <ImmersiveHouseDetailModal
 open={isDetailOpen}
 house={selectedHouse}
 language={language}
 meta={selectedHouseMeta ?? undefined}
 onClose={handleCloseDetail}
 onLike={handleToggleLike}
 onSave={handleToggleSaveFromModal}
 />

 <DemolishPropertyModal
 open={demolishModalState.open}
 language={language}
 stage={demolishModalState.stage}
 houseTitle={demolishModalState.property?.house.title || ""}
 houseImage={demolishModalState.property?.house.image || ""}
 lotLabel={demolishModalState.lotLabel}
 onClose={resetDemolishModalState}
 onConfirmDemolish={handleConfirmDemolish}
 onGoMyLands={() => {
 resetDemolishModalState();
 window.scrollTo({ top: 0, behavior: "smooth" });
 }}
 />

 {pendingListing ? (
 <div
 className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={closeListingDialog}
 >
 <div
 className="w-full max-w-[560px] rounded-[28px] border border-neutral-200 bg-white p-6 shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="text-sm font-medium text-neutral-500">
 {language === "zh" ? "挂牌定价" : "Set Listing Price"}
 </div>
 <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
 {pendingListing.assetType === "land"
 ? language === "zh"
 ? "土地挂牌"
 : "List Land"
 : language === "zh"
 ? "房产挂牌"
 : "List Property"}
 </h3>
 </div>

 <button
 onClick={closeListingDialog}
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
 {pendingListing.assetType === "land"
 ? `Plot ${pendingListing.item.fullCode}`
 : pendingListing.item.house.title}
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <div className="rounded-2xl bg-white px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "系统估值" : "Estimated Value"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {formatSelectedCurrency(
 pendingListing.item.estimatedValueDb
 )}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "DB 估值" : "DB Value"}
 </div>
 <div className="mt-1 font-semibold text-neutral-900">
 {pendingListing.item.estimatedValueDb.toLocaleString(
 "en-US"
 )}{" "}
 DB
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6">
 <label className="block text-sm font-semibold text-neutral-900">
 {language === "zh"
 ? "输入挂牌价格（DB）"
 : "Enter Listing Price (DB)"}
 </label>
 <input
 type="number"
 min="1"
 step="1"
 value={listingPriceInput}
 onChange={(e) => setListingPriceInput(e.target.value)}
 className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-medium text-neutral-900 outline-none transition focus:border-neutral-400"
 placeholder={
 language === "zh" ? "请输入挂牌价格" : "Enter listing price"
 }
 />
 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? "建议参考系统估值定价，你也可以手动提高或降低。"
 : "You can use the estimated value as reference, or set your own price."}
 </div>
 </div>

 <div className="mt-6 flex flex-wrap justify-end gap-3">
 <button
 onClick={closeListingDialog}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "取消" : "Cancel"}
 </button>

 <button
 onClick={confirmListing}
 className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "确认挂牌" : "Confirm Listing"}
 </button>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 </div>
 );
}