import type {
 HouseDesignPackage,
 RoomItem,
 DoorItem,
 WindowItem,
 WallItem,
 AxisLine,
} from "@/app/lib/designTypes";

export type EditorViewMode = "plan" | "elevation";
export type EditorElevationFace = "front" | "left" | "right" | "rear";

export type FurnitureCategory =
 | "living"
 | "bedroom"
 | "dining"
 | "kitchen"
 | "bathroom"
 | "storage"
 | "decor";

export type EditableWallOrientation = "horizontal" | "vertical" | "angled";
export type EditableWallKind = "interior" | "exterior";
export type EditableWallType = "bearing" | "partition";

export type WallEndpoint = {
 x: number;
 y: number;
};

export type EditableWall = {
 id: string;
 floor: number;
 kind: EditableWallKind;
 wallType: EditableWallType;
 orientation: EditableWallOrientation;
 start: WallEndpoint;
 end: WallEndpoint;
 thickness: number;
 length: number;
 roomIds: string[];
 attachedDoorIds: string[];
 attachedWindowIds: string[];
 sourceWallId?: string;
 draggable?: boolean;
};

export type EditableOpeningAttachment = {
 wallId?: string;
 offsetOnWall?: number;
 normalizedOffset?: number;
 side?: "start" | "end" | "center";
};

export type EditableDoor = DoorItem & {
 attachment?: EditableOpeningAttachment;
};

export type EditableWindow = WindowItem & {
 attachment?: EditableOpeningAttachment;
 sillHeight?: number;
 headHeight?: number;
};

export type FurnitureLibraryItem = {
 id: string;
 code: string;
 nameZh: string;
 nameEn: string;
 category: FurnitureCategory;
 width: number;
 depth: number;
 height?: number;
 price: number;
 color?: string;
 icon?: string;
};

export type FurnitureItem = {
 id: string;
 libraryId: string;
 floor: number;
 roomId?: string;
 x: number;
 y: number;
 width: number;
 depth: number;
 rotation: number;
 price: number;
 nameZh: string;
 nameEn: string;
 category: FurnitureCategory;
 selected?: boolean;
};

export type EditableFloor = {
 id: string;
 floor: number;
 name: string;
 outline: Array<{ x: number; y: number }>;
 rooms: RoomItem[];
 walls: EditableWall[];
 rawWalls: WallItem[];
 doors: EditableDoor[];
 windows: EditableWindow[];
 axisX: AxisLine[];
 axisY: AxisLine[];
 furniture: FurnitureItem[];
};

export type EditorSelection =
 | { type: "room"; id: string }
 | { type: "wall"; id: string }
 | { type: "door"; id: string }
 | { type: "window"; id: string }
 | { type: "furniture"; id: string }
 | null;

export type EditableDesignPackage = {
 sourceVersion: string;
 floors: EditableFloor[];
 activeFloor: number;
 activeViewMode: EditorViewMode;
 activeElevationFace: EditorElevationFace;
 selection: EditorSelection;
 hasUnsavedChanges: boolean;
 basePackage: HouseDesignPackage;
};