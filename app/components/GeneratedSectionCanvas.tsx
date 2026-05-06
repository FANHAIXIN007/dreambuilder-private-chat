// @ts-nocheck
"use client";

import React from "react";
import type { HouseDesignPackage } from "@/app/lib/designTypes";

type Props = {
 result: HouseDesignPackage;
 printMode?: boolean;
 idPrefix?: string;
};

const CANVAS_W = 1080;
const CANVAS_H = 560;

function estimateMetrics(result: HouseDesignPackage) {
 const floors = Math.max(1, result.site.floors);
 const area = Math.max(80, result.site.buildAreaTarget);

 const footprint = area / floors;
 const widthM = Math.max(9.2, Math.sqrt(footprint * 1.38));
 const depthM = Math.max(8, footprint / widthM);

 const firstFloorH = result.requirements.needGarage ? 3.6 : 3.4;
 const upperFloorH = 3.2;
 const slabH = 0.22;
 const parapetH = result.style.roofType === "flat" ? 0.65 : 0.2;
 const roofRise =
 result.style.roofType === "flat"
 ? 0
 : result.style.roofType === "mixed"
 ? 1.4
 : 1.9;

 const totalHeight =
 firstFloorH +
 Math.max(0, floors - 1) * upperFloorH +
 Math.max(0, floors - 1) * slabH +
 parapetH +
 roofRise;

 return {
 floors,
 widthM,
 depthM,
 firstFloorH,
 upperFloorH,
 slabH,
 parapetH,
 roofRise,
 totalHeight,
 };
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
 stroke={printMode ? "#cbd5e1" : "rgba(255,255,255,0.12)"}
 strokeWidth={1}
 strokeDasharray="6 6"
 />
 <text
 x={84}
 y={y + 4}
 fill={printMode ? "#64748b" : "rgba(255,255,255,0.62)"}
 fontSize={11}
 >
 {label}
 </text>
 </g>
 );
}

