"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DreamWorldMap from "./components/DreamWorldMap";
import type { HouseItem } from "./components/DetailModal";
import ImmersiveHouseDetailModal from "./components/ImmersiveHouseDetailModal";
import QuickCreatePanel from "./components/QuickCreatePanel";
import GenerationStatus from "./components/GenerationStatus";
import GeneratedPreview from "./components/GeneratedPreview";
import MyDraftsPanel from "./components/MyDraftsPanel";
import RealEstateExchangePreview from "./components/RealEstateExchangePreview";
import WorldHallOfHonor from "./components/WorldHallOfHonor";
import ConnectWalletButton from "@/app/components/auth/ConnectWalletButton";
import BuildSuccessModal from "./components/BuildSuccessModal";
import {
 APP_DATA_SYNC_EVENT,
 DEFAULT_ASSET_OVERVIEW,
 DEFAULT_ASSET_RECORDS,
 loadAssetStore,
 normalizeLotId,
 saveAssetStore,
 type AssetOverview,
 type AssetRecord,
 type DraftProject,
 type GenerationHistoryItem,
 type HouseLotBinding,
 type OwnedLot,
 type PurchasedProperty,
 type SavedDesign,
} from "@/app/lib/dbAssetStore";

type Language = "zh" | "en";
type CurrencyType = "CNY" | "USD" | "USDT" | "BTC";
type RenderQuality = "low" | "medium" | "high";
type LotStatusType = "owned_unbuilt" | "building" | "built";
type SelectedBuildView = "scheme1" | "scheme2" | "scheme3" | "scheme4";

const RENDER_QUALITY_COST_DB: Record<RenderQuality, number> = {
 low: 500,
 medium: 1500,
 high: 4000,
};

type OptionKey =
 | "rooms"
 | "style"
 | "floors"
 | "houseType"
 | "facade"
 | "roof"
 | "roofColor"
 | "scene"
 | "tone"
 | "garage"
 | "season";

type MarketRates = {
 USD: number;
 CNY: number;
 USDT: number;
 BTC: number;
};

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
 views?: {
 main?: string;
 side?: string;
 aerial?: string;
 night?: string;
 };
};

type OptionItem = {
 key: string;
 zh: string;
 en: string;
};

type BuildableOwnedLot = {
 plotId: string;
 lotId: string;
 labelZh: string;
 labelEn: string;
};

type BuildResult = {
 success: boolean;
 message: string;
};

type BuildSuccessState = {
 visible: boolean;
 plotId: string;
 lotId: string;
 lotLabel: string;
 houseTitle: string;
 houseImage: string;
 lotStatus: LotStatusType;
};

const CURRENCY_STORAGE_KEY = "db_selected_currency";
const LANGUAGE_STORAGE_KEY = "db_selected_language";
const LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY =
 "db_last_preferred_generated_house";
const PENDING_UNSAVE_SIGNATURES_STORAGE_KEY = "db_pending_unsave_signatures";

const OPTION_CONFIG: Record<OptionKey, OptionItem[]> = {
 rooms: [
 { key: "1", zh: "1室", en: "1 Room" },
 { key: "2", zh: "2室", en: "2 Rooms" },
 { key: "3", zh: "3室", en: "3 Rooms" },
 { key: "4plus", zh: "4室+", en: "4+ Rooms" },
 ],
 style: [
 { key: "modern", zh: "现代", en: "Modern" },
 { key: "european", zh: "欧式", en: "European" },
 { key: "chinese", zh: "中式", en: "Chinese" },
 { key: "american", zh: "美式", en: "American" },
 ],
 floors: [
 { key: "1", zh: "1层", en: "1 Floor" },
 { key: "2", zh: "2层", en: "2 Floors" },
 { key: "3", zh: "3层", en: "3 Floors" },
 ],
 houseType: [
 { key: "detached", zh: "独栋", en: "Detached" },
 { key: "semi_detached", zh: "双拼", en: "Semi-detached" },
 { key: "townhouse", zh: "联排", en: "Townhouse" },
 { key: "courtyard", zh: "庭院住宅", en: "Courtyard House" },
 ],
 facade: [
 { key: "glass", zh: "玻璃", en: "Glass" },
 { key: "wood", zh: "木质", en: "Wood" },
 { key: "stone", zh: "石材", en: "Stone" },
 { key: "concrete", zh: "混凝土", en: "Concrete" },
 { key: "white_wall", zh: "白墙", en: "White Wall" },
 ],
 roof: [
 { key: "flat", zh: "平屋顶", en: "Flat Roof" },
 { key: "sloped", zh: "坡屋顶", en: "Sloped Roof" },
 { key: "gable", zh: "人字顶", en: "Gable Roof" },
 ],
 roofColor: [
 { key: "black", zh: "黑色", en: "Black" },
 { key: "dark_gray", zh: "深灰", en: "Dark Gray" },
 { key: "brick_red", zh: "砖红", en: "Brick Red" },
 { key: "deep_blue", zh: "深蓝", en: "Deep Blue" },
 { key: "brown", zh: "咖啡色", en: "Brown" },
 ],
 scene: [
 { key: "city", zh: "城市", en: "City" },
 { key: "suburb", zh: "郊区", en: "Suburb" },
 { key: "mountain", zh: "山地", en: "Mountain" },
 { key: "seaside", zh: "海边", en: "Seaside" },
 { key: "forest", zh: "森林", en: "Forest" },
 ],
 tone: [
 { key: "light", zh: "浅色", en: "Light" },
 { key: "dark", zh: "深色", en: "Dark" },
 { key: "warm", zh: "温暖", en: "Warm" },
 { key: "cool", zh: "冷淡", en: "Cool Minimal" },
 ],
 garage: [
 { key: "with", zh: "有车库", en: "With Garage" },
 { key: "without", zh: "无车库", en: "Without Garage" },
 ],
 season: [
 { key: "spring", zh: "春", en: "Spring" },
 { key: "summer", zh: "夏", en: "Summer" },
 { key: "autumn", zh: "秋", en: "Autumn" },
 { key: "winter", zh: "冬", en: "Winter" },
 ],
};

const INITIAL_GALLERY_HOUSES: HouseItem[] = [
 {
 id: 1,
 title: "Modern Dream House",
 author: "Alex",
 styleZh: "现代",
 styleEn: "Modern",
 likes: 128,
 saves: 56,
 liked: false,
 saved: false,
 image: "/houses/gallery/modern-gallery-01.jpg",
 plotZh: "内陆平原",
 plotEn: "Inland Plain",
 },
 {
 id: 2,
 title: "European Villa",
 author: "Lina",
 styleZh: "欧式",
 styleEn: "European",
 likes: 143,
 saves: 77,
 liked: false,
 saved: false,
 image: "/houses/gallery/european-gallery-01.jpg",
 plotZh: "城市地块",
 plotEn: "City Plot",
 },
 {
 id: 3,
 title: "Oriental Courtyard",
 author: "Chen",
 styleZh: "中式",
 styleEn: "Chinese",
 likes: 88,
 saves: 66,
 liked: false,
 saved: false,
 image: "/houses/gallery/chinese-gallery-01.jpg",
 plotZh: "山林地块",
 plotEn: "Forest Plot",
 },
 {
 id: 4,
 title: "American Family Home",
 author: "Mia",
 styleZh: "美式",
 styleEn: "American",
 likes: 11,
 saves: 16,
 liked: false,
 saved: false,
 image: "/houses/gallery/american-gallery-01.jpg",
 plotZh: "城镇郊区",
 plotEn: "Town Suburb",
 },
];

const GENERATED_OPTIONS: GeneratedOption[] = [
 {
 title: "Modern Dream House",
 styleZh: "现代风格",
 styleEn: "Modern Style",
 area: "120㎡",
 roomsZh: "3室2厅",
 roomsEn: "3 Bedrooms, 2 Living Areas",
 budgetZh: "20万–35万",
 budgetEn: "200k–350k RMB",
 durationZh: "4–6个月",
 durationEn: "4–6 months",
 image: "/houses/generated/modern-01.jpg",
 descriptionZh:
 "这是一套偏现代极简风格的住宅方案，强调大面积采光、开放式客厅和简洁干净的建筑线条，适合年轻家庭居住。",
 descriptionEn:
 "This modern minimalist residential concept emphasizes natural light, open living space, and clean architectural lines, making it ideal for young families.",
 floorsZh: "2层",
 floorsEn: "2 Floors",
 houseTypeZh: "独栋",
 houseTypeEn: "Detached",
 facadeZh: "玻璃",
 facadeEn: "Glass",
 roofZh: "平屋顶",
 roofEn: "Flat Roof",
 roofColorZh: "深灰",
 roofColorEn: "Dark Gray",
 sceneZh: "郊区",
 sceneEn: "Suburb",
 toneZh: "浅色",
 toneEn: "Light",
 garageZh: "有车库",
 garageEn: "With Garage",
 seasonZh: "春",
 seasonEn: "Spring",
 plotZh: "内陆平原",
 plotEn: "Inland Plain",
 views: { main: "/houses/generated/modern-01.jpg" },
 },
 {
 title: "European Villa",
 styleZh: "欧式风格",
 styleEn: "European Style",
 area: "180㎡",
 roomsZh: "4室2厅",
 roomsEn: "4 Bedrooms, 2 Living Areas",
 budgetZh: "35万–55万",
 budgetEn: "350k–550k RMB",
 durationZh: "6–8个月",
 durationEn: "6–8 months",
 image: "/houses/generated/european-01.jpg",
 descriptionZh:
 "这是一套欧式别墅方案，强调立面层次感、对称比例和高贵的入口仪式感，适合追求豪华视觉效果的用户。",
 descriptionEn:
 "This European villa concept highlights layered facades, balanced proportions, and a grand entrance experience for users seeking a luxurious visual style.",
 floorsZh: "2层",
 floorsEn: "2 Floors",
 houseTypeZh: "独栋",
 houseTypeEn: "Detached",
 facadeZh: "石材",
 facadeEn: "Stone",
 roofZh: "坡屋顶",
 roofEn: "Sloped Roof",
 roofColorZh: "砖红",
 roofColorEn: "Brick Red",
 sceneZh: "郊区",
 sceneEn: "Suburb",
 toneZh: "温暖",
 toneEn: "Warm",
 garageZh: "有车库",
 garageEn: "With Garage",
 seasonZh: "秋",
 seasonEn: "Autumn",
 plotZh: "城市地块",
 plotEn: "City Plot",
 views: { main: "/houses/generated/european-01.jpg" },
 },
 {
 title: "Oriental Courtyard",
 styleZh: "中式风格",
 styleEn: "Chinese Style",
 area: "150㎡",
 roomsZh: "3室2厅",
 roomsEn: "3 Bedrooms, 2 Living Areas",
 budgetZh: "28万–42万",
 budgetEn: "280k–420k RMB",
 durationZh: "5–7个月",
 durationEn: "5–7 months",
 image: "/houses/generated/chinese-01.jpg",
 descriptionZh:
 "这是一套中式庭院住宅方案，注重围合感、院落氛围和空间层次，适合喜欢东方美学与安静生活方式的用户。",
 descriptionEn:
 "This Chinese courtyard concept focuses on enclosure, layered spaces, and a peaceful atmosphere, ideal for users who appreciate Eastern aesthetics.",
 floorsZh: "1层",
 floorsEn: "1 Floor",
 houseTypeZh: "庭院住宅",
 houseTypeEn: "Courtyard House",
 facadeZh: "木质",
 facadeEn: "Wood",
 roofZh: "人字顶",
 roofEn: "Gable Roof",
 roofColorZh: "黑色",
 roofColorEn: "Black",
 sceneZh: "森林",
 sceneEn: "Forest",
 toneZh: "冷淡",
 toneEn: "Cool Minimal",
 garageZh: "无车库",
 garageEn: "Without Garage",
 seasonZh: "冬",
 seasonEn: "Winter",
 plotZh: "山林地块",
 plotEn: "Forest Plot",
 views: { main: "/houses/generated/chinese-01.jpg" },
 },
 {
 title: "American Family Home",
 styleZh: "美式风格",
 styleEn: "American Style",
 area: "160㎡",
 roomsZh: "4室2厅",
 roomsEn: "4 Bedrooms, 2 Living Areas",
 budgetZh: "30万–48万",
 budgetEn: "300k–480k RMB",
 durationZh: "5–7个月",
 durationEn: "5–7 months",
 image: "/houses/generated/american-01.jpg",
 descriptionZh:
 "这是一套美式家庭住宅方案，强调温暖舒适、实用分区和家庭互动空间，适合三代同堂或有儿童的家庭。",
 descriptionEn:
 "This American family home concept emphasizes warmth, practicality, and family interaction space, making it suitable for larger households.",
 floorsZh: "2层",
 floorsEn: "2 Floors",
 houseTypeZh: "独栋",
 houseTypeEn: "Detached",
 facadeZh: "白墙",
 facadeEn: "White Wall",
 roofZh: "坡屋顶",
 roofEn: "Sloped Roof",
 roofColorZh: "深蓝",
 roofColorEn: "Deep Blue",
 sceneZh: "城市",
 sceneEn: "City",
 toneZh: "温暖",
 toneEn: "Warm",
 garageZh: "有车库",
 garageEn: "With Garage",
 seasonZh: "夏",
 seasonEn: "Summer",
 plotZh: "城镇郊区",
 plotEn: "Town Suburb",
 views: { main: "/houses/generated/american-01.jpg" },
 },
];

