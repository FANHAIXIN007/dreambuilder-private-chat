"use client";

import React, { useMemo } from "react";
import type { FloorplanFloor } from "@/app/lib/designTypes";

type Language = "zh" | "en";

type Props = {
 floor: FloorplanFloor;
 language?: Language;
 drawingTitle?: string;
};

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

function getRoomFillByType(type?: string) {
 switch (type) {
 case "living":
 return "#f3f7fd";
 case "dining":
 return "#f8fbff";
 case "kitchen":
 return "#fff7ed";
 case "master_bedroom":
 case "bedroom":
 case "child_bedroom":
 case "guest_bedroom":
 return "#fcf4ff";
 case "bathroom":
 case "master_bathroom":
 case "public_bathroom":
 return "#eef6ff";
 case "study":
 case "office":
 return "#f8fafc";
 case "balcony":
 case "terrace":
 return "#f1fbf3";
 case "corridor":
 case "foyer":
 return "#fafafa";
 case "garage":
 return "#f3f4f6";
 case "laundry":
 case "storage":
 case "utility":
 return "#fefce8";
 default:
 return "#ffffff";
 }
}

function normalizeAxisLabel(label: string | undefined, index: number, isY = false) {
 if (label && String(label).trim()) return String(label);
 return isY ? String.fromCharCode(65 + index) : String(index + 1);
}

