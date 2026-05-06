"use client";

import React, { useEffect, useMemo, useState } from "react";

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

type BuildableOwnedLot = {
 plotId: string;
 lotId: string;
 labelZh: string;
 labelEn: string;
};

type SchemeKey = "scheme1" | "scheme2" | "scheme3" | "scheme4";

type BuildResult = {
 success: boolean;
 message: string;
};

type PreviewItem = {
 signature: string;
 design: GeneratedOption;
};

type GeneratedPreviewProps = {
 t: {
 generatedPreview: string;
 budget: string;
 duration: string;
 placeInWorld: string;
 saveDesign: string;
 [key: string]: unknown;
};
 ui: {
 btnPrimary: string;
 btnSecondary: string;
 btnSmallActive: string;
 btnSmallIdle: string;
 };
 language: string;
 generatedHouse: GeneratedOption;
 selectedPlot: string;
 islandOwnerRank: number;
 isSaved: boolean;
 onToggleSave: () => void;
 onPlaceInWorld: (payload: {
 landArea: number;
 landCost: number;
 buildCost: number;
 totalCost: number;
 selectedView: SchemeKey;
 selectedImage: string;
 }) => BuildResult | void;
 hasBuildableOwnedLots: boolean;
 buildableOwnedLots: BuildableOwnedLot[];
 onJumpToMapChoosePlot: () => void;
 onUseOwnedLot: (plotId: string, lotId: string) => void;
 previewIndex?: number;
 previewTotal?: number;
 canPreviewPrev?: boolean;
 canPreviewNext?: boolean;
 onPreviewPrev?: () => void;
 onPreviewNext?: () => void;
 previewItems?: PreviewItem[];
 onPreviewSelect?: (signature: string) => void;
};

const SCHEME_LABELS = {
 zh: {
 scheme1: "方案1",
 scheme2: "方案2",
 scheme3: "方案3",
 scheme4: "方案4",
 },
 en: {
 scheme1: "Scheme 1",
 scheme2: "Scheme 2",
 scheme3: "Scheme 3",
 scheme4: "Scheme 4",
 },
};

function parseAreaNumber(area?: string) {
 if (!area) return 120;
 const matched = area.match(/(\d+(\.\d+)?)/);
 return matched ? Number.parseFloat(matched[1]) : 120;
}