const TEXT = {
 zh: {
 navWorld: "世界",
 navCreate: "创建",
 navProfile: "我的",
 generatedPreview: "AI 生成预览",
 budget: "预算",
 duration: "预计工期",
 saveDesign: "❤️ 收藏设计",
 view: "查看",
 createDream: "+ 创建你的梦想之家",
 renderQuality: "生成档次",
 renderQualityDesc: "玩家可按需求选择出图质量与费用档位",
 qualityLow: "体验档",
 qualityMedium: "标准档",
 qualityHigh: "专业档",
 qualityLowDesc: "快速出图",
 qualityMediumDesc: "平衡质量",
 qualityHighDesc: "高精展示",
 qualityLowPrice: "500 DB / 张",
 qualityMediumPrice: "1500 DB / 张",
 qualityHighPrice: "4000 DB / 张",
 insufficientGenerateBalance: "余额不足，无法生成当前档次图片。",
 roomOptions: OPTION_CONFIG.rooms.map((item) => item.zh),
 styleOptions: OPTION_CONFIG.style.map((item) => item.zh),
 floorOptions: OPTION_CONFIG.floors.map((item) => item.zh),
 houseTypeOptions: OPTION_CONFIG.houseType.map((item) => item.zh),
 facadeOptions: OPTION_CONFIG.facade.map((item) => item.zh),
 roofOptions: OPTION_CONFIG.roof.map((item) => item.zh),
 roofColorOptions: OPTION_CONFIG.roofColor.map((item) => item.zh),
 sceneOptions: OPTION_CONFIG.scene.map((item) => item.zh),
 toneOptions: OPTION_CONFIG.tone.map((item) => item.zh),
 garageOptions: OPTION_CONFIG.garage.map((item) => item.zh),
 seasonOptions: OPTION_CONFIG.season.map((item) => item.zh),
 },
 en: {
 navWorld: "World",
 navCreate: "Create",
 navProfile: "Profile",
 generatedPreview: "AI Generated Preview",
 budget: "Budget",
 duration: "Estimated Duration",
 saveDesign: "❤️ Save Design",
 view: "View",
 createDream: "+ Create Your Dream",
 renderQuality: "Render Tier",
 renderQualityDesc: "Choose image quality and cost level",
 qualityLow: "Basic",
 qualityMedium: "Standard",
 qualityHigh: "Pro",
 qualityLowDesc: "Fast preview",
 qualityMediumDesc: "Balanced quality",
 qualityHighDesc: "High fidelity",
 qualityLowPrice: "500 DB / image",
 qualityMediumPrice: "1500 DB / image",
 qualityHighPrice: "4000 DB / image",
 insufficientGenerateBalance: "Insufficient balance for this render tier.",
 roomOptions: OPTION_CONFIG.rooms.map((item) => item.en),
 styleOptions: OPTION_CONFIG.style.map((item) => item.en),
 floorOptions: OPTION_CONFIG.floors.map((item) => item.en),
 houseTypeOptions: OPTION_CONFIG.houseType.map((item) => item.en),
 facadeOptions: OPTION_CONFIG.facade.map((item) => item.en),
 roofOptions: OPTION_CONFIG.roof.map((item) => item.en),
 roofColorOptions: OPTION_CONFIG.roofColor.map((item) => item.en),
 sceneOptions: OPTION_CONFIG.scene.map((item) => item.en),
 toneOptions: OPTION_CONFIG.tone.map((item) => item.en),
 garageOptions: OPTION_CONFIG.garage.map((item) => item.en),
 seasonOptions: OPTION_CONFIG.season.map((item) => item.en),
 },
};

const UI = {
 btnPrimary:
 "rounded-2xl bg-neutral-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:bg-black hover:shadow-[0_18px_36px_rgba(0,0,0,0.26)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_8px_18px_rgba(0,0,0,0.18)] focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
 btnSecondary:
 "rounded-2xl border border-neutral-200 bg-white text-neutral-700 shadow-[0_6px_16px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 hover:shadow-[0_14px_28px_rgba(0,0,0,0.12)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_6px_14px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
 btnSmallActive:
 "rounded-xl bg-neutral-900 text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-black hover:shadow-[0_12px_24px_rgba(0,0,0,0.22)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
 btnSmallIdle:
 "rounded-xl bg-neutral-100 text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-200 hover:text-neutral-900 hover:shadow-[0_10px_20px_rgba(0,0,0,0.12)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
 btnNav:
 "rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-600 shadow-[0_5px_14px_rgba(0,0,0,0.06)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 hover:shadow-[0_12px_24px_rgba(0,0,0,0.10)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2",
};

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

function getOptionLabel(type: OptionKey, key: string, language: Language) {
 const option = OPTION_CONFIG[type].find((item) => item.key === key);
 return option ? (language === "zh" ? option.zh : option.en) : "";
}

function getOptionZh(type: OptionKey, key: string) {
 return getOptionLabel(type, key, "zh");
}

function getOptionEn(type: OptionKey, key: string) {
 return getOptionLabel(type, key, "en");
}

function getFullPlotLotLabel(plotId: string, lotId: string, lang: Language): string {
 if (!plotId) return "";
 const plotCode = plotId.replace("plot-", "");
 const safeLotId = normalizeLotId(lotId);
 if (!safeLotId) {
 return lang === "zh" ? `地块 ${plotCode}` : `Plot ${plotCode}`;
 }
 const lotNumber = Number.parseInt(safeLotId.replace("lot-", ""), 10);
 const safeLot = Number.isNaN(lotNumber)
 ? safeLotId.replace("lot-", "")
 : String(lotNumber);
 return lang === "zh" ? `地块 ${plotCode}-${safeLot}` : `Plot ${plotCode}-${safeLot}`;
}

function getStyleMeta(styleKey: string) {
 if (styleKey === "modern") {
 return {
 title: "Modern Dream House",
 styleEn: "Modern Style",
 styleZh: "现代风格",
 styleCardEn: "Modern",
 styleCardZh: "现代",
 };
 }
 if (styleKey === "european") {
 return {
 title: "European Villa",
 styleEn: "European Style",
 styleZh: "欧式风格",
 styleCardEn: "European",
 styleCardZh: "欧式",
 };
 }
 if (styleKey === "chinese") {
 return {
 title: "Oriental Courtyard",
 styleEn: "Chinese Style",
 styleZh: "中式风格",
 styleCardEn: "Chinese",
 styleCardZh: "中式",
 };
 }
 return {
 title: "American Family Home",
 styleEn: "American Style",
 styleZh: "美式风格",
 styleCardEn: "American",
 styleCardZh: "美式",
 };
}

function buildGeneratedHouse(params: {
 previous: GeneratedOption;
 imageUrl: string;
 styleKey: string;
 roomsKey: string;
 area: string;
 floorsKey: string;
 houseTypeKey: string;
 facadeKey: string;
 roofKey: string;
 roofColorKey: string;
 sceneKey: string;
 toneKey: string;
 garageKey: string;
 seasonKey: string;
 selectedPlotLabelZh: string;
 selectedPlotLabelEn: string;
}) {
 const {
 previous,
 imageUrl,
 styleKey,
 roomsKey,
 area,
 floorsKey,
 houseTypeKey,
 facadeKey,
 roofKey,
 roofColorKey,
 sceneKey,
 toneKey,
 garageKey,
 seasonKey,
 selectedPlotLabelZh,
 selectedPlotLabelEn,
 } = params;

 const styleMeta = getStyleMeta(styleKey);
 const floorsZh = getOptionZh("floors", floorsKey);
 const houseTypeZh = getOptionZh("houseType", houseTypeKey);
 const facadeZh = getOptionZh("facade", facadeKey);
 const roofZh = getOptionZh("roof", roofKey);
 const roofColorZh = getOptionZh("roofColor", roofColorKey);
 const sceneZh = getOptionZh("scene", sceneKey);
 const toneZh = getOptionZh("tone", toneKey);
 const garageZh = getOptionZh("garage", garageKey);
 const seasonZh = getOptionZh("season", seasonKey);

 return {
 ...previous,
 image: imageUrl,
 title: styleMeta.title,
 styleZh: styleMeta.styleZh,
 styleEn: styleMeta.styleEn,
 area: `${area}㎡`,
 roomsZh: getOptionZh("rooms", roomsKey),
 roomsEn: getOptionEn("rooms", roomsKey),
 budgetZh: "AI估算中",
 budgetEn: "Estimating",
 durationZh: "AI估算中",
 durationEn: "Estimating",
 descriptionZh: `这是一套根据你的输入实时生成的建筑外观方案：${
 selectedPlotLabelZh || "未选地块"
 }、${floorsZh}、${houseTypeZh}、${facadeZh}、${roofZh}、${roofColorZh}、${sceneZh}、${toneZh}、${garageZh}、${seasonZh}。`,
 descriptionEn: `This architectural concept was generated in real time based on your input: ${
 selectedPlotLabelEn || "No plot selected"
 }, ${getOptionEn("floors", floorsKey)}, ${getOptionEn(
 "houseType",
 houseTypeKey
 )}, ${getOptionEn("facade", facadeKey)}, ${getOptionEn(
 "roof",
 roofKey
 )}, ${getOptionEn("roofColor", roofColorKey)}, ${getOptionEn(
 "scene",
 sceneKey
 )}, ${getOptionEn("tone", toneKey)}, ${getOptionEn(
 "garage",
 garageKey
 )}, ${getOptionEn("season", seasonKey)}.`,
 floorsZh,
 floorsEn: getOptionEn("floors", floorsKey),
 houseTypeZh,
 houseTypeEn: getOptionEn("houseType", houseTypeKey),
 facadeZh,
 facadeEn: getOptionEn("facade", facadeKey),
 roofZh,
 roofEn: getOptionEn("roof", roofKey),
 roofColorZh,
 roofColorEn: getOptionEn("roofColor", roofColorKey),
 sceneZh,
 sceneEn: getOptionEn("scene", sceneKey),
 toneZh,
 toneEn: getOptionEn("tone", toneKey),
 garageZh,
 garageEn: getOptionEn("garage", garageKey),
 seasonZh,
 seasonEn: getOptionEn("season", seasonKey),
 plotZh: selectedPlotLabelZh,
 plotEn: selectedPlotLabelEn,
 };
}

