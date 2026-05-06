"use client";

import React, { useMemo, useRef, useState } from "react";
import type { EditableFloor, FurnitureItem } from "@/app/lib/editorTypes";
import type { DragWallCandidate } from "@/app/lib/wallDrag";
import { findDraggableWalls } from "@/app/lib/wallDrag";

type Props = {
 floor: EditableFloor | null;
 selectedRoomId?: string | null;
 selectedFurnitureId?: string | null;
 selectedDoorId?: string | null;
 selectedWindowId?: string | null;
 onRoomSelect?: (roomId: string | null) => void;
 onFurnitureSelect?: (furnitureId: string | null) => void;
 onDoorSelect?: (doorId: string | null) => void;
 onWindowSelect?: (windowId: string | null) => void;
 onFurnitureMove?: (furnitureId: string, x: number, y: number) => void;
 onWallDrag?: (wall: DragWallCandidate, nextValue: number) => void;
};

type FurnitureDragState = {
 furnitureId: string;
 offsetX: number;
 offsetY: number;
} | null;

type WallDragState = {
 wallId: string;
} | null;

type RoomDisplayBox = {
 left: number;
 right: number;
 top: number;
 bottom: number;
 centerX: number;
 centerY: number;
};

const ROOM_SNAP_THRESHOLD = 18;
const FURNITURE_SNAP_THRESHOLD = 14;
const COLLISION_PADDING = 6;
const EPSILON = 0.001;

