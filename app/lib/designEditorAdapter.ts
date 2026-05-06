import type {
 AxisLine,
 DoorItem,
 FloorplanFloor,
 HouseDesignPackage,
 RoomItem,
 WallItem,
 WindowItem,
} from "@/app/lib/designTypes";
import type {
 EditableDesignPackage,
 EditableDoor,
 EditableFloor,
 EditableWall,
 EditableWallKind,
 EditableWallOrientation,
 EditableWallType,
 EditableWindow,
 FurnitureLibraryItem,
} from "@/app/lib/editorTypes";

export const DEFAULT_FURNITURE_LIBRARY: FurnitureLibraryItem[] = [
 {
 id: "sofa-01",
 code: "F-LIV-001",
 nameZh: "双人沙发",
 nameEn: "2-Seater Sofa",
 category: "living",
 width: 2.1,
 depth: 0.9,
 height: 0.9,
 price: 3200,
 },
 {
 id: "tea-table-01",
 code: "F-LIV-002",
 nameZh: "茶几",
 nameEn: "Coffee Table",
 category: "living",
 width: 1.2,
 depth: 0.6,
 height: 0.45,
 price: 900,
 },
 {
 id: "bed-queen-01",
 code: "F-BED-001",
 nameZh: "双人床",
 nameEn: "Queen Bed",
 category: "bedroom",
 width: 1.8,
 depth: 2.0,
 height: 0.55,
 price: 2600,
 },
 {
 id: "bedside-01",
 code: "F-BED-002",
 nameZh: "床头柜",
 nameEn: "Bedside Table",
 category: "bedroom",
 width: 0.5,
 depth: 0.4,
 height: 0.55,
 price: 500,
 },
 {
 id: "wc-01",
 code: "F-BTH-001",
 nameZh: "马桶",
 nameEn: "Toilet",
 category: "bathroom",
 width: 0.4,
 depth: 0.7,
 height: 0.75,
 price: 1200,
 },
 {
 id: "washbasin-01",
 code: "F-BTH-002",
 nameZh: "洗手台",
 nameEn: "Wash Basin",
 category: "bathroom",
 width: 0.8,
 depth: 0.5,
 height: 0.85,
 price: 1800,
 },
];

type Point = { x: number; y: number };

type WallExtracted = {
 id: string;
 start: Point;
 end: Point;
 thickness: number;
 wallType: EditableWallType;
 sourceWallId?: string;
};

type OpeningWallMatch = {
 wall: EditableWall;
 distance: number;
 t: number;
};

const EPSILON = 0.001;
const DEFAULT_WALL_THICKNESS = 0.2;
const OPENING_ATTACH_DISTANCE = 40;

function safeClone<T>(value: T): T {
 return structuredClone(value);
}

function getRoomBounds(room: RoomItem): {
 minX: number;
 maxX: number;
 minY: number;
 maxY: number;
} | null {
 const polygon = Array.isArray(room.geometry?.polygon) ? room.geometry.polygon : [];
 if (!polygon.length) return null;

 const xs = polygon.map((p: Point) => Number(p.x ?? 0));
 const ys = polygon.map((p: Point) => Number(p.y ?? 0));

 return {
 minX: Math.min(...xs),
 maxX: Math.max(...xs),
 minY: Math.min(...ys),
 maxY: Math.max(...ys),
 };
}

function getOrientation(start: Point, end: Point): EditableWallOrientation {
 const dx = Math.abs(end.x - start.x);
 const dy = Math.abs(end.y - start.y);

 if (dx <= EPSILON && dy > EPSILON) return "vertical";
 if (dy <= EPSILON && dx > EPSILON) return "horizontal";
 return "angled";
}

function getLength(start: Point, end: Point): number {
 return Math.hypot(end.x - start.x, end.y - start.y);
}

function normalizeWallType(value: unknown): EditableWallType {
 const raw = String(value ?? "").toLowerCase();
 if (raw.includes("bearing")) return "bearing";
 if (raw.includes("load")) return "bearing";
 if (raw.includes("承重")) return "bearing";
 return "partition";
}

function detectWallKind(
 start: Point,
 end: Point,
 outline: Point[],
 relatedRoomIds: string[],
): EditableWallKind {
 if (relatedRoomIds.length <= 1) {
 return "exterior";
 }

 return isSegmentOnOutline(start, end, outline) ? "exterior" : "interior";
}

