"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseItem } from "./DetailModal";
import {
 loadAssetStore,
 subscribeAssetStore,
 type AssetOverview,
 type AssetRecord,
 type CurrencyType,
 type HouseLotBinding,
 type Language,
 type MarketListing as StoreMarketListing,
 type MarketTradeRecord as StoreMarketTradeRecord,
 type OwnedLot,
 type PurchasedProperty,
 type SavedDesign,
} from "@/app/lib/dbAssetStore";

type MarketRates = {
 USD: number;
 CNY: number;
 USDT: number;
 BTC: number;
};

type MyProfileText = {
 view: string;
};

type UiSet = {
 btnSmallIdle: string;
 btnSmallActive: string;
};

type LotStatusType = "owned_unbuilt" | "building" | "built";
type TerrainType = "forest" | "city" | "cliff" | "plain" | "suburb";
type PropertyFilterType = "all" | "built" | "purchased";
type LandTerrainFilterType = "all" | TerrainType;
type MarketFilterType = "all" | "land" | "property";
type TradeFilterType = "all" | "land" | "property";

type PurchasedPropertyPreview = PurchasedProperty &
 Partial<{
 styleZh: string;
 styleEn: string;
 area: string;
 roomsZh: string;
 roomsEn: string;
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
 purchasePriceDb: number;
 }>;

export type MyLandItem = {
 id: string;
 plotId: string;
 lotId: string;
 plotCode: string;
 lotCode: string;
 fullCode: string;
 acquiredAt: number;
 terrainType: TerrainType;
 terrainZh: string;
 terrainEn: string;
 mapImage: string;
 status: LotStatusType;
 houseTitle?: string;
 houseImage?: string;
 purchasePriceDb: number;
 estimatedValueDb: number;
 profitDb: number;
};

export type MyPropertyItem = {
 id: string;
 sourceType: "built" | "purchased";
 house: HouseItem;
 acquiredAt: number;
 costDb: number;
 estimatedValueDb: number;
 profitDb: number;
 plotId: string;
 lotId: string;
 lotCode: string;
 fullCode: string;
};

export type MarketListing = StoreMarketListing;
export type MarketTradeRecord = StoreMarketTradeRecord;

type MarketListingWithPreview = MarketListing &
 Partial<{
 houseSnapshot: HouseItem;
 }>;

type MarketTradeRecordWithPreview = MarketTradeRecord &
 Partial<{
 houseSnapshot: HouseItem;
 }>;

type MyProfilePanelProps = {
 language: Language;
 t: MyProfileText;
 ui: UiSet;
 islandOwnerRank: number;
 builtHouses: HouseItem[];
 savedDesigns: SavedDesign[];
 assetOverview: AssetOverview;
 assetRecords: AssetRecord[];
 selectedCurrency: CurrencyType;
 setSelectedCurrency: (value: CurrencyType) => void;
 marketRates: MarketRates;
 marketUpdatedAt: string;
 formatSelectedCurrency: (dbAmount: number) => string;
 marketListings: MarketListing[];
 marketTradeRecords: MarketTradeRecord[];
 refreshKey?: number;
 onOpenDetail: (house: HouseItem) => void;
 onOpenMarketListingDetail?: (listing: MarketListing) => void;
 onOpenTradeRecordDetail?: (record: MarketTradeRecord) => void;
 onToggleBuiltSave: (id: number) => void;
 onRemoveSavedDesign: (id: number) => void;
 onBuildFromSaved: (id: number) => void;
 onAssetAction: (
 action: "deposit" | "withdraw" | "wealth",
 amountDb: number
 ) => void;
 onRequestListLandForSale: (item: MyLandItem) => void;
 onCancelLandListing: (item: MyLandItem) => void;
 onRequestListPropertyForSale: (item: MyPropertyItem) => void;
 onCancelPropertyListing: (item: MyPropertyItem) => void;
 onDemolishProperty: (item: MyPropertyItem) => void;
 onSimulatePurchase: (listing: MarketListing) => void;
 headerExtras?: React.ReactNode;
};

type AssetCardItem = {
 key: "available" | "wealth" | "locked" | "land" | "house";
 titleZh: string;
 titleEn: string;
 valueDb: number;
 descZh: string;
 descEn: string;
 icon: string;
};

type GalleryHouse = HouseItem;

function normalizeLotId(lotId?: string | null) {
 if (!lotId) return "";
 const num = Number.parseInt(String(lotId).replace("lot-", ""), 10);
 return Number.isNaN(num) ? String(lotId) : `lot-${num}`;
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

function formatDbAmount(amount: number) {
 const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
 return `${sign}${Math.abs(amount).toLocaleString("en-US")} DB`;
}

function formatDateTime(iso: string | number, language: Language) {
 const date = new Date(iso);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

function getAssetActionLabel(
 key: AssetCardItem["key"],
 language: Language
): string {
 if (key === "available") {
 return language === "zh" ? "可用余额详情" : "Available Balance Detail";
 }
 if (key === "wealth") {
 return language === "zh" ? "理财资产详情" : "Wealth Detail";
 }
 if (key === "locked") {
 return language === "zh" ? "锁定资产详情" : "Locked Asset Detail";
 }
 if (key === "land") {
 return language === "zh" ? "土地资产详情" : "Land Asset Detail";
 }
 return language === "zh" ? "房产资产详情" : "House Asset Detail";
}

function getCurrencyBadgeLabel(currency: CurrencyType) {
 if (currency === "CNY") return "人民币";
 if (currency === "USD") return "USD";
 if (currency === "USDT") return "USDT";
 return "BTC";
}

function getTerrainMetaByPlotId(plotId: string) {
 const code = plotId.replace("plot-", "");
 const codeNum = Number.parseInt(code, 10) || 1;
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
 mapImage: "/maps/plots/plot-2.png",
 basePriceDb: 182000,
 };
 }

 if (terrainType === "city") {
 return {
 terrainType,
 terrainZh: "城市地块",
 terrainEn: "City Plot",
 mapImage: "/maps/plots/plot-3.png",
 basePriceDb: 198000,
 };
 }

 if (terrainType === "cliff") {
 return {
 terrainType,
 terrainZh: "海边悬崖",
 terrainEn: "Seaside Cliff",
 mapImage: "/maps/plots/plot-1.png",
 basePriceDb: 268000,
 };
 }

 if (terrainType === "suburb") {
 return {
 terrainType,
 terrainZh: "城镇郊区",
 terrainEn: "Town Suburb",
 mapImage: "/maps/plots/plot-5.png",
 basePriceDb: 156000,
 };
 }

 return {
 terrainType,
 terrainZh: "内陆平原",
 terrainEn: "Inland Plain",
 mapImage: "/maps/plots/plot-4.png",
 basePriceDb: 138000,
 };
}

function getLotStatusMeta(
 status: LotStatusType,
 language: Language
): {
 label: string;
 shortLabel: string;
 badgeClass: string;
} {
 if (status === "owned_unbuilt") {
 return {
 label: language === "zh" ? "已购买 · 待建造" : "Owned · Awaiting Build",
 shortLabel: language === "zh" ? "待建造" : "Awaiting Build",
 badgeClass: "bg-amber-50/95 text-amber-700",
 };
 }

 if (status === "building") {
 return {
 label: language === "zh" ? "建造中" : "Building",
 shortLabel: language === "zh" ? "建造中" : "Building",
 badgeClass: "bg-blue-50/95 text-blue-700",
 };
 }

 return {
 label: language === "zh" ? "已建成 · 已绑定房屋" : "Built · House Bound",
 shortLabel: language === "zh" ? "已建成" : "Built",
 badgeClass: "bg-emerald-50/95 text-emerald-700",
 };
}

function getTerrainFilterLabel(
 terrain: LandTerrainFilterType,
 language: Language
) {
 const zhMap: Record<LandTerrainFilterType, string> = {
 all: "全部地形",
 forest: "山林",
 city: "城市",
 cliff: "悬崖",
 plain: "平原",
 suburb: "郊野",
 };

 const enMap: Record<LandTerrainFilterType, string> = {
 all: "All Terrains",
 forest: "Forest",
 city: "City",
 cliff: "Cliff",
 plain: "Plain",
 suburb: "Suburb",
 };

 return language === "zh" ? zhMap[terrain] : enMap[terrain];
}