function toPoints(points: Array<{ x: number; y: number }>) {
 return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function clamp(value: number, min: number, max: number) {
 return Math.max(min, Math.min(max, value));
}

function isPointInRect(
 x: number,
 y: number,
 rect: { x: number; y: number; width: number; height: number },
) {
 return (
 x >= rect.x &&
 x <= rect.x + rect.width &&
 y >= rect.y &&
 y <= rect.y + rect.height
 );
}

function rectsOverlap(
 a: { x: number; y: number; width: number; height: number },
 b: { x: number; y: number; width: number; height: number },
) {
 return !(
 a.x + a.width <= b.x ||
 b.x + b.width <= a.x ||
 a.y + a.height <= b.y ||
 b.y + b.height <= a.y
 );
}

function applyRoomBoundarySnap(
 x: number,
 y: number,
 widthPx: number,
 depthPx: number,
 floor: EditableFloor,
) {
 const centerX = x + widthPx / 2;
 const centerY = y + depthPx / 2;

 const hostRoom = floor.rooms.find((room) =>
 isPointInRect(centerX, centerY, room.geometry.bounds),
 );

 if (!hostRoom) {
 return { x, y };
 }

 const bounds = hostRoom.geometry.bounds;
 let nextX = x;
 let nextY = y;

 const leftDist = Math.abs(x - bounds.x);
 const rightDist = Math.abs(x + widthPx - (bounds.x + bounds.width));
 const topDist = Math.abs(y - bounds.y);
 const bottomDist = Math.abs(y + depthPx - (bounds.y + bounds.height));

 if (leftDist <= ROOM_SNAP_THRESHOLD) nextX = bounds.x;
 if (rightDist <= ROOM_SNAP_THRESHOLD) nextX = bounds.x + bounds.width - widthPx;
 if (topDist <= ROOM_SNAP_THRESHOLD) nextY = bounds.y;
 if (bottomDist <= ROOM_SNAP_THRESHOLD) nextY = bounds.y + bounds.height - depthPx;

 return { x: nextX, y: nextY };
}

function applyFurnitureSnap(
 x: number,
 y: number,
 widthPx: number,
 depthPx: number,
 floor: EditableFloor,
 currentFurnitureId: string,
) {
 let nextX = x;
 let nextY = y;

 for (const other of floor.furniture) {
 if (other.id === currentFurnitureId) continue;

 const otherWidth = other.width * 100;
 const otherDepth = other.depth * 100;

 const currentLeft = nextX;
 const currentRight = nextX + widthPx;
 const currentTop = nextY;
 const currentBottom = nextY + depthPx;
 const currentCenterX = nextX + widthPx / 2;
 const currentCenterY = nextY + depthPx / 2;

 const otherLeft = other.x;
 const otherRight = other.x + otherWidth;
 const otherTop = other.y;
 const otherBottom = other.y + otherDepth;
 const otherCenterX = other.x + otherWidth / 2;
 const otherCenterY = other.y + otherDepth / 2;

 if (Math.abs(currentLeft - otherLeft) <= FURNITURE_SNAP_THRESHOLD) {
 nextX = otherLeft;
 }
 if (Math.abs(currentRight - otherRight) <= FURNITURE_SNAP_THRESHOLD) {
 nextX = otherRight - widthPx;
 }
 if (Math.abs(currentCenterX - otherCenterX) <= FURNITURE_SNAP_THRESHOLD) {
 nextX = otherCenterX - widthPx / 2;
 }

 if (Math.abs(currentTop - otherTop) <= FURNITURE_SNAP_THRESHOLD) {
 nextY = otherTop;
 }
 if (Math.abs(currentBottom - otherBottom) <= FURNITURE_SNAP_THRESHOLD) {
 nextY = otherBottom - depthPx;
 }
 if (Math.abs(currentCenterY - otherCenterY) <= FURNITURE_SNAP_THRESHOLD) {
 nextY = otherCenterY - depthPx / 2;
 }
 }

 return { x: nextX, y: nextY };
}

function resolveFurnitureCollision(
 x: number,
 y: number,
 widthPx: number,
 depthPx: number,
 floor: EditableFloor,
 currentFurnitureId: string,
 outlineBounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
 let nextX = x;
 let nextY = y;

 const currentRect = () => ({
 x: nextX,
 y: nextY,
 width: widthPx,
 height: depthPx,
 });

 for (const other of floor.furniture) {
 if (other.id === currentFurnitureId) continue;

 const otherRect = {
 x: other.x - COLLISION_PADDING,
 y: other.y - COLLISION_PADDING,
 width: other.width * 100 + COLLISION_PADDING * 2,
 height: other.depth * 100 + COLLISION_PADDING * 2,
 };

 if (!rectsOverlap(currentRect(), otherRect)) continue;

 const tryLeft = otherRect.x - widthPx;
 const tryRight = otherRect.x + otherRect.width;
 const tryTop = otherRect.y - depthPx;
 const tryBottom = otherRect.y + otherRect.height;

 const candidates = [
 { x: tryLeft, y: nextY },
 { x: tryRight, y: nextY },
 { x: nextX, y: tryTop },
 { x: nextX, y: tryBottom },
 ].map((candidate) => ({
 x: clamp(candidate.x, outlineBounds.minX, outlineBounds.maxX - widthPx),
 y: clamp(candidate.y, outlineBounds.minY, outlineBounds.maxY - depthPx),
 }));

 let resolved = false;

 for (const candidate of candidates) {
 const candidateRect = {
 x: candidate.x,
 y: candidate.y,
 width: widthPx,
 height: depthPx,
 };

 const collideAny = floor.furniture.some((item) => {
 if (item.id === currentFurnitureId) return false;
 const rect = {
 x: item.x - COLLISION_PADDING,
 y: item.y - COLLISION_PADDING,
 width: item.width * 100 + COLLISION_PADDING * 2,
 height: item.depth * 100 + COLLISION_PADDING * 2,
 };
 return rectsOverlap(candidateRect, rect);
 });

 if (!collideAny) {
 nextX = candidate.x;
 nextY = candidate.y;
 resolved = true;
 break;
 }
 }

 if (!resolved) {
 return { x: nextX, y: nextY };
 }
 }

 return { x: nextX, y: nextY };
}

function getRoomDisplayBox(
 room: EditableFloor["rooms"][number],
 floor: EditableFloor,
): RoomDisplayBox {
 const fallback = room.geometry.bounds;
 const fallbackLeft = fallback.x;
 const fallbackRight = fallback.x + fallback.width;
 const fallbackTop = fallback.y;
 const fallbackBottom = fallback.y + fallback.height;
 const fallbackCenterX = fallback.x + fallback.width / 2;
 const fallbackCenterY = fallback.y + fallback.height / 2;

 const relatedWalls = floor.walls.filter((wall) => wall.roomIds?.includes(room.id));

 if (!relatedWalls.length) {
 return {
 left: fallbackLeft,
 right: fallbackRight,
 top: fallbackTop,
 bottom: fallbackBottom,
 centerX: fallbackCenterX,
 centerY: fallbackCenterY,
 };
 }

 const verticalXs = relatedWalls
 .filter((wall) => wall.orientation === "vertical")
 .map((wall) => wall.start.x);

 const horizontalYs = relatedWalls
 .filter((wall) => wall.orientation === "horizontal")
 .map((wall) => wall.start.y);

 let left = fallbackLeft;
 let right = fallbackRight;
 let top = fallbackTop;
 let bottom = fallbackBottom;

 const leftCandidates = verticalXs.filter((x) => x <= fallbackCenterX + EPSILON);
 const rightCandidates = verticalXs.filter((x) => x >= fallbackCenterX - EPSILON);
 const topCandidates = horizontalYs.filter((y) => y <= fallbackCenterY + EPSILON);
 const bottomCandidates = horizontalYs.filter((y) => y >= fallbackCenterY - EPSILON);

 if (leftCandidates.length > 0) {
 left = Math.max(...leftCandidates);
 }
 if (rightCandidates.length > 0) {
 right = Math.min(...rightCandidates);
 }
 if (topCandidates.length > 0) {
 top = Math.max(...topCandidates);
 }
 if (bottomCandidates.length > 0) {
 bottom = Math.min(...bottomCandidates);
 }

 if (right - left < 40) {
 left = fallbackLeft;
 right = fallbackRight;
 }

 if (bottom - top < 40) {
 top = fallbackTop;
 bottom = fallbackBottom;
 }

 return {
 left,
 right,
 top,
 bottom,
 centerX: (left + right) / 2,
 centerY: (top + bottom) / 2,
 };
}

export default function EditableFloorplanCanvas({
 floor,
 selectedRoomId,
 selectedFurnitureId,
 selectedDoorId,
 selectedWindowId,
 onRoomSelect,
 onFurnitureSelect,
 onDoorSelect,
 onWindowSelect,
 onFurnitureMove,
 onWallDrag,
}: Props) {
 const svgRef = useRef<SVGSVGElement | null>(null);
 const [furnitureDragState, setFurnitureDragState] = useState<FurnitureDragState>(null);
 const [wallDragState, setWallDragState] = useState<WallDragState>(null);

 const draggableWalls = useMemo(() => {
 if (!floor) return [];
 return findDraggableWalls(floor);
 }, [floor]);

 const draggableWallIdSet = useMemo(() => {
 return new Set(draggableWalls.map((wall) => wall.wallId ?? wall.id));
 }, [draggableWalls]);

 const roomDisplayBoxes = useMemo(() => {
 if (!floor) return new Map<string, RoomDisplayBox>();

 const map = new Map<string, RoomDisplayBox>();
 floor.rooms.forEach((room) => {
 map.set(room.id, getRoomDisplayBox(room, floor));
 });
 return map;
 }, [floor]);

 const viewBox = useMemo(() => {
 if (!floor?.outline?.length) return "0 0 1000 700";
 const xs = floor.outline.map((p) => p.x);
 const ys = floor.outline.map((p) => p.y);
 const minX = Math.min(...xs) - 80;
 const minY = Math.min(...ys) - 80;
 const maxX = Math.max(...xs) + 80;
 const maxY = Math.max(...ys) + 80;
 return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
 }, [floor]);

 const outlineBounds = useMemo(() => {
 if (!floor?.outline?.length) {
 return { minX: 0, minY: 0, maxX: 1000, maxY: 700 };
 }
 const xs = floor.outline.map((p) => p.x);
 const ys = floor.outline.map((p) => p.y);
 return {
 minX: Math.min(...xs),
 minY: Math.min(...ys),
 maxX: Math.max(...xs),
 maxY: Math.max(...ys),
 };
 }, [floor]);

 const getSvgPoint = (clientX: number, clientY: number) => {
 const svg = svgRef.current;
 if (!svg) return null;
 const pt = svg.createSVGPoint();
 pt.x = clientX;
 pt.y = clientY;
 const ctm = svg.getScreenCTM();
 if (!ctm) return null;
 return pt.matrixTransform(ctm.inverse());
 };

 const clearSelections = () => {
 onRoomSelect?.(null);
 onFurnitureSelect?.(null);
 onDoorSelect?.(null);
 onWindowSelect?.(null);
 };

 const handleFurnitureMouseDown = (
 event: React.MouseEvent<SVGGElement>,
 item: FurnitureItem,
 ) => {
 event.stopPropagation();
 const point = getSvgPoint(event.clientX, event.clientY);
 if (!point) return;

 onFurnitureSelect?.(item.id);
 onRoomSelect?.(null);
 onDoorSelect?.(null);
 onWindowSelect?.(null);

 setFurnitureDragState({
 furnitureId: item.id,
 offsetX: point.x - item.x,
 offsetY: point.y - item.y,
 });
 };

 const handleWallMouseDown = (
 event: React.MouseEvent<SVGLineElement>,
 wall: DragWallCandidate,
 ) => {
 event.stopPropagation();
 clearSelections();
 setWallDragState({ wallId: wall.wallId ?? wall.id });
 };

 const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
 if (!floor) return;

 const point = getSvgPoint(event.clientX, event.clientY);
 if (!point) return;

 if (furnitureDragState) {
 const item = floor.furniture.find((f) => f.id === furnitureDragState.furnitureId);
 if (!item) return;

 const widthPx = item.width * 100;
 const depthPx = item.depth * 100;

 let nextX = clamp(
 point.x - furnitureDragState.offsetX,
 outlineBounds.minX,
 outlineBounds.maxX - widthPx,
 );
 let nextY = clamp(
 point.y - furnitureDragState.offsetY,
 outlineBounds.minY,
 outlineBounds.maxY - depthPx,
 );

 const roomSnapped = applyRoomBoundarySnap(nextX, nextY, widthPx, depthPx, floor);
 nextX = roomSnapped.x;
 nextY = roomSnapped.y;

 const furnitureSnapped = applyFurnitureSnap(
 nextX,
 nextY,
 widthPx,
 depthPx,
 floor,
 item.id,
 );
 nextX = furnitureSnapped.x;
 nextY = furnitureSnapped.y;

 const collisionResolved = resolveFurnitureCollision(
 nextX,
 nextY,
 widthPx,
 depthPx,
 floor,
 item.id,
 outlineBounds,
 );
 nextX = collisionResolved.x;
 nextY = collisionResolved.y;

 nextX = clamp(nextX, outlineBounds.minX, outlineBounds.maxX - widthPx);
 nextY = clamp(nextY, outlineBounds.minY, outlineBounds.maxY - depthPx);

 onFurnitureMove?.(item.id, nextX, nextY);
 return;
 }

 if (wallDragState) {
 const wall = draggableWalls.find(
 (item) => (item.wallId ?? item.id) === wallDragState.wallId,
 );
 if (!wall) return;

 const nextValue = wall.orientation === "vertical" ? point.x : point.y;
 onWallDrag?.(wall, nextValue);
 }
 };

 const stopDragging = () => {
 setFurnitureDragState(null);
 setWallDragState(null);
 };

 if (!floor) {
 return (
 <div className="flex h-[780px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-sm text-white/55 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
 暂无可编辑楼层数据
 </div>
 );
 }

 return (
 <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold text-white">可编辑平面图</h3>
 <p className="mt-1 text-xs text-white/50">
 当前显示已切换为墙主导视图：房间名称会根据墙体位置动态调整显示中心。
 </p>
 </div>
 </div>

 <div className="h-[700px] overflow-hidden rounded-[22px] bg-slate-100">
 <svg
 ref={svgRef}
 viewBox={viewBox}
 className="h-full w-full"
 onMouseMove={handleMouseMove}
 onMouseUp={stopDragging}
 onMouseLeave={stopDragging}
 onClick={() => clearSelections()}
 >
 <polygon
 points={toPoints(floor.outline)}
 fill="#ffffff"
 stroke="#0f172a"
 strokeWidth={8}
 />

 {floor.rooms.map((room) => {
 const active = selectedRoomId === room.id;
 const displayBox =
 roomDisplayBoxes.get(room.id) ?? {
 left: room.geometry.bounds.x,
 right: room.geometry.bounds.x + room.geometry.bounds.width,
 top: room.geometry.bounds.y,
 bottom: room.geometry.bounds.y + room.geometry.bounds.height,
 centerX: room.geometry.bounds.x + room.geometry.bounds.width / 2,
 centerY: room.geometry.bounds.y + room.geometry.bounds.height / 2,
 };

 return (
 <g
 key={room.id}
 onClick={(event) => {
 event.stopPropagation();
 onRoomSelect?.(room.id);
 onFurnitureSelect?.(null);
 onDoorSelect?.(null);
 onWindowSelect?.(null);
 }}
 className="cursor-pointer"
 >
 <rect
 x={displayBox.left}
 y={displayBox.top}
 width={Math.max(24, displayBox.right - displayBox.left)}
 height={Math.max(24, displayBox.bottom - displayBox.top)}
 fill={active ? "rgba(219,234,254,0.55)" : "rgba(248,250,252,0.45)"}
 stroke="transparent"
 />
 <text
 x={displayBox.centerX}
 y={displayBox.centerY - 10}
 textAnchor="middle"
 fontSize="18"
 fontWeight="700"
 fill="#0f172a"
 >
 {room.nameZh}
 </text>
 <text
 x={displayBox.centerX}
 y={displayBox.centerY + 18}
 textAnchor="middle"
 fontSize="14"
 fill="#475569"
 >
 {room.code} · {Number(room.area || 0).toFixed(1)} ㎡
 </text>
 </g>
 );
 })}

 {floor.walls.map((wall) => {
 const wallId = wall.id;
 const isDraggable = draggableWallIdSet.has(wallId);
 const isDragging = wallDragState?.wallId === wallId;

 return (
 <g key={`wall-base-${wallId}`}>
 <line
 x1={wall.start.x}
 y1={wall.start.y}
 x2={wall.end.x}
 y2={wall.end.y}
 stroke={isDragging ? "#6d28d9" : isDraggable ? "#7c3aed" : "#94a3b8"}
 strokeWidth={isDragging ? 12 : isDraggable ? 8 : 5}
 strokeOpacity={isDragging ? 0.95 : isDraggable ? 0.85 : 0.9}
 strokeLinecap="round"
 />
 </g>
 );
 })}

 {draggableWalls.map((wall) => {
 const key = wall.wallId ?? wall.id;
 const isVertical = wall.orientation === "vertical";
 const isDragging = wallDragState?.wallId === key;

 return (
 <g key={`wall-hit-${key}`}>
 <line
 x1={isVertical ? wall.value : wall.start}
 y1={isVertical ? wall.start : wall.value}
 x2={isVertical ? wall.value : wall.end}
 y2={isVertical ? wall.end : wall.value}
 stroke="#000000"
 strokeOpacity={0}
 strokeWidth={28}
 className={isVertical ? "cursor-ew-resize" : "cursor-ns-resize"}
 onMouseDown={(event) => handleWallMouseDown(event, wall)}
 />
 <line
 x1={isVertical ? wall.value : wall.start}
 y1={isVertical ? wall.start : wall.value}
 x2={isVertical ? wall.value : wall.end}
 y2={isVertical ? wall.end : wall.value}
 stroke={isDragging ? "#4c1d95" : "#7c3aed"}
 strokeDasharray="10 8"
 strokeWidth={isDragging ? 4 : 3}
 className={isVertical ? "cursor-ew-resize" : "cursor-ns-resize"}
 onMouseDown={(event) => handleWallMouseDown(event, wall)}
 />
 </g>
 );
 })}

 {floor.doors.map((door) => {
 const active = selectedDoorId === door.id;
 const x = door.position?.x ?? 0;
 const y = door.position?.y ?? 0;
 const vertical =
 door.rotation === 90 || door.rotation === 270 || door.rotation === -90;

 return (
 <g
 key={door.id}
 onClick={(event) => {
 event.stopPropagation();
 onDoorSelect?.(door.id);
 onWindowSelect?.(null);
 onRoomSelect?.(null);
 onFurnitureSelect?.(null);
 }}
 className="cursor-pointer"
 >
 {vertical ? (
 <>
 <line
 x1={x}
 y1={y - 28}
 x2={x}
 y2={y + 28}
 stroke={active ? "#dc2626" : "#ef4444"}
 strokeWidth={active ? 8 : 6}
 strokeLinecap="round"
 />
 <line
 x1={x}
 y1={y - 28}
 x2={x + 22}
 y2={y}
 stroke={active ? "#991b1b" : "#b91c1c"}
 strokeWidth={2}
 />
 </>
 ) : (
 <>
 <line
 x1={x - 28}
 y1={y}
 x2={x + 28}
 y2={y}
 stroke={active ? "#dc2626" : "#ef4444"}
 strokeWidth={active ? 8 : 6}
 strokeLinecap="round"
 />
 <line
 x1={x - 28}
 y1={y}
 x2={x}
 y2={y - 22}
 stroke={active ? "#991b1b" : "#b91c1c"}
 strokeWidth={2}
 />
 </>
 )}

 <text
 x={x + 12}
 y={y - 12}
 fontSize="10"
 fontWeight="700"
 fill="#7f1d1d"
 >
 {door.code}
 </text>
 </g>
 );
 })}

 {floor.windows.map((windowItem) => {
 const active = selectedWindowId === windowItem.id;
 const x = windowItem.position?.x ?? 0;
 const y = windowItem.position?.y ?? 0;
 const vertical =
 windowItem.rotation === 90 ||
 windowItem.rotation === 270 ||
 windowItem.rotation === -90;

 return (
 <g
 key={windowItem.id}
 onClick={(event) => {
 event.stopPropagation();
 onWindowSelect?.(windowItem.id);
 onDoorSelect?.(null);
 onRoomSelect?.(null);
 onFurnitureSelect?.(null);
 }}
 className="cursor-pointer"
 >
 {vertical ? (
 <line
 x1={x}
 y1={y - 34}
 x2={x}
 y2={y + 34}
 stroke={active ? "#1d4ed8" : "#38bdf8"}
 strokeWidth={active ? 8 : 6}
 strokeLinecap="round"
 />
 ) : (
 <line
 x1={x - 34}
 y1={y}
 x2={x + 34}
 y2={y}
 stroke={active ? "#1d4ed8" : "#38bdf8"}
 strokeWidth={active ? 8 : 6}
 strokeLinecap="round"
 />
 )}

 <text
 x={x + 10}
 y={y - 10}
 fontSize="10"
 fontWeight="700"
 fill="#0f3b82"
 >
 {windowItem.code}
 </text>
 </g>
 );
 })}

 {floor.furniture.map((item: FurnitureItem) => {
 const active = selectedFurnitureId === item.id;
 const widthPx = item.width * 100;
 const depthPx = item.depth * 100;
 const centerX = item.x + widthPx / 2;
 const centerY = item.y + depthPx / 2;

 return (
 <g
 key={item.id}
 onMouseDown={(event) => handleFurnitureMouseDown(event, item)}
 className="cursor-move"
 >
 <rect
 x={item.x}
 y={item.y}
 width={widthPx}
 height={depthPx}
 rx={10}
 ry={10}
 fill={active ? "#fcd34d" : "#fde68a"}
 stroke={active ? "#b45309" : "#d97706"}
 strokeWidth={active ? 4 : 2}
 />
 <text
 x={centerX}
 y={centerY - 6}
 textAnchor="middle"
 dominantBaseline="middle"
 fontSize="12"
 fontWeight="700"
 fill="#78350f"
 >
 {item.nameZh}
 </text>
 <text
 x={centerX}
 y={centerY + 12}
 textAnchor="middle"
 dominantBaseline="middle"
 fontSize="10"
 fontWeight="700"
 fill="#92400e"
 >
 {item.rotation ?? 0}°
 </text>
 </g>
 );
 })}
 </svg>
 </div>
 </div>
 );
}