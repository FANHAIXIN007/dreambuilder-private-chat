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

export default function PrintableSectionSheet({
 result,
 drawingTitle = "建筑剖面图 Section",
}: Props) {
 const floors = Math.max(1, num(result.site.floors, 1));
 const buildingWidth = 8400;
 const floorHeight = 3200;
 const roofHeight = 1300;
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
 白底打印图纸 · 楼层、楼板、屋面与空间关系示意
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
 Floors {floors} · Section A-A
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
 <pattern id="section-grid" width="24" height="24" patternUnits="userSpaceOnUse">
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
 fill="url(#section-grid)"
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

 {Array.from({ length: floors }).map((_, i) => {
 const slabY = baseY - i * floorHeight * scale;
 if (i === 0) return null;
 return (
 <line
 key={`slab-${i}`}
 x1={baseX}
 y1={slabY}
 x2={baseX + bodyW}
 y2={slabY}
 stroke="#111827"
 strokeWidth="2"
 />
 );
 })}

 {Array.from({ length: floors }).map((_, i) => {
 const yTop = baseY - (i + 1) * floorHeight * scale;
 const yBottom = baseY - i * floorHeight * scale;
 return (
 <g key={`space-${i}`}>
 <rect
 x={baseX + 40}
 y={yTop + 20}
 width={bodyW - 80}
 height={yBottom - yTop - 40}
 fill={i % 2 === 0 ? "#f8fafc" : "#ffffff"}
 stroke="#cbd5e1"
 strokeWidth="1"
 />
 <line
 x1={baseX + bodyW * 0.48}
 y1={yTop + 20}
 x2={baseX + bodyW * 0.48}
 y2={yBottom - 20}
 stroke="#cbd5e1"
 strokeWidth="1"
 />
 <text
 x={baseX + bodyW * 0.25}
 y={(yTop + yBottom) / 2}
 textAnchor="middle"
 fontSize="11"
 fontWeight="700"
 fill="#334155"
 >
 {i === 0 ? "公共起居空间" : `楼层空间 ${i + 1}`}
 </text>
 <text
 x={baseX + bodyW * 0.72}
 y={(yTop + yBottom) / 2}
 textAnchor="middle"
 fontSize="11"
 fontWeight="700"
 fill="#334155"
 >
 {i === 0 ? "交通 / 服务空间" : `功能空间 ${i + 1}`}
 </text>
 </g>
 );
 })}

 <polyline
 points={`
 ${baseX + bodyW * 0.46},${baseY}
 ${baseX + bodyW * 0.46},${baseY - floorHeight * scale + 6}
 ${baseX + bodyW * 0.52},${baseY - floorHeight * scale + 6}
 ${baseX + bodyW * 0.52},${baseY - floorHeight * 2 * scale + 12}
 `}
 fill="none"
 stroke="#b45309"
 strokeWidth="2"
 />
 <text
 x={baseX + bodyW * 0.5}
 y={baseY - floorHeight * scale + 28}
 textAnchor="middle"
 fontSize="9"
 fontWeight="700"
 fill="#92400e"
 >
 Stair
 </text>

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