function getMarketFilterLabel(filter: MarketFilterType, language: Language) {
 const zhMap: Record<MarketFilterType, string> = {
 all: "全部挂牌",
 land: "土地挂牌",
 property: "房产挂牌",
 };

 const enMap: Record<MarketFilterType, string> = {
 all: "All Listings",
 land: "Land Listings",
 property: "Property Listings",
 };

 return language === "zh" ? zhMap[filter] : enMap[filter];
}

function getTradeFilterLabel(filter: TradeFilterType, language: Language) {
 const zhMap: Record<TradeFilterType, string> = {
 all: "全部成交",
 land: "土地成交",
 property: "房产成交",
 };

 const enMap: Record<TradeFilterType, string> = {
 all: "All Trades",
 land: "Land Trades",
 property: "Property Trades",
 };

 return language === "zh" ? zhMap[filter] : enMap[filter];
}

function parseAreaNumber(area?: string) {
 if (!area) return 0;
 const matched = area.match(/(\d+(\.\d+)?)/);
 return matched ? Number.parseFloat(matched[1]) : 0;
}

function getHouseBaseCostDb(house: HouseItem) {
 const areaNum = parseAreaNumber(house.area);
 const areaCost = areaNum > 0 ? areaNum * 900 : 120000;

 let styleFactor = 1;
 if (house.styleEn?.toLowerCase().includes("european")) styleFactor = 1.18;
 else if (house.styleEn?.toLowerCase().includes("chinese")) styleFactor = 1.12;
 else if (house.styleEn?.toLowerCase().includes("american")) styleFactor = 1.1;

 let typeFactor = 1;
 if (house.houseTypeEn?.toLowerCase().includes("detached")) typeFactor = 1.08;
 else if (house.houseTypeEn?.toLowerCase().includes("courtyard")) typeFactor = 1.12;
 else if (house.houseTypeEn?.toLowerCase().includes("townhouse")) typeFactor = 0.96;

 let floorFactor = 1;
 if (house.floorsEn?.includes("2")) floorFactor = 1.08;
 if (house.floorsEn?.includes("3")) floorFactor = 1.15;

 return Math.round(areaCost * styleFactor * typeFactor * floorFactor);
}

function getHoldingGrowthRate(daysHeld: number) {
 const base = 0.045;
 const timeBonus = Math.min(daysHeld / 365, 1.2) * 0.06;
 return base + timeBonus;
}

function estimateLandValueDb(
 purchasePriceDb: number,
 terrainType: TerrainType,
 acquiredAt: number,
 isBuilt: boolean
) {
 const daysHeld = Math.max(
 1,
 Math.floor((Date.now() - acquiredAt) / (1000 * 60 * 60 * 24))
 );
 const terrainPremium =
 terrainType === "cliff"
 ? 0.12
 : terrainType === "city"
 ? 0.08
 : terrainType === "forest"
 ? 0.065
 : terrainType === "suburb"
 ? 0.05
 : 0.04;

 const growthRate = getHoldingGrowthRate(daysHeld);
 const builtPremium = isBuilt ? 0.04 : 0;

 return Math.round(
 purchasePriceDb * (1 + terrainPremium + growthRate * 0.35 + builtPremium)
 );
}

function estimateHouseValueDb(
 costDb: number,
 house: HouseItem,
 acquiredAt: number,
 sourceType: "built" | "purchased"
) {
 const daysHeld = Math.max(
 1,
 Math.floor((Date.now() - acquiredAt) / (1000 * 60 * 60 * 24))
 );

 const stylePremium =
 house.styleEn?.toLowerCase().includes("european")
 ? 0.12
 : house.styleEn?.toLowerCase().includes("chinese")
 ? 0.08
 : house.styleEn?.toLowerCase().includes("american")
 ? 0.09
 : 0.07;

 const areaNum = parseAreaNumber(house.area);
 const areaPremium = areaNum >= 180 ? 0.12 : areaNum >= 140 ? 0.08 : 0.05;
 const sourcePremium = sourceType === "purchased" ? 0.03 : 0.06;
 const timeGrowth = getHoldingGrowthRate(daysHeld) * 0.45;

 return Math.round(
 costDb * (1 + stylePremium + areaPremium + sourcePremium + timeGrowth)
 );
}

function convertPurchasedPropertyToHouseItem(item: PurchasedProperty): HouseItem {
 const safeItem = item as PurchasedPropertyPreview;

 return {
 id: safeItem.id,
 title: safeItem.title,
 author: "Market",
 styleZh: safeItem.styleZh || "已购房产",
 styleEn: safeItem.styleEn || "Purchased",
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: safeItem.image,
 area: safeItem.area,
 roomsZh: safeItem.roomsZh,
 roomsEn: safeItem.roomsEn,
 floorsZh: safeItem.floorsZh,
 floorsEn: safeItem.floorsEn,
 houseTypeZh: safeItem.houseTypeZh,
 houseTypeEn: safeItem.houseTypeEn,
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
 plotZh: safeItem.plotZh,
 plotEn: safeItem.plotEn,
 };
}

function toFullLotCode(plotId?: string, lotId?: string) {
 if (!plotId || !lotId) return "";
 const plotCode = plotId.replace("plot-", "");
 const parsedLot = Number.parseInt(lotId.replace("lot-", ""), 10);
 const lotCode = Number.isNaN(parsedLot)
 ? lotId.replace("lot-", "")
 : String(parsedLot);
 return `${plotCode}-${lotCode}`;
}

function buildMyLandItems(
 ownedLots: OwnedLot[],
 bindings: HouseLotBinding[]
): MyLandItem[] {
 return ownedLots
 .map((lot): MyLandItem => {
 const binding = bindings.find(
 (item) =>
 item.plotId === lot.plotId &&
 normalizeLotId(item.lotId) === normalizeLotId(lot.lotId)
 );
 const plotCode = lot.plotId.replace("plot-", "");
 const lotCode = String(
 Number.parseInt(normalizeLotId(lot.lotId).replace("lot-", ""), 10)
 );
 const terrainMeta = getTerrainMetaByPlotId(lot.plotId);

 const fallbackPurchasePrice =
 terrainMeta.basePriceDb +
 (Number.parseInt(normalizeLotId(lot.lotId).replace("lot-", ""), 10) || 1) *
 1200;

 const purchasePriceDb = lot.purchasePriceDb || fallbackPurchasePrice;
 const estimatedValueDb = estimateLandValueDb(
 purchasePriceDb,
 terrainMeta.terrainType,
 lot.acquiredAt,
 Boolean(binding)
 );

 return {
 id: `${lot.plotId}-${normalizeLotId(lot.lotId)}`,
 plotId: lot.plotId,
 lotId: normalizeLotId(lot.lotId),
 plotCode,
 lotCode,
 fullCode: `${plotCode}-${lotCode}`,
 acquiredAt: lot.acquiredAt,
 terrainType: terrainMeta.terrainType,
 terrainZh: terrainMeta.terrainZh,
 terrainEn: terrainMeta.terrainEn,
 mapImage: terrainMeta.mapImage,
 status: binding ? "built" : "owned_unbuilt",
 houseTitle: binding?.title,
 houseImage: binding?.image,
 purchasePriceDb,
 estimatedValueDb,
 profitDb: estimatedValueDb - purchasePriceDb,
 };
 })
 .sort((a, b) => b.acquiredAt - a.acquiredAt);
}

