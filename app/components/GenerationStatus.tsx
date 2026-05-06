"use client";

import React from "react";

type Language = "zh" | "en";

type GenerationStatusText = {
 generationStatus: string;
 generating: string;
 done: string;
 inputArea: string;
 inputRooms: string;
 inputStyle: string;
 floorCount: string;
 houseType: string;
 facadeMaterial: string;
 roofType: string;
 roofColor: string;
 sceneType: string;
 tonePreference: string;
 garageOption: string;
 seasonOption: string;
 plotLocation: string;
 renderQuality: string;

 [key: string]: unknown;
};

type GenerationStatusProps = {
 t: GenerationStatusText;
 language: Language;
 isGenerating: boolean;
 errorMessage: string;
 selectedPlot: string;
 area: string;
 selectedRoomsKey: string;
 selectedStyleKey: string;
 selectedFloorsKey: string;
 selectedHouseTypeKey: string;
 selectedFacadeKey: string;
 selectedRoofKey: string;
 selectedRoofColorKey: string;
 selectedSceneKey: string;
 selectedToneKey: string;
 selectedGarageKey: string;
 selectedSeasonKey: string;
 currentRenderQualityLabel: string;
 currentRenderCostDb: number;
 projectedBalanceDb: number;
 availableBalanceDb: number;
 formatSelectedCurrency: (dbAmount: number) => string;
};

function getOptionLabel(
 type:
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
 | "season",
 key: string,
 language: Language
) {
 const db = {
 rooms: {
 "1": { zh: "1室", en: "1 Room" },
 "2": { zh: "2室", en: "2 Rooms" },
 "3": { zh: "3室", en: "3 Rooms" },
 "4plus": { zh: "4室+", en: "4+ Rooms" },
 },
 style: {
 modern: { zh: "现代", en: "Modern" },
 european: { zh: "欧式", en: "European" },
 chinese: { zh: "中式", en: "Chinese" },
 american: { zh: "美式", en: "American" },
 },
 floors: {
 "1": { zh: "1层", en: "1 Floor" },
 "2": { zh: "2层", en: "2 Floors" },
 "3": { zh: "3层", en: "3 Floors" },
 },
 houseType: {
 detached: { zh: "独栋", en: "Detached" },
 semi_detached: { zh: "双拼", en: "Semi-detached" },
 townhouse: { zh: "联排", en: "Townhouse" },
 courtyard: { zh: "庭院住宅", en: "Courtyard House" },
 },
 facade: {
 glass: { zh: "玻璃", en: "Glass" },
 wood: { zh: "木质", en: "Wood" },
 stone: { zh: "石材", en: "Stone" },
 concrete: { zh: "混凝土", en: "Concrete" },
 white_wall: { zh: "白墙", en: "White Wall" },
 },
 roof: {
 flat: { zh: "平屋顶", en: "Flat Roof" },
 sloped: { zh: "坡屋顶", en: "Sloped Roof" },
 gable: { zh: "人字顶", en: "Gable Roof" },
 },
 roofColor: {
 black: { zh: "黑色", en: "Black" },
 dark_gray: { zh: "深灰", en: "Dark Gray" },
 brick_red: { zh: "砖红", en: "Brick Red" },
 deep_blue: { zh: "深蓝", en: "Deep Blue" },
 brown: { zh: "咖啡色", en: "Brown" },
 },
 scene: {
 city: { zh: "城市", en: "City" },
 suburb: { zh: "郊区", en: "Suburb" },
 mountain: { zh: "山地", en: "Mountain" },
 seaside: { zh: "海边", en: "Seaside" },
 forest: { zh: "森林", en: "Forest" },
 },
 tone: {
 light: { zh: "浅色", en: "Light" },
 dark: { zh: "深色", en: "Dark" },
 warm: { zh: "温暖", en: "Warm" },
 cool: { zh: "冷淡", en: "Cool Minimal" },
 },
 garage: {
 with: { zh: "有车库", en: "With Garage" },
 without: { zh: "无车库", en: "Without Garage" },
 },
 season: {
 spring: { zh: "春", en: "Spring" },
 summer: { zh: "夏", en: "Summer" },
 autumn: { zh: "秋", en: "Autumn" },
 winter: { zh: "冬", en: "Winter" },
 },
 } as const;

 const group = db[type] as Record<string, { zh: string; en: string }>;
 const item = group[key];
 if (!item) return "-";
 return language === "zh" ? item.zh : item.en;
}