function isNearlyEqual(a: number, b: number, eps = EPSILON): boolean {
 return Math.abs(a - b) <= eps;
}

function isPointOnSegment(point: Point, start: Point, end: Point, tolerance = 0.15): boolean {
 const minX = Math.min(start.x, end.x) - tolerance;
 const maxX = Math.max(start.x, end.x) + tolerance;
 const minY = Math.min(start.y, end.y) - tolerance;
 const maxY = Math.max(start.y, end.y) + tolerance;

 if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
 return false;
 }

 const dx = end.x - start.x;
 const dy = end.y - start.y;
 const len2 = dx * dx + dy * dy;
 if (len2 <= EPSILON) return false;

 const cross = Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx);
 const distance = cross / Math.sqrt(len2);

 return distance <= tolerance;
}

function isSegmentOnOutline(start: Point, end: Point, outline: Point[]): boolean {
 if (!Array.isArray(outline) || outline.length < 2) return false;

 for (let i = 0; i < outline.length; i += 1) {
 const a = outline[i];
 const b = outline[(i + 1) % outline.length];

 const sameDirection =
 isPointOnSegment(start, a, b, 0.05) && isPointOnSegment(end, a, b, 0.05);
 const reverseDirection =
 isPointOnSegment(a, start, end, 0.05) && isPointOnSegment(b, start, end, 0.05);

 if (sameDirection || reverseDirection) {
 return true;
 }
 }

 return false;
}

function getRoomIdsTouchingWall(
 rooms: RoomItem[],
 start: Point,
 end: Point,
): string[] {
 const orientation = getOrientation(start, end);
 if (orientation === "angled") return [];

 const ids: string[] = [];

 rooms.forEach((room) => {
 const roomId = String(room.id ?? "");
 if (!roomId) return;

 const bounds = getRoomBounds(room);
 if (!bounds) return;

 if (orientation === "vertical") {
 const x = start.x;
 const y1 = Math.min(start.y, end.y);
 const y2 = Math.max(start.y, end.y);

 const touchesVerticalEdge =
 (isNearlyEqual(bounds.minX, x) || isNearlyEqual(bounds.maxX, x)) &&
 bounds.maxY > y1 + EPSILON &&
 bounds.minY < y2 - EPSILON;

 if (touchesVerticalEdge) {
 ids.push(roomId);
 }
 return;
 }

 const y = start.y;
 const x1 = Math.min(start.x, end.x);
 const x2 = Math.max(start.x, end.x);

 const touchesHorizontalEdge =
 (isNearlyEqual(bounds.minY, y) || isNearlyEqual(bounds.maxY, y)) &&
 bounds.maxX > x1 + EPSILON &&
 bounds.minX < x2 - EPSILON;

 if (touchesHorizontalEdge) {
 ids.push(roomId);
 }
 });

 return Array.from(new Set(ids));
}

function extractWallEndpoints(wall: WallItem, index: number): WallExtracted {
 const anyWall = wall as WallItem & {
 id?: string;
 x1?: number;
 y1?: number;
 x2?: number;
 y2?: number;
 start?: Point;
 end?: Point;
 thickness?: number;
 type?: string;
 wallType?: string;
 };

 const start: Point = anyWall.start
 ? { x: Number(anyWall.start.x ?? 0), y: Number(anyWall.start.y ?? 0) }
 : {
 x: Number(anyWall.x1 ?? 0),
 y: Number(anyWall.y1 ?? 0),
 };

 const end: Point = anyWall.end
 ? { x: Number(anyWall.end.x ?? 0), y: Number(anyWall.end.y ?? 0) }
 : {
 x: Number(anyWall.x2 ?? 0),
 y: Number(anyWall.y2 ?? 0),
 };

 return {
 id: String(anyWall.id ?? `wall-${index + 1}`),
 start,
 end,
 thickness: Number(anyWall.thickness ?? DEFAULT_WALL_THICKNESS),
 wallType: normalizeWallType(anyWall.wallType ?? anyWall.type),
 sourceWallId: anyWall.id ? String(anyWall.id) : undefined,
 };
}

