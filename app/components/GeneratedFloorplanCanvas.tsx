"use client";

import React, { useMemo, useState } from "react";
import { polygonToSvgPoints } from "../lib/floorplanGeometry";

type Language = "zh" | "en";

type AnyPoint = {
 x?: number;
 y?: number;
};

type AnyRoom = {
 id?: string;
 code?: string;
 name?: string;
 nameZh?: string;
 nameEn?: string;
 type?: string;
 floor?: number;
 area?: number;
 x?: number;
 y?: number;
 w?: number;
 h?: number;
 geometry?: {
 polygon?: AnyPoint[];
 center?: AnyPoint;
 bounds?: {
 x?: number;
 y?: number;
 width?: number;
 height?: number;
 };
 };
 [key: string]: any;
};

type AxisItem = {
 id?: string;
 label?: string;
 value?: number;
 [key: string]: any;
};

type AnyFloor = {
 floor?: number;
 floorIndex?: number;
 title?: string;
 titleZh?: string;
 titleEn?: string;
 floorNameZh?: string;
 floorNameEn?: string;
 width?: number;
 height?: number;
 outerPolygon?: AnyPoint[];
 rooms?: AnyRoom[];
 walls?: Array<{
 id?: string;
 type?: string;
 thickness?: number;
 start?: AnyPoint;
 end?: AnyPoint;
 [key: string]: any;
 }>;
 doors?: Array<{
 id?: string;
 code?: string;
 position?: AnyPoint;
 rotation?: number;
 [key: string]: any;
 }>;
 windows?: Array<{
 id?: string;
 code?: string;
 position?: AnyPoint;
 rotation?: number;
 [key: string]: any;
 }>;
 axisX?: AxisItem[];
 axisY?: AxisItem[];
 [key: string]: any;
};

type GeneratedFloorplanCanvasProps = {
 floor: AnyFloor | null | undefined;
 language?: Language;
 title?: string;
 height?: number;
 selectedRoomId?: string | null;
 onRoomSelect?: (room: AnyRoom) => void;
 showAxis?: boolean;
 showDimensions?: boolean;
 showRoomCodeBubble?: boolean;
 showRoomName?: boolean;
};

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

function formatAxisLabel(index: number, vertical = false) {
 if (vertical) {
 return String.fromCharCode(65 + index);
 }
 return String(index + 1);
}

function getRoomFillByType(type?: string) {
 switch (type) {
 case "living":
 return "#f2f7ff";
 case "dining":
 return "#f7fbff";
 case "kitchen":
 return "#fff7ed";
 case "master_bedroom":
 case "bedroom":
 case "child_bedroom":
 case "guest_bedroom":
 return "#fdf4ff";
 case "bathroom":
 case "master_bathroom":
 case "public_bathroom":
 return "#eff6ff";
 case "study":
 case "office":
 return "#f8fafc";
 case "balcony":
 case "terrace":
 return "#f0fdf4";
 case "corridor":
 case "foyer":
 return "#fafafa";
 case "garage":
 return "#f5f5f4";
 case "laundry":
 case "storage":
 case "utility":
 return "#fefce8";
 default:
 return "#ffffff";
 }
}

function getLabel(room: AnyRoom, language: Language) {
 if (language === "zh") {
 return room?.nameZh ?? room?.name ?? "房间";
 }
 return room?.nameEn ?? room?.name ?? "Room";
}

function buildRoomPolygonFromRect(room: AnyRoom, index: number) {
 const x = num(room?.x, 80 + (index % 3) * 220);
 const y = num(room?.y, 80 + Math.floor(index / 3) * 140);
 const w = Math.max(90, num(room?.w, 160));
 const h = Math.max(70, num(room?.h, 110));

 return [
 { x, y },
 { x: x + w, y },
 { x: x + w, y: y + h },
 { x, y: y + h },
 ];
}

function getPolygonBounds(points: Array<{ x: number; y: number }>) {
 if (!points.length) {
 return { x: 0, y: 0, width: 120, height: 80 };
 }

 const xs = points.map((p) => p.x);
 const ys = points.map((p) => p.y);

 const minX = Math.min(...xs);
 const maxX = Math.max(...xs);
 const minY = Math.min(...ys);
 const maxY = Math.max(...ys);

 return {
 x: minX,
 y: minY,
 width: maxX - minX,
 height: maxY - minY,
 };
}

function getPolygonCenter(points: Array<{ x: number; y: number }>) {
 if (!points.length) {
 return { x: 0, y: 0 };
 }

 const bounds = getPolygonBounds(points);
 return {
 x: bounds.x + bounds.width / 2,
 y: bounds.y + bounds.height / 2,
 };
}

