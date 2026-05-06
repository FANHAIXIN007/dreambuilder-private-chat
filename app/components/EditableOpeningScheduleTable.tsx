"use client";

import React from "react";

type DoorItemLite = {
 id: string;
 code: string;
 type: string;
 width: number;
 height: number;
 position: { x: number; y: number };
 rotation?: number;
};

type WindowItemLite = {
 id: string;
 code: string;
 type: string;
 width: number;
 height: number;
 position: { x: number; y: number };
 rotation?: number;
};

type Props = {
 doors: DoorItemLite[];
 windows: WindowItemLite[];
 selectedDoorId?: string | null;
 selectedWindowId?: string | null;
 onSelectDoor?: (doorId: string | null) => void;
 onSelectWindow?: (windowId: string | null) => void;
 language?: "zh" | "en";
};

function formatOpeningType(type: string, language: "zh" | "en") {
 if (language === "en") return type;

 switch (type) {
 case "single":
 return "单开门";
 case "double":
 return "双开门";
 case "entrance":
 return "入户门";
 case "sliding":
 return "推拉窗";
 case "casement":
 return "平开窗";
 case "floor_to_ceiling":
 return "落地窗";
 default:
 return type;
 }
}

export default function EditableOpeningScheduleTable({
 doors,
 windows,
 selectedDoorId,
 selectedWindowId,
 onSelectDoor,
 onSelectWindow,
 language = "zh",
}: Props) {
 return (
 <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
 <div className="mb-3">
 <h3 className="text-sm font-semibold text-white">
 {language === "zh" ? "编辑态门窗表" : "Editable Opening Schedule"}
 </h3>
 <p className="mt-1 text-xs text-white/50">
 {language === "zh"
 ? "拖墙、改门型、改窗型、改宽度后，这里的数据会实时更新。"
 : "This table updates after wall dragging and opening edits."}
 </p>
 </div>

 <div className="space-y-4">
 <div className="overflow-hidden rounded-2xl border border-white/10">
 <div className="border-b border-white/10 bg-[#131b26] px-3 py-3 text-xs font-semibold text-white/75">
 {language === "zh" ? "门表" : "Door Schedule"}
 </div>
 <div className="max-h-[220px] overflow-auto">
 <table className="min-w-full border-collapse">
 <thead className="sticky top-0 z-10 bg-[#131b26]">
 <tr className="text-left text-xs text-white/55">
 <th className="px-3 py-3 font-medium">编号</th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "类型" : "Type"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "宽" : "Width"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "高" : "Height"}
 </th>
 </tr>
 </thead>
 <tbody>
 {doors.map((door) => {
 const active = selectedDoorId === door.id;
 return (
 <tr
 key={door.id}
 onClick={() => {
 onSelectDoor?.(door.id);
 onSelectWindow?.(null);
 }}
 className={`cursor-pointer border-t border-white/10 text-sm transition ${
 active
 ? "bg-red-500/12 text-red-100"
 : "bg-transparent text-white/80 hover:bg-white/5"
 }`}
 >
 <td className="px-3 py-3 font-semibold">{door.code}</td>
 <td className="px-3 py-3">{formatOpeningType(door.type, language)}</td>
 <td className="px-3 py-3">{door.width} mm</td>
 <td className="px-3 py-3">{door.height} mm</td>
 </tr>
 );
 })}
 {doors.length === 0 ? (
 <tr>
 <td colSpan={4} className="px-3 py-6 text-center text-sm text-white/45">
 {language === "zh" ? "暂无门数据" : "No doors"}
 </td>
 </tr>
 ) : null}
 </tbody>
 </table>
 </div>
 </div>

 <div className="overflow-hidden rounded-2xl border border-white/10">
 <div className="border-b border-white/10 bg-[#131b26] px-3 py-3 text-xs font-semibold text-white/75">
 {language === "zh" ? "窗表" : "Window Schedule"}
 </div>
 <div className="max-h-[220px] overflow-auto">
 <table className="min-w-full border-collapse">
 <thead className="sticky top-0 z-10 bg-[#131b26]">
 <tr className="text-left text-xs text-white/55">
 <th className="px-3 py-3 font-medium">编号</th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "类型" : "Type"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "宽" : "Width"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "高" : "Height"}
 </th>
 </tr>
 </thead>
 <tbody>
 {windows.map((windowItem) => {
 const active = selectedWindowId === windowItem.id;
 return (
 <tr
 key={windowItem.id}
 onClick={() => {
 onSelectWindow?.(windowItem.id);
 onSelectDoor?.(null);
 }}
 className={`cursor-pointer border-t border-white/10 text-sm transition ${
 active
 ? "bg-sky-500/12 text-sky-100"
 : "bg-transparent text-white/80 hover:bg-white/5"
 }`}
 >
 <td className="px-3 py-3 font-semibold">{windowItem.code}</td>
 <td className="px-3 py-3">
 {formatOpeningType(windowItem.type, language)}
 </td>
 <td className="px-3 py-3">{windowItem.width} mm</td>
 <td className="px-3 py-3">{windowItem.height} mm</td>
 </tr>
 );
 })}
 {windows.length === 0 ? (
 <tr>
 <td colSpan={4} className="px-3 py-6 text-center text-sm text-white/45">
 {language === "zh" ? "暂无窗数据" : "No windows"}
 </td>
 </tr>
 ) : null}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 );
}