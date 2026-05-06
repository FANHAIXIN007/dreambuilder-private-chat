export type Language = "zh" | "en";

export type Point2D = {
 x: number;
 y: number;
};

export type Rect2D = {
 x: number;
 y: number;
 width: number;
 height: number;
};

export type DesignLevel = "basic" | "standard" | "pro";

export type DesignStyle =
 | "modern"
 | "minimal"
 | "nordic"
 | "wabi-sabi"
 | "japandi"
 | "classical"
 | "luxury"
 | "mediterranean";

export type RoofType =
 | "flat"
 | "gable"
 | "hip"
 | "shed"
 | "mansard"
 | "vault"
 | "mixed";

export type HouseUsageType =
 | "residential"
 | "villa"
 | "townhouse"
 | "homestay"
 | "studio"
 | "mixed_use";

export type BudgetLevel = "economy" | "standard" | "premium";

export type KitchenType = "open" | "semi-open" | "closed";

export type CurrencyType = "EUR" | "USD" | "CNY";

export type ProjectUseType =
 | "self_use"
 | "rental"
 | "homestay"
 | "investment";

export type OrientationType =
 | "south"
 | "east"
 | "west"
 | "north"
 | "south_east"
 | "south_west";

export type TerrainType =
 | "plain"
 | "slope"
 | "cliff"
 | "forest_edge"
 | "coastal";

export type ArchitecturalStyleType =
 | "modern_minimal"
 | "contemporary_luxury"
 | "nordic"
 | "mediterranean"
 | "new_chinese"
 | "japanese"
 | "classic_european";

export type WindowStyleType =
 | "large_glass_modern"
 | "framed_classic"
 | "slim_dark_frame"
 | "warm_wood_frame";

export type ToneType =
 | "warm_gray"
 | "cool_gray"
 | "beige_white"
 | "wood_earth"
 | "black_white";

export type FacadeMaterialType =
 | "stone_paint"
 | "stone_panel"
 | "wood_finish"
 | "face_brick"
 | "aluminum_panel"
 | "micro_cement";

export type RoomType =
 | "living"
 | "dining"
 | "kitchen"
 | "bedroom"
 | "master_bedroom"
 | "child_bedroom"
 | "guest_bedroom"
 | "bathroom"
 | "master_bathroom"
 | "public_bathroom"
 | "study"
 | "office"
 | "storage"
 | "laundry"
 | "balcony"
 | "corridor"
 | "foyer"
 | "garage"
 | "utility"
 | "stair"
 | "cloakroom"
 | "terrace"
 | "other";

export type DoorType =
 | "single"
 | "double"
 | "sliding"
 | "folding"
 | "entrance"
 | "balcony";

export type WindowType =
 | "casement"
 | "sliding"
 | "fixed"
 | "bay"
 | "floor_to_ceiling"
 | "awning";

export type WallType =
 | "exterior"
 | "interior"
 | "bearing"
 | "partition"
 | "glass";

export type DrawingScale = "1:50" | "1:75" | "1:100" | "1:150" | "1:200";

/* ---------------------------
 * 正式版表单类型（旧组件在用）
 * --------------------------- */

export type HouseDesignBrief = {
 projectName: string;
 language: Language;
 site: {
 country: string;
 city: string;
 plotArea: number;
 buildAreaTarget: number;
 floors: number;
 orientation: OrientationType;
 terrain: TerrainType;
 };
 requirements: {
 projectUse: ProjectUseType;
 residents: number;
 bedrooms: number;
 livingRooms: number;
 bathrooms: number;
 showerRooms: number;
 bathtubBathrooms: number;
 walkInClosets: number;
 homeTheaters: number;
 kitchenType: KitchenType;
 needDiningRoom: boolean;
 needStudy: boolean;
 needLaundry: boolean;
 needStorage: boolean;
 needGarage: boolean;
 needTerrace: boolean;
 needBalcony: boolean;
 needGarden: boolean;
 needPool: boolean;
 childFriendly: boolean;
 elderlyFriendly: boolean;
 barrierFree: boolean;
 };
 style: {
 architecturalStyle: ArchitecturalStyleType;
 roofType: RoofType;
 windowStyle: WindowStyleType;
 tone: ToneType;
 facadeMaterials: FacadeMaterialType[];
 };
 preferences: {
 budgetLevel: BudgetLevel;
 totalBudget: number;
 currency: CurrencyType;
 prioritizeCostControl: boolean;
 prioritizeView: boolean;
 prioritizePrivacy: boolean;
 prioritizeDaylight: boolean;
 needSolar: boolean;
 needFloorHeating: boolean;
 needFreshAirSystem: boolean;
 needSmartHome: boolean;
 };
};

