"use client";

import React, { useMemo } from "react";
import type { HouseDesignPackage } from "@/app/lib/designTypes";

type Props = {
 result: HouseDesignPackage;
 drawingTitle?: string;
};

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

type OpeningMark = {
 code: string;
 x: number;
 y: number;
 width: number;
 height: number;
 kind: "door" | "window";
};

function collectFacadeOpenings(result: HouseDesignPackage): OpeningMark[] {
 const floorplans = result.floorplans ?? [];
 const openings: OpeningMark[] = [];

 floorplans.forEach((floor, floorIndex) => {
 (floor.doors ?? []).forEach((door, index) => {
 openings.push({
 code: door.code || `D${String(index + 1).padStart(2, "0")}`,
 x: num(door.position.x, 100),
 y: 0 + floorIndex * 320,
 width: Math.max(900, num(door.width, 900)),
 height: Math.max(2100, num(door.height, 2100)),
 kind: "door",
 });
 });

 (floor.windows ?? []).forEach((win, index) => {
 openings.push({
 code: win.code || `W${String(index + 1).padStart(2, "0")}`,
 x: num(win.position.x, 160),
 y: 900 + floorIndex * 320,
 width: Math.max(1200, num(win.width, 1500)),
 height: Math.max(1200, num(win.height, 1500)),
 kind: "window",
 });
 });
 });

 return openings.sort((a, b) => a.x - b.x);
}

export default function PrintableElevationSheet({
 result,
 drawingTitle = "建筑立面图 Elevation",
}: Props) {
 const floors = Math.max(1, num(result.site.floors, 1));
 const buildingWidth = 8200;
 const floorHeight = 3200;
 const roofHeight = 1400;
 const totalHeight = floors * floorHeight + roofHeight;

 const SHEET_W = 1000;
 const SHEET_H = 900;
 const PADDING_X = 90;
 const PADDING_Y = 80;

 const scale = useMemo(() => {
 const usableW = SHEET_W - PADDING_X * 2;
 const usableH = SHEET_H - PADDING_Y * 2;
 return Math.min(usableW / buildingWidth, usableH / totalHeight);
 }, [buildingWidth, totalHeight]);

 const baseX = PADDING_X;
 const baseY = SHEET_H - PADDING_Y;
 const bodyW = buildingWidth * scale;
 const bodyH = floors * floorHeight * scale;
 const roofH = roofHeight * scale;

 const openings = useMemo(() => collectFacadeOpenings(result), [result]);

 return (
 <div
 style={{
 background: "#fff",
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 padding: 18,
 }}
 >
 <div
 style={{
 width: SHEET_W,
 margin: "0 auto",
 background: "#ffffff",
 border: "1px solid #cbd5e1",
 borderRadius: 12,
 overflow: "hidden",
 }}
 >
 <div
 style={{
 padding: "12px 16px",
 borderBottom: "1px solid #dbe4ee",
 display: "flex",
 justifyContent: "space-between",
 alignItems: "flex-start",
 background: "#f8fafc",
 }}
 >
 <div>
 <div
 style={{
 fontSize: 18,
 fontWeight: 800,
 color: "#0f172a",
 lineHeight: 1.2,
 }}
 >
 {drawingTitle}
 </div>
 <div
 style={{
 marginTop: 4,
 fontSize: 11,
 color: "#64748b",
 }}
 >
 白底打印图纸 · 门窗编号联动
 </div>
 </div>

 <div
 style={{
 textAlign: "right",
 fontSize: 11,
 color: "#475569",
 lineHeight: 1.7,
 }}
 >
 <div>Scale 1:100</div>
 <div>
 Floors {floors} · Height {Math.round(totalHeight / 1000)}m
 </div>
 </div>
 </div>

 <svg
 viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
 style={{
 display: "block",
 width: "100%",
 height: "auto",
 background: "#ffffff",
 }}
 >
 <defs>
 <pattern id="elev-grid" width="24" height="24" patternUnits="userSpaceOnUse">
 <path
 d="M 24 0 L 0 0 0 24"
 fill="none"
 stroke="#eef2f7"
 strokeWidth="1"
 />
 </pattern>
 </defs>

 <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="#ffffff" />
 <rect
 x={baseX - 20}
 y={PADDING_Y - 20}
 width={bodyW + 40}
 height={bodyH + roofH + 40}
 fill="url(#elev-grid)"
 stroke="#e2e8f0"
 strokeWidth="1"
 />

 <line
 x1={baseX - 30}
 y1={baseY}
 x2={baseX + bodyW + 40}
 y2={baseY}
 stroke="#334155"
 strokeWidth="1.2"
 />

 <polygon
 points={`
 ${baseX},${baseY - bodyH}
 ${baseX + bodyW / 2},${baseY - bodyH - roofH}
 ${baseX + bodyW},${baseY - bodyH}
 `}
 fill="#f8fafc"
 stroke="#111827"
 strokeWidth="2"
 />

 <rect
 x={baseX}
 y={baseY - bodyH}
 width={bodyW}
 height={bodyH}
 fill="#ffffff"
 stroke="#111827"
 strokeWidth="2.2"
 />

 {Array.from({ length: floors - 1 }).map((_, i) => {
 const y = baseY - (i + 1) * floorHeight * scale;
 return (
 <line
 key={`floor-line-${i}`}
 x1={baseX}
 y1={y}
 x2={baseX + bodyW}
 y2={y}
 stroke="#475569"
 strokeWidth="1.2"
 />
 );
 })}

 {openings.map((item, index) => {
 const x = baseX + (item.x / buildingWidth) * bodyW - (item.width * scale) / 2;
 const y =
 baseY -
 ((item.y + item.height) * scale) -
 (item.kind === "window" ? 0 : 0);
 const w = item.width * scale;
 const h = item.height * scale;

 return (
 <g key={`${item.kind}-${item.code}-${index}`}>
 <rect
 x={x}
 y={y}
 width={w}
 height={h}
 fill={item.kind === "door" ? "#fff7ed" : "#eff6ff"}
 stroke={item.kind === "door" ? "#b45309" : "#2563eb"}
 strokeWidth="1.5"
 />
 <text
 x={x + w / 2}
 y={y - 6}
 textAnchor="middle"
 fontSize="8.5"
 fontWeight="700"
 fill={item.kind === "door" ? "#92400e" : "#1d4ed8"}
 >
 {item.code}
 </text>
 </g>
 );
 })}

 <g>
 <line
 x1={baseX + bodyW + 46}
 y1={baseY}
 x2={baseX + bodyW + 46}
 y2={baseY - bodyH}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={baseX + bodyW + 40}
 y1={baseY}
 x2={baseX + bodyW + 52}
 y2={baseY}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={baseX + bodyW + 40}
 y1={baseY - bodyH}
 x2={baseX + bodyW + 52}
 y2={baseY - bodyH}
 stroke="#64748b"
 strokeWidth="1"
 />
 <text
 x={baseX + bodyW + 50}
 y={baseY - bodyH / 2}
 textAnchor="middle"
 fontSize="10"
 fill="#334155"
 transform={`rotate(-90 ${baseX + bodyW + 50} ${baseY - bodyH / 2})`}
 >
 {floors * floorHeight}
 </text>
 </g>
 </svg>
 </div>
 </div>
 );
}