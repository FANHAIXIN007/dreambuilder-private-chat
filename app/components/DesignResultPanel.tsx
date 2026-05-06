"use client";

import React, { useMemo, useState } from "react";
import type {
 FloorplanFloor,
 Language,
 RoomItem,
 DesignResult,
} from "@/app/lib/designTypes";
import GeneratedFloorplanCanvas from "@/app/components/GeneratedFloorplanCanvas";
import RoomScheduleTable from "@/app/components/RoomScheduleTable";

type Props = {
 result: DesignResult | null;
 language?: Language;
};

export default function DesignResultPanel({
 result,
 language = "zh",
}: Props) {
 const [activeFloor, setActiveFloor] = useState<number>(
 result?.floorplans?.[0]?.floor ?? 1,
 );
 const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

 const currentFloor: FloorplanFloor | undefined = useMemo(() => {
 return result?.floorplans?.find((item) => item.floor === activeFloor);
 }, [activeFloor, result]);

 const currentRooms: RoomItem[] = useMemo(() => {
 return currentFloor?.rooms ?? [];
 }, [currentFloor]);

 if (!result || !currentFloor) {
 return (
 <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
 {language === "zh" ? "暂无设计结果" : "No design result"}
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <div className="text-base font-semibold text-neutral-900">
 {language === "zh" ? "设计结果" : "Design Result"} ·{" "}
 {result.projectName}
 </div>
 <div className="mt-1 text-sm text-neutral-500">
 {language === "zh"
 ? "房间编号、真实坐标、平面图显示已完成一一联动"
 : "Room codes, coordinates and floorplan display are linked"}
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 {result.floorplans.map((floor) => {
 const active = floor.floor === activeFloor;
 return (
 <button
 key={floor.floor}
 type="button"
 onClick={() => {
 setActiveFloor(floor.floor);
 setSelectedRoomId(null);
 }}
 className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
 active
 ? "border-neutral-900 bg-neutral-900 text-white"
 : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
 }`}
 >
 {language === "zh" ? "楼层" : "Floor"} {floor.floor}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 <GeneratedFloorplanCanvas
 floor={currentFloor}
 language={language}
 selectedRoomId={selectedRoomId}
 onRoomSelect={(room) => setSelectedRoomId(room?.id ?? null)}
 />

 <RoomScheduleTable
 rooms={currentFloor.rooms}
 language={language}
 selectedRoomId={selectedRoomId}
 onSelectRoom={(roomId: string) => setSelectedRoomId(roomId ?? null)}
/>
 </div>
 );
}