export type Language = "zh" | "en";

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
};

export type OwnedLot = {
 plotId: string;
 lotId: string;
 acquiredAt: number;
 purchasePriceDb?: number;
};

export type HouseItemLite = {
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

export type HouseLotBinding = {
 plotId: string;
 lotId: string;
 houseId: number;
 title: string;
 image: string;
 boundAt: number;
};

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

export type AssetRecord = {
 id: number;
 type: string;
 titleZh: string;
 titleEn: string;
 amountDb: number;
 balanceAfterDb: number;
 status: "success" | "pending" | "failed";
 createdAt: string;
};

export const MARKET_LISTINGS_STORAGE_KEY = "db_market_listings";
export const MARKET_TRADE_RECORDS_STORAGE_KEY = "db_market_trade_records";
export const LANGUAGE_STORAGE_KEY = "db_selected_language";

export const OWNED_LOTS_STORAGE_KEY = "db_owned_lots";
export const PURCHASED_PROPERTIES_STORAGE_KEY = "db_purchased_properties";
export const HOUSE_LOT_BINDINGS_STORAGE_KEY = "db_house_lot_bindings";
export const GALLERY_STORAGE_KEY = "db_gallery";
export const ASSET_OVERVIEW_STORAGE_KEY = "db_asset_overview";
export const ASSET_RECORDS_STORAGE_KEY = "db_asset_records";

export const EXCHANGE_DATA_UPDATED_EVENT = "dreambuilder-exchange-data-updated";

const DEFAULT_ASSET_OVERVIEW: AssetOverview = {
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

export function readJsonArray<T>(key: string): T[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? (parsed as T[]) : [];
 } catch {
 return [];
 }
}

export function writeJsonArray<T>(key: string, value: T[]) {
 if (typeof window === "undefined") return;
 localStorage.setItem(key, JSON.stringify(value));
}

export function readJsonObject<T>(key: string, fallback: T): T {
 if (typeof window === "undefined") return fallback;
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return fallback;
 const parsed = JSON.parse(raw);
 return parsed && typeof parsed === "object" ? ({ ...fallback, ...parsed } as T) : fallback;
 } catch {
 return fallback;
 }
}

export function writeJsonObject<T>(key: string, value: T) {
 if (typeof window === "undefined") return;
 localStorage.setItem(key, JSON.stringify(value));
}

export function emitExchangeDataUpdated() {
 if (typeof window === "undefined") return;
 window.dispatchEvent(new Event(EXCHANGE_DATA_UPDATED_EVENT));
}

export function loadMarketListings(): MarketListing[] {
 return readJsonArray<MarketListing>(MARKET_LISTINGS_STORAGE_KEY);
}

export function saveMarketListings(listings: MarketListing[]) {
 writeJsonArray(MARKET_LISTINGS_STORAGE_KEY, listings);
}

export function loadMarketTradeRecords(): MarketTradeRecord[] {
 return readJsonArray<MarketTradeRecord>(MARKET_TRADE_RECORDS_STORAGE_KEY);
}

export function saveMarketTradeRecords(records: MarketTradeRecord[]) {
 writeJsonArray(MARKET_TRADE_RECORDS_STORAGE_KEY, records);
}

export function loadOwnedLots(): OwnedLot[] {
 return readJsonArray<OwnedLot>(OWNED_LOTS_STORAGE_KEY);
}

export function saveOwnedLots(lots: OwnedLot[]) {
 writeJsonArray(OWNED_LOTS_STORAGE_KEY, lots);
}

export function loadPurchasedProperties(): PurchasedProperty[] {
 return readJsonArray<PurchasedProperty>(PURCHASED_PROPERTIES_STORAGE_KEY);
}

export function savePurchasedProperties(properties: PurchasedProperty[]) {
 writeJsonArray(PURCHASED_PROPERTIES_STORAGE_KEY, properties);
}

export function loadHouseLotBindings(): HouseLotBinding[] {
 return readJsonArray<HouseLotBinding>(HOUSE_LOT_BINDINGS_STORAGE_KEY);
}

export function saveHouseLotBindings(bindings: HouseLotBinding[]) {
 writeJsonArray(HOUSE_LOT_BINDINGS_STORAGE_KEY, bindings);
}

export function loadGalleryHouses(): HouseItemLite[] {
 return readJsonArray<HouseItemLite>(GALLERY_STORAGE_KEY);
}

export function saveGalleryHouses(houses: HouseItemLite[]) {
 writeJsonArray(GALLERY_STORAGE_KEY, houses);
}

export function loadAssetOverview(): AssetOverview {
 return readJsonObject<AssetOverview>(
 ASSET_OVERVIEW_STORAGE_KEY,
 DEFAULT_ASSET_OVERVIEW
 );
}

export function saveAssetOverview(overview: AssetOverview) {
 writeJsonObject(ASSET_OVERVIEW_STORAGE_KEY, overview);
}

export function loadAssetRecords(): AssetRecord[] {
 return readJsonArray<AssetRecord>(ASSET_RECORDS_STORAGE_KEY);
}

export function saveAssetRecords(records: AssetRecord[]) {
 writeJsonArray(ASSET_RECORDS_STORAGE_KEY, records);
}

export function getStoredLanguage(): Language {
 if (typeof window === "undefined") return "zh";
 const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
 return saved === "en" ? "en" : "zh";
}

export function formatDateTime(iso: string | number, language: Language) {
 const date = new Date(iso);
 if (Number.isNaN(date.getTime())) return "-";
 return language === "zh"
 ? date.toLocaleString("zh-CN")
 : date.toLocaleString("en-US");
}

export function formatDbAmount(amount: number) {
 return `${amount.toLocaleString("en-US")} DB`;
}

export function sortListingsByLatest(listings: MarketListing[]) {
 return [...listings].sort(
 (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
 );
}

export function sortTradesByLatest(records: MarketTradeRecord[]) {
 return [...records].sort(
 (a, b) => new Date(b.tradedAt).getTime() - new Date(a.tradedAt).getTime()
 );
}

export function getLandListings(listings: MarketListing[]) {
 return listings.filter((item) => item.assetType === "land");
}

export function getPropertyListings(listings: MarketListing[]) {
 return listings.filter((item) => item.assetType === "property");
}

export function getTotalListingValue(listings: MarketListing[]) {
 return listings.reduce((sum, item) => sum + item.priceDb, 0);
}

export function getExchangeSnapshot() {
 const listings = loadMarketListings();
 const trades = loadMarketTradeRecords();
 const language = getStoredLanguage();

 const landListings = getLandListings(listings);
 const propertyListings = getPropertyListings(listings);

 return {
 language,
 listings,
 trades,
 landListings,
 propertyListings,
 totalListingValue: getTotalListingValue(listings),
 latestListings: sortListingsByLatest(listings),
 latestTrades: sortTradesByLatest(trades),
 };
}