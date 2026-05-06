"use client";

import React, { useMemo, useState } from "react";
import type { HouseDesignPackage } from "@/app/lib/designTypes";

type Props = {
 result: HouseDesignPackage | null;
 printMode?: boolean;
 idPrefix?: string;
};

type ViewMode = "front" | "side";

const CANVAS_W = 1080;
const CANVAS_H = 560;

function normalizeResult(result: HouseDesignPackage | null) {
 const r = (result ?? {}) as any;

 return {
 ...r,
 site: {
 floors: 1,
 buildAreaTarget: 120,
 ...(r.site ?? {}),
 },
 requirements: {
 needGarage: false,
 needBalcony: false,
 needTerrace: false,
 ...(r.requirements ?? {}),
 },
 style: {
 facadeMaterials: [],
 roofType: "gable",
 ...(r.style ?? {}),
 },
 };
}

function getFacadePalette(materials: string[], printMode?: boolean) {
 const list = Array.isArray(materials) ? materials : [];

 if (printMode) {
 return {
 base: "#f8fafc",
 accent: "#e2e8f0",
 frame: "#334155",
 glass: "#dbeafe",
 roof: "#64748b",
 };
 }

 if (list.includes("stone_panel")) {
 return {
 base: "#d6d1ca",
 accent: "#9a8f84",
 frame: "#3b434c",
 glass: "#9fd0df",
 roof: "#7b8288",
 };
 }

 if (list.includes("wood_finish")) {
 return {
 base: "#ddd6cb",
 accent: "#9f7a58",
 frame: "#2f3640",
 glass: "#9fd0df",
 roof: "#7b8288",
 };
 }

 return {
 base: "#d9d9d6",
 accent: "#b7b0a8",
 frame: "#39414a",
 glass: "#9fd0df",
 roof: "#7b8288",
 };
}

function getRoofProfile(roofType: string) {
 switch (roofType) {
 case "gable":
 return "gable";
 case "hip":
 return "hip";
 case "mixed":
 return "mixed";
 default:
 return "flat";
 }
}

function estimateBuildingMetrics(result: HouseDesignPackage | null) {
 const safe = normalizeResult(result);
 const floors = Math.max(1, Number((safe as any).site?.floors ?? 1));
 const area = Math.max(80, Number((safe as any).site?.buildAreaTarget ?? 120));

 const footprint = area / floors;
 const widthM = Math.max(9.5, Math.sqrt(footprint * 1.45));
 const depthM = Math.max(8.2, footprint / widthM);

 const firstFloorH = (safe as any).requirements?.needGarage ? 3.6 : 3.4;
 const upperFloorH = 3.2;
 const roofType = (safe as any).style?.roofType ?? "gable";
 const parapetH = roofType === "flat" ? 0.6 : 0.2;
 const roofExtra = roofType === "flat" ? 0 : roofType === "mixed" ? 1.8 : 2.2;

 const totalHeight =
 firstFloorH +
 Math.max(0, floors - 1) * upperFloorH +
 parapetH +
 roofExtra;

 return { widthM, depthM, firstFloorH, upperFloorH, totalHeight, floors };
}

function drawRoofPath(profile: string, x: number, y: number, w: number) {
 if (profile === "gable") {
 const peakX = x + w / 2;
 const peakY = y - 42;
 return `M ${x} ${y} L ${peakX} ${peakY} L ${x + w} ${y}`;
 }

 if (profile === "hip") {
 const left = x + w * 0.12;
 const right = x + w * 0.88;
 const peakX = x + w / 2;
 const peakY = y - 34;
 return `M ${x} ${y} L ${left} ${y} L ${peakX} ${peakY} L ${right} ${y} L ${x + w} ${y}`;
 }

 if (profile === "mixed") {
 const leftPeakX = x + w * 0.34;
 const rightPeakX = x + w * 0.72;
 return `M ${x} ${y} L ${leftPeakX} ${y - 34} L ${x + w * 0.52} ${y - 16} L ${rightPeakX} ${y - 28} L ${x + w} ${y}`;
 }

 return `M ${x} ${y} L ${x + w} ${y}`;
}

