import type {
 Point2D,
 Rect2D,
 RoomGeometry,
 RoomItem,
 RoomType,
} from "./designTypes";

function round2(value: number): number {
 return Math.round(value * 100) / 100;
}

export function rectToPolygon(rect: Rect2D): Point2D[] {
 return [
 { x: rect.x, y: rect.y },
 { x: rect.x + rect.width, y: rect.y },
 { x: rect.x + rect.width, y: rect.y + rect.height },
 { x: rect.x, y: rect.y + rect.height },
 ];
}

export function getPolygonBounds(points: Point2D[]): Rect2D {
 const xs = points.map((p) => p.x);
 const ys = points.map((p) => p.y);
 const minX = Math.min(...xs);
 const maxX = Math.max(...xs);
 const minY = Math.min(...ys);
 const maxY = Math.max(...ys);

 return {
 x: round2(minX),
 y: round2(minY),
 width: round2(maxX - minX),
 height: round2(maxY - minY),
 };
}

export function getPolygonCentroid(points: Point2D[]): Point2D {
 if (points.length === 0) return { x: 0, y: 0 };
 if (points.length === 1) return points[0];

 let signedArea = 0;
 let cx = 0;
 let cy = 0;

 for (let i = 0; i < points.length; i += 1) {
 const p0 = points[i];
 const p1 = points[(i + 1) % points.length];
 const cross = p0.x * p1.y - p1.x * p0.y;
 signedArea += cross;
 cx += (p0.x + p1.x) * cross;
 cy += (p0.y + p1.y) * cross;
 }

 signedArea *= 0.5;

 if (Math.abs(signedArea) < 1e-8) {
 const bounds = getPolygonBounds(points);
 return {
 x: round2(bounds.x + bounds.width / 2),
 y: round2(bounds.y + bounds.height / 2),
 };
 }

 cx /= 6 * signedArea;
 cy /= 6 * signedArea;

 return { x: round2(cx), y: round2(cy) };
}

export function createRoomGeometryFromRect(rect: Rect2D): RoomGeometry {
 const polygon = rectToPolygon(rect);
 return {
 polygon,
 center: getPolygonCentroid(polygon),
 bounds: rect,
 };
}

export function polygonToSvgPoints(points: Point2D[]): string {
 return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function polygonToText(points: Point2D[]): string {
 return points
 .map((p) => `(${round2(p.x)}, ${round2(p.y)})`)
 .join(" → ");
}

export function buildRoomItem(input: {
 id: string;
 code: string;
 nameZh: string;
 nameEn: string;
 type: RoomType;
 floor: number;
 area: number;
 rect?: Rect2D;
 polygon?: Point2D[];
 width?: number;
 depth?: number;
 clearHeight?: number;
 notes?: string;
}): RoomItem {
 const polygon = input.polygon ?? (input.rect ? rectToPolygon(input.rect) : []);
 const bounds = input.rect ?? getPolygonBounds(polygon);
 const center = getPolygonCentroid(polygon);

 return {
 id: input.id,
 code: input.code,
 nameZh: input.nameZh,
 nameEn: input.nameEn,
 type: input.type,
 floor: input.floor,
 area: round2(input.area),
 width: input.width,
 depth: input.depth,
 clearHeight: input.clearHeight,
 geometry: {
 polygon,
 center,
 bounds,
 },
 notes: input.notes,
 };
}

export function getRoomFillByType(type: RoomType): string {
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