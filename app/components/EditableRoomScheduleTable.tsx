"use client";

import React from "react";
import type { RoomItem } from "@/app/lib/designTypes";

type Props = {
 rooms: RoomItem[];
 selectedRoomId?: string | null;
 onSelectRoom?: (roomId: string | null) => void;
 language?: "zh" | "en";
};

function getRoomSize(room: RoomItem) {
 const bounds = room.geometry.bounds;
 const w = Number(bounds.width || 0);
 const h = Number(bounds.height || 0);
 const longSide = Math.max(w, h);
 const shortSide = Math.min(w, h);

 return {
 longSide: (longSide / 100).toFixed(2),
 shortSide: (shortSide / 100).toFixed(2),
 };
}

export default function EditableRoomScheduleTable({
 rooms,
 selectedRoomId,
 onSelectRoom,
 language = "zh",
}: Props) {
 return (
 <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
 <div className="mb-3">
 <h3 className="text-sm font-semibold text-white">
 {language === "zh" ? "编辑态房间表" : "Editable Room Schedule"}
 </h3>
 <p className="mt-1 text-xs text-white/50">
 {language === "zh"
 ? "拖动隔墙后，房间面积与尺寸会在这里实时更新。"
 : "Room area and dimensions update here when walls are dragged."}
 </p>
 </div>

 <div className="overflow-hidden rounded-2xl border border-white/10">
 <div className="max-h-[320px] overflow-auto">
 <table className="min-w-full border-collapse">
 <thead className="sticky top-0 z-10 bg-[#131b26]">
 <tr className="text-left text-xs text-white/55">
 <th className="px-3 py-3 font-medium">编号</th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "名称" : "Name"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "面积" : "Area"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "长边" : "Long"}
 </th>
 <th className="px-3 py-3 font-medium">
 {language === "zh" ? "短边" : "Short"}
 </th>
 </tr>
 </thead>

 <tbody>
 {rooms.map((room) => {
 const active = selectedRoomId === room.id;
 const size = getRoomSize(room);

 return (
 <tr
 key={room.id}
 onClick={() => onSelectRoom?.(room.id)}
 className={`cursor-pointer border-t border-white/10 text-sm transition ${
 active
 ? "bg-cyan-400/12 text-cyan-100"
 : "bg-transparent text-white/80 hover:bg-white/5"
 }`}
 >
 <td className="px-3 py-3 font-semibold">{room.code}</td>
 <td className="px-3 py-3">{language === "zh" ? room.nameZh : room.nameEn}</td>
 <td className="px-3 py-3">{Number(room.area || 0).toFixed(1)} ㎡</td>
 <td className="px-3 py-3">{size.longSide} m</td>
 <td className="px-3 py-3">{size.shortSide} m</td>
 </tr>
 );
 })}

 {rooms.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-3 py-6 text-center text-sm text-white/45">
 {language === "zh" ? "暂无房间数据" : "No room data"}
 </td>
 </tr>
 ) : null}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}