function WindowUnit({
 x,
 y,
 w,
 h,
 frame,
 glass,
 label,
 printMode,
}: {
 x: number;
 y: number;
 w: number;
 h: number;
 frame: string;
 glass: string;
 label?: string;
 printMode?: boolean;
}) {
 return (
 <g>
 <rect x={x} y={y} width={w} height={h} fill={frame} rx={3} />
 <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill={glass} />
 <line
 x1={x + w / 2}
 y1={y + 4}
 x2={x + w / 2}
 y2={y + h - 4}
 stroke={printMode ? "#93c5fd" : "rgba(255,255,255,0.28)"}
 strokeWidth={1.4}
 />
 <line
 x1={x + 4}
 y1={y + h / 2}
 x2={x + w - 4}
 y2={y + h / 2}
 stroke={printMode ? "#bfdbfe" : "rgba(255,255,255,0.18)"}
 strokeWidth={1.1}
 />
 {label ? (
 <text
 x={x + w / 2}
 y={y - 8}
 textAnchor="middle"
 fill={printMode ? "#0284c7" : "rgba(103,232,249,0.95)"}
 fontSize={10}
 fontWeight={700}
 >
 {label}
 </text>
 ) : null}
 </g>
 );
}

function DoorUnit({
 x,
 y,
 w,
 h,
 frame,
 accent,
 label,
 printMode,
}: {
 x: number;
 y: number;
 w: number;
 h: number;
 frame: string;
 accent: string;
 label?: string;
 printMode?: boolean;
}) {
 return (
 <g>
 <rect x={x} y={y} width={w} height={h} fill={frame} rx={2} />
 <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill={accent} rx={2} />
 <circle
 cx={x + w - 12}
 cy={y + h / 2}
 r={2}
 fill={printMode ? "#e2e8f0" : "rgba(255,255,255,0.7)"}
 />
 {label ? (
 <text
 x={x + w / 2}
 y={y - 8}
 textAnchor="middle"
 fill={printMode ? "#0f172a" : "rgba(255,255,255,0.9)"}
 fontSize={10}
 fontWeight={700}
 >
 {label}
 </text>
 ) : null}
 </g>
 );
}

function GarageDoor({
 x,
 y,
 w,
 h,
 frame,
 label,
 printMode,
}: {
 x: number;
 y: number;
 w: number;
 h: number;
 frame: string;
 label?: string;
 printMode?: boolean;
}) {
 return (
 <g>
 <rect x={x} y={y} width={w} height={h} fill={frame} rx={2} />
 <rect
 x={x + 4}
 y={y + 4}
 width={w - 8}
 height={h - 8}
 fill={printMode ? "#f8fafc" : "rgba(255,255,255,0.08)"}
 />
 {Array.from({ length: 5 }).map((_, i) => {
 const yy = y + 12 + i * ((h - 24) / 4);
 return (
 <line
 key={i}
 x1={x + 10}
 y1={yy}
 x2={x + w - 10}
 y2={yy}
 stroke={printMode ? "#cbd5e1" : "rgba(255,255,255,0.18)"}
 strokeWidth={1}
 />
 );
 })}
 {label ? (
 <text
 x={x + w / 2}
 y={y - 8}
 textAnchor="middle"
 fill={printMode ? "#0f172a" : "rgba(255,255,255,0.9)"}
 fontSize={10}
 fontWeight={700}
 >
 {label}
 </text>
 ) : null}
 </g>
 );
}