function buildMyPropertyItems(
 galleryHouses: GalleryHouse[],
 bindings: HouseLotBinding[],
 purchasedPropertiesRaw: PurchasedProperty[]
): {
 builtProperties: MyPropertyItem[];
 purchasedProperties: MyPropertyItem[];
} {
 const builtProperties = bindings
 .map((binding) => {
 const matchedHouse = galleryHouses.find(
 (house) => house.id === binding.houseId
 );

 if (!matchedHouse) return null;

 const acquiredAt = binding.boundAt || Date.now();
 const costDb = getHouseBaseCostDb(matchedHouse);
 const estimatedValueDb = estimateHouseValueDb(
 costDb,
 matchedHouse,
 acquiredAt,
 "built"
 );

 return {
 id: `built-${matchedHouse.id}`,
 sourceType: "built" as const,
 house: matchedHouse,
 acquiredAt,
 costDb,
 estimatedValueDb,
 profitDb: estimatedValueDb - costDb,
 plotId: binding.plotId,
 lotId: normalizeLotId(binding.lotId),
 lotCode: String(
 Number.parseInt(
 normalizeLotId(binding.lotId).replace("lot-", ""),
 10
 )
 ),
 fullCode: toFullLotCode(binding.plotId, normalizeLotId(binding.lotId)),
 };
 })
 .filter(Boolean) as MyPropertyItem[];

 const purchasedProperties = purchasedPropertiesRaw
 .filter((item) => item.plotId && item.lotId)
 .map((item) => {
 const safeItem = item as PurchasedPropertyPreview;
 const house = convertPurchasedPropertyToHouseItem(safeItem);
 const acquiredAt = safeItem.purchasedAt || Date.now();
 const costDb = safeItem.purchasePriceDb || getHouseBaseCostDb(house);
 const estimatedValueDb = estimateHouseValueDb(
 costDb,
 house,
 acquiredAt,
 "purchased"
 );

 return {
 id: `purchased-${safeItem.id}`,
 sourceType: "purchased" as const,
 house,
 acquiredAt,
 costDb,
 estimatedValueDb,
 profitDb: estimatedValueDb - costDb,
 plotId: safeItem.plotId!,
 lotId: normalizeLotId(safeItem.lotId!),
 lotCode: String(
 Number.parseInt(
 normalizeLotId(safeItem.lotId!).replace("lot-", ""),
 10
 )
 ),
 fullCode: toFullLotCode(
 safeItem.plotId,
 normalizeLotId(safeItem.lotId!)
 ),
 };
 });

 return {
 builtProperties: builtProperties.sort((a, b) => b.acquiredAt - a.acquiredAt),
 purchasedProperties: purchasedProperties.sort(
 (a, b) => b.acquiredAt - a.acquiredAt
 ),
 };
}

function StatCard({
 label,
 value,
 tone = "primary",
}: {
 label: string;
 value: string | number;
 tone?: "primary" | "secondary";
}) {
 return (
 <div
 className={`rounded-[18px] border px-4 py-4 shadow-sm ${
 tone === "primary"
 ? "border-neutral-200 bg-white"
 : "border-neutral-200 bg-neutral-50/90"
 }`}
 >
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
 {label}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900 xl:text-[2rem]">
 {value}
 </div>
 </div>
 );
}

function ProfitCard({
 label,
 value,
 positive = true,
}: {
 label: string;
 value: string;
 positive?: boolean;
}) {
 return (
 <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm">
 <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
 {label}
 </div>
 <div
 className={`mt-2 text-2xl font-black tracking-tight ${
 positive ? "text-emerald-600" : "text-red-600"
 }`}
 >
 {positive ? "+" : "-"}
 {value}
 </div>
 </div>
 );
}

function AssetMiniCard({
 icon,
 title,
 value,
 description,
 onClick,
}: {
 icon: string;
 title: string;
 value: string;
 description: string;
 onClick: () => void;
}) {
 return (
 <button
 onClick={onClick}
 className="group rounded-[24px] border border-neutral-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]"
 >
 <div className="flex items-start justify-between gap-4">
 <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-neutral-900 text-xl text-white shadow-[0_10px_20px_rgba(0,0,0,0.14)]">
 {icon}
 </div>

 <div className="text-xs font-semibold text-neutral-400 transition-transform duration-300 group-hover:translate-x-1">
 →
 </div>
 </div>

 <div className="mt-4">
 <div className="text-sm font-semibold text-neutral-900">{title}</div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {value}
 </div>
 <div className="mt-2 text-xs leading-5 text-neutral-500">
 {description}
 </div>
 </div>
 </button>
 );
}