function normalizeAxis(axis: AxisItem[] | undefined, vertical: boolean) {
 const list = Array.isArray(axis) ? axis : [];
 return list
 .map((item, index) => ({
 id: item?.id ?? `axis_${vertical ? "y" : "x"}_${index + 1}`,
 label:
 item?.label && String(item.label).trim()
 ? String(item.label)
 : formatAxisLabel(index, vertical),
 value: num(item?.value, 0),
 }))
 .sort((a, b) => a.value - b.value);
}

function findAxisBoundaryLabels(
 start: number,
 end: number,
 axis: Array<{ label: string; value: number }>
) {
 if (!axis.length) {
 return { startLabel: "-", endLabel: "-" };
 }

 let startIndex = 0;
 for (let i = 0; i < axis.length; i += 1) {
 if (axis[i].value <= start) {
 startIndex = i;
 }
 }

 let endIndex = axis.length - 1;
 for (let i = 0; i < axis.length - 1; i += 1) {
 if (end > axis[i].value && end <= axis[i + 1].value) {
 endIndex = i + 1;
 break;
 }
 }

 if (end <= axis[0].value) {
 endIndex = 0;
 }

 if (end > axis[axis.length - 1].value) {
 endIndex = axis.length - 1;
 }

 startIndex = Math.max(0, Math.min(startIndex, axis.length - 1));
 endIndex = Math.max(0, Math.min(endIndex, axis.length - 1));

 return {
 startLabel: axis[startIndex]?.label || "-",
 endLabel: axis[endIndex]?.label || "-",
 };
}

function normalizeFloor(input: AnyFloor | null | undefined) {
 const floorNumber = num(input?.floor ?? input?.floorIndex, 1);
 const rawRooms = Array.isArray(input?.rooms) ? input.rooms : [];

 const rooms = rawRooms.map((room, index) => {
 const polygon =
 Array.isArray(room?.geometry?.polygon) && room.geometry?.polygon.length > 0
 ? room.geometry.polygon.map((p) => ({
 x: num(p?.x, 0),
 y: num(p?.y, 0),
 }))
 : buildRoomPolygonFromRect(room, index);

 const polygonBounds = getPolygonBounds(polygon);
 const polygonCenter = getPolygonCenter(polygon);

 const bounds = room?.geometry?.bounds
 ? {
 x: num(room.geometry.bounds.x, polygonBounds.x),
 y: num(room.geometry.bounds.y, polygonBounds.y),
 width: num(room.geometry.bounds.width, polygonBounds.width),
 height: num(room.geometry.bounds.height, polygonBounds.height),
 }
 : polygonBounds;

 const center = room?.geometry?.center
 ? {
 x: num(room.geometry.center.x, polygonCenter.x),
 y: num(room.geometry.center.y, polygonCenter.y),
 }
 : polygonCenter;

 return {
 ...room,
 id: room?.id ?? `room_${floorNumber}_${index + 1}`,
 code: room?.code ?? `R${String(index + 1).padStart(2, "0")}`,
 floor: num(room?.floor, floorNumber),
 area: num(room?.area, 0),
 type: room?.type ?? "other",
 geometry: {
 polygon,
 center,
 bounds,
 },
 };
 });

 const maxRoomX = rooms.length
 ? Math.max(...rooms.map((room) => room.geometry.bounds.x + room.geometry.bounds.width))
 : 820;
 const maxRoomY = rooms.length
 ? Math.max(...rooms.map((room) => room.geometry.bounds.y + room.geometry.bounds.height))
 : 520;

 const width = Math.max(900, num(input?.width, maxRoomX + 80));
 const height = Math.max(620, num(input?.height, maxRoomY + 80));

 const outerPolygon =
 Array.isArray(input?.outerPolygon) && input.outerPolygon.length > 0
 ? input.outerPolygon.map((p) => ({
 x: num(p?.x, 0),
 y: num(p?.y, 0),
 }))
 : [
 { x: 40, y: 40 },
 { x: width - 40, y: 40 },
 { x: width - 40, y: height - 40 },
 { x: 40, y: height - 40 },
 ];

 const walls = Array.isArray(input?.walls) ? input.walls : [];
 const doors = Array.isArray(input?.doors) ? input.doors : [];
 const windows = Array.isArray(input?.windows) ? input.windows : [];
 const axisX = normalizeAxis(input?.axisX, false);
 const axisY = normalizeAxis(input?.axisY, true);

 const roomsWithGrid = rooms.map((room) => {
 const bounds = room.geometry.bounds;
 const xStart = num(bounds.x);
 const xEnd = num(bounds.x) + num(bounds.width);
 const yStart = num(bounds.y);
 const yEnd = num(bounds.y) + num(bounds.height);

 const xRange = findAxisBoundaryLabels(xStart, xEnd, axisX);
 const yRange = findAxisBoundaryLabels(yStart, yEnd, axisY);

 return {
 ...room,
 gridLocation: `${xRange.startLabel}-${xRange.endLabel} / ${yRange.startLabel}-${yRange.endLabel}`,
 };
 });

 return {
 floor: floorNumber,
 width,
 height,
 titleZh: input?.titleZh ?? input?.floorNameZh ?? `${floorNumber} 层平面图`,
 titleEn: input?.titleEn ?? input?.floorNameEn ?? `Floor ${floorNumber} Plan`,
 outerPolygon,
 rooms: roomsWithGrid,
 walls,
 doors,
 windows,
 axisX,
 axisY,
 };
}