function DimensionLine({
 x1,
 y1,
 x2,
 y2,
 label,
 printMode,
}: {
 x1: number;
 y1: number;
 x2: number;
 y2: number;
 label: string;
 printMode?: boolean;
}) {
 const isVertical = Math.abs(x1 - x2) < 1;
 const tx = (x1 + x2) / 2;
 const ty = (y1 + y2) / 2;

 return (
 <g>
 <line
 x1={x1}
 y1={y1}
 x2={x2}
 y2={y2}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.4)"}
 strokeWidth={1.2}
 />
 {isVertical ? (
 <text
 x={tx - 8}
 y={ty}
 textAnchor="middle"
 fill={printMode ? "#0369a1" : "rgba(103,232,249,0.95)"}
 fontSize={11}
 transform={`rotate(-90 ${tx - 8} ${ty})`}
 fontWeight={700}
 >
 {label}
 </text>
 ) : (
 <text
 x={tx}
 y={ty - 6}
 textAnchor="middle"
 fill={printMode ? "#0369a1" : "rgba(103,232,249,0.95)"}
 fontSize={11}
 fontWeight={700}
 >
 {label}
 </text>
 )}
 </g>
 );
}

function LevelLine({
 y,
 label,
 printMode,
}: {
 y: number;
 label: string;
 printMode?: boolean;
}) {
 return (
 <g>
 <line
 x1={120}
 y1={y}
 x2={1020}
 y2={y}
 stroke={printMode ? "#cbd5e1" : "rgba(255,255,255,0.14)"}
 strokeWidth={1}
 strokeDasharray="6 6"
 />
 <text
 x={86}
 y={y + 4}
 fill={printMode ? "#64748b" : "rgba(255,255,255,0.62)"}
 fontSize={11}
 >
 {label}
 </text>
 </g>
 );
}

