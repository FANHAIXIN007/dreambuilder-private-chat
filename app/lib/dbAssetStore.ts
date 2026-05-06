"use client";

export type Language = "zh" | "en";
export type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";
export type OwnerType = "none" | "self" | "other";

export type AssetOverview = {
 availableBalanceDb: number;
 lockedBalanceDb: number;
 wealthBalanceDb: number;
 landValueDb: number;
 houseValueDb: number;
 totalProfitDb: number;
 dailyProfitDb: number;
 weeklyProfitDb: number;
 monthlyProfitDb: number;
 yearlyProfitDb: number;
 dailyChangePercent: number;
 weeklyChangePercent: number;
 monthlyChangePercent: number;
};

export type AssetRecordType =
 | "deposit"
 | "withdraw"
 | "buy_land"
 | "build_house"
 | "wealth_in"
 | "wealth_out"
 | "wealth_income"
 | "house_income"
 | "save_design"
 | "reward";

export type AssetRecordStatus = "success" | "pending" | "failed";

export type AssetRecord = {
 id: number;
 type: AssetRecordType;
 titleZh: string;
 titleEn: string;
 amountDb: number;
 balanceAfterDb: number;
 status: AssetRecordStatus;
 createdAt: string;
};

export type OwnedLot = {
 plotId: string;
 lotId: string;
 acquiredAt: number;
 purchasePriceDb?: number;
};

export type HouseLotBinding = {
 plotId: string;
 lotId: string;
 houseId: number;
 title: string;
 image: string;
 boundAt: number;
};

export type PurchasedProperty = {
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
 plotId?: string;
 lotId?: string;
 purchasePriceDb?: number;
 purchasedAt?: number;
};

export type MarketListing = {
 id: string;
 assetType: "land" | "property";
 sourceId: string;
 title: string;
 image: string;
 priceDb: number;
 listedAt: string;
 status: "active";
};

export type LotTradeStatus = {
 plotId: string;
 lotId: string;
 ownerType: OwnerType;
 ownerName: string;
 priceDb: number;
 lastPriceDb: number;
 dailyChangePercent: number;
 tradeCount: number;
 isListed: boolean;
};

export type LotPurchaseRecord = {
 plotId: string;
 lotId: string;
 amountUsdt: string;
 txHash: string;
 purchasedAt: number;
};

export type SimulatedBuyerAsset = {
 id: string;
 assetType: "land" | "property";
 title: string;
 image: string;
 plotId: string;
 lotId: string;
 fullCode: string;
 priceDb: number;
 purchasedAt: string;
 sourceListingId: string;
 sellerSourceId: string;
 sellerPropertySourceType?: "built" | "purchased";
};