export const DEFAULT_DESIGN_BRIEF: HouseDesignBrief = {
 projectName: "DreamBuilder Design Studio",
 language: "zh",
 site: {
 country: "Portugal",
 city: "Lisbon",
 plotArea: 260,
 buildAreaTarget: 168,
 floors: 2,
 orientation: "south",
 terrain: "plain",
 },
 requirements: {
 projectUse: "self_use",
 residents: 3,
 bedrooms: 3,
 livingRooms: 1,
 bathrooms: 2,
 showerRooms: 1,
 bathtubBathrooms: 1,
 walkInClosets: 1,
 homeTheaters: 0,
 kitchenType: "open",
 needDiningRoom: true,
 needStudy: true,
 needLaundry: true,
 needStorage: true,
 needGarage: false,
 needTerrace: true,
 needBalcony: true,
 needGarden: true,
 needPool: false,
 childFriendly: false,
 elderlyFriendly: false,
 barrierFree: false,
 },
 style: {
 architecturalStyle: "modern_minimal",
 roofType: "gable",
 windowStyle: "large_glass_modern",
 tone: "warm_gray",
 facadeMaterials: ["stone_paint", "wood_finish"],
 },
 preferences: {
 budgetLevel: "standard",
 totalBudget: 260000,
 currency: "EUR",
 prioritizeCostControl: false,
 prioritizeView: true,
 prioritizePrivacy: true,
 prioritizeDaylight: true,
 needSolar: false,
 needFloorHeating: false,
 needFreshAirSystem: false,
 needSmartHome: false,
 },
};

/* ---------------------------
 * 兼容旧 page.tsx 的通用平面数据类型
 * --------------------------- */

export type RoomGeometry = {
 polygon: Point2D[];
 center: Point2D;
 bounds: Rect2D;
};

export type FloorRoom = {
 id: string;
 code: string;
 nameZh: string;
 nameEn: string;
 area: number;
 type?: RoomType;
 floor?: number;
 noteZh?: string;
 noteEn?: string;
 geometry?: RoomGeometry;
 x?: number;
 y?: number;
 w?: number;
 h?: number;
};

export type FloorPlan = {
 floorIndex: number;
 floorNameZh: string;
 floorNameEn: string;
 rooms: FloorRoom[];
 totalArea: number;
};

/* ---------------------------
 * 几何联动图纸类型（你现在要用）
 * --------------------------- */

export type RoomItem = {
 id: string;
 code: string;
 nameZh: string;
 nameEn: string;
 type: RoomType;
 floor: number;
 area: number;
 width?: number;
 depth?: number;
 clearHeight?: number;
 geometry: RoomGeometry;
 notes?: string;
};

export type DoorItem = {
 id: string;
 code: string;
 type: DoorType;
 floor: number;
 width: number;
 height: number;
 position: Point2D;
 rotation: number;
 fromRoomId?: string;
 toRoomId?: string;
 notes?: string;
};

export type WindowItem = {
 id: string;
 code: string;
 type: WindowType;
 floor: number;
 width: number;
 height: number;
 sillHeight?: number;
 position: Point2D;
 rotation: number;
 roomId?: string;
 notes?: string;
};

export type WallItem = {
 id: string;
 floor: number;
 type: WallType;
 start: Point2D;
 end: Point2D;
 thickness: number;
};

export type AxisLine = {
 id: string;
 label: string;
 orientation: "horizontal" | "vertical";
 value: number;
};

