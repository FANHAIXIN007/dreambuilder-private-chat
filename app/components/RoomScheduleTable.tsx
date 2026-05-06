"use client";

import React, { useMemo } from "react";

type Language = "zh" | "en";

type AnyPoint = {
 x?: number;
 y?: number;
};

type AxisItem = {
 id?: string;
 label?: string;
 value?: number;
 [key: string]: any;
};

type AnyRoom = {
 id?: string;
 code?: string;
 floor?: number;
 name?: string;
 nameZh?: string;
 nameEn?: string;
 area?: number;
 x?: number;
 y?: number;
 w?: number;
 h?: number;
 geometry?: {
 center?: AnyPoint;
 polygon?: AnyPoint[];
 bounds?: {
 x?: number;
 y?: number;
 width?: number;
 height?: number;
 };
 };
 [key: string]: any;
};

type RoomScheduleTableProps = {
 rooms: AnyRoom[] | null | undefined;
 axisX?: AxisItem[] | null | undefined;
 axisY?: AxisItem[] | null | undefined;
 language?: Language;
 selectedRoomId?: string | null;
 onSelectRoom?: (roomId: string) => void;
};

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

function buildPolygonFromRect(room: AnyRoom, index: number) {
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

function getPolygonCenter(points: Array<{ x: number; y: number }>) {
 if (!points.length) {
 return { x: 0, y: 0 };
 }

 const minX = Math.min(...points.map((p) => p.x));
 const maxX = Math.max(...points.map((p) => p.x));
 const minY = Math.min(...points.map((p) => p.y));
 const maxY = Math.max(...points.map((p) => p.y));

 return {
 x: (minX + maxX) / 2,
 y: (minY + maxY) / 2,
 };
}

function getPolygonBounds(points: Array<{ x: number; y: number }>) {
 if (!points.length) {
 return {
 x: 0,
 y: 0,
 width: 120,
 height: 80,
 };
 }

 const minX = Math.min(...points.map((p) => p.x));
 const maxX = Math.max(...points.map((p) => p.x));
 const minY = Math.min(...points.map((p) => p.y));
 const maxY = Math.max(...points.map((p) => p.y));

 return {
 x: minX,
 y: minY,
 width: maxX - minX,
 height: maxY - minY,
 };
}

function normalizeAxis(axis: AxisItem[] | null | undefined) {
 const list = Array.isArray(axis) ? axis : [];
 return list
 .map((item, index) => ({
 id: item?.id ?? `axis_${index + 1}`,
 label: String(item?.label ?? ""),
 value: num(item?.value, 0),
 }))
 .sort((a, b) => a.value - b.value);
}

function normalizeRoom(room: AnyRoom, index: number) {
 const polygon =
 Array.isArray(room?.geometry?.polygon) && room.geometry!.polygon!.length > 0
 ? room.geometry!.polygon!.map((p) => ({
 x: num(p?.x, 0),
 y: num(p?.y, 0),
 }))
 : buildPolygonFromRect(room, index);

 const polygonCenter = getPolygonCenter(polygon);
 const polygonBounds = getPolygonBounds(polygon);

 const center = room?.geometry?.center
 ? {
 x: num(room.geometry.center.x, polygonCenter.x),
 y: num(room.geometry.center.y, polygonCenter.y),
 }
 : polygonCenter;

 const bounds = room?.geometry?.bounds
 ? {
 x: num(room.geometry.bounds.x, polygonBounds.x),
 y: num(room.geometry.bounds.y, polygonBounds.y),
 width: num(room.geometry.bounds.width, polygonBounds.width),
 height: num(room.geometry.bounds.height, polygonBounds.height),
 }
 : polygonBounds;

 return {
 ...room,
 id: room?.id ?? `room_${index + 1}`,
 code: room?.code ?? `R${String(index + 1).padStart(2, "0")}`,
 floor: num(room?.floor, 1),
 area: num(room?.area, 0),
 nameZh: room?.nameZh ?? room?.name ?? `房间 ${index + 1}`,
 nameEn: room?.nameEn ?? room?.name ?? `Room ${index + 1}`,
 geometry: {
 ...(room?.geometry ?? {}),
 center,
 polygon,
 bounds,
 },
 };
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

function getRoomGridLocation(
 room: ReturnType<typeof normalizeRoom>,
 axisX: Array<{ label: string; value: number }>,
 axisY: Array<{ label: string; value: number }>
) {
 const bounds = room.geometry?.bounds;

 if (!bounds) {
 return "-";
 }

 const xStart = num(bounds.x);
 const xEnd = num(bounds.x) + num(bounds.width);
 const yStart = num(bounds.y);
 const yEnd = num(bounds.y) + num(bounds.height);

 const xRange = findAxisBoundaryLabels(xStart, xEnd, axisX);
 const yRange = findAxisBoundaryLabels(yStart, yEnd, axisY);

 return `${xRange.startLabel}-${xRange.endLabel} / ${yRange.startLabel}-${yRange.endLabel}`;
}

export default function RoomScheduleTable({
 rooms,
 axisX,
 axisY,
 language = "zh",
 selectedRoomId = null,
 onSelectRoom,
}: RoomScheduleTableProps) {
 const safeRooms = useMemo(() => {
 const list = Array.isArray(rooms) ? rooms : [];
 return list.map((room, index) => normalizeRoom(room, index));
 }, [rooms]);

 const safeAxisX = useMemo(() => normalizeAxis(axisX), [axisX]);
 const safeAxisY = useMemo(() => normalizeAxis(axisY), [axisY]);

 const title = language === "zh" ? "房间编号表" : "Room Schedule";
 const roomNameLabel = language === "zh" ? "房间名称" : "Room Name";
 const codeLabel = language === "zh" ? "编号" : "Code";
 const floorLabel = language === "zh" ? "楼层" : "Floor";
 const areaLabel = language === "zh" ? "面积(㎡)" : "Area (㎡)";
 const gridLabel = language === "zh" ? "轴网定位" : "Grid Location";
 const centerLabel = language === "zh" ? "中心坐标" : "Center";
 const polygonLabel = language === "zh" ? "轮廓坐标" : "Polygon";

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="border-b border-white/10 px-5 py-4">
 <div className="text-sm font-semibold text-white">{title}</div>
 <div className="mt-1 text-xs text-white/50">
 {language === "zh"
 ? "表格与平面图编号气泡共用同一份真实坐标数据，并新增轴网定位列"
 : "Table shares the same coordinate data as the drawing, with grid location added"}
 </div>
 </div>

 {safeRooms.length === 0 ? (
 <div className="px-5 py-8 text-sm text-white/55">
 {language === "zh" ? "暂无房间编号数据。" : "No room schedule data."}
 </div>
 ) : (
 <div className="overflow-auto">
 <table className="min-w-full border-collapse text-sm">
 <thead className="bg-white/5">
 <tr>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {codeLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {roomNameLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {floorLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {areaLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {gridLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {centerLabel}
 </th>
 <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/75">
 {polygonLabel}
 </th>
 </tr>
 </thead>

 <tbody>
 {safeRooms.map((room) => {
 const isActive = selectedRoomId === room.id;
 const gridLocation = getRoomGridLocation(room, safeAxisX, safeAxisY);

 return (
 <tr
 key={room.id}
 onClick={() => onSelectRoom?.(String(room.id))}
 className={`cursor-pointer transition ${
 isActive ? "bg-cyan-400/10" : "hover:bg-white/5"
 }`}
 >
 <td className="border-b border-white/10 px-3 py-3 font-semibold text-white">
 {room.code}
 </td>
 <td className="border-b border-white/10 px-3 py-3 text-white/80">
 {language === "zh" ? room.nameZh : room.nameEn}
 </td>
 <td className="border-b border-white/10 px-3 py-3 text-white/70">
 {room.floor}
 </td>
 <td className="border-b border-white/10 px-3 py-3 text-white/70">
 {room.area}
 </td>
 <td className="border-b border-white/10 px-3 py-3 font-medium text-cyan-200">
 {gridLocation}
 </td>
 <td className="border-b border-white/10 px-3 py-3 text-white/70">
 ({num(room.geometry.center.x)}, {num(room.geometry.center.y)})
 </td>
 <td className="border-b border-white/10 px-3 py-3 text-xs leading-6 text-white/50">
 {room.geometry.polygon
 .map((p) => `(${num(p.x)}, ${num(p.y)})`)
 .join(" → ")}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}