export type GalleryHouse = {
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

export type MarketTradeRecord = {
 id: string;
 assetType: "land" | "property";
 sourceId: string;
 title: string;
 image: string;
 priceDb: number;
 tradedAt: string;
 tradeType: "sold";
 status: "completed";
 houseSnapshot?: GalleryHouse;
};

export type GeneratedOption = {
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
 views?: {
 main?: string;
 side?: string;
 aerial?: string;
 night?: string;
 };
};

export type SavedDesign = {
 id: number;
 signature: string;
 createdAt: number;
 design: GeneratedOption;
};

export type DraftProjectStatus = "draft" | "saved" | "built";

export type DraftProject = {
 id: number;
 signature: string;
 createdAt: number;
 updatedAt: number;
 status: DraftProjectStatus;
 design: GeneratedOption;
};

export type GenerationHistoryItem = {
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

export type DbAssetStore = {
 version: 2;
 lands: OwnedLot[];
 bindings: HouseLotBinding[];
 gallery: GalleryHouse[];
 purchasedProperties: PurchasedProperty[];
 marketListings: MarketListing[];
 marketTrades: MarketTradeRecord[];
 lotTrades: LotTradeStatus[];
 lotPurchaseRecords: LotPurchaseRecord[];
 buyerAssets: SimulatedBuyerAsset[];
 savedDesigns: SavedDesign[];
 draftProjects: DraftProject[];
 generationHistory: GenerationHistoryItem[];
 assetOverview: AssetOverview;
 assetRecords: AssetRecord[];
};

export const DB_ASSET_STORE_KEY = "db_asset_store";
export const APP_DATA_SYNC_EVENT = "db-app-data-sync";

export const LEGACY_KEYS = {
 ownedLots: "db_owned_lots",
 bindings: "db_house_lot_bindings",
 gallery: "db_gallery",
 purchasedProperties: "db_purchased_properties",
 marketListings: "db_market_listings",
 marketTrades: "db_market_trade_records",
 lotTrades: "db_plot_lot_trades",
 lotPurchaseRecords: "db_lot_purchase_records",
 buyerAssets: "db_simulated_buyer_assets",
 savedDesigns: "db_saved_designs",
 draftProjects: "db_draft_projects",
 generationHistory: "db_generation_history",
 assetOverview: "db_asset_overview",
 assetRecords: "db_asset_records",
} as const;

export const DEFAULT_ASSET_OVERVIEW: AssetOverview = {
 availableBalanceDb: 125000,
 lockedBalanceDb: 8000,
 wealthBalanceDb: 32000,
 landValueDb: 56000,
 houseValueDb: 88000,
 totalProfitDb: 26800,
 dailyProfitDb: 820,
 weeklyProfitDb: 3280,
 monthlyProfitDb: 11260,
 yearlyProfitDb: 46800,
 dailyChangePercent: 2.36,
 weeklyChangePercent: 8.42,
 monthlyChangePercent: 16.78,
};

export const DEFAULT_ASSET_RECORDS: AssetRecord[] = [
 {
 id: 1,
 type: "deposit",
 titleZh: "充值到账",
 titleEn: "Deposit Received",
 amountDb: 50000,
 balanceAfterDb: 50000,
 status: "success",
 createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
 },
 {
 id: 2,
 type: "wealth_in",
 titleZh: "转入理财",
 titleEn: "Transfer to Wealth",
 amountDb: -12000,
 balanceAfterDb: 38000,
 status: "success",
 createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
 },
 {
 id: 3,
 type: "wealth_income",
 titleZh: "理财收益",
 titleEn: "Wealth Income",
 amountDb: 860,
 balanceAfterDb: 38860,
 status: "success",
 createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
 },
 {
 id: 4,
 type: "reward",
 titleZh: "岛主奖励",
 titleEn: "Owner Reward",
 amountDb: 2200,
 balanceAfterDb: 41060,
 status: "success",
 createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
 },
];

export const DEFAULT_DB_ASSET_STORE: DbAssetStore = {
 version: 2,
 lands: [],
 bindings: [],
 gallery: [],
 purchasedProperties: [],
 marketListings: [],
 marketTrades: [],
 lotTrades: [],
 lotPurchaseRecords: [],
 buyerAssets: [],
 savedDesigns: [],
 draftProjects: [],
 generationHistory: [],
 assetOverview: DEFAULT_ASSET_OVERVIEW,
 assetRecords: DEFAULT_ASSET_RECORDS,
};

export function normalizeLotId(lotId?: string) {
 if (!lotId) return "";
 const num = Number.parseInt(String(lotId).replace("lot-", ""), 10);
 return Number.isNaN(num) ? String(lotId) : `lot-${num}`;
}

function safeRead<T>(key: string, fallback: T): T {
 if (typeof window === "undefined") return fallback;
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return fallback;
 const parsed = JSON.parse(raw);
 return (parsed as T) ?? fallback;
 } catch {
 return fallback;
 }
}

function safeWrite(key: string, value: unknown) {
 if (typeof window === "undefined") return;
 localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAssetOverview(input?: Partial<AssetOverview>): AssetOverview {
 return {
 ...DEFAULT_ASSET_OVERVIEW,
 ...(input || {}),
 };
}

function normalizeLands(input: OwnedLot[] = []): OwnedLot[] {
 return input.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
}

function normalizeBindings(input: HouseLotBinding[] = []): HouseLotBinding[] {
 return input.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
}

function normalizePurchasedProperties(
 input: PurchasedProperty[] = []
): PurchasedProperty[] {
 return input.map((item) => ({
 ...item,
 lotId: item.lotId ? normalizeLotId(item.lotId) : item.lotId,
 }));
}

function normalizeLotTrades(input: LotTradeStatus[] = []): LotTradeStatus[] {
 return input.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
}

function normalizeLotPurchaseRecords(
 input: LotPurchaseRecord[] = []
): LotPurchaseRecord[] {
 return input.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
}

function normalizeBuyerAssets(
 input: SimulatedBuyerAsset[] = []
): SimulatedBuyerAsset[] {
 return input.map((item) => ({
 ...item,
 lotId: normalizeLotId(item.lotId),
 }));
}

function normalizeSavedDesigns(input: SavedDesign[] = []): SavedDesign[] {
 return input.filter(Boolean).map((item) => ({
 ...item,
 design: item.design,
 }));
}

function normalizeDraftStatus(
 status: DraftProjectStatus | string | undefined
): DraftProjectStatus {
 if (status === "saved") return "saved";
 if (status === "built") return "built";
 return "draft";
}

function normalizeDraftProjects(input: DraftProject[] = []): DraftProject[] {
 return input.filter(Boolean).map(
 (item): DraftProject => ({
 ...item,
 status: normalizeDraftStatus(item.status),
 design: item.design,
 })
 );
}

function normalizeGenerationHistory(
 input: GenerationHistoryItem[] = []
): GenerationHistoryItem[] {
 return input.filter(Boolean);
}

function normalizeAssetRecords(input: AssetRecord[] = []): AssetRecord[] {
 return input
 .filter(Boolean)
 .map(
 (item): AssetRecord => ({
 ...item,
 type: item.type,
 status: item.status,
 })
 )
 .slice(0, 100);
}

function normalizeMarketTrades(input: MarketTradeRecord[] = []): MarketTradeRecord[] {
 return input
 .filter(Boolean)
 .map(
 (item): MarketTradeRecord => ({
 ...item,
 houseSnapshot: item.houseSnapshot
 ? {
 ...item.houseSnapshot,
 }
 : undefined,
 })
 );
}

function normalizeStore(input: Partial<DbAssetStore> | null | undefined): DbAssetStore {
 return {
 version: 2,
 lands: normalizeLands(Array.isArray(input?.lands) ? input.lands : []),
 bindings: normalizeBindings(Array.isArray(input?.bindings) ? input.bindings : []),
 gallery: Array.isArray(input?.gallery) ? input.gallery : [],
 purchasedProperties: normalizePurchasedProperties(
 Array.isArray(input?.purchasedProperties) ? input.purchasedProperties : []
 ),
 marketListings: Array.isArray(input?.marketListings) ? input.marketListings : [],
 marketTrades: normalizeMarketTrades(
 Array.isArray(input?.marketTrades) ? input.marketTrades : []
 ),
 lotTrades: normalizeLotTrades(Array.isArray(input?.lotTrades) ? input.lotTrades : []),
 lotPurchaseRecords: normalizeLotPurchaseRecords(
 Array.isArray(input?.lotPurchaseRecords) ? input.lotPurchaseRecords : []
 ),
 buyerAssets: normalizeBuyerAssets(
 Array.isArray(input?.buyerAssets) ? input.buyerAssets : []
 ),
 savedDesigns: normalizeSavedDesigns(
 Array.isArray(input?.savedDesigns) ? input.savedDesigns : []
 ),
 draftProjects: normalizeDraftProjects(
 Array.isArray(input?.draftProjects) ? input.draftProjects : []
 ),
 generationHistory: normalizeGenerationHistory(
 Array.isArray(input?.generationHistory) ? input.generationHistory : []
 ),
 assetOverview: normalizeAssetOverview(input?.assetOverview),
 assetRecords: normalizeAssetRecords(
 Array.isArray(input?.assetRecords) ? input.assetRecords : DEFAULT_ASSET_RECORDS
 ),
 };
}

function readLegacyStore(): DbAssetStore {
 return normalizeStore({
 lands: safeRead<OwnedLot[]>(LEGACY_KEYS.ownedLots, []),
 bindings: safeRead<HouseLotBinding[]>(LEGACY_KEYS.bindings, []),
 gallery: safeRead<GalleryHouse[]>(LEGACY_KEYS.gallery, []),
 purchasedProperties: safeRead<PurchasedProperty[]>(
 LEGACY_KEYS.purchasedProperties,
 []
 ),
 marketListings: safeRead<MarketListing[]>(LEGACY_KEYS.marketListings, []),
 marketTrades: safeRead<MarketTradeRecord[]>(LEGACY_KEYS.marketTrades, []),
 lotTrades: safeRead<LotTradeStatus[]>(LEGACY_KEYS.lotTrades, []),
 lotPurchaseRecords: safeRead<LotPurchaseRecord[]>(
 LEGACY_KEYS.lotPurchaseRecords,
 []
 ),
 buyerAssets: safeRead<SimulatedBuyerAsset[]>(LEGACY_KEYS.buyerAssets, []),
 savedDesigns: safeRead<SavedDesign[]>(LEGACY_KEYS.savedDesigns, []),
 draftProjects: safeRead<DraftProject[]>(LEGACY_KEYS.draftProjects, []),
 generationHistory: safeRead<GenerationHistoryItem[]>(
 LEGACY_KEYS.generationHistory,
 []
 ),
 assetOverview: safeRead<AssetOverview>(
 LEGACY_KEYS.assetOverview,
 DEFAULT_ASSET_OVERVIEW
 ),
 assetRecords: safeRead<AssetRecord[]>(
 LEGACY_KEYS.assetRecords,
 DEFAULT_ASSET_RECORDS
 ),
 });
}

function mirrorLegacyKeys(store: DbAssetStore) {
 safeWrite(LEGACY_KEYS.ownedLots, store.lands);
 safeWrite(LEGACY_KEYS.bindings, store.bindings);
 safeWrite(LEGACY_KEYS.gallery, store.gallery);
 safeWrite(LEGACY_KEYS.purchasedProperties, store.purchasedProperties);
 safeWrite(LEGACY_KEYS.marketListings, store.marketListings);
 safeWrite(LEGACY_KEYS.marketTrades, store.marketTrades);
 safeWrite(LEGACY_KEYS.lotTrades, store.lotTrades);
 safeWrite(LEGACY_KEYS.lotPurchaseRecords, store.lotPurchaseRecords);
 safeWrite(LEGACY_KEYS.buyerAssets, store.buyerAssets);
 safeWrite(LEGACY_KEYS.savedDesigns, store.savedDesigns);
 safeWrite(LEGACY_KEYS.draftProjects, store.draftProjects);
 safeWrite(LEGACY_KEYS.generationHistory, store.generationHistory);
 safeWrite(LEGACY_KEYS.assetOverview, store.assetOverview);
 safeWrite(LEGACY_KEYS.assetRecords, store.assetRecords);
}

export function emitAssetStoreSync() {
 if (typeof window === "undefined") return;
 window.dispatchEvent(new Event(APP_DATA_SYNC_EVENT));
}

export function loadAssetStore(): DbAssetStore {
 if (typeof window === "undefined") return DEFAULT_DB_ASSET_STORE;

 const current = safeRead<Partial<DbAssetStore> | null>(DB_ASSET_STORE_KEY, null);

 if (current && typeof current === "object") {
 const normalized = normalizeStore(current);
 mirrorLegacyKeys(normalized);
 return normalized;
 }

 const migrated = readLegacyStore();
 safeWrite(DB_ASSET_STORE_KEY, migrated);
 mirrorLegacyKeys(migrated);
 return migrated;
}

export function saveAssetStore(store: DbAssetStore) {
 const normalized = normalizeStore(store);
 safeWrite(DB_ASSET_STORE_KEY, normalized);
 mirrorLegacyKeys(normalized);
 emitAssetStoreSync();
}

export function updateAssetStore(
 updater: (current: DbAssetStore) => DbAssetStore
): DbAssetStore {
 const current = loadAssetStore();
 const next = normalizeStore(updater(current));
 saveAssetStore(next);
 return next;
}

export function subscribeAssetStore(onChange: () => void) {
 if (typeof window === "undefined") return () => {};

 const handleSync = () => onChange();
 const handleStorage = (event: StorageEvent) => {
 if (event.key === DB_ASSET_STORE_KEY) onChange();
 };

 window.addEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.addEventListener("storage", handleStorage);

 return () => {
 window.removeEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.removeEventListener("storage", handleStorage);
 };
}

export function setDraftProjects(draftProjects: DraftProject[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 draftProjects: normalizeDraftProjects(draftProjects),
 }));
}