function ElevationDrawing({
 result,
 view,
 printMode,
 idPrefix,
}: {
 result: HouseDesignPackage | null;
 view: ViewMode;
 printMode?: boolean;
 idPrefix: string;
}) {
 const safe = normalizeResult(result);
 const style = (safe as any).style ?? {};
 const requirements = (safe as any).requirements ?? {};

 const palette = getFacadePalette(style.facadeMaterials ?? [], printMode);
 const roofProfile = getRoofProfile(style.roofType ?? "gable");
 const metrics = estimateBuildingMetrics(safe as any);

 const scaleBaseW = view === "front" ? metrics.widthM : metrics.depthM;
 const left = 180;
 const baseY = 430;
 const drawW = 700;
 const pxPerM = drawW / scaleBaseW;

 const bodyW = scaleBaseW * pxPerM;
 const bodyX = left + (drawW - bodyW) / 2;

 const firstH = metrics.firstFloorH * 38;
 const upperH = metrics.upperFloorH * 36;
 const bodyH = firstH + Math.max(0, metrics.floors - 1) * upperH + 10;

 const bodyY = baseY - bodyH;
 const roofY = bodyY;

 const hasBalcony = Boolean(requirements.needBalcony);
 const hasTerrace = Boolean(requirements.needTerrace);
 const hasGarage = Boolean(requirements.needGarage);
 const floors = metrics.floors;

 const bg = printMode ? "#ffffff" : "#0d131b";
 const gridStroke = printMode ? "#eef2f7" : "rgba(255,255,255,0.028)";
 const title = printMode ? "#0f172a" : "rgba(255,255,255,0.9)";
 const sub = printMode ? "#64748b" : "rgba(255,255,255,0.46)";
 const materialText = printMode ? "#475569" : "rgba(255,255,255,0.62)";

 return (
 <svg
 viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
 className={printMode ? "h-auto w-full" : "h-auto min-w-[900px] w-full"}
 role="img"
 aria-label={view === "front" ? "正立面图" : "侧立面图"}
 >
 <defs>
 <pattern
 id={`${idPrefix}-grid`}
 width="24"
 height="24"
 patternUnits="userSpaceOnUse"
 >
 <path
 d="M 24 0 L 0 0 0 24"
 fill="none"
 stroke={gridStroke}
 strokeWidth="1"
 />
 </pattern>
 </defs>

 <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill={bg} />
 <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill={`url(#${idPrefix}-grid)`} />

 <text x="48" y="44" fill={title} fontSize="22" fontWeight={700}>
 {view === "front" ? "正立面图" : "侧立面图"}
 </text>
 <text x="48" y="68" fill={sub} fontSize={11}>
 Architectural elevation · material zoning · linked door/window tags
 </text>

 <LevelLine y={baseY} label="±0.000" printMode={printMode} />
 <LevelLine y={bodyY + firstH} label="2F" printMode={printMode} />
 <LevelLine y={bodyY} label="Roof / Parapet" printMode={printMode} />

 <rect
 x={bodyX}
 y={bodyY}
 width={bodyW}
 height={bodyH}
 fill={palette.base}
 stroke={printMode ? "#475569" : "rgba(255,255,255,0.2)"}
 strokeWidth={1.5}
 />
 {(style.facadeMaterials ?? []).slice(0, 2).length > 1 ? (
 <rect
 x={bodyX + bodyW * 0.62}
 y={bodyY}
 width={bodyW * 0.18}
 height={bodyH}
 fill={palette.accent}
 opacity={0.95}
 />
 ) : null}
 <rect
 x={bodyX}
 y={bodyY + firstH - 6}
 width={bodyW}
 height={6}
 fill={printMode ? "#cbd5e1" : "rgba(0,0,0,0.14)"}
 />

 {roofProfile === "flat" ? (
 <g>
 <rect x={bodyX - 4} y={bodyY - 10} width={bodyW + 8} height={10} fill={palette.roof} />
 <rect
 x={bodyX}
 y={bodyY - 18}
 width={bodyW}
 height={8}
 fill={printMode ? "#e2e8f0" : "rgba(255,255,255,0.06)"}
 />
 </g>
 ) : (
 <path
 d={drawRoofPath(roofProfile, bodyX - 4, roofY, bodyW + 8)}
 fill="none"
 stroke={palette.roof}
 strokeWidth={10}
 strokeLinejoin="round"
 strokeLinecap="round"
 />
 )}

 {view === "front" ? (
 <>
 <WindowUnit
 x={bodyX + bodyW * 0.18}
 y={bodyY + firstH - 128}
 w={58}
 h={86}
 frame={palette.frame}
 glass={palette.glass}
 label="W01"
 printMode={printMode}
 />
 <WindowUnit
 x={bodyX + bodyW * 0.42}
 y={bodyY + firstH - 120}
 w={54}
 h={78}
 frame={palette.frame}
 glass={palette.glass}
 label="W03"
 printMode={printMode}
 />
 <WindowUnit
 x={bodyX + bodyW * 0.68}
 y={bodyY + firstH - 118}
 w={46}
 h={64}
 frame={palette.frame}
 glass={palette.glass}
 label="W04"
 printMode={printMode}
 />

 {floors >= 2 ? (
 <>
 <WindowUnit
 x={bodyX + bodyW * 0.18}
 y={bodyY + 26}
 w={54}
 h={74}
 frame={palette.frame}
 glass={palette.glass}
 label="W02"
 printMode={printMode}
 />
 <WindowUnit
 x={bodyX + bodyW * 0.66}
 y={bodyY + 26}
 w={54}
 h={74}
 frame={palette.frame}
 glass={palette.glass}
 label="W02"
 printMode={printMode}
 />
 </>
 ) : null}

 <DoorUnit
 x={bodyX + bodyW * 0.08}
 y={baseY - 104}
 w={58}
 h={104}
 frame={palette.frame}
 accent={palette.accent}
 label="D01"
 printMode={printMode}
 />

 {hasGarage ? (
 <GarageDoor
 x={bodyX + bodyW * 0.66}
 y={baseY - 94}
 w={bodyW * 0.22}
 h={94}
 frame={palette.frame}
 label="D02"
 printMode={printMode}
 />
 ) : null}
 </>
 ) : (
 <>
 <WindowUnit
 x={bodyX + bodyW * 0.18}
 y={bodyY + firstH - 124}
 w={56}
 h={82}
 frame={palette.frame}
 glass={palette.glass}
 label="W02"
 printMode={printMode}
 />
 <WindowUnit
 x={bodyX + bodyW * 0.56}
 y={bodyY + firstH - 118}
 w={48}
 h={66}
 frame={palette.frame}
 glass={palette.glass}
 label="W04"
 printMode={printMode}
 />
 {floors >= 2 ? (
 <WindowUnit
 x={bodyX + bodyW * 0.34}
 y={bodyY + 30}
 w={52}
 h={70}
 frame={palette.frame}
 glass={palette.glass}
 label={hasTerrace || hasBalcony ? "W05" : "W02"}
 printMode={printMode}
 />
 ) : null}
 </>
 )}

 {hasBalcony && floors >= 2 ? (
 <g>
 <rect
 x={bodyX + bodyW * 0.24}
 y={bodyY + firstH - 12}
 width={bodyW * 0.22}
 height={10}
 fill={printMode ? "#94a3b8" : "#6d737a"}
 />
 <line
 x1={bodyX + bodyW * 0.24}
 y1={bodyY + firstH - 26}
 x2={bodyX + bodyW * 0.46}
 y2={bodyY + firstH - 26}
 stroke={printMode ? "#64748b" : "rgba(255,255,255,0.72)"}
 strokeWidth={2}
 />
 {Array.from({ length: 5 }).map((_, i) => {
 const xx = bodyX + bodyW * 0.24 + i * ((bodyW * 0.22) / 4);
 return (
 <line
 key={i}
 x1={xx}
 y1={bodyY + firstH - 26}
 x2={xx}
 y2={bodyY + firstH - 12}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.55)"}
 strokeWidth={1.3}
 />
 );
 })}
 </g>
 ) : null}

 {hasTerrace && view === "side" ? (
 <g>
 <rect
 x={bodyX + bodyW * 0.62}
 y={bodyY + 18}
 width={bodyW * 0.18}
 height={6}
 fill={printMode ? "#94a3b8" : "#8a8f95"}
 />
 <line
 x1={bodyX + bodyW * 0.62}
 y1={bodyY + 14}
 x2={bodyX + bodyW * 0.8}
 y2={bodyY + 14}
 stroke={printMode ? "#64748b" : "rgba(255,255,255,0.75)"}
 strokeWidth={1.7}
 />
 </g>
 ) : null}

 <DimensionLine
 x1={bodyX}
 y1={baseY + 42}
 x2={bodyX + bodyW}
 y2={baseY + 42}
 label={`${(view === "front" ? metrics.widthM : metrics.depthM).toFixed(1)}m`}
 printMode={printMode}
 />
 <line
 x1={bodyX}
 y1={baseY}
 x2={bodyX}
 y2={baseY + 42}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"}
 />
 <line
 x1={bodyX + bodyW}
 y1={baseY}
 x2={bodyX + bodyW}
 y2={baseY + 42}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"}
 />

 <DimensionLine
 x1={bodyX - 56}
 y1={baseY}
 x2={bodyX - 56}
 y2={bodyY}
 label={`${metrics.totalHeight.toFixed(1)}m`}
 printMode={printMode}
 />
 <line
 x1={bodyX}
 y1={baseY}
 x2={bodyX - 56}
 y2={baseY}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"}
 />
 <line
 x1={bodyX}
 y1={bodyY}
 x2={bodyX - 56}
 y2={bodyY}
 stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"}
 />

 {!printMode ? (
 <g transform="translate(54 474)">
 <text x="0" y="0" fill="rgba(255,255,255,0.78)" fontSize={12} fontWeight={700}>
 图例 Legend
 </text>
 {[
 ["D01/D02 门编号", "rgba(255,255,255,0.86)"],
 ["W01~W05 窗编号", "rgba(103,232,249,0.95)"],
 ["材质色带", materialText],
 ].map(([label, color], index) => (
 <g key={label} transform={`translate(${index * 180} 22)`}>
 <line x1="0" y1="0" x2="26" y2="0" stroke={color} strokeWidth="2" />
 <text x="36" y="4" fill={materialText} fontSize="11">
 {label}
 </text>
 </g>
 ))}
 </g>
 ) : null}
 </svg>
 );
}

