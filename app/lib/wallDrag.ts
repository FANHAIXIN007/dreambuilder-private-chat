import type { RoomItem } from "@/app/lib/designTypes";
import type {
 EditableDoor,
 EditableFloor,
 EditableWall,
 EditableWindow,
} from "@/app/lib/editorTypes";

export type DragWallOrientation = "vertical" | "horizontal";

export type DragWallCandidate = {
 id: string;
 orientation: DragWallOrientation;
 value: number;
 start: number;
 end: number;
 roomAId: string;
 roomBId: string;
 wallId?: string;
};

type Point = { x: number; y: number };

const MIN_ROOM_SIZE = 80;
const EPSILON = 0.001;
const CONNECTION_TOLERANCE = 12;

function cloneRoom(room: RoomItem): RoomItem {
 return structuredClone(room);
}

function getBounds(room: RoomItem) {
 return room.geometry.bounds;
}

function rebuildRectRoom(
 room: RoomItem,
 x: number,
 y: number,
 width: number,
 height: number,
) {
 room.geometry.bounds = { x, y, width, height };
 room.geometry.polygon = [
 { x, y },
 { x: x + width, y },
 { x: x + width, y: y + height },
 { x, y: y + height },
 ];
 room.geometry.center = {
 x: x + width / 2,
 y: y + height / 2,
 };

 const pixelArea = width * height;
 room.area = Math.max(4, Math.round(pixelArea / 1200));
}

function clamp(value: number, min: number, max: number) {
 return Math.max(min, Math.min(max, value));
}

function isNearlyEqual(a: number, b: number, eps = EPSILON) {
 return Math.abs(a - b) <= eps;
}

function isNear(a: number, b: number, tolerance = CONNECTION_TOLERANCE) {
 return Math.abs(a - b) <= tolerance;
}

function normalizeWall(wall: EditableWall): EditableWall {
 if (wall.orientation === "vertical") {
 const startY = Math.min(wall.start.y, wall.end.y);
 const endY = Math.max(wall.start.y, wall.end.y);
 return {
 ...wall,
 start: { x: wall.start.x, y: startY },
 end: { x: wall.end.x, y: endY },
 length: Math.abs(endY - startY),
 };
 }

 const startX = Math.min(wall.start.x, wall.end.x);
 const endX = Math.max(wall.start.x, wall.end.x);
 return {
 ...wall,
 start: { x: startX, y: wall.start.y },
 end: { x: endX, y: wall.end.y },
 length: Math.abs(endX - startX),
 };
}

function getWallSpan(wall: EditableWall) {
 if (wall.orientation === "vertical") {
 return {
 start: Math.min(wall.start.y, wall.end.y),
 end: Math.max(wall.start.y, wall.end.y),
 };
 }

 return {
 start: Math.min(wall.start.x, wall.end.x),
 end: Math.max(wall.start.x, wall.end.x),
 };
}