export default function GeneratedPreview({
 t,
 ui,
 language,
 generatedHouse,
 selectedPlot,
 islandOwnerRank,
 isSaved,
 onToggleSave,
 onPlaceInWorld,
 hasBuildableOwnedLots,
 buildableOwnedLots,
 onJumpToMapChoosePlot,
 onUseOwnedLot,
 previewIndex = 0,
 previewTotal = 1,
 canPreviewPrev = false,
 canPreviewNext = false,
 onPreviewPrev,
 onPreviewNext,
 previewItems = [],
 onPreviewSelect,
}: GeneratedPreviewProps) {
 const [activeScheme, setActiveScheme] = useState<SchemeKey>("scheme1");
 const [mounted, setMounted] = useState(false);
 const [showLotPicker, setShowLotPicker] = useState(false);
 const [showLightbox, setShowLightbox] = useState(false);
 const [buildMessage, setBuildMessage] = useState("");
 const [buildMessageType, setBuildMessageType] = useState<
 "error" | "success" | "info"
 >("info");
 const [isBuilding, setIsBuilding] = useState(false);
 const [buildStep, setBuildStep] = useState(0);
 const [pendingBuildLot, setPendingBuildLot] = useState<BuildableOwnedLot | null>(
 null
 );

 useEffect(() => {
 setMounted(true);
 }, []);

 useEffect(() => {
 setActiveScheme("scheme1");
 setShowLightbox(false);
 }, [generatedHouse.image, generatedHouse.title]);

 useEffect(() => {
 if (!isBuilding) return;

 const timers = [
 window.setTimeout(() => setBuildStep(1), 500),
 window.setTimeout(() => setBuildStep(2), 1300),
 window.setTimeout(() => setBuildStep(3), 2200),
 ];

 return () => {
 timers.forEach((timer) => window.clearTimeout(timer));
 };
 }, [isBuilding]);

 useEffect(() => {
 if (!showLotPicker) {
 setPendingBuildLot(null);
 }
 }, [showLotPicker]);

 const availableSchemes = useMemo(() => {
 const views = generatedHouse.views || {};
 return {
 scheme1: views.main || generatedHouse.image,
 scheme2: views.side || generatedHouse.image,
 scheme3: views.aerial || generatedHouse.image,
 scheme4: views.night || generatedHouse.image,
 };
 }, [generatedHouse]);

 const currentImage = availableSchemes[activeScheme] || generatedHouse.image;

 const areaNum = parseAreaNumber(generatedHouse.area);
 const landArea = Math.max(180, Math.round(areaNum * 1.8));
 const landCost = Math.round(landArea * 180);
 const buildCost = Math.round(areaNum * 900);
 const totalCost = landCost + buildCost;

 const lang = language === "zh" ? "zh" : "en";
 const safeHasBuildableOwnedLots = mounted ? hasBuildableOwnedLots : false;

 const matchedSelectedOwnedLot = useMemo(() => {
 if (!mounted || !selectedPlot) return null;

 return (
 buildableOwnedLots.find(
 (lot) => lot.labelZh === selectedPlot || lot.labelEn === selectedPlot
 ) || null
 );
 }, [mounted, selectedPlot, buildableOwnedLots]);

 const hasSelectedSpecificOwnedLot = Boolean(matchedSelectedOwnedLot);

 const buildButtonLabel = isBuilding
 ? language === "zh"
 ? "正在建造..."
 : "Building..."
 : hasSelectedSpecificOwnedLot
 ? language === "zh"
 ? "直接建造"
 : "Build Now"
 : safeHasBuildableOwnedLots
 ? language === "zh"
 ? "选择地块并建造"
 : "Choose Plot & Build"
 : language === "zh"
 ? "前往选择地块"
 : "Go Choose Plot";

 const helperText = mounted
 ? hasSelectedSpecificOwnedLot
 ? language === "zh"
 ? "当前已选中一个可直接建造的自有 lot，点击按钮即可直接开始建造。"
 : "A buildable owned lot is already selected. Click the button to build directly."
 : safeHasBuildableOwnedLots
 ? language === "zh"
 ? "点击后可选择购买新地块，或直接使用你的自有空地建造。"
 : "Click to either buy a new plot, or build on one of your owned empty lots."
 : language === "zh"
 ? "你还没有可建造的自有地块，点击后会跳转到地图区域并高亮提醒。"
 : "You do not have any buildable owned lots yet. Clicking will jump to the map area with a highlight prompt."
 : language === "zh"
 ? "请先选择建造用地。"
 : "Please choose a buildable plot first.";

 const buildingStatusText =
 buildStep === 0
 ? language === "zh"
 ? "正在调度施工队..."
 : "Dispatching build team..."
 : buildStep === 1
 ? language === "zh"
 ? "正在运输建材..."
 : "Transporting materials..."
 : buildStep === 2
 ? language === "zh"
 ? "主体结构施工中..."
 : "Constructing main structure..."
 : language === "zh"
 ? "正在完成收尾..."
 : "Finalizing construction...";

 const startBuild = async () => {
 setIsBuilding(true);
 setBuildStep(0);
 setBuildMessage("");
 setBuildMessageType("info");

 try {
 await new Promise((resolve) => window.setTimeout(resolve, 3200));

 const result = onPlaceInWorld({
 landArea,
 landCost,
 buildCost,
 totalCost,
 selectedView: activeScheme,
 selectedImage: currentImage,
 });

 if (result && result.success === false) {
 setBuildMessageType("error");
 setBuildMessage(result.message);
 setIsBuilding(false);
 setBuildStep(0);
 return;
 }

 setBuildMessageType("success");
 setBuildMessage(
 (result && "message" in result ? result.message : null) ||
 (language === "zh"
 ? "房屋已建成，请前往“我的房产”或对应地块查看。"
 : "Your house has been built. Please check it in My Properties or the plot page.")
 );
 } catch (error) {
 console.error(error);
 setBuildMessageType("error");
 setBuildMessage(
 language === "zh"
 ? "建造失败，请稍后再试。"
 : "Build failed. Please try again later."
 );
 } finally {
 setIsBuilding(false);
 setBuildStep(0);
 }
 };

 const handleBuildDirect = async () => {
 if (isBuilding || !mounted) return;

 if (hasSelectedSpecificOwnedLot && matchedSelectedOwnedLot) {
 onUseOwnedLot(
 matchedSelectedOwnedLot.plotId,
 matchedSelectedOwnedLot.lotId
 );
 await new Promise((resolve) => window.setTimeout(resolve, 80));
 await startBuild();
 return;
 }

 if (!safeHasBuildableOwnedLots && !selectedPlot) {
 setBuildMessageType("info");
 setBuildMessage(
 language === "zh"
 ? "请先选择一块地块。页面即将引导你到地图区域。"
 : "Please choose a plot first. The page will guide you to the map area."
 );
 onJumpToMapChoosePlot();
 return;
 }

 if (!safeHasBuildableOwnedLots) {
 setBuildMessageType("info");
 setBuildMessage(
 language === "zh"
 ? "请先购买一个具体地块后再回来建造。"
 : "Please purchase a specific plot before building."
 );
 onJumpToMapChoosePlot();
 return;
 }

 setShowLotPicker(true);
 };

 const handleConfirmOwnedLotBuild = async () => {
 if (isBuilding || !pendingBuildLot) return;

 onUseOwnedLot(pendingBuildLot.plotId, pendingBuildLot.lotId);
 setShowLotPicker(false);

 await new Promise((resolve) => window.setTimeout(resolve, 80));
 await startBuild();
 };

 const previewWindow = useMemo(() => {
 if (!previewItems.length) return [];

 const maxVisible = 5;
 const safeIndex = Math.max(
 0,
 Math.min(previewIndex, Math.max(previewItems.length - 1, 0))
 );

 let start = Math.max(0, safeIndex - 2);
 let end = Math.min(previewItems.length, start + maxVisible);

 if (end - start < maxVisible) {
 start = Math.max(0, end - maxVisible);
 }

 return previewItems.slice(start, end);
 }, [previewItems, previewIndex]);

 return (
 <>
 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0">
 <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-neutral-700">
 {t.generatedPreview}
 </div>
 <h3 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
 {generatedHouse.title}
 </h3>
 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? generatedHouse.descriptionZh
 : generatedHouse.descriptionEn}
 </p>
 </div>

 <div className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
 #{islandOwnerRank}
 </div>
 </div>

 <div className="mt-4 flex items-center justify-between gap-3">
 <div className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-semibold text-neutral-700">
 <button
 type="button"
 onClick={onPreviewPrev}
 disabled={!canPreviewPrev || !onPreviewPrev}
 className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
 >
 ‹
 </button>
 <span>
 {Math.min(previewIndex + 1, Math.max(previewTotal, 1))}/
 {Math.max(previewTotal, 1)}
 </span>
 <button
 type="button"
 onClick={onPreviewNext}
 disabled={!canPreviewNext || !onPreviewNext}
 className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
 >
 ›
 </button>
 </div>

 {isBuilding ? (
 <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
 <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
 {language === "zh" ? "建造进行中" : "Building in Progress"}
 </div>
 ) : null}
 </div>

 {previewItems.length > 1 ? (
 <div className="mt-4">
 <div className="mb-2 text-xs font-semibold tracking-[0.08em] text-neutral-500">
 {language === "zh" ? "历史生成方案" : "Generated History"}
 </div>

 <div className="grid grid-cols-5 gap-2">
 {previewWindow.map((item) => {
 const isActive = item.signature === previewItems[previewIndex]?.signature;
 const previewImage =
 item.design.views?.main || item.design.image || generatedHouse.image;

 return (
 <button
 key={item.signature}
 type="button"
 onClick={() => onPreviewSelect?.(item.signature)}
 className={`group overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
 isActive
 ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
 : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 <div className="aspect-[4/3] w-full overflow-hidden">
 <img
 src={previewImage}
 alt={item.design.title}
 className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
 />
 </div>
 <div className="p-2">
 <div
 className={`line-clamp-1 text-xs font-semibold ${
 isActive ? "text-white" : "text-neutral-900"
 }`}
 >
 {item.design.title}
 </div>
 <div
 className={`mt-1 line-clamp-1 text-[11px] ${
 isActive ? "text-neutral-300" : "text-neutral-500"
 }`}
 >
 {language === "zh"
 ? item.design.plotZh || "未选地块"
 : item.design.plotEn || "No plot selected"}
 </div>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 ) : null}

 <button
 type="button"
 onClick={() => setShowLightbox(true)}
 className="group relative mt-5 block w-full overflow-hidden rounded-[24px] border border-neutral-200 bg-neutral-100 text-left"
 >
 <img
 src={currentImage}
 alt={generatedHouse.title}
 className="h-[360px] w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-[420px]"
 />
 <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
 <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100">
 {language === "zh" ? "点击查看大图" : "Click to enlarge"}
 </div>
 </button>

 <div className="mt-4 grid grid-cols-4 gap-2">
 {(["scheme1", "scheme2", "scheme3", "scheme4"] as SchemeKey[]).map(
 (schemeKey) => (
 <button
 key={schemeKey}
 onClick={() => setActiveScheme(schemeKey)}
 className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
 activeScheme === schemeKey
 ? "bg-neutral-900 text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
 : "border border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 {SCHEME_LABELS[lang][schemeKey]}
 </button>
 )
 )}
 </div>

 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <div className="rounded-2xl bg-neutral-50 px-4 py-3">
 <div className="text-[11px] text-neutral-400">{t.budget}</div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {language === "zh"
 ? generatedHouse.budgetZh
 : generatedHouse.budgetEn}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-4 py-3">
 <div className="text-[11px] text-neutral-400">{t.duration}</div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {language === "zh"
 ? generatedHouse.durationZh
 : generatedHouse.durationEn}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "建筑面积" : "Building Area"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {generatedHouse.area}
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "地块位置" : "Plot"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {selectedPlot ||
 (language === "zh" ? "未选择地块" : "No plot selected")}
 </div>
 </div>
 </div>

 <div className="mt-5 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
 <div className="grid gap-3 md:grid-cols-3">
 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "土地面积" : "Land Area"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {landArea}㎡
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "土地成本" : "Land Cost"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {landCost.toLocaleString("en-US")} DB
 </div>
 </div>

 <div className="rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "建造成本" : "Build Cost"}
 </div>
 <div className="mt-1 text-sm font-semibold text-neutral-900">
 {buildCost.toLocaleString("en-US")} DB
 </div>
 </div>
 </div>

 <div className="mt-3 rounded-2xl bg-white px-4 py-3">
 <div className="text-[11px] text-neutral-400">
 {language === "zh" ? "总成本" : "Total Cost"}
 </div>
 <div className="mt-1 text-lg font-black tracking-tight text-neutral-900">
 {totalCost.toLocaleString("en-US")} DB
 </div>
 </div>
 </div>

 {buildMessage ? (
 <div
 className={`mt-5 rounded-[20px] border px-4 py-3 text-sm font-medium ${
 buildMessageType === "success"
 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
 : buildMessageType === "error"
 ? "border-red-200 bg-red-50 text-red-700"
 : "border-sky-200 bg-sky-50 text-sky-700"
 }`}
 >
 {buildMessage}
 </div>
 ) : null}

 {isBuilding ? (
 <div className="mt-5 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-4">
 <div className="flex items-center gap-3">
 <div className="relative h-3 w-3">
 <span className="absolute inset-0 animate-ping rounded-full bg-sky-400 opacity-75" />
 <span className="absolute inset-0 rounded-full bg-sky-500" />
 </div>
 <div className="text-sm font-semibold text-sky-800">
 {buildingStatusText}
 </div>
 </div>

 <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sky-100">
 <div
 className={`h-full rounded-full bg-sky-500 transition-all duration-500 ${
 buildStep === 0
 ? "w-[18%]"
 : buildStep === 1
 ? "w-[42%]"
 : buildStep === 2
 ? "w-[76%]"
 : "w-full"
 }`}
 />
 </div>
 </div>
 ) : null}

 <div className="mt-5 rounded-[20px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
 {helperText}
 </div>

 <div className="mt-5 flex flex-wrap gap-3">
 <button
 onClick={onToggleSave}
 className={`px-4 py-3 text-sm font-semibold transition-all duration-200 ${
 isSaved
 ? "rounded-xl bg-neutral-900 text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] hover:-translate-y-1 hover:bg-black hover:shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
 : "rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:bg-neutral-50 hover:text-neutral-900 hover:shadow-[0_10px_20px_rgba(0,0,0,0.12)]"
 }`}
 >
 {isSaved
 ? language === "zh"
 ? "已收藏"
 : "Saved"
 : t.saveDesign}
 </button>

 <button
 onClick={handleBuildDirect}
 disabled={isBuilding}
 className={`px-5 py-3 text-sm font-semibold ${
 isBuilding
 ? "cursor-not-allowed rounded-2xl bg-neutral-400 text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
 : ui.btnPrimary
 }`}
 >
 {buildButtonLabel}
 </button>
 </div>
 </div>

 {showLightbox ? (
 <div
 className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
 onClick={() => setShowLightbox(false)}
 >
 <div
 className="relative h-full w-full max-w-[1700px]"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={() => setShowLightbox(false)}
 className="absolute right-2 top-2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
 >
 ✕
 </button>

 <div className="flex h-full flex-col justify-center">
 <div className="mb-4 flex items-center justify-between gap-3 px-1">
 <div className="min-w-0">
 <div className="truncate text-xl font-bold text-white">
 {generatedHouse.title}
 </div>
 <div className="mt-1 text-sm text-white/70">
 {language === "zh"
 ? "点击右侧方案缩略图切换"
 : "Click the thumbnails on the right to switch"}
 </div>
 </div>

 <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
 {SCHEME_LABELS[lang][activeScheme]}
 </div>
 </div>

 <div className="grid h-[78vh] grid-cols-[minmax(0,1fr)_150px] gap-4">
 <div className="flex h-full min-w-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
 <img
 src={currentImage}
 alt={generatedHouse.title}
 className="max-h-[78vh] w-auto max-w-full object-contain"
 />
 </div>

 <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
 {(["scheme1", "scheme2", "scheme3", "scheme4"] as SchemeKey[]).map(
 (schemeKey) => {
 const schemeImage =
 availableSchemes[schemeKey] || generatedHouse.image;
 const active = activeScheme === schemeKey;

 return (
 <button
 key={schemeKey}
 type="button"
 onClick={() => setActiveScheme(schemeKey)}
 className={`overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
 active
 ? "border-white bg-white/20 shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
 : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
 }`}
 >
 <div className="aspect-[4/3] overflow-hidden">
 <img
 src={schemeImage}
 alt={SCHEME_LABELS[lang][schemeKey]}
 className="h-full w-full object-cover"
 />
 </div>
 <div
 className={`px-2 py-2 text-xs font-semibold ${
 active ? "text-white" : "text-white/80"
 }`}
 >
 {SCHEME_LABELS[lang][schemeKey]}
 </div>
 </button>
 );
 }
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : null}

 {showLotPicker ? (
 <div
 className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
 onClick={() => {
 if (isBuilding) return;
 setShowLotPicker(false);
 }}
 >
 <div
 className="w-full max-w-[720px] rounded-[30px] border border-neutral-200 bg-white p-6 shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="text-sm font-medium text-neutral-500">
 {language === "zh" ? "开始建造" : "Start Building"}
 </div>
 <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
 {language === "zh" ? "选择建造方式" : "Choose Build Method"}
 </h3>
 <p className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "你可以购买一块新的地块，也可以直接使用自己已拥有的空地。"
 : "You can buy a new plot, or directly use one of your owned empty lots."}
 </p>
 </div>

 <button
 onClick={() => {
 if (isBuilding) return;
 setShowLotPicker(false);
 }}
 className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white"
 >
 ✕
 </button>
 </div>

 <div className="mt-6 grid gap-4 md:grid-cols-2">
 <button
 onClick={() => {
 setShowLotPicker(false);
 setBuildMessageType("info");
 setBuildMessage(
 language === "zh"
 ? "请在地图中选择新地块并购买后再开始建造。"
 : "Please choose and buy a new plot from the map before building."
 );
 onJumpToMapChoosePlot();
 }}
 className="rounded-[24px] border border-neutral-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:bg-neutral-50"
 >
 <div className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "购买新地块" : "Buy New Plot"}
 </div>
 <div className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "跳转到地图区域并高亮提醒，先购买新的地块。"
 : "Jump to the map area with a highlight, then buy a new plot first."}
 </div>
 </button>

 <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
 <div className="text-lg font-semibold text-neutral-900">
 {language === "zh" ? "使用自有地块" : "Use Owned Plot"}
 </div>
 <div className="mt-2 text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "先选择一个你已经拥有且尚未建造的 lot，再点击下方开始建造。"
 : "Select a lot you already own and have not built on, then click Start Build below."}
 </div>

 <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
 {buildableOwnedLots.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
 {language === "zh"
 ? "当前没有可直接建造的自有地块。"
 : "No buildable owned plots available right now."}
 </div>
 ) : (
 buildableOwnedLots.map((lot) => {
 const isSelected =
 pendingBuildLot?.plotId === lot.plotId &&
 pendingBuildLot?.lotId === lot.lotId;

 return (
 <button
 key={`${lot.plotId}-${lot.lotId}`}
 onClick={() => setPendingBuildLot(lot)}
 disabled={isBuilding}
 className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
 isSelected
 ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
 : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
 }`}
 >
 <div>
 <div
 className={`text-sm font-semibold ${
 isSelected ? "text-white" : "text-neutral-900"
 }`}
 >
 {language === "zh" ? lot.labelZh : lot.labelEn}
 </div>
 <div
 className={`mt-1 text-xs ${
 isSelected ? "text-neutral-300" : "text-neutral-500"
 }`}
 >
 {language === "zh"
 ? "选中后可点击下方开始建造"
 : "After selecting, click Start Build below"}
 </div>
 </div>
 <span
 className={`text-sm font-semibold ${
 isSelected ? "text-white" : "text-neutral-400"
 }`}
 >
 {isSelected ? "✓" : "→"}
 </span>
 </button>
 );
 })
 )}
 </div>

 <div className="mt-4 flex items-center justify-between gap-3">
 <div className="text-xs text-neutral-500">
 {pendingBuildLot
 ? language === "zh"
 ? `当前已选择：${pendingBuildLot.labelZh}`
 : `Selected: ${pendingBuildLot.labelEn}`
 : language === "zh"
 ? "尚未选择地块"
 : "No lot selected"}
 </div>

 <button
 onClick={handleConfirmOwnedLotBuild}
 disabled={!pendingBuildLot || isBuilding}
 className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
 !pendingBuildLot || isBuilding
 ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
 : "bg-neutral-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-black"
 }`}
 >
 {language === "zh" ? "开始建造" : "Start Build"}
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