function createGeneratedHouseSignature(house: GeneratedOption) {
 return [
 house.title,
 house.area,
 house.roomsZh,
 house.floorsZh,
 house.houseTypeZh,
 house.facadeZh,
 house.roofZh,
 house.roofColorZh,
 house.sceneZh,
 house.toneZh,
 house.garageZh,
 house.seasonZh,
 house.plotZh,
 ].join("|");
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

function asAssetRecord(record: AssetRecord): AssetRecord {
 return record;
}

function loadLastPreferredGeneratedHouse(): GeneratedOption | null {
 if (typeof window === "undefined") return null;
 try {
 const raw = localStorage.getItem(LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY);
 if (!raw) return null;
 const parsed = JSON.parse(raw);
 return parsed && typeof parsed === "object" ? (parsed as GeneratedOption) : null;
 } catch {
 return null;
 }
}

function saveLastPreferredGeneratedHouse(house: GeneratedOption) {
 if (typeof window === "undefined") return;
 localStorage.setItem(
 LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY,
 JSON.stringify(house)
 );
}

function removeLastPreferredGeneratedHouse() {
 if (typeof window === "undefined") return;
 localStorage.removeItem(LAST_PREFERRED_GENERATED_HOUSE_STORAGE_KEY);
}

function loadPendingUnsavedSignatures(): string[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = localStorage.getItem(PENDING_UNSAVE_SIGNATURES_STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
}

function savePendingUnsavedSignatures(signatures: string[]) {
 if (typeof window === "undefined") return;
 if (signatures.length === 0) {
 localStorage.removeItem(PENDING_UNSAVE_SIGNATURES_STORAGE_KEY);
 return;
 }
 localStorage.setItem(
 PENDING_UNSAVE_SIGNATURES_STORAGE_KEY,
 JSON.stringify(signatures)
 );
}

async function deleteGeneratedImageIfNeeded(imageUrl: string) {
 if (!imageUrl.startsWith("/houses/generated/")) return;
 try {
 await fetch("/api/delete-generated-image", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ imageUrl }),
 });
 } catch (error) {
 console.error("deleteGeneratedImageIfNeeded error:", error);
 }
}