function getWallAxisValue(wall: EditableWall) {
 return wall.orientation === "vertical" ? wall.start.x : wall.start.y;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number) {
 return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function projectPointOnWallByRatio(wall: EditableWall, ratio: number) {
 const t = Math.max(0, Math.min(1, ratio));
 return {
 x: wall.start.x + (wall.end.x - wall.start.x) * t,
 y: wall.start.y + (wall.end.y - wall.start.y) * t,
 };
}

function moveDoorWithWall(door: EditableDoor, wall: EditableWall): EditableDoor {
 const next = structuredClone(door);
 const ratio = next.attachment?.normalizedOffset ?? 0.5;
 const point = projectPointOnWallByRatio(wall, ratio);
 next.position = { x: point.x, y: point.y };
 return next;
}

function moveWindowWithWall(windowItem: EditableWindow, wall: EditableWall): EditableWindow {
 const next = structuredClone(windowItem);
 const ratio = next.attachment?.normalizedOffset ?? 0.5;
 const point = projectPointOnWallByRatio(wall, ratio);
 next.position = { x: point.x, y: point.y };
 return next;
}

function moveAttachedOpeningsByWall(
 floor: EditableFloor,
 wall: EditableWall,
) {
 const wallId = wall.id;

 floor.doors = floor.doors.map((door) => {
 if (door.attachment?.wallId !== wallId) return structuredClone(door);
 return moveDoorWithWall(door, wall);
 });

 floor.windows = floor.windows.map((windowItem) => {
 if (windowItem.attachment?.wallId !== wallId) return structuredClone(windowItem);
 return moveWindowWithWall(windowItem, wall);
 });
}

function findCandidateByWallObjects(floor: EditableFloor): DragWallCandidate[] {
 return floor.walls
 .filter(
 (wall): wall is EditableWall & { orientation: DragWallOrientation } =>
 wall.draggable === true &&
 wall.kind === "interior" &&
 wall.roomIds.length >= 2 &&
 (wall.orientation === "vertical" || wall.orientation === "horizontal"),
 )
 .map((wall) => {
 const span = getWallSpan(wall);
 const [roomAId, roomBId] = wall.roomIds;

 return {
 id: wall.id,
 wallId: wall.id,
 orientation: wall.orientation,
 value: getWallAxisValue(wall),
 start: span.start,
 end: span.end,
 roomAId,
 roomBId,
 };
 });
}

function findCandidateByRooms(rooms: RoomItem[]): DragWallCandidate[] {
 const candidates: DragWallCandidate[] = [];

 for (let i = 0; i < rooms.length; i += 1) {
 for (let j = i + 1; j < rooms.length; j += 1) {
 const a = rooms[i];
 const b = rooms[j];
 const ab = getBounds(a);
 const bb = getBounds(b);

 if (Math.abs(ab.x + ab.width - bb.x) < EPSILON) {
 const overlap = overlapLength(ab.y, ab.y + ab.height, bb.y, bb.y + bb.height);
 if (overlap > 40) {
 candidates.push({
 id: `wall-v-${a.id}-${b.id}`,
 orientation: "vertical",
 value: bb.x,
 start: Math.max(ab.y, bb.y),
 end: Math.min(ab.y + ab.height, bb.y + bb.height),
 roomAId: a.id,
 roomBId: b.id,
 });
 }
 }

 if (Math.abs(bb.x + bb.width - ab.x) < EPSILON) {
 const overlap = overlapLength(ab.y, ab.y + ab.height, bb.y, bb.y + bb.height);
 if (overlap > 40) {
 candidates.push({
 id: `wall-v-${b.id}-${a.id}`,
 orientation: "vertical",
 value: ab.x,
 start: Math.max(ab.y, bb.y),
 end: Math.min(ab.y + ab.height, bb.y + bb.height),
 roomAId: b.id,
 roomBId: a.id,
 });
 }
 }

 if (Math.abs(ab.y + ab.height - bb.y) < EPSILON) {
 const overlap = overlapLength(ab.x, ab.x + ab.width, bb.x, bb.x + bb.width);
 if (overlap > 40) {
 candidates.push({
 id: `wall-h-${a.id}-${b.id}`,
 orientation: "horizontal",
 value: bb.y,
 start: Math.max(ab.x, bb.x),
 end: Math.min(ab.x + ab.width, bb.x + bb.width),
 roomAId: a.id,
 roomBId: b.id,
 });
 }
 }

 if (Math.abs(bb.y + bb.height - ab.y) < EPSILON) {
 const overlap = overlapLength(ab.x, ab.x + ab.width, bb.x, bb.x + bb.width);
 if (overlap > 40) {
 candidates.push({
 id: `wall-h-${b.id}-${a.id}`,
 orientation: "horizontal",
 value: ab.y,
 start: Math.max(ab.x, bb.x),
 end: Math.min(ab.x + ab.width, bb.x + bb.width),
 roomAId: b.id,
 roomBId: a.id,
 });
 }
 }
 }
 }

 return candidates;
}

function getDraggedWallById(
 floor: EditableFloor,
 wall: DragWallCandidate,
): EditableWall | null {
 const wallId = wall.wallId ?? wall.id;
 return floor.walls.find((item) => item.id === wallId) ?? null;
}

function computeDragRangeFromRooms(
 rooms: RoomItem[],
 wall: EditableWall,
) {
 const span = getWallSpan(wall);

 if (wall.orientation === "vertical") {
 const leftRooms = rooms.filter((room) => {
 const b = getBounds(room);
 return (
 overlapLength(b.y, b.y + b.height, span.start, span.end) > EPSILON &&
 isNearlyEqual(b.x + b.width, wall.start.x)
 );
 });

 const rightRooms = rooms.filter((room) => {
 const b = getBounds(room);
 return (
 overlapLength(b.y, b.y + b.height, span.start, span.end) > EPSILON &&
 isNearlyEqual(b.x, wall.start.x)
 );
 });

 const min = leftRooms.length
 ? Math.max(...leftRooms.map((room) => getBounds(room).x + MIN_ROOM_SIZE))
 : wall.start.x - 99999;

 const max = rightRooms.length
 ? Math.min(
 ...rightRooms.map((room) => getBounds(room).x + getBounds(room).width - MIN_ROOM_SIZE),
 )
 : wall.start.x + 99999;

 return { min, max };
 }

 const topRooms = rooms.filter((room) => {
 const b = getBounds(room);
 return (
 overlapLength(b.x, b.x + b.width, span.start, span.end) > EPSILON &&
 isNearlyEqual(b.y + b.height, wall.start.y)
 );
 });

 const bottomRooms = rooms.filter((room) => {
 const b = getBounds(room);
 return (
 overlapLength(b.x, b.x + b.width, span.start, span.end) > EPSILON &&
 isNearlyEqual(b.y, wall.start.y)
 );
 });

 const min = topRooms.length
 ? Math.max(...topRooms.map((room) => getBounds(room).y + MIN_ROOM_SIZE))
 : wall.start.y - 99999;

 const max = bottomRooms.length
 ? Math.min(
 ...bottomRooms.map((room) => getBounds(room).y + getBounds(room).height - MIN_ROOM_SIZE),
 )
 : wall.start.y + 99999;

 return { min, max };
}

function moveWallAxis(
 wall: EditableWall,
 nextValue: number,
): EditableWall {
 if (wall.orientation === "vertical") {
 return normalizeWall({
 ...wall,
 start: { x: nextValue, y: wall.start.y },
 end: { x: nextValue, y: wall.end.y },
 });
 }

 return normalizeWall({
 ...wall,
 start: { x: wall.start.x, y: nextValue },
 end: { x: wall.end.x, y: nextValue },
 });
}

function endpointConnectedToVerticalWall(
 point: Point,
 verticalWall: EditableWall,
) {
 const minY = Math.min(verticalWall.start.y, verticalWall.end.y) - CONNECTION_TOLERANCE;
 const maxY = Math.max(verticalWall.start.y, verticalWall.end.y) + CONNECTION_TOLERANCE;

 return isNear(point.x, verticalWall.start.x) && point.y >= minY && point.y <= maxY;
}

function endpointConnectedToHorizontalWall(
 point: Point,
 horizontalWall: EditableWall,
) {
 const minX = Math.min(horizontalWall.start.x, horizontalWall.end.x) - CONNECTION_TOLERANCE;
 const maxX = Math.max(horizontalWall.start.x, horizontalWall.end.x) + CONNECTION_TOLERANCE;

 return isNear(point.y, horizontalWall.start.y) && point.x >= minX && point.x <= maxX;
}

function syncConnectedWallEndpoints(
 walls: EditableWall[],
 previousDraggedWall: EditableWall,
 movedDraggedWall: EditableWall,
): EditableWall[] {
 return walls.map((wall) => {
 if (wall.id === movedDraggedWall.id) {
 return normalizeWall(movedDraggedWall);
 }

 const next = structuredClone(wall);

 if (movedDraggedWall.orientation === "vertical" && next.orientation === "horizontal") {
 if (endpointConnectedToVerticalWall(next.start, previousDraggedWall)) {
 next.start.x = movedDraggedWall.start.x;
 }
 if (endpointConnectedToVerticalWall(next.end, previousDraggedWall)) {
 next.end.x = movedDraggedWall.start.x;
 }
 return normalizeWall(next);
 }

 if (movedDraggedWall.orientation === "horizontal" && next.orientation === "vertical") {
 if (endpointConnectedToHorizontalWall(next.start, previousDraggedWall)) {
 next.start.y = movedDraggedWall.start.y;
 }
 if (endpointConnectedToHorizontalWall(next.end, previousDraggedWall)) {
 next.end.y = movedDraggedWall.start.y;
 }
 return normalizeWall(next);
 }

 return normalizeWall(next);
 });
}

function rebuildWallLengthsOnly(walls: EditableWall[]): EditableWall[] {
 return walls.map((wall) =>
 normalizeWall({
 ...wall,
 length:
 wall.orientation === "vertical"
 ? Math.abs(wall.end.y - wall.start.y)
 : Math.abs(wall.end.x - wall.start.x),
 }),
 );
}

export function findDraggableWalls(
 roomsOrFloor: RoomItem[] | EditableFloor,
): DragWallCandidate[] {
 if (Array.isArray(roomsOrFloor)) {
 return findCandidateByRooms(roomsOrFloor);
 }

 const byWalls = findCandidateByWallObjects(roomsOrFloor);
 if (byWalls.length > 0) return byWalls;

 return findCandidateByRooms(roomsOrFloor.rooms);
}

export function applyWallDrag(
 rooms: RoomItem[],
 wall: DragWallCandidate,
 nextValue: number,
): RoomItem[] {
 const nextRooms = rooms.map(cloneRoom);

 const roomA = nextRooms.find((r) => r.id === wall.roomAId);
 const roomB = nextRooms.find((r) => r.id === wall.roomBId);

 if (!roomA || !roomB) return nextRooms;

 const a = getBounds(roomA);
 const b = getBounds(roomB);

 if (wall.orientation === "vertical") {
 const min = a.x + MIN_ROOM_SIZE;
 const max = b.x + b.width - MIN_ROOM_SIZE;
 const x = clamp(nextValue, min, max);

 rebuildRectRoom(roomA, a.x, a.y, x - a.x, a.height);
 rebuildRectRoom(roomB, x, b.y, b.x + b.width - x, b.height);
 return nextRooms;
 }

 const min = a.y + MIN_ROOM_SIZE;
 const max = b.y + b.height - MIN_ROOM_SIZE;
 const y = clamp(nextValue, min, max);

 rebuildRectRoom(roomA, a.x, a.y, a.width, y - a.y);
 rebuildRectRoom(roomB, b.x, y, b.width, b.y + b.height - y);
 return nextRooms;
}

export function applyWallDragToFloor(
 floor: EditableFloor,
 wall: DragWallCandidate,
 nextValue: number,
): EditableFloor {
 const nextFloor = structuredClone(floor);

 const previousDraggedWall = getDraggedWallById(nextFloor, wall);
 if (!previousDraggedWall) {
 return nextFloor;
 }

 const range = computeDragRangeFromRooms(nextFloor.rooms, previousDraggedWall);
 const finalValue = clamp(nextValue, range.min, range.max);

 const movedDraggedWall = moveWallAxis(previousDraggedWall, finalValue);

 const movedWalls = nextFloor.walls.map((item) =>
 item.id === movedDraggedWall.id ? movedDraggedWall : normalizeWall(item),
 );

 nextFloor.walls = syncConnectedWallEndpoints(
 movedWalls,
 previousDraggedWall,
 movedDraggedWall,
 );
 nextFloor.walls = rebuildWallLengthsOnly(nextFloor.walls);

 const finalDraggedWall = nextFloor.walls.find((item) => item.id === movedDraggedWall.id);
 if (finalDraggedWall) {
 moveAttachedOpeningsByWall(nextFloor, finalDraggedWall);
 }

 return nextFloor;
}