"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HouseDesignPackage } from "@/app/lib/designTypes";
import type {
 EditableDesignPackage,
 FurnitureLibraryItem,
} from "@/app/lib/editorTypes";
import {
 DEFAULT_FURNITURE_LIBRARY,
 designPackageToEditablePackage,
 editablePackageToDesignPackage,
} from "@/app/lib/designEditorAdapter";
import { applyWallDragToFloor } from "@/app/lib/wallDrag";
import EditableFloorplanCanvas from "@/app/components/EditableFloorplanCanvas";
import EditableRoomScheduleTable from "@/app/components/EditableRoomScheduleTable";
import EditableOpeningScheduleTable from "@/app/components/EditableOpeningScheduleTable";
import FurnitureLibraryPanel from "@/app/components/FurnitureLibraryPanel";

type Props = {
 designPackage: HouseDesignPackage | null;
 language?: "zh" | "en";
 onSave?: (nextPackage: HouseDesignPackage, editable: EditableDesignPackage) => void;
};

const DOOR_TYPES = ["single", "double", "entrance"] as const;
const WINDOW_TYPES = ["sliding", "casement", "floor_to_ceiling"] as const;

export default function InteractiveDesignEditor({
 designPackage,
 language = "zh",
 onSave,
}: Props) {
 const [editable, setEditable] = useState<EditableDesignPackage | null>(null);
 const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
 const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
 const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
 const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);

 useEffect(() => {
 if (!designPackage) {
 setEditable(null);
 setSelectedRoomId(null);
 setSelectedFurnitureId(null);
 setSelectedDoorId(null);
 setSelectedWindowId(null);
 return;
 }

 setEditable(designPackageToEditablePackage(designPackage));
 setSelectedRoomId(null);
 setSelectedFurnitureId(null);
 setSelectedDoorId(null);
 setSelectedWindowId(null);
 }, [designPackage]);

 const activeFloor = useMemo(() => {
 if (!editable) return null;
 return editable.floors.find((item) => item.floor === editable.activeFloor) ?? null;
 }, [editable]);

 const selectedFurniture = useMemo(() => {
 if (!activeFloor || !selectedFurnitureId) return null;
 return activeFloor.furniture.find((item) => item.id === selectedFurnitureId) ?? null;
 }, [activeFloor, selectedFurnitureId]);

 const selectedDoor = useMemo(() => {
 if (!activeFloor || !selectedDoorId) return null;
 return activeFloor.doors.find((item) => item.id === selectedDoorId) ?? null;
 }, [activeFloor, selectedDoorId]);

 const selectedWindow = useMemo(() => {
 if (!activeFloor || !selectedWindowId) return null;
 return activeFloor.windows.find((item) => item.id === selectedWindowId) ?? null;
 }, [activeFloor, selectedWindowId]);

 const selectedRoom = useMemo(() => {
 if (!activeFloor || !selectedRoomId) return null;
 return activeFloor.rooms.find((item) => item.id === selectedRoomId) ?? null;
 }, [activeFloor, selectedRoomId]);

 const furnitureSummary = useMemo(() => {
 if (!activeFloor) {
 return { count: 0, total: 0 };
 }
 return {
 count: activeFloor.furniture.length,
 total: activeFloor.furniture.reduce((sum, item) => sum + (item.price || 0), 0),
 };
 }, [activeFloor]);

 const openingSummary = useMemo(() => {
 if (!activeFloor) {
 return { doors: 0, windows: 0, attachedDoors: 0, attachedWindows: 0 };
 }

 return {
 doors: activeFloor.doors.length,
 windows: activeFloor.windows.length,
 attachedDoors: activeFloor.doors.filter((item) => item.attachment?.wallId).length,
 attachedWindows: activeFloor.windows.filter((item) => item.attachment?.wallId).length,
 };
 }, [activeFloor]);

 const wallSummary = useMemo(() => {
 if (!activeFloor) {
 return { total: 0, draggable: 0 };
 }

 return {
 total: activeFloor.walls.length,
 draggable: activeFloor.walls.filter((item) => item.draggable).length,
 };
 }, [activeFloor]);

 const clearNonFloorSelection = () => {
 setSelectedRoomId(null);
 setSelectedFurnitureId(null);
 setSelectedDoorId(null);
 setSelectedWindowId(null);
 };

 const handleSelectRoom = (roomId: string | null) => {
 setSelectedRoomId(roomId);
 setSelectedFurnitureId(null);
 setSelectedDoorId(null);
 setSelectedWindowId(null);
 };

 const handleSelectFurniture = (furnitureId: string | null) => {
 setSelectedFurnitureId(furnitureId);
 setSelectedRoomId(null);
 setSelectedDoorId(null);
 setSelectedWindowId(null);
 };

 const handleSelectDoor = (doorId: string | null) => {
 setSelectedDoorId(doorId);
 setSelectedWindowId(null);
 setSelectedRoomId(null);
 setSelectedFurnitureId(null);
 };

 const handleSelectWindow = (windowId: string | null) => {
 setSelectedWindowId(windowId);
 setSelectedDoorId(null);
 setSelectedRoomId(null);
 setSelectedFurnitureId(null);
 };

 const handleAddFurniture = (item: FurnitureLibraryItem) => {
 setEditable((prev) => {
 if (!prev) return prev;

 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;

 floor.furniture.push({
 id: `${item.id}-${Date.now()}`,
 libraryId: item.id,
 floor: floor.floor,
 x: 120 + floor.furniture.length * 20,
 y: 120 + floor.furniture.length * 20,
 width: item.width,
 depth: item.depth,
 rotation: 0,
 price: item.price,
 nameZh: item.nameZh,
 nameEn: item.nameEn,
 category: item.category,
 });

 next.hasUnsavedChanges = true;
 return next;
 });

 clearNonFloorSelection();
 };

 const handleMoveFurniture = (furnitureId: string, x: number, y: number) => {
 setEditable((prev) => {
 if (!prev) return prev;

 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;

 const item = floor.furniture.find((f) => f.id === furnitureId);
 if (!item) return prev;

 item.x = x;
 item.y = y;
 next.hasUnsavedChanges = true;
 return next;
 });
 };

 const handleRotateSelectedFurniture = () => {
 if (!selectedFurnitureId) return;

 setEditable((prev) => {
 if (!prev) return prev;
 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;
 const item = floor.furniture.find((f) => f.id === selectedFurnitureId);
 if (!item) return prev;

 const oldWidth = item.width;
 item.width = item.depth;
 item.depth = oldWidth;
 item.rotation = ((item.rotation ?? 0) + 90) % 360;

 next.hasUnsavedChanges = true;
 return next;
 });
 };

 const handleDeleteSelectedFurniture = () => {
 if (!selectedFurnitureId) return;

 setEditable((prev) => {
 if (!prev) return prev;
 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;

 floor.furniture = floor.furniture.filter((item) => item.id !== selectedFurnitureId);
 next.hasUnsavedChanges = true;
 return next;
 });

 setSelectedFurnitureId(null);
 };

 const handleCycleDoorType = () => {
 if (!selectedDoorId) return;

 setEditable((prev) => {
 if (!prev) return prev;
 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;
 const item = floor.doors.find((d) => d.id === selectedDoorId);
 if (!item) return prev;

 const currentIndex = DOOR_TYPES.findIndex((type) => type === item.type);
 item.type = DOOR_TYPES[(currentIndex + 1 + DOOR_TYPES.length) % DOOR_TYPES.length];
 next.hasUnsavedChanges = true;
 return next;
 });
 };

 const handleCycleWindowType = () => {
 if (!selectedWindowId) return;

 setEditable((prev) => {
 if (!prev) return prev;
 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;
 const item = floor.windows.find((w) => w.id === selectedWindowId);
 if (!item) return prev;

 const currentIndex = WINDOW_TYPES.findIndex((type) => type === item.type);
 item.type =
 WINDOW_TYPES[(currentIndex + 1 + WINDOW_TYPES.length) % WINDOW_TYPES.length];
 next.hasUnsavedChanges = true;
 return next;
 });
 };

 const handleOpeningWidthDelta = (delta: number) => {
 setEditable((prev) => {
 if (!prev) return prev;
 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;

 if (selectedDoorId) {
 const door = floor.doors.find((item) => item.id === selectedDoorId);
 if (!door) return prev;
 door.width = Math.max(700, Math.min(2400, (door.width || 900) + delta));
 next.hasUnsavedChanges = true;
 return next;
 }

 if (selectedWindowId) {
 const windowItem = floor.windows.find((item) => item.id === selectedWindowId);
 if (!windowItem) return prev;
 windowItem.width = Math.max(900, Math.min(4000, (windowItem.width || 1500) + delta));
 next.hasUnsavedChanges = true;
 return next;
 }

 return prev;
 });
 };

 const handleResetEditor = () => {
 if (!designPackage) return;
 setEditable(designPackageToEditablePackage(designPackage));
 clearNonFloorSelection();
 };

 const handleSave = () => {
 if (!editable) return;
 const nextPackage = editablePackageToDesignPackage(editable);
 onSave?.(nextPackage, editable);
 setEditable((prev) => (prev ? { ...prev, hasUnsavedChanges: false } : prev));
 };

 const currentSelectionText = selectedFurniture
 ? `${selectedFurniture.nameZh} · ${selectedFurniture.rotation ?? 0}°`
 : selectedDoor
 ? `${selectedDoor.code} · ${selectedDoor.type} · ${selectedDoor.width}mm${
 selectedDoor.attachment?.wallId ? ` · wall:${selectedDoor.attachment.wallId}` : ""
 }`
 : selectedWindow
 ? `${selectedWindow.code} · ${selectedWindow.type} · ${selectedWindow.width}mm${
 selectedWindow.attachment?.wallId
 ? ` · wall:${selectedWindow.attachment.wallId}`
 : ""
 }`
 : selectedRoom
 ? `${selectedRoom.nameZh} · ${Number(selectedRoom.area || 0).toFixed(1)}㎡`
 : language === "zh"
 ? "未选中任何对象"
 : "Nothing Selected";

 return (
 <section className="rounded-[34px] border border-white/10 bg-[#0d131c]/95 shadow-[0_30px_120px_rgba(0,0,0,0.32)]">
 <div className="border-b border-white/10 px-6 py-5">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
 <div className="min-w-0">
 <div className="mb-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
 Interactive Editing Studio
 </div>
 <h2 className="text-2xl font-semibold tracking-tight text-white">
 {language === "zh" ? "交互编辑工作台" : "Interactive Editing Studio"}
 </h2>
 <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
 {language === "zh"
 ? "当前已切换为墙主导编辑过渡模式：房间作为底图显示，墙、门、窗单独绘制，便于后续升级到可增删墙体与墙上开洞。"
 : "The editor is now in a wall-led transitional mode: rooms are background fills, while walls, doors and windows are drawn independently for the next-stage wall-based editing workflow."}
 </p>
 </div>

 <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[560px]">
 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
 <div className="text-xs text-white/45">
 {language === "zh" ? "家具数" : "Furniture"}
 </div>
 <div className="mt-1 text-lg font-semibold text-white">
 {furnitureSummary.count}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
 <div className="text-xs text-white/45">
 {language === "zh" ? "墙体数" : "Walls"}
 </div>
 <div className="mt-1 text-lg font-semibold text-white">
 {wallSummary.total}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
 <div className="text-xs text-white/45">
 {language === "zh" ? "可拖墙" : "Draggable Walls"}
 </div>
 <div className="mt-1 text-lg font-semibold text-white">
 {wallSummary.draggable}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
 <div className="text-xs text-white/45">
 {language === "zh" ? "编辑状态" : "Edit Status"}
 </div>
 <div
 className={`mt-1 text-lg font-semibold ${
 editable?.hasUnsavedChanges ? "text-amber-300" : "text-emerald-300"
 }`}
 >
 {editable?.hasUnsavedChanges
 ? language === "zh"
 ? "未保存"
 : "Unsaved"
 : language === "zh"
 ? "已同步"
 : "Synced"}
 </div>
 </div>
 </div>
 </div>
 </div>

 {!editable ? (
 <div className="px-6 py-10">
 <div className="rounded-3xl border border-dashed border-white/15 bg-black/10 p-10 text-center">
 <div className="text-lg font-semibold text-white">
 {language === "zh" ? "编辑工作台已就绪" : "Editor is ready"}
 </div>
 <p className="mt-2 text-sm text-white/60">
 {language === "zh"
 ? "请先在上方点击“生成方案”，下方会自动载入可编辑平面与家具库。"
 : "Generate a design above first, then the editable floorplan and furniture library will load here automatically."}
 </p>
 </div>
 </div>
 ) : (
 <>
 <div className="border-b border-white/10 px-6 py-4">
 <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
 <div className="flex flex-wrap gap-2">
 {editable.floors.map((floor) => {
 const active = editable.activeFloor === floor.floor;
 return (
 <button
 key={floor.id}
 type="button"
 onClick={() => {
 setEditable((prev) =>
 prev ? { ...prev, activeFloor: floor.floor } : prev,
 );
 clearNonFloorSelection();
 }}
 className={`rounded-full px-4 py-2 text-sm font-medium transition ${
 active
 ? "bg-cyan-400 text-slate-950"
 : "bg-white/8 text-white hover:bg-white/14"
 }`}
 >
 {floor.name}
 </button>
 );
 })}
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={handleResetEditor}
 className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
 >
 {language === "zh" ? "恢复当前编辑区" : "Reset Editor"}
 </button>

 <button
 type="button"
 onClick={handleRotateSelectedFurniture}
 disabled={!selectedFurnitureId}
 className={`rounded-full px-4 py-2 text-sm font-medium transition ${
 selectedFurnitureId
 ? "bg-violet-600 text-white hover:bg-violet-500"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "旋转 90°" : "Rotate 90°"}
 </button>

 <button
 type="button"
 onClick={handleDeleteSelectedFurniture}
 disabled={!selectedFurnitureId}
 className={`rounded-full px-4 py-2 text-sm font-medium transition ${
 selectedFurnitureId
 ? "bg-rose-600 text-white hover:bg-rose-500"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "删除选中家具" : "Delete Selected"}
 </button>

 <button
 type="button"
 onClick={handleSave}
 className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
 >
 {language === "zh" ? "保存改动" : "Save Changes"}
 </button>
 </div>
 </div>

 <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
 <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-xs text-white/65">
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={handleCycleDoorType}
 disabled={!selectedDoorId}
 className={`rounded-full px-3 py-1.5 font-medium ${
 selectedDoorId
 ? "bg-red-500 text-white hover:bg-red-400"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "切换门型" : "Cycle Door Type"}
 </button>

 <button
 type="button"
 onClick={handleCycleWindowType}
 disabled={!selectedWindowId}
 className={`rounded-full px-3 py-1.5 font-medium ${
 selectedWindowId
 ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "切换窗型" : "Cycle Window Type"}
 </button>

 <button
 type="button"
 onClick={() => handleOpeningWidthDelta(-100)}
 disabled={!selectedDoorId && !selectedWindowId}
 className={`rounded-full px-3 py-1.5 font-medium ${
 selectedDoorId || selectedWindowId
 ? "bg-white/10 text-white hover:bg-white/15"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "宽度 -100" : "Width -100"}
 </button>

 <button
 type="button"
 onClick={() => handleOpeningWidthDelta(100)}
 disabled={!selectedDoorId && !selectedWindowId}
 className={`rounded-full px-3 py-1.5 font-medium ${
 selectedDoorId || selectedWindowId
 ? "bg-white/10 text-white hover:bg-white/15"
 : "cursor-not-allowed bg-white/8 text-white/35"
 }`}
 >
 {language === "zh" ? "宽度 +100" : "Width +100"}
 </button>
 </div>

 <div className="mt-3 space-y-1">
 <div>
 {language === "zh"
 ? "当前处于墙主导显示模式：房间为底图，墙体单独绘制，便于后续做新增墙、删除墙、墙上新增门窗。"
 : "Wall-led display mode is enabled: rooms are background fills and walls are rendered independently for future add/remove wall and insert opening workflows."}
 </div>
 <div className="text-white/45">
 {language === "zh"
 ? `门 ${openingSummary.doors}（已绑定 ${openingSummary.attachedDoors}） · 窗 ${openingSummary.windows}（已绑定 ${openingSummary.attachedWindows}）`
 : `Doors ${openingSummary.doors} (${openingSummary.attachedDoors} attached) · Windows ${openingSummary.windows} (${openingSummary.attachedWindows} attached)`}
 </div>
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
 <div className="text-white/45">
 {language === "zh" ? "当前选中对象" : "Current Selection"}
 </div>
 <div className="mt-1 text-sm font-semibold text-white">{currentSelectionText}</div>
 </div>
 </div>
 </div>

 <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
 <div className="min-w-0 space-y-6">
 <EditableFloorplanCanvas
 floor={activeFloor}
 selectedRoomId={selectedRoomId}
 selectedFurnitureId={selectedFurnitureId}
 selectedDoorId={selectedDoorId}
 selectedWindowId={selectedWindowId}
 onRoomSelect={handleSelectRoom}
 onFurnitureSelect={handleSelectFurniture}
 onDoorSelect={handleSelectDoor}
 onWindowSelect={handleSelectWindow}
 onFurnitureMove={handleMoveFurniture}
 onWallDrag={(wall, nextValue) => {
 setEditable((prev) => {
 if (!prev) return prev;

 const next = structuredClone(prev);
 const floor = next.floors.find((f) => f.floor === next.activeFloor);
 if (!floor) return prev;

 const updatedFloor = applyWallDragToFloor(floor, wall, nextValue);
 const index = next.floors.findIndex((f) => f.floor === next.activeFloor);
 if (index >= 0) {
 next.floors[index] = updatedFloor;
 }

 next.hasUnsavedChanges = true;
 return next;
 });
 }}
 />

 <EditableRoomScheduleTable
 rooms={activeFloor?.rooms ?? []}
 selectedRoomId={selectedRoomId}
 onSelectRoom={handleSelectRoom}
 language={language}
 />

 <EditableOpeningScheduleTable
 doors={activeFloor?.doors ?? []}
 windows={activeFloor?.windows ?? []}
 selectedDoorId={selectedDoorId}
 selectedWindowId={selectedWindowId}
 onSelectDoor={handleSelectDoor}
 onSelectWindow={handleSelectWindow}
 language={language}
 />
 </div>

 <div className="min-w-0">
 <div className="h-[780px]">
 <FurnitureLibraryPanel
 items={DEFAULT_FURNITURE_LIBRARY}
 language={language}
 onAddItem={handleAddFurniture}
 />
 </div>
 </div>
 </div>
 </>
 )}
 </section>
 );
}