function DimLine({
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

function StairSection({
 x,
 baseY,
 floorHeight,
 stepCount,
 direction,
 printMode,
}: {
 x: number;
 baseY: number;
 floorHeight: number;
 stepCount: number;
 direction: "up-right" | "up-left";
 printMode?: boolean;
}) {
 const tread = 18;
 const riser = floorHeight / stepCount;
 const stroke = printMode ? "#475569" : "rgba(255,255,255,0.75)";

 const lines = Array.from({ length: stepCount }).map((_, i) => {
 const xx = direction === "up-right" ? x + i * tread : x - i * tread;
 const yy = baseY - i * riser;

 if (direction === "up-right") {
 return (
 <g key={i}>
 <line x1={xx} y1={yy} x2={xx + tread} y2={yy} stroke={stroke} strokeWidth={1.5} />
 <line x1={xx + tread} y1={yy} x2={xx + tread} y2={yy - riser} stroke={stroke} strokeWidth={1.5} />
 </g>
 );
 }

 return (
 <g key={i}>
 <line x1={xx} y1={yy} x2={xx - tread} y2={yy} stroke={stroke} strokeWidth={1.5} />
 <line x1={xx - tread} y1={yy} x2={xx - tread} y2={yy - riser} stroke={stroke} strokeWidth={1.5} />
 </g>
 );
 });

 return <g>{lines}</g>;
}

export default function GeneratedSectionCanvas({
 result,
 printMode = false,
 idPrefix = "screen-section",
}: Props) {
 const metrics = estimateMetrics(result);

 const bg = printMode ? "#ffffff" : "#0d131b";
 const gridStroke = printMode ? "#eef2f7" : "rgba(255,255,255,0.03)";
 const title = printMode ? "#0f172a" : "rgba(255,255,255,0.9)";
 const sub = printMode ? "#64748b" : "rgba(255,255,255,0.46)";

 const bodyX = 220;
 const baseY = 450;
 const drawW = 620;
 const pxPerM = drawW / metrics.depthM;
 const bodyW = metrics.depthM * pxPerM;

 const firstH = metrics.firstFloorH * 42;
 const upperH = metrics.upperFloorH * 40;
 const slabH = metrics.slabH * 28;

 const totalBuiltH =
 firstH +
 Math.max(0, metrics.floors - 1) * upperH +
 Math.max(0, metrics.floors - 1) * slabH;

 const bodyY = baseY - totalBuiltH;
 const floor2Y = baseY - firstH - slabH;

 const wallFill = printMode ? "#f8fafc" : "#d9d9d6";
 const roofFill = printMode ? "#94a3b8" : "#7b8288";
 const floorFill = printMode ? "#cbd5e1" : "#9ca3af";
 const cutStroke = printMode ? "#334155" : "#ffffff";
 const glass = printMode ? "#dbeafe" : "#9fd0df";
 const frame = printMode ? "#334155" : "#39414a";
 const ground = printMode ? "#94a3b8" : "rgba(255,255,255,0.4)";

 return (
 <div className={printMode ? "" : "rounded-[28px] border border-white/10 bg-[#10151d]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"}>
 {!printMode ? (
 <div className="mb-4">
 <h3 className="text-lg font-semibold text-white">Professional Section</h3>
 <p className="mt-1 text-sm text-white/50">
 剖面图：门窗编号与平面图、立面图、门窗表联动
 </p>
 </div>
 ) : (
 <div style={{ marginBottom: 10 }}>
 <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>剖面图 Section</div>
 <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
 Vertical spatial relation and linked opening tags
 </div>
 </div>
 )}

 <div className={printMode ? "" : "overflow-hidden rounded-[24px] border border-white/10 bg-[#0d131b]"}>
 <div className="overflow-x-auto">
 <svg
 viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
 className={printMode ? "h-auto w-full" : "h-auto min-w-[900px] w-full"}
 role="img"
 aria-label="建筑剖面图"
 >
 <defs>
 <pattern id={`${idPrefix}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
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
 建筑剖面图
 </text>
 <text x="48" y="68" fill={sub} fontSize="11">
 Architectural section · linked D/W tags across plan/elevation/section
 </text>

 <LevelLine y={baseY} label="±0.000" printMode={printMode} />
 {metrics.floors >= 2 ? (
 <LevelLine y={floor2Y} label="2F" printMode={printMode} />
 ) : null}
 <LevelLine y={bodyY} label="Roof" printMode={printMode} />

 <line x1={120} y1={baseY} x2={980} y2={baseY} stroke={ground} strokeWidth={2} />

 <rect
 x={bodyX}
 y={bodyY}
 width={bodyW}
 height={totalBuiltH}
 fill={wallFill}
 stroke={cutStroke}
 strokeWidth={2}
 />

 {result.style.roofType === "flat" ? (
 <rect
 x={bodyX - 2}
 y={bodyY - 12}
 width={bodyW + 4}
 height={12}
 fill={roofFill}
 />
 ) : (
 <path
 d={`M ${bodyX} ${bodyY} L ${bodyX + bodyW / 2} ${bodyY - 34} L ${bodyX + bodyW} ${bodyY}`}
 fill="none"
 stroke={roofFill}
 strokeWidth={10}
 strokeLinejoin="round"
 />
 )}

 <rect x={bodyX} y={baseY - 8} width={bodyW} height={8} fill={floorFill} />
 {metrics.floors >= 2 ? (
 <rect x={bodyX} y={floor2Y} width={bodyW} height={8} fill={floorFill} />
 ) : null}

 <rect x={bodyX + 46} y={baseY - 110} width={44} height={110} fill={frame} />
 <rect x={bodyX + 50} y={baseY - 106} width={36} height={102} fill={printMode ? "#f1f5f9" : "#c2a48b"} />
 <text x={bodyX + 68} y={baseY - 118} textAnchor="middle" fill={printMode ? "#0f172a" : "rgba(255,255,255,0.9)"} fontSize={10} fontWeight={700}>
 D01
 </text>

 <rect x={bodyX + bodyW * 0.62} y={baseY - 96} width={52} height={72} fill={frame} />
 <rect x={bodyX + bodyW * 0.62 + 4} y={baseY - 92} width={44} height={64} fill={glass} />
 <text x={bodyX + bodyW * 0.62 + 26} y={baseY - 104} textAnchor="middle" fill={printMode ? "#0284c7" : "rgba(103,232,249,0.95)"} fontSize={10} fontWeight={700}>
 W03
 </text>

 {metrics.floors >= 2 ? (
 <>
 <rect x={bodyX + bodyW * 0.18} y={floor2Y + 34} width={54} height={72} fill={frame} />
 <rect x={bodyX + bodyW * 0.18 + 4} y={floor2Y + 38} width={46} height={64} fill={glass} />
 <text x={bodyX + bodyW * 0.18 + 27} y={floor2Y + 26} textAnchor="middle" fill={printMode ? "#0284c7" : "rgba(103,232,249,0.95)"} fontSize={10} fontWeight={700}>
 W02
 </text>

 <rect x={bodyX + bodyW * 0.7} y={floor2Y + 30} width={50} height={68} fill={frame} />
 <rect x={bodyX + bodyW * 0.7 + 4} y={floor2Y + 34} width={42} height={60} fill={glass} />
 <text x={bodyX + bodyW * 0.7 + 25} y={floor2Y + 22} textAnchor="middle" fill={printMode ? "#0284c7" : "rgba(103,232,249,0.95)"} fontSize={10} fontWeight={700}>
 {result.requirements.needBalcony || result.requirements.needTerrace ? "W05" : "W02"}
 </text>
 </>
 ) : null}

 <StairSection
 x={bodyX + bodyW * 0.38}
 baseY={baseY}
 floorHeight={firstH}
 stepCount={10}
 direction="up-right"
 printMode={printMode}
 />

 <rect
 x={bodyX + 12}
 y={baseY - firstH + 16}
 width={bodyW * 0.28}
 height={firstH - 28}
 fill={printMode ? "#eff6ff" : "rgba(59,130,246,0.12)"}
 stroke={printMode ? "#bfdbfe" : "rgba(255,255,255,0.16)"}
 />
 <rect
 x={bodyX + bodyW * 0.55}
 y={baseY - firstH + 16}
 width={bodyW * 0.22}
 height={firstH - 28}
 fill={printMode ? "#f8fafc" : "rgba(255,255,255,0.06)"}
 stroke={printMode ? "#cbd5e1" : "rgba(255,255,255,0.16)"}
 />
 {metrics.floors >= 2 ? (
 <>
 <rect
 x={bodyX + 18}
 y={floor2Y + 18}
 width={bodyW * 0.26}
 height={upperH - 22}
 fill={printMode ? "#eef2ff" : "rgba(99,102,241,0.12)"}
 stroke={printMode ? "#c7d2fe" : "rgba(255,255,255,0.16)"}
 />
 <rect
 x={bodyX + bodyW * 0.58}
 y={floor2Y + 16}
 width={bodyW * 0.2}
 height={upperH - 20}
 fill={printMode ? "#fff7ed" : "rgba(245,158,11,0.12)"}
 stroke={printMode ? "#fed7aa" : "rgba(255,255,255,0.16)"}
 />
 </>
 ) : null}

 <text x={bodyX + 34} y={baseY - firstH + 40} fill={printMode ? "#0f172a" : "white"} fontSize={12} fontWeight={700}>
 客厅 / 起居空间
 </text>
 <text x={bodyX + bodyW * 0.58} y={baseY - firstH + 40} fill={printMode ? "#0f172a" : "white"} fontSize={12} fontWeight={700}>
 厨餐 / 入口
 </text>

 {metrics.floors >= 2 ? (
 <>
 <text x={bodyX + 36} y={floor2Y + 40} fill={printMode ? "#0f172a" : "white"} fontSize={12} fontWeight={700}>
 卧室 / 套房
 </text>
 <text x={bodyX + bodyW * 0.61} y={floor2Y + 40} fill={printMode ? "#0f172a" : "white"} fontSize={12} fontWeight={700}>
 阳台 / 露台
 </text>
 </>
 ) : null}

 <DimLine
 x1={bodyX - 56}
 y1={baseY}
 x2={bodyX - 56}
 y2={bodyY}
 label={`${metrics.totalHeight.toFixed(1)}m`}
 printMode={printMode}
 />
 <line x1={bodyX} y1={baseY} x2={bodyX - 56} y2={baseY} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />
 <line x1={bodyX} y1={bodyY} x2={bodyX - 56} y2={bodyY} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />

 <DimLine
 x1={bodyX + bodyW + 42}
 y1={baseY}
 x2={bodyX + bodyW + 42}
 y2={baseY - firstH}
 label={`${metrics.firstFloorH.toFixed(1)}m`}
 printMode={printMode}
 />
 <line x1={bodyX + bodyW} y1={baseY} x2={bodyX + bodyW + 42} y2={baseY} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />
 <line x1={bodyX + bodyW} y1={baseY - firstH} x2={bodyX + bodyW + 42} y2={baseY - firstH} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />

 {metrics.floors >= 2 ? (
 <>
 <DimLine
 x1={bodyX + bodyW + 72}
 y1={baseY - firstH - slabH}
 x2={bodyX + bodyW + 72}
 y2={bodyY}
 label={`${metrics.upperFloorH.toFixed(1)}m`}
 printMode={printMode}
 />
 <line x1={bodyX + bodyW} y1={baseY - firstH - slabH} x2={bodyX + bodyW + 72} y2={baseY - firstH - slabH} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />
 <line x1={bodyX + bodyW} y1={bodyY} x2={bodyX + bodyW + 72} y2={bodyY} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />
 </>
 ) : null}

 <DimLine
 x1={bodyX}
 y1={baseY + 42}
 x2={bodyX + bodyW}
 y2={baseY + 42}
 label={`${metrics.depthM.toFixed(1)}m`}
 printMode={printMode}
 />
 <line x1={bodyX} y1={baseY} x2={bodyX} y2={baseY + 42} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />
 <line x1={bodyX + bodyW} y1={baseY} x2={bodyX + bodyW} y2={baseY + 42} stroke={printMode ? "#94a3b8" : "rgba(255,255,255,0.35)"} />

 {!printMode ? (
 <g transform="translate(52 472)">
 <text x="0" y="0" fill="rgba(255,255,255,0.78)" fontSize="12" fontWeight={700}>
 图例 Legend
 </text>
 {[
 ["D01 门", "rgba(255,255,255,0.86)"],
 ["W02 / W03 / W05 窗", "rgba(103,232,249,0.95)"],
 ["楼梯", "rgba(255,255,255,0.75)"],
 ].map(([label, color], index) => (
 <g key={label} transform={`translate(${index * 170} 22)`}>
 <line x1="0" y1="0" x2="26" y2="0" stroke={color} strokeWidth="2" />
 <text x="36" y="4" fill="rgba(255,255,255,0.62)" fontSize="11">
 {label}
 </text>
 </g>
 ))}
 </g>
 ) : null}
 </svg>
 </div>
 </div>
 </div>
 );
}