export function setSavedDesigns(savedDesigns: SavedDesign[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 savedDesigns: normalizeSavedDesigns(savedDesigns),
 }));
}

export function setGenerationHistory(generationHistory: GenerationHistoryItem[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 generationHistory: normalizeGenerationHistory(generationHistory).slice(0, 100),
 }));
}

export function setAssetOverview(assetOverview: AssetOverview) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 assetOverview: normalizeAssetOverview(assetOverview),
 }));
}

export function setAssetRecords(assetRecords: AssetRecord[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 assetRecords: normalizeAssetRecords(assetRecords),
 }));
}

export function appendAssetRecord(record: AssetRecord) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 assetRecords: normalizeAssetRecords([record, ...current.assetRecords]),
 }));
}

export function setGallery(gallery: GalleryHouse[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 gallery,
 }));
}

export function setLands(lands: OwnedLot[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 lands: normalizeLands(lands),
 }));
}

export function setBindings(bindings: HouseLotBinding[]) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 bindings: normalizeBindings(bindings),
 }));
}

export function upsertDraftProject(draft: DraftProject) {
 return updateAssetStore((current): DbAssetStore => {
 const exists = current.draftProjects.some((item) => item.id === draft.id);
 const nextDrafts: DraftProject[] = exists
 ? current.draftProjects.map((item): DraftProject =>
 item.id === draft.id ? { ...draft, status: normalizeDraftStatus(draft.status) } : item
 )
 : [{ ...draft, status: normalizeDraftStatus(draft.status) }, ...current.draftProjects];

 return {
 ...current,
 draftProjects: normalizeDraftProjects(nextDrafts),
 };
 });
}