function normalizeFloor(floor: FloorplanFloor) {
 const rooms = (floor.rooms ?? []).map((room, index) => {
 const bounds = room.geometry?.bounds ?? {
 x: num((room as any).x, 0),
 y: num((room as any).y, 0),
 width: num((room as any).w, 120),
 height: num((room as any).h, 80),
 };

 const center = room.geometry?.center ?? {
 x: bounds.x + bounds.width / 2,
 y: bounds.y + bounds.height / 2,
 };

 const polygon =
 room.geometry?.polygon?.length
 ? room.geometry.polygon
 : [
 { x: bounds.x, y: bounds.y },
 { x: bounds.x + bounds.width, y: bounds.y },
 { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
 { x: bounds.x, y: bounds.y + bounds.height },
 ];

 return {
 ...room,
 id: room.id ?? `room_${index + 1}`,
 code: room.code ?? `R${String(index + 1).padStart(2, "0")}`,
 area: num(room.area, 0),
 geometry: {
 bounds,
 center,
 polygon,
 },
 };
 });

 const axisX = (floor.axisX ?? [])
 .map((axis, index) => ({
 ...axis,
 label: normalizeAxisLabel(axis.label, index, false),
 value: num(axis.value, 0),
 }))
 .sort((a, b) => a.value - b.value);

 const axisY = (floor.axisY ?? [])
 .map((axis, index) => ({
 ...axis,
 label: normalizeAxisLabel(axis.label, index, true),
 value: num(axis.value, 0),
 }))
 .sort((a, b) => a.value - b.value);

 return {
 ...floor,
 width: num(floor.width, 900),
 height: num(floor.height, 620),
 rooms,
 axisX,
 axisY,
 };
}

function findAxisBoundaryLabels(
 start: number,
 end: number,
 axis: Array<{ label: string; value: number }>
) {
 if (!axis.length) return { startLabel: "-", endLabel: "-" };

 let startIndex = 0;
 for (let i = 0; i < axis.length; i += 1) {
 if (axis[i].value <= start) startIndex = i;
 }

 let endIndex = axis.length - 1;
 for (let i = 0; i < axis.length - 1; i += 1) {
 if (end > axis[i].value && end <= axis[i + 1].value) {
 endIndex = i + 1;
 break;
 }
 }

 if (end <= axis[0].value) endIndex = 0;
 if (end > axis[axis.length - 1].value) endIndex = axis.length - 1;

 return {
 startLabel: axis[Math.max(0, Math.min(startIndex, axis.length - 1))]?.label || "-",
 endLabel: axis[Math.max(0, Math.min(endIndex, axis.length - 1))]?.label || "-",
 };
}

function getRoomGridLocation(
 room: FloorplanFloor["rooms"][number],
 axisX: Array<{ label: string; value: number }>,
 axisY: Array<{ label: string; value: number }>
) {
 const bounds = room.geometry.bounds;
 const xRange = findAxisBoundaryLabels(bounds.x, bounds.x + bounds.width, axisX);
 const yRange = findAxisBoundaryLabels(bounds.y, bounds.y + bounds.height, axisY);
 return `${xRange.startLabel}-${xRange.endLabel} / ${yRange.startLabel}-${yRange.endLabel}`;
}

export default function PrintableFloorplanSheet({
 floor,
 language = "zh",
 drawingTitle,
}: Props) {
 const normalized = useMemo(() => normalizeFloor(floor), [floor]);

 const PADDING = 72;
 const SHEET_W = 1000;
 const SHEET_H = 980;
 const TITLE_H = 52;

 const scale = useMemo(() => {
 const usableW = SHEET_W - PADDING * 2;
 const usableH = SHEET_H - PADDING * 2 - TITLE_H;
 return Math.min(usableW / normalized.width, usableH / normalized.height);
 }, [normalized]);

 const baseX = PADDING;
 const baseY = PADDING + TITLE_H;

 const outerX = baseX;
 const outerY = baseY;
 const outerW = normalized.width * scale;
 const outerH = normalized.height * scale;

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
 {drawingTitle ?? (language === "zh" ? normalized.titleZh : normalized.titleEn)}
 </div>
 <div
 style={{
 marginTop: 4,
 fontSize: 11,
 color: "#64748b",
 }}
 >
 {language === "zh"
 ? "白底打印图纸 · 房间编号 / 轴网 / 尺寸联动"
 : "Printable white sheet · room code / grid / dimensions linked"}
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
 Size {normalized.width} × {normalized.height}
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
 <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="#ffffff" />

 <defs>
 <pattern
 id="print-grid"
 width="24"
 height="24"
 patternUnits="userSpaceOnUse"
 >
 <path
 d="M 24 0 L 0 0 0 24"
 fill="none"
 stroke="#eef2f7"
 strokeWidth="1"
 />
 </pattern>
 </defs>

 <rect
 x={baseX - 20}
 y={baseY - 20}
 width={outerW + 40}
 height={outerH + 40}
 fill="url(#print-grid)"
 stroke="#e2e8f0"
 strokeWidth="1"
 />

 {normalized.axisX.map((axis) => {
 const x = baseX + axis.value * scale;
 return (
 <g key={axis.id}>
 <line
 x1={x}
 y1={baseY - 28}
 x2={x}
 y2={baseY + outerH + 28}
 stroke="#cbd5e1"
 strokeDasharray="6 6"
 strokeWidth="1"
 />
 <circle cx={x} cy={baseY - 12} r={10} fill="#ffffff" stroke="#334155" />
 <text
 x={x}
 y={baseY - 8}
 textAnchor="middle"
 fontSize="10"
 fontWeight="700"
 fill="#0f172a"
 >
 {axis.label}
 </text>
 <circle
 cx={x}
 cy={baseY + outerH + 12}
 r={10}
 fill="#ffffff"
 stroke="#334155"
 />
 <text
 x={x}
 y={baseY + outerH + 16}
 textAnchor="middle"
 fontSize="10"
 fontWeight="700"
 fill="#0f172a"
 >
 {axis.label}
 </text>
 </g>
 );
 })}

 {normalized.axisY.map((axis) => {
 const y = baseY + axis.value * scale;
 return (
 <g key={axis.id}>
 <line
 x1={baseX - 28}
 y1={y}
 x2={baseX + outerW + 28}
 y2={y}
 stroke="#cbd5e1"
 strokeDasharray="6 6"
 strokeWidth="1"
 />
 <circle cx={baseX - 12} cy={y} r={10} fill="#ffffff" stroke="#334155" />
 <text
 x={baseX - 12}
 y={y + 4}
 textAnchor="middle"
 fontSize="10"
 fontWeight="700"
 fill="#0f172a"
 >
 {axis.label}
 </text>
 <circle
 cx={baseX + outerW + 12}
 cy={y}
 r={10}
 fill="#ffffff"
 stroke="#334155"
 />
 <text
 x={baseX + outerW + 12}
 y={y + 4}
 textAnchor="middle"
 fontSize="10"
 fontWeight="700"
 fill="#0f172a"
 >
 {axis.label}
 </text>
 </g>
 );
 })}

 <rect
 x={outerX}
 y={outerY}
 width={outerW}
 height={outerH}
 fill="none"
 stroke="#111827"
 strokeWidth="3"
 />

 {normalized.rooms.map((room) => {
 const bounds = room.geometry.bounds;
 const cx = baseX + room.geometry.center.x * scale;
 const cy = baseY + room.geometry.center.y * scale;
 const rx = baseX + bounds.x * scale;
 const ry = baseY + bounds.y * scale;
 const rw = bounds.width * scale;
 const rh = bounds.height * scale;
 const gridText = getRoomGridLocation(room, normalized.axisX, normalized.axisY);

 return (
 <g key={room.id}>
 <rect
 x={rx}
 y={ry}
 width={rw}
 height={rh}
 fill={getRoomFillByType(room.type)}
 stroke="#475569"
 strokeWidth="1.2"
 />

 <circle cx={cx} cy={cy - 22} r={12} fill="#ffffff" stroke="#111827" strokeWidth="1.2" />
 <text
 x={cx}
 y={cy - 18}
 textAnchor="middle"
 fontSize="9"
 fontWeight="800"
 fill="#111827"
 >
 {room.code}
 </text>

 <text
 x={cx}
 y={cy}
 textAnchor="middle"
 fontSize="11"
 fontWeight="700"
 fill="#0f172a"
 >
 {language === "zh" ? room.nameZh : room.nameEn}
 </text>

 <text
 x={cx}
 y={cy + 16}
 textAnchor="middle"
 fontSize="10"
 fill="#475569"
 >
 {Math.round(room.area)} ㎡
 </text>

 <text
 x={cx}
 y={cy + 30}
 textAnchor="middle"
 fontSize="9"
 fontWeight="700"
 fill="#0f766e"
 >
 {gridText}
 </text>
 </g>
 );
 })}

 {(normalized.doors ?? []).map((door, index) => {
 const x = baseX + num(door.position.x, 0) * scale;
 const y = baseY + num(door.position.y, 0) * scale;
 const isVertical = Math.abs(num(door.rotation, 0)) % 180 === 90;

 return (
 <g key={door.id ?? `door_${index}`}>
 <line
 x1={isVertical ? x : x - 12}
 y1={isVertical ? y - 12 : y}
 x2={isVertical ? x : x + 12}
 y2={isVertical ? y + 12 : y}
 stroke="#b45309"
 strokeWidth="2"
 />
 <text
 x={x}
 y={y - 8}
 textAnchor="middle"
 fontSize="8"
 fontWeight="700"
 fill="#92400e"
 >
 {door.code}
 </text>
 </g>
 );
 })}

 {(normalized.windows ?? []).map((win, index) => {
 const x = baseX + num(win.position.x, 0) * scale;
 const y = baseY + num(win.position.y, 0) * scale;
 const isVertical = Math.abs(num(win.rotation, 0)) % 180 === 90;

 return (
 <g key={win.id ?? `win_${index}`}>
 <line
 x1={isVertical ? x : x - 16}
 y1={isVertical ? y - 16 : y}
 x2={isVertical ? x : x + 16}
 y2={isVertical ? y + 16 : y}
 stroke="#2563eb"
 strokeWidth="2.5"
 />
 <text
 x={x}
 y={y - 8}
 textAnchor="middle"
 fontSize="8"
 fontWeight="700"
 fill="#1d4ed8"
 >
 {win.code}
 </text>
 </g>
 );
 })}

 <g>
 <line
 x1={outerX}
 y1={outerY + outerH + 42}
 x2={outerX + outerW}
 y2={outerY + outerH + 42}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={outerX}
 y1={outerY + outerH + 36}
 x2={outerX}
 y2={outerY + outerH + 48}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={outerX + outerW}
 y1={outerY + outerH + 36}
 x2={outerX + outerW}
 y2={outerY + outerH + 48}
 stroke="#64748b"
 strokeWidth="1"
 />
 <text
 x={outerX + outerW / 2}
 y={outerY + outerH + 38}
 textAnchor="middle"
 fontSize="10"
 fill="#334155"
 >
 {normalized.width}
 </text>

 <line
 x1={outerX - 42}
 y1={outerY}
 x2={outerX - 42}
 y2={outerY + outerH}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={outerX - 48}
 y1={outerY}
 x2={outerX - 36}
 y2={outerY}
 stroke="#64748b"
 strokeWidth="1"
 />
 <line
 x1={outerX - 48}
 y1={outerY + outerH}
 x2={outerX - 36}
 y2={outerY + outerH}
 stroke="#64748b"
 strokeWidth="1"
 />
 <text
 x={outerX - 46}
 y={outerY + outerH / 2}
 textAnchor="middle"
 fontSize="10"
 fill="#334155"
 transform={`rotate(-90 ${outerX - 46} ${outerY + outerH / 2})`}
 >
 {normalized.height}
 </text>
 </g>
 </svg>
 </div>
 </div>
 );
}