export default function GeneratedFloorplanCanvas({
 floor,
 language = "zh",
 title,
 height = 760,
 selectedRoomId = null,
 onRoomSelect,
 showAxis = true,
 showDimensions = true,
 showRoomCodeBubble = true,
 showRoomName = true,
}: GeneratedFloorplanCanvasProps) {
 const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);

 const normalizedFloor = useMemo(() => normalizeFloor(floor), [floor]);
 const padding = 56;

 const viewBox = useMemo(() => {
 return `0 0 ${normalizedFloor.width + padding * 2} ${
 normalizedFloor.height + padding * 2
 }`;
 }, [normalizedFloor.height, normalizedFloor.width]);

 const shiftedOuterPolygon = useMemo(
 () =>
 normalizedFloor.outerPolygon.map((p) => ({
 x: p.x + padding,
 y: p.y + padding,
 })),
 [normalizedFloor.outerPolygon]
 );

 const shiftedRooms = useMemo(
 () =>
 normalizedFloor.rooms.map((room: any) => ({
 ...room,
 geometry: {
 ...room.geometry,
 polygon: room.geometry.polygon.map((p: any) => ({
 x: num(p.x) + padding,
 y: num(p.y) + padding,
 })),
 center: {
 x: num(room.geometry.center.x) + padding,
 y: num(room.geometry.center.y) + padding,
 },
 bounds: {
 ...room.geometry.bounds,
 x: num(room.geometry.bounds.x) + padding,
 y: num(room.geometry.bounds.y) + padding,
 },
 },
 })),
 [normalizedFloor.rooms]
 );

 const shiftedWalls = useMemo(
 () =>
 normalizedFloor.walls.map((wall: any, index: number) => ({
 ...wall,
 id: wall?.id ?? `wall_${index + 1}`,
 type: wall?.type ?? "interior",
 thickness: num(wall?.thickness, 120),
 start: {
 x: num(wall?.start?.x) + padding,
 y: num(wall?.start?.y) + padding,
 },
 end: {
 x: num(wall?.end?.x) + padding,
 y: num(wall?.end?.y) + padding,
 },
 })),
 [normalizedFloor.walls]
 );

 const shiftedDoors = useMemo(
 () =>
 normalizedFloor.doors.map((door: any, index: number) => ({
 ...door,
 id: door?.id ?? `door_${index + 1}`,
 code: door?.code ?? `D${String(index + 1).padStart(2, "0")}`,
 rotation: num(door?.rotation, 0),
 position: {
 x: num(door?.position?.x, 140 + index * 60) + padding,
 y: num(door?.position?.y, normalizedFloor.height - 80) + padding,
 },
 })),
 [normalizedFloor.doors, normalizedFloor.height]
 );

 const shiftedWindows = useMemo(
 () =>
 normalizedFloor.windows.map((windowItem: any, index: number) => ({
 ...windowItem,
 id: windowItem?.id ?? `window_${index + 1}`,
 code: windowItem?.code ?? `W${String(index + 1).padStart(2, "0")}`,
 rotation: num(windowItem?.rotation, 0),
 position: {
 x: num(windowItem?.position?.x, 180 + index * 80) + padding,
 y: num(windowItem?.position?.y, 80) + padding,
 },
 })),
 [normalizedFloor.windows]
 );

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
 <div>
 <div className="text-sm font-semibold text-white">
 {title ??
 (language === "zh"
 ? normalizedFloor.titleZh
 : normalizedFloor.titleEn)}
 </div>
 <div className="mt-1 text-xs text-white/50">
 {language === "zh"
 ? "房间编号、真实坐标与轴网定位联动版"
 : "Room code, real coordinates and grid location linked plan"}
 </div>
 </div>

 <div className="text-right text-xs text-white/50">
 <div>{language === "zh" ? "图纸比例" : "Scale"}：1:100</div>
 <div>
 {language === "zh" ? "图纸尺寸" : "Drawing Size"}：
 {normalizedFloor.width} × {normalizedFloor.height}
 </div>
 </div>
 </div>

 <div className="overflow-x-auto p-4">
 <svg
 viewBox={viewBox}
 className="w-full min-w-[920px]"
 style={{ height: `${height}px` }}
 role="img"
 aria-label={
 language === "zh"
 ? `第 ${normalizedFloor.floor} 层房间编号联动平面图`
 : `Floor ${normalizedFloor.floor} room linked plan`
 }
 >
 <defs>
 <filter id="roomShadow" x="-20%" y="-20%" width="140%" height="140%">
 <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.08" />
 </filter>
 </defs>

 <rect
 x={0}
 y={0}
 width={normalizedFloor.width + padding * 2}
 height={normalizedFloor.height + padding * 2}
 fill="#ffffff"
 />

 {showAxis &&
 shiftedOuterPolygon.length > 0 &&
 normalizedFloor.axisX.map((axis: any) => {
 const x = num(axis?.value, 0) + padding;
 const label = axis?.label;

 return (
 <g key={axis?.id}>
 <line
 x1={x}
 y1={16}
 x2={x}
 y2={normalizedFloor.height + padding * 2 - 16}
 stroke="#e5e7eb"
 strokeDasharray="6 6"
 strokeWidth={1}
 />
 <circle cx={x} cy={28} r={12} fill="#fff" stroke="#111827" />
 <text
 x={x}
 y={32}
 textAnchor="middle"
 fontSize={11}
 fill="#111827"
 fontWeight={700}
 >
 {label}
 </text>
 <circle
 cx={x}
 cy={normalizedFloor.height + padding * 2 - 28}
 r={12}
 fill="#fff"
 stroke="#111827"
 />
 <text
 x={x}
 y={normalizedFloor.height + padding * 2 - 24}
 textAnchor="middle"
 fontSize={11}
 fill="#111827"
 fontWeight={700}
 >
 {label}
 </text>
 </g>
 );
 })}

 {showAxis &&
 shiftedOuterPolygon.length > 0 &&
 normalizedFloor.axisY.map((axis: any) => {
 const y = num(axis?.value, 0) + padding;
 const label = axis?.label;

 return (
 <g key={axis?.id}>
 <line
 x1={16}
 y1={y}
 x2={normalizedFloor.width + padding * 2 - 16}
 y2={y}
 stroke="#e5e7eb"
 strokeDasharray="6 6"
 strokeWidth={1}
 />
 <circle cx={28} cy={y} r={12} fill="#fff" stroke="#111827" />
 <text
 x={28}
 y={y + 4}
 textAnchor="middle"
 fontSize={11}
 fill="#111827"
 fontWeight={700}
 >
 {label}
 </text>
 <circle
 cx={normalizedFloor.width + padding * 2 - 28}
 cy={y}
 r={12}
 fill="#fff"
 stroke="#111827"
 />
 <text
 x={normalizedFloor.width + padding * 2 - 28}
 y={y + 4}
 textAnchor="middle"
 fontSize={11}
 fill="#111827"
 fontWeight={700}
 >
 {label}
 </text>
 </g>
 );
 })}

 <polygon
 points={polygonToSvgPoints(shiftedOuterPolygon as any)}
 fill="none"
 stroke="#111827"
 strokeWidth={4}
 />

 {shiftedRooms.map((room: any) => {
 const isActive = selectedRoomId === room.id || hoverRoomId === room.id;
 const label = getLabel(room, language);

 return (
 <g
 key={room.id}
 onMouseEnter={() => setHoverRoomId(room.id)}
 onMouseLeave={() => setHoverRoomId(null)}
 onClick={() => onRoomSelect?.(room)}
 className="cursor-pointer"
 >
 <polygon
 points={polygonToSvgPoints(room.geometry.polygon as any)}
 fill={getRoomFillByType(room.type)}
 stroke={isActive ? "#111827" : "#374151"}
 strokeWidth={isActive ? 2.6 : 1.5}
 filter="url(#roomShadow)"
 />

 {showRoomName && (
 <>
 <text
 x={num(room.geometry.center.x)}
 y={num(room.geometry.center.y) - 10}
 textAnchor="middle"
 fontSize={13}
 fill="#111827"
 fontWeight={700}
 >
 {label}
 </text>
 <text
 x={num(room.geometry.center.x)}
 y={num(room.geometry.center.y) + 8}
 textAnchor="middle"
 fontSize={11}
 fill="#4b5563"
 >
 {num(room.area)} ㎡
 </text>
 <text
 x={num(room.geometry.center.x)}
 y={num(room.geometry.center.y) + 24}
 textAnchor="middle"
 fontSize={10}
 fill={isActive ? "#0f766e" : "#6b7280"}
 fontWeight={700}
 >
 {room.gridLocation}
 </text>
 </>
 )}

 {showRoomCodeBubble && (
 <g>
 <circle
 cx={num(room.geometry.center.x)}
 cy={num(room.geometry.center.y) - 30}
 r={14}
 fill={isActive ? "#111827" : "#ffffff"}
 stroke="#111827"
 strokeWidth={1.5}
 />
 <text
 x={num(room.geometry.center.x)}
 y={num(room.geometry.center.y) - 26}
 textAnchor="middle"
 fontSize={10}
 fill={isActive ? "#ffffff" : "#111827"}
 fontWeight={800}
 >
 {room.code}
 </text>
 </g>
 )}
 </g>
 );
 })}

 {shiftedWalls.map((wall: any) => (
 <line
 key={wall.id}
 x1={num(wall.start.x)}
 y1={num(wall.start.y)}
 x2={num(wall.end.x)}
 y2={num(wall.end.y)}
 stroke={wall.type === "exterior" ? "#111827" : "#4b5563"}
 strokeWidth={Math.max(1.2, num(wall.thickness, 120) / 80)}
 strokeLinecap="square"
 />
 ))}

 {shiftedDoors.map((door: any) => (
 <g
 key={door.id}
 transform={`translate(${num(door.position.x)}, ${num(
 door.position.y
 )}) rotate(${num(door.rotation, 0)})`}
 >
 <line x1={-12} y1={0} x2={12} y2={0} stroke="#b45309" strokeWidth={2} />
 <text
 x={0}
 y={-8}
 textAnchor="middle"
 fontSize={9}
 fill="#92400e"
 fontWeight={700}
 >
 {door.code}
 </text>
 </g>
 ))}

 {shiftedWindows.map((windowItem: any) => (
 <g
 key={windowItem.id}
 transform={`translate(${num(windowItem.position.x)}, ${num(
 windowItem.position.y
 )}) rotate(${num(windowItem.rotation, 0)})`}
 >
 <line x1={-16} y1={0} x2={16} y2={0} stroke="#2563eb" strokeWidth={3} />
 <text
 x={0}
 y={-8}
 textAnchor="middle"
 fontSize={9}
 fill="#1d4ed8"
 fontWeight={700}
 >
 {windowItem.code}
 </text>
 </g>
 ))}

 {showDimensions && (
 <g>
 <line
 x1={padding}
 y1={normalizedFloor.height + padding + 24}
 x2={normalizedFloor.width + padding}
 y2={normalizedFloor.height + padding + 24}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <line
 x1={padding}
 y1={normalizedFloor.height + padding + 18}
 x2={padding}
 y2={normalizedFloor.height + padding + 30}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <line
 x1={normalizedFloor.width + padding}
 y1={normalizedFloor.height + padding + 18}
 x2={normalizedFloor.width + padding}
 y2={normalizedFloor.height + padding + 30}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <text
 x={padding + normalizedFloor.width / 2}
 y={normalizedFloor.height + padding + 20}
 textAnchor="middle"
 fontSize={11}
 fill="#374151"
 >
 {normalizedFloor.width}
 </text>

 <line
 x1={padding - 24}
 y1={padding}
 x2={padding - 24}
 y2={normalizedFloor.height + padding}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <line
 x1={padding - 30}
 y1={padding}
 x2={padding - 18}
 y2={padding}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <line
 x1={padding - 30}
 y1={normalizedFloor.height + padding}
 x2={padding - 18}
 y2={normalizedFloor.height + padding}
 stroke="#6b7280"
 strokeWidth={1}
 />
 <text
 x={padding - 28}
 y={padding + normalizedFloor.height / 2}
 textAnchor="middle"
 fontSize={11}
 fill="#374151"
 transform={`rotate(-90 ${padding - 28} ${
 padding + normalizedFloor.height / 2
 })`}
 >
 {normalizedFloor.height}
 </text>
 </g>
 )}
 </svg>
 </div>
 </div>
 );
}