function RecordRow({
 record,
 language,
 formatSelectedCurrency,
}: {
 record: AssetRecord;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
}) {
 const isPositive = record.amountDb > 0;

 return (
 <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
 <div className="min-w-0">
 <div className="truncate text-sm font-medium text-neutral-900">
 {language === "zh" ? record.titleZh : record.titleEn}
 </div>
 <div className="mt-1 text-xs text-neutral-500">
 {formatDateTime(record.createdAt, language)}
 </div>
 </div>

 <div className="shrink-0 text-right">
 <div
 className={`text-sm font-semibold ${
 isPositive ? "text-emerald-600" : "text-red-600"
 }`}
 >
 {isPositive ? "+" : ""}
 {formatSelectedCurrency(record.amountDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {formatDbAmount(record.amountDb)}
 </div>
 </div>
 </div>
 );
}

function ValueBadge({
 value,
 positive,
}: {
 value: string;
 positive: boolean;
}) {
 return (
 <span
 className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
 positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
 }`}
 >
 {positive ? "+" : "-"}
 {value}
 </span>
 );
}

function FilterChip({
 active,
 onClick,
 children,
}: {
 active: boolean;
 onClick: () => void;
 children: React.ReactNode;
}) {
 return (
 <button
 onClick={onClick}
 className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 md:text-sm ${
 active
 ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
 : "border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 {children}
 </button>
 );
}

function LandCard({
 item,
 language,
 formatSelectedCurrency,
 onRequestListForSale,
 onCancelListing,
 isListed,
}: {
 item: MyLandItem;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
 onRequestListForSale: (item: MyLandItem) => void;
 onCancelListing: (item: MyLandItem) => void;
 isListed: boolean;
}) {
 const router = useRouter();
 const statusMeta = getLotStatusMeta(item.status, language);

 const handleOpenPlot = () => {
 router.push(`/world/${item.plotId}`);
 };

 const handleGoBuild = () => {
 router.push(`/?focus=quick-create&plotId=${item.plotId}&lotId=${item.lotId}`);
 };

 return (
 <article className="group flex min-h-[420px] flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]">
 <div
 className="relative h-40 cursor-pointer overflow-hidden"
 onClick={handleOpenPlot}
 >
 <img
 src={item.houseImage || item.mapImage}
 alt={item.fullCode}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />

 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 backdrop-blur">
 {language === "zh" ? item.terrainZh : item.terrainEn}
 </div>

 <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
 <div
 className={`rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${statusMeta.badgeClass}`}
 >
 {statusMeta.shortLabel}
 </div>

 {isListed ? (
 <div className="rounded-full bg-fuchsia-50/95 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 backdrop-blur">
 {language === "zh" ? "出售中" : "On Sale"}
 </div>
 ) : null}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <div className="min-w-0">
 <button
 type="button"
 onClick={handleOpenPlot}
 className="text-left text-sm font-semibold leading-6 text-neutral-900 md:text-base"
 >
 {language === "zh" ? `地块 ${item.fullCode}` : `Plot ${item.fullCode}`}
 </button>

 <p className="mt-1 text-xs text-neutral-500">
 {language === "zh"
 ? `一级地块 ${item.plotCode} · 小地块 ${item.lotCode}`
 : `Main Plot ${item.plotCode} · Lot ${item.lotCode}`}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "买入成本" : "Cost"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {formatSelectedCurrency(item.purchasePriceDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "当前估值" : "Valuation"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {formatSelectedCurrency(item.estimatedValueDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "状态" : "Status"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {statusMeta.label}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "盈亏" : "P/L"}
 </div>
 <div className="mt-1">
 <ValueBadge
 value={formatSelectedCurrency(Math.abs(item.profitDb))}
 positive={item.profitDb >= 0}
 />
 </div>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "绑定房屋" : "Bound House"}
 </div>
 <div className="mt-1 line-clamp-2 text-sm font-medium text-neutral-900">
 {item.houseTitle
 ? item.houseTitle
 : item.status === "building"
 ? language === "zh"
 ? "房屋正在建造中"
 : "House is currently under construction"
 : language === "zh"
 ? "当前还未建造房屋"
 : "No house built yet"}
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={handleOpenPlot}
 className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "进入地块" : "Open Plot"}
 </button>

 {item.status === "owned_unbuilt" ? (
 <button
 onClick={handleGoBuild}
 className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "去建造" : "Go Build"}
 </button>
 ) : null}

 {isListed ? (
 <button
 onClick={() => onCancelListing(item)}
 className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
 >
 {language === "zh" ? "取消挂牌" : "Cancel Listing"}
 </button>
 ) : (
 <button
 onClick={() => onRequestListForSale(item)}
 className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100"
 >
 {language === "zh" ? "挂牌出售" : "List For Sale"}
 </button>
 )}
 </div>
 </div>
 </div>
 </article>
 );
}

function PropertyCard({
 item,
 language,
 t,
 ui,
 formatSelectedCurrency,
 onOpenDetail,
 onToggleBuiltSave,
 onRequestListForSale,
 onCancelListing,
 onDemolishProperty,
 isListed,
}: {
 item: MyPropertyItem;
 language: Language;
 t: MyProfileText;
 ui: UiSet;
 formatSelectedCurrency: (dbAmount: number) => string;
 onOpenDetail: (house: HouseItem) => void;
 onToggleBuiltSave: (id: number) => void;
 onRequestListForSale: (item: MyPropertyItem) => void;
 onCancelListing: (item: MyPropertyItem) => void;
 onDemolishProperty: (item: MyPropertyItem) => void;
 isListed: boolean;
}) {
 const { house } = item;
 const router = useRouter();

 const handleOpenBoundPlot = () => {
 router.push(`/world/${item.plotId}`);
 };

 return (
 <article className="group flex min-h-[460px] flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]">
 <div
 className="relative h-40 cursor-pointer overflow-hidden"
 onClick={() => onOpenDetail(house)}
 >
 <img
 src={house.image}
 alt={house.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {language === "zh" ? house.styleZh : house.styleEn}
 </div>

 <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
 <div
 className={`rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
 item.sourceType === "built"
 ? "bg-sky-50/95 text-sky-700"
 : "bg-fuchsia-50/95 text-fuchsia-700"
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

 {isListed ? (
 <div className="rounded-full bg-fuchsia-50/95 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 backdrop-blur">
 {language === "zh" ? "出售中" : "On Sale"}
 </div>
 ) : null}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <div className="min-w-0">
 <h4 className="line-clamp-2 text-sm font-semibold leading-6 text-neutral-900 md:text-base">
 {house.title}
 </h4>
 <p className="mt-1 truncate text-xs text-neutral-500">
 {language === "zh"
 ? `所属地块：${item.fullCode}`
 : `Plot: ${item.fullCode}`}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "面积" : "Area"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {house.area || "-"}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "房间" : "Rooms"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh" ? house.roomsZh || "-" : house.roomsEn || "-"}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "成本" : "Cost"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {formatSelectedCurrency(item.costDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "估值" : "Valuation"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {formatSelectedCurrency(item.estimatedValueDb)}
 </div>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "所属地块" : "Bound Lot"}
 </div>

 <button
 onClick={handleOpenBoundPlot}
 className="mt-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100"
 >
 {language === "zh" ? `地块 ${item.fullCode}` : `Plot ${item.fullCode}`}
 </button>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="flex items-center justify-between gap-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "浮动盈亏" : "Unrealized P/L"}
 </div>
 <ValueBadge
 value={formatSelectedCurrency(Math.abs(item.profitDb))}
 positive={item.profitDb >= 0}
 />
 </div>
 <div className="mt-2 text-[11px] text-neutral-400">
 {language === "zh"
 ? `获得时间：${formatDateTime(item.acquiredAt, language)}`
 : `Acquired: ${formatDateTime(item.acquiredAt, language)}`}
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => onOpenDetail(house)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {t.view}
 </button>

 <button
 onClick={handleOpenBoundPlot}
 className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100"
 >
 {language === "zh" ? "查看地块" : "View Plot"}
 </button>

 <button
 onClick={() => onDemolishProperty(item)}
 className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-100"
 >
 {language === "zh" ? "拆除" : "Demolish"}
 </button>

 {item.sourceType === "built" ? (
 <button
 onClick={() => onToggleBuiltSave(house.id)}
 className={`${
 house.saved ? ui.btnSmallActive : ui.btnSmallIdle
 } px-3 py-2 text-xs font-medium`}
 >
 {house.saved
 ? language === "zh"
 ? "已收藏"
 : "Saved"
 : language === "zh"
 ? "收藏"
 : "Save"}
 </button>
 ) : null}

 {isListed ? (
 <button
 onClick={() => onCancelListing(item)}
 className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
 >
 {language === "zh" ? "取消挂牌" : "Cancel Listing"}
 </button>
 ) : (
 <button
 onClick={() => onRequestListForSale(item)}
 className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100"
 >
 {language === "zh" ? "挂牌出售" : "List For Sale"}
 </button>
 )}
 </div>
 </div>
 </div>
 </article>
 );
}