function buildEditableWallsFromRooms(
 floor: FloorplanFloor,
 rooms: RoomItem[],
 _outline: Point[],
): EditableWall[] {
 const walls: EditableWall[] = [];
 const seen = new Set<string>();

 for (let i = 0; i < rooms.length; i += 1) {
 for (let j = i + 1; j < rooms.length; j += 1) {
 const roomA = rooms[i];
 const roomB = rooms[j];

 const a = roomA.geometry?.bounds;
 const b = roomB.geometry?.bounds;
 if (!a || !b) continue;

 if (isNearlyEqual(a.x + a.width, b.x) || isNearlyEqual(b.x + b.width, a.x)) {
 const wallX = isNearlyEqual(a.x + a.width, b.x) ? b.x : a.x;
 const startY = Math.max(a.y, b.y);
 const endY = Math.min(a.y + a.height, b.y + b.height);

 if (endY - startY > EPSILON) {
 const key = `v-${wallX}-${startY}-${endY}`;
 if (!seen.has(key)) {
 seen.add(key);
 walls.push({
 id: `editable-wall-${floor.floor}-${walls.length + 1}`,
 floor: Number(floor.floor ?? 1),
 kind: "interior",
 wallType: "partition",
 orientation: "vertical",
 start: { x: wallX, y: startY },
 end: { x: wallX, y: endY },
 thickness: DEFAULT_WALL_THICKNESS,
 length: Math.max(0, endY - startY),
 roomIds: [roomA.id, roomB.id],
 attachedDoorIds: [],
 attachedWindowIds: [],
 draggable: true,
 });
 }
 }
 }

 if (isNearlyEqual(a.y + a.height, b.y) || isNearlyEqual(b.y + b.height, a.y)) {
 const wallY = isNearlyEqual(a.y + a.height, b.y) ? b.y : a.y;
 const startX = Math.max(a.x, b.x);
 const endX = Math.min(a.x + a.width, b.x + b.width);

 if (endX - startX > EPSILON) {
 const key = `h-${wallY}-${startX}-${endX}`;
 if (!seen.has(key)) {
 seen.add(key);
 walls.push({
 id: `editable-wall-${floor.floor}-${walls.length + 1}`,
 floor: Number(floor.floor ?? 1),
 kind: "interior",
 wallType: "partition",
 orientation: "horizontal",
 start: { x: startX, y: wallY },
 end: { x: endX, y: wallY },
 thickness: DEFAULT_WALL_THICKNESS,
 length: Math.max(0, endX - startX),
 roomIds: [roomA.id, roomB.id],
 attachedDoorIds: [],
 attachedWindowIds: [],
 draggable: true,
 });
 }
 }
 }
 }
 }

 return walls;
}

function buildEditableWalls(
 floor: FloorplanFloor,
 rooms: RoomItem[],
 outline: Point[],
): EditableWall[] {
 const rawWalls = Array.isArray(floor.walls) ? floor.walls : [];

 if (!rawWalls.length) {
 return buildEditableWallsFromRooms(floor, rooms, outline);
 }

 return rawWalls.map((wall, index) => {
 const extracted = extractWallEndpoints(wall, index);
 const roomIds = getRoomIdsTouchingWall(rooms, extracted.start, extracted.end);
 const orientation = getOrientation(extracted.start, extracted.end);
 const kind = detectWallKind(extracted.start, extracted.end, outline, roomIds);

 return {
 id: `editable-wall-${floor.floor}-${index + 1}`,
 floor: Number(floor.floor ?? 1),
 kind,
 wallType: extracted.wallType,
 orientation,
 start: extracted.start,
 end: extracted.end,
 thickness: extracted.thickness,
 length: getLength(extracted.start, extracted.end),
 roomIds,
 attachedDoorIds: [],
 attachedWindowIds: [],
 sourceWallId: extracted.sourceWallId,
 draggable: kind === "interior" && orientation !== "angled",
 };
 });
}

