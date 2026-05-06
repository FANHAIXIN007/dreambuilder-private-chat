import type {
 DoorItem,
 DrawingScheduleData,
 DrawingScheduleDoorRow,
 DrawingScheduleRoomRow,
 DrawingScheduleWindowRow,
 FloorplanFloor,
 HouseDesignPackage,
 RoomItem,
 WindowItem,
} from "@/app/lib/designTypes";

function getSafeFloorplans(result: HouseDesignPackage): FloorplanFloor[] {
 const anyResult = result as any;

 if (Array.isArray(anyResult.floorplans) && anyResult.floorplans.length > 0) {
 return anyResult.floorplans as FloorplanFloor[];
 }

 return [];
}

function findRoomCodeById(rooms: RoomItem[], roomId?: string) {
 if (!roomId) return undefined;
 return rooms.find((room) => room.id === roomId)?.code;
}

function toPolygonText(room: RoomItem) {
 return (room.geometry?.polygon ?? [])
 .map((p) => `(${Math.round(p.x)}, ${Math.round(p.y)})`)
 .join(" → ");
}

function buildRoomRows(result: HouseDesignPackage): DrawingScheduleRoomRow[] {
 const floorplans = getSafeFloorplans(result);
 const rows: DrawingScheduleRoomRow[] = [];

 floorplans.forEach((floor) => {
 (floor.rooms ?? []).forEach((room) => {
 rows.push({
 id: room.id,
 code: room.code,
 floor: room.floor,
 nameZh: room.nameZh,
 nameEn: room.nameEn,
 type: room.type,
 area: room.area,
 centerX: Math.round(room.geometry.center.x),
 centerY: Math.round(room.geometry.center.y),
 polygonText: toPolygonText(room),
 });
 });
 });

 return rows;
}

function buildDoorRows(result: HouseDesignPackage): DrawingScheduleDoorRow[] {
 const floorplans = getSafeFloorplans(result);
 const rows: DrawingScheduleDoorRow[] = [];

 floorplans.forEach((floor) => {
 const rooms = floor.rooms ?? [];
 (floor.doors ?? []).forEach((door: DoorItem) => {
 rows.push({
 id: door.id,
 code: door.code,
 floor: door.floor,
 type: door.type,
 width: door.width,
 height: door.height,
 fromRoomCode: findRoomCodeById(rooms, door.fromRoomId),
 toRoomCode: findRoomCodeById(rooms, door.toRoomId),
 });
 });
 });

 return rows;
}

function buildWindowRows(result: HouseDesignPackage): DrawingScheduleWindowRow[] {
 const floorplans = getSafeFloorplans(result);
 const rows: DrawingScheduleWindowRow[] = [];

 floorplans.forEach((floor) => {
 const rooms = floor.rooms ?? [];
 (floor.windows ?? []).forEach((windowItem: WindowItem) => {
 rows.push({
 id: windowItem.id,
 code: windowItem.code,
 floor: windowItem.floor,
 type: windowItem.type,
 width: windowItem.width,
 height: windowItem.height,
 sillHeight: windowItem.sillHeight,
 roomCode: findRoomCodeById(rooms, windowItem.roomId),
 });
 });
 });

 return rows;
}

export function buildDrawingSchedule(result: HouseDesignPackage): DrawingScheduleData {
 return {
 rooms: buildRoomRows(result),
 doors: buildDoorRows(result),
 windows: buildWindowRows(result),
 };
}

export function buildDoorWindowSchedule(result: HouseDesignPackage) {
 const schedule = buildDrawingSchedule(result);

 const doorRows = schedule.doors.map((door) => ({
 code: door.code,
 type: `门 / ${door.type}`,
 size: `${door.width} × ${door.height} mm`,
 qty: 1,
 note:
 [door.fromRoomCode, door.toRoomCode].filter(Boolean).join(" → ") ||
 "平面/立面/剖面联动",
 floor: door.floor,
 kind: "door" as const,
 }));

 const windowRows = schedule.windows.map((windowItem) => ({
 code: windowItem.code,
 type: `窗 / ${windowItem.type}`,
 size: `${windowItem.width} × ${windowItem.height} mm`,
 qty: 1,
 note:
 [
 windowItem.roomCode ? `所属房间 ${windowItem.roomCode}` : "",
 windowItem.sillHeight ? `窗台高 ${windowItem.sillHeight} mm` : "",
 ]
 .filter(Boolean)
 .join(" · ") || "平面/立面/剖面联动",
 floor: windowItem.floor,
 kind: "window" as const,
 }));

 return [...doorRows, ...windowRows].sort((a, b) => {
 if (a.floor !== b.floor) return a.floor - b.floor;
 return a.code.localeCompare(b.code);
 });
}