export default function Home() {
 const router = useRouter();
 const searchParams = useSearchParams();

 const [language, setLanguage] = useState<Language>("zh");
 const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("CNY");
 const [renderQuality, setRenderQuality] = useState<RenderQuality>("medium");
 const [preferenceReady, setPreferenceReady] = useState(false);

 const [marketRates] = useState<MarketRates>({
 USD: 1,
 CNY: 7.2,
 USDT: 1,
 BTC: 1 / 65000,
 });

 const [selectedRoomsKey, setSelectedRoomsKey] = useState("3");
 const [selectedStyleKey, setSelectedStyleKey] = useState("modern");
 const [area, setArea] = useState("120");
 const [selectedFloorsKey, setSelectedFloorsKey] = useState("2");
 const [selectedHouseTypeKey, setSelectedHouseTypeKey] = useState("detached");
 const [selectedFacadeKey, setSelectedFacadeKey] = useState("glass");
 const [selectedRoofKey, setSelectedRoofKey] = useState("flat");
 const [selectedRoofColorKey, setSelectedRoofColorKey] = useState("dark_gray");
 const [selectedSceneKey, setSelectedSceneKey] = useState("suburb");
 const [selectedToneKey, setSelectedToneKey] = useState("light");
 const [selectedGarageKey, setSelectedGarageKey] = useState("with");
 const [selectedSeasonKey, setSelectedSeasonKey] = useState("spring");
 const [selectedPlotId, setSelectedPlotId] = useState("");
 const [selectedLotId, setSelectedLotId] = useState("");
 const [mapNeedsAttention, setMapNeedsAttention] = useState(false);

 const [ownedLots, setOwnedLots] = useState<OwnedLot[]>([]);
 const [houseLotBindings, setHouseLotBindings] = useState<HouseLotBinding[]>([]);
 const [purchasedProperties, setPurchasedProperties] = useState<PurchasedProperty[]>([]);
 const [generatedHouse, setGeneratedHouse] = useState<GeneratedOption>(
 GENERATED_OPTIONS[0]
 );
 const [isGenerating, setIsGenerating] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [galleryHouses, setGalleryHouses] = useState<HouseItem[]>(INITIAL_GALLERY_HOUSES);
 const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
 const [pendingUnsavedSignatures, setPendingUnsavedSignatures] = useState<string[]>([]);
 const [draftProjects, setDraftProjects] = useState<DraftProject[]>([]);
 const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);
 const [assetOverview, setAssetOverview] = useState<AssetOverview>(DEFAULT_ASSET_OVERVIEW);
 const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(DEFAULT_ASSET_RECORDS);
 const [hasLoaded, setHasLoaded] = useState(false);
 const [selectedHouse, setSelectedHouse] = useState<HouseItem | null>(null);
 const [isDetailOpen, setIsDetailOpen] = useState(false);
 const [buildSuccessState, setBuildSuccessState] = useState<BuildSuccessState>({
 visible: false,
 plotId: "",
 lotId: "",
 lotLabel: "",
 houseTitle: "",
 houseImage: "",
 lotStatus: "built",
 });

 const quickCreateRef = useRef<HTMLElement | null>(null);
 const pendingBuildTargetRef = useRef<{ plotId: string; lotId: string }>({
 plotId: "",
 lotId: "",
 });
 const selectedBuildTargetRef = useRef<{ plotId: string; lotId: string }>({
 plotId: "",
 lotId: "",
 });
 const skipNextStoreSyncRef = useRef(true);

 const hydrateFromStore = () => {
 const store = loadAssetStore();
 setOwnedLots(store.lands);
 setHouseLotBindings(store.bindings);
 setPurchasedProperties(store.purchasedProperties);
 setGalleryHouses(
 store.gallery.length ? (store.gallery as HouseItem[]) : INITIAL_GALLERY_HOUSES
 );
 setSavedDesigns(store.savedDesigns);
 setDraftProjects(store.draftProjects);
 setGenerationHistory(store.generationHistory);
 setAssetOverview(store.assetOverview);
 setAssetRecords(store.assetRecords);
 return {
 lands: store.lands,
 bindings: store.bindings,
 purchasedProperties: store.purchasedProperties,
 };
 };

 const syncStore = (
 patch?: Partial<{
 lands: OwnedLot[];
 bindings: HouseLotBinding[];
 gallery: HouseItem[];
 savedDesigns: SavedDesign[];
 draftProjects: DraftProject[];
 generationHistory: GenerationHistoryItem[];
 assetOverview: AssetOverview;
 assetRecords: AssetRecord[];
 purchasedProperties: PurchasedProperty[];
 }>
 ) => {
 const current = loadAssetStore();
 saveAssetStore({
 ...current,
 lands: patch?.lands ?? ownedLots,
 bindings: patch?.bindings ?? houseLotBindings,
 gallery: patch?.gallery ?? galleryHouses,
 savedDesigns: patch?.savedDesigns ?? savedDesigns,
 draftProjects: patch?.draftProjects ?? draftProjects,
 generationHistory: patch?.generationHistory ?? generationHistory,
 assetOverview: patch?.assetOverview ?? assetOverview,
 assetRecords: patch?.assetRecords ?? assetRecords,
 purchasedProperties: patch?.purchasedProperties ?? purchasedProperties,
 });
 };

 const resetBuildSuccessState = () => {
 setBuildSuccessState({
 visible: false,
 plotId: "",
 lotId: "",
 lotLabel: "",
 houseTitle: "",
 houseImage: "",
 lotStatus: "built",
 });
 };

 const applySelectedBuildTarget = (
 plotId: string,
 lotId: string,
 showMessage = false
 ) => {
 const safeLotId = normalizeLotId(lotId);
 selectedBuildTargetRef.current = { plotId, lotId: safeLotId };
 setSelectedPlotId(plotId);
 setSelectedLotId(safeLotId);
 setMapNeedsAttention(false);

 if (showMessage) {
 setErrorMessage(
 language === "zh"
 ? `已自动为你选中可建造地块 ${getFullPlotLotLabel(plotId, safeLotId, "zh")}。`
 : `Buildable lot auto-selected: ${getFullPlotLotLabel(plotId, safeLotId, "en")}.`
 );
 }
 };

 useEffect(() => {
 selectedBuildTargetRef.current = {
 plotId: selectedPlotId,
 lotId: normalizeLotId(selectedLotId),
 };
 }, [selectedPlotId, selectedLotId]);

 useEffect(() => {
 setSelectedCurrency(getStoredCurrency());
 setLanguage(getStoredLanguage());
 setPendingUnsavedSignatures(loadPendingUnsavedSignatures());
 setPreferenceReady(true);
 hydrateFromStore();

 const handleSync = () => {
 skipNextStoreSyncRef.current = true;

 const nextCurrency = getStoredCurrency();
 const nextLanguage = getStoredLanguage();
 const nextPending = loadPendingUnsavedSignatures();

 setSelectedCurrency((prev) => (prev === nextCurrency ? prev : nextCurrency));
 setLanguage((prev) => (prev === nextLanguage ? prev : nextLanguage));
 setPendingUnsavedSignatures((prev) => {
 if (
 prev.length === nextPending.length &&
 prev.every((item, index) => item === nextPending[index])
 ) {
 return prev;
 }
 return nextPending;
 });

 hydrateFromStore();
 };

 window.addEventListener("storage", handleSync);
 window.addEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.addEventListener("focus", handleSync);

 return () => {
 window.removeEventListener("storage", handleSync);
 window.removeEventListener(APP_DATA_SYNC_EVENT, handleSync);
 window.removeEventListener("focus", handleSync);
 };
 }, []);

 useEffect(() => {
 if (!preferenceReady) return;
 localStorage.setItem(CURRENCY_STORAGE_KEY, selectedCurrency);
 }, [selectedCurrency, preferenceReady]);

 useEffect(() => {
 if (!preferenceReady) return;
 localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
 }, [language, preferenceReady]);

 useEffect(() => {
 try {
 hydrateFromStore();

 const lastPreferred = loadLastPreferredGeneratedHouse();
 if (lastPreferred) setGeneratedHouse(lastPreferred);

 const pendingUnsaves = loadPendingUnsavedSignatures();
 setPendingUnsavedSignatures(pendingUnsaves);

 if (pendingUnsaves.length > 0) {
 const store = loadAssetStore();
 const filteredDesigns = store.savedDesigns.filter(
 (item) => !pendingUnsaves.includes(item.signature)
 );
 saveAssetStore({ ...store, savedDesigns: filteredDesigns });
 localStorage.removeItem(PENDING_UNSAVE_SIGNATURES_STORAGE_KEY);
 setSavedDesigns(filteredDesigns);
 setPendingUnsavedSignatures([]);
 }
 } catch (error) {
 console.warn("本地数据损坏，已回退默认数据。", error);
 removeLastPreferredGeneratedHouse();
 setOwnedLots([]);
 setHouseLotBindings([]);
 setPurchasedProperties([]);
 setGalleryHouses(INITIAL_GALLERY_HOUSES);
 setSavedDesigns([]);
 setPendingUnsavedSignatures([]);
 setDraftProjects([]);
 setGenerationHistory([]);
 setAssetOverview(DEFAULT_ASSET_OVERVIEW);
 setAssetRecords(DEFAULT_ASSET_RECORDS);
 setGeneratedHouse(GENERATED_OPTIONS[0]);
 } finally {
 setHasLoaded(true);
 }
 }, []);

 useEffect(() => {
 const focus = searchParams.get("focus");
 const plotIdFromQuery = searchParams.get("plotId") || "";
 const lotIdFromQuery = normalizeLotId(searchParams.get("lotId") || "");

 if (plotIdFromQuery) {
 pendingBuildTargetRef.current = {
 plotId: plotIdFromQuery,
 lotId: lotIdFromQuery,
 };
 setSelectedPlotId(plotIdFromQuery);
 }

 if (focus === "quick-create") {
 const timer = window.setTimeout(() => {
 quickCreateRef.current?.scrollIntoView({
 behavior: "smooth",
 block: "start",
 });
 }, 180);
 return () => window.clearTimeout(timer);
 }
 }, [searchParams]);

 useEffect(() => {
 if (!hasLoaded) return;
 const pending = pendingBuildTargetRef.current;
 if (!pending.plotId) return;

 if (!pending.lotId) {
 setSelectedPlotId(pending.plotId);
 pendingBuildTargetRef.current = { plotId: "", lotId: "" };
 return;
 }

 const safeLotId = normalizeLotId(pending.lotId);

 const isOwned = ownedLots.some(
 (item) =>
 item.plotId === pending.plotId && normalizeLotId(item.lotId) === safeLotId
 );
 const alreadyBuilt = houseLotBindings.some(
 (item) =>
 item.plotId === pending.plotId && normalizeLotId(item.lotId) === safeLotId
 );

 if (isOwned && !alreadyBuilt) {
 applySelectedBuildTarget(pending.plotId, safeLotId, true);
 pendingBuildTargetRef.current = { plotId: "", lotId: "" };
 return;
 }

 setSelectedPlotId(pending.plotId);
 setSelectedLotId("");
 pendingBuildTargetRef.current = { plotId: "", lotId: "" };
 }, [ownedLots, houseLotBindings, language, hasLoaded]);

 useEffect(() => {
 if (selectedPlotId) setMapNeedsAttention(false);
 }, [selectedPlotId]);

 useEffect(() => {
 if (!selectedPlotId || !selectedLotId) return;
 const safeLotId = normalizeLotId(selectedLotId);

 const matched = ownedLots.some(
 (item) =>
 item.plotId === selectedPlotId && normalizeLotId(item.lotId) === safeLotId
 );
 const alreadyBuilt = houseLotBindings.some(
 (item) =>
 item.plotId === selectedPlotId && normalizeLotId(item.lotId) === safeLotId
 );

 if (!matched || alreadyBuilt) {
 selectedBuildTargetRef.current = { plotId: selectedPlotId, lotId: "" };
 setSelectedLotId("");
 }
 }, [selectedPlotId, selectedLotId, ownedLots, houseLotBindings]);

 useEffect(() => {
 savePendingUnsavedSignatures(pendingUnsavedSignatures);
 }, [pendingUnsavedSignatures]);

 useEffect(() => {
 if (!hasLoaded) return;

 if (skipNextStoreSyncRef.current) {
 skipNextStoreSyncRef.current = false;
 return;
 }

 syncStore();
 }, [
 hasLoaded,
 ownedLots,
 houseLotBindings,
 purchasedProperties,
 galleryHouses,
 savedDesigns,
 draftProjects,
 generationHistory,
 assetOverview,
 assetRecords,
 ]);

 const text = language === "zh" ? TEXT.zh : TEXT.en;
 const ui = UI;

 const quickCreateText =
 language === "zh"
 ? {
 quickCreate: "快速创建",
 createDream: "创建你的梦想之家",
 inputArea: "建筑面积",
 inputRooms: "房间数",
 inputStyle: "建筑风格",
 floorCount: "楼层",
 houseType: "户型",
 facadeMaterial: "外立面材质",
 roofType: "屋顶类型",
 roofColor: "屋顶颜色",
 sceneType: "场景类型",
 tonePreference: "色调偏好",
 garageOption: "车库选项",
 seasonOption: "季节",
 plotLocation: "地块位置",
 roomOptions: TEXT.zh.roomOptions,
 styleOptions: TEXT.zh.styleOptions,
 floorOptions: TEXT.zh.floorOptions,
 houseTypeOptions: TEXT.zh.houseTypeOptions,
 facadeOptions: TEXT.zh.facadeOptions,
 roofOptions: TEXT.zh.roofOptions,
 roofColorOptions: TEXT.zh.roofColorOptions,
 sceneOptions: TEXT.zh.sceneOptions,
 toneOptions: TEXT.zh.toneOptions,
 garageOptions: TEXT.zh.garageOptions,
 seasonOptions: TEXT.zh.seasonOptions,
 }
 : {
 quickCreate: "Quick Create",
 createDream: "Create Your Dream Home",
 inputArea: "Building Area",
 inputRooms: "Rooms",
 inputStyle: "Style",
 floorCount: "Floors",
 houseType: "House Type",
 facadeMaterial: "Facade Material",
 roofType: "Roof Type",
 roofColor: "Roof Color",
 sceneType: "Scene Type",
 tonePreference: "Tone Preference",
 garageOption: "Garage Option",
 seasonOption: "Season",
 plotLocation: "Plot Location",
 roomOptions: TEXT.en.roomOptions,
 styleOptions: TEXT.en.styleOptions,
 floorOptions: TEXT.en.floorOptions,
 houseTypeOptions: TEXT.en.houseTypeOptions,
 facadeOptions: TEXT.en.facadeOptions,
 roofOptions: TEXT.en.roofOptions,
 roofColorOptions: TEXT.en.roofColorOptions,
 sceneOptions: TEXT.en.sceneOptions,
 toneOptions: TEXT.en.toneOptions,
 garageOptions: TEXT.en.garageOptions,
 seasonOptions: TEXT.en.seasonOptions,
 };

 const generationStatusText =
 language === "zh"
 ? {
 generationStatus: "生成状态",
 generating: "生成中",
 done: "已完成",
 inputArea: "建筑面积",
 inputRooms: "房间数",
 inputStyle: "建筑风格",
 floorCount: "楼层",
 houseType: "户型",
 facadeMaterial: "外立面材质",
 roofType: "屋顶类型",
 roofColor: "屋顶颜色",
 sceneType: "场景类型",
 tonePreference: "色调偏好",
 garageOption: "车库选项",
 seasonOption: "季节",
 plotLocation: "地块位置",
 renderQuality: "生成档次",
 }
 : {
 generationStatus: "Generation Status",
 generating: "Generating",
 done: "Done",
 inputArea: "Building Area",
 inputRooms: "Rooms",
 inputStyle: "Style",
 floorCount: "Floors",
 houseType: "House Type",
 facadeMaterial: "Facade Material",
 roofType: "Roof Type",
 roofColor: "Roof Color",
 sceneType: "Scene Type",
 tonePreference: "Tone Preference",
 garageOption: "Garage Option",
 seasonOption: "Season",
 plotLocation: "Plot Location",
 renderQuality: "Render Quality",
 };

 const generatedPreviewText =
 language === "zh"
 ? {
 generatedPreview: "AI 生成预览",
 budget: "预算",
 duration: "预计工期",
 placeInWorld: "放入世界",
 saveDesign: "收藏设计",
 }
 : {
 generatedPreview: "AI Generated Preview",
 budget: "Budget",
 duration: "Estimated Duration",
 placeInWorld: "Place in World",
 saveDesign: "Save Design",
 };

 const worldHallText =
 language === "zh"
 ? {
 hallTitle: "世界荣誉殿堂",
 hallDesc: "这里展示最受欢迎、最具代表性的建筑作品。",
 honorList: "荣誉榜单",
 view: "查看",
 favoritesTitle: "我的收藏",
 emptyFavorites: "你还没有收藏任何作品。",
 awardPopular: "人气之星",
 awardPopularDesc: "获得最多玩家喜爱的作品",
 awardTrending: "趋势之星",
 awardTrendingDesc: "近期热度增长最快的作品",
 awardPeak: "巅峰之作",
 awardPeakDesc: "综合表现最强的作品",
 awardStarter: "新秀之星",
 awardStarterDesc: "最值得关注的新作品",
 }
 : {
 hallTitle: "World Hall of Honor",
 hallDesc: "A showcase of the most popular and iconic architectural works.",
 honorList: "Honor List",
 view: "View",
 favoritesTitle: "My Favorites",
 emptyFavorites: "You have not favorited any works yet.",
 awardPopular: "Popular Star",
 awardPopularDesc: "The most loved work by players",
 awardTrending: "Trending Star",
 awardTrendingDesc: "The fastest-rising work recently",
 awardPeak: "Peak Masterpiece",
 awardPeakDesc: "The strongest overall work",
 awardStarter: "Rising Star",
 awardStarterDesc: "The most promising new work",
 };

 const compactUi = {
 btnSmallIdle: ui.btnSmallIdle,
 btnSmallActive: ui.btnSmallActive,
 };

 const selectedPlotLabelZh = getFullPlotLotLabel(selectedPlotId, selectedLotId, "zh");
 const selectedPlotLabelEn = getFullPlotLotLabel(selectedPlotId, selectedLotId, "en");
 const selectedPlotDisplayLabel = getFullPlotLotLabel(
 selectedPlotId,
 selectedLotId,
 language
 );

 const builtGalleryHouses = useMemo(() => {
 const boundHouseIds = new Set(houseLotBindings.map((item) => item.houseId));
 return galleryHouses.filter((house) => boundHouseIds.has(house.id));
 }, [galleryHouses, houseLotBindings]);

 const islandOwnerRank = builtGalleryHouses.length + 37;

 const generatedHouseSignature = useMemo(
 () => createGeneratedHouseSignature(generatedHouse),
 [generatedHouse]
 );

 const generatedPreviewSaved = useMemo(() => {
 const exists = savedDesigns.some((item) => item.signature === generatedHouseSignature);
 const pendingRemoved = pendingUnsavedSignatures.includes(generatedHouseSignature);
 return exists && !pendingRemoved;
 }, [savedDesigns, generatedHouseSignature, pendingUnsavedSignatures]);

 const selectedHouseMeta = useMemo(() => {
 if (!selectedHouse) return null;

 const builtBinding =
 houseLotBindings.find((binding) => binding.houseId === selectedHouse.id) || null;

 const purchasedMatch =
 purchasedProperties.find(
 (item) =>
 item.id === selectedHouse.id ||
 (item.title === selectedHouse.title && item.image === selectedHouse.image)
 ) || null;

 const isSavedDesign = savedDesigns.some((item) => item.id === selectedHouse.id);

 let sourceType: "built" | "purchased" | "saved" | "unknown" = "unknown";
 if (builtBinding) sourceType = "built";
 else if (purchasedMatch) sourceType = "purchased";
 else if (isSavedDesign) sourceType = "saved";

 const plotLabel = builtBinding
 ? getFullPlotLotLabel(builtBinding.plotId, builtBinding.lotId, language)
 : purchasedMatch
 ? language === "zh"
 ? purchasedMatch.plotZh || "-"
 : purchasedMatch.plotEn || "-"
 : selectedHouse.plotZh || selectedHouse.plotEn || "-";

 const statusText =
 sourceType === "built"
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
 ? new Date(builtBinding.boundAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")
 : purchasedMatch?.purchasedAt
 ? new Date(purchasedMatch.purchasedAt).toLocaleString(
 language === "zh" ? "zh-CN" : "en-US"
 )
 : "-";

 return {
 sourceType,
 plotLabel,
 statusText,
 timeText,
 listedPriceDb: 0,
 };
 }, [selectedHouse, houseLotBindings, purchasedProperties, savedDesigns, language]);

 const hallGalleryHouses = useMemo(() => {
 const savedDesignHouses = savedDesigns.map(convertSavedDesignToHouseItem);
 return [...savedDesignHouses, ...builtGalleryHouses];
 }, [savedDesigns, builtGalleryHouses]);

 const currentRenderCostDb = RENDER_QUALITY_COST_DB[renderQuality];
 const projectedBalanceDb = Math.max(
 0,
 assetOverview.availableBalanceDb - currentRenderCostDb
 );
 const currentRenderQualityLabel =
 renderQuality === "low"
 ? text.qualityLow
 : renderQuality === "medium"
 ? text.qualityMedium
 : text.qualityHigh;

 const convertDbToSelectedCurrency = (dbAmount: number) => {
 const usdAmount = dbAmount / 100;
 const rate = marketRates[selectedCurrency];
 return !rate || rate <= 0 ? 0 : usdAmount * rate;
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

 const pushAssetRecord = (record: AssetRecord) => {
 setAssetRecords((prev) => [record, ...prev].slice(0, 100));
 };

 const scrollToQuickCreate = () => {
 quickCreateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 };

 const goToProfilePage = () => {
 router.push("/my");
 };

 const handleEnterPlotDetail = (plotId: string) => {
 if (plotId) router.push(`/world/${plotId}`);
 };

 const buildableOwnedLots = useMemo<BuildableOwnedLot[]>(() => {
 return ownedLots
 .filter(
 (lot) =>
 !houseLotBindings.some(
 (binding) =>
 binding.plotId === lot.plotId &&
 normalizeLotId(binding.lotId) === normalizeLotId(lot.lotId)
 )
 )
 .map((lot) => {
 const lotId = normalizeLotId(lot.lotId);
 return {
 plotId: lot.plotId,
 lotId,
 labelZh: getFullPlotLotLabel(lot.plotId, lotId, "zh"),
 labelEn: getFullPlotLotLabel(lot.plotId, lotId, "en"),
 };
 });
 }, [ownedLots, houseLotBindings]);

 const previewOptions = useMemo(() => {
 const currentSignature = createGeneratedHouseSignature(generatedHouse);

 const draftItems = draftProjects.map((item) => ({
 signature: item.signature,
 design: item.design as GeneratedOption,
 }));

 const existsInDrafts = draftItems.some(
 (item) => item.signature === currentSignature
 );

 if (existsInDrafts) {
 return draftItems;
 }

 return [{ signature: currentSignature, design: generatedHouse }, ...draftItems];
 }, [generatedHouse, draftProjects]);

 const previewIndex = useMemo(() => {
 const currentSignature = createGeneratedHouseSignature(generatedHouse);
 const index = previewOptions.findIndex(
 (item) => item.signature === currentSignature
 );
 return index >= 0 ? index : 0;
 }, [previewOptions, generatedHouse]);

 const handlePreviewPrev = () => {
 if (previewIndex <= 0) return;
 const target = previewOptions[previewIndex - 1];
 if (!target) return;
 setGeneratedHouse(target.design);
 saveLastPreferredGeneratedHouse(target.design);
 };

 const handlePreviewNext = () => {
 if (previewIndex >= previewOptions.length - 1) return;
 const target = previewOptions[previewIndex + 1];
 if (!target) return;
 setGeneratedHouse(target.design);
 saveLastPreferredGeneratedHouse(target.design);
 };

 const handlePreviewSelect = (signature: string) => {
 const target = previewOptions.find((item) => item.signature === signature);
 if (!target) return;
 setGeneratedHouse(target.design);
 saveLastPreferredGeneratedHouse(target.design);
 };

 const handleJumpToMapChoosePlot = () => {
 setMapNeedsAttention(true);
 setErrorMessage(
 language === "zh"
 ? "请先在地图中选择一个地块，再进入地块详情页购买具体 lot。"
 : "Please select a plot on the map first, then open the plot detail page to buy a specific lot."
 );
 quickCreateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 };

 const handleUseOwnedLot = (plotId: string, lotId: string) => {
 const safeLotId = normalizeLotId(lotId);
 const { lands, bindings } = hydrateFromStore();

 const isOwned = lands.some(
 (item) => item.plotId === plotId && normalizeLotId(item.lotId) === safeLotId
 );
 if (!isOwned) {
 setErrorMessage(
 language === "zh"
 ? "该 lot 当前不属于你，无法用于建造。"
 : "This lot does not belong to you and cannot be used for building."
 );
 return;
 }

 const alreadyBuilt = bindings.some(
 (item) => item.plotId === plotId && normalizeLotId(item.lotId) === safeLotId
 );
 if (alreadyBuilt) {
 setErrorMessage(
 language === "zh"
 ? `地块 ${getFullPlotLotLabel(plotId, safeLotId, "zh")} 已经建造过房屋，不能重复建造。`
 : `${getFullPlotLotLabel(plotId, safeLotId, "en")} already has a house and cannot be built again.`
 );
 return;
 }

 applySelectedBuildTarget(plotId, safeLotId, false);
 setErrorMessage(
 language === "zh"
 ? `已为你选择可建造地块 ${getFullPlotLotLabel(plotId, safeLotId, "zh")}。`
 : `Buildable owned lot selected: ${getFullPlotLotLabel(plotId, safeLotId, "en")}.`
 );
 };

 const handleGenerate = async () => {
 const generateCostDb = RENDER_QUALITY_COST_DB[renderQuality];
 if (assetOverview.availableBalanceDb < generateCostDb) {
 setErrorMessage(text.insufficientGenerateBalance);
 return;
 }

 setIsGenerating(true);
 setErrorMessage("");

 try {
 const response = await fetch("/api/generate-house", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 area,
 rooms: selectedRoomsKey,
 style: selectedStyleKey,
 floors: selectedFloorsKey,
 houseType: selectedHouseTypeKey,
 facade: selectedFacadeKey,
 roof: selectedRoofKey,
 roofColor: selectedRoofColorKey,
 scene: selectedSceneKey,
 tone: selectedToneKey,
 garage: selectedGarageKey,
 season: selectedSeasonKey,
 plotId: selectedPlotId,
 lotId: normalizeLotId(selectedLotId),
 plot: selectedPlotLabelZh,
 renderQuality,
 }),
 });

 const data = await response.json();
 if (!response.ok || !data.success) {
 throw new Error(data.error || "生成失败");
 }

 const nextHouse = buildGeneratedHouse({
 previous: generatedHouse,
 imageUrl: data.imageUrl,
 styleKey: selectedStyleKey,
 roomsKey: selectedRoomsKey,
 area,
 floorsKey: selectedFloorsKey,
 houseTypeKey: selectedHouseTypeKey,
 facadeKey: selectedFacadeKey,
 roofKey: selectedRoofKey,
 roofColorKey: selectedRoofColorKey,
 sceneKey: selectedSceneKey,
 toneKey: selectedToneKey,
 garageKey: selectedGarageKey,
 seasonKey: selectedSeasonKey,
 selectedPlotLabelZh,
 selectedPlotLabelEn,
 });

 const completeHouse: GeneratedOption = {
 ...nextHouse,
 views: data.views || { main: data.imageUrl },
 };

 const signature = createGeneratedHouseSignature(completeHouse);
 const now = Date.now();

 const newDraft: DraftProject = {
 id: now,
 signature,
 createdAt: now,
 updatedAt: now,
 status: "draft",
 design: completeHouse as DraftProject["design"],
 };

 const newHistoryItem: GenerationHistoryItem = {
 id: now,
 draftId: now,
 signature,
 createdAt: now,
 title: completeHouse.title,
 image: completeHouse.image,
 styleZh: completeHouse.styleZh,
 styleEn: completeHouse.styleEn,
 area: completeHouse.area,
 roomsZh: completeHouse.roomsZh,
 roomsEn: completeHouse.roomsEn,
 plotZh: completeHouse.plotZh,
 plotEn: completeHouse.plotEn,
 };

 const nextAvailableBalance = assetOverview.availableBalanceDb - generateCostDb;
 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: Math.max(0, nextAvailableBalance),
 };

 const nextRecords: AssetRecord[] = [
 asAssetRecord({
 id: now + 1,
 type: "reward",
 titleZh:
 renderQuality === "low"
 ? "体验档生成图片"
 : renderQuality === "medium"
 ? "标准档生成图片"
 : "专业档生成图片",
 titleEn:
 renderQuality === "low"
 ? "Basic tier image generation"
 : renderQuality === "medium"
 ? "Standard tier image generation"
 : "Pro tier image generation",
 amountDb: -generateCostDb,
 balanceAfterDb: Math.max(0, nextAvailableBalance),
 status: "success",
 createdAt: new Date().toISOString(),
 }),
 ...assetRecords,
 ].slice(0, 100);

 const nextDrafts: DraftProject[] = [newDraft, ...draftProjects];
 const nextHistory: GenerationHistoryItem[] = [
 newHistoryItem,
 ...generationHistory,
 ].slice(0, 100);

 setGeneratedHouse(completeHouse);
 saveLastPreferredGeneratedHouse(completeHouse);
 setDraftProjects(nextDrafts);
 setGenerationHistory(nextHistory);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);

 skipNextStoreSyncRef.current = true;
 syncStore({
 draftProjects: nextDrafts,
 generationHistory: nextHistory,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 });
 } catch (error) {
 console.error(error);
 setErrorMessage((error as Error).message || "生成失败");
 } finally {
 setIsGenerating(false);
 }
 };

 const handleToggleGeneratedPreviewSave = () => {
 const signature = createGeneratedHouseSignature(generatedHouse);
 const existsInSaved = savedDesigns.some((item) => item.signature === signature);
 const isPendingRemoved = pendingUnsavedSignatures.includes(signature);

 if (existsInSaved && !isPendingRemoved) {
 const nextPending = [...pendingUnsavedSignatures, signature];
 setPendingUnsavedSignatures(nextPending);
 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "取消收藏设计（刷新后移除）",
 titleEn: "Remove Saved Design (removes after refresh)",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 setDraftProjects((drafts) =>
 drafts.map((item) =>
 item.signature === signature
 ? {
 ...item,
 status: (item.status === "built" ? "built" : "draft") as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 return;
 }

 if (existsInSaved && isPendingRemoved) {
 const nextPending = pendingUnsavedSignatures.filter((item) => item !== signature);
 setPendingUnsavedSignatures(nextPending);
 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "恢复收藏设计",
 titleEn: "Restore Saved Design",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 setDraftProjects((drafts) =>
 drafts.map((item) =>
 item.signature === signature
 ? {
 ...item,
 status: "saved" as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 return;
 }

 const newSavedDesign: SavedDesign = {
 id: Date.now(),
 signature,
 createdAt: Date.now(),
 design: generatedHouse as SavedDesign["design"],
 };
 const nextSaved = [newSavedDesign, ...savedDesigns];

 setSavedDesigns(nextSaved);
 pushAssetRecord(
 asAssetRecord({
 id: Date.now() + 1,
 type: "save_design",
 titleZh: "收藏设计",
 titleEn: "Save Design",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 setDraftProjects((drafts) =>
 drafts.map((item) =>
 item.signature === signature
 ? {
 ...item,
 status: "saved" as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 saveLastPreferredGeneratedHouse(generatedHouse);

 skipNextStoreSyncRef.current = true;
 syncStore({ savedDesigns: nextSaved });
 };

 const handleOpenDraft = (draftId: number) => {
 const target = draftProjects.find((item) => item.id === draftId);
 if (!target) return;
 const targetHouse = target.design as GeneratedOption;
 setGeneratedHouse(targetHouse);
 saveLastPreferredGeneratedHouse(targetHouse);
 setSelectedHouse({
 id: target.id,
 title: targetHouse.title,
 author: "You",
 styleZh: targetHouse.styleZh.replace("风格", ""),
 styleEn: targetHouse.styleEn.replace(" Style", ""),
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: targetHouse.image,
 area: targetHouse.area,
 roomsZh: targetHouse.roomsZh,
 roomsEn: targetHouse.roomsEn,
 floorsZh: targetHouse.floorsZh,
 floorsEn: targetHouse.floorsEn,
 houseTypeZh: targetHouse.houseTypeZh,
 houseTypeEn: targetHouse.houseTypeEn,
 facadeZh: targetHouse.facadeZh,
 facadeEn: targetHouse.facadeEn,
 roofZh: targetHouse.roofZh,
 roofEn: targetHouse.roofEn,
 roofColorZh: targetHouse.roofColorZh,
 roofColorEn: targetHouse.roofColorEn,
 sceneZh: targetHouse.sceneZh,
 sceneEn: targetHouse.sceneEn,
 toneZh: targetHouse.toneZh,
 toneEn: targetHouse.toneEn,
 garageZh: targetHouse.garageZh,
 garageEn: targetHouse.garageEn,
 seasonZh: targetHouse.seasonZh,
 seasonEn: targetHouse.seasonEn,
 plotZh: targetHouse.plotZh,
 plotEn: targetHouse.plotEn,
 });
 setIsDetailOpen(true);
 };

 const handleOpenDraftDetail = (draftId: number) => {
 const target = draftProjects.find((item) => item.id === draftId);
 if (!target) return;

 const targetHouse = target.design as GeneratedOption;

 setSelectedHouse({
 id: target.id,
 title: targetHouse.title,
 author: "You",
 styleZh: targetHouse.styleZh.replace("风格", ""),
 styleEn: targetHouse.styleEn.replace(" Style", ""),
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: targetHouse.image,
 area: targetHouse.area,
 roomsZh: targetHouse.roomsZh,
 roomsEn: targetHouse.roomsEn,
 floorsZh: targetHouse.floorsZh,
 floorsEn: targetHouse.floorsEn,
 houseTypeZh: targetHouse.houseTypeZh,
 houseTypeEn: targetHouse.houseTypeEn,
 facadeZh: targetHouse.facadeZh,
 facadeEn: targetHouse.facadeEn,
 roofZh: targetHouse.roofZh,
 roofEn: targetHouse.roofEn,
 roofColorZh: targetHouse.roofColorZh,
 roofColorEn: targetHouse.roofColorEn,
 sceneZh: targetHouse.sceneZh,
 sceneEn: targetHouse.sceneEn,
 toneZh: targetHouse.toneZh,
 toneEn: targetHouse.toneEn,
 garageZh: targetHouse.garageZh,
 garageEn: targetHouse.garageEn,
 seasonZh: targetHouse.seasonZh,
 seasonEn: targetHouse.seasonEn,
 plotZh: targetHouse.plotZh,
 plotEn: targetHouse.plotEn,
 });

 setIsDetailOpen(true);
 };

 const handleOpenPropertyDetail = (propertyId: string) => {
 if (propertyId.startsWith("built-")) {
 const builtHouseId = Number(propertyId.replace("built-", ""));
 const builtHouse = galleryHouses.find((house) => house.id === builtHouseId);
 if (builtHouse) {
 handleOpenDetail(builtHouse);
 }
 return;
 }

 if (propertyId.startsWith("purchased-")) {
 const purchasedId = Number(propertyId.replace("purchased-", ""));
 const purchasedHouse = purchasedProperties.find((item) => item.id === purchasedId);
 if (purchasedHouse) {
 handleOpenDetail(convertPurchasedPropertyToHouseItem(purchasedHouse));
 }
 }
 };

 const handleToggleSaveDraft = (draftId: number) => {
 const target = draftProjects.find((item) => item.id === draftId);
 if (!target) return;

 const signature = target.signature;
 const existsInSaved = savedDesigns.some((item) => item.signature === signature);
 const isPendingRemoved = pendingUnsavedSignatures.includes(signature);

 if (existsInSaved && !isPendingRemoved) {
 setPendingUnsavedSignatures((prev) => [...prev, signature]);
 setDraftProjects((prev) =>
 prev.map((item) =>
 item.id === draftId
 ? {
 ...item,
 status: (item.status === "built" ? "built" : "draft") as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "取消收藏草稿（刷新后移除）",
 titleEn: "Remove Draft Save (removes after refresh)",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 return;
 }

 if (existsInSaved && isPendingRemoved) {
 setPendingUnsavedSignatures((prev) => prev.filter((item) => item !== signature));
 setDraftProjects((prev) =>
 prev.map((item) =>
 item.id === draftId
 ? {
 ...item,
 status: "saved" as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "恢复收藏草稿",
 titleEn: "Restore Draft Save",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 return;
 }

 const newSavedDesign: SavedDesign = {
 id: Date.now(),
 signature,
 createdAt: Date.now(),
 design: target.design as SavedDesign["design"],
 };

 setSavedDesigns((prev) => [newSavedDesign, ...prev]);
 setDraftProjects((prev) =>
 prev.map((item) =>
 item.id === draftId
 ? {
 ...item,
 status: "saved" as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 )
 );
 saveLastPreferredGeneratedHouse(target.design as GeneratedOption);
 setGeneratedHouse(target.design as GeneratedOption);

 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "收藏草稿",
 titleEn: "Save Draft",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );
 };

 const handleBuildDraft = (draftId: number) => {
 const target = draftProjects.find((item) => item.id === draftId);
 if (!target) return;
 setGeneratedHouse(target.design as GeneratedOption);
 saveLastPreferredGeneratedHouse(target.design as GeneratedOption);
 quickCreateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 };

 const handleDeleteDraft = async (draftId: number) => {
 const target = draftProjects.find((item) => item.id === draftId);
 if (!target) return;

 await deleteGeneratedImageIfNeeded((target.design as GeneratedOption).image);

 const nextDrafts = draftProjects.filter((item) => item.id !== draftId);
 const nextHistory = generationHistory.filter((item) => item.draftId !== draftId);

 setDraftProjects(nextDrafts);
 setGenerationHistory(nextHistory);
 pushAssetRecord(
 asAssetRecord({
 id: Date.now(),
 type: "save_design",
 titleZh: "删除草稿",
 titleEn: "Delete Draft",
 amountDb: 0,
 balanceAfterDb: assetOverview.availableBalanceDb,
 status: "success",
 createdAt: new Date().toISOString(),
 })
 );

 skipNextStoreSyncRef.current = true;
 syncStore({ draftProjects: nextDrafts, generationHistory: nextHistory });
 };

 const handleClearUnsavedDrafts = async () => {
 const unsavedDrafts = draftProjects.filter((item) => item.status === "draft");
 for (const item of unsavedDrafts) {
 await deleteGeneratedImageIfNeeded((item.design as GeneratedOption).image);
 }

 const unsavedIds = new Set(unsavedDrafts.map((item) => item.id));
 const nextDrafts = draftProjects.filter((item) => item.status !== "draft");
 const nextHistory = generationHistory.filter((item) => !unsavedIds.has(item.draftId));

 setDraftProjects(nextDrafts);
 setGenerationHistory(nextHistory);

 skipNextStoreSyncRef.current = true;
 syncStore({ draftProjects: nextDrafts, generationHistory: nextHistory });
 };

 const handleClearAllDrafts = async () => {
 for (const item of draftProjects) {
 await deleteGeneratedImageIfNeeded((item.design as GeneratedOption).image);
 }

 setDraftProjects([]);
 setGenerationHistory([]);
 setSavedDesigns([]);
 setPendingUnsavedSignatures([]);
 removeLastPreferredGeneratedHouse();
 setGeneratedHouse(GENERATED_OPTIONS[0]);

 skipNextStoreSyncRef.current = true;
 syncStore({ draftProjects: [], generationHistory: [], savedDesigns: [] });
 };

 const handlePlaceInWorld = (
 payload: {
 landArea: number;
 landCost: number;
 buildCost: number;
 totalCost: number;
 selectedView: SelectedBuildView;
 selectedImage: string;
 },
 targetLot?: { plotId: string; lotId: string }
 ): BuildResult => {
 const refPlotId = selectedBuildTargetRef.current.plotId;
 const refLotId = normalizeLotId(selectedBuildTargetRef.current.lotId);
 const plotId = targetLot?.plotId || refPlotId || selectedPlotId;
 const lotId = normalizeLotId(targetLot?.lotId || refLotId || selectedLotId);
 const plotLabelZh = getFullPlotLotLabel(plotId, lotId, "zh");
 const plotLabelEn = getFullPlotLotLabel(plotId, lotId, "en");
 const selectedBuildImage = payload.selectedImage || generatedHouse.image;

 if (!plotId || !lotId) {
 const message =
 language === "zh"
 ? "请先在地块详情页购买一个具体 lot，再回来建造。"
 : "Please buy a specific lot in the plot detail page before building.";
 setErrorMessage(message);
 return { success: false, message };
 }

 const { lands, bindings } = hydrateFromStore();

 const isOwned = lands.some(
 (item) => item.plotId === plotId && normalizeLotId(item.lotId) === lotId
 );
 if (!isOwned) {
 const message =
 language === "zh"
 ? "该 lot 还不属于你，请先购买土地。"
 : "This lot does not belong to you yet. Please buy it first.";
 setErrorMessage(message);
 return { success: false, message };
 }

 const alreadyBound = bindings.some(
 (item) => item.plotId === plotId && normalizeLotId(item.lotId) === lotId
 );
 if (alreadyBound) {
 const message =
 language === "zh"
 ? "该 lot 已经建造过房屋，不能重复占用。"
 : "This lot already has a built house and cannot be used again.";
 setErrorMessage(message);
 return { success: false, message };
 }

 if (assetOverview.availableBalanceDb < payload.totalCost) {
 const message =
 language === "zh"
 ? "当前可用余额不足，开始建造前请先充值。"
 : "Insufficient available balance. Please top up before building.";
 setErrorMessage(message);
 return { success: false, message };
 }

 const styleMeta = getStyleMeta(selectedStyleKey);
 const newHouseId = Date.now();
 const newHouse: HouseItem = {
 id: newHouseId,
 title: generatedHouse.title,
 author: "You",
 styleZh: styleMeta.styleCardZh,
 styleEn: styleMeta.styleCardEn,
 likes: 0,
 saves: 0,
 liked: false,
 saved: false,
 image: selectedBuildImage,
 area: generatedHouse.area,
 roomsZh: generatedHouse.roomsZh,
 roomsEn: generatedHouse.roomsEn,
 floorsZh: generatedHouse.floorsZh,
 floorsEn: generatedHouse.floorsEn,
 houseTypeZh: generatedHouse.houseTypeZh,
 houseTypeEn: generatedHouse.houseTypeEn,
 facadeZh: generatedHouse.facadeZh,
 facadeEn: generatedHouse.facadeEn,
 roofZh: generatedHouse.roofZh,
 roofEn: generatedHouse.roofEn,
 roofColorZh: generatedHouse.roofColorZh,
 roofColorEn: generatedHouse.roofColorEn,
 sceneZh: generatedHouse.sceneZh,
 sceneEn: generatedHouse.sceneEn,
 toneZh: generatedHouse.toneZh,
 toneEn: generatedHouse.toneEn,
 garageZh: generatedHouse.garageZh,
 garageEn: generatedHouse.garageEn,
 seasonZh: generatedHouse.seasonZh,
 seasonEn: generatedHouse.seasonEn,
 plotZh: generatedHouse.plotZh,
 plotEn: generatedHouse.plotEn,
 };

 const newBinding: HouseLotBinding = {
 plotId,
 lotId,
 houseId: newHouseId,
 title: newHouse.title,
 image: newHouse.image,
 boundAt: Date.now(),
 };

 const nextGallery = [newHouse, ...galleryHouses];
 const nextBindings = [...bindings, newBinding];
 const nextOverview: AssetOverview = {
 ...assetOverview,
 availableBalanceDb: Math.max(
 0,
 assetOverview.availableBalanceDb - payload.totalCost
 ),
 landValueDb: assetOverview.landValueDb + payload.landCost,
 houseValueDb: assetOverview.houseValueDb + payload.buildCost,
 dailyChangePercent: assetOverview.dailyChangePercent + 0.1,
 };

 const nextRecords: AssetRecord[] = [
 asAssetRecord({
 id: Date.now(),
 type: "build_house",
 titleZh: `开始建造房屋 ${plotLabelZh}`,
 titleEn: `Start Building House ${plotLabelEn}`,
 amountDb: -payload.totalCost,
 balanceAfterDb: Math.max(
 0,
 assetOverview.availableBalanceDb - payload.totalCost
 ),
 status: "success",
 createdAt: new Date().toISOString(),
 }),
 ...assetRecords,
 ].slice(0, 100);

 const nextDrafts: DraftProject[] = draftProjects.map((item) =>
 item.signature === generatedHouseSignature
 ? {
 ...item,
 status: "built" as DraftProject["status"],
 updatedAt: Date.now(),
 }
 : item
 );

 setGalleryHouses(nextGallery);
 setHouseLotBindings(nextBindings);
 setAssetOverview(nextOverview);
 setAssetRecords(nextRecords);
 setDraftProjects(nextDrafts);

 skipNextStoreSyncRef.current = true;
 syncStore({
 bindings: nextBindings,
 gallery: nextGallery,
 assetOverview: nextOverview,
 assetRecords: nextRecords,
 draftProjects: nextDrafts,
 });

 const successMessage =
 language === "zh"
 ? `建造成功，房屋已绑定到 ${plotLabelZh}，请前往“我的房产”或对应地块查看。`
 : `Build successful. Your house is now bound to ${plotLabelEn}. Please check it in My Properties or the plot page.`;

 setErrorMessage(successMessage);
 setBuildSuccessState({
 visible: true,
 plotId,
 lotId,
 lotLabel: language === "zh" ? plotLabelZh : plotLabelEn,
 houseTitle: generatedHouse.title,
 houseImage: selectedBuildImage,
 lotStatus: "built",
 });

 return { success: true, message: successMessage };
 };

 const handleOpenDetail = (house: HouseItem) => {
 setSelectedHouse(house);
 setIsDetailOpen(true);
 };

 const handleCloseDetail = () => {
 setIsDetailOpen(false);
 setSelectedHouse(null);
 };

 const handleToggleLike = (id: number) => {
 setGalleryHouses((prev) => {
 const updated = prev.map((house) => {
 if (house.id !== id) return house;
 const nextLiked = !house.liked;
 return {
 ...house,
 liked: nextLiked,
 likes: nextLiked ? house.likes + 1 : Math.max(0, house.likes - 1),
 };
 });

 if (selectedHouse?.id === id) {
 const updatedSelected = updated.find((house) => house.id === id);
 setSelectedHouse(updatedSelected || null);
 }
 return updated;
 });
 };

 const handleToggleSave = (id: number) => {
 let updatedSelectedHouse: HouseItem | null = null;
 let handledByGallery = false;

 setGalleryHouses((prev) => {
 const exists = prev.some((house) => house.id === id);
 if (!exists) return prev;
 handledByGallery = true;

 return prev.map((house) => {
 if (house.id !== id) return house;
 const nextSaved = !house.saved;
 const nextHouse = {
 ...house,
 saved: nextSaved,
 saves: nextSaved ? house.saves + 1 : Math.max(0, house.saves - 1),
 };
 updatedSelectedHouse = nextHouse;
 return nextHouse;
 });
 });

 if (handledByGallery) {
 if (selectedHouse?.id === id) setSelectedHouse(updatedSelectedHouse);
 return;
 }

 setSavedDesigns((prev) => {
 const exists = prev.some((item) => item.id === id);
 if (!exists) return prev;

 const target = prev.find((item) => item.id === id) || null;
 if (selectedHouse?.id === id) {
 setSelectedHouse(
 target
 ? { ...convertSavedDesignToHouseItem(target), saved: false, saves: 0 }
 : null
 );
 }
 return prev.filter((item) => item.id !== id);
 });
 };

 if (!hasLoaded) {
 return <div className="min-h-screen bg-neutral-50" />;
 }

 return (
 <div className="min-h-screen bg-neutral-50 text-neutral-900">
 <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
 <section className="mb-6">
 <header className="relative overflow-visible rounded-[32px] border border-neutral-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur md:px-6">
 <div className="relative flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-neutral-900 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
 DB
 </div>
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
 DreamBuilder
 </h1>
 <p className="text-sm text-neutral-500">
 {language === "zh"
 ? "建造梦想，走进你的世界。"
 : "Build your dream. Walk your world."}
 </p>
 </div>
 </div>

 <div className="hidden items-center gap-3 md:flex">
 <button className={`${ui.btnNav} px-4 py-2.5`}>{text.navWorld}</button>
 <button
 onClick={scrollToQuickCreate}
 className={`${ui.btnNav} px-4 py-2.5`}
 >
 {text.navCreate}
 </button>
 <button
 onClick={goToProfilePage}
 className={`${ui.btnNav} px-4 py-2.5`}
 >
 {text.navProfile}
 </button>

 <ConnectWalletButton language={language} />

 <div className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
 <button
 onClick={() => setLanguage("zh")}
 className={`px-3 py-2 text-sm font-medium ${
 language === "zh"
 ? "bg-neutral-900 text-white"
 : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
 }`}
 >
 中文
 </button>
 <button
 onClick={() => setLanguage("en")}
 className={`px-3 py-2 text-sm font-medium ${
 language === "en"
 ? "bg-neutral-900 text-white"
 : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
 }`}
 >
 EN
 </button>
 </div>

 <button
 onClick={goToProfilePage}
 className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-sm font-semibold text-neutral-700 shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-200"
 >
 U
 </button>
 </div>
 </div>
 </header>
 </section>

 <section
 ref={quickCreateRef}
 className="mb-6 grid gap-4 lg:grid-cols-[1.45fr_0.55fr]"
 >
 <DreamWorldMap
 language={language}
 selectedPlotId={selectedPlotId}
 setSelectedPlotId={setSelectedPlotId}
 onEnterPlotDetail={handleEnterPlotDetail}
 needsAttention={mapNeedsAttention}
 />

 <div className="space-y-4">
 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="text-lg font-semibold text-neutral-900">
 {text.renderQuality}
 </div>
 <div className="mt-1 text-sm text-neutral-500">
 {text.renderQualityDesc}
 </div>
 </div>

 <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
 {currentRenderQualityLabel}
 </div>
 </div>

 <div className="mt-4 grid grid-cols-3 gap-3">
 {(["low", "medium", "high"] as RenderQuality[]).map((quality) => {
 const active = renderQuality === quality;
 const title =
 quality === "low"
 ? text.qualityLow
 : quality === "medium"
 ? text.qualityMedium
 : text.qualityHigh;
 const desc =
 quality === "low"
 ? text.qualityLowDesc
 : quality === "medium"
 ? text.qualityMediumDesc
 : text.qualityHighDesc;
 const price =
 quality === "low"
 ? text.qualityLowPrice
 : quality === "medium"
 ? text.qualityMediumPrice
 : text.qualityHighPrice;

 return (
 <button
 key={quality}
 onClick={() => setRenderQuality(quality)}
 className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
 active
 ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
 : "border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 <div className="text-sm font-semibold">{title}</div>
 <div
 className={`mt-1 text-xs ${
 active ? "text-neutral-300" : "text-neutral-500"
 }`}
 >
 {desc}
 </div>
 <div
 className={`mt-1 text-[11px] font-semibold ${
 active ? "text-neutral-200" : "text-neutral-400"
 }`}
 >
 {price}
 </div>
 </button>
 );
 })}
 </div>
 </div>

 <QuickCreatePanel
 t={quickCreateText}
 ui={ui}
 area={area}
 setArea={setArea}
 selectedRoomsKey={selectedRoomsKey}
 setSelectedRoomsKey={setSelectedRoomsKey}
 selectedStyleKey={selectedStyleKey}
 setSelectedStyleKey={setSelectedStyleKey}
 selectedFloorsKey={selectedFloorsKey}
 setSelectedFloorsKey={setSelectedFloorsKey}
 selectedHouseTypeKey={selectedHouseTypeKey}
 setSelectedHouseTypeKey={setSelectedHouseTypeKey}
 selectedFacadeKey={selectedFacadeKey}
 setSelectedFacadeKey={setSelectedFacadeKey}
 selectedRoofKey={selectedRoofKey}
 setSelectedRoofKey={setSelectedRoofKey}
 selectedRoofColorKey={selectedRoofColorKey}
 setSelectedRoofColorKey={setSelectedRoofColorKey}
 selectedSceneKey={selectedSceneKey}
 setSelectedSceneKey={setSelectedSceneKey}
 selectedToneKey={selectedToneKey}
 setSelectedToneKey={setSelectedToneKey}
 selectedGarageKey={selectedGarageKey}
 setSelectedGarageKey={setSelectedGarageKey}
 selectedSeasonKey={selectedSeasonKey}
 setSelectedSeasonKey={setSelectedSeasonKey}
 selectedPlot={selectedPlotDisplayLabel}
 onGenerate={handleGenerate}
 />
 </div>
 </section>

 <section className="mb-6 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
 <GenerationStatus
 t={generationStatusText}
 language={language}
 isGenerating={isGenerating}
 errorMessage={errorMessage}
 selectedPlot={selectedPlotDisplayLabel}
 area={area}
 selectedRoomsKey={selectedRoomsKey}
 selectedStyleKey={selectedStyleKey}
 selectedFloorsKey={selectedFloorsKey}
 selectedHouseTypeKey={selectedHouseTypeKey}
 selectedFacadeKey={selectedFacadeKey}
 selectedRoofKey={selectedRoofKey}
 selectedRoofColorKey={selectedRoofColorKey}
 selectedSceneKey={selectedSceneKey}
 selectedToneKey={selectedToneKey}
 selectedGarageKey={selectedGarageKey}
 selectedSeasonKey={selectedSeasonKey}
 currentRenderQualityLabel={currentRenderQualityLabel}
 currentRenderCostDb={currentRenderCostDb}
 projectedBalanceDb={projectedBalanceDb}
 availableBalanceDb={assetOverview.availableBalanceDb}
 formatSelectedCurrency={formatSelectedCurrency}
 />

 <GeneratedPreview
 t={generatedPreviewText}
 ui={ui}
 language={language}
 generatedHouse={generatedHouse}
 selectedPlot={selectedPlotDisplayLabel}
 islandOwnerRank={islandOwnerRank}
 isSaved={generatedPreviewSaved}
 onToggleSave={handleToggleGeneratedPreviewSave}
 onPlaceInWorld={handlePlaceInWorld}
 hasBuildableOwnedLots={buildableOwnedLots.length > 0}
 buildableOwnedLots={buildableOwnedLots}
 onJumpToMapChoosePlot={handleJumpToMapChoosePlot}
 onUseOwnedLot={handleUseOwnedLot}
 previewIndex={previewIndex}
 previewTotal={previewOptions.length}
 canPreviewPrev={previewIndex > 0}
 canPreviewNext={previewIndex < previewOptions.length - 1}
 onPreviewPrev={handlePreviewPrev}
 onPreviewNext={handlePreviewNext}
 previewItems={previewOptions}
 onPreviewSelect={handlePreviewSelect}
 />
 </section>

 <section className="mb-6">
 <MyDraftsPanel
 language={language}
 ui={compactUi}
 drafts={draftProjects}
 history={generationHistory}
 onOpenDraft={handleOpenDraft}
 onOpenDraftDetail={handleOpenDraftDetail}
 onOpenPropertyDetail={handleOpenPropertyDetail}
 onDeleteDraft={handleDeleteDraft}
 onToggleSaveDraft={handleToggleSaveDraft}
 onBuildDraft={handleBuildDraft}
 onClearUnsavedDrafts={handleClearUnsavedDrafts}
 onClearAllDrafts={handleClearAllDrafts}
 />
 </section>

 <section className="mb-6">
 <RealEstateExchangePreview
 onOpenListing={(item) => {
 if (item.assetType === "property") {
 if (item.sourceId.startsWith("built-")) {
 const builtHouseId = Number(item.sourceId.replace("built-", ""));
 const builtHouse = galleryHouses.find((house) => house.id === builtHouseId);
 if (builtHouse) {
 handleOpenDetail(builtHouse);
 return;
 }
 }

 if (item.sourceId.startsWith("purchased-")) {
 const purchasedId = Number(item.sourceId.replace("purchased-", ""));
 const purchasedHouse = purchasedProperties.find(
 (property) => property.id === purchasedId
 );
 if (purchasedHouse) {
 handleOpenDetail(convertPurchasedPropertyToHouseItem(purchasedHouse));
 return;
 }
 }

 const listingSnapshot = (item as { houseSnapshot?: HouseItem }).houseSnapshot;
 if (listingSnapshot) {
 handleOpenDetail(listingSnapshot);
 return;
 }

 const savedMatch = savedDesigns.find(
 (design) =>
 design.design.title === item.title && design.design.image === item.image
 );
 if (savedMatch) {
 handleOpenDetail(convertSavedDesignToHouseItem(savedMatch));
 return;
 }
 }

 if (item.assetType === "land") {
 const matched = item.sourceId.match(/^(plot-\d+)-lot-\d+$/);
 if (matched?.[1]) {
 router.push(`/world/${matched[1]}`);
 }
 }
 }}
 onOpenTrade={(item) => {
 if (item.assetType === "property") {
 if (item.sourceId.startsWith("built-")) {
 const builtHouseId = Number(item.sourceId.replace("built-", ""));
 const builtHouse = galleryHouses.find((house) => house.id === builtHouseId);
 if (builtHouse) {
 handleOpenDetail(builtHouse);
 return;
 }
 }

 if (item.sourceId.startsWith("purchased-")) {
 const purchasedId = Number(item.sourceId.replace("purchased-", ""));
 const purchasedHouse = purchasedProperties.find(
 (property) => property.id === purchasedId
 );
 if (purchasedHouse) {
 handleOpenDetail(convertPurchasedPropertyToHouseItem(purchasedHouse));
 return;
 }
 }

 const tradeSnapshot = (item as { houseSnapshot?: HouseItem }).houseSnapshot;
 if (tradeSnapshot) {
 handleOpenDetail(tradeSnapshot);
 return;
 }

 const savedMatch = savedDesigns.find(
 (design) =>
 design.design.title === item.title && design.design.image === item.image
 );
 if (savedMatch) {
 handleOpenDetail(convertSavedDesignToHouseItem(savedMatch));
 return;
 }
 }

 if (item.assetType === "land") {
 const matched = item.sourceId.match(/^(plot-\d+)-lot-\d+$/);
 if (matched?.[1]) {
 router.push(`/world/${matched[1]}`);
 }
 }
 }}
/>
 </section>

 <WorldHallOfHonor
 language={language}
 t={worldHallText}
 ui={compactUi}
 galleryHouses={hallGalleryHouses}
 onOpenDetail={handleOpenDetail}
 onLike={handleToggleLike}
 onSave={handleToggleSave}
 />

 <button
 onClick={handleGenerate}
 style={{
 position: "fixed",
 right: "24px",
 bottom: "24px",
 zIndex: 99999,
 background: "#171717",
 color: "white",
 padding: "16px 20px",
 borderRadius: "9999px",
 fontSize: "14px",
 fontWeight: 700,
 border: "none",
 cursor: "pointer",
 boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
 transition: "all 0.3s ease",
 }}
 >
 {text.createDream}
 </button>

 <ImmersiveHouseDetailModal
 open={isDetailOpen}
 house={selectedHouse}
 language={language}
 meta={selectedHouseMeta ?? undefined}
 onClose={handleCloseDetail}
 onLike={handleToggleLike}
 onSave={handleToggleSave}
 />

 <BuildSuccessModal
 open={buildSuccessState.visible}
 language={language}
 lotLabel={buildSuccessState.lotLabel}
 houseTitle={buildSuccessState.houseTitle}
 houseImage={buildSuccessState.houseImage}
 lotStatus={buildSuccessState.lotStatus}
 onClose={resetBuildSuccessState}
 onGoMyProperties={() => {
 resetBuildSuccessState();
 router.push("/my");
 }}
 onGoPlotDetail={() => {
 const targetPlotId = buildSuccessState.plotId;
 resetBuildSuccessState();
 if (targetPlotId) router.push(`/world/${targetPlotId}`);
 }}
 onContinueCreate={() => {
 const targetPlotId = buildSuccessState.plotId;
 const targetLotId = buildSuccessState.lotId;
 resetBuildSuccessState();

 if (targetPlotId) {
 router.push(
 `/?focus=quick-create&plotId=${targetPlotId}${
 targetLotId ? `&lotId=${targetLotId}` : ""
 }`
 );
 return;
 }

 scrollToQuickCreate();
 }}
 />
 </div>
 </div>
 );
}