function ListingCard({
 listing,
 language,
 formatSelectedCurrency,
 onOpenProperty,
 onOpenLand,
 onCancel,
 onSimulatePurchase,
}: {
 listing: MarketListing;
 language: Language;
 formatSelectedCurrency: (dbAmount: number) => string;
 onOpenProperty: (listing: MarketListing) => void;
 onOpenLand: (listing: MarketListing) => void;
 onCancel: (listing: MarketListing) => void;
 onSimulatePurchase: (listing: MarketListing) => void;
}) {
 const handleOpen = () => {
 if (listing.assetType === "land") {
 onOpenLand(listing);
 } else {
 onOpenProperty(listing);
 }
 };

 return (
 <article className="group flex min-h-[330px] flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]">
 <div
 className="relative h-40 cursor-pointer overflow-hidden"
 onClick={handleOpen}
 >
 <img
 src={listing.image}
 alt={listing.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {listing.assetType === "land"
 ? language === "zh"
 ? "土地"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-fuchsia-50/95 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 backdrop-blur">
 {language === "zh" ? "出售中" : "On Sale"}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <div>
 <button
 type="button"
 onClick={handleOpen}
 className="line-clamp-2 text-left text-sm font-semibold leading-6 text-neutral-900 md:text-base"
 >
 {listing.title}
 </button>
 <p className="mt-1 text-xs text-neutral-500">
 {language === "zh"
 ? `挂牌时间：${formatDateTime(listing.listedAt, language)}`
 : `Listed: ${formatDateTime(listing.listedAt, language)}`}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "挂牌价格" : "Listing Price"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {formatSelectedCurrency(listing.priceDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "状态" : "Status"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh" ? "出售中" : "Active"}
 </div>
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={handleOpen}
 className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {listing.assetType === "land"
 ? language === "zh"
 ? "进入地块"
 : "Open Plot"
 : language === "zh"
 ? "查看房产"
 : "View Property"}
 </button>

 <button
 onClick={() => onSimulatePurchase(listing)}
 className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100"
 >
 {language === "zh" ? "模拟成交" : "Simulate Sale"}
 </button>

 <button
 onClick={() => onCancel(listing)}
 className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
 >
 {language === "zh" ? "取消挂牌" : "Cancel Listing"}
 </button>
 </div>
 </div>
 </div>
 </article>
 );
}

export default function MyProfilePanel({
 language,
 t,
 ui,
 islandOwnerRank,
 builtHouses,
 savedDesigns,
 assetOverview,
 assetRecords,
 selectedCurrency,
 setSelectedCurrency,
 marketRates,
 marketUpdatedAt,
 formatSelectedCurrency,
 marketListings,
 marketTradeRecords,
 refreshKey,
 onOpenDetail,
 onOpenMarketListingDetail,
 onOpenTradeRecordDetail,
 onToggleBuiltSave,
 onRemoveSavedDesign,
 onBuildFromSaved,
 onAssetAction,
 onRequestListLandForSale,
 onCancelLandListing,
 onRequestListPropertyForSale,
 onCancelPropertyListing,
 onDemolishProperty,
 onSimulatePurchase,
 headerExtras,
}: MyProfilePanelProps) {
 const router = useRouter();

 const [activeAssetCard, setActiveAssetCard] =
 useState<AssetCardItem["key"] | null>(null);
 const [allLands, setAllLands] = useState<MyLandItem[]>([]);
 const [builtProperties, setBuiltProperties] = useState<MyPropertyItem[]>([]);
 const [purchasedProperties, setPurchasedProperties] = useState<MyPropertyItem[]>(
 []
 );
 const [landsExpanded, setLandsExpanded] = useState(false);
 const [propertiesExpanded, setPropertiesExpanded] = useState(false);
 const [marketExpanded, setMarketExpanded] = useState(false);
 const [tradeExpanded, setTradeExpanded] = useState(false);

 const [landTerrainFilter, setLandTerrainFilter] =
 useState<LandTerrainFilterType>("all");
 const [landKeyword, setLandKeyword] = useState("");

 const [propertyFilter, setPropertyFilter] =
 useState<PropertyFilterType>("all");
 const [propertyKeyword, setPropertyKeyword] = useState("");

 const [marketFilter, setMarketFilter] = useState<MarketFilterType>("all");
 const [tradeFilter, setTradeFilter] = useState<TradeFilterType>("all");

 useEffect(() => {
 const hydrate = () => {
 const store = loadAssetStore();
 const lands = buildMyLandItems(store.lands, store.bindings);
 const propertyData = buildMyPropertyItems(
 store.gallery as HouseItem[],
 store.bindings,
 store.purchasedProperties
 );

 setAllLands(lands);
 setBuiltProperties(propertyData.builtProperties);
 setPurchasedProperties(propertyData.purchasedProperties);
 };

 hydrate();
 const unsubscribe = subscribeAssetStore(hydrate);
 return unsubscribe;
 }, [refreshKey, builtHouses]);

 const myLands = useMemo(
 () => allLands.filter((item) => item.status === "owned_unbuilt"),
 [allLands]
 );

 const builtLandCount = useMemo(
 () => allLands.filter((item) => item.status === "built").length,
 [allLands]
 );

 const totalAssetDb = useMemo(() => {
 return (
 assetOverview.availableBalanceDb +
 assetOverview.lockedBalanceDb +
 assetOverview.wealthBalanceDb +
 assetOverview.landValueDb +
 assetOverview.houseValueDb
 );
 }, [assetOverview]);

 const emptyLandCount = useMemo(() => myLands.length, [myLands]);

 const allProperties = useMemo(
 () =>
 [...builtProperties, ...purchasedProperties].sort(
 (a, b) => b.acquiredAt - a.acquiredAt
 ),
 [builtProperties, purchasedProperties]
 );

 const propertyCount = allProperties.length;

 const totalLandValuationDb = useMemo(
 () => allLands.reduce((sum, item) => sum + item.estimatedValueDb, 0),
 [allLands]
 );

 const totalPropertyValuationDb = useMemo(
 () => allProperties.reduce((sum, item) => sum + item.estimatedValueDb, 0),
 [allProperties]
 );

 const profitItems = [
 {
 key: "total",
 label: language === "zh" ? "总盈利" : "Total Profit",
 value: formatSelectedCurrency(assetOverview.totalProfitDb),
 positive: assetOverview.totalProfitDb >= 0,
 },
 {
 key: "today",
 label: language === "zh" ? "今天盈利" : "Today Profit",
 value: formatSelectedCurrency(assetOverview.dailyProfitDb),
 positive: assetOverview.dailyProfitDb >= 0,
 },
 {
 key: "7d",
 label: language === "zh" ? "7日盈利" : "7D Profit",
 value: formatSelectedCurrency(assetOverview.weeklyProfitDb),
 positive: assetOverview.weeklyProfitDb >= 0,
 },
 {
 key: "30d",
 label: language === "zh" ? "30日盈利" : "30D Profit",
 value: formatSelectedCurrency(assetOverview.monthlyProfitDb),
 positive: assetOverview.monthlyProfitDb >= 0,
 },
 {
 key: "1y",
 label: language === "zh" ? "1年盈利" : "1Y Profit",
 value: formatSelectedCurrency(assetOverview.yearlyProfitDb),
 positive: assetOverview.yearlyProfitDb >= 0,
 },
 ];

 const assetCards: AssetCardItem[] = [
 {
 key: "available",
 titleZh: "可用资产",
 titleEn: "Available Balance",
 valueDb: assetOverview.availableBalanceDb,
 descZh: "可用于买地、建造、充值后的即时可用余额。",
 descEn: "Available balance for land purchase, building and daily use.",
 icon: "💰",
 },
 {
 key: "wealth",
 titleZh: "理财资产",
 titleEn: "Wealth Balance",
 valueDb: assetOverview.wealthBalanceDb,
 descZh: "已投入理财中的资产，可获取收益。",
 descEn: "Assets placed into wealth management for yield.",
 icon: "📈",
 },
 {
 key: "locked",
 titleZh: "锁定资产",
 titleEn: "Locked Balance",
 valueDb: assetOverview.lockedBalanceDb,
 descZh: "正在处理中或暂不可自由支配的资产。",
 descEn: "Assets currently locked or pending release.",
 icon: "🔒",
 },
 {
 key: "land",
 titleZh: "土地资产",
 titleEn: "Land Value",
 valueDb: totalLandValuationDb || assetOverview.landValueDb,
 descZh: "你已购买土地的实时估值总和。",
 descEn: "Live estimated value of your owned lands.",
 icon: "🗺️",
 },
 {
 key: "house",
 titleZh: "房产资产",
 titleEn: "House Value",
 valueDb: totalPropertyValuationDb || assetOverview.houseValueDb,
 descZh: "你建造或购买的房产实时估值总和。",
 descEn: "Live estimated value of your properties.",
 icon: "🏠",
 },
 ];

 const activeAssetItem =
 assetCards.find((item) => item.key === activeAssetCard) ?? null;

 const relatedRecords = useMemo(() => {
 if (!activeAssetCard) return [];

 if (activeAssetCard === "available") {
 return assetRecords.filter((item) =>
 ["deposit", "withdraw", "reward", "save_design"].includes(item.type)
 );
 }

 if (activeAssetCard === "wealth") {
 return assetRecords.filter((item) =>
 ["wealth_in", "wealth_out", "wealth_income"].includes(item.type)
 );
 }

 if (activeAssetCard === "locked") {
 return assetRecords.filter((item) => ["withdraw"].includes(item.type));
 }

 if (activeAssetCard === "land") {
 return assetRecords.filter((item) => item.type === "buy_land");
 }

 return assetRecords.filter((item) =>
 ["build_house", "house_income"].includes(item.type)
 );
 }, [activeAssetCard, assetRecords]);

 const marketInfoText = useMemo(() => {
 const updatedText = marketUpdatedAt
 ? formatDateTime(marketUpdatedAt, language)
 : language === "zh"
 ? "暂无"
 : "N/A";

 return language === "zh"
 ? `汇率/币价更新时间：${updatedText}`
 : `Rates updated: ${updatedText}`;
 }, [marketUpdatedAt, language]);

 const listedLandIds = useMemo(
 () =>
 new Set(
 marketListings
 .filter((item) => item.assetType === "land")
 .map((item) => item.sourceId)
 ),
 [marketListings]
 );

 const listedPropertyIds = useMemo(
 () =>
 new Set(
 marketListings
 .filter((item) => item.assetType === "property")
 .map((item) => item.sourceId)
 ),
 [marketListings]
 );

 const landStats = useMemo(
 () => ({
 all: myLands.length,
 forest: myLands.filter((item) => item.terrainType === "forest").length,
 city: myLands.filter((item) => item.terrainType === "city").length,
 cliff: myLands.filter((item) => item.terrainType === "cliff").length,
 plain: myLands.filter((item) => item.terrainType === "plain").length,
 suburb: myLands.filter((item) => item.terrainType === "suburb").length,
 }),
 [myLands]
 );

 const propertyStats = useMemo(
 () => ({
 all: allProperties.length,
 built: allProperties.filter((item) => item.sourceType === "built").length,
 purchased: allProperties.filter((item) => item.sourceType === "purchased")
 .length,
 }),
 [allProperties]
 );

 const marketStats = useMemo(
 () => ({
 all: marketListings.length,
 land: marketListings.filter((item) => item.assetType === "land").length,
 property: marketListings.filter((item) => item.assetType === "property")
 .length,
 }),
 [marketListings]
 );

 const tradeStats = useMemo(
 () => ({
 all: marketTradeRecords.length,
 land: marketTradeRecords.filter((item) => item.assetType === "land").length,
 property: marketTradeRecords.filter((item) => item.assetType === "property")
 .length,
 }),
 [marketTradeRecords]
 );

 const filteredLands = useMemo(() => {
 const keyword = landKeyword.trim().toLowerCase();

 return myLands.filter((item) => {
 const matchTerrain =
 landTerrainFilter === "all" || item.terrainType === landTerrainFilter;

 const matchKeyword =
 !keyword ||
 item.plotId.toLowerCase().includes(keyword) ||
 item.lotId.toLowerCase().includes(keyword) ||
 item.plotCode.toLowerCase().includes(keyword) ||
 item.lotCode.toLowerCase().includes(keyword) ||
 item.fullCode.toLowerCase().includes(keyword);

 return matchTerrain && matchKeyword;
 });
 }, [myLands, landTerrainFilter, landKeyword]);

 const filteredProperties = useMemo(() => {
 const keyword = propertyKeyword.trim().toLowerCase();

 return allProperties.filter((item) => {
 const matchFilter =
 propertyFilter === "all" ||
 (propertyFilter === "built" && item.sourceType === "built") ||
 (propertyFilter === "purchased" && item.sourceType === "purchased");

 const matchKeyword =
 !keyword ||
 item.house.title.toLowerCase().includes(keyword) ||
 item.plotId.toLowerCase().includes(keyword) ||
 item.lotId.toLowerCase().includes(keyword) ||
 item.lotCode.toLowerCase().includes(keyword) ||
 item.fullCode.toLowerCase().includes(keyword);

 return matchFilter && matchKeyword;
 });
 }, [allProperties, propertyFilter, propertyKeyword]);

 const filteredMarketListings = useMemo(() => {
 return marketListings.filter((item) => {
 if (marketFilter === "all") return true;
 return item.assetType === marketFilter;
 });
 }, [marketListings, marketFilter]);

 const filteredTradeRecords = useMemo(() => {
 return marketTradeRecords.filter((item) => {
 if (tradeFilter === "all") return true;
 return item.assetType === tradeFilter;
 });
 }, [marketTradeRecords, tradeFilter]);

 const visibleLands = landsExpanded ? filteredLands : filteredLands.slice(0, 8);
 const visibleProperties = propertiesExpanded
 ? filteredProperties
 : filteredProperties.slice(0, 8);
 const visibleMarketListings = marketExpanded
 ? filteredMarketListings
 : filteredMarketListings.slice(0, 8);
 const visibleTradeRecords = tradeExpanded
 ? filteredTradeRecords
 : filteredTradeRecords.slice(0, 8);

 const propertyLookup = useMemo(() => {
 const map = new Map<string, MyPropertyItem>();
 allProperties.forEach((item) => {
 map.set(item.id, item);
 });
 return map;
 }, [allProperties]);

 const landLookup = useMemo(() => {
 const map = new Map<string, MyLandItem>();
 allLands.forEach((item) => {
 map.set(item.id, item);
 });
 return map;
 }, [allLands]);

 return (
 <>
 <section className="space-y-6">
 <div className="border-b border-neutral-200 pb-6">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
 <div className="flex items-center gap-4">
 <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-neutral-900 text-2xl font-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)]">
 U
 </div>

 <div>
 <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-amber-700">
 {language === "zh" ? "我的岛主中心" : "My Island Hub"}
 </div>
 <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
 {language === "zh" ? "我的" : "My Profile"}
 </h2>
 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? `欢迎回来，你是梦幻岛第 ${islandOwnerRank} 位岛主。`
 : `Welcome back. You are the No.${islandOwnerRank} island owner of Dream Island.`}
 </p>
 </div>
 </div>

 {headerExtras ? <div className="shrink-0">{headerExtras}</div> : null}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/60 p-4 md:p-5">
 <div className="mb-4">
 <div className="text-xl font-bold text-neutral-900">
 {language === "zh" ? "资产总览" : "Overview"}
 </div>
 <div className="mt-1 text-sm text-neutral-500">
 {language === "zh"
 ? "核心指标与土地房产明细"
 : "Core metrics and land/property breakdown"}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
 <StatCard
 label={language === "zh" ? "岛主编号" : "Owner Rank"}
 value={islandOwnerRank}
 tone="primary"
 />
 <StatCard
 label={language === "zh" ? "我的土地" : "My Lands"}
 value={myLands.length}
 tone="primary"
 />
 <StatCard
 label={language === "zh" ? "我的房产" : "My Properties"}
 value={propertyCount}
 tone="primary"
 />
 <StatCard
 label={language === "zh" ? "收藏设计" : "Saved Designs"}
 value={savedDesigns.length}
 tone="primary"
 />
 <StatCard
 label={language === "zh" ? "待建土地" : "Awaiting Build"}
 value={emptyLandCount}
 tone="secondary"
 />
 <StatCard
 label={language === "zh" ? "已建房土地" : "Built Lots"}
 value={builtLandCount}
 tone="secondary"
 />
 <StatCard
 label={language === "zh" ? "我建造的房产" : "Built by Me"}
 value={builtProperties.length}
 tone="secondary"
 />
 <StatCard
 label={language === "zh" ? "出售中资产" : "Assets on Sale"}
 value={marketListings.length}
 tone="secondary"
 />
 </div>
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-emerald-700">
 {language === "zh" ? "我的总资产" : "My Total Assets"}
 </div>

 <h3 className="mt-3 text-4xl font-black tracking-tight text-neutral-900 md:text-5xl">
 {formatSelectedCurrency(totalAssetDb)}
 </h3>

 <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
 <span
 className={`rounded-full px-3 py-1 font-semibold ${
 assetOverview.dailyChangePercent >= 0
 ? "bg-emerald-50 text-emerald-600"
 : "bg-red-50 text-red-600"
 }`}
 >
 {assetOverview.dailyChangePercent >= 0 ? "+" : ""}
 {assetOverview.dailyChangePercent.toFixed(2)}%
 {language === "zh" ? " 今日" : " Today"}
 </span>

 <span className="text-neutral-500">{marketInfoText}</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {(["CNY", "USD", "USDT", "BTC"] as CurrencyType[]).map(
 (currency) => (
 <button
 key={currency}
 onClick={() => setSelectedCurrency(currency)}
 className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
 selectedCurrency === currency
 ? "bg-neutral-900 text-white shadow-[0_10px_20px_rgba(0,0,0,0.16)]"
 : "border border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 {getCurrencyBadgeLabel(currency)}
 </button>
 )
 )}
 </div>
 </div>

 <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
 {profitItems.map((item) => (
 <ProfitCard
 key={item.key}
 label={item.label}
 value={item.value}
 positive={item.positive}
 />
 ))}
 </div>

 <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
 {assetCards.map((item) => (
 <AssetMiniCard
 key={item.key}
 icon={item.icon}
 title={language === "zh" ? item.titleZh : item.titleEn}
 value={formatSelectedCurrency(item.valueDb)}
 description={language === "zh" ? item.descZh : item.descEn}
 onClick={() => setActiveAssetCard(item.key)}
 />
 ))}
 </div>
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的土地" : "My Lands"}
 </h3>
 <div className="mt-1 text-sm text-neutral-500">
 {language === "zh"
 ? "这里只显示未建造 lot，可按地形和编号筛选。"
 : "Only unbuilt lots are shown here. Filter by terrain and search by code."}
 </div>
 </div>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {filteredLands.length}
 </span>
 </div>

 {myLands.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你当前没有待开发土地，已建成 lot 已自动归入“我的房产”。"
 : "You currently have no undeveloped lands. Built lots have been moved into My Properties."}
 </div>
 ) : (
 <>
 <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex flex-wrap gap-2">
 {(
 ["all", "forest", "city", "cliff", "plain", "suburb"] as const
 ).map((terrain) => {
 const count =
 terrain === "all" ? landStats.all : landStats[terrain];
 return (
 <FilterChip
 key={terrain}
 active={landTerrainFilter === terrain}
 onClick={() => setLandTerrainFilter(terrain)}
 >
 {getTerrainFilterLabel(terrain, language)} ({count})
 </FilterChip>
 );
 })}
 </div>

 <input
 value={landKeyword}
 onChange={(e) => setLandKeyword(e.target.value)}
 placeholder={
 language === "zh"
 ? "搜索 plot / lot 编号"
 : "Search plot / lot code"
 }
 className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-neutral-400 lg:w-[260px]"
 />
 </div>

 {filteredLands.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前筛选条件下没有匹配的土地。"
 : "No lands match the current filters."}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleLands.map((item) => (
 <LandCard
 key={item.id}
 item={item}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onRequestListForSale={onRequestListLandForSale}
 onCancelListing={onCancelLandListing}
 isListed={listedLandIds.has(item.id)}
 />
 ))}
 </div>

 {filteredLands.length > 8 ? (
 <div className="mt-5 flex justify-center">
 <button
 onClick={() => setLandsExpanded((prev) => !prev)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {landsExpanded
 ? language === "zh"
 ? "收起土地"
 : "Collapse Lands"
 : language === "zh"
 ? `展开全部土地（${filteredLands.length}）`
 : `Show All Lands (${filteredLands.length})`}
 </button>
 </div>
 ) : null}
 </>
 )}
 </>
 )}
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的房产" : "My Properties"}
 </h3>
 <div className="mt-1 text-sm text-neutral-500">
 {language === "zh"
 ? "这里统一展示我建造的房产和我购买的房产。"
 : "This section combines both built and purchased properties."}
 </div>
 </div>

 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {filteredProperties.length}
 </span>
 </div>

 {allProperties.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你还没有房产，先去建造或购买房产吧。"
 : "You do not have any properties yet. Build or purchase one first."}
 </div>
 ) : (
 <>
 <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex flex-wrap gap-2">
 <FilterChip
 active={propertyFilter === "all"}
 onClick={() => setPropertyFilter("all")}
 >
 {language === "zh" ? "全部房产" : "All Properties"} (
 {propertyStats.all})
 </FilterChip>

 <FilterChip
 active={propertyFilter === "built"}
 onClick={() => setPropertyFilter("built")}
 >
 {language === "zh" ? "我建造的" : "Built by Me"} (
 {propertyStats.built})
 </FilterChip>

 <FilterChip
 active={propertyFilter === "purchased"}
 onClick={() => setPropertyFilter("purchased")}
 >
 {language === "zh" ? "我购买的" : "Purchased"} (
 {propertyStats.purchased})
 </FilterChip>
 </div>

 <input
 value={propertyKeyword}
 onChange={(e) => setPropertyKeyword(e.target.value)}
 placeholder={
 language === "zh"
 ? "搜索房屋名 / lot 编号"
 : "Search house title / lot code"
 }
 className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-neutral-400 lg:w-[280px]"
 />
 </div>

 {filteredProperties.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前筛选条件下没有匹配的房产。"
 : "No properties match the current filters."}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleProperties.map((item) => (
 <PropertyCard
 key={item.id}
 item={item}
 language={language}
 t={t}
 ui={ui}
 formatSelectedCurrency={formatSelectedCurrency}
 onOpenDetail={onOpenDetail}
 onToggleBuiltSave={onToggleBuiltSave}
 onRequestListForSale={onRequestListPropertyForSale}
 onCancelListing={onCancelPropertyListing}
 onDemolishProperty={onDemolishProperty}
 isListed={listedPropertyIds.has(item.id)}
 />
 ))}
 </div>

 {filteredProperties.length > 8 ? (
 <div className="mt-5 flex justify-center">
 <button
 onClick={() => setPropertiesExpanded((prev) => !prev)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {propertiesExpanded
 ? language === "zh"
 ? "收起房产"
 : "Collapse Properties"
 : language === "zh"
 ? `展开全部房产（${filteredProperties.length}）`
 : `Show All Properties (${filteredProperties.length})`}
 </button>
 </div>
 ) : null}
 </>
 )}
 </>
 )}
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的交易市场" : "My Market Listings"}
 </h3>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {filteredMarketListings.length}
 </span>
 </div>

 {marketListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你当前还没有挂牌中的资产，去土地或房产卡片里点击“挂牌出售”吧。"
 : "You do not have any active listings yet. Use “List For Sale” from your land or property cards."}
 </div>
 ) : (
 <>
 <div className="mb-5 flex flex-wrap gap-2">
 {(["all", "land", "property"] as const).map((filter) => {
 const count =
 filter === "all" ? marketStats.all : marketStats[filter];

 return (
 <FilterChip
 key={filter}
 active={marketFilter === filter}
 onClick={() => setMarketFilter(filter)}
 >
 {getMarketFilterLabel(filter, language)} ({count})
 </FilterChip>
 );
 })}
 </div>

 {filteredMarketListings.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前筛选条件下没有挂牌资产。"
 : "No listings match the current filter."}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleMarketListings.map((listing) => (
 <ListingCard
 key={listing.id}
 listing={listing}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 onOpenLand={(target) => {
 const land = landLookup.get(target.sourceId);
 if (land) {
 router.push(`/world/${land.plotId}`);
 }
 }}
 onOpenProperty={(target) => {
 onOpenMarketListingDetail?.(target);

 const property = propertyLookup.get(target.sourceId);
 if (property) {
 onOpenDetail(property.house);
 return;
 }

 const snapshot = (target as MarketListingWithPreview)
 .houseSnapshot;
 if (snapshot) {
 onOpenDetail(snapshot);
 }
 }}
 onSimulatePurchase={onSimulatePurchase}
 onCancel={(target) => {
 if (target.assetType === "land") {
 const land = landLookup.get(target.sourceId);
 if (land) onCancelLandListing(land);
 } else {
 const property = propertyLookup.get(target.sourceId);
 if (property) onCancelPropertyListing(property);
 }
 }}
 />
 ))}
 </div>

 {filteredMarketListings.length > 8 ? (
 <div className="mt-5 flex justify-center">
 <button
 onClick={() => setMarketExpanded((prev) => !prev)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {marketExpanded
 ? language === "zh"
 ? "收起挂牌"
 : "Collapse Listings"
 : language === "zh"
 ? `展开全部挂牌（${filteredMarketListings.length}）`
 : `Show All Listings (${filteredMarketListings.length})`}
 </button>
 </div>
 ) : null}
 </>
 )}
 </>
 )}
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "成交记录" : "Trade History"}
 </h3>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {filteredTradeRecords.length}
 </span>
 </div>

 {marketTradeRecords.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "暂时还没有成交记录。"
 : "No trade history yet."}
 </div>
 ) : (
 <>
 <div className="mb-5 flex flex-wrap gap-2">
 {(["all", "land", "property"] as const).map((filter) => {
 const count =
 filter === "all" ? tradeStats.all : tradeStats[filter];

 return (
 <FilterChip
 key={filter}
 active={tradeFilter === filter}
 onClick={() => setTradeFilter(filter)}
 >
 {getTradeFilterLabel(filter, language)} ({count})
 </FilterChip>
 );
 })}
 </div>

 {filteredTradeRecords.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前筛选条件下没有成交记录。"
 : "No trade records match the current filter."}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {visibleTradeRecords.map((record) => {
 const handleOpenTradePreview = () => {
 onOpenTradeRecordDetail?.(record);

 if (record.assetType === "land") {
 const land = landLookup.get(record.sourceId);
 if (land) {
 router.push(`/world/${land.plotId}`);
 }
 return;
 }

 const property = propertyLookup.get(record.sourceId);
 if (property) {
 onOpenDetail(property.house);
 return;
 }

 const snapshot = (record as MarketTradeRecordWithPreview)
 .houseSnapshot;
 if (snapshot) {
 onOpenDetail(snapshot);
 }
 };

 return (
 <article
 key={record.id}
 className="group flex min-h-[320px] flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]"
 >
 <div
 className="relative h-40 cursor-pointer overflow-hidden"
 onClick={handleOpenTradePreview}
 >
 <img
 src={record.image}
 alt={record.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {record.assetType === "land"
 ? language === "zh"
 ? "土地"
 : "Land"
 : language === "zh"
 ? "房产"
 : "Property"}
 </div>
 <div className="absolute right-3 top-3 rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 backdrop-blur">
 {language === "zh" ? "已成交" : "Sold"}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <div>
 <button
 type="button"
 onClick={handleOpenTradePreview}
 className="line-clamp-2 text-left text-sm font-semibold leading-6 text-neutral-900 md:text-base"
 >
 {record.title}
 </button>
 <p className="mt-1 text-xs text-neutral-500">
 {language === "zh"
 ? `成交时间：${formatDateTime(
 record.tradedAt,
 language
 )}`
 : `Sold: ${formatDateTime(
 record.tradedAt,
 language
 )}`}
 </p>
 </div>

 <div className="mt-4 rounded-2xl bg-neutral-50 px-3 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "成交价格" : "Sold Price"}
 </div>
 <div className="mt-1 text-base font-semibold text-neutral-900">
 {formatSelectedCurrency(record.priceDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {record.priceDb.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={handleOpenTradePreview}
 className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {record.assetType === "land"
 ? language === "zh"
 ? "查看地块"
 : "View Plot"
 : language === "zh"
 ? "查看房产"
 : "View Property"}
 </button>
 </div>
 </div>
 </div>
 </article>
 );
 })}
 </div>

 {filteredTradeRecords.length > 8 ? (
 <div className="mt-5 flex justify-center">
 <button
 onClick={() => setTradeExpanded((prev) => !prev)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {tradeExpanded
 ? language === "zh"
 ? "收起成交记录"
 : "Collapse Trade History"
 : language === "zh"
 ? `展开全部成交记录（${filteredTradeRecords.length}）`
 : `Show All Trade History (${filteredTradeRecords.length})`}
 </button>
 </div>
 ) : null}
 </>
 )}
 </>
 )}
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "我的收藏设计" : "My Saved Designs"}
 </h3>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {savedDesigns.length}
 </span>
 </div>

 {savedDesigns.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "你还没有收藏生成方案，先去生成并收藏一个设计吧。"
 : "You do not have any saved designs yet. Generate and save one first."}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 {savedDesigns.map((design) => {
 const house = convertSavedDesignToHouseItem(design);

 return (
 <article
 key={design.id}
 className="group flex min-h-[360px] flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]"
 >
 <div
 className="relative h-40 cursor-pointer overflow-hidden"
 onClick={() => onOpenDetail(house)}
 >
 <img
 src={house.image}
 alt={house.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {language === "zh" ? house.styleZh : house.styleEn}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <div className="min-w-0">
 <h4 className="line-clamp-2 text-sm font-semibold leading-6 text-neutral-900 md:text-base">
 {house.title}
 </h4>
 <p className="mt-1 truncate text-xs text-neutral-500">
 {language === "zh"
 ? house.plotZh || "未设置地块"
 : house.plotEn || "No plot"}
 </p>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "面积" : "Area"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {house.area || "-"}
 </div>
 </div>
 <div className="rounded-2xl bg-neutral-50 px-3 py-2">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "房间" : "Rooms"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh"
 ? house.roomsZh || "-"
 : house.roomsEn || "-"}
 </div>
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => onOpenDetail(house)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {t.view}
 </button>

 <button
 onClick={() => onBuildFromSaved(design.id)}
 className={`${ui.btnSmallActive} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh"
 ? "开始建造"
 : "Build From Saved"}
 </button>

 <button
 onClick={() => onRemoveSavedDesign(design.id)}
 className={`${ui.btnSmallIdle} px-3 py-2 text-xs font-medium`}
 >
 {language === "zh" ? "取消收藏" : "Remove"}
 </button>
 </div>
 </div>
 </div>
 </article>
 );
 })}
 </div>
 )}
 </div>
 </section>

 {activeAssetItem ? (
 <div
 className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={() => setActiveAssetCard(null)}
 >
 <div
 className="flex max-h-[calc(100vh-2rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] border border-neutral-200 bg-white shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-5 pt-6">
 <div>
 <div className="text-sm font-medium text-neutral-500">
 {getAssetActionLabel(activeAssetItem.key, language)}
 </div>
 <h4 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
 {language === "zh"
 ? activeAssetItem.titleZh
 : activeAssetItem.titleEn}
 </h4>
 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? activeAssetItem.descZh
 : activeAssetItem.descEn}
 </p>
 </div>

 <button
 onClick={() => setActiveAssetCard(null)}
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-all duration-200 hover:scale-105"
 >
 ✕
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-5">
 <div className="flex flex-col gap-5">
 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-xs font-medium text-neutral-500">
 {language === "zh" ? "当前价值" : "Current Value"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {formatSelectedCurrency(activeAssetItem.valueDb)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {activeAssetItem.valueDb.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-xs font-medium text-neutral-500">
 {language === "zh" ? "显示币种" : "Display Currency"}
 </div>
 <div className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
 {getCurrencyBadgeLabel(selectedCurrency)}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {language === "zh"
 ? "根据实时汇率/币价换算"
 : "Converted by live rates"}
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="text-xs font-medium text-neutral-500">
 {language === "zh" ? "更新时间" : "Updated At"}
 </div>
 <div className="mt-2 text-sm font-semibold leading-6 text-neutral-900">
 {marketUpdatedAt
 ? formatDateTime(marketUpdatedAt, language)
 : "-"}
 </div>
 <div className="mt-1 text-[11px] text-neutral-400">
 {`CNY:${marketRates.CNY.toFixed(4)} / BTC:${marketRates.BTC.toFixed(
 8
 )}`}
 </div>
 </div>
 </div>

 <div className="rounded-[24px] border border-neutral-200 bg-white p-5">
 <div className="mb-4 flex items-center justify-between">
 <div className="text-base font-semibold text-neutral-900">
 {language === "zh" ? "最近记录" : "Recent Records"}
 </div>
 <div className="text-xs text-neutral-400">
 {relatedRecords.length}
 </div>
 </div>

 {relatedRecords.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "暂无相关记录"
 : "No related records yet."}
 </div>
 ) : (
 <div className="space-y-3">
 {relatedRecords.slice(0, 8).map((record) => (
 <RecordRow
 key={record.id}
 record={record}
 language={language}
 formatSelectedCurrency={formatSelectedCurrency}
 />
 ))}
 </div>
 )}
 </div>

 <div className="flex flex-wrap justify-end gap-3">
 <button
 onClick={() => onAssetAction("deposit", 5000)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "充值" : "Deposit"}
 </button>

 <button
 onClick={() => onAssetAction("withdraw", 2000)}
 className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_8px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 >
 {language === "zh" ? "提现" : "Withdraw"}
 </button>

 <button
 onClick={() => onAssetAction("wealth", 3000)}
 className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "转入理财" : "Wealth"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : null}
 </>
 );
}