export function removeDraftProject(draftId: number) {
 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 draftProjects: current.draftProjects.filter((item) => item.id !== draftId),
 generationHistory: current.generationHistory.filter((item) => item.draftId !== draftId),
 }));
}

export function markDraftStatus(draftId: number, status: DraftProjectStatus) {
 return updateAssetStore((current): DbAssetStore => {
 const nextDrafts: DraftProject[] = current.draftProjects.map(
 (item): DraftProject =>
 item.id === draftId
 ? {
 ...item,
 status,
 updatedAt: Date.now(),
 }
 : item
 );

 return {
 ...current,
 draftProjects: nextDrafts,
 };
 });
}

export function commitBuildHouse(params: {
 plotId: string;
 lotId: string;
 house: GalleryHouse;
 costDb: number;
 draftSignature?: string;
 titleZh: string;
 titleEn: string;
}) {
 const safeLotId = normalizeLotId(params.lotId);

 return updateAssetStore((current): DbAssetStore => {
 const alreadyBuilt = current.bindings.some(
 (item) => item.plotId === params.plotId && normalizeLotId(item.lotId) === safeLotId
 );

 if (alreadyBuilt) return current;

 const binding: HouseLotBinding = {
 plotId: params.plotId,
 lotId: safeLotId,
 houseId: params.house.id,
 title: params.house.title,
 image: params.house.image,
 boundAt: Date.now(),
 };

 const nextOverview: AssetOverview = {
 ...current.assetOverview,
 availableBalanceDb: Math.max(
 0,
 current.assetOverview.availableBalanceDb - params.costDb
 ),
 houseValueDb: current.assetOverview.houseValueDb + params.costDb,
 dailyChangePercent: current.assetOverview.dailyChangePercent + 0.1,
 };

 const newRecord: AssetRecord = {
 id: Date.now(),
 type: "build_house",
 titleZh: params.titleZh,
 titleEn: params.titleEn,
 amountDb: -params.costDb,
 balanceAfterDb: Math.max(
 0,
 current.assetOverview.availableBalanceDb - params.costDb
 ),
 status: "success",
 createdAt: new Date().toISOString(),
 };

 const nextDraftProjects: DraftProject[] = current.draftProjects.map(
 (item): DraftProject =>
 item.signature === params.draftSignature
 ? {
 ...item,
 status: "built",
 updatedAt: Date.now(),
 }
 : item
 );

 return {
 ...current,
 gallery: [params.house, ...current.gallery],
 bindings: [...current.bindings, binding],
 assetOverview: nextOverview,
 assetRecords: normalizeAssetRecords([newRecord, ...current.assetRecords]),
 draftProjects: nextDraftProjects,
 };
 });
}