export default function GeneratedElevationCanvas({
 result,
 printMode = false,
 idPrefix = "screen-elevation",
}: Props) {
 const safeResult = useMemo(() => normalizeResult(result), [result]);
 const [view, setView] = useState<ViewMode>("front");
 const stats = useMemo(() => estimateBuildingMetrics(safeResult as any), [safeResult]);

 if (!result && !printMode) {
 return (
 <div className="rounded-[28px] border border-white/10 bg-[#10151d]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
 暂无立面图，请先生成方案。
 </div>
 </div>
 );
 }

 return (
 <div
 className={
 printMode
 ? ""
 : "rounded-[28px] border border-white/10 bg-[#10151d]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
 }
 >
 {!printMode ? (
 <>
 <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <div>
 <h3 className="text-lg font-semibold text-white">Professional Elevation</h3>
 <p className="mt-1 text-sm text-white/50">
 专业立面图：门窗编号与门窗表联动
 </p>
 </div>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setView("front")}
 className={`rounded-full border px-4 py-2 text-sm transition ${
 view === "front"
 ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
 : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
 }`}
 >
 正立面
 </button>
 <button
 type="button"
 onClick={() => setView("side")}
 className={`rounded-full border px-4 py-2 text-sm transition ${
 view === "side"
 ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
 : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
 }`}
 >
 侧立面
 </button>
 </div>
 </div>

 <div className="mb-4 grid gap-3 md:grid-cols-4">
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">楼层数</div>
 <div className="mt-1 text-base font-semibold text-white">{stats.floors}</div>
 </div>
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">估算总高</div>
 <div className="mt-1 text-base font-semibold text-white">
 {stats.totalHeight.toFixed(1)}m
 </div>
 </div>
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">正面宽度</div>
 <div className="mt-1 text-base font-semibold text-white">
 {stats.widthM.toFixed(1)}m
 </div>
 </div>
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">侧面进深</div>
 <div className="mt-1 text-base font-semibold text-white">
 {stats.depthM.toFixed(1)}m
 </div>
 </div>
 </div>
 </>
 ) : (
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 marginBottom: 10,
 alignItems: "center",
 }}
 >
 <div>
 <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
 立面图 Elevation
 </div>
 <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
 {view === "front" ? "正立面" : "侧立面"}
 </div>
 </div>
 <div style={{ display: "flex", gap: 8 }}>
 <button
 type="button"
 onClick={() => setView("front")}
 style={{
 border: `1px solid ${view === "front" ? "#0284c7" : "#cbd5e1"}`,
 background: view === "front" ? "#e0f2fe" : "#ffffff",
 color: view === "front" ? "#0369a1" : "#334155",
 padding: "6px 12px",
 borderRadius: 999,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 正立面
 </button>
 <button
 type="button"
 onClick={() => setView("side")}
 style={{
 border: `1px solid ${view === "side" ? "#0284c7" : "#cbd5e1"}`,
 background: view === "side" ? "#e0f2fe" : "#ffffff",
 color: view === "side" ? "#0369a1" : "#334155",
 padding: "6px 12px",
 borderRadius: 999,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 侧立面
 </button>
 </div>
 </div>
 )}

 <div className={printMode ? "" : "overflow-hidden rounded-[24px] border border-white/10 bg-[#0d131b]"}>
 <div className="overflow-x-auto">
 <ElevationDrawing
 result={safeResult as any}
 view={view}
 printMode={printMode}
 idPrefix={`${idPrefix}-${view}`}
 />
 </div>
 </div>
 </div>
 );
}