export type FloorplanFloor = {
 floor: number;
 titleZh: string;
 titleEn: string;
 width: number;
 height: number;
 outerPolygon: Point2D[];
 rooms: RoomItem[];
 doors: DoorItem[];
 windows: WindowItem[];
 walls: WallItem[];
 axisX: AxisLine[];
 axisY: AxisLine[];
};

export type ElevationFace = "south" | "north" | "east" | "west";

export type ElevationItem = {
 face: ElevationFace;
 titleZh: string;
 titleEn: string;
 width: number;
 height: number;
 ridgeHeight: number;
 doors: DoorItem[];
 windows: WindowItem[];
};

export type SectionItem = {
 id: string;
 code: string;
 titleZh: string;
 titleEn: string;
 width: number;
 height: number;
 cutLine: Point2D[];
};

/* ---------------------------
 * 材料 / 预算 / 输出包
 * --------------------------- */

export type MaterialItem = {
 category:
 | "structure"
 | "facade"
 | "roof"
 | "doors_windows"
 | "interior"
 | "mep"
 | string;
 name: string;
 specification: string;
 unit: string;
 quantity: number;
 unitPrice: number;
 totalPrice: number;
 brandLevel: BudgetLevel;
 notes?: string;
};

export type BudgetBreakdownItem = {
 key: string;
 labelZh: string;
 labelEn: string;
 value: number;
 ratio: number;
};

export type BudgetSummary = {
 structureCost: number;
 facadeCost: number;
 roofCost: number;
 doorsWindowsCost: number;
 interiorCost: number;
 mepCost: number;
 landscapingCost: number;
 totalCost: number;
 costPerSqm: number;
 currency: CurrencyType;
 breakdown: BudgetBreakdownItem[];
};

export type MaterialsSummary = {
 structure: MaterialItem[];
 facade: MaterialItem[];
 roof: MaterialItem[];
 doorsWindows: MaterialItem[];
 interior: MaterialItem[];
 mep: MaterialItem[];
};

export type HouseDesignPackage = {
 id: string;
 projectName: string;
 language: Language;
 createdAt: string;
 site: HouseDesignBrief["site"];
 requirements: HouseDesignBrief["requirements"];
 style: HouseDesignBrief["style"];
 preferences: HouseDesignBrief["preferences"];
 summaryZh: string;
 summaryEn: string;
 floorPlans: FloorPlan[];
 floorplans?: FloorplanFloor[];
 materials: MaterialsSummary;
 budget: BudgetSummary;
 elevations?: ElevationItem[];
 sections?: SectionItem[];
 schedules?: DrawingScheduleData;
};

/* ---------------------------
 * 精简设计简报 / 设计结果（新图纸链路）
 * --------------------------- */

export type DesignBrief = {
 projectName: string;
 clientName?: string;
 location?: string;
 language: Language;
 level: DesignLevel;
 style: DesignStyle;
 houseUsage: HouseUsageType;
 floors: number;
 siteWidth: number;
 siteDepth: number;
 grossArea: number;
 budget?: number;
 bedrooms: number;
 bathrooms: number;
 garageSpots?: number;
 roofType: RoofType;
 requirements?: string[];
};

export type DrawingScheduleRoomRow = {
 id: string;
 code: string;
 floor: number;
 nameZh: string;
 nameEn: string;
 type: RoomType;
 area: number;
 centerX: number;
 centerY: number;
 polygonText: string;
};

export type DrawingScheduleDoorRow = {
 id: string;
 code: string;
 floor: number;
 type: DoorType;
 width: number;
 height: number;
 fromRoomCode?: string;
 toRoomCode?: string;
};

export type DrawingScheduleWindowRow = {
 id: string;
 code: string;
 floor: number;
 type: WindowType;
 width: number;
 height: number;
 sillHeight?: number;
 roomCode?: string;
};

export type DrawingScheduleData = {
 rooms: DrawingScheduleRoomRow[];
 doors: DrawingScheduleDoorRow[];
 windows: DrawingScheduleWindowRow[];
};

export type DesignResult = {
 id: string;
 projectName: string;
 brief: DesignBrief;
 floorplans: FloorplanFloor[];
 elevations: ElevationItem[];
 sections: SectionItem[];
 schedules: DrawingScheduleData;
 createdAt: string;
};