function getOpeningCenter(opening: DoorItem | WindowItem): Point {
 const anyOpening = opening as
 | (DoorItem & {
 x?: number;
 y?: number;
 center?: Point;
 start?: Point;
 end?: Point;
 position?: Point;
 })
 | (WindowItem & {
 x?: number;
 y?: number;
 center?: Point;
 start?: Point;
 end?: Point;
 position?: Point;
 });

 if (anyOpening.center) {
 return {
 x: Number(anyOpening.center.x ?? 0),
 y: Number(anyOpening.center.y ?? 0),
 };
 }

 if (anyOpening.position) {
 return {
 x: Number(anyOpening.position.x ?? 0),
 y: Number(anyOpening.position.y ?? 0),
 };
 }

 if (anyOpening.start && anyOpening.end) {
 return {
 x: (Number(anyOpening.start.x ?? 0) + Number(anyOpening.end.x ?? 0)) / 2,
 y: (Number(anyOpening.start.y ?? 0) + Number(anyOpening.end.y ?? 0)) / 2,
 };
 }

 return {
 x: Number(anyOpening.x ?? 0),
 y: Number(anyOpening.y ?? 0),
 };
}

function pointToSegmentDistance(point: Point, start: Point, end: Point): {
 distance: number;
 projected: Point;
 t: number;
} {
 const dx = end.x - start.x;
 const dy = end.y - start.y;
 const len2 = dx * dx + dy * dy;

 if (len2 <= EPSILON) {
 return {
 distance: Math.hypot(point.x - start.x, point.y - start.y),
 projected: { ...start },
 t: 0,
 };
 }

 let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
 t = Math.max(0, Math.min(1, t));

 const projected = {
 x: start.x + dx * t,
 y: start.y + dy * t,
 };

 return {
 distance: Math.hypot(point.x - projected.x, point.y - projected.y),
 projected,
 t,
 };
}

function attachDoorToWall(door: DoorItem, walls: EditableWall[]): EditableDoor {
 const center = getOpeningCenter(door);

 let bestMatch: OpeningWallMatch | null = null;

 for (const wall of walls) {
 if (wall.orientation === "angled") continue;

 const result = pointToSegmentDistance(center, wall.start, wall.end);

 if (!bestMatch || result.distance < bestMatch.distance) {
 bestMatch = {
 wall,
 distance: result.distance,
 t: result.t,
 };
 }
 }

 const nextDoor: EditableDoor = {
 ...safeClone(door),
 };

 if (bestMatch && bestMatch.distance <= OPENING_ATTACH_DISTANCE) {
 nextDoor.attachment = {
 wallId: bestMatch.wall.id,
 offsetOnWall: Number((bestMatch.wall.length * bestMatch.t).toFixed(4)),
 normalizedOffset: Number(bestMatch.t.toFixed(6)),
 side: "center",
 };
 }

 return nextDoor;
}

function attachWindowToWall(window: WindowItem, walls: EditableWall[]): EditableWindow {
 const center = getOpeningCenter(window);

 let bestMatch: OpeningWallMatch | null = null;

 for (const wall of walls) {
 if (wall.orientation === "angled") continue;

 const result = pointToSegmentDistance(center, wall.start, wall.end);

 if (!bestMatch || result.distance < bestMatch.distance) {
 bestMatch = {
 wall,
 distance: result.distance,
 t: result.t,
 };
 }
 }

 const nextWindow: EditableWindow = {
 ...safeClone(window),
 };

 if (bestMatch && bestMatch.distance <= OPENING_ATTACH_DISTANCE) {
 nextWindow.attachment = {
 wallId: bestMatch.wall.id,
 offsetOnWall: Number((bestMatch.wall.length * bestMatch.t).toFixed(4)),
 normalizedOffset: Number(bestMatch.t.toFixed(6)),
 side: "center",
 };
 }

 return nextWindow;
}

function linkOpeningsBackToWalls(
 walls: EditableWall[],
 doors: EditableDoor[],
 windows: EditableWindow[],
): EditableWall[] {
 const wallMap = new Map<string, EditableWall>();

 walls.forEach((wall) => {
 wallMap.set(wall.id, {
 ...wall,
 attachedDoorIds: [],
 attachedWindowIds: [],
 });
 });

 doors.forEach((door, index) => {
 const doorId = String((door as DoorItem & { id?: string }).id ?? `door-${index + 1}`);
 const wallId = door.attachment?.wallId;
 if (!wallId) return;

 const wall = wallMap.get(wallId);
 if (!wall) return;

 wall.attachedDoorIds.push(doorId);
 });

 windows.forEach((window, index) => {
 const windowId = String(
 (window as WindowItem & { id?: string }).id ?? `window-${index + 1}`,
 );
 const wallId = window.attachment?.wallId;
 if (!wallId) return;

 const wall = wallMap.get(wallId);
 if (!wall) return;

 wall.attachedWindowIds.push(windowId);
 });

 return Array.from(wallMap.values());
}

