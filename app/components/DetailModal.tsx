"use client";

import React from "react";
import { createPortal } from "react-dom";

export type HouseItem = {
 id: number;
 title: string;
 author: string;
 styleZh: string;
 styleEn: string;
 likes: number;
 saves: number;
 liked: boolean;
 saved: boolean;
 image: string;

 area?: string;
 roomsZh?: string;
 roomsEn?: string;
 floorsZh?: string;
 floorsEn?: string;
 houseTypeZh?: string;
 houseTypeEn?: string;
 facadeZh?: string;
 facadeEn?: string;
 roofZh?: string;
 roofEn?: string;
 roofColorZh?: string;
 roofColorEn?: string;
 sceneZh?: string;
 sceneEn?: string;
 toneZh?: string;
 toneEn?: string;
 garageZh?: string;
 garageEn?: string;
 seasonZh?: string;
 seasonEn?: string;
 plotZh?: string;
 plotEn?: string;
};

type DetailModalProps = {
 open: boolean;
 house: HouseItem | null;
 language: string;
 onClose: () => void;
 onLike: (id: number) => void;
 onSave: (id: number) => void;
};

export default function DetailModal({
 open,
 house,
 language,
 onClose,
 onLike,
 onSave,
}: DetailModalProps) {
 const [mounted, setMounted] = React.useState(false);

 React.useEffect(() => {
 setMounted(true);
 }, []);

 React.useEffect(() => {
 if (!open) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "Escape") onClose();
 };

 const previousOverflow = document.body.style.overflow;
 document.body.style.overflow = "hidden";
 window.addEventListener("keydown", handleKeyDown);

 return () => {
 document.body.style.overflow = previousOverflow;
 window.removeEventListener("keydown", handleKeyDown);
 };
 }, [open, onClose]);

 if (!mounted || !open || !house) return null;

 const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

 const modalSecondaryBtn =
 "rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-[0_6px_16px_rgba(0,0,0,0.08)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 hover:shadow-[0_14px_28px_rgba(0,0,0,0.12)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_6px_14px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2";

 const modalPrimaryBtn =
 "rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:bg-black hover:shadow-[0_18px_36px_rgba(0,0,0,0.26)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_8px_18px_rgba(0,0,0,0.18)] focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2";

 return createPortal(
 <div
 onClick={onClose}
 className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm"
 >
 <div className="flex h-screen items-center justify-center p-4 md:p-6">
 <div
 onClick={(e) => e.stopPropagation()}
 className="relative overflow-hidden rounded-[28px] bg-white shadow-2xl"
 style={{
 width: "100%",
 maxWidth: "1280px",
 height: isMobile
 ? "calc(100vh - 2rem)"
 : "min(760px, calc(100vh - 32px))",
 maxHeight: "calc(100vh - 32px)",
 display: "flex",
 flexDirection: isMobile ? "column" : "row",
 }}
 >
 <button
 onClick={onClose}
 className="absolute z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.04] hover:bg-black hover:shadow-[0_18px_36px_rgba(0,0,0,0.34)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2"
 style={{ top: "16px", left: "16px" }}
 >
 ✕
 </button>

 <div
 className="bg-neutral-100"
 style={{
 position: "relative",
 width: isMobile ? "100%" : "50%",
 height: isMobile ? "280px" : "100%",
 minHeight: 0,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 flexShrink: 0,
 overflow: "hidden",
 }}
 >
 <img
 src={house.image}
 alt={house.title}
 style={{
 position: "absolute",
 inset: 0,
 width: "100%",
 height: "100%",
 objectFit: "contain",
 backgroundColor: "#f5f5f5",
 }}
 />
 </div>

 <div
 style={{
 width: isMobile ? "100%" : "50%",
 height: isMobile ? "calc(100% - 280px)" : "100%",
 display: "flex",
 flexDirection: "column",
 minHeight: 0,
 overflow: "hidden",
 }}
 >
 <div className="shrink-0 border-b border-neutral-200 p-6 md:p-8">
 <div className="mb-3 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
 {language === "zh" ? "作品详情" : "House Detail"}
 </div>

 <h2 className="pr-12 text-2xl font-semibold tracking-tight md:text-3xl">
 {house.title}
 </h2>

 <p className="mt-2 text-sm text-neutral-500">
 {language === "zh" ? "作者" : "Author"}: {house.author}
 </p>
 </div>

 <div
 className="p-6 md:p-8"
 style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}
 >
 <div className="flex flex-wrap gap-2">
 <span className="rounded-full bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
 {language === "zh" ? house.styleZh : house.styleEn}
 </span>
 <span className="rounded-full bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
 ❤️ {house.likes}
 </span>
 <span className="rounded-full bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
 ⭐ {house.saves}
 </span>
 </div>

 <div className="mt-6 space-y-4 text-sm leading-7 text-neutral-600">
 <p>
 {language === "zh"
 ? "这是 DreamBuilder 世界画廊中的一套住宅作品。你可以在这里查看它的风格、封面、地块和方案参数。后续我们还可以继续增加室内漫游、预算拆解与施工信息。"
 : "This is a residential concept from the DreamBuilder World Gallery. Here you can view its style, cover image, plot location, and design parameters. Later we can add interior walkthroughs, budget breakdowns, and construction info."}
 </p>

 <div className="grid gap-3 sm:grid-cols-2">
 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "建筑风格" : "Style"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh" ? house.styleZh : house.styleEn}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "地块位置" : "Plot"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.plotZh || "未设置"
 : house.plotEn || "Not set"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "面积" : "Area"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {house.area || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "房间数" : "Rooms"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.roomsZh || "-"
 : house.roomsEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "建筑层数" : "Floors"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.floorsZh || "-"
 : house.floorsEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "住宅类型" : "House Type"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.houseTypeZh || "-"
 : house.houseTypeEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "外立面材质" : "Facade"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.facadeZh || "-"
 : house.facadeEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "屋顶形式" : "Roof"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.roofZh || "-"
 : house.roofEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "屋顶颜色" : "Roof Color"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.roofColorZh || "-"
 : house.roofColorEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "场景环境" : "Scene"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.sceneZh || "-"
 : house.sceneEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "色调偏好" : "Tone"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.toneZh || "-"
 : house.toneEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "车库配置" : "Garage"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.garageZh || "-"
 : house.garageEn || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4 sm:col-span-2">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "季节氛围" : "Season"}
 </p>
 <p className="mt-1 font-medium text-neutral-800">
 {language === "zh"
 ? house.seasonZh || "-"
 : house.seasonEn || "-"}
 </p>
 </div>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4">
 <p className="text-xs text-neutral-400">
 {language === "zh" ? "说明" : "Description"}
 </p>
 <p className="mt-2 text-neutral-700">
 {language === "zh"
 ? "这套作品来自 DreamBuilder 世界地图中的一个专属地块。后续我们可以继续拓展为地图落点、邻居访问、角色漫游和 3D 世界探索。"
 : "This concept belongs to a dedicated plot on the DreamBuilder world map. Later we can expand it into plot placement, neighbor visits, avatar roaming, and 3D world exploration."}
 </p>
 </div>
 </div>
 </div>

 <div className="shrink-0 border-t border-neutral-200 bg-white p-6 md:p-8">
 <div className="flex flex-wrap gap-3">
 <button
 onClick={() => onLike(house.id)}
 className={house.liked ? modalPrimaryBtn : modalSecondaryBtn}
 >
 {language === "zh"
 ? `❤️ 点赞 (${house.likes})`
 : `❤️ Like (${house.likes})`}
 </button>

 <button
 onClick={() => onSave(house.id)}
 className={house.saved ? modalPrimaryBtn : modalSecondaryBtn}
 >
 {language === "zh"
 ? `⭐ 收藏 (${house.saves})`
 : `⭐ Save (${house.saves})`}
 </button>

 <button onClick={onClose} className={modalSecondaryBtn}>
 {language === "zh" ? "关闭" : "Close"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>,
 document.body
 );
}