export function commitBuyLand(params: {
 plotId: string;
 lotId: string;
 purchasePriceDb?: number;
 titleZh: string;
 titleEn: string;
}) {
 const safeLotId = normalizeLotId(params.lotId);

 return updateAssetStore((current): DbAssetStore => {
 const exists = current.lands.some(
 (item) => item.plotId === params.plotId && normalizeLotId(item.lotId) === safeLotId
 );
 if (exists) return current;

 const cost = params.purchasePriceDb ?? 0;
 const nextLands: OwnedLot[] = [
 {
 plotId: params.plotId,
 lotId: safeLotId,
 acquiredAt: Date.now(),
 purchasePriceDb: params.purchasePriceDb,
 },
 ...current.lands,
 ];

 const nextOverview: AssetOverview = {
 ...current.assetOverview,
 availableBalanceDb: Math.max(0, current.assetOverview.availableBalanceDb - cost),
 landValueDb: current.assetOverview.landValueDb + cost,
 };

 const newRecord: AssetRecord = {
 id: Date.now(),
 type: "buy_land",
 titleZh: params.titleZh,
 titleEn: params.titleEn,
 amountDb: -cost,
 balanceAfterDb: Math.max(0, current.assetOverview.availableBalanceDb - cost),
 status: "success",
 createdAt: new Date().toISOString(),
 };

 return {
 ...current,
 lands: nextLands,
 assetOverview: nextOverview,
 assetRecords: normalizeAssetRecords([newRecord, ...current.assetRecords]),
 };
 });
}

export function commitDemolishHouse(params: {
 plotId: string;
 lotId: string;
}) {
 const safeLotId = normalizeLotId(params.lotId);

 return updateAssetStore((current): DbAssetStore => ({
 ...current,
 bindings: current.bindings.filter(
 (item) =>
 !(
 item.plotId === params.plotId &&
 normalizeLotId(item.lotId) === safeLotId
 )
 ),
 }));
}