function cloneFloorToEditable(floor: FloorplanFloor): EditableFloor {
 const outline = Array.isArray(floor.outerPolygon) ? safeClone(floor.outerPolygon) : [];
 const rooms = Array.isArray(floor.rooms) ? safeClone(floor.rooms) : [];
 const rawWalls = Array.isArray(floor.walls) ? safeClone(floor.walls) : [];
 const axisX: AxisLine[] = Array.isArray(floor.axisX) ? safeClone(floor.axisX) : [];
 const axisY: AxisLine[] = Array.isArray(floor.axisY) ? safeClone(floor.axisY) : [];

 const editableWalls = buildEditableWalls(floor, rooms, outline);
 const editableDoors = Array.isArray(floor.doors)
 ? floor.doors.map((door) => attachDoorToWall(door, editableWalls))
 : [];
 const editableWindows = Array.isArray(floor.windows)
 ? floor.windows.map((window) => attachWindowToWall(window, editableWalls))
 : [];

 const linkedWalls = linkOpeningsBackToWalls(
 editableWalls,
 editableDoors,
 editableWindows,
 );

 console.log("=== FLOOR DEBUG ===");
 console.log("floor", floor.floor);
 console.log("raw walls", safeClone(floor.walls));
 console.log("raw doors", safeClone(floor.doors));
 console.log("raw windows", safeClone(floor.windows));
 console.log("editable walls", safeClone(editableWalls));
 console.log("editable doors", safeClone(editableDoors));
 console.log("editable windows", safeClone(editableWindows));
 console.log(
 "door attachments",
 editableDoors.map((d) => ({
 id: d.id,
 code: d.code,
 position: d.position,
 attachment: d.attachment,
 })),
 );
 console.log(
 "window attachments",
 editableWindows.map((w) => ({
 id: w.id,
 code: w.code,
 position: w.position,
 attachment: w.attachment,
 })),
 );

 return {
 id: `editable-floor-${floor.floor}`,
 floor: Number(floor.floor ?? 1),
 name: String(floor.titleZh ?? `F${floor.floor ?? 1}`),
 outline,
 rooms,
 walls: linkedWalls,
 rawWalls,
 doors: editableDoors,
 windows: editableWindows,
 axisX,
 axisY,
 furniture: [],
 };
}

export function designPackageToEditablePackage(
 pkg: HouseDesignPackage,
): EditableDesignPackage {
 const floors = Array.isArray(pkg.floorplans)
 ? pkg.floorplans.map((floor) => cloneFloorToEditable(floor))
 : [];

 return {
 sourceVersion: `${Date.now()}`,
 floors,
 activeFloor: floors[0]?.floor ?? 1,
 activeViewMode: "plan",
 activeElevationFace: "front",
 selection: null,
 hasUnsavedChanges: false,
 basePackage: safeClone(pkg),
 };
}

function editableWallToRawWall(wall: EditableWall): WallItem {
 return {
 id: wall.sourceWallId ?? wall.id,
 type: wall.wallType,
 thickness: wall.thickness,
 start: safeClone(wall.start),
 end: safeClone(wall.end),
 } as WallItem;
}

function editableDoorToRawDoor(door: EditableDoor): DoorItem {
 return safeClone(door) as DoorItem;
}

function editableWindowToRawWindow(window: EditableWindow): WindowItem {
 return safeClone(window) as WindowItem;
}

export function editablePackageToDesignPackage(
 editable: EditableDesignPackage,
): HouseDesignPackage {
 const next = safeClone(editable.basePackage);

 next.floorplans = editable.floors.map(
 (floor): FloorplanFloor => ({
 floor: floor.floor,
 titleZh: floor.name || `第 ${floor.floor} 层平面图`,
 titleEn: `Floor ${floor.floor} Plan`,
 width: 780,
 height: 460,
 outerPolygon: safeClone(floor.outline),
 rooms: safeClone(floor.rooms),
 axisX: safeClone(floor.axisX),
 axisY: safeClone(floor.axisY),
 walls: floor.walls.map((wall) => editableWallToRawWall(wall)),
 doors: floor.doors.map((door) => editableDoorToRawDoor(door)),
 windows: floor.windows.map((window) => editableWindowToRawWindow(window)),
 }),
 );

 return next;
}