function InfoRow({
 label,
 value,
}: {
 label: string;
 value: string | number;
}) {
 return (
 <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
 <div className="text-sm text-neutral-500">{label}</div>
 <div className="text-sm font-semibold text-neutral-900">{value}</div>
 </div>
 );
}

export default function GenerationStatus({
 t,
 language,
 isGenerating,
 errorMessage,
 selectedPlot,
 area,
 selectedRoomsKey,
 selectedStyleKey,
 selectedFloorsKey,
 selectedHouseTypeKey,
 selectedFacadeKey,
 selectedRoofKey,
 selectedRoofColorKey,
 selectedSceneKey,
 selectedToneKey,
 selectedGarageKey,
 selectedSeasonKey,
 currentRenderQualityLabel,
 currentRenderCostDb,
 projectedBalanceDb,
 availableBalanceDb,
 formatSelectedCurrency,
}: GenerationStatusProps) {
 const statusText = isGenerating ? t.generating : t.done;

 return (
 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-neutral-700">
 {t.generationStatus}
 </div>
 <h3 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
 {statusText}
 </h3>
 <p className="mt-2 text-sm text-neutral-500">
 {language === "zh"
 ? "这里会实时展示你当前方案的生成参数与费用状态。"
 : "This panel shows your current generation parameters and cost status."}
 </p>
 </div>

 <div
 className={`rounded-full px-3 py-1 text-xs font-semibold ${
 isGenerating
 ? "bg-amber-50 text-amber-700"
 : "bg-emerald-50 text-emerald-700"
 }`}
 >
 {statusText}
 </div>
 </div>

 {errorMessage ? (
 <div
 className={`mt-5 rounded-[20px] border px-4 py-3 text-sm font-medium ${
 errorMessage.includes("成功") ||
 errorMessage.includes("successful") ||
 errorMessage.includes("success")
 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
 : "border-red-200 bg-red-50 text-red-700"
 }`}
 >
 {errorMessage}
 </div>
 ) : null}

 <div className="mt-5 space-y-3">
 <InfoRow label={t.inputArea} value={`${area || "-"}㎡`} />
 <InfoRow
 label={t.inputRooms}
 value={getOptionLabel("rooms", selectedRoomsKey, language)}
 />
 <InfoRow
 label={t.inputStyle}
 value={getOptionLabel("style", selectedStyleKey, language)}
 />
 <InfoRow
 label={t.floorCount}
 value={getOptionLabel("floors", selectedFloorsKey, language)}
 />
 <InfoRow
 label={t.houseType}
 value={getOptionLabel("houseType", selectedHouseTypeKey, language)}
 />
 <InfoRow
 label={t.facadeMaterial}
 value={getOptionLabel("facade", selectedFacadeKey, language)}
 />
 <InfoRow
 label={t.roofType}
 value={getOptionLabel("roof", selectedRoofKey, language)}
 />
 <InfoRow
 label={t.roofColor}
 value={getOptionLabel("roofColor", selectedRoofColorKey, language)}
 />
 <InfoRow
 label={t.sceneType}
 value={getOptionLabel("scene", selectedSceneKey, language)}
 />
 <InfoRow
 label={t.tonePreference}
 value={getOptionLabel("tone", selectedToneKey, language)}
 />
 <InfoRow
 label={t.garageOption}
 value={getOptionLabel("garage", selectedGarageKey, language)}
 />
 <InfoRow
 label={t.seasonOption}
 value={getOptionLabel("season", selectedSeasonKey, language)}
 />
 <InfoRow
 label={t.plotLocation}
 value={
 selectedPlot || (language === "zh" ? "未选择地块" : "No plot selected")
 }
 />
 <InfoRow label={t.renderQuality} value={currentRenderQualityLabel} />
 </div>

 <div className="mt-5 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="grid gap-3 md:grid-cols-3">
 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "本次生成费用" : "Generation Cost"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {currentRenderCostDb.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "当前可用余额" : "Available Balance"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {formatSelectedCurrency(availableBalanceDb)}
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "生成后余额" : "Balance After Generation"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {formatSelectedCurrency(projectedBalanceDb)}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}